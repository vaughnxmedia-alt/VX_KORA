/**
 * Public Strategy Session booking: upsert lead customer + meeting (pending until admin confirms in Leads).
 * Confirmation emails are sent by strategy-session-admin-confirm.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { resolveStrategySessionHost } from "../_shared/strategy-session-resolve-host.ts";
import { isSlotBookableForHost } from "../_shared/strategy-session-schedule.ts";
import {
  readAttributionFromPayload,
  safeRecordOutcome,
  safeUpsertFunnelAttribution,
} from "../_shared/lls.ts";
import { notifyAdminsStrategySessionPaidBooking } from "../_shared/strategy-session-admin-notify.ts";

/** Optional override for tests / rotation — must match client UX for known complimentary codes. */
const FREE_STRATEGY_SESSION_PROMO = Deno.env.get("STRATEGY_SESSION_FREE_PROMO") ?? "789586";

const bookSchema = z
  .object({
    fullName: z.string().min(2).max(200),
    businessName: z.string().min(1).max(200),
    email: z.string().email(),
    phone: z.string().min(7).max(40),
    websiteOrSocial: z.string().max(500).optional().or(z.literal("")),
    industry: z.string().min(1).max(200),
    offerSummary: z.string().min(1).max(4000),
    targetAudience: z.string().min(1).max(4000),
    currentChallenge: z.string().min(1).max(4000),
    sessionGoal: z.string().min(1).max(4000),
    sessionType: z.enum(["zoom", "in_person"]),
    inPersonLocation: z.string().max(500).optional().or(z.literal("")),
    additionalNotes: z.string().max(4000).optional().or(z.literal("")),
    /** ISO 8601 instant for the start of the session */
    slotStart: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Invalid datetime"),
    /** IANA timezone used for display in emails (e.g. America/New_York) */
    timezone: z.string().min(2).max(80),
    /** Maps to strategy_session_hosts.reference_code (optional — default public host if omitted) */
    employeeReferenceCode: z.string().max(32).optional(),
    /** Dashboard / Leads filter label — stored on meetings.booking_kind */
    bookingKind: z
      .enum([
        "full_program_sales",
        "creative_consultation",
        "telegram",
        "strategy_session",
        "campaign_retainer",
      ])
      .optional(),
    /** Square payment id from square-strategy-session-payment (CreatePayment response) */
    squarePaymentId: z.string().min(4).max(128).optional(),
    /** Server-validated complimentary session — cannot be combined with squarePaymentId */
    promoCode: z.string().max(32).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const pay = data.squarePaymentId?.trim();
    const promo = data.promoCode?.trim() ?? "";
    if (pay && promo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use either card payment or a promo code, not both.",
        path: ["promoCode"],
      });
      return;
    }
    if (pay) return;
    if (promo === FREE_STRATEGY_SESSION_PROMO) return;
    if (promo.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Unknown promo code.",
        path: ["promoCode"],
      });
      return;
    }
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Payment is required unless you have a valid promo code.",
      path: ["squarePaymentId"],
    });
  });

function splitName(full: string): { first: string; last: string | null } {
  const t = full.trim();
  const i = t.indexOf(" ");
  if (i === -1) return { first: t, last: null };
  return { first: t.slice(0, i).trim(), last: t.slice(i + 1).trim() || null };
}

function textOrNull(value: unknown, max = 180): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function canonicalBuyerKey(input: { buyerKey?: string | null; emailNorm: string; customerId: string }) {
  return textOrNull(input.buyerKey, 180) ?? textOrNull(input.emailNorm, 180) ?? input.customerId;
}

