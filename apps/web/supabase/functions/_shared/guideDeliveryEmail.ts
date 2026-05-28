const PUBLIC_SITE_URL = (Deno.env.get("PUBLIC_SITE_URL")?.trim() || "https://www.jahknowspr.com").replace(/\/$/, "");
export const GUIDE_HUB_PATH = "/the-brief/before-you-build-the-brand-starter-guide";
export const GUIDE_HUB_TITLE = "Before You Build the Brand";
export const GUIDE_DELIVERY_HUB_URL = `${PUBLIC_SITE_URL}${GUIDE_HUB_PATH}`;
export const GUIDE_DELIVERY_EMAIL_SUBJECT = "Before You Build the Brand — your next step";

export type GuideDeliveryEmailParams = {
  contactName?: string | null;
  businessName?: string | null;
};

export function buildGuideDeliveryEmailHtml({ contactName, businessName }: GuideDeliveryEmailParams): string {
  const greeting = (contactName ?? "").trim() || "there";
  const brand = (businessName ?? "").trim() || "your brand";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <base target="_blank" href="${GUIDE_DELIVERY_HUB_URL}" />
  <title>${GUIDE_DELIVERY_EMAIL_SUBJECT}</title>
</head>
  <body style="margin:0;background:#F7F3EA;padding:28px 12px;font-family:Arial,sans-serif;color:#0A1A35;line-height:1.6;">
    <div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #E8DFC8;border-radius:24px;overflow:hidden;">
      <div style="height:8px;background:#0A1A35;"></div>
      <div style="padding:34px 32px 28px;">
        <p style="margin:0 0 14px;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#8C6C27;font-weight:700;">JahKnowsPR Firm / Brand Foundation</p>
        <h1 style="font-family:Georgia,serif;margin:0 0 18px;font-size:34px;line-height:1.1;color:#0A1A35;">Build your foundation first</h1>
        <p style="margin:0 0 14px;">Hi ${greeting},</p>
        <p style="margin:0 0 14px;">
          Thank you for completing the questionnaire for <strong>${brand}</strong>. A full public-facing audit needs a live website
          and at least one social or public profile so we can research your site, posts, and audience comments.
        </p>
        <p style="margin:0 0 14px;">
          For now, your next step is <strong>${GUIDE_HUB_TITLE}</strong> on The Brief — a starter path for foundation, website direction,
          social setup, and trust signals before you scale.
        </p>
        <p style="margin:0 0 18px;">
          <a href="${GUIDE_DELIVERY_HUB_URL}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#0A1A35;color:#fff;padding:13px 22px;border-radius:999px;text-decoration:none;font-weight:700;">
            Go to Before You Build the Brand
          </a>
        </p>
        <p style="margin:0 0 14px;font-size:14px;color:#555;">
          Button not working? Open this link:
          <a href="${GUIDE_DELIVERY_HUB_URL}" target="_blank" rel="noopener noreferrer" style="color:#8C6C27;">${GUIDE_DELIVERY_HUB_URL}</a>
        </p>
        <p style="margin:0 0 14px;font-size:14px;color:#555;">
          When your website and at least one social profile are live, apply again for the Free Brand Audit and we will run the full diagnosis.
        </p>
        <p style="margin:24px 0 0;font-size:12px;color:#666;">JahKnowsPR Firm · <a href="${GUIDE_DELIVERY_HUB_URL}" target="_blank" rel="noopener noreferrer" style="color:#8C6C27;">Before You Build the Brand on The Brief</a></p>
      </div>
    </div>
  </body>
</html>`;
}
