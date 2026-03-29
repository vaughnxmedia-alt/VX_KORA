/**
 * Strategy Session booking confirmation — HTML email body.
 * Edit copy here; keep in sync with customer-facing expectations ($150, Zoom vs in-person).
 */
export function buildStrategySessionConfirmationHtml(params: {
  fullName: string;
  businessName: string;
  sessionType: "zoom" | "in_person";
  meetingDateFormatted: string;
  meetingTimeFormatted: string;
  timezoneLabel: string;
  /** Strategist / host display name */
  hostDisplayName: string;
  questionnaireUrl: string;
  publicSiteUrl: string;
}): string {
  const {
    fullName,
    businessName,
    sessionType,
    meetingDateFormatted,
    meetingTimeFormatted,
    timezoneLabel,
    hostDisplayName,
    questionnaireUrl,
    publicSiteUrl,
  } = params;

  const sessionDetail =
    sessionType === "zoom"
      ? `<p><strong>Session type:</strong> Zoom — a calendar invite or Zoom link will be sent to this email before your session.</p>`
      : `<p><strong>Session type:</strong> In person — we’ll confirm the exact location and arrival details in a follow-up if needed.</p>`;

  return `
<div style="font-family: Georgia, 'Times New Roman', serif; max-width: 600px; margin: 0 auto; padding: 24px; line-height: 1.65; color: #1a1a1a;">
  <h2 style="color: #0f172a; margin-bottom: 12px;">Your Strategy Session is confirmed</h2>
  <p>Hi ${escapeHtml(fullName)},</p>
  <p>Thank you for booking a <strong>paid Strategy Session ($150)</strong> with JahKnowsPR / KORA for <strong>${escapeHtml(businessName)}</strong>. This session is designed to qualify fit, capture your business context, and give you a clear path forward — before any backend software access, Telegram bot, or premium retainers.</p>

  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <p style="margin: 0 0 8px;"><strong>Strategist:</strong> ${escapeHtml(hostDisplayName)}</p>
    <p style="margin: 0 0 8px;"><strong>Date:</strong> ${escapeHtml(meetingDateFormatted)}</p>
    <p style="margin: 0 0 8px;"><strong>Time:</strong> ${escapeHtml(meetingTimeFormatted)}</p>
    <p style="margin: 0 0 8px;"><strong>Timezone:</strong> ${escapeHtml(timezoneLabel)}</p>
    ${sessionDetail}
  </div>

  <p><strong>Next steps</strong></p>
  <ul style="padding-left: 20px;">
    <li>Keep this email for your records — your <strong>$150 Strategy Session</strong> is reserved for the time above.</li>
    <li>You can revisit or share your intake context anytime: <a href="${questionnaireUrl}">${questionnaireUrl}</a></li>
    <li>We’ll follow up with any logistics (Zoom link or in-person details) as we get closer to the date.</li>
  </ul>

  <p style="margin-top: 24px;">If you need to reschedule, reply to this email and we’ll help you find a new time.</p>

  <p style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #64748b; font-size: 13px;">
    <a href="${publicSiteUrl}" style="color: #0f172a;">${publicSiteUrl.replace(/^https?:\/\//, "")}</a>
  </p>
</div>
`.trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
