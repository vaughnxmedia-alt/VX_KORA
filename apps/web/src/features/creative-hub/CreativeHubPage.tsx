import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
import { KoraCreativeAssistant } from "./KoraCreativeAssistant";
import { CampaignConversionModal } from "./CampaignConversionModal";
import { LogisticsDecisionModal } from "./LogisticsDecisionModal";
import { GenerateNewStrategyModal } from "./GenerateNewStrategyModal";
import { ActiveStrategyPanel } from "./ActiveStrategyPanel";
import { ContentStrategyTable } from "./ContentStrategyTable";
import {
  isStrategyReadyForCampaign,
  getGoalGuidance,
  computeRequiredItemCount,
  MIN_KORA_IDEAS_FOR_CAMPAIGN_SUBMIT,
} from "./strategyModel";
import { fetchCreativeHubIntel } from "./creativeHubIntel";
import { fetchCustomersWithBrandIdentity } from "@/lib/brandIdentityScope";
import { parseKoraIdeaText } from "./parseKoraIdea";

type ContentPlan = Tables<"content_plans">;
type ContentPlanItem = Tables<"content_plan_items">;

function logisticsLabel(status: string) {
  switch (status) {
    case "created":
      return "Created";
    case "needed":
      return "Needed";
    case "not_needed_now":
      return "Not needed right now";
    default:
      return "Not set";
  }
}

