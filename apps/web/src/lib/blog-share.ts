import { supabaseUrl } from "@/integrations/supabase/client";

/** Default OG / link-preview image when a post has no cover (full URL on production). */
export const DEFAULT_OG_IMAGE_PATH = "/og-share-jk-pr.png";

/** Brand navy (matches logo SVG) for browser / PWA chrome. */
export const BRAND_THEME_COLOR = "#0A1A35";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getSiteOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "https://jahknowspr.com";
}

/** Production marketing site origin for links copied from the dashboard (avoid localhost). */
export function getPublicSiteOrigin(): string {
  const fromEnv = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "https://jahknowspr.com";
}

export function getDefaultOgImageAbsoluteUrl(): string {
  return `${getSiteOrigin()}${DEFAULT_OG_IMAGE_PATH}`;
}

/** URL path segment for /the-brief/:segment — prefers slug when set. */
export function buildBlogPathSegment(post: { id: string; slug?: string | null }): string {
  const slug = post.slug?.trim();
  if (slug) return slug;
  return post.id;
}

/**
 * Public article URL on the current origin (e.g. dev: http://127.0.0.1:8095/the-brief/…).
 * Uses slug in the path when the post has one so links match the readable URL.
 */
export function buildBlogCanonicalUrlFromPost(post: { id: string; slug?: string | null }): string {
  return `${getSiteOrigin()}/the-brief/${encodeURIComponent(buildBlogPathSegment(post))}`;
}

/**
 * Same as {@link buildBlogCanonicalUrlFromPost} but fixed to production host for dashboard “Copy link”.
 */
export function buildBlogPublicUrlForShare(post: { id: string; slug?: string | null }): string {
  return `${getPublicSiteOrigin()}/the-brief/${encodeURIComponent(buildBlogPathSegment(post))}`;
}

/**
 * Legacy helper when you only have an id (no slug context).
 */
export function buildBlogCanonicalUrl(postId: string): string {
  return `${getSiteOrigin()}/the-brief/${encodeURIComponent(postId)}`;
}

/**
 * Supabase Edge Function URL — for crawlers only, not for user-facing “Copy link”.
 */
export function buildBlogOgMetaUrl(postId: string): string {
  const base = supabaseUrl?.replace(/\/$/, "") || "";
  if (!base || base.includes("placeholder")) {
    return buildBlogCanonicalUrl(postId);
  }
  return `${base}/functions/v1/og-meta?id=${postId}`;
}

export function isBlogPostPublishedForShare(post: {
  status?: string | null;
  published_date?: string | null;
  is_hidden?: boolean | null;
}): boolean {
  if (post.is_hidden) return false;
  if ((post.status ?? "draft") !== "published") return false;
  return Boolean(post.published_date?.trim());
}

export function isBlogRouteParamUuid(param: string): boolean {
  return UUID_REGEX.test(param);
}
