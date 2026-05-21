import { getPublicSiteOrigin } from "@/lib/publicSite";

const SITE = () => getPublicSiteOrigin() || "https://www.jahknowspr.com";
const THE_BRIEF_URL = `${SITE()}/the-brief`;

export type BlogPreviewPost = {
  title: string;
  slug: string | null;
  excerpt?: string | null;
  description?: string | null;
  cover_image_url?: string | null;
};

function campaignShell(opts: {
  name: string;
  headline: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  previewLine?: string | null;
}) {
  const preview = opts.previewLine?.trim()
    ? `<p style="margin:0 0 14px;font-size:15px;color:#555;">${opts.previewLine}</p>`
    : "";
  return `
  <body style="margin:0;background:#F7F3EA;padding:28px 12px;font-family:Arial,sans-serif;color:#0A1A35;line-height:1.6;">
    <div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #E8DFC8;border-radius:24px;overflow:hidden;">
      <div style="height:8px;background:#0A1A35;"></div>
      <div style="padding:34px 32px 28px;">
        <p style="margin:0 0 14px;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#8C6C27;font-weight:700;">JahKnowsPR Firm / The Brief</p>
        <h1 style="font-family:Georgia,serif;margin:0 0 18px;font-size:32px;line-height:1.1;color:#0A1A35;">${opts.headline}</h1>
        <p style="margin:0 0 14px;">Hi ${opts.name},</p>
        ${preview}
        <div style="margin:16px 0 20px;">${opts.bodyHtml}</div>
        <p style="margin:0 0 18px;">
          <a href="${opts.ctaUrl}" style="display:inline-block;background:#0A1A35;color:#fff;padding:13px 20px;border-radius:999px;text-decoration:none;font-weight:700;">
            ${opts.ctaLabel}
          </a>
        </p>
        <p style="margin:24px 0 0;font-size:12px;color:#666;">JahKnowsPR Firm · <a href="${THE_BRIEF_URL}" style="color:#8C6C27;">The Brief</a></p>
      </div>
    </div>
  </body>`;
}

export function buildWelcomeEmailHtml(name: string) {
  const greeting = name.trim() || "there";
  return campaignShell({
    name: greeting,
    headline: "Thank you for subscribing.",
    previewLine: "You're on the list. We'll share strategic Brief updates when new editions are ready.",
    bodyHtml: `<p style="margin:0 0 14px;">
      The Brief is live — explore brand intelligence and public relations insights built for founders, creators, and organizations building long-term credibility.
    </p>`,
    ctaLabel: "Explore The Brief",
    ctaUrl: THE_BRIEF_URL,
  });
}

export function buildBlogCampaignEmailHtml(
  name: string,
  post: BlogPreviewPost,
  ctaLabel: string,
  ctaUrl: string,
) {
  const slug = post.slug?.trim() || "post";
  const postUrl = ctaUrl || `${SITE()}/the-brief/${encodeURIComponent(slug)}`;
  const excerpt = (post.excerpt || post.description || "").trim();
  const cover = post.cover_image_url?.trim()
    ? `<p style="margin:0 0 16px;"><img src="${post.cover_image_url}" alt="" style="max-width:100%;border-radius:12px;" /></p>`
    : "";
  return campaignShell({
    name,
    headline: post.title,
    previewLine: excerpt || null,
    bodyHtml: `${cover}<p style="margin:0 0 14px;">A new edition of <strong>The Brief</strong> is ready for you.</p>`,
    ctaLabel,
    ctaUrl: postUrl,
  });
}

export function buildScheduledCampaignEmailHtml(
  name: string,
  campaignName: string,
  previewLine: string | null,
  ctaLabel: string,
  ctaUrl: string,
  post?: BlogPreviewPost | null,
) {
  if (post) {
    return buildBlogCampaignEmailHtml(name, post, ctaLabel, ctaUrl);
  }
  return campaignShell({
    name,
    headline: campaignName,
    previewLine,
    bodyHtml: `<p style="margin:0 0 14px;">${previewLine || "Your latest strategic update from JahKnowsPR."}</p>`,
    ctaLabel,
    ctaUrl,
  });
}

export const WELCOME_EMAIL_SUBJECT = "Thank you for subscribing";
