type SupabaseResult<T> = Promise<{ data: T | null; error: unknown }>;

type SupabaseTableClient<T> = {
  insert(payload: T | T[]): {
    select(columns?: string): {
      single(): SupabaseResult<Record<string, unknown>>;
    };
  };
  upsert(payload: T | T[], options?: Record<string, unknown>): {
    select(columns?: string): {
      single(): SupabaseResult<Record<string, unknown>>;
    };
  };
};

export type SupabaseLikeClient = {
  from<T = Record<string, unknown>>(table: string): SupabaseTableClient<T>;
};

export type SubjectKind =
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

export type ActorKind = "agent" | "employee" | "system" | "client" | "anonymous";
export type OutcomeStatus = "success" | "failed" | "incomplete" | "pending";
export type BusinessGoal =
  | "booked_strategy_session"
  | "lead_quality"
  | "revenue"
  | "client_readiness"
  | "campaign_performance"
  | "retention"
  | "execution_compliance"
  | "brand_signal";
export type FailureType =
  | "strategy_failure"
  | "execution_failure"
  | "audience_mismatch"
  | "unclear_offer"
  | "unknown";
export type VerificationSource = "system" | "analytics_api" | "human" | "inferred";
export type CausalMethod = "direct_attribution" | "time_window" | "heuristic" | "unknown";
export type StrategyOrigin = "human_defined" | "ai_discovered" | "hybrid";
export type LearningMode = "validated_learning" | "exploratory_learning";
export type ActivationMode =
  | "immediate"
  | "next_run"
  | "scheduled"
  | "experimental"
  | "reversible_experiment";
export type AffectedLayer = "ads" | "funnel" | "content" | "execution" | "messaging";
export type RiskType = "strategy_shift" | "messaging_change" | "audience_targeting" | "unknown";
export type BlastRadius = "low" | "medium" | "high";
export type DecisionAction = "approve" | "reject" | "amend" | "defer" | "test_only" | "override";
export type DecayStatus = "fresh" | "stale" | "expired";

export interface ConfidenceConfig {
  verificationWeight?: number;
  causalWeight?: number;
  evidenceWeight?: number;
  freshnessScore?: number;
  sampleDiversityScore?: number;
}

