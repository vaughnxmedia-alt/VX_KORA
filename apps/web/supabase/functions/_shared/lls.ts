import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type SupabaseClientLike = ReturnType<typeof createClient>;

export type LearningMode = "validated_learning" | "exploratory_learning";
export type StrategyOrigin = "human_defined" | "ai_discovered" | "hybrid";
export type ActivationMode =
  | "immediate"
  | "next_run"
  | "scheduled"
  | "experimental"
  | "reversible_experiment";

export interface LlsConfidenceInput {
  verification_confidence_component?: number | null;
  causal_confidence_component?: number | null;
  evidence_strength_component?: number | null;
  freshness_score?: number | null;
  sample_diversity_score?: number | null;
}

export interface LlsOutcomePayload extends LlsConfidenceInput {
  tenant_id?: string | null;
  lead_id?: string | null;
  subject_kind:
    | "free_audit"
    | "lead"
    | "meeting"
    | "payment"
    | "scheduled_post"
    | "publish_job"
    | "content_plan_item"
    | "brand_blueprint"
    | "assistant_message"
    | "client_action"
    | "system";
  subject_id?: string | null;
  actor_kind: "agent" | "employee" | "system" | "client" | "anonymous";
  actor_id?: string | null;
  action: string;
  strategy_origin?: StrategyOrigin;
  learning_mode?: LearningMode;
  intended_metric_type?: string | null;
  actual_metric_type?: string | null;
  predicted_conversion_probability?: number | null;
  expected_baseline?: number | null;
  delta_value?: number | null;
  success_flag?: boolean | null;
  revenue_impact?: number | null;
  time_to_outcome?: string | null;
  time_to_conversion?: string | null;
  failure_type?: "strategy_failure" | "execution_failure" | "audience_mismatch" | "unclear_offer" | "unknown";
  outcome_verified?: boolean;
  verification_source?: "system" | "analytics_api" | "human" | "inferred";
  causal_method?: "direct_attribution" | "time_window" | "heuristic" | "unknown";
  final_confidence?: number;
  confidence_model_version?: string;
  intended_outcome?: Record<string, unknown>;
  actual_outcome?: Record<string, unknown>;
  status: "success" | "failed" | "incomplete" | "pending";
  business_goal:
    | "booked_strategy_session"
    | "lead_quality"
    | "revenue"
    | "client_readiness"
    | "campaign_performance"
    | "retention"
    | "execution_compliance"
    | "brand_signal";
  lesson?: string | null;
  requires_review?: boolean;
  correlation_id?: string | null;
  strategy_id?: string | null;
  proposal_id?: string | null;
  messaging_angle?: string | null;
  hook?: string | null;
  projection_version?: string | null;
  occurred_at?: string;
  last_validated_at?: string | null;
  freshness_score?: number;
  metadata?: Record<string, unknown>;
}

export interface LlsAttributionPayload {
  lead_key: string;
  lead_kind: "subscriber" | "meeting" | "brand_blueprint" | "free_audit" | "customer";
  tenant_id?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  referrer?: string | null;
  landing_path?: string | null;
  current_url?: string | null;
  first_touch_at?: string | null;
  last_touch_at?: string | null;
  correlation_id?: string | null;
  lead_source?: string | null;
  messaging_angle?: string | null;
  hook?: string | null;
  attribution_confidence?: number;
  multi_touch_weight?: number;
  metadata?: Record<string, unknown>;
}

function clamp01(value: number | undefined | null, fallback = 0): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

export function llsEnabled(): boolean {
  return (Deno.env.get("LLS_ENABLED") ?? "true").toLowerCase() !== "false";
}

export function createServiceClient(): SupabaseClientLike {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for LLS writes.");
  }
  return createClient(url, serviceKey);
}

export function computeFinalConfidence(input: LlsConfidenceInput): number {
  const weighted =
    clamp01(input.verification_confidence_component) * 0.35 +
    clamp01(input.causal_confidence_component) * 0.35 +
    clamp01(input.evidence_strength_component) * 0.3;
  return Number(
    (
      weighted *
      clamp01(input.freshness_score, 1) *
      clamp01(input.sample_diversity_score, 1)
    ).toFixed(4),
  );
}

