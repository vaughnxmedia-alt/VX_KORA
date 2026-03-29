import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Sparkles, FileText, Layout, Send, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { loadBoards } from "@/features/inspired/storage";
import { supabase } from "@/integrations/supabase/client";
import type { CampaignType, CampaignTemplateType } from "../types";
import type { MockUser } from "../context/MockAuthContext";

const CAMPAIGN_TYPES: CampaignType[] = ["Marketing", "PR", "Hybrid"];
const TEMPLATE_TYPES: CampaignTemplateType[] = [
  "Full Campaign Launch Blueprint",
  "Product Launch War Room",
  "Content Series Builder",
  "30-Day Content Calendar",
];

type CampaignSource = "content-strategy" | "telegram-approved" | "board";

interface ContentStrategy {
  id: string;
  name: string;
  createdAt: string;
  status: "active" | "draft" | "archived";
  approvalStatus: "pending" | "approved" | "rejected";
  telegramApproved?: boolean;
  telegramApprovedAt?: string;
  sourceInsight?: string;
}

export interface NewCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromBoardId?: string | null;
  onCreate: (params: {
    name: string;
    type: CampaignType;
    templateType: CampaignTemplateType | null;
    fromBoardId?: string;
    fromContentStrategyId?: string;
    assignedUserIds: string[];
  }) => void;
  users: MockUser[];
}

