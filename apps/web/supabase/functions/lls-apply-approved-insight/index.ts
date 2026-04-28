import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const bodySchema = z.object({
  proposalId: z.string().uuid(),
  memoryKind: z.string().min(1).max(120).optional(),
  key: z.string().min(1).max(200).optional(),
  value: z.record(z.unknown()).optional(),
  summary: z.string().max(4000).optional(),
});

async function authorize(req: Request, supabase: ReturnType<typeof createClient>) {
  const applySecret = Deno.env.get("LLS_APPLY_SHARED_SECRET")?.trim();
  const provided =
    req.headers.get("x-lls-apply-secret")?.trim() ||
    req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (applySecret && provided === applySecret) return null;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !userData.user) throw new Error("Unauthorized");
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id);
  const isAdmin = (roleRows ?? []).some((row: { role: string }) => row.role === "admin");
  if (!isAdmin) throw new Error("Forbidden");
  return userData.user.id as string;
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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const actorId = await authorize(req, supabase);
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid apply payload", details: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: proposal, error: proposalError } = await supabase
      .from("lls_insight_proposals")
      .select("*")
      .eq("id", parsed.data.proposalId)
      .maybeSingle();
    if (proposalError) throw proposalError;
    if (!proposal) {
      return new Response(JSON.stringify({ error: "Insight proposal not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (proposal.status === "test_only") {
      return new Response(
        JSON.stringify({
          ok: true,
          proposalId: proposal.id,
          applied: false,
          reason: "test_only activation does not write permanent strategy memory",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!["approved", "override"].includes(proposal.status)) {
      return new Response(JSON.stringify({ error: "Proposal must be approved before application" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (proposal.learning_mode === "exploratory_learning" && proposal.converted_to_validated !== true) {
      return new Response(
        JSON.stringify({
          error:
            "Exploratory learning cannot write permanent strategy memory until explicitly converted to validated.",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (proposal.learning_mode === "exploratory_learning") {
      if (
        !proposal.converted_at ||
        typeof proposal.final_confidence !== "number" ||
        proposal.final_confidence < 0.7 ||
        typeof proposal.sample_size !== "number" ||
        proposal.sample_size < 2 ||
        !Array.isArray(proposal.evidence_event_ids) ||
        proposal.evidence_event_ids.length === 0 ||
        !proposal.supporting_metrics ||
        !proposal.cluster_key
      ) {
        return new Response(
          JSON.stringify({
            error: "Converted exploratory proposal is missing required validation evidence.",
          }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const { data: score, error: scoreError } = await supabase
        .from("lls_evidence_scores")
        .select("id")
        .eq("tenant_id", proposal.tenant_id)
        .eq("cluster_key", proposal.cluster_key)
        .eq("learning_mode", proposal.learning_mode)
        .eq("final_confidence", proposal.final_confidence)
        .eq("sample_size", proposal.sample_size)
        .limit(1)
        .maybeSingle();
      if (scoreError) throw scoreError;
      if (!score?.id) {
        return new Response(
          JSON.stringify({
            error: "Converted exploratory proposal cannot apply without matching LLS evidence score.",
          }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }
    if (proposal.brand_safety_flag !== true && proposal.status !== "override") {
      return new Response(JSON.stringify({ error: "Brand unsafe proposal cannot be applied" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: validationConfig } = await supabase
      .from("lls_validation_config")
      .select("max_deviation_score")
      .or(`tenant_id.eq.${proposal.tenant_id},tenant_id.is.null`)
      .limit(1)
      .maybeSingle();
    const maxDeviationScore = validationConfig?.max_deviation_score ?? 0.3;
    if (
      typeof proposal.deviation_score === "number" &&
      proposal.deviation_score > maxDeviationScore &&
      proposal.status !== "override"
    ) {
      return new Response(
        JSON.stringify({ error: "High brand deviation requires explicit human override before application" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (["stale", "invalidated", "archived"].includes(String(proposal.insight_status))) {
      return new Response(JSON.stringify({ error: "Stale, invalidated, or archived insight cannot be applied" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (
      proposal.activation_mode === "scheduled" &&
      proposal.activation_schedule &&
      new Date(proposal.activation_schedule).getTime() > Date.now()
    ) {
      return new Response(
        JSON.stringify({ ok: true, applied: false, reason: "activation_schedule_not_reached" }),
        { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (
      proposal.activation_mode === "reversible_experiment" &&
      (!proposal.rollback_condition || !proposal.rollback_trigger)
    ) {
      return new Response(JSON.stringify({ error: "Rollback controls are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const memoryKind = parsed.data.memoryKind ?? String(proposal.proposal_kind);
    const key =
      parsed.data.key ??
      `${proposal.affected_layer}:${proposal.proposal_kind}:${String(proposal.claim).slice(0, 80).toLowerCase()}`;
    const value = parsed.data.value ?? {
      claim: proposal.claim,
      recommended_action: proposal.recommended_action,
      affected_layer: proposal.affected_layer,
      supporting_metrics: proposal.supporting_metrics,
      activation_mode: proposal.activation_mode,
      rollback_condition: proposal.rollback_condition,
      rollback_trigger: proposal.rollback_trigger,
    };

    const { data: currentMemory } = await supabase
      .from("lls_strategy_memory")
      .select("id,value,version")
      .eq("tenant_id", proposal.tenant_id)
      .eq("memory_kind", memoryKind)
      .eq("key", key)
      .eq("is_current", true)
      .maybeSingle();

    if (currentMemory?.id) {
      await supabase
        .from("lls_strategy_memory")
        .update({ is_current: false })
        .eq("id", currentMemory.id);
    }

    const nextVersion = (currentMemory?.version ?? 0) + 1;
    const resolvedLearningMode =
      proposal.learning_mode === "exploratory_learning" && proposal.converted_to_validated === true
        ? "validated_learning"
        : proposal.learning_mode;

    const { data: memory, error: memoryError } = await supabase
      .from("lls_strategy_memory")
      .insert({
        tenant_id: proposal.tenant_id,
        memory_kind: memoryKind,
        key,
        value,
        summary: parsed.data.summary ?? proposal.claim,
        version: nextVersion,
        is_current: true,
        strategy_origin: proposal.strategy_origin,
        learning_mode: resolvedLearningMode,
        activation_mode: proposal.activation_mode,
        activation_schedule: proposal.activation_schedule,
        rollback_condition: proposal.rollback_condition,
        rollback_trigger: proposal.rollback_trigger,
        activated_at: new Date().toISOString(),
        last_validated_at: proposal.last_validated_at ?? new Date().toISOString(),
        freshness_score: proposal.freshness_score ?? 1,
        decay_status: proposal.decay_status ?? "fresh",
        insight_status: proposal.insight_status ?? "active",
        source_proposal_id: proposal.id,
      })
      .select("id")
      .single();
    if (memoryError) throw memoryError;

    const { error: revisionError } = await supabase.from("lls_strategy_memory_revisions").insert({
      memory_id: memory.id,
      proposal_id: proposal.id,
      from_value: currentMemory?.value ?? null,
      to_value: value,
      actor_id: actorId,
      decision_action: proposal.decision_action === "override" ? "override" : "approve",
      metadata: { previous_memory_id: currentMemory?.id ?? null },
    });
    if (revisionError) throw revisionError;

    const { error: proposalUpdateError } = await supabase
      .from("lls_insight_proposals")
      .update({
        status: "applied",
        applied_to_memory_id: memory.id,
      })
      .eq("id", proposal.id);
    if (proposalUpdateError) throw proposalUpdateError;

    return new Response(JSON.stringify({ ok: true, proposalId: proposal.id, memoryId: memory.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    console.error("lls-apply-approved-insight error", error);
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