function normalizeOutcome(payload: LlsOutcomePayload) {
  const metadata = payload.metadata ?? {};
  const messagingAngle =
    payload.messaging_angle ?? (typeof metadata.messaging_angle === "string" ? metadata.messaging_angle : null);
  const hook = payload.hook ?? (typeof metadata.hook === "string" ? metadata.hook : null);
  const projectionVersion =
    payload.projection_version ??
    (typeof metadata.projection_version === "string" ? metadata.projection_version : null);
  const strategyId = payload.strategy_id ?? (typeof metadata.strategy_id === "string" ? metadata.strategy_id : null);
  const proposalId = payload.proposal_id ?? (typeof metadata.proposal_id === "string" ? metadata.proposal_id : null);
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const dbStrategyId = strategyId && uuidPattern.test(strategyId) ? strategyId : null;
  const dbProposalId = proposalId && uuidPattern.test(proposalId) ? proposalId : null;

  if (!payload.correlation_id?.trim()) {
    throw new Error("LLS outcome requires correlation_id.");
  }
  if (!strategyId && !proposalId) {
    throw new Error("LLS outcome requires strategy_id or proposal_id.");
  }
  if (!messagingAngle?.trim()) {
    throw new Error("LLS outcome requires messaging_angle.");
  }
  if (!hook?.trim()) {
    throw new Error("LLS outcome requires hook.");
  }
  if (!projectionVersion?.trim()) {
    throw new Error("LLS outcome requires projection_version.");
  }

  const normalized = {
    strategy_origin: "ai_discovered",
    learning_mode: "validated_learning",
    failure_type: "unknown",
    outcome_verified: false,
    verification_source: "inferred",
    verification_confidence_component: 0,
    causal_method: "unknown",
    causal_confidence_component: 0,
    evidence_strength_component: 0,
    confidence_model_version: "v1",
    intended_outcome: {},
    actual_outcome: {},
    requires_review: false,
    freshness_score: 1,
    metadata: {},
    ...payload,
    strategy_id: dbStrategyId,
    proposal_id: dbProposalId,
    messaging_angle: messagingAngle,
    hook,
    projection_version: projectionVersion,
    metadata: {
      ...metadata,
      strategy_id: strategyId,
      proposal_id: proposalId,
      messaging_angle: messagingAngle,
      hook,
      projection_version: projectionVersion,
    },
  };
  return {
    ...normalized,
    final_confidence: payload.final_confidence ?? computeFinalConfidence(normalized),
  };
}

export async function recordOutcome(
  supabase: SupabaseClientLike,
  payload: LlsOutcomePayload,
): Promise<{ id?: string; skipped?: boolean }> {
  if (!llsEnabled()) return { skipped: true };
  const { data, error } = await supabase
    .from("lls_outcome_events")
    .insert(normalizeOutcome(payload))
    .select("id")
    .single();
  if (error) throw error;
  return { id: data?.id };
}

export async function safeRecordOutcome(
  supabase: SupabaseClientLike,
  payload: LlsOutcomePayload,
): Promise<{ id?: string; skipped?: boolean; error?: string }> {
  try {
    return await recordOutcome(supabase, payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[LLS] outcome write failed", message);
    return { error: message };
  }
}

export async function upsertFunnelAttribution(
  supabase: SupabaseClientLike,
  payload: LlsAttributionPayload,
): Promise<{ id?: string; skipped?: boolean }> {
  if (!llsEnabled()) return { skipped: true };
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("lls_funnel_attribution")
    .upsert(
      {
        attribution_confidence: 0,
        multi_touch_weight: 0,
        metadata: {},
        ...payload,
        first_touch_at: payload.first_touch_at ?? now,
        last_touch_at: payload.last_touch_at ?? now,
      },
      { onConflict: "lead_key,lead_kind" },
    )
    .select("id")
    .single();
  if (error) throw error;
  return { id: data?.id };
}

export async function safeUpsertFunnelAttribution(
  supabase: SupabaseClientLike,
  payload: LlsAttributionPayload,
): Promise<{ id?: string; skipped?: boolean; error?: string }> {
  try {
    return await upsertFunnelAttribution(supabase, payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[LLS] attribution upsert failed", message);
    return { error: message };
  }
}

export function readAttributionFromPayload(body: Record<string, unknown>) {
  const source = (body.leadSource ?? body.attribution ?? body) as Record<string, unknown>;
  const messagingAngle =
    typeof source.messaging_angle === "string"
      ? source.messaging_angle
      : typeof source.utm_campaign === "string"
        ? source.utm_campaign
        : null;
  const hook =
    typeof source.hook === "string"
      ? source.hook
      : typeof source.utm_content === "string"
        ? source.utm_content
        : null;
  return {
    utm_source: typeof source.utm_source === "string" ? source.utm_source : null,
    utm_medium: typeof source.utm_medium === "string" ? source.utm_medium : null,
    utm_campaign: typeof source.utm_campaign === "string" ? source.utm_campaign : null,
    utm_content: typeof source.utm_content === "string" ? source.utm_content : null,
    utm_term: typeof source.utm_term === "string" ? source.utm_term : null,
    referrer: typeof source.referrer === "string" ? source.referrer : null,
    landing_path: typeof source.landing_path === "string"
      ? source.landing_path
      : typeof source.landing_page === "string"
        ? source.landing_page
        : null,
    current_url: typeof source.current_url === "string" ? source.current_url : null,
    first_touch_at: typeof source.first_touch_at === "string"
      ? source.first_touch_at
      : typeof source.first_touch_timestamp === "string"
        ? source.first_touch_timestamp
        : null,
    last_touch_at: typeof source.last_touch_at === "string"
      ? source.last_touch_at
      : typeof source.last_touch_timestamp === "string"
        ? source.last_touch_timestamp
        : null,
    correlation_id: typeof source.correlation_id === "string" ? source.correlation_id : null,
    lead_source: typeof source.lead_source === "string" ? source.lead_source : null,
    messaging_angle: messagingAngle,
    hook,
    metadata: source,
  };
}
