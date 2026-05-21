/** Canonical production origin for marketing emails and share links. */
export const PRODUCTION_SITE_ORIGIN = "https://www.jahknowspr.com";

/** Public site origin for share links. Set `VITE_PUBLIC_SITE_URL` in Vercel (e.g. https://www.jahknowspr.com). */
export function getPublicSiteOrigin(): string {
  const env = typeof import.meta.env !== "undefined" ? import.meta.env.VITE_PUBLIC_SITE_URL : "";
  const trimmed = String(env || "").trim().replace(/\/$/, "");
  if (trimmed) return trimmed;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

/** Always use production URLs in subscriber marketing (never localhost in stored/sent links). */
export function getMarketingSiteOrigin(): string {
  const env = typeof import.meta.env !== "undefined" ? import.meta.env.VITE_PUBLIC_SITE_URL : "";
  const trimmed = String(env || "").trim().replace(/\/$/, "");
  if (trimmed && !trimmed.includes("localhost") && !trimmed.includes("127.0.0.1")) {
    return trimmed;
  }
  return PRODUCTION_SITE_ORIGIN;
}
