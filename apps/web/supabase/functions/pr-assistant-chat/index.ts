/**
 * K.O.R.A chat — Supabase Edge Function.
 *
 * Two modes:
 * 1) Creative Hub: JSON body with `userMessage`, optional `previousResponseId`, `context.page_context === "creative_hub"`.
 *    Calls OpenAI Responses API (`/v1/responses`) with `store: true` and returns JSON `{ responseId, text }`.
 * 2) PR Assistant (dashboard): `messages` array → Chat Completions streaming (`text/event-stream`).
 *
 * Secrets (Dashboard → Edge Functions → pr-assistant-chat → Secrets, or CLI):
 *   OPENAI_API_KEY              — required
 *   OPENAI_CHAT_MODEL           — optional. Chat Completions default: gpt-4o
 *   OPENAI_RESPONSES_MODEL      — optional. Responses API default: gpt-5.4 (override if your org uses another id)
 *
 * Optional: SUPABASE_SERVICE_ROLE_KEY — not required for chain persistence; updates use the caller JWT + RLS on `content_plans`.
 *
 * Deploy: `supabase functions deploy pr-assistant-chat` after setting secrets.
 *
 * Supabase project env (auto): SUPABASE_URL, SUPABASE_ANON_KEY
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { safeRecordOutcome } from "../_shared/lls.ts";
import {
  buildMemoryProjectionPrompt,
  findHardConstraintViolation,
  loadMemoryProjection,
  type MemoryProjection,
} from "../_shared/lls_memory_projection.ts";

const DEFAULT_CHAT_MODEL = "gpt-4o";
const DEFAULT_RESPONSES_MODEL = "gpt-5.4";

function normalizeTone(value: unknown):
  | "authority"
  | "relatability"
  | "challenger"
  | "educational"
  | "inspirational"
  | "direct"
  | "unknown" {
  if (typeof value !== "string") return "unknown";
  const normalized = value.toLowerCase();
  if (normalized.includes("authority")) return "authority";
  if (normalized.includes("relatable")) return "relatability";
  if (normalized.includes("challenger")) return "challenger";
  if (normalized.includes("educat")) return "educational";
  if (normalized.includes("inspir")) return "inspirational";
  if (normalized.includes("direct")) return "direct";
  return "unknown";
}

async function recordAssistantOutcome(payload: {
  userId: string;
  context: Record<string, unknown>;
  action: string;
  success: boolean;
  responseId?: string;
  metadata?: Record<string, unknown>;
  projection?: MemoryProjection;
}) {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return;
  const admin = createClient(url, serviceKey);
  try {
    const result = await safeRecordOutcome(admin, {
      tenant_id: typeof payload.context.customer_id === "string" ? payload.context.customer_id : null,
      lead_id: payload.userId,
      subject_kind: "assistant_message",
      subject_id: payload.responseId ?? crypto.randomUUID(),
      actor_kind: "agent",
      actor_id: payload.userId,
      action: payload.action,
      strategy_origin: "ai_discovered",
      learning_mode: "validated_learning",
      intended_metric_type: "client_readiness",
      actual_metric_type: payload.success ? "assistant_response" : "assistant_error",
      delta_value: payload.success ? 1 : -1,
      success_flag: payload.success,
      revenue_impact: 0,
      failure_type: payload.success ? "unknown" : "execution_failure",
      outcome_verified: true,
      verification_source: "system",
      verification_confidence_component: 0.75,
      causal_method: "unknown",
      causal_confidence_component: 0.15,
      evidence_strength_component: 0.15,
      status: payload.success ? "success" : "failed",
      business_goal: "client_readiness",
      correlation_id: typeof payload.context.content_plan_id === "string"
        ? payload.context.content_plan_id
        : payload.userId,
      strategy_id: payload.projection?.strategy_id ?? "system:pr-assistant",
      proposal_id: payload.projection?.proposal_id ?? null,
      messaging_angle: payload.projection?.messaging_angle ?? "assistant_response",
      hook: payload.projection?.hook ?? "assistant_response",
      projection_version: payload.projection?.projection_version ?? "lls-projection-v1:unavailable",
      intended_outcome: { page_context: payload.context.page_context ?? "pr_assistant" },
      actual_outcome: { response_id: payload.responseId ?? null },
      metadata: {
        ...(payload.metadata ?? {}),
        priority_angles: payload.projection?.priority_angles ?? [],
      },
    });
    if (result.id) {
      await admin.from("lls_behavior_signals").insert({
        outcome_event_id: result.id,
        tenant_id: typeof payload.context.customer_id === "string" ? payload.context.customer_id : null,
        subject_kind: "assistant_message",
        subject_id: payload.responseId ?? null,
        tone_type: normalizeTone(payload.context.tone_direction),
        emotional_trigger: typeof payload.context.messaging_direction === "string"
          ? payload.context.messaging_direction
          : null,
        audience_response_type: payload.success ? "assistant_response_delivered" : "assistant_response_failed",
        conversion_path: typeof payload.context.page_context === "string"
          ? payload.context.page_context
          : "pr_assistant",
        decision_confidence: payload.success ? "medium" : "low",
        time_to_decision_seconds: null,
        metadata: payload.metadata ?? {},
      });
    }
  } catch (error) {
    console.error("[LLS] assistant behavior signal write failed", error);
  }
}

async function loadProjectionForContext(ctx: Record<string, unknown>) {
  const tenantId = typeof ctx.customer_id === "string" ? ctx.customer_id : null;
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!tenantId || !url || !serviceKey) {
    return {
      priority_angles: [],
      avoid_patterns: [],
      prompt_modifiers: [],
      hard_constraints: [],
    };
  }
  const admin = createClient(url, serviceKey);
  return await loadMemoryProjection(admin, tenantId);
}

const SYSTEM_PROMPT = `You are K.O.R.A (Knowledge Oriented Retrieval Assistant), the strategic AI partner for JahKnowsPR — a brand intelligence and public relations consultancy that transforms founders, creators, and organizations into industry authorities.

## Your Identity
You embody the expertise and philosophy of JahKnowsPR. You're not just an AI — you're a strategic partner who studies each user's brand, understands their target audience, and crafts personalized guidance based on their unique Brand Blueprint.

## Core Philosophy
- **Brand Clarity Over Confusion**: Help users articulate their unique value with precision
- **Strategic Visibility**: Quality positioning over vanity metrics
- **Authority Building**: Long-term credibility over quick wins
- **Authentic Influence**: Genuine connection over manufactured presence

## Your Expertise
1. **Content Strategy & Scripts**
   - Video scripts that capture brand voice authentically
   - Social media content calendars
   - Story frameworks and hooks that resonate
   - Caption writing that drives engagement

2. **Visual Content Planning**
   - Shot list templates for brand shoots
   - B-roll ideas that elevate storytelling
   - Visual brand consistency guides
   - Content batching strategies

3. **Brand Positioning**
   - Messaging frameworks
   - Unique value proposition development
   - Audience persona refinement
   - Competitive differentiation

4. **PR & Media Strategy**
   - Press release templates
   - Media pitch frameworks
   - Thought leadership content
   - Crisis communication planning

5. **Posting Strategy**
   - Platform-specific best practices
   - Optimal posting schedules
   - Content pillar development
   - Engagement strategies

## How You Operate
- Study the user's needs and adapt your advice to their specific brand and audience
- Provide templates, frameworks, and actionable scripts — not just theory
- Speak with confidence and authority, as if you've worked in PR for 15+ years
- Balance creativity with strategic thinking
- Always tie advice back to building long-term brand authority

## Conversation
- Be conversational: acknowledge what the user said, ask a brief clarifying question when it would sharpen the next answer, and refer to earlier turns when helpful.
- Stay concise; avoid repeating long boilerplate between messages.

## Tone & Style
- Professional yet approachable
- Strategic and insightful
- Direct and actionable
- Encouraging but honest
- Speak as a trusted advisor, not a generic chatbot

When users ask for templates or scripts, provide complete, ready-to-use examples they can customize. Always consider how the content serves their larger brand narrative and positioning goals.`;

function buildCreativeHubStrategySuffix(ctx: Record<string, unknown>): string {
  if (ctx.page_context !== "creative_hub") return "";
  const parts: string[] = [];
  if (typeof ctx.primary_goal === "string") parts.push(`Primary goal: ${ctx.primary_goal}`);
  if (typeof ctx.secondary_goal === "string" && ctx.secondary_goal) {
    parts.push(`Secondary goal: ${ctx.secondary_goal}`);
  }
  if (typeof ctx.funnel_focus === "string") parts.push(`Funnel focus: ${ctx.funnel_focus}`);
  if (ctx.timeframe_days != null) parts.push(`Timeframe days: ${String(ctx.timeframe_days)}`);
  if (ctx.required_item_count != null) {
    parts.push(`Required content ideas: ${String(ctx.required_item_count)}`);
  }
  if (ctx.current_item_count != null) {
    parts.push(`Current idea count: ${String(ctx.current_item_count)}`);
  }
  if (ctx.remaining_item_count != null) {
    parts.push(`Remaining ideas needed: ${String(ctx.remaining_item_count)}`);
  }
  if (typeof ctx.tone_direction === "string" && ctx.tone_direction) {
    parts.push(`Tone direction: ${ctx.tone_direction}`);
  }
  if (typeof ctx.messaging_direction === "string" && ctx.messaging_direction) {
    parts.push(`Messaging direction: ${ctx.messaging_direction}`);
  }
  if (typeof ctx.goal_guidance_kora === "string" && ctx.goal_guidance_kora) {
    parts.push(`Goal guidance: ${ctx.goal_guidance_kora}`);
  }
  const intel: string[] = [];
  if (typeof ctx.brand_blueprint_summary === "string" && ctx.brand_blueprint_summary) {
    intel.push(`Brand Blueprint (summary):\n${ctx.brand_blueprint_summary}`);
  }
  if (typeof ctx.audience_summary === "string" && ctx.audience_summary) {
    intel.push(`Target Audience (summary):\n${ctx.audience_summary}`);
  }
  if (typeof ctx.brand_strategy_summary === "string" && ctx.brand_strategy_summary) {
    intel.push(`Brand Strategy document (summary):\n${ctx.brand_strategy_summary}`);
  }
  let out = "";
  if (parts.length > 0) {
    out += "\n\n## Active Content Strategy (Creative Hub)\n" + parts.join("\n");
  }
  if (intel.length > 0) {
    out += "\n\n## Brand & audience context (dashboard)\n" + intel.join("\n\n");
  }
  if (ctx.page_context === "creative_hub") {
    out +=
      "\n\nConversation continuity is handled server-side via the Responses API; build on prior turns naturally.";
    out +=
      "\n\n## Using in-house context (Creative Hub)\n" +
      "- You receive **Active Content Strategy** (goals, funnel, timeframe, tone/messaging fields) and **Brand & audience context** (Brand Blueprint, Target Audience, Brand Strategy summaries) when the dashboard has data.\n" +
      "- **Always read and use that context first** when answering: reference it explicitly when it helps (e.g. audience traits, pillars, tone notes). Synthesize it with solid marketing and communications best practices.\n" +
      "- If a summary block is missing or very thin, say so briefly and suggest what the user should complete in the dashboard — still answer conceptual questions (e.g. what tone means, how to run a discovery workshop) from general expertise.\n" +
      "- You **do not** have live web browsing in this chat. For time-sensitive trends, competitor moves, or platform algorithm changes, give best-practice guidance and tell the user to verify with current external sources when it matters.\n";
    out +=
      "\n\n## Reply style (Creative Hub)\n" +
      "- The user may discuss **any part of the campaign journey**: goals, funnel, **tone and voice**, messaging, **target audience**, **brand strategy**, channels, timelines, or creative — not only content ideas. Reply in clear prose, frameworks, or checklists unless they ask for ideas.\n" +
      "- Use the **numbered idea format** (below) **only** when the user asks for content ideas, hooks, a list of posts, or similar — not for pure Q&A about tone, strategy, or process.\n" +
      "- The product **only allows “add to Ideas table”** for blocks where **every** label is filled: **Pillar**, **Content idea**, **Hook**, **Format**, **Platform**, **Angle**. For education (tone, messaging, audience, strategy), use prose, bullets, or headings — **do not** use those six labels unless you are delivering a complete table row.\n" +
      "- Be conversational: if something critical is unclear, ask **one short clarifying question** before a long deliverable.\n" +
      "- For multiple ideas, give **at most 5 ideas** per reply. Start **each idea on its own line** with a number and period: `1.` `2.` … (plain text lines, not buried in a paragraph).\n" +
      "- Under each numbered idea use exactly these labels on their own lines (fill every one, including a substantive **Angle:** — never skip Angle): **Pillar:**, **Content idea:**, **Hook:**, **Format:**, **Platform:**, **Angle:** — so each idea maps to one table row.\n" +
      "- Before the numbered list you may write a short intro paragraph in normal prose (no labels); start numbered ideas only when you are ready to output **Pillar:** through **Angle:** for item `1.`.\n" +
      "- Do not put the title or hook in a separate block from the rest of the fields; keep all six labels together under the same number.\n" +
      "- Invite tweaks: the user may reply to refine an idea; incorporate changes without restarting from scratch.";
  }
  return out;
}

function normalizeChatMessages(raw: unknown[]): { role: "user" | "assistant"; content: string }[] {
  const out: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") continue;
    const o = m as { role?: unknown; content?: unknown };
    if (o.role !== "user" && o.role !== "assistant") continue;
    if (typeof o.content !== "string") continue;
    const c = o.content.trim();
    if (!c) continue;
    out.push({ role: o.role, content: o.content });
  }
  return out;
}

/** Best-effort parse of OpenAI Responses API create/retrieve JSON (shape varies by model). */
function extractResponsesAssistantText(data: Record<string, unknown>): string {
  const direct = data.output_text;
  if (typeof direct === "string" && direct.trim()) return direct;

  const chunks: string[] = [];

  function collectFromParts(parts: unknown[]): void {
    for (const part of parts) {
      if (!part || typeof part !== "object") continue;
      const p = part as { type?: string; text?: string; content?: unknown };
      if (typeof p.text === "string" && p.text.trim()) {
        const ty = p.type;
        if (
          ty === "output_text" ||
          ty === "text" ||
          ty === "refusal" ||
          ty === undefined
        ) {
          chunks.push(p.text);
        }
      }
      if (Array.isArray(p.content)) {
        collectFromParts(p.content);
      }
    }
  }

  function walkOutputItem(item: unknown): void {
    if (!item || typeof item !== "object") return;
    const o = item as Record<string, unknown>;
    if (Array.isArray(o.content)) {
      collectFromParts(o.content);
    }
    if (typeof o.text === "string" && o.text.trim()) {
      const role = o.role;
      const ty = o.type;
      if (role === "assistant" || ty === "message") {
        chunks.push(o.text);
      }
    }
  }

  const out = data.output;
  if (Array.isArray(out)) {
    for (const item of out) walkOutputItem(item);
  }

  return chunks.join("").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized. Please sign in to use K.O.R.A." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized. Please sign in to use K.O.R.A." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: roleRows, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roleError) {
      console.error("Role check error:", roleError);
      return new Response(
        JSON.stringify({ error: "Access denied. Unable to verify permissions." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const allowedRoles = ["admin", "author", "client", "intern", "3pv"];
    const roles = (roleRows ?? []).map((r) => r.role as string);
    const hasAllowedRole = roles.some((r) => allowedRoles.includes(r));
    if (!hasAllowedRole) {
      return new Response(
        JSON.stringify({ error: "Access denied. Insufficient permissions." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`K.O.R.A. request from user ${user.id} roles ${roles.join(",")}`);

    const body = await req.json();
    const { messages, context, userMessage, previousResponseId } = body as {
      messages?: unknown;
      context?: Record<string, unknown>;
      userMessage?: unknown;
      previousResponseId?: unknown;
    };

    const ctx = (context ?? {}) as Record<string, unknown>;
    if (ctx.page_context === "creative_hub") {
      console.log("Creative Hub chat context", context);
    }

    const creativeHubText = typeof userMessage === "string" ? userMessage.trim() : "";
    const memoryProjection = await loadProjectionForContext(ctx);
    const memoryProjectionPrompt = buildMemoryProjectionPrompt(memoryProjection);

    if (ctx.page_context === "creative_hub" && creativeHubText) {
      const openaiKey = Deno.env.get("OPENAI_API_KEY");
      if (!openaiKey) {
        console.error("OPENAI_API_KEY is not configured");
        return new Response(
          JSON.stringify({ error: "Chat service is not configured." }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const model = Deno.env.get("OPENAI_RESPONSES_MODEL")?.trim() || DEFAULT_RESPONSES_MODEL;
      const instructions = SYSTEM_PROMPT + memoryProjectionPrompt + buildCreativeHubStrategySuffix(ctx);

      const planId = typeof ctx.content_plan_id === "string" ? ctx.content_plan_id : null;
      if (planId) {
        const { data: planRow, error: planErr } = await supabaseClient
          .from("content_plans")
          .select("id")
          .eq("id", planId)
          .maybeSingle();
        if (planErr || !planRow) {
          return new Response(
            JSON.stringify({ error: "Content plan not found or access denied." }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      const prevId =
        typeof previousResponseId === "string" && previousResponseId.trim()
          ? previousResponseId.trim()
          : undefined;

      const oaiPayload: Record<string, unknown> = {
        model,
        instructions,
        input: creativeHubText,
        store: true,
      };
      if (prevId) oaiPayload.previous_response_id = prevId;

      const oaiRes = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(oaiPayload),
      });

      const oaiRaw = await oaiRes.text();
      if (!oaiRes.ok) {
        console.error("OpenAI Responses error:", oaiRes.status, oaiRaw);
        let openaiDetail = "Could not complete chat request.";
        try {
          const errJson = JSON.parse(oaiRaw) as {
            error?: { message?: string; code?: string };
            message?: string;
          };
          if (typeof errJson.error?.message === "string") openaiDetail = errJson.error.message;
          else if (typeof errJson.message === "string") openaiDetail = errJson.message;
        } catch {
          if (oaiRaw.trim()) openaiDetail = oaiRaw.trim().slice(0, 280);
        }
        if (oaiRes.status === 401) {
          return new Response(JSON.stringify({ error: "AI configuration error (check OPENAI_API_KEY)." }), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (oaiRes.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limits exceeded. Try again shortly." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: openaiDetail }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let oaiData: Record<string, unknown>;
      try {
        oaiData = JSON.parse(oaiRaw) as Record<string, unknown>;
      } catch {
        console.error("OpenAI Responses: invalid JSON", oaiRaw.slice(0, 500));
        return new Response(JSON.stringify({ error: "Invalid response from AI service." }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const responseId = typeof oaiData.id === "string" ? oaiData.id : "";
      const text = extractResponsesAssistantText(oaiData);
      const violation = findHardConstraintViolation(text, memoryProjection);
      if (violation) {
        return new Response(
          JSON.stringify({ error: `Generated response violated active LLS hard constraint: ${violation}` }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!text) {
        const preview = typeof oaiData.output === "object"
          ? JSON.stringify(oaiData.output).slice(0, 1200)
          : String(oaiData.output ?? "");
        console.warn("OpenAI Responses: empty assistant text. output preview:", preview);
      }

      if (planId && responseId) {
        const { error: updErr } = await supabaseClient
          .from("content_plans")
          .update({ openai_response_chain_id: responseId })
          .eq("id", planId);
        if (updErr) {
          console.error("Failed to persist openai_response_chain_id:", updErr);
        }
      }

      await recordAssistantOutcome({
        userId: user.id,
        context: ctx,
        action: "assistant_response_delivered",
        success: true,
        responseId,
        metadata: { mode: "creative_hub", model },
        projection: memoryProjection,
      });

      return new Response(JSON.stringify({
        responseId,
        text,
        lls_trace: {
          strategy_id: memoryProjection.strategy_id,
          proposal_id: memoryProjection.proposal_id,
          messaging_angle: memoryProjection.messaging_angle,
          hook: memoryProjection.hook,
          projection_version: memoryProjection.projection_version,
        },
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = SYSTEM_PROMPT + memoryProjectionPrompt + buildCreativeHubStrategySuffix(ctx);

    if (!messages || !Array.isArray(messages as unknown[])) {
      return new Response(
        JSON.stringify({ error: "Invalid request. Messages array required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const MAX_MESSAGES = 50;
    const normalized = normalizeChatMessages(messages as unknown[]);
    const trimmedMessages = normalized.slice(-MAX_MESSAGES);

    if (trimmedMessages.length === 0) {
      return new Response(JSON.stringify({ error: "No valid user/assistant messages." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      console.error("OPENAI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Chat service is not configured." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const model = Deno.env.get("OPENAI_CHAT_MODEL")?.trim() || DEFAULT_CHAT_MODEL;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, ...trimmedMessages],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI error:", response.status, errText);
      if (response.status === 401) {
        return new Response(JSON.stringify({ error: "AI configuration error." }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Could not complete chat request." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await recordAssistantOutcome({
      userId: user.id,
      context: ctx,
      action: "assistant_response_delivered",
      success: true,
      metadata: { mode: "pr_assistant", model, message_count: trimmedMessages.length },
      projection: memoryProjection,
    });

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "X-LLS-Projection-Version": memoryProjection.projection_version,
        "X-LLS-Messaging-Angle": memoryProjection.messaging_angle ?? "unclassified",
        "X-LLS-Hook": memoryProjection.hook ?? "unclassified",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
