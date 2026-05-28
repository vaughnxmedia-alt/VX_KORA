/**
 * Notify admins when a paid Strategy Session booking is received (pending approval in Leads).
 */
import { Resend } from "npm:resend@2.0.0";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logOutboundEmail } from "./outbound-email-log.ts";

const FROM_NAME = "Jah Jah";
const DEFAULT_FROM_EMAIL = "welcome@jahknowspr.com";
const DEFAULT_OPS_EMAIL = "hello@jahknowspr.com";

function normalizeEmail(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  return trimmed.includes("@") ? trimmed : null;
}

async function fetchAdminEmails(supabase: SupabaseClient): Promise<string[]> {
  const { data: roleRows, error } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");
  if (error || !(roleRows ?? []).length) return [];

  const emails = await Promise.all(
    (roleRows ?? []).map(async (row) => {
      const userId = String((row as { user_id?: string }).user_id ?? "").trim();
      if (!userId) return null;
      try {
        const { data } = await supabase.auth.admin.getUserById(userId);
        return normalizeEmail(data.user?.email ?? "");
      } catch {
        return null;
      }
    }),
  );
  return Array.from(new Set(emails.filter((item): item is string => Boolean(item))));
}

function resolveRecipients(adminEmails: string[]): string[] {
  const envRaw =
    Deno.env.get("STRATEGY_SESSION_OPS_EMAIL")?.trim() ||
    Deno.env.get("AUDIT_NOTIFICATION_EMAILS")?.trim() ||
    DEFAULT_OPS_EMAIL;
  const envRecipients = envRaw
    .split(",")
    .map((item) => normalizeEmail(item))
    .filter((item): item is string => Boolean(item));
  return Array.from(new Set([...envRecipients, ...adminEmails]));
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type StrategySessionPaidMeeting = {
  id: string;
  full_name?: string | null;
  business_name?: string | null;
  email?: string | null;
  phone?: string | null;
  meeting_date: string;
  timezone?: string | null;
  session_type?: string | null;
  session_goal?: string | null;
  host_user_id?: string | null;
};

export async function notifyAdminsStrategySessionPaidBooking(
  supabase: SupabaseClient,
  meeting: StrategySessionPaidMeeting,
): Promise<void> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY")?.trim();
  if (!resendApiKey) {
    console.warn("strategy-session-admin-notify: RESEND_API_KEY missing");
    return;
  }

  const adminEmails = await fetchAdminEmails(supabase);
  const recipients = resolveRecipients(adminEmails);
  if (!recipients.length) {
    console.warn("strategy-session-admin-notify: no recipients configured");
    return;
  }

  const publicSiteUrl = (Deno.env.get("PUBLIC_SITE_URL") || "https://www.jahknowspr.com").replace(/\/$/, "");
  const fromEmail = Deno.env.get("STRATEGY_SESSION_FROM_EMAIL")?.trim() || DEFAULT_FROM_EMAIL;
  const dashboardUrl = `${publicSiteUrl}/dashboard/leads`;

  const fullName = String(meeting.full_name || "Guest").trim();
  const businessName = String(meeting.business_name || "—").trim();
  const guestEmail = String(meeting.email || "").trim().toLowerCase();
  const phone = String(meeting.phone || "—").trim();
  const tz = String(meeting.timezone || "America/New_York");
  const slotDate = new Date(meeting.meeting_date);
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

  let hostDisplayName = "Assigned strategist";
  if (meeting.host_user_id) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", meeting.host_user_id)
      .maybeSingle();
    if (prof?.full_name) hostDisplayName = String(prof.full_name);
  }

  const sessionType = meeting.session_type === "in_person" ? "In person" : "Zoom";
  const subject = `Paid Strategy Session — ${businessName} ($150)`;
  const html = `
<div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; line-height: 1.6; color: #0f172a;">
  <h2 style="margin-bottom: 8px;">New paid Strategy Session booking</h2>
  <p style="color: #475569; margin-top: 0;">Payment received. Confirm the time in Leads and send the client confirmation email.</p>
  <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 8px;"><strong>${escapeHtml(fullName)}</strong> — ${escapeHtml(businessName)}</p>
    <p style="margin: 0 0 8px;">${escapeHtml(guestEmail)} · ${escapeHtml(phone)}</p>
    <p style="margin: 0 0 8px;"><strong>When:</strong> ${escapeHtml(dateFmt)} at ${escapeHtml(timeFmt)} (${escapeHtml(tz)})</p>
    <p style="margin: 0 0 8px;"><strong>Strategist:</strong> ${escapeHtml(hostDisplayName)}</p>
    <p style="margin: 0 0 8px;"><strong>Format:</strong> ${escapeHtml(sessionType)}</p>
    ${meeting.session_goal ? `<p style="margin: 0;"><strong>Goal:</strong> ${escapeHtml(String(meeting.session_goal).slice(0, 500))}</p>` : ""}
  </div>
  <p style="font-size: 13px; color: #64748b;">Meeting ID: <code>${escapeHtml(meeting.id)}</code></p>
  <p><a href="${dashboardUrl}" style="display:inline-block;background:#0A1A35;color:#fff;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:600;">Open Leads — confirm booking</a></p>
</div>`.trim();

  const text = [
    "New paid Strategy Session booking ($150)",
    "",
    `${fullName} — ${businessName}`,
    `${guestEmail} · ${phone}`,
    `When: ${dateFmt} at ${timeFmt} (${tz})`,
    `Strategist: ${hostDisplayName}`,
    `Format: ${sessionType}`,
    "",
    `Confirm in dashboard: ${dashboardUrl}`,
    `Meeting ID: ${meeting.id}`,
  ].join("\n");

  try {
    const resend = new Resend(resendApiKey);
    const result = await resend.emails.send({
      from: `${FROM_NAME} <${fromEmail}>`,
      to: recipients,
      subject,
      html,
      text,
    });
    await logOutboundEmail(supabase, {
      messageType: "strategy_session_paid_admin_alert",
      fromEmail,
      toEmail: recipients.join(","),
      subject,
      status: "sent",
      providerMessageId: (result as { data?: { id?: string } })?.data?.id ?? null,
      relatedTable: "meetings",
      relatedId: meeting.id,
      generatedBy: "system",
      bodyHtml: html,
      bodyText: text,
    });
  } catch (e) {
    console.error("strategy-session-admin-notify:", e);
    await logOutboundEmail(supabase, {
      messageType: "strategy_session_paid_admin_alert",
      fromEmail,
      toEmail: recipients.join(","),
      subject,
      status: "failed",
      errorMessage: e instanceof Error ? e.message : "Failed to send admin alert",
      relatedTable: "meetings",
      relatedId: meeting.id,
      generatedBy: "system",
      bodyHtml: html,
      bodyText: text,
    });
  }
}
