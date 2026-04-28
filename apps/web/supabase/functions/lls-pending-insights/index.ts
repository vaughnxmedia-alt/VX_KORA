import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

function leverageSummary(proposal: Record<string, unknown>): string {
  const metrics = (proposal.supporting_metrics ?? {}) as Record<string, unknown>;
  const baseline = (proposal.baseline_comparison ?? {}) as Record<string, unknown>;
  const sampleSize = Number(proposal.sample_size ?? metrics.sample_size ?? 0);
  const uplift = Number(baseline.uplift_percentage ?? 0);
  const claim = String(proposal.claim ?? "Insight proposal");
  if (uplift > 0) {
    return `${claim} improves ${uplift}% across ${sampleSize} samples`;
  }
  const successRate = Number(metrics.success_rate ?? 0);
  return `${claim} shows ${Math.round(successRate * 100)}% success across ${sampleSize} samples`;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenant_id");
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 25)));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const allowed = (roleRows ?? []).some((row: { role: string }) =>
      ["admin", "author", "intern", "3pv"].includes(row.role),
    );
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let query = supabase
      .from("lls_insight_proposals")
      .select(
        "id,tenant_id,proposal_kind,claim,recommended_action,affected_layer,strategy_origin,learning_mode,activation_mode,cluster_key,final_confidence,risk_score,alignment_score,supporting_metrics,evidence_event_ids,sample_size,predicted_revenue_impact,confidence_explanation,baseline_comparison,status,converted_to_validated,created_at",
      )
      .in("status", ["pending_review", "amended", "deferred", "test_only"])
      .order("created_at", { ascending: false })
      .limit(limit);

    if (tenantId) query = query.eq("tenant_id", tenantId);

    const { data, error } = await query;
    if (error) throw error;

    const insights = (data ?? []).map((proposal: Record<string, unknown>) => ({
      id: proposal.id,
      tenant_id: proposal.tenant_id,
      proposal_kind: proposal.proposal_kind,
      claim: proposal.claim,
      leverage_summary: leverageSummary(proposal),
      recommended_action: proposal.recommended_action,
      affected_layer: proposal.affected_layer,
      strategy_origin: proposal.strategy_origin,
      learning_mode: proposal.learning_mode,
      activation_mode: proposal.activation_mode,
      confidence: proposal.final_confidence,
      risk_score: proposal.risk_score,
      alignment_score: proposal.alignment_score,
      sample_size: proposal.sample_size,
      evidence_event_count: Array.isArray(proposal.evidence_event_ids)
        ? proposal.evidence_event_ids.length
        : 0,
      predicted_revenue_impact: proposal.predicted_revenue_impact,
      confidence_explanation: proposal.confidence_explanation,
      baseline_comparison: proposal.baseline_comparison,
      baseline_delta: Number(((proposal.baseline_comparison ?? {}) as Record<string, unknown>).baseline_delta ?? 0),
      conversion_eligible:
        proposal.learning_mode === "exploratory_learning" &&
        Number(proposal.final_confidence ?? 0) >= 0.7 &&
        Number(proposal.sample_size ?? 0) >= 2,
      apply_eligible:
        proposal.learning_mode === "validated_learning" ||
        (proposal.learning_mode === "exploratory_learning" && proposal.converted_to_validated === true),
      status: proposal.status,
      created_at: proposal.created_at,
    }));

    return new Response(JSON.stringify({ insights }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("lls-pending-insights error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