export function CreativeHubPage() {
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [strategyModalOpen, setStrategyModalOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [logisticsOpen, setLogisticsOpen] = useState(false);
  const [lastCampaignId, setLastCampaignId] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<{
    campaignId: string;
    campaignName: string;
  } | null>(null);
  const [pageTitle, setPageTitle] = useState("");

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["content-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_plans")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ContentPlan[];
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-list-with-brand-identity"],
    queryFn: fetchCustomersWithBrandIdentity,
  });

  const { data: creativeIntel } = useQuery({
    queryKey: ["creative-hub-intel"],
    queryFn: fetchCreativeHubIntel,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!selectedPlanId && plans.length > 0) {
      setSelectedPlanId(plans[0].id);
    }
  }, [plans, selectedPlanId]);

  useEffect(() => {
    if (plans.length === 0) {
      if (selectedPlanId) setSelectedPlanId(null);
      return;
    }
    if (selectedPlanId && !plans.some((p) => p.id === selectedPlanId)) {
      setSelectedPlanId(plans[0].id);
    }
  }, [plans, selectedPlanId]);

  const activePlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId]
  );

  useEffect(() => {
    setPageTitle(activePlan?.title ?? "");
  }, [activePlan?.id, activePlan?.title]);

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["content-plan-items", selectedPlanId],
    queryFn: async () => {
      if (!selectedPlanId) return [];
      const { data, error } = await supabase
        .from("content_plan_items")
        .select("*")
        .eq("content_plan_id", selectedPlanId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data || []) as ContentPlanItem[];
    },
    enabled: !!selectedPlanId,
  });

  const { data: defaultCalendarId } = useQuery({
    queryKey: ["default-content-calendar"],
    queryFn: async () => {
      const { data, error } = await supabase.from("content_calendars").select("id, calendar_type");
      if (error) throw error;
      const j = (data || []).find((c) => c.calendar_type === "jahknowspr");
      return j?.id ?? data?.[0]?.id ?? null;
    },
  });

  const savePlanMutation = useMutation({
    mutationFn: async (patch: Partial<ContentPlan> & { id: string }) => {
      const { id, ...rest } = patch;
      const { error } = await supabase
        .from("content_plans")
        .update({ ...rest, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["content-plans"] });
    },
  });

  const persistCampaignTitle = () => {
    if (!activePlan) return;
    const t = pageTitle.trim();
    if (t && t !== activePlan.title) {
      savePlanMutation.mutate({ id: activePlan.id, title: t });
    }
  };

  const addItemMutation = useMutation({
    mutationFn: async (planId: string) => {
      const maxOrder = items.reduce((m, i) => Math.max(m, i.order_index), -1);
      const { error } = await supabase.from("content_plan_items").insert({
        content_plan_id: planId,
        title: "New row",
        order_index: maxOrder + 1,
        source_type: "manual",
        status: "draft",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["content-plan-items", selectedPlanId] });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async (row: Pick<ContentPlanItem, "id"> & Partial<ContentPlanItem>) => {
      const { id, ...rest } = row;
      const { error } = await supabase
        .from("content_plan_items")
        .update({ ...rest, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["content-plan-items", selectedPlanId] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("content_plan_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["content-plan-items", selectedPlanId] });
      toast.success("Idea removed");
    },
    onError: (e: unknown) => {
      const msg =
        typeof e === "object" &&
        e !== null &&
        "message" in e &&
        typeof (e as { message: string }).message === "string"
          ? (e as { message: string }).message
          : e instanceof Error
            ? e.message
            : "Could not delete idea";
      toast.error(msg);
    },
  });

  const addKoraIdeaMutation = useMutation({
    mutationFn: async (rawText: string) => {
      if (!selectedPlanId) throw new Error("Select a content plan first.");
      const parsed = parseKoraIdeaText(rawText);
      const maxOrder = items.reduce((m, i) => Math.max(m, i.order_index), -1);
      const { error } = await supabase.from("content_plan_items").insert({
        content_plan_id: selectedPlanId,
        title: parsed.title,
        hook: parsed.hook,
        format: parsed.format,
        platform: parsed.platform,
        pillar: parsed.pillar,
        angle: parsed.angle,
        notes: parsed.notes,
        order_index: maxOrder + 1,
        source_type: "kora_chat",
        ai_generated: true,
        status: "draft",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["content-plan-items", selectedPlanId] });
      toast.success("Added to Ideas table");
    },
    onError: (e: unknown) => {
      const msg =
        typeof e === "object" &&
        e !== null &&
        "message" in e &&
        typeof (e as { message: string }).message === "string"
          ? (e as { message: string }).message
          : e instanceof Error
            ? e.message
            : "Could not add idea";
      toast.error(msg);
    },
  });

  const koraChatIdeaCount = useMemo(
    () => items.filter((i) => i.source_type === "kora_chat").length,
    [items],
  );

  const runConversion = async (opts: { createDraftPosts: boolean }) => {
    if (koraChatIdeaCount < MIN_KORA_IDEAS_FOR_CAMPAIGN_SUBMIT) {
      toast.error(
        `Add at least ${MIN_KORA_IDEAS_FOR_CAMPAIGN_SUBMIT} ideas from K.O.R.A (Add to table on each chat idea). You have ${koraChatIdeaCount}.`,
      );
      return;
    }
    const check = isStrategyReadyForCampaign(activePlan, items.length);
    if (!check.ok) {
      toast.error(check.message ?? "Cannot submit yet.");
      return;
    }
    if (!activePlan || !defaultCalendarId) {
      toast.error("No calendar found. Create a content calendar first.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const campaignName = activePlan.title.trim() || "Campaign";

    const { data: campaign, error: cErr } = await supabase
      .from("campaigns")
      .insert({
        name: campaignName,
        objective: activePlan.objective,
        primary_platform: activePlan.primary_platform,
        content_plan_id: activePlan.id,
        status: "scheduled",
        logistics_status: "unset",
        created_by: user?.id ?? null,
        scheduled_post_count: opts.createDraftPosts
          ? items.filter((i) => i.planned_date).length
          : 0,
      })
      .select("id, name")
      .single();

    if (cErr || !campaign) {
      toast.error(cErr?.message || "Could not create campaign.");
      return;
    }

    const { error: linkErr } = await supabase
      .from("content_plans")
      .update({
        linked_campaign_id: campaign.id,
        status: "submitted",
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", activePlan.id);

    if (linkErr) {
      toast.error(linkErr.message);
      return;
    }

    if (opts.createDraftPosts) {
      const rows = items.filter((i) => i.planned_date);
      for (const item of rows) {
        const platforms = item.platform ? [item.platform] : ["instagram"];
        const { error: pErr } = await supabase.from("scheduled_posts").insert({
          calendar_id: defaultCalendarId,
          caption: item.caption || item.title || "",
          platforms,
          scheduled_date: item.planned_date!,
          scheduled_time: "12:00",
          status: "scheduled",
          post_type: "social",
          campaign_id: campaign.id,
          campaign_name_snapshot: campaign.name,
          content_plan_item_id: item.id,
        });
        if (pErr) console.warn("scheduled_posts insert", pErr);
      }
    }

    void queryClient.invalidateQueries({ queryKey: ["content-plans"] });
    void queryClient.invalidateQueries({ queryKey: ["operational-campaigns"] });
    void queryClient.invalidateQueries({ queryKey: ["scheduled-posts"] });

    setLastCampaignId(campaign.id);
    setSuccessBanner({ campaignId: campaign.id, campaignName: campaign.name });
    setLogisticsOpen(true);
    toast.success("Campaign created.");
  };

  const linkedCampaignId = activePlan?.linked_campaign_id;

  const { data: linkedCampaign } = useQuery({
    queryKey: ["campaign-brief", linkedCampaignId],
    queryFn: async () => {
      if (!linkedCampaignId) return null;
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name, status, logistics_status, live_at, first_published_at, published_post_count")
        .eq("id", linkedCampaignId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!linkedCampaignId,
  });

  const koraStrategyContext = useMemo(() => {
    const g = activePlan ? getGoalGuidance(activePlan.primary_goal ?? "more_views") : null;
    const req = activePlan
      ? activePlan.required_item_count ?? computeRequiredItemCount(activePlan.timeframe_days ?? 30)
      : undefined;
    const cur = items.length;
    const rem = req != null ? Math.max(0, req - cur) : undefined;
    return {
      primary_goal: activePlan?.primary_goal,
      funnel_focus: activePlan?.funnel_focus,
      timeframe_days: activePlan?.timeframe_days,
      required_item_count: req,
      current_item_count: activePlan ? cur : undefined,
      remaining_item_count: rem,
      tone_direction: activePlan?.tone_direction,
      messaging_direction: activePlan?.messaging_direction,
      goal_guidance_kora: g?.koraHint,
      brand_blueprint_summary: creativeIntel?.blueprint || undefined,
      audience_summary: creativeIntel?.audience || undefined,
      brand_strategy_summary: creativeIntel?.brandStrategy || undefined,
    };
  }, [activePlan, items.length, creativeIntel]);

  const handleSubmitClick = () => {
    if (koraChatIdeaCount < MIN_KORA_IDEAS_FOR_CAMPAIGN_SUBMIT) {
      toast.error(
        `Add at least ${MIN_KORA_IDEAS_FOR_CAMPAIGN_SUBMIT} ideas from K.O.R.A (Add to table on each chat idea). You have ${koraChatIdeaCount}.`,
      );
      return;
    }
    const check = isStrategyReadyForCampaign(activePlan, items.length);
    if (!check.ok) {
      toast.error(check.message ?? "Cannot submit yet.");
      return;
    }
    setConvertOpen(true);
  };

  if (plansLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Input
          className="text-2xl font-semibold tracking-tight h-auto max-w-2xl border-0 border-b border-transparent rounded-none px-0 shadow-none focus-visible:ring-0 focus-visible:border-b focus-visible:border-input bg-transparent"
          placeholder="Campaign title"
          value={pageTitle}
          onChange={(e) => setPageTitle(e.target.value)}
          onBlur={persistCampaignTitle}
          disabled={!!activePlan?.linked_campaign_id}
          aria-label="Campaign title"
        />
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="outline" asChild>
            <Link to="/dashboard/get-inspired">Get Inspired</Link>
          </Button>
        </div>
      </div>

      <GenerateNewStrategyModal
        open={strategyModalOpen}
        onOpenChange={setStrategyModalOpen}
        customers={customers}
        initialTitle={pageTitle}
        onCreated={(id) => {
          void queryClient.invalidateQueries({ queryKey: ["content-plans"] });
          setSelectedPlanId(id);
        }}
      />

      {successBanner && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Campaign “{successBanner.campaignName}” is ready.</p>
                <p className="text-sm text-muted-foreground">
                  Open the campaign record, logistics, or calendar when you are done with the logistics
                  prompt.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to={`/dashboard/campaigns/${successBanner.campaignId}`}>Campaign</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link
                  to={`/dashboard/logistics?campaignId=${encodeURIComponent(successBanner.campaignId)}`}
                >
                  Logistics
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard/calendar">Content calendar</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <CampaignConversionModal
        open={convertOpen}
        onOpenChange={setConvertOpen}
        planTitle={activePlan?.title || "Content strategy"}
        onConfirm={runConversion}
      />

      {lastCampaignId && (
        <LogisticsDecisionModal
          open={logisticsOpen}
          onOpenChange={setLogisticsOpen}
          campaignId={lastCampaignId}
          onSkip={async () => {
            await supabase
              .from("campaigns")
              .update({
                logistics_status: "not_needed_now",
                updated_at: new Date().toISOString(),
              })
              .eq("id", lastCampaignId);
            void queryClient.invalidateQueries({ queryKey: ["operational-campaigns"] });
            void queryClient.invalidateQueries({ queryKey: ["campaign-brief", linkedCampaignId] });
            void queryClient.invalidateQueries({ queryKey: ["content-plans"] });
          }}
        />
      )}

      <ActiveStrategyPanel
        plans={plans}
        selectedPlanId={selectedPlanId}
        onSelectPlan={setSelectedPlanId}
        activePlan={activePlan}
        itemCount={items.length}
        koraChatIdeaCount={koraChatIdeaCount}
        customers={customers}
        linkedCampaign={linkedCampaign ?? null}
        logisticsLabel={logisticsLabel}
        savePlanMutation={savePlanMutation}
        onGenerateStrategy={() => setStrategyModalOpen(true)}
      />

      <ContentStrategyTable
        activePlanId={selectedPlanId}
        linkedCampaignId={activePlan?.linked_campaign_id ?? null}
        items={items}
        itemsLoading={itemsLoading}
        onAddRow={() => {
          if (activePlan) addItemMutation.mutate(activePlan.id);
        }}
        addPending={addItemMutation.isPending}
        onUpdateRow={(row) => updateItemMutation.mutate(row)}
        onDeleteRow={(id) => deleteItemMutation.mutate(id)}
        deletingRowId={deleteItemMutation.isPending ? deleteItemMutation.variables ?? null : null}
        onSubmitCampaign={handleSubmitClick}
        submitDisabled={
          !activePlan ||
          !!activePlan?.linked_campaign_id ||
          koraChatIdeaCount < MIN_KORA_IDEAS_FOR_CAMPAIGN_SUBMIT
        }
      />

      <div>
        <h2 className="text-lg font-semibold mb-2">K.O.R.A</h2>
        <KoraCreativeAssistant
          contentPlanId={selectedPlanId ?? undefined}
          planTitle={activePlan?.title}
          strategyContext={koraStrategyContext}
          persistMessages={!!selectedPlanId}
          className="min-h-[520px]"
          onAddIdeaToTable={(raw) => addKoraIdeaMutation.mutate(raw)}
        />
      </div>
    </div>
  );
}
