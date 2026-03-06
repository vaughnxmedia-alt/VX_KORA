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
import { Sparkles, FileText, Layout } from "lucide-react";
import { loadBoards } from "@/features/inspired/storage";
import type { CampaignType, CampaignTemplateType } from "../types";
import type { MockUser } from "../context/MockAuthContext";

const CAMPAIGN_TYPES: CampaignType[] = ["Marketing", "PR", "Hybrid"];
const TEMPLATE_TYPES: CampaignTemplateType[] = [
  "Full Campaign Launch Blueprint",
  "Product Launch War Room",
  "Content Series Builder",
  "30-Day Content Calendar",
];

type CampaignSource = "content-strategy" | "board";

interface ContentStrategy {
  id: string;
  name: string;
  createdAt: string;
  status: "active" | "draft";
}

// TODO: Replace with real API call to fetch user's content strategies from Mission Control
const MOCK_CONTENT_STRATEGIES: ContentStrategy[] = [
  { id: "cs-1", name: "Q1 2026 Brand Awareness", createdAt: "2026-01-15", status: "active" },
  { id: "cs-2", name: "Product Launch - Spring Collection", createdAt: "2026-02-01", status: "active" },
  { id: "cs-3", name: "Thought Leadership Series", createdAt: "2026-02-10", status: "draft" },
];

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
    fromBoardId ? "board" : "content-strategy"
  );
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(fromBoardId ?? null);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const [savedBoards, setSavedBoards] = useState<{ id: string; name: string }[]>([]);
  const [contentStrategies, setContentStrategies] = useState<ContentStrategy[]>([]);
  const [assignedIds, setAssignedIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      const boards = loadBoards();
      setSavedBoards(boards.map((b) => ({ id: b.id, name: b.name })));
      // TODO: Fetch real content strategies from backend
      setContentStrategies(MOCK_CONTENT_STRATEGIES);
    }
  }, [open]);

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
  const selectedStrategy = contentStrategies.find((s) => s.id === selectedStrategyId);

  const defaultName = React.useMemo(() => {
    if (campaignSource === "board" && selectedBoardId && selectedBoard) {
      return `${selectedBoard.name} Campaign`;
    }
    if (campaignSource === "content-strategy" && selectedStrategyId && selectedStrategy) {
      return `${selectedStrategy.name} Campaign`;
    }
    if (fromBoardId) {
      return `Board: ${fromBoardId} Campaign`;
    }
    return "";
  }, [campaignSource, selectedBoardId, selectedBoard, selectedStrategyId, selectedStrategy, fromBoardId]);

  const displayName = name.trim() || defaultName || "Untitled Campaign";
  const hasContentStrategies = contentStrategies.length > 0;

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
    else {
      onCreate({
        name: displayName,
        type,
        templateType,
        fromBoardId: campaignSource === "board" ? (selectedBoardId ?? fromBoardId ?? undefined) : undefined,
        fromContentStrategyId: campaignSource === "content-strategy" ? (selectedStrategyId ?? undefined) : undefined,
        assignedUserIds: assignedIds,
      });
      onOpenChange(false);
      setStep(1);
      setName("");
      setType("Marketing");
      setTemplateType("Full Campaign Launch Blueprint");
      setCampaignSource(fromBoardId ? "board" : "content-strategy");
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
          {/* Step 1: Choose source - Content Strategy or Board */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Create campaign from</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  KORA uses your brand strategy, target audience, and industry insights to power your campaigns.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3">
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

          {/* Step 2: Select specific source */}
          {step === 2 && campaignSource === "content-strategy" && (
            <div className="space-y-4">
              {hasContentStrategies ? (
                <>
                  <div className="space-y-2">
                    <Label>Select a Content Strategy</Label>
                    <p className="text-xs text-muted-foreground">
                      Choose a strategy to base your campaign on. KORA will pull in relevant brand data automatically.
                    </p>
                    <Select
                      value={selectedStrategyId ?? ""}
                      onValueChange={(v) => setSelectedStrategyId(v || null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a strategy" />
                      </SelectTrigger>
                      <SelectContent>
                        {contentStrategies.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-muted-foreground" />
                              <span>{s.name}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                s.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                              }`}>
                                {s.status}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedStrategy && (
                    <div className="p-3 rounded-lg bg-muted/50 border text-sm">
                      <p className="font-medium">{selectedStrategy.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created {new Date(selectedStrategy.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium">No Content Strategies Yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Generate your first content strategy to unlock AI-powered campaign creation.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="mt-2">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Content Strategy
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Your strategy profile was created when you became a client. KORA already knows your brand.
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
                  {campaignSource === "content-strategy"
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
