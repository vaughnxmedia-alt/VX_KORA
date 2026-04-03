import type { Tables } from "@/integrations/supabase/types";

// TODO: Deeper goal-conditioned AI: map funnel_stage weights by goal, suggest row templates, and wire vector memory per tenant.

export type ContentStrategyPlan = Tables<"content_plans">;

export type PrimaryGoalId =
  | "more_views"
  | "more_followers"
  | "more_conversions"
  | "more_leads"
  | "more_sales"
  | "better_engagement"
  | "better_brand_awareness"
  | "stronger_retention";

export const PRIMARY_GOALS: { id: PrimaryGoalId; label: string }[] = [
  { id: "more_views", label: "More Views" },
  { id: "more_followers", label: "More Followers" },
  { id: "more_conversions", label: "More Conversions" },
  { id: "more_leads", label: "More Leads" },
  { id: "more_sales", label: "More Sales" },
  { id: "better_engagement", label: "Better Engagement" },
  { id: "better_brand_awareness", label: "Better Brand Awareness" },
  { id: "stronger_retention", label: "Stronger Retention" },
];

/** AIDA + Recap: five stages of content (paid and organic). full_funnel balances across all five. */
export const FUNNEL_FOCUS_OPTIONS: { id: string; label: string; description: string }[] = [
  { id: "awareness", label: "Awareness", description: "Top of funnel, reach and discovery." },
  { id: "interest", label: "Interest", description: "Spark curiosity and consideration." },
  { id: "desire", label: "Desire", description: "Build want and preference." },
  { id: "action", label: "Action", description: "Drive clicks, leads, and conversions." },
  { id: "recap", label: "Recap", description: "Reinforce, summarize, and retain." },
  {
    id: "full_funnel",
    label: "Full funnel (all five stages)",
    description: "Awareness, Interest, Desire, Action, Recap. Paid and organic.",
  },
];

export const TIMEFRAME_PRESETS = [30, 60, 90] as const;

/** Content idea pillars (Creative Hub — matches strategy pillar badges). */
export const CREATIVE_PILLAR_OPTIONS = [
  {
    value: "Strategic Communications & Positioning",
    label: "Strategic Communications & Positioning",
  },
  { value: "PR & Visibility Strategy", label: "PR & Visibility Strategy" },
  {
    value: "Brand Authority & Market Behavior",
    label: "Brand Authority & Market Behavior",
  },
] as const;

/** One content idea per day of the strategy window. */
export function computeRequiredItemCount(timeframeDays: number): number {
  return Math.max(1, Math.floor(timeframeDays) || 30);
}

export function formatGoalLabel(goalId: string | null | undefined): string {
  const g = PRIMARY_GOALS.find((x) => x.id === goalId);
  return g?.label ?? goalId ?? "";
}

/** Display name for CRM client rows (Creative Hub client picker). */
export function formatClientLabel(c: {
  business_name: string | null;
  first_name: string | null;
  last_name: string | null;
}): string {
  const name = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
  return (c.business_name && c.business_name.trim()) || name || "Unnamed client";
}

export function getGoalGuidance(primaryGoal: string | null | undefined): {
  summary: string;
  koraHint: string;
} {
  switch (primaryGoal) {
    case "more_views":
      return {
        summary: "Prioritize awareness-heavy content, reach-based hooks, and discoverability formats.",
        koraHint:
          "Bias: awareness stage, broader hooks, reach-friendly formats, discovery-based ideas.",
      };
    case "more_followers":
      return {
        summary:
          "Prioritize awareness plus connection content, recurring series, and audience identity content.",
        koraHint:
          "Bias: identity-building content, recurring themes, community-based posts, audience resonance.",
      };
    case "more_conversions":
      return {
        summary:
          "Prioritize consideration and conversion content, proof, offer clarity, and strong CTAs.",
        koraHint:
          "Bias: proof, trust, authority, objections, CTA-driven content, offer clarity.",
      };
    default:
      return {
        summary: "Align ideas with the selected primary goal and funnel focus.",
        koraHint: "Use funnel focus and goals to balance stages and messaging.",
      };
  }
}

export function isStrategyReadyForCampaign(
  plan: ContentStrategyPlan | null,
  itemCount: number
): { ok: boolean; message?: string } {
  if (!plan?.title?.trim()) {
    return { ok: false, message: "Add a strategy title." };
  }
  const required =
    plan.required_item_count != null && plan.required_item_count > 0
      ? plan.required_item_count
      : computeRequiredItemCount(plan.timeframe_days ?? 30);
  if (itemCount < required) {
    const rem = required - itemCount;
    return {
      ok: false,
      message: `This ${plan.timeframe_days ?? required}-day strategy for ${formatGoalLabel(plan.primary_goal)} requires ${required} ideas. You currently have ${itemCount}. Add ${rem} more idea${rem === 1 ? "" : "s"} before submitting to campaign.`,
    };
  }
  const hasClient = !!plan.customer_id;
  const hasObjective = !!plan.objective?.trim();
  if (!hasClient && !hasObjective) {
    return {
      ok: false,
      message: "Choose a client or add a strategy objective.",
    };
  }
  return { ok: true };
}

/** Minimum ideas added from K.O.R.A (Add to table) before submit to campaign. */
export const MIN_KORA_IDEAS_FOR_CAMPAIGN_SUBMIT = 5;

/** Ready for campaign when quota met, K.O.R.A minimum met, and not already linked. */
export function isCampaignReadyBadge(
  plan: ContentStrategyPlan | null,
  itemCount: number,
  koraChatIdeaCount: number,
): boolean {
  if (!plan || plan.linked_campaign_id) return false;
  if (koraChatIdeaCount < MIN_KORA_IDEAS_FOR_CAMPAIGN_SUBMIT) return false;
  const r = isStrategyReadyForCampaign(plan, itemCount);
  return r.ok;
}
