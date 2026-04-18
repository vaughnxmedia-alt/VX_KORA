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
          client_status: "strategy_session_pending",
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      customerId = inserted!.id;
    }

    const meetingPayload = {
      customer_id: customerId,
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

    if (payRow) {
      const { error: linkPayErr } = await supabase
        .from("payment_transactions")
        .update({ meeting_id: meetingId })
        .eq("id", payRow.id);
      if (linkPayErr) throw linkPayErr;
    }

    /** Confirmation emails are sent from strategy-session-admin-confirm after team approval (Leads). */
    return new Response(
      JSON.stringify({
        ok: true,
        meetingId,
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
