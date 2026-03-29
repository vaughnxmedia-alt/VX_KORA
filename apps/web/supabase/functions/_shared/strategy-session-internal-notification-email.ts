/**
 * Internal copy for ops when a Strategy Session is confirmed (after admin approval).
 */
export function buildStrategySessionInternalNotificationHtml(params: {
  fullName: string;
  businessName: string;
  email: string;
  phone: string;
  meetingDateFormatted: string;
  meetingTimeFormatted: string;
  timezoneLabel: string;
  sessionType: "zoom" | "in_person";
  hostDisplayName: string;
  meetingId: string;
  dashboardUrl: string;
}): string {
  const {
    fullName,
    businessName,
    email,
    phone,
    meetingDateFormatted,
    meetingTimeFormatted,
    timezoneLabel,
    sessionType,
    hostDisplayName,
    meetingId,
    dashboardUrl,
  } = params;

  const typeLine =
    sessionType === "zoom"
      ? "Zoom — send the client a link before the session."
      : `In person — confirm location with the client if needed.`;

  return `
<div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; line-height: 1.6; color: #0f172a;">
  <h2 style="margin-bottom: 12px;">Strategy Session confirmed</h2>
  <p style="color: #475569;">You approved this booking. The client has been emailed a confirmation.</p>
  <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 8px;"><strong>${escapeHtml(fullName)}</strong> — ${escapeHtml(businessName)}</p>
    <p style="margin: 0 0 8px;">${escapeHtml(email)} · ${escapeHtml(phone)}</p>
    <p style="margin: 0 0 8px;"><strong>When:</strong> ${escapeHtml(meetingDateFormatted)} at ${escapeHtml(meetingTimeFormatted)} (${escapeHtml(timezoneLabel)})</p>
    <p style="margin: 0 0 8px;"><strong>Strategist:</strong> ${escapeHtml(hostDisplayName)}</p>
    <p style="margin: 0;"><strong>Format:</strong> ${typeLine}</p>
  </div>
  <p style="font-size: 13px; color: #64748b;">Meeting ID: <code>${escapeHtml(meetingId)}</code></p>
  <p><a href="${dashboardUrl}" style="color: #0f172a;">Open dashboard (Leads / Meetings)</a></p>
</div>
`.trim();
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
