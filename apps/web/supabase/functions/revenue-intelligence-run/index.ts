import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

type RiaMode = "hourly_scoring" | "daily_insights" | "weekly_memory_batch";

type OutcomeEvent = {
  id: string;
  tenant_id: string | null;
  lead_id: string | null;
  subject_kind: string;
  subject_id: string | null;
  action: string;
  strategy_origin: "human_defined" | "ai_discovered" | "hybrid";
  learning_mode: "validated_learning" | "exploratory_learning";
  final_confidence: number;
  verification_confidence_component: number;
  causal_confidence_component: number;
  evidence_strength_component: number;
  outcome_verified: boolean;
  success_flag: boolean | null;
  delta_value: number | null;
  revenue_impact: number | null;
  failure_type: string;
  business_goal: string;
  status: string;
  occurred_at: string;
  freshness_score: number;
  messaging_angle: string | null;
  hook: string | null;
  projection_version: string | null;
  metadata: Record<string, unknown> | null;
};

type BehaviorSignal = {
  outcome_event_id: string | null;
  decision_confidence: "low" | "medium" | "high" | null;
  time_to_decision_seconds: number | null;
};

type EvidenceScore = {
  tenant_id: string | null;
  cluster_key: string;
  evidence_event_ids: string[];
  success_rate: number;
  sample_size: number;
  causal_strength: number;
  sample_diversity: number;
  risk_penalty: number;
  final_confidence: number;
  learning_mode: "validated_learning" | "exploratory_learning";
  baseline_comparison: Record<string, unknown>;
  metadata: Record<string, unknown>;
};

type ValidationConfig = {
  min_final_confidence: number;
  min_sample_size: number;
  min_sample_diversity_score: number;
  max_segment_variance: number;
  min_alignment_score: number;
  max_deviation_score: number;
  execution_compliance_threshold: number;
};

const DEFAULT_CONFIG: ValidationConfig = {
  min_final_confidence: 0.7,
  min_sample_size: 5,
  min_sample_diversity_score: 0.5,
  max_segment_variance: 0.35,
  min_alignment_score: 0.7,
  max_deviation_score: 0.3,
  execution_compliance_threshold: 0.7,
};

function jsonResponse(req: Request, status: number, body: Record<string, unknown>) {
  const corsHeaders = getCorsHeaders(req);
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function parseMode(req: Request): Promise<RiaMode> {
  const url = new URL(req.url);
  const queryMode = url.searchParams.get("mode");
  let bodyMode: unknown;
  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    bodyMode = (body as { mode?: unknown }).mode;
  }
  const mode = String(bodyMode || queryMode || "hourly_scoring");
  if (!["hourly_scoring", "daily_insights", "weekly_memory_batch"].includes(mode)) {
    throw new Error("Invalid RIA mode.");
  }
  return mode as RiaMode;
}

