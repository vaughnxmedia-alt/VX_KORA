/**
 * Public: create a Square monthly subscription for Telegram access ($15/mo),
 * then email a bot join link using a one-time invite token.
 *
 * Required secrets:
 * - SQUARE_ACCESS_TOKEN
 * - SQUARE_LOCATION_ID
 * - SQUARE_SUBSCRIPTION_PLAN_VARIATION_ID
 * - RESEND_API_KEY
 * - SUPABASE_SERVICE_ROLE_KEY (provided by runtime)
 * - SUPABASE_URL (provided by runtime)
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod/mod.ts";
import { Resend } from "npm:resend@2.0.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logOutboundEmail } from "../_shared/outbound-email-log.ts";
import { readAttributionFromPayload, safeRecordOutcome } from "../_shared/lls.ts";

const bodySchema = z.object({
  sourceId: z.string().min(4, "Invalid payment source"),
  idempotencyKey: z.string().uuid("Invalid idempotency key"),
  email: z.string().email(),
  fullName: z.string().min(2).max(120),
  leadSource: z.record(z.unknown()).optional(),
});

const FROM_NAME = "Jah Jah";
const DEFAULT_FROM_EMAIL = "welcome@jahknowspr.com";
const TELEGRAM_BOT_LINK = "https://t.me/VX_kora_bot";
const SQUARE_VERSION = "2024-10-17";
const AMOUNT_CENTS = 1500;

function textOrNull(value: unknown, max = 180): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function splitName(full: string): { first: string; last: string | null } {
  const t = full.trim();
  const i = t.indexOf(" ");
  if (i === -1) return { first: t, last: null };
  return { first: t.slice(0, i).trim(), last: t.slice(i + 1).trim() || null };
}

function buildTelegramAccessEmailHtml(name: string, joinLink: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;line-height:1.6;color:#111827;">
      <h2 style="margin:0 0 12px;color:#0f172a;">You're in, ${name}.</h2>
      <p style="margin:0 0 12px;">Your KORA Telegram access subscription is active.</p>
      <p style="margin:0 0 20px;">Tap below to join and connect your Telegram account:</p>
      <a href="${joinLink}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">
        Join KORA on Telegram
      </a>
      <p style="margin:20px 0 0;color:#6b7280;font-size:14px;">
        If the button does not open, use this link: ${joinLink}
      </p>
    </div>
  `;
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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const SQUARE_ACCESS_TOKEN = Deno.env.get("SQUARE_ACCESS_TOKEN") ?? "";
    const SQUARE_LOCATION_ID = Deno.env.get("SQUARE_LOCATION_ID") ?? "";
    const PLAN_VARIATION_ID = Deno.env.get("SQUARE_SUBSCRIPTION_PLAN_VARIATION_ID") ?? "";
    const SQUARE_ENVIRONMENT = (Deno.env.get("SQUARE_ENVIRONMENT") || "production").toLowerCase();
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
    const FROM_EMAIL = Deno.env.get("TELEGRAM_SUBSCRIPTION_FROM_EMAIL") || DEFAULT_FROM_EMAIL;

    if (
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY ||
      !SQUARE_ACCESS_TOKEN ||
      !SQUARE_LOCATION_ID ||
      !PLAN_VARIATION_ID ||
      !RESEND_API_KEY
    ) {
      return new Response(JSON.stringify({ error: "Server configuration incomplete." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input.", details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { sourceId, idempotencyKey, email, fullName } = parsed.data;
    const emailNorm = email.trim().toLowerCase();
    const leadSource = readAttributionFromPayload(parsed.data as unknown as Record<string, unknown>);
    const leadSourceMeta = leadSource.metadata as Record<string, unknown>;
    const buyerKey = textOrNull(leadSourceMeta.buyer_key, 180) ?? emailNorm;
    const clientId = textOrNull(leadSourceMeta.client_id, 120) ?? "jahknowspr";
    const leadMagnetId = textOrNull(leadSourceMeta.lead_magnet_id, 120) ?? "the_brief";
    const offerStage = textOrNull(leadSourceMeta.offer_stage, 80) ?? "subscription";
    const campaignId = textOrNull(leadSourceMeta.campaign_id, 120);
    const adsetId = textOrNull(leadSourceMeta.adset_id, 120);
    const creativeId = textOrNull(leadSourceMeta.creative_id, 120);
    const audienceClusterId = textOrNull(leadSourceMeta.audience_cluster_id, 120);
    const audiencePoolId = textOrNull(leadSourceMeta.audience_pool_id, 120);
    const journeyKey = `jahknowspr_web:jahknowspr:${clientId}:${buyerKey}`.slice(0, 300);

    const squareBaseUrl =
      SQUARE_ENVIRONMENT === "sandbox"
        ? "https://connect.squareupsandbox.com"
        : "https://connect.squareup.com";

    const squareHeaders = {
      Authorization: `Bearer ${SQUARE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "Square-Version": SQUARE_VERSION,
    };

    const customerRes = await fetch(`${squareBaseUrl}/v2/customers`, {
      method: "POST",
      headers: squareHeaders,
      body: JSON.stringify({
        given_name: splitName(fullName).first,
        family_name: splitName(fullName).last ?? undefined,
        email_address: emailNorm,
        idempotency_key: `${idempotencyKey}-customer`,
      }),
    });
    const customerJson = await customerRes.json();
    const squareCustomerId = customerJson?.customer?.id as string | undefined;
    if (!customerRes.ok || !squareCustomerId) {
      console.error("Square create customer failed:", customerRes.status, customerJson);
      return new Response(JSON.stringify({ error: "Could not start subscription." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cardRes = await fetch(`${squareBaseUrl}/v2/cards`, {
      method: "POST",
      headers: squareHeaders,
      body: JSON.stringify({
        source_id: sourceId,
        idempotency_key: `${idempotencyKey}-card`,
        customer_id: squareCustomerId,
      }),
    });
    const cardJson = await cardRes.json();
    const squareCardId = cardJson?.card?.id as string | undefined;
    if (!cardRes.ok || !squareCardId) {
      console.error("Square create card failed:", cardRes.status, cardJson);
      return new Response(JSON.stringify({ error: "Card could not be saved for billing." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subscriptionRes = await fetch(`${squareBaseUrl}/v2/subscriptions`, {
      method: "POST",
      headers: squareHeaders,
      body: JSON.stringify({
        idempotency_key: `${idempotencyKey}-subscription`,
        location_id: SQUARE_LOCATION_ID,
        plan_variation_id: PLAN_VARIATION_ID,
        customer_id: squareCustomerId,
        card_id: squareCardId,
        start_date: new Date().toISOString().slice(0, 10),
      }),
    });
    const subscriptionJson = await subscriptionRes.json();
    const squareSubscriptionId = subscriptionJson?.subscription?.id as string | undefined;
    const squareStatus = (subscriptionJson?.subscription?.status as string | undefined) || "UNKNOWN";
    if (!subscriptionRes.ok || !squareSubscriptionId) {
      console.error("Square create subscription failed:", subscriptionRes.status, subscriptionJson);
      return new Response(JSON.stringify({ error: "Subscription could not be created." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: subscriptionRow, error: subscriptionInsertErr } = await supabaseAdmin
      .from("telegram_subscriptions")
      .insert({
        email: emailNorm,
        full_name: fullName.trim(),
        provider: "square",
        square_customer_id: squareCustomerId,
        square_card_id: squareCardId,
        square_subscription_id: squareSubscriptionId,
        square_status: squareStatus,
        plan_variation_id: PLAN_VARIATION_ID,
        amount_cents: AMOUNT_CENTS,
        currency: "USD",
        access_status: "active",
      })
      .select("id")
      .single();
    if (subscriptionInsertErr) {
      console.error("telegram_subscriptions insert error:", subscriptionInsertErr);
      return new Response(JSON.stringify({ error: "Subscription created but could not be recorded." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabaseAdmin.from("buyer_identity_links").upsert([
      {
        canonical_buyer_key: buyerKey,
        identity_type: "buyer_key",
        identity_value: buyerKey,
        site_id: "jahknowspr_web",
        brand_id: "jahknowspr",
        client_id: clientId,
        last_seen_at: new Date().toISOString(),
        metadata: { source: "square_telegram_subscription_payment" },
      },
      {
        canonical_buyer_key: buyerKey,
        identity_type: "email",
        identity_value: emailNorm,
        site_id: "jahknowspr_web",
        brand_id: "jahknowspr",
        client_id: clientId,
        last_seen_at: new Date().toISOString(),
        metadata: { source: "square_telegram_subscription_payment" },
      },
    ], { onConflict: "canonical_buyer_key,identity_type,identity_value" });

    const { data: existingJourney } = await supabaseAdmin
      .from("buyer_journeys")
      .select("purchase_count,total_revenue,first_event_at")
      .eq("journey_key", journeyKey)
      .maybeSingle();
    const { data: buyerJourney, error: buyerJourneyError } = await supabaseAdmin
      .from("buyer_journeys")
      .upsert({
        journey_key: journeyKey,
        site_id: "jahknowspr_web",
        brand_id: "jahknowspr",
        client_id: clientId,
        canonical_buyer_key: buyerKey,
        buyer_key: buyerKey,
        lead_key: emailNorm,
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
        total_revenue: Number((Number(existingJourney?.total_revenue ?? 0) + (AMOUNT_CENTS / 100)).toFixed(2)),
        latest_offer_id: "telegram_subscription",
        latest_campaign_id: campaignId,
        latest_lead_magnet_id: leadMagnetId,
        metadata: {
          source: "square_telegram_subscription_payment",
          subscription_id: squareSubscriptionId,
        },
      }, { onConflict: "journey_key" })
      .select("id")
      .single();
    if (buyerJourneyError) {
      console.error("buyer_journeys upsert error:", buyerJourneyError);
    }
    const buyerJourneyId = buyerJourney?.id as string | null;

    const { data: analyticsEvent } = await supabaseAdmin
      .from("analytics_events")
      .insert({
        event_name: "purchase_complete",
        site_id: "jahknowspr_web",
        client_id: clientId,
        brand_id: "jahknowspr",
        lead_magnet_id: leadMagnetId,
        offer_stage: offerStage,
        platform: "square",
        page_path: "/telegram-subscription/payment",
        campaign_id: campaignId,
        adset_id: adsetId,
        creative_id: creativeId,
        audience_cluster_id: audienceClusterId,
        audience_pool_id: audiencePoolId,
        offer_id: "telegram_subscription",
        funnel_id: "newsletter",
        funnel_step: "purchase_complete",
        revenue_value: AMOUNT_CENTS / 100,
        currency: "USD",
        anonymous_visitor_id: `square_${squareSubscriptionId}`,
        session_id: idempotencyKey,
        user_id: null,
        buyer_key: buyerKey,
        buyer_journey_id: buyerJourneyId,
        utm_source: leadSource.utm_source ?? null,
        utm_medium: leadSource.utm_medium ?? null,
        utm_campaign: leadSource.utm_campaign ?? null,
        utm_content: leadSource.utm_content ?? null,
        utm_term: leadSource.utm_term ?? null,
        landing_page_url: leadSource.current_url ?? null,
        message_angle: leadSource.messaging_angle ?? null,
        metadata: {
          subscription_id: squareSubscriptionId,
          source: "square-telegram-subscription-payment",
        },
      })
      .select("id")
      .single();

    const { data: revenueAttribution } = await supabaseAdmin
      .from("revenue_attribution")
      .insert({
        site_id: "jahknowspr_web",
        client_id: clientId,
        brand_id: "jahknowspr",
        lead_magnet_id: leadMagnetId,
        offer_stage: offerStage,
        offer_id: "telegram_subscription",
        offer_name: "Telegram Subscription",
        amount: AMOUNT_CENTS / 100,
        currency: "USD",
        page_path: "/telegram-subscription/payment",
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
        anonymous_visitor_id: `square_${squareSubscriptionId}`,
        session_id: idempotencyKey,
        user_id: null,
        buyer_key: buyerKey,
        buyer_journey_id: buyerJourneyId,
        payment_provider: "square",
        order_id: squareSubscriptionId,
        platform: "square",
        message_angle: leadSource.messaging_angle ?? null,
        content_angle: textOrNull(leadSourceMeta.content_angle, 160),
        landing_page_url: leadSource.current_url ?? null,
        metadata: {
          email: emailNorm,
          source: "square-telegram-subscription-payment",
        },
      })
      .select("id")
      .single();

    await Promise.allSettled([
      supabaseAdmin.from("buyer_purchase_attribution").insert({
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
        offer_id: "telegram_subscription",
        offer_name: "Telegram Subscription",
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
        funnel_id: "newsletter",
        anonymous_visitor_id: `square_${squareSubscriptionId}`,
        session_id: idempotencyKey,
        user_id: null,
        buyer_journey_id: buyerJourneyId,
        buyer_key: buyerKey,
        order_id: squareSubscriptionId,
        payment_provider: "square",
        amount: AMOUNT_CENTS / 100,
        currency: "USD",
        metadata: {
          email: emailNorm,
          source: "square-telegram-subscription-payment",
        },
      }),
      supabaseAdmin.from("lead_magnet_interactions").insert({
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
        lead_key: emailNorm,
        campaign_id: campaignId,
        adset_id: adsetId,
        creative_id: creativeId,
        audience_cluster_id: audienceClusterId,
        audience_pool_id: audiencePoolId,
        offer_id: "telegram_subscription",
        offer_stage: offerStage,
        revenue_value: AMOUNT_CENTS / 100,
        currency: "USD",
        source_event_id: analyticsEvent?.id ?? null,
        source_revenue_attribution_id: revenueAttribution?.id ?? null,
        metadata: {
          subscription_id: squareSubscriptionId,
          source: "square-telegram-subscription-payment",
        },
      }),
      safeRecordOutcome(supabaseAdmin, {
        lead_id: emailNorm,
        buyer_key: buyerKey,
        buyer_journey_id: buyerJourneyId,
        lead_magnet_id: leadMagnetId,
        campaign_id: campaignId,
        adset_id: adsetId,
        creative_id: creativeId,
        offer_id: "telegram_subscription",
        offer_stage: offerStage,
        audience_cluster_id: audienceClusterId,
        audience_pool_id: audiencePoolId,
        revenue_attribution_id: revenueAttribution?.id ?? null,
        subject_kind: "payment",
        subject_id: squareSubscriptionId,
        actor_kind: "client",
        action: "telegram_subscription_payment_succeeded",
        strategy_origin: "human_defined",
        learning_mode: "validated_learning",
        intended_metric_type: "subscription_revenue",
        actual_metric_type: "square_subscription_payment",
        delta_value: AMOUNT_CENTS / 100,
        success_flag: true,
        revenue_impact: AMOUNT_CENTS / 100,
        outcome_verified: true,
        verification_source: "system",
        verification_confidence_component: 0.98,
        causal_method: "direct_attribution",
        causal_confidence_component: 0.8,
        evidence_strength_component: 0.5,
        status: "success",
        business_goal: "revenue",
        correlation_id: leadSource.correlation_id ?? emailNorm,
        strategy_id: "system:telegram-subscription-payment",
        messaging_angle: leadSource.messaging_angle ?? "telegram_subscription",
        hook: leadSource.hook ?? "telegram_subscription_checkout",
        projection_version: "lls-projection-v1:telegram-subscription",
        intended_outcome: { amount_cents: AMOUNT_CENTS, currency: "USD" },
        actual_outcome: { subscription_id: squareSubscriptionId, square_status: squareStatus },
        metadata: { idempotency_key: idempotencyKey, source: "square-telegram-subscription-payment" },
      }),
    ]);

    const token = randomToken();
    const inviteRow = await supabaseAdmin
      .from("telegram_access_invites")
      .insert({
        subscription_id: subscriptionRow.id,
        email: emailNorm,
        full_name: fullName.trim(),
        token,
      })
      .select("id")
      .single();
    if (inviteRow.error) {
      console.error("telegram_access_invites insert error:", inviteRow.error);
      return new Response(JSON.stringify({ error: "Subscription created but invite setup failed." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const joinLink = `${TELEGRAM_BOT_LINK}?start=join_${token}`;
    const emailSubject = "KORA Telegram Access Active";
    const emailHtml = buildTelegramAccessEmailHtml(fullName.trim(), joinLink);
    const resend = new Resend(RESEND_API_KEY);

    try {
      const sendResult = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: emailNorm,
        subject: emailSubject,
        html: emailHtml,
      });
      await logOutboundEmail(supabaseAdmin, {
        messageType: "telegram_subscription_access",
        fromEmail: FROM_EMAIL,
        toEmail: emailNorm,
        subject: emailSubject,
        status: "sent",
        providerMessageId: (sendResult as { data?: { id?: string } })?.data?.id ?? null,
        relatedTable: "telegram_subscriptions",
        relatedId: subscriptionRow.id,
        generatedBy: "system",
        bodyHtml: emailHtml,
      });
    } catch (emailErr) {
      console.error("telegram subscription email error:", emailErr);
      await logOutboundEmail(supabaseAdmin, {
        messageType: "telegram_subscription_access",
        fromEmail: FROM_EMAIL,
        toEmail: emailNorm,
        subject: emailSubject,
        status: "failed",
        errorMessage: emailErr instanceof Error ? emailErr.message : "Failed to send telegram access email",
        relatedTable: "telegram_subscriptions",
        relatedId: subscriptionRow.id,
        generatedBy: "system",
        bodyHtml: emailHtml,
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        squareSubscriptionId,
        buyerKey,
        status: squareStatus,
        joinLink,
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
