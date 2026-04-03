import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { toast } from "sonner";
import { supabase, supabaseUrl, supabasePublishableKey } from "@/integrations/supabase/client";
import { CREATIVE_PILLAR_OPTIONS, formatGoalLabel, FUNNEL_FOCUS_OPTIONS } from "./strategyModel";
import { parseKoraIdeaFields } from "./parseKoraIdea";
import { shouldUseIdeaCardLayout, splitNumberedIdeaBlocks } from "./splitNumberedIdeas";

interface Message {
  role: "user" | "assistant";
  content: string;
  /** DB id when loaded from content_plan_chat_messages (stable React keys). */
  id?: string;
}

const CHAT_URL = `${supabaseUrl}/functions/v1/pr-assistant-chat`;

/** Client payload for Creative Hub; server may use for RAG / memory (see edge function TODOs). */
export interface CreativeHubChatContext {
  page_context: "creative_hub";
  content_plan_id?: string;
  strategy_id?: string;
  audience_id?: string;
  agent_mode?: "content_planning";
  primary_goal?: string;
  secondary_goal?: string | null;
  funnel_focus?: string;
  timeframe_days?: number;
  required_item_count?: number;
  current_item_count?: number;
  remaining_item_count?: number;
  tone_direction?: string | null;
  messaging_direction?: string | null;
  goal_guidance_kora?: string;
  /** Condensed Brand Blueprints copy (dashboard). */
  brand_blueprint_summary?: string;
  /** Condensed Target Audience analysis. */
  audience_summary?: string;
  /** Condensed Brand Strategy / content_strategies document. */
  brand_strategy_summary?: string;
}

/** Quick-start prompts: journey / strategy (prose) and pillar-specific ideas (structured). */
const SUGGESTED_PROMPTS: { title: string; prompt: string }[] = [
  {
    title: "Tone & brand voice",
    prompt:
      'What does "tone" mean for campaigns (vs brand voice), and how do I find and document the right tone for my brand? Use my strategy tone/messaging fields and Brand Blueprint / audience / strategy summaries when present; if anything is missing, say what to add on the dashboard and still give a practical step-by-step framework.',
  },
  {
    title: "Target audience",
    prompt:
      "Using my Target Audience and Brand Blueprint summaries when available, who are we really speaking to in this campaign, what do they care about, and how should we shape messaging? If context is thin, list what to clarify first, then give guidance.",
  },
  {
    title: "Pillars in the feed",
    prompt:
      "Using my Brand Strategy summary and pillars from the dashboard (when you have them), help me express each pillar through everyday content: recurring themes, story angles, and examples of what “on-pillar” posts could look like. Stay in prose and frameworks — do not use the numbered idea table format unless I ask for ideas.",
  },
  ...CREATIVE_PILLAR_OPTIONS.map((p) => ({
    title: `Ideas: ${p.label}`,
    prompt: `Give me content ideas for the "${p.label}" pillar. Use the numbered format with these lines under each number: Pillar, Content idea, Hook, Format, Platform, Angle. Align with my goals, funnel, tone, audience, and brand context.`,
  })),
];

interface KoraCreativeAssistantProps {
  contentPlanId?: string;
  /** Active content plan / campaign title (shown on assistant replies). */
  planTitle?: string | null;
  /** Active Content Strategy fields and counts for goal-aware replies. */
  strategyContext?: Partial<CreativeHubChatContext> | null;
  className?: string;
  /** When true, persist user/assistant turns to content_plan_chat_messages (best-effort). */
  persistMessages?: boolean;
  /** Insert parsed idea into `content_plan_items` (plain text from list item body). */
  onAddIdeaToTable?: (rawIdeaText: string) => void | Promise<void>;
}

const chainQueryKey = (planId: string | undefined) => ["content-plan-openai-chain", planId] as const;

