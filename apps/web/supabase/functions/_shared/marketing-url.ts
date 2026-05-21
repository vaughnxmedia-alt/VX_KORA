/** Canonical public site — always used in outbound subscriber emails. */
export const PRODUCTION_SITE_ORIGIN = "https://www.jahknowspr.com";
export const STARTER_GUIDE_HUB_PATH = "/the-brief/before-you-build-the-brand-starter-guide";
export const STARTER_GUIDE_HUB_URL = `${PRODUCTION_SITE_ORIGIN}${STARTER_GUIDE_HUB_PATH}`;
export const THE_BRIEF_URL = `${PRODUCTION_SITE_ORIGIN}/the-brief`;

function isLocalHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

function isProductionHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "www.jahknowspr.com" || h === "jahknowspr.com";
}

/** Rewrite dev/staging origins to www.jahknowspr.com while keeping path/query. */
export function normalizeMarketingUrl(url: string | null | undefined, fallback = THE_BRIEF_URL): string {
  const trimmed = String(url ?? "").trim();
  if (!trimmed) return fallback;

  try {
    const parsed = new URL(trimmed, PRODUCTION_SITE_ORIGIN);
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    const safePath = path.startsWith("/") ? path : `/${path}`;

    if (isLocalHost(parsed.hostname) || !isProductionHost(parsed.hostname)) {
      return `${PRODUCTION_SITE_ORIGIN}${safePath}`;
    }

    if (parsed.hostname.toLowerCase() === "jahknowspr.com") {
      return `${PRODUCTION_SITE_ORIGIN}${safePath}`;
    }

    return `${PRODUCTION_SITE_ORIGIN}${safePath}`;
  } catch {
    if (trimmed.startsWith("/")) return `${PRODUCTION_SITE_ORIGIN}${trimmed}`;
    return fallback;
  }
}

/** Campaign-specific CTA: production URL + starter guide for Before You Build campaigns. */
export function resolveCampaignCtaUrl(
  storedUrl: string | null | undefined,
  campaignName?: string | null,
): string {
  const normalized = normalizeMarketingUrl(storedUrl, THE_BRIEF_URL);
  const name = String(campaignName ?? "").toLowerCase();

  let pathname = "/";
  try {
    pathname = new URL(normalized).pathname.replace(/\/$/, "") || "/";
  } catch {
    /* keep default */
  }

  if (
    name.includes("before you build") &&
    (pathname === "/the-brief" || pathname === "")
  ) {
    return STARTER_GUIDE_HUB_URL;
  }

  if (pathname === STARTER_GUIDE_HUB_PATH || normalized.includes(STARTER_GUIDE_HUB_PATH)) {
    return STARTER_GUIDE_HUB_URL;
  }

  return normalized;
}
