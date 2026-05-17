import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createServiceClient, safeRecordOutcome } from "../_shared/lls.ts";

const completeSchema = z.object({
  auditId: z.string().uuid(),
  completionStatus: z.enum(["completed", "abandoned"]).default("completed"),
  scoreSummary: z.record(z.unknown()).optional(),
  actualOutcome: z.record(z.unknown()).optional(),
  bookedStrategySession: z.boolean().optional(),
  ctaClicked: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

function textOrNull(value: unknown, max = 180): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function secondsInterval(fromIso: string | null | undefined): string | null {
  if (!fromIso) return null;
  const started = new Date(fromIso).getTime();
  if (Number.isNaN(started)) return null;
  const seconds = Math.max(0, Math.round((Date.now() - started) / 1000));
  return `${seconds} seconds`;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const parsed = completeSchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid free audit completion", details: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const p = parsed.data;
    const supabase = createServiceClient();
    const { data: existing, error: findError } = await supabase
      .from("free_audits")
      .select(
        "id, audit_intake_id, buyer_key, lead_key, customer_id, audit_angle, intended_cta, started_at, predicted_conversion_probability, expected_baseline, metadata",
      )
      .eq("id", p.auditId)
      .maybeSingle();
    if (findError) throw findError;
    if (!existing) {
      return new Response(JSON.stringify({ error: "Free audit not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const actualOutcome = {
      ...(p.actualOutcome ?? {}),
      audit_completed: p.completionStatus === "completed",
      booked_strategy_session: p.bookedStrategySession ?? false,
      cta_clicked: p.ctaClicked ?? false,
    };

    const auditUpdate = {
      completion_status: p.completionStatus,
      completed_at: new Date().toISOString(),
      score_summary: p.scoreSummary ?? {},
      actual_outcome: actualOutcome,
      ...(p.bookedStrategySession ? { follow_up_status: "booked_strategy_session" } : {}),
      metadata: p.metadata ?? {},
    };

    const { data: updated, error: updateError } = await supabase
      .from("free_audits")
      .update(auditUpdate)
      .eq("id", p.auditId)
      .select("id, completed_at")
      .single();
    if (updateError) throw updateError;

    const completed = p.completionStatus === "completed";
    const existingMetadata = (existing.metadata ?? {}) as Record<string, unknown>;
    const attribution = (existingMetadata.attribution ?? {}) as Record<string, unknown>;
    const attributionMeta = attribution as Record<string, unknown>;
    const correlationId = typeof attribution.correlation_id === "string" ? attribution.correlation_id : existing.lead_key;
    const messagingAngle = typeof attribution.messaging_angle === "string" ? attribution.messaging_angle : existing.audit_angle;
    const hook = typeof attribution.hook === "string" ? attribution.hook : existing.intended_cta ?? "complete_free_audit";
    const buyerKey = existing.buyer_key ?? textOrNull(attributionMeta.buyer_key, 180) ?? existing.lead_key;
    const auditIntakeId = existing.audit_intake_id ?? existing.id;
    const leadMagnetId = textOrNull(attributionMeta.lead_magnet_id, 120) ?? "free_audit";
    const offerStage = textOrNull(attributionMeta.offer_stage, 80) ?? "free";
    const campaignId = textOrNull(attributionMeta.campaign_id, 120);
    const adsetId = textOrNull(attributionMeta.adset_id, 120);
    const creativeId = textOrNull(attributionMeta.creative_id, 120);
    const audienceClusterId = textOrNull(attributionMeta.audience_cluster_id, 120);
    const audiencePoolId = textOrNull(attributionMeta.audience_pool_id, 120);
    const { data: buyerJourney } = await supabase
      .from("buyer_journeys")
      .select("id")
      .eq("audit_intake_id", auditIntakeId)
      .limit(1)
      .maybeSingle();
    await Promise.allSettled([
      supabase
        .from("audit_intakes")
        .update({
          status: completed ? "completed" : "abandoned",
          last_touch_at: new Date().toISOString(),
        })
        .eq("id", auditIntakeId),
      supabase
        .from("audit_intake_analysis")
        .upsert({
          // Completion updates only the analyzed layer; original answers remain immutable.
          audit_intake_id: auditIntakeId,
          completion_status: p.completionStatus,
          score_summary: p.scoreSummary ?? {},
          actual_outcome: actualOutcome,
          interpreted_growth_goal: typeof actualOutcome.growth_goal === "string" ? actualOutcome.growth_goal : null,
          interpreted_blocker: typeof actualOutcome.current_blocker === "string" ? actualOutcome.current_blocker : null,
          interpreted_target_audience: typeof actualOutcome.target_audience_belief === "string"
            ? actualOutcome.target_audience_belief
            : null,
          analysis_version: "v1-complete",
          analyzed_at: new Date().toISOString(),
          metadata: {
            source: "free_audit_complete",
            completion_status: p.completionStatus,
            booked_strategy_session: p.bookedStrategySession ?? false,
          },
        }, { onConflict: "audit_intake_id" }),
      supabase
        .from("lead_magnet_interactions")
        .insert({
          lead_magnet_id: leadMagnetId,
          interaction_kind: completed ? "qualified" : "no_purchase",
          interaction_status: completed ? "success" : "abandoned",
          occurred_at: updated.completed_at,
          site_id: "jahknowspr_web",
          brand_id: "jahknowspr",
          client_id: existing.customer_id ?? "jahknowspr",
          buyer_journey_id: buyerJourney?.id ?? null,
          canonical_buyer_key: buyerKey,
          buyer_key: buyerKey,
          lead_key: existing.lead_key,
          customer_id: existing.customer_id ?? null,
          audit_intake_id: auditIntakeId,
          campaign_id: campaignId,
          adset_id: adsetId,
          creative_id: creativeId,
          audience_cluster_id: audienceClusterId,
          audience_pool_id: audiencePoolId,
          offer_id: "free_audit",
          offer_stage: offerStage,
          metadata: {
            source: "free_audit_complete",
            completion_status: p.completionStatus,
          },
        }),
      safeRecordOutcome(supabase, {
        tenant_id: existing.customer_id,
        lead_id: existing.lead_key,
        buyer_key: buyerKey,
        buyer_journey_id: buyerJourney?.id ?? null,
        audit_intake_id: auditIntakeId,
        lead_magnet_id: leadMagnetId,
        offer_id: "free_audit",
        offer_stage: offerStage,
        campaign_id: campaignId,
        adset_id: adsetId,
        creative_id: creativeId,
        audience_cluster_id: audienceClusterId,
        audience_pool_id: audiencePoolId,
        subject_kind: "free_audit",
        subject_id: existing.id,
        actor_kind: "anonymous",
        action: completed ? "free_audit_completed" : "free_audit_abandoned",
        strategy_origin: "human_defined",
        learning_mode: "exploratory_learning",
        intended_metric_type: "strategy_session_booking",
        actual_metric_type: completed ? "audit_completion" : "audit_abandonment",
        predicted_conversion_probability: existing.predicted_conversion_probability,
        expected_baseline: existing.expected_baseline,
        delta_value: completed ? 1 : -1,
        success_flag: completed,
        revenue_impact: 0,
        time_to_outcome: secondsInterval(existing.started_at),
        outcome_verified: true,
        verification_source: "system",
        verification_confidence_component: 0.85,
        causal_method: "direct_attribution",
        causal_confidence_component: 0.6,
        evidence_strength_component: 0.35,
        status: completed ? "success" : "failed",
        business_goal: "booked_strategy_session",
        failure_type: completed ? "unknown" : "unclear_offer",
        correlation_id: correlationId,
        strategy_id: "system:free-audit-funnel",
        messaging_angle: messagingAngle,
        hook,
        projection_version: "lls-projection-v1:free-audit",
        intended_outcome: {
          cta: existing.intended_cta,
          audit_angle: existing.audit_angle,
        },
        actual_outcome: actualOutcome,
        metadata: {
          ...(p.metadata ?? {}),
          attribution,
          audit_intake_id: auditIntakeId,
          buyer_journey_id: buyerJourney?.id ?? null,
        },
      }),
    ]);

    return new Response(JSON.stringify({ auditId: updated.id, completedAt: updated.completed_at }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("free-audit-complete error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
