/** Public site origin for share links. Set `VITE_PUBLIC_SITE_URL` in Vercel (e.g. https://jahknowspr.com) so links stay correct in production. */
export function getPublicSiteOrigin(): string {
  const env = typeof import.meta.env !== "undefined" ? import.meta.env.VITE_PUBLIC_SITE_URL : "";
  const trimmed = String(env || "").trim().replace(/\/$/, "");
  if (trimmed) return trimmed;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}
