import { Resend } from "npm:resend@2.0.0";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { googleCalendarLink } from "./workshop-payments.ts";
import { logOutboundEmail } from "./outbound-email-log.ts";

const FROM_NAME = "JahKnowsPR";
const DEFAULT_FROM = "welcome@jahknowspr.com";

type Claim = {
  claimed?: boolean;
  registration_id?: string;
  confirmation_token?: string;
  full_name?: string;
  email?: string;
  title?: string;
  starts_at?: string;
  timezone?: string;
  duration_minutes?: number;
  preparation_notes?: string | null;
  cancellation_terms?: string | null;
  amount_cents?: number;
  currency?: string;
  zoom_url?: string | null;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character] || character
  ));
}

function formatWhen(startsAt: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(startsAt));
}

function money(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export async function sendWorkshopConfirmationEmail(
  supabase: SupabaseClient,
  claim: Claim,
): Promise<{ sent: boolean; error?: string }> {
  if (!claim.claimed || !claim.registration_id || !claim.email || !claim.starts_at || !claim.timezone) {
    return { sent: false, error: "Confirmation email was not claimed." };
  }
  const apiKey = Deno.env.get("RESEND_API_KEY")?.trim();
  const fromEmail = (Deno.env.get("WORKSHOP_FROM_EMAIL") || DEFAULT_FROM).trim();
  const site = (Deno.env.get("PUBLIC_SITE_URL") || "https://www.jahknowspr.com").replace(/\/$/, "");
  if (!apiKey) {
    await supabase.rpc("finish_workshop_confirmation_email", {
      p_registration_id: claim.registration_id,
      p_result: "failed",
      p_error: "Email service is not configured.",
    });
    return { sent: false, error: "Email service is not configured." };
  }

  const when = formatWhen(claim.starts_at, claim.timezone);
  const title = claim.title || "Make Your Business Make Sense";
  const safeTitle = escapeHtml(title);
  const safeWhen = escapeHtml(when);
  const safeName = escapeHtml(claim.full_name || "");
  const preparation = claim.preparation_notes?.trim()
    || "Join live for the full two hours and bring a notebook.";
  const safePreparation = escapeHtml(preparation);
  const safeTerms = escapeHtml(claim.cancellation_terms?.trim() || "");
  const safeZoom = escapeHtml(claim.zoom_url || "");
  const calendar = googleCalendarLink({
    title,
    startsAtIso: claim.starts_at,
    durationMinutes: claim.duration_minutes || 120,
    timezone: claim.timezone,
    details: `${preparation} Zoom access is in your JahKnowsPR confirmation email, not in this calendar event.`,
  });
  const page = `${site}/experiences/make-your-business-make-sense/confirmation?token=${encodeURIComponent(claim.confirmation_token || "")}`;
  const subject = `You're registered: ${title}`;
  const text = [
    `You're registered for ${title}.`,
    ``,
    `When: ${when}`,
    `Duration: ${claim.duration_minutes || 120} minutes`,
    `Host: JahKnowsPR`,
    `Amount paid: ${money(claim.amount_cents || 0, claim.currency || "USD")}`,
    ``,
    `Zoom: ${claim.zoom_url || "The Zoom link will be sent by JahKnowsPR."}`,
    ``,
    `Preparation: ${preparation}`,
    ``,
    `This is a live workshop. Registration does not include a recording or replay.`,
    `The Zoom link is only in this email. Forwarding this email shares access.`,
    ``,
    claim.cancellation_terms ? `Cancellation: ${claim.cancellation_terms}` : "",
    ``,
    `Add to Google Calendar: ${calendar}`,
    `Registration status: ${page}`,
  ].filter((line) => line !== "").join("\n");

  const html = `
    <div style="font-family:Georgia,serif;color:#0A1A35;line-height:1.5">
      <p style="font-size:22px;margin:0 0 12px">You're registered${safeName ? `, ${safeName}` : ""}.</p>
      <p style="margin:0 0 16px">${safeTitle} is confirmed for <strong>${safeWhen}</strong>.</p>
      <p style="margin:0 0 8px">Host: JahKnowsPR<br/>Duration: ${claim.duration_minutes || 120} minutes<br/>Amount paid: ${money(claim.amount_cents || 0, claim.currency || "USD")}</p>
      <p style="margin:16px 0 8px"><strong>Zoom</strong><br/>${safeZoom ? `<a href="${safeZoom}">${safeZoom}</a>` : "The Zoom link will be sent by JahKnowsPR."}</p>
      <p style="margin:0 0 16px">This link is only in this email. Forwarding the email shares access. This live workshop does not include a recording or replay.</p>
      <p style="margin:0 0 16px"><strong>Prepare</strong><br/>${safePreparation}</p>
      ${safeTerms ? `<p style="margin:0 0 16px"><strong>Cancellation</strong><br/>${safeTerms}</p>` : ""}
      <p style="margin:0 0 8px"><a href="${escapeHtml(calendar)}">Add to Google Calendar</a></p>
      <p style="margin:0"><a href="${escapeHtml(page)}">View registration status</a></p>
    </div>
  `;

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: `${FROM_NAME} <${fromEmail}>`,
      to: claim.email,
      subject,
      html,
      text,
    });
    const providerId = result.data?.id ?? null;
    const failed = Boolean(result.error);
    await logOutboundEmail(supabase, {
      messageType: "workshop_confirmation",
      fromEmail,
      toEmail: claim.email,
      subject,
      status: failed ? "failed" : "sent",
      providerMessageId: providerId,
      errorMessage: failed ? JSON.stringify(result.error) : null,
      relatedTable: "workshop_registrations",
      relatedId: claim.registration_id,
      bodyHtml: html,
      bodyText: text,
    });
    await supabase.rpc("finish_workshop_confirmation_email", {
      p_registration_id: claim.registration_id,
      p_result: failed ? "failed" : "sent",
      p_error: failed ? "The email provider rejected the message." : null,
    });
    return failed ? { sent: false, error: "The email provider rejected the message." } : { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email could not be sent.";
    await supabase.rpc("finish_workshop_confirmation_email", {
      p_registration_id: claim.registration_id,
      p_result: "failed",
      p_error: message,
    });
    return { sent: false, error: message };
  }
}
