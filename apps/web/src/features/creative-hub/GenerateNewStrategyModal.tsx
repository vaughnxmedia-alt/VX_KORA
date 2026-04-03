import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  PRIMARY_GOALS,
  FUNNEL_FOCUS_OPTIONS,
  TIMEFRAME_PRESETS,
  computeRequiredItemCount,
  formatClientLabel,
  type PrimaryGoalId,
} from "./strategyModel";

type CustomerRow = Pick<
  Tables<"customers">,
  "id" | "business_name" | "first_name" | "last_name"
>;

const NONE = "__none__";

interface GenerateNewStrategyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
  customers: CustomerRow[];
  /** Prefills the strategy title from the page campaign title field. */
  initialTitle?: string;
}

export function GenerateNewStrategyModal({
  open,
  onOpenChange,
  onCreated,
  customers,
  initialTitle = "",
}: GenerateNewStrategyModalProps) {
  const [title, setTitle] = useState("");
  const [customerId, setCustomerId] = useState<string>(NONE);
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoalId>("more_views");
  const [timeframePreset, setTimeframePreset] = useState<string>("30");
  const [customDays, setCustomDays] = useState("30");
  const [funnelFocus, setFunnelFocus] = useState("full_funnel");
  const [toneDirection, setToneDirection] = useState("");
  const [messagingDirection, setMessagingDirection] = useState("");
  const [industryContext, setIndustryContext] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setTitle(initialTitle.trim());
  }, [open, initialTitle]);

  const timeframeDays =
    timeframePreset === "custom"
      ? Math.max(1, parseInt(customDays, 10) || 30)
      : parseInt(timeframePreset, 10);

  const resetForm = () => {
    setTitle("");
    setCustomerId(NONE);
    setPrimaryGoal("more_views");
    setTimeframePreset("30");
    setCustomDays("30");
    setFunnelFocus("full_funnel");
    setToneDirection("");
    setMessagingDirection("");
    setIndustryContext("");
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Add a strategy title.");
      return;
    }
    const days = timeframeDays;
    const required = computeRequiredItemCount(days);

    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + days);

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const cid = customerId === NONE ? null : customerId;

      const { data, error } = await supabase
        .from("content_plans")
        .insert({
          title: title.trim(),
          customer_id: cid,
          workspace_label: null,
          primary_goal: primaryGoal,
          secondary_goal: null,
          primary_platform: null,
          platforms: null,
          timeframe_days: days,
          required_item_count: required,
          funnel_focus: funnelFocus,
          strategy_window_start: start.toISOString().slice(0, 10),
          strategy_window_end: end.toISOString().slice(0, 10),
          tone_direction: toneDirection.trim() || null,
          messaging_direction: messagingDirection.trim() || null,
          industry_context: industryContext.trim() || null,
          status: "draft",
          created_by: user?.id ?? null,
        })
        .select("id")
        .single();

      if (error) throw error;
      toast.success("Content strategy created.");
      onCreated(data.id);
      onOpenChange(false);
      resetForm();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not create strategy.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const selectContentClass = "z-[100] max-h-[min(24rem,70vh)]";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) resetForm();
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New strategy</DialogTitle>
          <DialogDescription className="sr-only">Configure goal, timeframe, and funnel.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="strat-title">Strategy title</Label>
            <Input
              id="strat-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q2 Instagram push"
            />
          </div>

          <div className="space-y-2">
            <Label>Client (optional)</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger id="strat-client">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent className={selectContentClass}>
                <SelectItem value={NONE}>None</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {formatClientLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Primary goal</Label>
            <Select value={primaryGoal} onValueChange={(v) => setPrimaryGoal(v as PrimaryGoalId)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={selectContentClass}>
                {PRIMARY_GOALS.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Timeframe</Label>
              <Select value={timeframePreset} onValueChange={setTimeframePreset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={selectContentClass}>
                  {TIMEFRAME_PRESETS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d} days
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {timeframePreset === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="custom-days">Days</Label>
                <Input
                  id="custom-days"
                  type="number"
                  min={1}
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Funnel focus</Label>
            <p className="text-xs text-muted-foreground leading-snug">
              Awareness, Interest, Desire, Action, Recap. Five stages of content. Paid and organic.
            </p>
            <Select value={funnelFocus} onValueChange={setFunnelFocus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={`max-w-[min(100vw-2rem,28rem)] ${selectContentClass}`}>
                {FUNNEL_FOCUS_OPTIONS.map((f) => (
                  <SelectItem key={f.id} value={f.id} className="whitespace-normal">
                    <span className="block py-0.5">
                      <span className="font-medium">{f.label}</span>
                      <span className="block text-xs text-muted-foreground font-normal">
                        {f.description}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {FUNNEL_FOCUS_OPTIONS.find((x) => x.id === funnelFocus)?.description}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tone-dir">Tone / messaging direction</Label>
            <Textarea
              id="tone-dir"
              rows={2}
              value={toneDirection}
              onChange={(e) => setToneDirection(e.target.value)}
              placeholder="Tone notes"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="msg-dir">Messaging notes</Label>
            <Textarea
              id="msg-dir"
              rows={2}
              value={messagingDirection}
              onChange={(e) => setMessagingDirection(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">Industry context (optional)</Label>
            <Input
              id="industry"
              value={industryContext}
              onChange={(e) => setIndustryContext(e.target.value)}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Required ideas for this window: {computeRequiredItemCount(timeframeDays)} (one per day).
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create strategy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
