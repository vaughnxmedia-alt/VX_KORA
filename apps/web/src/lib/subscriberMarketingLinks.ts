import { getMarketingSiteOrigin, PRODUCTION_SITE_ORIGIN } from "@/lib/publicSite";
import { GUIDE_HUB_PATH } from "@/content/guides/beforeYouBuildTheBrand";

export type MarketingLinkOption = {
  value: string;
  label: string;
  url: string;
  defaultCtaLabel: string;
  group: "brief" | "cta_pages" | "pdf_guides";
};

export const STARTER_GUIDE_HUB_URL = `${PRODUCTION_SITE_ORIGIN}${GUIDE_HUB_PATH}`;

const SITE = () => getMarketingSiteOrigin();

function isLocalHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

/** Rewrite dev origins to www.jahknowspr.com for email campaigns. */
export function normalizeMarketingUrl(url: string, fallback = STARTER_GUIDE_HUB_URL): string {
  const trimmed = url.trim();
  if (!trimmed) return fallback;
  try {
    const parsed = new URL(trimmed, PRODUCTION_SITE_ORIGIN);
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    const safePath = path.startsWith("/") ? path : `/${path}`;
    if (isLocalHost(parsed.hostname) || parsed.hostname.toLowerCase() === "jahknowspr.com") {
      return `${PRODUCTION_SITE_ORIGIN}${safePath}`;
    }
    if (parsed.hostname.toLowerCase() !== "www.jahknowspr.com") {
      return `${PRODUCTION_SITE_ORIGIN}${safePath}`;
    }
    return `${PRODUCTION_SITE_ORIGIN}${safePath}`;
  } catch {
    if (trimmed.startsWith("/")) return `${PRODUCTION_SITE_ORIGIN}${trimmed}`;
    return fallback;
  }
}

export function resolveCampaignCtaUrl(storedUrl: string, campaignName?: string): string {
  const normalized = normalizeMarketingUrl(storedUrl, STARTER_GUIDE_HUB_URL);
  const name = (campaignName ?? "").toLowerCase();
  let pathname = "/";
  try {
    pathname = new URL(normalized).pathname.replace(/\/$/, "") || "/";
  } catch {
    /* ignore */
  }
  if (name.includes("before you build") && pathname === "/the-brief") {
    return STARTER_GUIDE_HUB_URL;
  }
  return normalized;
}

/** Official CTA / landing pages on the live site */
export const CTA_PAGE_LINKS: MarketingLinkOption[] = [
  {
    value: "cta:the-brief",
    label: "The Brief (hub)",
    url: `${SITE()}/the-brief`,
    defaultCtaLabel: "Explore The Brief",
    group: "cta_pages",
  },
  {
    value: "cta:free-audit",
    label: "Free Brand Audit",
    url: `${SITE()}/free-audit`,
    defaultCtaLabel: "Start Free Audit",
    group: "cta_pages",
  },
  {
    value: "cta:brand-strategy-session",
    label: "Brand Strategy Session",
    url: `${SITE()}/brand-strategy-session`,
    defaultCtaLabel: "Book Strategy Session",
    group: "cta_pages",
  },
  {
    value: "cta:strategy-session",
    label: "Strategy Session Booking",
    url: `${SITE()}/strategy-session`,
    defaultCtaLabel: "Book Your Session",
    group: "cta_pages",
  },
  {
    value: "cta:brand-foundation",
    label: "Brand Foundation Starter",
    url: `${SITE()}/brand-foundation`,
    defaultCtaLabel: "Get the Starter Guide",
    group: "cta_pages",
  },
  {
    value: "cta:work-with-me",
    label: "Work With Me",
    url: `${SITE()}/work-with-me`,
    defaultCtaLabel: "Work With JahKnowsPR",
    group: "cta_pages",
  },
  {
    value: "cta:brand-blueprint",
    label: "Brand Blueprint",
    url: `${SITE()}/brand-blueprint`,
    defaultCtaLabel: "Request Blueprint",
    group: "cta_pages",
  },
  {
    value: "cta:events",
    label: "Events",
    url: `${SITE()}/events`,
    defaultCtaLabel: "View Events",
    group: "cta_pages",
  },
];

/** Downloadable PDF guide landing pages (extensible) */
export const PDF_GUIDE_LINKS: MarketingLinkOption[] = [
  {
    value: "guide:making-of-a-brand",
    label: "The Making of a Brand — starter guide (PDF)",
    url: `${SITE()}${GUIDE_HUB_PATH}`,
    defaultCtaLabel: "Download the Full Guide",
    group: "pdf_guides",
  },
];

export function briefPostLink(slug: string, title: string): MarketingLinkOption {
  const path = `/the-brief/${encodeURIComponent(slug)}`;
  return {
    value: `brief:${slug}`,
    label: title,
    url: `${SITE()}${path}`,
    defaultCtaLabel: "Read this edition",
    group: "brief",
  };
}

export function findMarketingLinkByUrl(url: string): MarketingLinkOption | undefined {
  const normalized = normalizeMarketingUrl(url).replace(/\/$/, "");
  return [...CTA_PAGE_LINKS, ...PDF_GUIDE_LINKS].find(
    (opt) => opt.url.replace(/\/$/, "") === normalized,
  );
}

export function findMarketingLinkByValue(value: string): MarketingLinkOption | undefined {
  return [...CTA_PAGE_LINKS, ...PDF_GUIDE_LINKS].find((opt) => opt.value === value);
}