function assertAuthorized(req: Request) {
  const expected = Deno.env.get("LLS_RIA_SHARED_SECRET")?.trim();
  if (!expected) return;
  const provided =
    req.headers.get("x-lls-ria-secret")?.trim() ||
    req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (provided !== expected) throw new Error("Unauthorized RIA invocation.");
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function variance(values: number[]): number {
  if (values.length <= 1) return 0;
  const avg = mean(values);
  return mean(values.map((value) => (value - avg) ** 2));
}

function affectedLayer(goal: string, subjectKind: string): "ads" | "funnel" | "content" | "execution" | "messaging" {
  if (subjectKind === "publish_job" || goal === "campaign_performance") return "content";
  if (goal === "execution_compliance") return "execution";
  if (goal === "booked_strategy_session" || goal === "lead_quality" || subjectKind === "free_audit") return "funnel";
  if (goal === "brand_signal") return "messaging";
  return "funnel";
}

function diversityScore(events: OutcomeEvent[]): number {
  const distinctLeads = new Set(events.map((event) => event.lead_id || event.subject_id || event.id));
  return Number(Math.min(1, distinctLeads.size / Math.max(1, events.length)).toFixed(4));
}

function timeDistribution(events: OutcomeEvent[]) {
  const buckets: Record<string, number> = {};
  for (const event of events) {
    const day = new Date(event.occurred_at).toISOString().slice(0, 10);
    buckets[day] = (buckets[day] ?? 0) + 1;
  }
  return buckets;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function readMetadataString(event: OutcomeEvent, keys: string[]): string | null {
  for (const key of keys) {
    const value = event[key as keyof OutcomeEvent];
    if (typeof value === "string" && value.trim()) return value.trim().toLowerCase();
  }
  const metadata = event.metadata ?? {};
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim().toLowerCase();
  }
  const leadSource = metadata.leadSource;
  if (leadSource && typeof leadSource === "object") {
    for (const key of keys) {
      const value = (leadSource as Record<string, unknown>)[key];
      if (typeof value === "string" && value.trim()) return value.trim().toLowerCase();
    }
  }
  return null;
}

function weekWindow(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown_week";
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

function clusterKey(events: OutcomeEvent[]): string {
  const first = events[0];
  const messagingAngle =
    readMetadataString(first, ["messaging_angle", "angle", "audit_angle", "utm_campaign"]) ?? "unknown_angle";
  const hook = readMetadataString(first, ["hook", "utm_content"]) ?? "unknown_hook";
  const source = readMetadataString(first, ["lead_source", "utm_source", "source"]) ?? "unknown_source";
  const readiness = readMetadataString(first, ["readiness_level", "audience_segment"]) ?? "unknown_readiness";
  return [
    first.tenant_id,
    first.learning_mode,
    first.business_goal,
    messagingAngle,
    hook,
    source,
    readiness,
    weekWindow(first.occurred_at),
  ].join(":");
}

function decisionVelocityBoost(events: OutcomeEvent[], behaviorSignals: Map<string, BehaviorSignal>): number {
  const boosts = events.map((event) => {
    const signal = behaviorSignals.get(event.id);
    if (!signal) return 0;
    const confidenceBoost = signal.decision_confidence === "high"
      ? 0.08
      : signal.decision_confidence === "medium"
        ? 0.04
        : 0;
    const time = signal.time_to_decision_seconds;
    const timeBoost = typeof time === "number" && time >= 0 && time <= 900 ? 0.04 : 0;
    return confidenceBoost + timeBoost;
  });
  return mean(boosts);
}

function lowAttributionPenalty(events: OutcomeEvent[]): number {
  const penalties = events.map((event) => {
    const metadata = event.metadata ?? {};
    const attribution = metadata.attribution;
    const confidence =
      attribution && typeof attribution === "object"
        ? (attribution as Record<string, unknown>).attribution_confidence
        : metadata.attribution_confidence;
    if (typeof confidence !== "number") return 0.03;
    return confidence < 0.4 ? 0.08 : 0;
  });
  return mean(penalties);
}

function staleEventPenalty(events: OutcomeEvent[]): number {
  return mean(events.map((event) => Math.max(0, 1 - (event.freshness_score ?? 1)))) * 0.12;
}

function evidenceScorePayload(events: OutcomeEvent[], behaviorSignals: Map<string, BehaviorSignal>): EvidenceScore {
  const first = events[0];
  const sampleSize = events.length;
  const successRate = events.filter((event) => event.success_flag === true).length / Math.max(1, sampleSize);
  const causalStrength = clamp01(
    mean(events.map((event) => event.causal_confidence_component)) +
      decisionVelocityBoost(events, behaviorSignals),
  );
  const sampleDiversity = diversityScore(events);
  const riskPenalty = clamp01(
    events.filter((event) => event.failure_type !== "unknown").length / Math.max(1, sampleSize) * 0.25 +
      lowAttributionPenalty(events) +
      staleEventPenalty(events),
  );
  const finalConfidence = Number(
    Math.min(
      1,
      Math.max(
        0,
        (successRate ** 1.2) *
          (causalStrength ** 1.5) *
          Math.log1p(sampleSize) *
          sampleDiversity -
          riskPenalty * 1.3,
      ),
    ).toFixed(4),
  );

  return {
    tenant_id: first.tenant_id,
    cluster_key: clusterKey(events),
    evidence_event_ids: events.map((event) => event.id),
    success_rate: Number(successRate.toFixed(4)),
    sample_size: sampleSize,
    causal_strength: Number(causalStrength.toFixed(4)),
    sample_diversity: sampleDiversity,
    risk_penalty: Number(riskPenalty.toFixed(4)),
    final_confidence: finalConfidence,
    learning_mode: first.learning_mode,
    baseline_comparison: {},
    metadata: {
      event_actions: [...new Set(events.map((event) => event.action))],
      business_goal: first.business_goal,
      subject_kind: first.subject_kind,
      time_window: weekWindow(first.occurred_at),
      messaging_angle: readMetadataString(first, ["messaging_angle", "angle", "audit_angle", "utm_campaign"]) ?? "unknown_angle",
      hook: readMetadataString(first, ["hook", "utm_content"]) ?? "unknown_hook",
      lead_source: readMetadataString(first, ["lead_source", "utm_source", "source"]) ?? "unknown_source",
      readiness: readMetadataString(first, ["readiness_level", "audience_segment"]) ?? "unknown_readiness",
      projection_versions: [...new Set(events.map((event) => event.projection_version).filter(Boolean))],
    },
  };
}

function buildClaim(events: OutcomeEvent[], mode: "validated_learning" | "exploratory_learning") {
  const first = events[0];
  const successes = events.filter((event) => event.success_flag === true).length;
  const conversionRate = Number((successes / Math.max(1, events.length)).toFixed(4));
  if (mode === "exploratory_learning") {
    return `Human-led ${first.business_goal} experiment in ${first.subject_kind} has ${Math.round(
      conversionRate * 100,
    )}% positive outcome signals and should stay monitored before permanent memory.`;
  }
  return `${first.business_goal} outcomes for ${first.subject_kind} show a ${Math.round(
    conversionRate * 100,
  )}% success pattern across verified events.`;
}

function confidenceExplanation(score: EvidenceScore, baseline: Record<string, unknown>): string {
  return [
    `Final confidence ${score.final_confidence} was computed from success_rate ${score.success_rate}, causal_strength ${score.causal_strength}, log-scaled sample_size ${score.sample_size}, sample_diversity ${score.sample_diversity}, and amplified risk_penalty ${score.risk_penalty}.`,
    `Baseline uplift is ${String(baseline.uplift_percentage ?? 0)}% with confidence_delta ${String(baseline.confidence_delta ?? 0)}.`,
  ].join(" ");
}

function proposalPayload(
  events: OutcomeEvent[],
  mode: "validated_learning",
  config: ValidationConfig,
  behaviorSignals: Map<string, BehaviorSignal>,
) {
  const first = events[0];
  const score = evidenceScorePayload(events, behaviorSignals);
  const confidences = [score.final_confidence];
  const successCount = events.filter((event) => event.success_flag === true).length;
  const failureCount = events.filter((event) => event.success_flag === false).length;
  const sampleDiversity = score.sample_diversity;
  const varianceBySegment = {
    final_confidence_variance: Number(variance(confidences).toFixed(4)),
    success_count: successCount,
    failure_count: failureCount,
  };
  const avgConfidence = score.final_confidence;
  const revenueImpact = Number(mean(events.map((event) => event.revenue_impact ?? 0)).toFixed(2));
  const layer = affectedLayer(first.business_goal, first.subject_kind);

  if (avgConfidence < config.min_final_confidence) return null;
  if (events.length < config.min_sample_size) return null;
  if (sampleDiversity < config.min_sample_diversity_score) return null;
  if ((varianceBySegment.final_confidence_variance as number) > config.max_segment_variance) return null;

  return {
    tenant_id: first.tenant_id,
    proposed_by: "revenue-intelligence-run",
    proposal_kind: layer === "content" ? "campaign" : layer === "messaging" ? "messaging_angle" : "lead_source",
    cluster_key: score.cluster_key,
    claim: buildClaim(events, mode),
    recommended_action:
      successCount >= failureCount
        ? "Promote this pattern into the next reviewed optimization test."
        : "Review the failed outcome cluster and adjust the funnel before retesting.",
    affected_layer: layer,
    strategy_origin: "ai_discovered",
    learning_mode: "validated_learning",
    activation_mode: "next_run",
    evidence_event_ids: events.map((event) => event.id),
    supporting_metrics: {
      success_rate: score.success_rate,
      causal_strength: score.causal_strength,
      sample_diversity: score.sample_diversity,
      risk_penalty: score.risk_penalty,
      success_count: successCount,
      failure_count: failureCount,
      average_final_confidence: avgConfidence,
      verified_event_count: events.filter((event) => event.outcome_verified).length,
      policy_priority: ["brand_safety", "alignment_score", "final_confidence", "revenue_impact"],
    },
    sample_size: events.length,
    verification_confidence_component: Number(mean(events.map((event) => event.verification_confidence_component)).toFixed(4)),
    causal_confidence_component: Number(mean(events.map((event) => event.causal_confidence_component)).toFixed(4)),
    evidence_strength_component: Number(mean(events.map((event) => event.evidence_strength_component)).toFixed(4)),
    final_confidence: avgConfidence,
    revenue_impact: revenueImpact,
    predicted_revenue_impact: Number(Math.max(0, revenueImpact * avgConfidence).toFixed(2)),
    risk_score: layer === "execution" ? 0.45 : 0.35,
    risk_type: layer === "messaging" ? "messaging_change" : "strategy_shift",
    blast_radius: "low",
    variance_by_segment: varianceBySegment,
    time_distribution: timeDistribution(events),
    sample_diversity_score: sampleDiversity,
    alignment_score: config.min_alignment_score,
    brand_safety_flag: true,
    deviation_score: Math.min(config.max_deviation_score, 0.2),
    intent_alignment_score: config.min_alignment_score,
    priority_score: Number(Math.min(1, avgConfidence * 0.7 + Math.max(0, revenueImpact) / 1000).toFixed(4)),
    freshness_score: Number(mean(events.map((event) => event.freshness_score ?? 1)).toFixed(4)),
    last_validated_at: new Date().toISOString(),
    decay_status: "fresh",
    insight_status: "active",
    evidence: {
      cluster_key: score.cluster_key,
      event_actions: [...new Set(events.map((event) => event.action))],
    },
    baseline_comparison: {},
    confidence_explanation: confidenceExplanation(score, {}),
    status: "pending_review",
  };
}

function exploratoryProposalPayload(
  events: OutcomeEvent[],
  config: ValidationConfig,
  behaviorSignals: Map<string, BehaviorSignal>,
) {
  const first = events[0];
  const score = evidenceScorePayload(events, behaviorSignals);
  const sampleDiversity = score.sample_diversity;
  const layer = affectedLayer(first.business_goal, first.subject_kind);
  if (events.length < 2 || sampleDiversity < 0.25) return null;
  return {
    tenant_id: first.tenant_id,
    proposed_by: "revenue-intelligence-run",
    proposal_kind: "strategy_memory_update",
    cluster_key: score.cluster_key,
    claim: buildClaim(events, "exploratory_learning"),
    recommended_action: "Keep the experiment active only as monitored test policy until enough validated evidence exists.",
    affected_layer: layer,
    strategy_origin: "human_defined",
    learning_mode: "exploratory_learning",
    activation_mode: "experimental",
    exploration_feedback_loop: {
      monitor_events: events.map((event) => event.id),
      next_review_after: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    evidence_event_ids: events.map((event) => event.id),
    supporting_metrics: {
      success_rate: score.success_rate,
      causal_strength: score.causal_strength,
      sample_diversity: score.sample_diversity,
      risk_penalty: score.risk_penalty,
      sample_size: events.length,
      average_final_confidence: score.final_confidence,
      note: "Exploratory lane is monitored and risk-scored, not blocked by final confidence.",
    },
    sample_size: events.length,
    final_confidence: score.final_confidence,
    revenue_impact: Number(mean(events.map((event) => event.revenue_impact ?? 0)).toFixed(2)),
    predicted_revenue_impact: Number(
      Math.max(0, mean(events.map((event) => event.revenue_impact ?? 0)) * score.final_confidence).toFixed(2),
    ),
    risk_score: 0.4,
    risk_type: "strategy_shift",
    blast_radius: "low",
    variance_by_segment: { final_confidence_variance: Number(variance(events.map((event) => event.final_confidence)).toFixed(4)) },
    time_distribution: timeDistribution(events),
    sample_diversity_score: sampleDiversity,
    alignment_score: config.min_alignment_score,
    brand_safety_flag: true,
    deviation_score: 0.2,
    intent_alignment_score: config.min_alignment_score,
    priority_score: 0.5,
    freshness_score: Number(mean(events.map((event) => event.freshness_score ?? 1)).toFixed(4)),
    last_validated_at: new Date().toISOString(),
    decay_status: "fresh",
    insight_status: "active",
    evidence: { lane: "exploratory_learning", policy: "test_only_until_validated" },
    baseline_comparison: {},
    confidence_explanation: confidenceExplanation(score, {}),
    status: "pending_review",
  };
}

async function getConfig(supabase: ReturnType<typeof createClient>, tenantId: string | null): Promise<ValidationConfig> {
  const { data } = await supabase
    .from("lls_validation_config")
    .select(
      "min_final_confidence,min_sample_size,min_sample_diversity_score,max_segment_variance,min_alignment_score,max_deviation_score,execution_compliance_threshold",
    )
    .or(`tenant_id.eq.${tenantId ?? "00000000-0000-0000-0000-000000000000"},tenant_id.is.null`)
    .limit(1)
    .maybeSingle();
  return { ...DEFAULT_CONFIG, ...(data ?? {}) } as ValidationConfig;
}

async function loadRecentEvents(supabase: ReturnType<typeof createClient>, sinceIso: string): Promise<OutcomeEvent[]> {
  const { data, error } = await supabase
    .from("lls_outcome_events")
    .select(
      "id,tenant_id,lead_id,subject_kind,subject_id,action,strategy_origin,learning_mode,final_confidence,verification_confidence_component,causal_confidence_component,evidence_strength_component,outcome_verified,success_flag,delta_value,revenue_impact,failure_type,business_goal,status,occurred_at,freshness_score,messaging_angle,hook,projection_version,metadata",
    )
    .not("tenant_id", "is", null)
    .gte("occurred_at", sinceIso)
    .order("occurred_at", { ascending: true })
    .limit(5000);
  if (error) throw error;
  return (data ?? []) as OutcomeEvent[];
}

async function loadBehaviorSignals(
  supabase: ReturnType<typeof createClient>,
  eventIds: string[],
): Promise<Map<string, BehaviorSignal>> {
  if (!eventIds.length) return new Map();
  const { data, error } = await supabase
    .from("lls_behavior_signals")
    .select("outcome_event_id,decision_confidence,time_to_decision_seconds")
    .in("outcome_event_id", eventIds);
  if (error) throw error;
  return new Map(
    ((data ?? []) as BehaviorSignal[])
      .filter((signal) => signal.outcome_event_id)
      .map((signal) => [signal.outcome_event_id as string, signal]),
  );
}

async function updateScoringTables(supabase: ReturnType<typeof createClient>, events: OutcomeEvent[]) {
  const byTenant = new Map<string, OutcomeEvent[]>();
  for (const event of events) {
    if (!event.tenant_id) continue;
    byTenant.set(event.tenant_id, [...(byTenant.get(event.tenant_id) ?? []), event]);
  }

  let rewardCount = 0;
  let scoreCount = 0;
  for (const [tenantId, tenantEvents] of byTenant) {
    const eventIds = tenantEvents.map((event) => event.id);
    const { data: existingRewards } = await supabase
      .from("lls_reward_signals")
      .select("outcome_event_id")
      .in("outcome_event_id", eventIds);
    const alreadyRewarded = new Set((existingRewards ?? []).map((row: { outcome_event_id: string }) => row.outcome_event_id));
    const rewards = tenantEvents
      .filter((event) => !alreadyRewarded.has(event.id))
      .map((event) => ({
        outcome_event_id: event.id,
        tenant_id: tenantId,
        reward:
          (event.success_flag ? 1 : event.success_flag === false ? -1 : 0) +
          (event.revenue_impact ?? 0) / 1000 +
          (event.delta_value ?? 0) * 0.1,
        reward_source: "rule",
        notes: "RIA hourly scoring from LLS outcome event.",
        metadata: { final_confidence: event.final_confidence, business_goal: event.business_goal },
      }));
    if (rewards.length) {
      const { error } = await supabase.from("lls_reward_signals").insert(rewards);
      if (error) throw error;
      rewardCount += rewards.length;
    }

    const now = new Date().toISOString();
    const windowStart = tenantEvents[0]?.occurred_at ?? now;
    const successRate = tenantEvents.filter((event) => event.success_flag === true).length / Math.max(1, tenantEvents.length);
    const readinessScore = Number(
      mean([
        successRate,
        mean(tenantEvents.map((event) => event.final_confidence)),
        tenantEvents.filter((event) => event.status !== "pending").length / Math.max(1, tenantEvents.length),
      ]).toFixed(4),
    );
    const executionFailures = tenantEvents.filter((event) => event.failure_type === "execution_failure").length;
    const complianceScore = Number(Math.max(0, 1 - executionFailures / Math.max(1, tenantEvents.length)).toFixed(4));
    const config = await getConfig(supabase, tenantId);

    const { error: readinessError } = await supabase.from("lls_client_readiness_scores").insert({
      tenant_id: tenantId,
      score: readinessScore,
      signal_breakdown: { event_count: tenantEvents.length, success_rate: successRate },
      computed_at: now,
      window_start: windowStart,
      window_end: now,
    });
    if (readinessError) throw readinessError;

    const { error: complianceError } = await supabase.from("lls_client_execution_compliance").insert({
      tenant_id: tenantId,
      score: complianceScore,
      threshold: config.execution_compliance_threshold,
      is_strategy_evaluable: complianceScore >= config.execution_compliance_threshold,
      signal_breakdown: { execution_failures: executionFailures, event_count: tenantEvents.length },
      computed_at: now,
      window_start: windowStart,
      window_end: now,
    });
    if (complianceError) throw complianceError;
    scoreCount += 2;
  }
  return { rewardCount, scoreCount };
}

function clusterEvents(events: OutcomeEvent[]) {
  const clusters = new Map<string, OutcomeEvent[]>();
  for (const event of events) {
    if (!event.tenant_id) continue;
    const key = clusterKey([event]);
    clusters.set(key, [...(clusters.get(key) ?? []), event]);
  }
  return [...clusters.values()];
}

async function baselineComparison(
  supabase: ReturnType<typeof createClient>,
  proposal: Record<string, unknown>,
) {
  const { data: priorScore } = await supabase
    .from("lls_evidence_scores")
    .select("success_rate,final_confidence")
    .eq("tenant_id", proposal.tenant_id as string)
    .eq("cluster_key", proposal.cluster_key as string)
    .eq("learning_mode", proposal.learning_mode as string)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: priorMemory } = await supabase
    .from("lls_strategy_memory")
    .select("id")
    .eq("tenant_id", proposal.tenant_id as string)
    .eq("is_current", true)
    .order("activated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const currentSuccessRate = (proposal.supporting_metrics as { success_rate?: number })?.success_rate ?? 0;
  const currentConfidence = typeof proposal.final_confidence === "number" ? proposal.final_confidence : 0;
  const previousSuccessRate = typeof priorScore?.success_rate === "number" ? priorScore.success_rate : null;
  const previousConfidence = typeof priorScore?.final_confidence === "number" ? priorScore.final_confidence : null;
  const upliftPercentage = previousSuccessRate && previousSuccessRate > 0
    ? ((currentSuccessRate - previousSuccessRate) / previousSuccessRate) * 100
    : 0;
  const confidenceDelta = previousConfidence !== null ? currentConfidence - previousConfidence : 0;

  return {
    previous_strategy_id: priorMemory?.id ?? null,
    uplift_percentage: Number(upliftPercentage.toFixed(2)),
    confidence_delta: Number(confidenceDelta.toFixed(4)),
  };
}

async function insertEvidenceScore(supabase: ReturnType<typeof createClient>, proposal: Record<string, unknown>) {
  const evidenceScore = {
    tenant_id: proposal.tenant_id,
    cluster_key: proposal.cluster_key,
    evidence_event_ids: proposal.evidence_event_ids,
    success_rate: (proposal.supporting_metrics as { success_rate?: number })?.success_rate ?? 0,
    sample_size: proposal.sample_size,
    causal_strength: (proposal.supporting_metrics as { causal_strength?: number })?.causal_strength ?? 0,
    sample_diversity: proposal.sample_diversity_score,
    risk_penalty: (proposal.supporting_metrics as { risk_penalty?: number })?.risk_penalty ?? 0,
    final_confidence: proposal.final_confidence,
    learning_mode: proposal.learning_mode,
    baseline_comparison: proposal.baseline_comparison ?? {},
    metadata: { proposal_kind: proposal.proposal_kind, affected_layer: proposal.affected_layer },
  };
  const { error: scoreError } = await supabase.from("lls_evidence_scores").insert(evidenceScore);
  if (scoreError) throw scoreError;
}

async function insertClusterEvidenceScores(
  supabase: ReturnType<typeof createClient>,
  clusters: OutcomeEvent[][],
  behaviorSignals: Map<string, BehaviorSignal>,
) {
  let inserted = 0;
  for (const events of clusters) {
    if (events.length < 2) continue;
    const score = evidenceScorePayload(events, behaviorSignals);
    if (!score.tenant_id) continue;
    const { error } = await supabase.from("lls_evidence_scores").insert(score);
    if (error) throw error;
    inserted += 1;
  }
  return inserted;
}

async function insertInsightProposals(
  supabase: ReturnType<typeof createClient>,
  clusters: OutcomeEvent[][],
  behaviorSignals: Map<string, BehaviorSignal>,
  weekly: boolean,
) {
  let inserted = 0;
  for (const events of clusters) {
    const tenantId = events[0]?.tenant_id;
    if (!tenantId) continue;
    const config = await getConfig(supabase, tenantId);
    const validEvents = events.filter((event) => event.learning_mode === "validated_learning" && event.outcome_verified);
    const exploratoryEvents = events.filter(
      (event) => event.learning_mode === "exploratory_learning" && event.strategy_origin === "human_defined",
    );
    const proposals = [
      validEvents.length ? proposalPayload(validEvents, "validated_learning", config, behaviorSignals) : null,
      exploratoryEvents.length ? exploratoryProposalPayload(exploratoryEvents, config, behaviorSignals) : null,
    ].filter(Boolean) as Record<string, unknown>[];

    for (const proposal of proposals) {
      const baseline = await baselineComparison(supabase, proposal);
      proposal.baseline_comparison = baseline;
      const { data: intentProfile } = await supabase
        .from("lls_tenant_intent_profiles")
        .select("brand_vector,risk_tolerance")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      const riskTolerance = typeof intentProfile?.risk_tolerance === "number" ? intentProfile.risk_tolerance : 0.5;
      const riskScore = typeof proposal.risk_score === "number" ? proposal.risk_score : 0;
      proposal.brand_vector = intentProfile?.brand_vector ?? {};
      proposal.deviation_score = Number(Math.max(0, riskScore - riskTolerance).toFixed(4));
      if (typeof proposal.deviation_score === "number" && proposal.deviation_score > config.max_deviation_score) {
        proposal.alignment_score = Math.min(Number(proposal.alignment_score ?? 0), config.min_alignment_score);
      }
      proposal.confidence_explanation = confidenceExplanation(
        {
          tenant_id: proposal.tenant_id as string,
          cluster_key: proposal.cluster_key as string,
          evidence_event_ids: proposal.evidence_event_ids as string[],
          success_rate: (proposal.supporting_metrics as { success_rate?: number })?.success_rate ?? 0,
          sample_size: proposal.sample_size as number,
          causal_strength: (proposal.supporting_metrics as { causal_strength?: number })?.causal_strength ?? 0,
          sample_diversity: proposal.sample_diversity_score as number,
          risk_penalty: (proposal.supporting_metrics as { risk_penalty?: number })?.risk_penalty ?? 0,
          final_confidence: proposal.final_confidence as number,
          learning_mode: proposal.learning_mode as "validated_learning" | "exploratory_learning",
          baseline_comparison: baseline,
          metadata: {},
        },
        baseline,
      );
      if (
        proposal.learning_mode === "validated_learning" &&
        ((baseline.uplift_percentage as number) <= 0 || (baseline.confidence_delta as number) <= 0)
      ) {
        continue;
      }
      if (weekly) {
        proposal.proposal_kind = "strategy_memory_update";
        proposal.recommended_action = `${proposal.recommended_action} Review for possible strategy memory promotion.`;
      }
      const { data: duplicate } = await supabase
        .from("lls_insight_proposals")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("claim", proposal.claim as string)
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();
      if (duplicate?.id) continue;
      await insertEvidenceScore(supabase, proposal);
      const { error } = await supabase.from("lls_insight_proposals").insert(proposal);
      if (error) throw error;
      inserted += 1;
    }
  }
  return inserted;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!["GET", "POST"].includes(req.method)) return jsonResponse(req, 405, { error: "Method not allowed" });

  let mode: RiaMode = "hourly_scoring";
  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  try {
    assertAuthorized(req);
    mode = await parseMode(req);
    const { data: locked, error: lockError } = await supabase.rpc("lls_ria_try_lock", { lock_mode: mode });
    if (lockError) throw lockError;
    if (!locked) return jsonResponse(req, 202, { ok: true, mode, skipped: "lock_not_acquired" });

    const now = new Date().toISOString();
    await supabase.from("lls_ria_state").upsert(
      {
        mode,
        metric_key: "default",
        last_run_started_at: now,
        last_status: "running",
        last_error: null,
      },
      { onConflict: "mode,metric_key" },
    );

    const sinceDays = mode === "hourly_scoring" ? 7 : mode === "daily_insights" ? 30 : 90;
    const sinceIso = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();
    const events = await loadRecentEvents(supabase, sinceIso);
    const behaviorSignals = await loadBehaviorSignals(supabase, events.map((event) => event.id));
    const clusters = clusterEvents(events);

    const scoring = await updateScoringTables(supabase, events);
    const evidenceScoreCount =
      mode === "hourly_scoring" ? await insertClusterEvidenceScores(supabase, clusters, behaviorSignals) : 0;
    const proposalCount =
      mode === "hourly_scoring"
        ? 0
        : await insertInsightProposals(
          supabase,
          clusters,
          behaviorSignals,
          mode === "weekly_memory_batch",
        );

    await supabase
      .from("lls_ria_state")
      .update({
        last_processed_at: now,
        last_run_completed_at: new Date().toISOString(),
        last_status: "success",
        metadata: { event_count: events.length, evidence_score_count: evidenceScoreCount, ...scoring, proposal_count: proposalCount },
      })
      .eq("mode", mode)
      .eq("metric_key", "default");

    return jsonResponse(req, 200, {
      ok: true,
      mode,
      eventCount: events.length,
      rewardCount: scoring.rewardCount,
      scoreCount: scoring.scoreCount,
      evidenceScoreCount,
      proposalCount,
    });
  } catch (error) {
    await supabase.from("lls_ria_state").upsert(
      {
        mode,
        metric_key: "default",
        last_run_completed_at: new Date().toISOString(),
        last_status: "failed",
        last_error: error instanceof Error ? error.message : String(error),
      },
      { onConflict: "mode,metric_key" },
    );
    return jsonResponse(req, error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500, {
      error: error instanceof Error ? error.message : "Unknown error",
      mode,
    });
  } finally {
    await supabase.rpc("lls_ria_unlock", { lock_mode: mode }).catch(() => null);
  }
});
