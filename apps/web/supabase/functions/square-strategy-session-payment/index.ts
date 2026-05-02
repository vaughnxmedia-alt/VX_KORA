/**
 * Public: charge $150 USD for Strategy Session via Square Payments API.
 * Secrets: SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID (or use body override in dev only — not implemented).
 * Optional: SQUARE_ENVIRONMENT = sandbox | production (default production).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { safeRecordOutcome } from "../_shared/lls.ts";

const STRATEGY_SESSION_AMOUNT_CENTS = 150_00;

const bodySchema = z.object({
  sourceId: z.string().min(4, "Invalid payment source"),
  idempotencyKey: z.string().uuid("Invalid idempotency key"),
  buyerEmail: z.string().email().optional(),
});

const SQUARE_VERSION = "2024-10-17";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const accessToken = Deno.env.get("SQUARE_ACCESS_TOKEN")?.trim();
    const locationId = Deno.env.get("SQUARE_LOCATION_ID")?.trim();
    const envRaw = (Deno.env.get("SQUARE_ENVIRONMENT") || "production").toLowerCase();
    const useSandbox = envRaw === "sandbox";

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!accessToken || !locationId) {
      console.error("square-strategy-session-payment: missing SQUARE_ACCESS_TOKEN or SQUARE_LOCATION_ID");
      return new Response(
        JSON.stringify({ error: "Payment service is not configured." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Server configuration incomplete." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { sourceId, idempotencyKey, buyerEmail } = parsed.data;

    const baseUrl = useSandbox
      ? "https://connect.squareupsandbox.com"
      : "https://connect.squareup.com";

    const squareRes = await fetch(`${baseUrl}/v2/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Square-Version": SQUARE_VERSION,
      },
      body: JSON.stringify({
        idempotency_key: idempotencyKey,
        source_id: sourceId,
        location_id: locationId,
        amount_money: {
          amount: STRATEGY_SESSION_AMOUNT_CENTS,
          currency: "USD",
        },
        note: "Strategy Session ($150)",
        ...(buyerEmail ? { buyer_email_address: buyerEmail } : {}),
      }),
    });

    const squareJson = (await squareRes.json()) as {
      payment?: { id?: string; status?: string };
      errors?: { category?: string; code?: string; detail?: string }[];
    };

    if (!squareRes.ok || squareJson.errors?.length) {
      const msg = squareJson.errors?.map((e) => e.detail || e.code).filter(Boolean).join("; ") ||
        `Square error (${squareRes.status})`;
      console.error("Square CreatePayment failed:", squareRes.status, squareJson);
      return new Response(
        JSON.stringify({ error: msg }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const paymentId = squareJson.payment?.id;
    const payStatus = squareJson.payment?.status || "UNKNOWN";
    if (!paymentId) {
      console.error("Square response missing payment.id", squareJson);
      return new Response(
        JSON.stringify({ error: "Payment could not be completed." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error: insErr } = await supabase.from("payment_transactions").insert({
      provider: "square",
      external_payment_id: paymentId,
      idempotency_key: idempotencyKey,
      amount_cents: STRATEGY_SESSION_AMOUNT_CENTS,
      currency: "USD",
      buyer_email: buyerEmail?.trim().toLowerCase() || null,
      square_location_id: locationId,
      raw_status: payStatus,
      meeting_id: null,
    });

    if (insErr) {
      if (insErr.code === "23505") {
        const { data: existing } = await supabase
          .from("payment_transactions")
          .select("external_payment_id")
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle();
        const existingId = existing?.external_payment_id || paymentId;
        return new Response(
          JSON.stringify({
            ok: true,
            squarePaymentId: existingId,
            status: "COMPLETED",
            duplicate: true,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      console.error("payment_transactions insert:", insErr);
      return new Response(
        JSON.stringify({ error: "Could not record payment. Contact us with your card statement time." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await Promise.allSettled([
      supabase.from("revenue_attribution").insert({
        site_id: "jahknowspr_web",
        client_id: "jahknowspr",
        brand_id: "jahknowspr",
        offer_id: "strategy_session",
        offer_name: "Strategy Session",
        amount: STRATEGY_SESSION_AMOUNT_CENTS / 100,
        currency: "USD",
        page_path: "/strategy-session/payment",
        campaign_id: null,
        utm_source: null,
        utm_medium: null,
        utm_campaign: null,
        anonymous_visitor_id: `square_${paymentId}`,
        session_id: idempotencyKey,
        user_id: null,
        payment_provider: "square",
        order_id: paymentId,
        metadata: {
          buyer_email: buyerEmail?.trim().toLowerCase() || null,
          square_location_id: locationId,
          square_status: payStatus,
          square_environment: envRaw,
          source: "square-strategy-session-payment",
        },
      }),
      safeRecordOutcome(supabase, {
        lead_id: buyerEmail?.trim().toLowerCase() || null,
        subject_kind: "payment",
        subject_id: paymentId,
        actor_kind: "client",
        action: "payment_succeeded",
        strategy_origin: "human_defined",
        learning_mode: "validated_learning",
        intended_metric_type: "strategy_session_revenue",
        actual_metric_type: "square_payment",
        delta_value: STRATEGY_SESSION_AMOUNT_CENTS / 100,
        success_flag: true,
        revenue_impact: STRATEGY_SESSION_AMOUNT_CENTS / 100,
        outcome_verified: true,
        verification_source: "system",
        verification_confidence_component: 0.98,
        causal_method: "direct_attribution",
        causal_confidence_component: 0.85,
        evidence_strength_component: 0.55,
        status: "success",
        business_goal: "revenue",
        correlation_id: buyerEmail?.trim().toLowerCase() || idempotencyKey,
        strategy_id: "system:strategy-session-payment",
        messaging_angle: "strategy_session_payment",
        hook: "paid_strategy_session",
        projection_version: "lls-projection-v1:strategy-session",
        intended_outcome: { amount_cents: STRATEGY_SESSION_AMOUNT_CENTS, currency: "USD" },
        actual_outcome: { payment_id: paymentId, square_status: payStatus },
        metadata: { idempotency_key: idempotencyKey, square_environment: envRaw },
      }),
    ]);

    return new Response(
      JSON.stringify({
        ok: true,
        squarePaymentId: paymentId,
        status: payStatus,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
