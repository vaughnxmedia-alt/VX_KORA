/**
 * Public: charge $150 USD for Strategy Session via Square Payments API.
 * Secrets: SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID (or use body override in dev only — not implemented).
 * Optional: SQUARE_ENVIRONMENT = sandbox | production (default production).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { readAttributionFromPayload, safeRecordOutcome } from "../_shared/lls.ts";
import {
  formatSquareAuthError,
  mismatchMessage,
  squareEnvironmentFromApplicationId,
} from "../_shared/square-environment.ts";

const STRATEGY_SESSION_AMOUNT_CENTS = 150_00;

function textOrNull(value: unknown, max = 180): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

const bodySchema = z.object({
  sourceId: z.string().min(4, "Invalid payment source"),
  idempotencyKey: z.string().uuid("Invalid idempotency key"),
  buyerEmail: z.string().email().optional(),
  /** Browser Application ID (VITE_SQUARE_APPLICATION_ID) — used to detect sandbox/production mismatch. */
  applicationId: z.string().max(128).optional(),
  leadSource: z.record(z.unknown()).optional(),
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

    const { sourceId, idempotencyKey, buyerEmail, applicationId: clientApplicationId } = parsed.data;
    const leadSource = readAttributionFromPayload(parsed.data as unknown as Record<string, unknown>);

    const clientAppId = clientApplicationId?.trim() ?? "";
    if (clientAppId) {
      const clientEnv = squareEnvironmentFromApplicationId(clientAppId);
      const serverEnv = useSandbox ? "sandbox" : "production";
      if (clientEnv && clientEnv !== serverEnv) {
        console.error("square-strategy-session-payment: env mismatch", { clientEnv, serverEnv, clientAppId });
        return new Response(
          JSON.stringify({ error: mismatchMessage(clientAppId, useSandbox) }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }
    const leadSourceMeta = leadSource.metadata as Record<string, unknown>;
    const buyerEmailLower = buyerEmail?.trim().toLowerCase() || null;
    const buyerKey = textOrNull(leadSourceMeta.buyer_key, 180) ?? buyerEmailLower ?? idempotencyKey;
    const clientId = textOrNull(leadSourceMeta.client_id, 120) ?? "jahknowspr";
    const leadMagnetId = textOrNull(leadSourceMeta.lead_magnet_id, 120) ?? "strategy_session";
    const offerStage = textOrNull(leadSourceMeta.offer_stage, 80) ?? "paid_trust_builder";
    const campaignId = textOrNull(leadSourceMeta.campaign_id, 120);
    const adsetId = textOrNull(leadSourceMeta.adset_id, 120);
    const creativeId = textOrNull(leadSourceMeta.creative_id, 120);
    const audienceClusterId = textOrNull(leadSourceMeta.audience_cluster_id, 120);
    const audiencePoolId = textOrNull(leadSourceMeta.audience_pool_id, 120);
    const auditIntakeId = textOrNull(leadSourceMeta.audit_intake_id, 64);
    const strategySessionId = textOrNull(leadSourceMeta.strategy_session_id, 64);
    const journeyKey = `jahknowspr_web:jahknowspr:${clientId}:${buyerKey}`.slice(0, 300);

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
      const rawMsg = squareJson.errors?.map((e) => e.detail || e.code).filter(Boolean).join("; ") ||
        `Square error (${squareRes.status})`;
      const msg = formatSquareAuthError(rawMsg, useSandbox);
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
      buyer_email: buyerEmailLower,
      buyer_key: buyerKey,
      square_location_id: locationId,
      raw_status: payStatus,
      meeting_id: null,
      buyer_journey_id: null,
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

    const paymentSuccessBody = JSON.stringify({
      ok: true,
      squarePaymentId: paymentId,
      buyerKey,
      status: payStatus,
    });

    try {
    await supabase.from("buyer_identity_links").upsert([
      {
        canonical_buyer_key: buyerKey,
        identity_type: "buyer_key",
        identity_value: buyerKey,
        site_id: "jahknowspr_web",
        brand_id: "jahknowspr",
        client_id: clientId,
        last_seen_at: new Date().toISOString(),
        metadata: { source: "square_strategy_session_payment" },
      },
      ...(buyerEmailLower
        ? [{
          canonical_buyer_key: buyerKey,
          identity_type: "email",
          identity_value: buyerEmailLower,
          site_id: "jahknowspr_web",
          brand_id: "jahknowspr",
          client_id: clientId,
          last_seen_at: new Date().toISOString(),
          metadata: { source: "square_strategy_session_payment" },
        }]
        : []),
    ], { onConflict: "canonical_buyer_key,identity_type,identity_value" });

    const { data: existingJourney } = await supabase
      .from("buyer_journeys")
      .select("purchase_count,total_revenue,first_event_at")
      .eq("journey_key", journeyKey)
      .maybeSingle();
    const { data: buyerJourney, error: buyerJourneyError } = await supabase
      .from("buyer_journeys")
      .upsert({
        journey_key: journeyKey,
        site_id: "jahknowspr_web",
        brand_id: "jahknowspr",
        client_id: clientId,
        canonical_buyer_key: buyerKey,
        buyer_key: buyerKey,
        lead_key: buyerEmailLower,
        audit_intake_id: auditIntakeId,
        strategy_session_id: strategySessionId,
        payment_transaction_id: null,
        first_event_at: existingJourney?.first_event_at ?? new Date().toISOString(),
        last_event_at: new Date().toISOString(),
        first_touch_utm_source: leadSource.utm_source ?? null,
        first_touch_utm_medium: leadSource.utm_medium ?? null,
        first_touch_utm_campaign: leadSource.utm_campaign ?? null,
        first_touch_utm_content: leadSource.utm_content ?? null,
        first_touch_utm_term: leadSource.utm_term ?? null,
        last_touch_utm_source: leadSource.utm_source ?? null,
        last_touch_utm_medium: leadSource.utm_medium ?? null,
        last_touch_utm_campaign: leadSource.utm_campaign ?? null,
        last_touch_utm_content: leadSource.utm_content ?? null,
        last_touch_utm_term: leadSource.utm_term ?? null,
        journey_status: "purchased",
        is_buyer: true,
        purchase_count: Number(existingJourney?.purchase_count ?? 0) + 1,
        total_revenue: Number((Number(existingJourney?.total_revenue ?? 0) + (STRATEGY_SESSION_AMOUNT_CENTS / 100)).toFixed(2)),
        latest_offer_id: "strategy_session",
        latest_campaign_id: campaignId,
        latest_lead_magnet_id: leadMagnetId,
        metadata: {
          source: "square_strategy_session_payment",
          payment_id: paymentId,
        },
      }, { onConflict: "journey_key" })
      .select("id")
      .single();
    if (buyerJourneyError) throw buyerJourneyError;
    const buyerJourneyId = buyerJourney?.id as string;

    await supabase
      .from("payment_transactions")
      .update({ buyer_journey_id: buyerJourneyId })
      .eq("idempotency_key", idempotencyKey);

    const { data: analyticsEvent, error: analyticsEventError } = await supabase
      .from("analytics_events")
      .insert({
        event_name: "purchase_complete",
        site_id: "jahknowspr_web",
        client_id: clientId,
        brand_id: "jahknowspr",
        lead_magnet_id: leadMagnetId,
        offer_stage: offerStage,
        platform: "square",
        page_path: "/strategy-session/payment",
        campaign_id: campaignId,
        adset_id: adsetId,
        creative_id: creativeId,
        audience_cluster_id: audienceClusterId,
        audience_pool_id: audiencePoolId,
        offer_id: "strategy_session",
        funnel_id: "strategy_session",
        funnel_step: "purchase_complete",
        revenue_value: STRATEGY_SESSION_AMOUNT_CENTS / 100,
        currency: "USD",
        anonymous_visitor_id: `square_${paymentId}`,
        session_id: idempotencyKey,
        user_id: null,
        buyer_key: buyerKey,
        audit_intake_id: auditIntakeId,
        strategy_session_id: strategySessionId,
        buyer_journey_id: buyerJourneyId,
        utm_source: leadSource.utm_source ?? null,
        utm_medium: leadSource.utm_medium ?? null,
        utm_campaign: leadSource.utm_campaign ?? null,
        utm_content: leadSource.utm_content ?? null,
        utm_term: leadSource.utm_term ?? null,
        landing_page_url: leadSource.current_url ?? null,
        message_angle: leadSource.messaging_angle ?? null,
        metadata: {
          buyer_email: buyerEmailLower,
          square_location_id: locationId,
          square_status: payStatus,
          square_environment: envRaw,
          source: "square-strategy-session-payment",
        },
      })
      .select("id")
      .single();
    if (analyticsEventError) throw analyticsEventError;

    const { data: revenueAttribution, error: revenueError } = await supabase
      .from("revenue_attribution")
      .insert({
        site_id: "jahknowspr_web",
        client_id: clientId,
        brand_id: "jahknowspr",
        lead_magnet_id: leadMagnetId,
        offer_stage: offerStage,
        offer_id: "strategy_session",
        offer_name: "Strategy Session",
        amount: STRATEGY_SESSION_AMOUNT_CENTS / 100,
        currency: "USD",
        page_path: "/strategy-session/payment",
        campaign_id: campaignId,
        adset_id: adsetId,
        creative_id: creativeId,
        audience_cluster_id: audienceClusterId,
        audience_pool_id: audiencePoolId,
        utm_source: leadSource.utm_source ?? null,
        utm_medium: leadSource.utm_medium ?? null,
        utm_campaign: leadSource.utm_campaign ?? null,
        utm_content: leadSource.utm_content ?? null,
        utm_term: leadSource.utm_term ?? null,
        anonymous_visitor_id: `square_${paymentId}`,
        session_id: idempotencyKey,
        user_id: null,
        buyer_key: buyerKey,
        audit_intake_id: auditIntakeId,
        strategy_session_id: strategySessionId,
        buyer_journey_id: buyerJourneyId,
        payment_provider: "square",
        order_id: paymentId,
        platform: "square",
        message_angle: leadSource.messaging_angle ?? null,
        content_angle: textOrNull(leadSourceMeta.content_angle, 160),
        landing_page_url: leadSource.current_url ?? null,
        metadata: {
          buyer_email: buyerEmailLower,
          square_location_id: locationId,
          square_status: payStatus,
          square_environment: envRaw,
          source: "square-strategy-session-payment",
        },
      })
      .select("id")
      .single();
    if (revenueError) throw revenueError;

    await Promise.allSettled([
      supabase.from("buyer_purchase_attribution").insert({
        source_event_id: analyticsEvent?.id ?? null,
        source_revenue_attribution_id: revenueAttribution?.id ?? null,
        site_id: "jahknowspr_web",
        client_id: clientId,
        brand_id: "jahknowspr",
        industry_key: textOrNull(leadSourceMeta.industry_key, 120),
        audience_cluster_id: audienceClusterId,
        audience_pool_id: audiencePoolId,
        lead_magnet_id: leadMagnetId,
        offer_stage: offerStage,
        offer_id: "strategy_session",
        offer_name: "Strategy Session",
        platform: "square",
        content_angle: textOrNull(leadSourceMeta.content_angle, 160),
        message_angle: leadSource.messaging_angle ?? null,
        landing_page_url: leadSource.current_url ?? null,
        utm_source: leadSource.utm_source ?? null,
        utm_medium: leadSource.utm_medium ?? null,
        utm_campaign: leadSource.utm_campaign ?? null,
        utm_content: leadSource.utm_content ?? null,
        utm_term: leadSource.utm_term ?? null,
        campaign_id: campaignId,
        adset_id: adsetId,
        creative_id: creativeId,
        funnel_id: "strategy_session",
        anonymous_visitor_id: `square_${paymentId}`,
        session_id: idempotencyKey,
        user_id: null,
        audit_intake_id: auditIntakeId,
        strategy_session_id: strategySessionId,
        buyer_journey_id: buyerJourneyId,
        buyer_key: buyerKey,
        order_id: paymentId,
        payment_provider: "square",
        amount: STRATEGY_SESSION_AMOUNT_CENTS / 100,
        currency: "USD",
        metadata: {
          buyer_email: buyerEmailLower,
          square_location_id: locationId,
          square_status: payStatus,
          source: "square-strategy-session-payment",
        },
      }),
      supabase.from("lead_magnet_interactions").insert({
        lead_magnet_id: leadMagnetId,
        interaction_kind: "purchase",
        interaction_status: "success",
        occurred_at: new Date().toISOString(),
        site_id: "jahknowspr_web",
        brand_id: "jahknowspr",
        client_id: clientId,
        buyer_journey_id: buyerJourneyId,
        canonical_buyer_key: buyerKey,
        buyer_key: buyerKey,
        lead_key: buyerEmailLower,
        audit_intake_id: auditIntakeId,
        strategy_session_id: strategySessionId,
        campaign_id: campaignId,
        adset_id: adsetId,
        creative_id: creativeId,
        audience_cluster_id: audienceClusterId,
        audience_pool_id: audiencePoolId,
        offer_id: "strategy_session",
        offer_stage: offerStage,
        revenue_value: STRATEGY_SESSION_AMOUNT_CENTS / 100,
        currency: "USD",
        source_event_id: analyticsEvent?.id ?? null,
        source_revenue_attribution_id: revenueAttribution?.id ?? null,
        metadata: {
          payment_id: paymentId,
          source: "square-strategy-session-payment",
        },
      }),
      safeRecordOutcome(supabase, {
        lead_id: buyerEmailLower,
        buyer_key: buyerKey,
        buyer_journey_id: buyerJourneyId,
        audit_intake_id: auditIntakeId,
        strategy_session_id: strategySessionId,
        lead_magnet_id: leadMagnetId,
        campaign_id: campaignId,
        adset_id: adsetId,
        creative_id: creativeId,
        offer_id: "strategy_session",
        offer_stage: offerStage,
        audience_cluster_id: audienceClusterId,
        audience_pool_id: audiencePoolId,
        revenue_attribution_id: revenueAttribution?.id ?? null,
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
        correlation_id: buyerEmailLower || idempotencyKey,
        strategy_id: "system:strategy-session-payment",
        messaging_angle: "strategy_session_payment",
        hook: "paid_strategy_session",
        projection_version: "lls-projection-v1:strategy-session",
        intended_outcome: { amount_cents: STRATEGY_SESSION_AMOUNT_CENTS, currency: "USD" },
        actual_outcome: { payment_id: paymentId, square_status: payStatus },
        metadata: {
          idempotency_key: idempotencyKey,
          square_environment: envRaw,
          source_event_id: analyticsEvent?.id ?? null,
        },
      }),
    ]);
    } catch (postPayErr) {
      console.error("square-strategy-session-payment: post-payment bookkeeping failed:", postPayErr);
    }

    return new Response(paymentSuccessBody, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
