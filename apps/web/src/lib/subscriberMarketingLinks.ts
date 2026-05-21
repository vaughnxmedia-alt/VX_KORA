import { getPublicSiteOrigin } from "@/lib/publicSite";
import { GUIDE_HUB_PATH } from "@/content/guides/beforeYouBuildTheBrand";

export type MarketingLinkOption = {
  value: string;
  label: string;
  url: string;
  defaultCtaLabel: string;
  group: "brief" | "cta_pages" | "pdf_guides";
};

const SITE = () => getPublicSiteOrigin() || "https://www.jahknowspr.com";

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
  const normalized = url.trim().replace(/\/$/, "");
  return [...CTA_PAGE_LINKS, ...PDF_GUIDE_LINKS].find(
    (opt) => opt.url.replace(/\/$/, "") === normalized,
  );
}

export function findMarketingLinkByValue(value: string): MarketingLinkOption | undefined {
  return [...CTA_PAGE_LINKS, ...PDF_GUIDE_LINKS].find((opt) => opt.value === value);
}
