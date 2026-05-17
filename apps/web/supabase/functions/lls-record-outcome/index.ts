import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createServiceClient, recordOutcome } from "../_shared/lls.ts";

const payloadSchema = z.object({
  tenant_id: z.string().uuid().nullable().optional(),
  lead_id: z.string().nullable().optional(),
  buyer_key: z.string().nullable().optional(),
  buyer_journey_id: z.string().uuid().nullable().optional(),
  audit_intake_id: z.string().uuid().nullable().optional(),
  strategy_session_id: z.string().uuid().nullable().optional(),
  lead_magnet_id: z.string().nullable().optional(),
  campaign_id: z.string().nullable().optional(),
  adset_id: z.string().nullable().optional(),
  creative_id: z.string().nullable().optional(),
  offer_id: z.string().nullable().optional(),
  offer_stage: z.string().nullable().optional(),
  audience_cluster_id: z.string().nullable().optional(),
  audience_pool_id: z.string().nullable().optional(),
  revenue_attribution_id: z.string().uuid().nullable().optional(),
  contract_attribution_id: z.string().uuid().nullable().optional(),
  subject_kind: z.enum([
    "free_audit",
    "lead",
    "meeting",
    "payment",
    "scheduled_post",
    "publish_job",
    "content_plan_item",
    "brand_blueprint",
    "assistant_message",
    "client_action",
    "system",
  ]),
  subject_id: z.string().nullable().optional(),
  actor_kind: z.enum(["agent", "employee", "system", "client", "anonymous"]),
  actor_id: z.string().nullable().optional(),
  action: z.string().min(1),
  strategy_origin: z.enum(["human_defined", "ai_discovered", "hybrid"]).optional(),
  learning_mode: z.enum(["validated_learning", "exploratory_learning"]).optional(),
  intended_metric_type: z.string().nullable().optional(),
  actual_metric_type: z.string().nullable().optional(),
  predicted_conversion_probability: z.number().min(0).max(1).nullable().optional(),
  expected_baseline: z.number().nullable().optional(),
  delta_value: z.number().nullable().optional(),
  success_flag: z.boolean().nullable().optional(),
  revenue_impact: z.number().nullable().optional(),
  time_to_outcome: z.string().nullable().optional(),
  time_to_conversion: z.string().nullable().optional(),
  failure_type: z
    .enum(["strategy_failure", "execution_failure", "audience_mismatch", "unclear_offer", "unknown"])
    .optional(),
  outcome_verified: z.boolean().optional(),
  verification_source: z.enum(["system", "analytics_api", "human", "inferred"]).optional(),
  verification_confidence_component: z.number().min(0).max(1).optional(),
  causal_method: z.enum(["direct_attribution", "time_window", "heuristic", "unknown"]).optional(),
  causal_confidence_component: z.number().min(0).max(1).optional(),
  evidence_strength_component: z.number().min(0).max(1).optional(),
  final_confidence: z.number().min(0).max(1).optional(),
  intended_outcome: z.record(z.unknown()).optional(),
  actual_outcome: z.record(z.unknown()).optional(),
  status: z.enum(["success", "failed", "incomplete", "pending"]),
  business_goal: z.enum([
    "booked_strategy_session",
    "lead_quality",
    "revenue",
    "client_readiness",
    "campaign_performance",
    "retention",
    "execution_compliance",
    "brand_signal",
  ]),
  lesson: z.string().nullable().optional(),
  requires_review: z.boolean().optional(),
  correlation_id: z.string().nullable().optional(),
  strategy_id: z.string().nullable().optional(),
  proposal_id: z.string().nullable().optional(),
  messaging_angle: z.string().nullable().optional(),
  hook: z.string().nullable().optional(),
  projection_version: z.string().nullable().optional(),
  occurred_at: z.string().datetime().optional(),
  last_validated_at: z.string().datetime().nullable().optional(),
  freshness_score: z.number().min(0).max(1).optional(),
  metadata: z.record(z.unknown()).optional(),
});

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const authClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = payloadSchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid LLS outcome", details: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (parsed.data.tenant_id) {
      const { data: roleRows } = await authClient.from("user_roles").select("role").eq("user_id", user.id);
      const isStaff = (roleRows ?? []).some((row: { role: string }) =>
        ["admin", "author", "intern", "3pv"].includes(row.role),
      );
      const { data: customer } = await authClient
        .from("customers")
        .select("id")
        .eq("id", parsed.data.tenant_id)
        .maybeSingle();
      if (!isStaff && !customer?.id) {
        return new Response(JSON.stringify({ error: "Tenant access denied" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabase = createServiceClient();
    const result = await recordOutcome(supabase, {
      ...parsed.data,
      actor_id: parsed.data.actor_id ?? user.id,
      metadata: { ...(parsed.data.metadata ?? {}), submitted_by_user_id: user.id },
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("lls-record-outcome error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
