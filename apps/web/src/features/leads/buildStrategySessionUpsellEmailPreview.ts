export type StrategySessionUpsellEmailPreview = {
  subject: string;
  previewLine: string;
  bodyText: string;
  bodyHtml: string;
};

type BuildOptions = {
  strategySessionUrl: string;
  senderName?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildStrategySessionUpsellEmailPreview({
  strategySessionUrl,
  senderName = "Jah",
}: BuildOptions): StrategySessionUpsellEmailPreview {
  const subject = "Next step: book your $150 Strategy Session";
  const previewLine = "Turn the diagnosis into a clear next-step plan before you build, post, or spend more.";
  const bodyText = [
    "Hi [First Name],",
    "",
    "Based on what you shared, the best next step is a paid Strategy Session.",
    "",
    "This is a focused working session where we look at your brand, offer, audience, and online presence, then map what should happen next. It is built for people who do not just want another opinion, they want a decision-making path.",
    "",
    "In the session we will:",
    "- identify what is blocking clarity, trust, or conversion",
    "- review the public signals your audience is seeing",
    "- decide what needs to be fixed first",
    "- outline the next move before a campaign, content push, production plan, or KORA/backend work",
    "",
    "The Strategy Session is $150. You can choose your time and complete payment here:",
    strategySessionUrl,
    "",
    "After checkout, your request stays pending until our team confirms the time. You will receive an email with your pending details, then a final confirmation once the slot is approved.",
    "",
    "If we already spoke in person or by phone, still use this link so the session is reserved and tied to your intake.",
    "",
    `- ${senderName}`,
  ].join("\n");

  const bodyHtml = `
<div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 640px; margin: 0 auto; padding: 28px; line-height: 1.65; color: #0A1A35;">
  <p style="margin:0 0 16px;">Hi [First Name],</p>
  <p style="margin:0 0 16px;">Based on what you shared, the best next step is a <strong>paid Strategy Session</strong>.</p>
  <p style="margin:0 0 16px;">This is a focused working session where we look at your brand, offer, audience, and online presence, then map what should happen next. It is built for people who do not just want another opinion, they want a decision-making path.</p>
  <div style="margin:22px 0;padding:18px;border-left:4px solid #C59B3C;background:#F7F3EA;border-radius:0 16px 16px 0;">
    <p style="margin:0 0 10px;font-weight:700;">In the session we will:</p>
    <ul style="margin:0;padding-left:20px;">
      <li>identify what is blocking clarity, trust, or conversion</li>
      <li>review the public signals your audience is seeing</li>
      <li>decide what needs to be fixed first</li>
      <li>outline the next move before a campaign, content push, production plan, or KORA/backend work</li>
    </ul>
  </div>
  <p style="margin:0 0 16px;">The Strategy Session is <strong>$150</strong>. You can choose your time and complete payment here:</p>
  <p style="margin:0 0 20px;"><a href="${escapeHtml(strategySessionUrl)}" style="display:inline-block;background:#0A1A35;color:#fff;padding:13px 20px;border-radius:999px;text-decoration:none;font-weight:700;">Book the Strategy Session</a></p>
  <p style="margin:0 0 16px;">After checkout, your request stays pending until our team confirms the time. You will receive an email with your pending details, then a final confirmation once the slot is approved.</p>
  <p style="margin:0 0 24px;">If we already spoke in person or by phone, still use this link so the session is reserved and tied to your intake.</p>
  <p style="margin:0;">- ${escapeHtml(senderName)}</p>
</div>`.trim();

  return { subject, previewLine, bodyText, bodyHtml };
}