function buyerJourneyKey(input: { customerId: string; canonicalBuyerKey: string }) {
  return `jahknowspr_web:jahknowspr:${input.customerId}:${input.canonicalBuyerKey}`.slice(0, 300);
}

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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({
          error: "Server configuration incomplete. Try again later.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const parsed = bookSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const p = parsed.data;
    const leadSource = readAttributionFromPayload(body as Record<string, unknown>);
    const leadSourceMeta = leadSource.metadata as Record<string, unknown>;
    const buyerKeyFromSource = textOrNull(leadSourceMeta.buyer_key, 180);
    const leadMagnetId = textOrNull(leadSourceMeta.lead_magnet_id, 120) ?? "strategy_session";
    const offerStage = textOrNull(leadSourceMeta.offer_stage, 80) ?? "paid_trust_builder";
    const campaignId = textOrNull(leadSourceMeta.campaign_id, 120);
    const adsetId = textOrNull(leadSourceMeta.adset_id, 120);
    const creativeId = textOrNull(leadSourceMeta.creative_id, 120);
    const audienceClusterId = textOrNull(leadSourceMeta.audience_cluster_id, 120);
    const audiencePoolId = textOrNull(leadSourceMeta.audience_pool_id, 120);
    const slotDate = new Date(p.slotStart);
    if (Number.isNaN(slotDate.getTime())) {
      return new Response(JSON.stringify({ error: "Invalid slot time" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const envFallbackHost = Deno.env.get("STRATEGY_SESSION_DEFAULT_HOST_USER_ID") || undefined;

    let hostUserId: string;
    let employeeRefNormalized: string | null;
    try {
      const resolved = await resolveStrategySessionHost(
        supabase,
        p.employeeReferenceCode,
        envFallbackHost,
      );
      hostUserId = resolved.userId;
      employeeRefNormalized = resolved.normalizedCode;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "UNKNOWN_HOST_CODE") {
        return new Response(
          JSON.stringify({ error: "Invalid employee reference code. Check the code and try again." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (msg === "NO_DEFAULT_STRATEGY_HOST") {
        return new Response(
          JSON.stringify({
            error: "Scheduling is temporarily unavailable. Please try again later or contact us.",
          }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw e;
    }

    const slotCheck = await isSlotBookableForHost(supabase, hostUserId, p.slotStart);
    if (!slotCheck.ok) {
      return new Response(JSON.stringify({ error: slotCheck.reason }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payId = p.squarePaymentId?.trim();
    const promoTrim = p.promoCode?.trim() ?? "";
    const complimentary = !payId && promoTrim === FREE_STRATEGY_SESSION_PROMO;

    let payRow: { id: string; amount_cents: number; meeting_id: string | null } | null = null;

    if (!complimentary) {
      const { data: row, error: payErr } = await supabase
        .from("payment_transactions")
        .select("id, amount_cents, meeting_id")
        .eq("provider", "square")
        .eq("external_payment_id", payId!)
        .maybeSingle();

      if (payErr) throw payErr;
      if (!row) {
        return new Response(
          JSON.stringify({
            error:
              "No matching payment found. Complete payment on the previous step, then try again.",
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (row.meeting_id) {
        return new Response(
          JSON.stringify({
            error: "This payment is already linked to a booking.",
            meetingId: row.meeting_id,
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (row.amount_cents !== 15000) {
        return new Response(
          JSON.stringify({ error: "Payment amount does not match Strategy Session pricing." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      payRow = row;
    }

    const { first, last } = splitName(p.fullName);
    const emailNorm = p.email.trim().toLowerCase();

    const { data: existing, error: findErr } = await supabase
      .from("customers")
      .select("id")
      .eq("email", emailNorm)
      .maybeSingle();
    if (findErr) throw findErr;

    let customerId: string;
    if (existing?.id) {
      const { data: cur } = await supabase
        .from("customers")
        .select("client_status")
        .eq("id", existing.id)
        .single();
      const keepActive = cur?.client_status === "active_client";
      const { error: upErr } = await supabase
        .from("customers")
        .update({
          first_name: first,
          last_name: last,
          business_name: p.businessName,
          phone_number: p.phone,
          website: p.websiteOrSocial || null,
          lead_source: leadSource,
          ...(keepActive ? {} : { client_status: "strategy_session_pending" as const }),
        })
        .eq("id", existing.id);
      if (upErr) throw upErr;
      customerId = existing.id;
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from("customers")
        .insert({
          first_name: first,
          last_name: last,
          email: emailNorm,
          business_name: p.businessName,
          phone_number: p.phone,
          website: p.websiteOrSocial || null,
          lead_source: leadSource,
          client_status: "strategy_session_pending",
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      customerId = inserted!.id;
    }

    const correlationLookup = (leadSource.correlation_id ?? emailNorm).replace(/,/g, "");
    const { data: linkedAudit } = await supabase
      .from("free_audits")
      .select("id,audit_intake_id,buyer_key")
      .or(`correlation_id.eq.${correlationLookup},lead_email_lower.eq.${emailNorm},lead_key.eq.${emailNorm}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const auditIntakeId = linkedAudit?.audit_intake_id ?? linkedAudit?.id ?? null;
    const buyerKey = linkedAudit?.buyer_key ?? buyerKeyFromSource ?? emailNorm;
    const canonicalBuyer = canonicalBuyerKey({ buyerKey, emailNorm, customerId });
    const journeyKey = buyerJourneyKey({ customerId, canonicalBuyerKey: canonicalBuyer });

    const meetingPayload = {
      customer_id: customerId,
      audit_intake_id: auditIntakeId,
      buyer_key: buyerKey,
      lead_magnet_id: leadMagnetId,
      title: `Strategy Session — ${p.businessName}`,
      description: null as string | null,
      meeting_date: slotDate.toISOString(),
      duration_minutes: 60,
      status: "scheduled",
      full_name: p.fullName,
      business_name: p.businessName,
      email: emailNorm,
      phone: p.phone,
      website_or_social: p.websiteOrSocial || null,
      industry: p.industry,
      offer_summary: p.offerSummary,
      target_audience: p.targetAudience,
      current_challenge: p.currentChallenge,
      session_goal: p.sessionGoal,
      session_type: p.sessionType,
      in_person_location: p.sessionType === "in_person" ? (p.inPersonLocation || null) : null,
      timezone: p.timezone,
      service_name: "Strategy Session",
      booking_kind: p.bookingKind ?? "full_program_sales",
      service_price: 150,
      questionnaire_status: "completed",
      /** Held until Jocelyn confirms in Leads; then confirmation emails go out */
      booking_status: "pending",
      payment_status: "paid",
      payment_transaction_id: payRow?.id ?? null,
      confirmation_status: "pending",
      internal_notes: complimentary ? "Complimentary Strategy Session (promo)." : null,
      additional_notes: p.additionalNotes || null,
      host_user_id: hostUserId,
      employee_reference_code: employeeRefNormalized,
      lead_source: leadSource,
    };

    const { data: meetingRow, error: meetErr } = await supabase
      .from("meetings")
      .insert(meetingPayload)
      .select("id")
      .single();

    if (meetErr) {
      if (meetErr.code === "23505") {
        return new Response(
          JSON.stringify({ error: "That time slot was just taken. Please pick another." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw meetErr;
    }

    const meetingId = meetingRow!.id as string;

    await supabase.from("buyer_identity_links").upsert([
      {
        canonical_buyer_key: canonicalBuyer,
        identity_type: "buyer_key",
        identity_value: buyerKey,
        site_id: "jahknowspr_web",
        brand_id: "jahknowspr",
        client_id: customerId,
        last_seen_at: new Date().toISOString(),
        metadata: { source: "strategy_session_book" },
      },
      {
        canonical_buyer_key: canonicalBuyer,
        identity_type: "email",
        identity_value: emailNorm,
        site_id: "jahknowspr_web",
        brand_id: "jahknowspr",
        client_id: customerId,
        last_seen_at: new Date().toISOString(),
        metadata: { source: "strategy_session_book" },
      },
      {
        canonical_buyer_key: canonicalBuyer,
        identity_type: "customer_id",
        identity_value: customerId,
        site_id: "jahknowspr_web",
        brand_id: "jahknowspr",
        client_id: customerId,
        last_seen_at: new Date().toISOString(),
        metadata: { source: "strategy_session_book" },
      },
    ], { onConflict: "canonical_buyer_key,identity_type,identity_value" });

    const { data: buyerJourney, error: buyerJourneyError } = await supabase
      .from("buyer_journeys")
      .upsert({
        journey_key: journeyKey,
        site_id: "jahknowspr_web",
        brand_id: "jahknowspr",
        client_id: customerId,
        canonical_buyer_key: canonicalBuyer,
        buyer_key: buyerKey,
        lead_key: emailNorm,
        customer_id: customerId,
        audit_intake_id: auditIntakeId,
        strategy_session_id: meetingId,
        first_event_at: slotDate.toISOString(),
        last_event_at: slotDate.toISOString(),
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
        journey_status: "strategy_session_booked",
        latest_offer_id: "strategy_session",
        latest_campaign_id: campaignId,
        latest_lead_magnet_id: leadMagnetId,
        metadata: {
          source: "strategy_session_book",
          booking_kind: p.bookingKind ?? "full_program_sales",
        },
      }, { onConflict: "journey_key" })
      .select("id")
      .single();
    if (buyerJourneyError) throw buyerJourneyError;
    const buyerJourneyId = buyerJourney?.id as string;

    await supabase
      .from("meetings")
      .update({ buyer_journey_id: buyerJourneyId })
      .eq("id", meetingId);

    await supabase
      .from("free_audits")
      .update({ follow_up_status: "booked_strategy_session", strategy_session_id: meetingId })
      .or(`correlation_id.eq.${leadSource.correlation_id ?? emailNorm},lead_key.eq.${emailNorm}`);

    if (auditIntakeId) {
      await supabase
        .from("audit_intakes")
        .update({
          status: "booked_strategy_session",
          last_touch_at: new Date().toISOString(),
        })
        .eq("id", auditIntakeId);
    }

    if (payRow) {
      const { error: linkPayErr } = await supabase
        .from("payment_transactions")
        .update({ meeting_id: meetingId, buyer_key: buyerKey, buyer_journey_id: buyerJourneyId })
        .eq("id", payRow.id);
      if (linkPayErr) throw linkPayErr;
    }

    await Promise.allSettled([
      supabase
        .from("lead_magnet_interactions")
        .insert({
          lead_magnet_id: leadMagnetId,
          interaction_kind: "booking",
          interaction_status: "success",
          occurred_at: slotDate.toISOString(),
          site_id: "jahknowspr_web",
          brand_id: "jahknowspr",
          client_id: customerId,
          buyer_journey_id: buyerJourneyId,
          canonical_buyer_key: canonicalBuyer,
          buyer_key: buyerKey,
          lead_key: emailNorm,
          customer_id: customerId,
          audit_intake_id: auditIntakeId,
          strategy_session_id: meetingId,
          payment_transaction_id: payRow?.id ?? null,
          campaign_id: campaignId,
          adset_id: adsetId,
          creative_id: creativeId,
          audience_cluster_id: audienceClusterId,
          audience_pool_id: audiencePoolId,
          offer_id: "strategy_session",
          offer_stage: offerStage,
          revenue_value: complimentary ? 0 : 150,
          currency: "USD",
          metadata: {
            source: "strategy_session_book",
            booking_kind: p.bookingKind ?? "full_program_sales",
          },
        }),
      supabase
        .from("offer_presentations")
        .insert({
          presented_at: slotDate.toISOString(),
          site_id: "jahknowspr_web",
          brand_id: "jahknowspr",
          client_id: customerId,
          buyer_journey_id: buyerJourneyId,
          canonical_buyer_key: canonicalBuyer,
          buyer_key: buyerKey,
          lead_key: emailNorm,
          customer_id: customerId,
          offer_id: "strategy_session",
          offer_name: "Strategy Session",
          offer_type: "consultation",
          offer_stage: offerStage,
          lead_magnet_id: leadMagnetId,
          audit_intake_id: auditIntakeId,
          strategy_session_id: meetingId,
          campaign_id: campaignId,
          adset_id: adsetId,
          creative_id: creativeId,
          audience_cluster_id: audienceClusterId,
          audience_pool_id: audiencePoolId,
          presented_by: "system",
          metadata: {
            source: "strategy_session_book",
            booking_kind: p.bookingKind ?? "full_program_sales",
          },
        }),
      safeUpsertFunnelAttribution(supabase, {
        lead_key: emailNorm,
        lead_kind: "meeting",
        tenant_id: customerId,
        attribution_confidence: 0.75,
        multi_touch_weight: 0.55,
        buyer_key: buyerKey,
        lead_magnet_id: leadMagnetId,
        campaign_id: campaignId,
        adset_id: adsetId,
        creative_id: creativeId,
        offer_id: "strategy_session",
        offer_stage: offerStage,
        audience_cluster_id: audienceClusterId,
        audience_pool_id: audiencePoolId,
        ...leadSource,
        metadata: {
          ...leadSource.metadata,
          meeting_id: meetingId,
          buyer_journey_id: buyerJourneyId,
          audit_intake_id: auditIntakeId,
          booking_kind: p.bookingKind ?? "full_program_sales",
        },
      }),
      safeRecordOutcome(supabase, {
        tenant_id: customerId,
        lead_id: emailNorm,
        buyer_key: buyerKey,
        buyer_journey_id: buyerJourneyId,
        audit_intake_id: auditIntakeId,
        strategy_session_id: meetingId,
        lead_magnet_id: leadMagnetId,
        campaign_id: campaignId,
        adset_id: adsetId,
        creative_id: creativeId,
        offer_id: "strategy_session",
        offer_stage: offerStage,
        audience_cluster_id: audienceClusterId,
        audience_pool_id: audiencePoolId,
        subject_kind: "meeting",
        subject_id: meetingId,
        actor_kind: "client",
        action: "strategy_session_booked",
        strategy_origin: "human_defined",
        learning_mode: "validated_learning",
        intended_metric_type: "strategy_session_booking",
        actual_metric_type: "meeting_created",
        predicted_conversion_probability: 0.2,
        expected_baseline: 1,
        delta_value: 1,
        success_flag: true,
        revenue_impact: complimentary ? 0 : 150,
        outcome_verified: true,
        verification_source: "system",
        verification_confidence_component: 0.95,
        causal_method: "direct_attribution",
        causal_confidence_component: 0.8,
        evidence_strength_component: 0.45,
        status: "success",
        business_goal: "booked_strategy_session",
        correlation_id: leadSource.correlation_id ?? emailNorm,
        strategy_id: "system:strategy-session-funnel",
        messaging_angle: leadSource.messaging_angle ?? "strategy_session_booking",
        hook: leadSource.hook ?? p.sessionGoal ?? "book_strategy_session",
        projection_version: "lls-projection-v1:strategy-session",
        intended_outcome: {
          service_name: "Strategy Session",
          session_goal: p.sessionGoal,
          booking_kind: p.bookingKind ?? "full_program_sales",
        },
        actual_outcome: {
          meeting_id: meetingId,
          complimentary,
          payment_transaction_id: payRow?.id ?? null,
        },
        metadata: {
          leadSource,
          employee_reference_code: employeeRefNormalized,
          audit_intake_id: auditIntakeId,
          buyer_journey_id: buyerJourneyId,
        },
      }),
    ]);

    if (payRow) {
      await notifyAdminsStrategySessionPaidBooking(supabase, {
        id: meetingId,
        full_name: p.fullName,
        business_name: p.businessName,
        email: emailNorm,
        phone: p.phone,
        meeting_date: slotDate.toISOString(),
        timezone: p.timezone,
        session_type: p.sessionType,
        session_goal: p.sessionGoal,
        host_user_id: hostUserId,
      });
    }

    /** Guest confirmation emails are sent from strategy-session-admin-confirm after team approval (Leads). */
    return new Response(
      JSON.stringify({
        ok: true,
        meetingId,
        auditIntakeId: auditIntakeId ?? null,
        buyerKey,
        buyerJourneyId,
        confirmationStatus: "pending_approval",
        message:
          "Request received. Our team will confirm your time and email you shortly.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unexpected error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