export interface OutcomeEvent {
  tenant_id?: string | null;
  lead_id?: string | null;
  subject_kind: SubjectKind;
  subject_id?: string | null;
  actor_kind: ActorKind;
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
  failure_type?: FailureType;
  outcome_verified?: boolean;
  verification_source?: VerificationSource;
  verification_confidence_component?: number;
  causal_method?: CausalMethod;
  causal_confidence_component?: number;
  evidence_strength_component?: number;
  final_confidence?: number;
  confidence_model_version?: string;
  intended_outcome?: Record<string, unknown>;
  actual_outcome?: Record<string, unknown>;
  status: OutcomeStatus;
  business_goal: BusinessGoal;
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

export interface FunnelAttribution {
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
  correlation_id?: string | null;
  lead_source?: string | null;
  messaging_angle?: string | null;
  hook?: string | null;
  attribution_confidence?: number;
  multi_touch_weight?: number;
  first_touch_at?: string;
  last_touch_at?: string;
  metadata?: Record<string, unknown>;
}

export interface InsightProposal {
  tenant_id: string;
  proposed_by?: string;
  proposal_kind:
    | "messaging_angle"
    | "hook"
    | "lead_source"
    | "retargeting"
    | "campaign"
    | "client_readiness"
    | "execution"
    | "strategy_memory_update";
  claim: string;
  recommended_action: string;
  affected_layer: AffectedLayer;
  strategy_origin: StrategyOrigin;
  learning_mode: LearningMode;
  activation_mode: ActivationMode;
  activation_schedule?: string | null;
  rollback_condition?: Record<string, unknown> | null;
  rollback_trigger?: string | null;
  exploration_feedback_loop?: Record<string, unknown> | null;
  evidence_event_ids: string[];
  supporting_metrics?: Record<string, unknown> | null;
  sample_size?: number | null;
  final_confidence?: number | null;
  revenue_impact?: number | null;
  risk_score: number;
  risk_type: RiskType;
  blast_radius: BlastRadius;
  variance_by_segment?: Record<string, unknown> | null;
  time_distribution?: Record<string, unknown> | null;
  sample_diversity_score?: number | null;
  alignment_score: number;
  brand_safety_flag: boolean;
  brand_vector?: Record<string, unknown> | null;
  deviation_score?: number | null;
  intent_alignment_score?: number | null;
  priority_score?: number | null;
  freshness_score?: number;
  last_validated_at?: string | null;
  decay_status?: DecayStatus;
  insight_status?: "active" | "stale" | "invalidated" | "archived";
  evidence?: Record<string, unknown>;
  status?: "pending_review" | "approved" | "rejected" | "amended" | "deferred" | "test_only" | "override" | "applied";
}

function clamp01(value: number | undefined | null, fallback = 0): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

export function computeFinalConfidence(
  payload: Pick<
    OutcomeEvent,
    | "verification_confidence_component"
    | "causal_confidence_component"
    | "evidence_strength_component"
    | "freshness_score"
  > & { sample_diversity_score?: number | null },
  config: ConfidenceConfig = {},
): number {
  const verificationWeight = config.verificationWeight ?? 0.35;
  const causalWeight = config.causalWeight ?? 0.35;
  const evidenceWeight = config.evidenceWeight ?? 0.3;
  const weighted =
    clamp01(payload.verification_confidence_component) * verificationWeight +
    clamp01(payload.causal_confidence_component) * causalWeight +
    clamp01(payload.evidence_strength_component) * evidenceWeight;
  return Number(
    (
      weighted *
      clamp01(config.freshnessScore ?? payload.freshness_score, 1) *
      clamp01(config.sampleDiversityScore ?? payload.sample_diversity_score, 1)
    ).toFixed(4),
  );
}

export function validateLearningLane(
  payload: Pick<
    InsightProposal,
    | "strategy_origin"
    | "learning_mode"
    | "activation_mode"
    | "final_confidence"
    | "sample_size"
    | "evidence_event_ids"
    | "supporting_metrics"
    | "risk_type"
    | "blast_radius"
    | "brand_safety_flag"
    | "intent_alignment_score"
    | "exploration_feedback_loop"
    | "rollback_condition"
  >,
  config: { minFinalConfidence?: number; minSampleSize?: number; minIntentAlignment?: number } = {},
): { valid: boolean; reason?: string } {
  if (payload.learning_mode === "exploratory_learning") {
    if (!["human_defined", "hybrid"].includes(payload.strategy_origin)) {
      return { valid: false, reason: "Exploratory learning must be human-led or hybrid." };
    }
    if (!["experimental", "reversible_experiment"].includes(payload.activation_mode)) {
      return { valid: false, reason: "Exploratory learning requires experimental activation." };
    }
    if (payload.activation_mode === "reversible_experiment" && !payload.rollback_condition) {
      return { valid: false, reason: "Reversible experiments require rollback_condition." };
    }
    if (!payload.risk_type || !payload.blast_radius) {
      return { valid: false, reason: "Exploratory learning requires risk definition." };
    }
    if (!payload.brand_safety_flag) {
      return { valid: false, reason: "Brand-unsafe exploratory learning is blocked." };
    }
    if (clamp01(payload.intent_alignment_score, 0) < (config.minIntentAlignment ?? 0.6)) {
      return { valid: false, reason: "Exploratory learning requires tenant intent alignment." };
    }
    if (!payload.exploration_feedback_loop) {
      return { valid: false, reason: "Exploratory learning requires feedback monitoring." };
    }
    return { valid: true };
  }

  if (clamp01(payload.final_confidence, 0) < (config.minFinalConfidence ?? 0.7)) {
    return { valid: false, reason: "Validated learning final_confidence is below threshold." };
  }
  if ((payload.sample_size ?? 0) < (config.minSampleSize ?? 2)) {
    return { valid: false, reason: "Validated learning requires multiple evidence events." };
  }
  if (!payload.evidence_event_ids?.length || !payload.supporting_metrics) {
    return { valid: false, reason: "Validated learning requires structured evidence." };
  }
  return { valid: true };
}

export async function recordOutcome(client: SupabaseLikeClient, payload: OutcomeEvent) {
  const metadata = payload.metadata ?? {};
  const strategyId = payload.strategy_id ?? (typeof metadata.strategy_id === "string" ? metadata.strategy_id : null);
  const proposalId = payload.proposal_id ?? (typeof metadata.proposal_id === "string" ? metadata.proposal_id : null);
  const messagingAngle =
    payload.messaging_angle ?? (typeof metadata.messaging_angle === "string" ? metadata.messaging_angle : null);
  const hook = payload.hook ?? (typeof metadata.hook === "string" ? metadata.hook : null);
  const projectionVersion =
    payload.projection_version ?? (typeof metadata.projection_version === "string" ? metadata.projection_version : null);
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!payload.correlation_id?.trim()) throw new Error("LLS outcome requires correlation_id.");
  if (!strategyId && !proposalId) throw new Error("LLS outcome requires strategy_id or proposal_id.");
  if (!messagingAngle?.trim()) throw new Error("LLS outcome requires messaging_angle.");
  if (!hook?.trim()) throw new Error("LLS outcome requires hook.");
  if (!projectionVersion?.trim()) throw new Error("LLS outcome requires projection_version.");

  const event = {
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
    strategy_id: strategyId && uuidPattern.test(strategyId) ? strategyId : null,
    proposal_id: proposalId && uuidPattern.test(proposalId) ? proposalId : null,
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
  event.final_confidence = payload.final_confidence ?? computeFinalConfidence(event);

  const { data, error } = await client
    .from<typeof event>("lls_outcome_events")
    .insert(event)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function attachAttribution(client: SupabaseLikeClient, payload: FunnelAttribution) {
  const now = new Date().toISOString();
  const attribution = {
    attribution_confidence: 0,
    multi_touch_weight: 0,
    first_touch_at: now,
    last_touch_at: now,
    metadata: {},
    ...payload,
    first_touch_at: payload.first_touch_at ?? now,
    last_touch_at: payload.last_touch_at ?? now,
  };
  const { data, error } = await client
    .from<typeof attribution>("lls_funnel_attribution")
    .upsert(attribution, { onConflict: "lead_key,lead_kind" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function proposeInsight(client: SupabaseLikeClient, payload: InsightProposal) {
  const lane = validateLearningLane(payload);
  if (!lane.valid) throw new Error(lane.reason ?? "Invalid insight proposal.");
  const proposal = {
    proposed_by: "revenue-intelligence-run",
    freshness_score: 1,
    decay_status: "fresh",
    insight_status: "active",
    evidence: {},
    status: "pending_review",
    ...payload,
  };
  const { data, error } = await client
    .from<typeof proposal>("lls_insight_proposals")
    .insert(proposal)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