export function NewCampaignModal({
  open,
  onOpenChange,
  fromBoardId,
  onCreate,
  users,
}: NewCampaignModalProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [type, setType] = useState<CampaignType>("Marketing");
  const [templateType, setTemplateType] = useState<CampaignTemplateType | null>(
    "Full Campaign Launch Blueprint"
  );
  const [campaignSource, setCampaignSource] = useState<CampaignSource>(
    fromBoardId ? "board" : "telegram-approved"
  );
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(fromBoardId ?? null);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const [savedBoards, setSavedBoards] = useState<{ id: string; name: string }[]>([]);
  const [contentStrategies, setContentStrategies] = useState<ContentStrategy[]>([]);
  const [telegramApproved, setTelegramApproved] = useState<ContentStrategy[]>([]);
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      const boards = loadBoards();
      setSavedBoards(boards.map((b) => ({ id: b.id, name: b.name })));
      fetchContentStrategies();
    }
  }, [open]);

  async function fetchContentStrategies() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!customer) return;

      const { data: strategies, error } = await supabase
        .from("content_strategies")
        .select("*")
        .eq("client_id", customer.id)
        .order("generated_at", { ascending: false });

      if (error) {
        console.error("Error fetching content strategies:", error);
        return;
      }

      if (strategies) {
        const mapped: ContentStrategy[] = strategies.map((s: Record<string, unknown>) => ({
          id: s.id as string,
          name: (s.strategy_name as string) || (s.content_pillars as Array<{ name?: string }>)?.[0]?.name || "Content Strategy",
          createdAt: (s.generated_at as string) || (s.created_at as string) || new Date().toISOString(),
          status: (s.status as "active" | "draft" | "archived") || "draft",
          approvalStatus: (s.approval_status as "pending" | "approved" | "rejected") || "pending",
          telegramApproved: s.telegram_approved === true,
          telegramApprovedAt: s.telegram_approved_at as string | undefined,
          sourceInsight: s.source_insight as string | undefined,
        }));

        const approved = mapped.filter(s => s.approvalStatus === "approved" || s.telegramApproved);
        const pending = mapped.filter(s => s.approvalStatus !== "approved" && !s.telegramApproved);

        setTelegramApproved(approved);
        setContentStrategies(pending);
      }
    } catch (err) {
      console.error("Error loading strategies:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && fromBoardId) {
      setSelectedBoardId(fromBoardId);
      setCampaignSource("board");
    }
  }, [open, fromBoardId]);

  const boardOptions = React.useMemo(() => {
    const list = [...savedBoards];
    if (fromBoardId && !list.some((b) => b.id === fromBoardId)) {
      list.unshift({ id: fromBoardId, name: `Board: ${fromBoardId}` });
    }
    return list;
  }, [savedBoards, fromBoardId]);

  const selectedBoard = boardOptions.find((b) => b.id === selectedBoardId);
  const selectedStrategy = campaignSource === "telegram-approved" 
    ? telegramApproved.find((s) => s.id === selectedStrategyId)
    : contentStrategies.find((s) => s.id === selectedStrategyId);

  const defaultName = React.useMemo(() => {
    if (campaignSource === "board" && selectedBoardId && selectedBoard) {
      return `${selectedBoard.name} Campaign`;
    }
    if ((campaignSource === "content-strategy" || campaignSource === "telegram-approved") && selectedStrategyId && selectedStrategy) {
      return `${selectedStrategy.name} Campaign`;
    }
    if (fromBoardId) {
      return `Board: ${fromBoardId} Campaign`;
    }
    return "";
  }, [campaignSource, selectedBoardId, selectedBoard, selectedStrategyId, selectedStrategy, fromBoardId]);

  const displayName = name.trim() || defaultName || "Untitled Campaign";
  const hasContentStrategies = contentStrategies.length > 0;
  const hasTelegramApproved = telegramApproved.length > 0;

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
    else {
      onCreate({
        name: displayName,
        type,
        templateType,
        fromBoardId: campaignSource === "board" ? (selectedBoardId ?? fromBoardId ?? undefined) : undefined,
        fromContentStrategyId: (campaignSource === "content-strategy" || campaignSource === "telegram-approved") ? (selectedStrategyId ?? undefined) : undefined,
        assignedUserIds: assignedIds,
      });
      onOpenChange(false);
      setStep(1);
      setName("");
      setType("Marketing");
      setTemplateType("Full Campaign Launch Blueprint");
      setCampaignSource(fromBoardId ? "board" : "telegram-approved");
      setSelectedBoardId(fromBoardId ?? null);
      setSelectedStrategyId(null);
      setAssignedIds([]);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const toggleUser = (id: string) => {
    setAssignedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Campaign</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Step 1: Choose source - Telegram Approved, Content Strategy, or Board */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Create campaign from</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  KORA uses your brand strategy, target audience, and industry insights to power your campaigns.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {/* Telegram-Approved Ideas - Featured */}
                <button
                  type="button"
                  onClick={() => setCampaignSource("telegram-approved")}
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-colors relative ${
                    campaignSource === "telegram-approved"
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/30"
                  }`}
                >
                  {hasTelegramApproved && (
                    <Badge className="absolute -top-2 -right-2 bg-green-500 text-white text-xs">
                      {telegramApproved.length} approved
                    </Badge>
                  )}
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center shrink-0">
                    <Send className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">Telegram-Approved Ideas</p>
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Recommended
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Strategy ideas you've approved from your daily KORA briefings. Ready to execute.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setCampaignSource("content-strategy")}
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-colors ${
                    campaignSource === "content-strategy"
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/30"
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">From Content Strategy</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Generate a campaign from an existing content strategy. KORA will use your brand profile and industry insights.
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setCampaignSource("board")}
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-colors ${
                    campaignSource === "board"
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/30"
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center shrink-0">
                    <Layout className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">From Get Inspired Board</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Build a campaign from a saved whiteboard. Great for visual planners and mood boards.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Select specific source - Telegram Approved */}
          {step === 2 && campaignSource === "telegram-approved" && (
            <div className="space-y-4">
              {hasTelegramApproved ? (
                <>
                  <div className="space-y-2">
                    <Label>Select a Telegram-Approved Idea</Label>
                    <p className="text-xs text-muted-foreground">
                      These are strategy ideas you've approved from your daily KORA briefings.
                    </p>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {telegramApproved.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedStrategyId(s.id)}
                        className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
                          selectedStrategyId === s.id
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-muted-foreground/30"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{s.name}</p>
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Approved
                              </Badge>
                            </div>
                            {s.sourceInsight && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {s.sourceInsight}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {s.telegramApprovedAt 
                                ? new Date(s.telegramApprovedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                                : new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                              }
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
                    <Send className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">No Telegram-Approved Ideas Yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Approve strategy ideas from your daily KORA briefings to see them here.
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Connect Telegram in Settings to start receiving daily briefings.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select specific source - Content Strategy (Pending Approval) */}
          {step === 2 && campaignSource === "content-strategy" && (
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : hasContentStrategies ? (
                <>
                  <div className="space-y-2">
                    <Label>Pending Content Strategies</Label>
                    <p className="text-xs text-muted-foreground">
                      These strategies are awaiting approval. Approve them via Telegram to use in campaigns.
                    </p>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {contentStrategies.map((s) => (
                      <div
                        key={s.id}
                        className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 text-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-amber-600" />
                              <p className="font-medium">{s.name}</p>
                              <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300">
                                <Clock className="w-3 h-3 mr-1" />
                                Pending Approval
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Created {new Date(s.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm">
                    <p className="text-blue-800 font-medium flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Approve via Telegram
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      KORA sends strategy suggestions to Telegram for your review. Approved strategies appear in the "Telegram-Approved Ideas" section.
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium">No Pending Strategies</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      All your strategies have been approved or you haven't generated any yet.
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Go to Brand Strategy to generate new content strategies, or check Telegram-Approved Ideas.
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 2 && campaignSource === "board" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select a Get Inspired Board</Label>
                <p className="text-xs text-muted-foreground">
                  Only boards you've saved in Get Inspired appear here.
                </p>
                <Select
                  value={selectedBoardId ?? "none"}
                  onValueChange={(v) => setSelectedBoardId(v === "none" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a saved board" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {boardOptions.length === 0 ? (
                      <SelectItem value="__empty" disabled>
                        No saved boards yet
                      </SelectItem>
                    ) : (
                      boardOptions.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          <div className="flex items-center gap-2">
                            <Layout className="w-4 h-4 text-muted-foreground" />
                            <span>{b.name}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 3: Campaign type and template */}
          {step === 3 && (
            <>
              <div className="space-y-2">
                <Label>Campaign type</Label>
                <Select value={type} onValueChange={(v) => setType(v as CampaignType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Template</Label>
                <Select
                  value={templateType ?? ""}
                  onValueChange={(v) => setTemplateType((v || null) as CampaignTemplateType | null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose template" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Campaign name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={defaultName || "Untitled Campaign"}
                />
              </div>
            </>
          )}

          {/* Step 4: Assign team */}
          {step === 4 && (
            <div className="space-y-2">
              <Label>Assign team</Label>
              <div className="flex flex-col gap-2 max-h-48 overflow-auto rounded border p-2">
                {users.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={assignedIds.includes(u.id)}
                      onCheckedChange={() => toggleUser(u.id)}
                    />
                    <span className="text-sm">
                      {u.name} ({u.role})
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Confirm */}
          {step === 5 && (
            <div className="text-sm text-muted-foreground space-y-2">
              <div className="p-3 rounded-lg bg-muted/50 border space-y-1.5">
                <p>
                  <strong className="text-foreground">Name:</strong> {displayName}
                </p>
                <p>
                  <strong className="text-foreground">Source:</strong>{" "}
                  {campaignSource === "telegram-approved"
                    ? `Telegram-Approved${selectedStrategy ? `: ${selectedStrategy.name}` : ""}`
                    : campaignSource === "content-strategy"
                    ? `Content Strategy${selectedStrategy ? `: ${selectedStrategy.name}` : ""}`
                    : `Board${selectedBoard ? `: ${selectedBoard.name}` : ""}`}
                </p>
                <p>
                  <strong className="text-foreground">Type:</strong> {type}
                </p>
                <p>
                  <strong className="text-foreground">Template:</strong> {templateType ?? "None"}
                </p>
                <p>
                  <strong className="text-foreground">Status:</strong> Draft
                </p>
                <p>
                  <strong className="text-foreground">Assignees:</strong>{" "}
                  {assignedIds.length
                    ? users.filter((u) => assignedIds.includes(u.id)).map((u) => u.name).join(", ")
                    : "None"}
                </p>
              </div>
              {campaignSource === "telegram-approved" && (
                <p className="text-xs flex items-center gap-1.5 text-green-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  This campaign is based on an idea you approved from your daily KORA briefing.
                </p>
              )}
              {campaignSource === "content-strategy" && (
                <p className="text-xs flex items-center gap-1.5 text-amber-600">
                  <Sparkles className="w-3.5 h-3.5" />
                  KORA will use your brand strategy and industry insights to power this campaign.
                </p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          {step > 1 && (
            <Button variant="outline" onClick={handleBack}>
              Back
            </Button>
          )}
          <Button onClick={handleNext}>{step === 5 ? "Create" : "Next"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
