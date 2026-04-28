/**
 * Admin-only: confirm a pending Strategy Session booking, send guest + ops emails, update meeting row.
 * Requires Authorization: Bearer <user JWT>. Caller must have user_roles.role = admin.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { z } from "https://deno.land/x/zod/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { buildStrategySessionConfirmationHtml } from "../_shared/strategy-session-confirmation-email.ts";
import { buildStrategySessionInternalNotificationHtml } from "../_shared/strategy-session-internal-notification-email.ts";
import { logOutboundEmail } from "../_shared/outbound-email-log.ts";
import { safeRecordOutcome } from "../_shared/lls.ts";

const bodySchema = z.object({
  meetingId: z.string().uuid(),
  /** Optional HTML override from dashboard compose preview (admin JWT only). */
  guestHtml: z.string().max(800_000).optional(),
  guestSubject: z.string().max(998).optional(),
  generatedBy: z.enum(["human", "gemini", "system"]).optional(),
});

const FROM_NAME = "Jah Jah";
const DEFAULT_FROM_EMAIL = "welcome@jahknowspr.com";
const DEFAULT_OPS_EMAIL = "hello@jahknowspr.com";

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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const PUBLIC_SITE_URL = (Deno.env.get("PUBLIC_SITE_URL") || "https://jahknowspr.com").replace(
    /\/$/,
    "",
  );
  const FROM_EMAIL = Deno.env.get("STRATEGY_SESSION_FROM_EMAIL") || DEFAULT_FROM_EMAIL;
  const OPS_EMAIL = (Deno.env.get("STRATEGY_SESSION_OPS_EMAIL") || DEFAULT_OPS_EMAIL).trim().toLowerCase();

  if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Server configuration incomplete" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: adminRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!adminRow) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const raw = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Invalid input", details: parsed.error.flatten() }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const { meetingId, guestHtml: guestHtmlRaw, guestSubject: guestSubjectRaw, generatedBy } = parsed.data;

  const { data: meeting, error: mErr } = await supabase
    .from("meetings")
    .select(
      "id, customer_id, full_name, business_name, email, phone, meeting_date, session_type, timezone, service_name, booking_status, confirmation_status, host_user_id",
    )
    .eq("id", meetingId)
    .maybeSingle();

  if (mErr) throw mErr;
  if (!meeting || meeting.service_name !== "Strategy Session") {
    return new Response(JSON.stringify({ error: "Meeting not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (meeting.booking_status !== "pending" || meeting.confirmation_status !== "pending") {
    return new Response(
      JSON.stringify({
        error: "This booking is not awaiting confirmation, or was already processed.",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const slotDate = new Date(meeting.meeting_date as string);
  const tz = String(meeting.timezone || "America/New_York");
  const dateFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(slotDate);
  const timeFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  }).format(slotDate);

  let hostDisplayName = "Your strategist";
  if (meeting.host_user_id) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", meeting.host_user_id)
      .maybeSingle();
    if (prof?.full_name) hostDisplayName = prof.full_name as string;
  }

  const sessionType = meeting.session_type === "in_person" ? "in_person" : "zoom";
  const guestEmail = String(meeting.email || "").trim().toLowerCase();
  if (!guestEmail) {
    return new Response(JSON.stringify({ error: "Meeting has no guest email" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const fullName = String(meeting.full_name || "");
  const businessName = String(meeting.business_name || "");
  const phone = String(meeting.phone || "");

  const defaultGuestHtml = buildStrategySessionConfirmationHtml({
    fullName,
    businessName,
    sessionType,
    meetingDateFormatted: dateFmt,
    meetingTimeFormatted: timeFmt,
    timezoneLabel: tz,
    hostDisplayName,
    questionnaireUrl: `${PUBLIC_SITE_URL}/strategy-session`,
    publicSiteUrl: PUBLIC_SITE_URL,
  });

  const trimmedOverride = typeof guestHtmlRaw === "string" ? guestHtmlRaw.trim() : "";
  const htmlGuest = trimmedOverride.length > 0 ? trimmedOverride : defaultGuestHtml;

  const guestSubject =
    typeof guestSubjectRaw === "string" && guestSubjectRaw.trim().length > 0
      ? guestSubjectRaw.trim()
      : "Confirmed — Your Strategy Session ($150)";

  const dashboardUrl = `${PUBLIC_SITE_URL}/dashboard/leads`;
  const htmlOps = buildStrategySessionInternalNotificationHtml({
    fullName,
    businessName,
    email: guestEmail,
    phone,
    meetingDateFormatted: dateFmt,
    meetingTimeFormatted: timeFmt,
    timezoneLabel: tz,
    sessionType,
    hostDisplayName,
    meetingId,
    dashboardUrl,
  });
  const opsSubject = `Strategy Session confirmed — ${businessName}`;
  const generatedByValue = generatedBy ?? "human";
  const approvedByUserId = userData.user.id;

  const resend = new Resend(RESEND_API_KEY);
  try {
    const guestSendResult = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: guestEmail,
      subject: guestSubject,
      html: htmlGuest,
    });
    await logOutboundEmail(supabase, {
      messageType: "lead_confirmation",
      fromEmail: FROM_EMAIL,
      toEmail: guestEmail,
      subject: guestSubject,
      status: "sent",
      providerMessageId: (guestSendResult as { data?: { id?: string } })?.data?.id ?? null,
      relatedTable: "meetings",
      relatedId: meetingId,
      customerId: (meeting.customer_id as string | null) ?? null,
      generatedBy: generatedByValue,
      approvedByUserId,
      bodyHtml: htmlGuest,
      bodyText: toPlainText(htmlGuest),
    });

    const opsSendResult = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: OPS_EMAIL,
      subject: opsSubject,
      html: htmlOps,
    });
    await logOutboundEmail(supabase, {
      messageType: "lead_ops_notification",
      fromEmail: FROM_EMAIL,
      toEmail: OPS_EMAIL,
      subject: opsSubject,
      status: "sent",
      providerMessageId: (opsSendResult as { data?: { id?: string } })?.data?.id ?? null,
      relatedTable: "meetings",
      relatedId: meetingId,
      customerId: (meeting.customer_id as string | null) ?? null,
      generatedBy: "system",
      approvedByUserId,
      bodyHtml: htmlOps,
      bodyText: toPlainText(htmlOps),
    });

    await supabase
      .from("meetings")
      .update({
        admin_confirmed_at: new Date().toISOString(),
        booking_status: "confirmed",
        confirmation_status: "sent",
      })
      .eq("id", meetingId);

    await Promise.allSettled([
      safeRecordOutcome(supabase, {
        tenant_id: (meeting.customer_id as string | null) ?? null,
        lead_id: guestEmail,
        subject_kind: "meeting",
        subject_id: meetingId,
        actor_kind: "employee",
        actor_id: approvedByUserId,
        action: "strategy_session_confirmed",
        strategy_origin: "human_defined",
        learning_mode: "validated_learning",
        intended_metric_type: "strategy_session_show_up",
        actual_metric_type: "confirmation_sent",
        delta_value: 1,
        success_flag: true,
        revenue_impact: 0,
        outcome_verified: true,
        verification_source: "system",
        verification_confidence_component: 0.95,
        causal_method: "direct_attribution",
        causal_confidence_component: 0.75,
        evidence_strength_component: 0.5,
        status: "success",
        business_goal: "booked_strategy_session",
        correlation_id: guestEmail,
        strategy_id: "system:strategy-session-confirmation",
        messaging_angle: "strategy_session_confirmation",
        hook: "employee_confirmation",
        projection_version: "lls-projection-v1:strategy-session",
        intended_outcome: { confirmation_status: "sent" },
        actual_outcome: { guest_email_sent: true, ops_email_sent: true },
        metadata: { generated_by: generatedByValue, host_user_id: meeting.host_user_id },
      }),
    ]);

    return new Response(
      JSON.stringify({ ok: true, meetingId, confirmationStatus: "sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("strategy-session-admin-confirm email error:", e);
    await logOutboundEmail(supabase, {
      messageType: "lead_confirmation",
      fromEmail: FROM_EMAIL,
      toEmail: guestEmail,
      subject: guestSubject,
      status: "failed",
      errorMessage: e instanceof Error ? e.message : "Failed to send confirmation emails",
      relatedTable: "meetings",
      relatedId: meetingId,
      customerId: (meeting.customer_id as string | null) ?? null,
      generatedBy: generatedByValue,
      approvedByUserId,
      bodyHtml: htmlGuest,
      bodyText: toPlainText(htmlGuest),
    });
    await supabase.from("meetings").update({ confirmation_status: "failed" }).eq("id", meetingId);
    await Promise.allSettled([
      safeRecordOutcome(supabase, {
        tenant_id: (meeting.customer_id as string | null) ?? null,
        lead_id: guestEmail,
        subject_kind: "meeting",
        subject_id: meetingId,
        actor_kind: "employee",
        actor_id: approvedByUserId,
        action: "strategy_session_confirmation_failed",
        strategy_origin: "human_defined",
        learning_mode: "validated_learning",
        intended_metric_type: "strategy_session_show_up",
        actual_metric_type: "confirmation_failed",
        delta_value: -1,
        success_flag: false,
        revenue_impact: 0,
        failure_type: "execution_failure",
        outcome_verified: true,
        verification_source: "system",
        verification_confidence_component: 0.9,
        causal_method: "direct_attribution",
        causal_confidence_component: 0.8,
        evidence_strength_component: 0.45,
        status: "failed",
        business_goal: "execution_compliance",
        correlation_id: guestEmail,
        strategy_id: "system:strategy-session-confirmation",
        messaging_angle: "strategy_session_confirmation",
        hook: "employee_confirmation",
        projection_version: "lls-projection-v1:strategy-session",
        intended_outcome: { confirmation_status: "sent" },
        actual_outcome: { error: e instanceof Error ? e.message : "Failed to send confirmation emails" },
        metadata: { generated_by: generatedByValue },
      }),
    ]);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Failed to send confirmation emails",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function toPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
