import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const bodySchema = z.object({
  proposalId: z.string().uuid(),
  action: z.enum(["approve", "reject", "amend", "defer", "test_only", "override"]),
  rationale: z.string().max(4000).optional(),
  amendments: z.record(z.unknown()).optional(),
  convertToValidated: z.boolean().optional(),
  conversionNotes: z.string().max(4000).optional(),
});

const statusByAction = {
  approve: "approved",
  reject: "rejected",
  amend: "amended",
  defer: "deferred",
  test_only: "test_only",
  override: "override",
} as const;

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
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      ["admin", "author"].includes(row.role),
    );
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid decision payload", details: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existing, error: findError } = await supabase
      .from("lls_insight_proposals")
      .select(
        "id,tenant_id,cluster_key,status,learning_mode,brand_safety_flag,activation_mode,rollback_condition,rollback_trigger,evidence,final_confidence,sample_size,evidence_event_ids,supporting_metrics",
      )
      .eq("id", parsed.data.proposalId)
      .maybeSingle();
    if (findError) throw findError;
    if (!existing) {
      return new Response(JSON.stringify({ error: "Insight proposal not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (["applied", "rejected", "invalidated", "archived"].includes(String(existing.status))) {
      return new Response(JSON.stringify({ error: "Insight proposal is no longer decisionable" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (["approve", "test_only", "override"].includes(parsed.data.action)) {
      if (existing.brand_safety_flag !== true && parsed.data.action !== "override") {
        return new Response(JSON.stringify({ error: "Brand-unsafe insight requires explicit override" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (
        existing.activation_mode === "reversible_experiment" &&
        (!existing.rollback_condition || !existing.rollback_trigger)
      ) {
        return new Response(JSON.stringify({ error: "Reversible experiment requires rollback controls" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (parsed.data.convertToValidated) {
      if (existing.learning_mode !== "exploratory_learning") {
        return new Response(JSON.stringify({ error: "Only exploratory insights can be converted." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (
        typeof existing.final_confidence !== "number" ||
        existing.final_confidence < 0.7 ||
        typeof existing.sample_size !== "number" ||
        existing.sample_size < 2 ||
        typeof existing.cluster_key !== "string" ||
        existing.cluster_key.trim().length === 0 ||
        !Array.isArray(existing.evidence_event_ids) ||
        existing.evidence_event_ids.length === 0 ||
        !existing.supporting_metrics
      ) {
        return new Response(
          JSON.stringify({
            error:
              "Exploratory insight cannot be converted yet. Missing validated-learning evidence/confidence requirements.",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      const { data: score, error: scoreError } = await supabase
        .from("lls_evidence_scores")
        .select("id")
        .eq("tenant_id", existing.tenant_id)
        .eq("cluster_key", existing.cluster_key)
        .eq("learning_mode", existing.learning_mode)
        .eq("final_confidence", existing.final_confidence)
        .eq("sample_size", existing.sample_size)
        .limit(1)
        .maybeSingle();
      if (scoreError) throw scoreError;
      if (!score?.id) {
        return new Response(
          JSON.stringify({
            error: "Exploratory insight cannot be converted without a matching LLS evidence score.",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    const update: Record<string, unknown> = {
      status: statusByAction[parsed.data.action],
      decision_action: parsed.data.action,
      decided_by: userData.user.id,
      decision_timestamp: new Date().toISOString(),
      evidence: {
        ...((existing.evidence as Record<string, unknown> | null) ?? {}),
        human_decision: {
          action: parsed.data.action,
          rationale: parsed.data.rationale ?? null,
          decided_by: userData.user.id,
          decided_at: new Date().toISOString(),
        },
      },
    };
    if (parsed.data.action === "amend" && parsed.data.amendments) {
      Object.assign(update, parsed.data.amendments);
    }
    if (parsed.data.convertToValidated) {
      update.converted_to_validated = true;
      update.converted_by = userData.user.id;
      update.converted_at = new Date().toISOString();
      update.conversion_notes = parsed.data.conversionNotes ?? parsed.data.rationale ?? null;
    }

    const { data: updated, error: updateError } = await supabase
      .from("lls_insight_proposals")
      .update(update)
      .eq("id", parsed.data.proposalId)
      .select("id,status,decision_action,converted_to_validated,converted_at")
      .single();
    if (updateError) throw updateError;

    return new Response(JSON.stringify({ ok: true, proposal: updated }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("lls-insight-decide error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