function funnelLabel(id: string | null | undefined): string | undefined {
  if (!id) return undefined;
  return FUNNEL_FOCUS_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

function KoraStrategyStrip({
  planTitle,
  ctx,
}: {
  planTitle?: string | null;
  ctx: Partial<CreativeHubChatContext> | null | undefined;
}) {
  const c = ctx ?? {};
  const rows: { label: string; value: string }[] = [];
  if (c.primary_goal) rows.push({ label: "Primary goal", value: formatGoalLabel(c.primary_goal) });
  if (c.timeframe_days != null && c.timeframe_days !== undefined) {
    rows.push({ label: "Timeframe", value: `${c.timeframe_days} days` });
  }
  const fl = funnelLabel(c.funnel_focus);
  if (fl) rows.push({ label: "Funnel focus", value: fl });
  if (c.tone_direction?.trim()) rows.push({ label: "Tone", value: c.tone_direction.trim() });
  if (c.messaging_direction?.trim()) rows.push({ label: "Messaging", value: c.messaging_direction.trim() });
  const title = planTitle?.trim();
  if (title) rows.push({ label: "Title", value: title });

  if (rows.length === 0) {
    return (
      <div className="mb-3 rounded-lg border border-dashed border-border/80 bg-muted/35 px-3 py-2.5">
        <p className="text-[11px] leading-snug text-muted-foreground">
          <span className="font-semibold text-foreground/85">Strategy</span>
          {planTitle?.trim() ? (
            <>
              {" · "}
              <span className="text-foreground/90">Title: {planTitle.trim()}</span>
            </>
          ) : (
            <>
              {" — "}
              Set primary goal, timeframe, funnel, tone, and messaging in the Content Strategy panel so each
              reply is labeled.
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="mb-3 rounded-lg border border-border/70 bg-muted/40 px-3 py-2.5">
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] leading-snug">
        {rows.map(({ label, value }, idx) => (
          <span key={`${label}-${idx}`} className="text-muted-foreground">
            <span className="font-semibold text-foreground/90">{label}:</span> {value}
          </span>
        ))}
      </div>
    </div>
  );
}

function IdeaFieldRow({ label, value }: { label: string; value: string | null }) {
  const display = value?.trim() ? value.trim() : "—";
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-0.5 py-2.5 border-b border-border/50 last:border-b-0 sm:grid-cols-[8.5rem_1fr]">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-0.5">{label}</dt>
      <dd className="text-sm text-foreground leading-snug min-w-0 break-words">{display}</dd>
    </div>
  );
}

function AssistantMarkdownBlocks({
  content,
  showAdd,
  onAdd,
}: {
  content: string;
  showAdd: boolean;
  onAdd: (t: string) => void;
}) {
  const blocks = splitNumberedIdeaBlocks(content);
  const useBlocks = shouldUseIdeaCardLayout(content, blocks);

  if (!useBlocks) {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{content || "…"}</ReactMarkdown>
      </div>
    );
  }

  const ideaCardCount = blocks.filter((b) => b.showAdd).length;

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        const isCard = block.showAdd;
        const fields = parseKoraIdeaFields(block.body);
        const ideaOrdinal = isCard ? blocks.slice(0, i).filter((b) => b.showAdd).length + 1 : 0;

        if (!isCard) {
          return (
            <div
              key={i}
              className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-2 [&_li]:my-1 [&_strong]:text-foreground first:[&_p]:mt-0"
            >
              <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{block.body}</ReactMarkdown>
            </div>
          );
        }

        const addHintId = showAdd ? undefined : `kora-add-to-table-hint-${i}`;

        return (
          <article
            key={i}
            className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-sm overflow-hidden ring-1 ring-border/30"
          >
            <div className="border-b border-border/60 bg-muted/40 px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {ideaCardCount > 1 ? `Idea ${ideaOrdinal}` : "Content idea"}
              </span>
            </div>
            <div className="px-3 pt-1 pb-0">
              <dl className="max-w-none">
                <IdeaFieldRow label="Pillar" value={fields.pillar} />
                <IdeaFieldRow label="Content idea" value={fields.contentIdea || null} />
                <IdeaFieldRow label="Hook" value={fields.hook} />
                <IdeaFieldRow label="Format" value={fields.format} />
                <IdeaFieldRow label="Platform" value={fields.platform} />
                <IdeaFieldRow label="Angle" value={fields.angle} />
              </dl>
            </div>
            <div className="flex flex-col items-stretch gap-2 border-t border-border/60 bg-muted/20 px-3 py-3 sm:items-end">
              <Button
                type="button"
                variant="default"
                size="sm"
                className="h-9 px-4 text-xs font-semibold sm:self-end"
                disabled={!showAdd}
                title={
                  showAdd
                    ? undefined
                    : "Choose a content strategy in the Active strategy panel above (or create one). Ideas save to that plan’s table."
                }
                aria-describedby={addHintId}
                onClick={() => {
                  if (showAdd) onAdd(block.body);
                }}
              >
                Add to table
              </Button>
              {!showAdd && (
                <p
                  id={addHintId}
                  className="text-[11px] text-muted-foreground text-left sm:text-right leading-snug max-w-md sm:ml-auto"
                >
                  No content plan is selected. Use the Active strategy panel above to select or create a plan — then you
                  can add ideas to its table.
                </p>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function KoraCreativeAssistant({
  contentPlanId,
  planTitle,
  strategyContext,
  className,
  persistMessages = true,
  onAddIdeaToTable,
}: KoraCreativeAssistantProps) {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  /** One-time hydrate from DB per plan; avoids refetch wiping optimistic messages mid-request. */
  const [chatHydratedFromDb, setChatHydratedFromDb] = useState(false);
  /** OpenAI Responses `id` for `previous_response_id` (hydrated from `content_plans.openai_response_chain_id`). */
  const [lastResponseId, setLastResponseId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: planChainRow } = useQuery({
    queryKey: chainQueryKey(contentPlanId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_plans")
        .select("openai_response_chain_id")
        .eq("id", contentPlanId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!contentPlanId,
    staleTime: 60_000,
  });

  const { data: chatHistory, isPending: historyPending } = useQuery({
    queryKey: ["content-plan-chat-messages", contentPlanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_plan_chat_messages")
        .select("id, role, message, created_at")
        .eq("content_plan_id", contentPlanId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!contentPlanId && persistMessages,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    setMessages([]);
    setChatHydratedFromDb(false);
  }, [contentPlanId]);

  useEffect(() => {
    setLastResponseId(null);
  }, [contentPlanId]);

  useEffect(() => {
    if (!contentPlanId) {
      setLastResponseId(null);
      return;
    }
    const id = planChainRow?.openai_response_chain_id ?? null;
    setLastResponseId(id);
  }, [contentPlanId, planChainRow?.openai_response_chain_id]);

  useEffect(() => {
    if (!contentPlanId || !persistMessages) return;
    if (historyPending) return;
    if (chatHydratedFromDb) return;

    const rows = chatHistory ?? [];
    const mapped: Message[] = [];
    for (const r of rows) {
      if (r.role !== "user" && r.role !== "assistant") continue;
      mapped.push({
        id: r.id,
        role: r.role,
        content: r.message,
      });
    }
    setMessages(mapped);
    setChatHydratedFromDb(true);
  }, [contentPlanId, persistMessages, chatHistory, historyPending, chatHydratedFromDb]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const buildContext = (): CreativeHubChatContext | undefined => {
    const base: CreativeHubChatContext = {
      ...(strategyContext ?? {}),
      page_context: "creative_hub",
      agent_mode: "content_planning",
    };
    if (contentPlanId) {
      base.content_plan_id = contentPlanId;
    }
    return base;
  };

  const persistPair = async (userText: string, assistantText: string) => {
    if (!persistMessages || !contentPlanId) return;
    const { error } = await supabase.from("content_plan_chat_messages").insert([
      { content_plan_id: contentPlanId, role: "user", message: userText },
      {
        content_plan_id: contentPlanId,
        role: "assistant",
        message: assistantText,
        was_applied_to_plan: false,
        memory_candidate: false,
      },
    ]);
    if (error) {
      console.warn("content_plan_chat_messages insert failed", error);
    }
  };

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;
    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    let assistantContent = "";
    const context = buildContext();
    let bodyJson: string;
    try {
      bodyJson = JSON.stringify({
        userMessage: text,
        previousResponseId: lastResponseId ?? undefined,
        context,
      });
    } catch (stringifyErr) {
      console.error("K.O.R.A request body:", stringifyErr);
      toast.error("Could not build chat request. Try reloading the page.");
      setIsLoading(false);
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error("Please sign in to use K.O.R.A.");
        setIsLoading(false);
        return;
      }

      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: supabasePublishableKey,
        },
        body: bodyJson,
      });

      const rawText = await response.text();
      let payload: { responseId?: string; text?: string; error?: string } = {};
      if (rawText.trim()) {
        try {
          payload = JSON.parse(rawText) as typeof payload;
        } catch {
          toast.error(
            response.ok
              ? `Invalid response from chat service.`
              : `Chat error (${response.status}). ${rawText.slice(0, 160)}`,
          );
          setIsLoading(false);
          return;
        }
      }

      if (!response.ok) {
        if (response.status === 429) {
          toast.error("Rate limit exceeded. Try again shortly.");
        } else {
          toast.error(payload.error || `Failed to get response (${response.status}).`);
        }
        setIsLoading(false);
        return;
      }

      assistantContent = typeof payload.text === "string" ? payload.text : "";
      if (payload.responseId) {
        setLastResponseId(payload.responseId);
      }
      if (contentPlanId) {
        void queryClient.invalidateQueries({ queryKey: chainQueryKey(contentPlanId) });
      }

      setMessages((prev) => [...prev, { role: "assistant", content: assistantContent }]);
      if (assistantContent) {
        await persistPair(text, assistantContent);
        void queryClient.invalidateQueries({ queryKey: ["content-plan-chat-messages", contentPlanId] });
      } else {
        toast.error("K.O.R.A returned an empty reply. Check the function logs or model access.");
      }
    } catch (error) {
      console.error("Chat error:", error);
      const hint =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "Network or browser blocked the request.";
      toast.error(`Could not reach K.O.R.A: ${hint}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const handlePromptClick = (prompt: string) => {
    void sendMessage(prompt);
  };

  const showHistoryLoader = !!contentPlanId && persistMessages && historyPending;

  return (
    <div className={cn("flex flex-col h-full min-h-[420px] bg-background overflow-hidden rounded-lg border", className)}>
      <div className="flex-1 overflow-y-auto min-h-0">
        {showHistoryLoader ? (
          <div className="flex justify-center items-center min-h-[280px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-6">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-serif font-bold text-foreground mb-4 text-center">K.O.R.A</h2>
            <div className="w-full max-w-2xl">
              <p className="text-sm text-muted-foreground text-center mb-3 px-1">
                Discuss strategy, tone, audience, or jump straight to pillar ideas. Your Brand Blueprint, audience, and
                strategy summaries are sent with each message when available.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {SUGGESTED_PROMPTS.map((item, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handlePromptClick(item.prompt)}
                    className="group text-left p-3 rounded-lg border border-border bg-card hover:bg-primary hover:border-primary transition-all duration-200"
                  >
                    <span className="text-sm font-medium text-foreground group-hover:text-white transition-colors">
                      {item.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.map((message, index) => (
              <div
                key={message.id ?? `msg-${index}`}
                className={cn("flex gap-4", message.role === "user" ? "justify-end" : "justify-start")}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3",
                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}
                >
                  {message.role === "assistant" ? (
                    <div className="max-h-[min(70vh,42rem)] overflow-y-auto pr-1 -mr-1">
                      <KoraStrategyStrip planTitle={planTitle} ctx={strategyContext} />
                      <AssistantMarkdownBlocks
                        content={message.content || "…"}
                        showAdd={!!contentPlanId && typeof onAddIdeaToTable === "function"}
                        onAdd={(t) => void onAddIdeaToTable?.(t)}
                      />
                    </div>
                  ) : (
                    <p className="text-sm">{message.content}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-4 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t bg-background p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3">
            <Input
              ref={inputRef}
              placeholder="Message…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              autoComplete="off"
              className="flex-1 h-12 text-base rounded-xl border-muted-foreground/20"
            />
            <Button
              type="button"
              onClick={() => void sendMessage()}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-12 w-12 rounded-xl"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
