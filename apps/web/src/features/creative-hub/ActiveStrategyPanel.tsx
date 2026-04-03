import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/integrations/supabase/types";
import {
  formatGoalLabel,
  FUNNEL_FOCUS_OPTIONS,
  isCampaignReadyBadge,
  computeRequiredItemCount,
  formatClientLabel,
} from "./strategyModel";

type ContentPlan = Tables<"content_plans">;
type CustomerRow = Pick<
  Tables<"customers">,
  "id" | "business_name" | "first_name" | "last_name"
>;

const NONE = "__none__";

interface ActiveStrategyPanelProps {
  plans: ContentPlan[];
  selectedPlanId: string | null;
  onSelectPlan: (id: string) => void;
  activePlan: ContentPlan | null;
  itemCount: number;
  /** Rows added via K.O.R.A “Add to table” (`source_type === "kora_chat"`). */
  koraChatIdeaCount: number;
  customers: CustomerRow[];
  linkedCampaign: {
    name: string;
    status: string;
    logistics_status: string;
    live_at: string | null;
  } | null;
  logisticsLabel: (s: string) => string;
  savePlanMutation: { mutate: (patch: Partial<ContentPlan> & { id: string }) => void };
  onGenerateStrategy: () => void;
}

export function ActiveStrategyPanel({
  plans,
  selectedPlanId,
  onSelectPlan,
  activePlan,
  itemCount,
  koraChatIdeaCount,
  customers,
  linkedCampaign,
  logisticsLabel,
  savePlanMutation,
  onGenerateStrategy,
}: ActiveStrategyPanelProps) {
  const required =
    activePlan &&
    activePlan.required_item_count != null &&
    activePlan.required_item_count > 0
      ? activePlan.required_item_count
      : activePlan
        ? computeRequiredItemCount(activePlan.timeframe_days ?? 30)
        : 0;
  const remaining = Math.max(0, required - itemCount);
  const campaignReady = isCampaignReadyBadge(activePlan, itemCount, koraChatIdeaCount);
  const funnelOpt = activePlan
    ? FUNNEL_FOCUS_OPTIONS.find((f) => f.id === activePlan.funnel_focus)
    : undefined;

  const clientRow = activePlan?.customer_id
    ? customers.find((c) => c.id === activePlan.customer_id)
    : undefined;
  const clientLabel = clientRow ? formatClientLabel(clientRow) : "—";

  const selectContentClass = "z-[100] max-h-[min(24rem,70vh)]";

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-lg">Strategy</CardTitle>
        <Button type="button" size="sm" className="gap-1.5 shrink-0" onClick={onGenerateStrategy}>
          <Wand2 className="h-3.5 w-3.5" />
          Generate strategy
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 space-y-2">
            <Label>Strategy</Label>
            <Select
              value={selectedPlanId ?? ""}
              onValueChange={onSelectPlan}
              disabled={plans.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a strategy" />
              </SelectTrigger>
              <SelectContent className={selectContentClass}>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title || "Untitled"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {activePlan && (
            <div className="flex flex-wrap items-end gap-2">
              <Badge variant={activePlan.status === "submitted" ? "default" : "secondary"}>
                {activePlan.status}
              </Badge>
              {linkedCampaign && (
                <>
                  <Badge variant="outline">Campaign: {linkedCampaign.name}</Badge>
                  <Badge variant="outline">{linkedCampaign.status}</Badge>
                  <Badge variant="outline">Logistics: {logisticsLabel(linkedCampaign.logistics_status)}</Badge>
                  {linkedCampaign.live_at && (
                    <Badge className="gap-1">Live</Badge>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {activePlan && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm border rounded-lg p-4 bg-muted/30">
              <div>
                <span className="text-muted-foreground">Primary goal</span>
                <p className="font-medium">{formatGoalLabel(activePlan.primary_goal ?? "more_views")}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Client</span>
                <p className="font-medium">{clientLabel}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Timeframe</span>
                <p className="font-medium">{activePlan.timeframe_days} days</p>
              </div>
              <div>
                <span className="text-muted-foreground">Funnel focus</span>
                <p className="font-medium">{funnelOpt?.label ?? activePlan.funnel_focus}</p>
                {funnelOpt?.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{funnelOpt.description}</p>
                )}
              </div>
              <div>
                <span className="text-muted-foreground">Required ideas</span>
                <p className="font-medium">{required}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Current ideas</span>
                <p className="font-medium">{itemCount}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Remaining</span>
                <p className="font-medium">{remaining}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Campaign ready</span>
                <p className="font-medium">{campaignReady ? "Yes" : "No"}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2 md:max-w-md">
                <Label htmlFor="plan-client">Client</Label>
                <Select
                  key={`client-${activePlan.id}`}
                  value={activePlan.customer_id ?? NONE}
                  onValueChange={(v) =>
                    savePlanMutation.mutate({
                      id: activePlan.id,
                      customer_id: v === NONE ? null : v,
                    })
                  }
                  disabled={!!activePlan.linked_campaign_id}
                >
                  <SelectTrigger id="plan-client">
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
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="plan-objective">Strategy objective</Label>
                <Textarea
                  id="plan-objective"
                  key={`obj-${activePlan.id}`}
                  rows={2}
                  defaultValue={activePlan.objective ?? ""}
                  disabled={!!activePlan.linked_campaign_id}
                  onBlur={(e) =>
                    savePlanMutation.mutate({ id: activePlan.id, objective: e.target.value || null })
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="plan-desc">Description</Label>
                <Textarea
                  id="plan-desc"
                  key={`desc-${activePlan.id}`}
                  rows={2}
                  defaultValue={activePlan.description ?? ""}
                  disabled={!!activePlan.linked_campaign_id}
                  onBlur={(e) =>
                    savePlanMutation.mutate({ id: activePlan.id, description: e.target.value || null })
                  }
                />
              </div>
            </div>
          </>
        )}

        {!activePlan && (
          <p className="text-sm text-muted-foreground">No strategy yet. Generate one above.</p>
        )}
      </CardContent>
    </Card>
  );
}
