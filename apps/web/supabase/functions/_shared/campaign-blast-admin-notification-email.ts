export type CampaignBlastAdminNotificationParams = {
  campaignLabel: string;
  subject: string;
  sent: number;
  failed: number;
  total: number;
  trigger: "blog_blast" | "custom_blast" | "scheduled_campaign" | "automated_due";
  sentByName: string;
  sentByEmail: string;
  sentAtIso: string;
  timezoneLabel: string;
  dashboardUrl: string;
  nextSendLabel?: string | null;
};

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatSentAt(iso: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function buildCampaignBlastAdminNotificationHtml(
  params: CampaignBlastAdminNotificationParams,
): string {
  const sentAt = formatSentAt(params.sentAtIso, params.timezoneLabel);
  const triggerLabel = {
    blog_blast: "Blog blast (The Brief)",
    custom_blast: "Custom campaign blast",
    scheduled_campaign: "Scheduled campaign (manual send)",
    automated_due: "Scheduled campaign (automatic)",
  }[params.trigger];

  const nextLine = params.nextSendLabel
    ? `<p style="margin: 0 0 8px;"><strong>Next scheduled send:</strong> ${escapeHtml(params.nextSendLabel)}</p>`
    : "";

  return `
<div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; line-height: 1.6; color: #0f172a;">
  <h2 style="margin-bottom: 12px;">Subscriber campaign sent</h2>
  <p style="color: #475569;">A campaign email blast finished on JahKnowsPR.</p>
  <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 8px;"><strong>Campaign:</strong> ${escapeHtml(params.campaignLabel)}</p>
    <p style="margin: 0 0 8px;"><strong>Subject:</strong> ${escapeHtml(params.subject)}</p>
    <p style="margin: 0 0 8px;"><strong>Type:</strong> ${escapeHtml(triggerLabel)}</p>
    <p style="margin: 0 0 8px;"><strong>Delivered:</strong> ${params.sent} of ${params.total} subscribers${params.failed > 0 ? ` (${params.failed} failed)` : ""}</p>
    <p style="margin: 0 0 8px;"><strong>Sent at:</strong> ${escapeHtml(sentAt)}</p>
    <p style="margin: 0 0 8px;"><strong>Triggered by:</strong> ${escapeHtml(params.sentByName)} (${escapeHtml(params.sentByEmail)})</p>
    ${nextLine}
  </div>
  <p><a href="${params.dashboardUrl}" style="color: #0f172a; font-weight: 700;">Open Subscribers dashboard</a></p>
</div>`.trim();
}

export function buildCampaignBlastAdminNotificationSubject(campaignLabel: string): string {
  return `Campaign sent: ${campaignLabel}`;
}
