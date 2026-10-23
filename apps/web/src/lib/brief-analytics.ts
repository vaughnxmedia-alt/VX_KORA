import { useEffect } from "react";
import { trackCtaClick, trackEvent } from "@/lib/kora-analytics";

const GA_MEASUREMENT_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined)?.trim() || "";

type BriefFields = {
  content_type: "the-brief";
  content_id: string;
  blog_slug: string | null;
};

function measurementId(): string | null {
  return /^G-[A-Z0-9]+$/i.test(GA_MEASUREMENT_ID) ? GA_MEASUREMENT_ID : null;
}

function ensureGa4(): string | null {
  if (typeof window === "undefined") return null;
  const id = measurementId();
  if (!id) return null;
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag() {
      // gtag.js reads the Arguments object, not a plain array.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", id, { send_page_view: false });
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    script.dataset.ga4 = id;
    document.head.appendChild(script);
  }
  return id;
}

function gaEvent(name: string, params: Record<string, string | number | null | undefined>) {
  const id = ensureGa4();
  if (!id || !window.gtag) return;
  const clean: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value) clean[key] = value.slice(0, 200);
    if (typeof value === "number" && Number.isFinite(value)) clean[key] = value;
  }
  window.gtag("event", name, clean);
}

/** Landing pages and article paths for The Brief, including /insights/the-brief. */
export function briefTrackingFields(pagePath: string): BriefFields | null {
  const parts = pagePath.split("/").filter(Boolean).map((part) => {
    try {
      return decodeURIComponent(part);
    } catch {
      return part;
    }
  });
  const isInsights = parts[0] === "insights" && parts[1] === "the-brief";
  const isBrief = parts[0] === "the-brief" || isInsights;
  if (!isBrief) return null;
  const slugParts = isInsights ? parts.slice(2) : parts.slice(1);
  const rawSlug = slugParts.join("/") || null;
  const slug = rawSlug?.replace(/^insights\/the-brief\//, "") || null;
  return {
    content_type: "the-brief",
    content_id: slug || "the-brief",
    blog_slug: slug,
  };
}

export function trackBriefGaPageView(input: { pagePath: string; title?: string | null; slug?: string | null }) {
  gaEvent("page_view", {
    page_path: input.pagePath,
    page_title: input.title || undefined,
    article_slug: input.slug,
    content_group: "the-brief",
  });
}

export function trackBriefCta(input: {
  ctaId: string;
  label: string;
  slug?: string | null;
  title?: string | null;
  contentId?: string | null;
}) {
  trackCtaClick({
    content_type: "the-brief",
    content_id: input.contentId || input.slug || "the-brief",
    blog_slug: input.slug ?? null,
    page_title: input.title || (typeof document !== "undefined" ? document.title : undefined),
    cta_id: input.ctaId,
    cta_label: input.label,
    button_text: input.label,
  });
  gaEvent("cta_click", {
    cta_id: input.ctaId,
    cta_label: input.label,
    article_slug: input.slug,
    page_path: typeof window !== "undefined" ? window.location.pathname : undefined,
  });
}

export function useBriefEngagement(input: {
  enabled: boolean;
  slug?: string | null;
  title?: string | null;
  contentId?: string | null;
}) {
  const slug = input.slug ?? null;
  const title = input.title ?? null;
  const contentId = input.contentId ?? null;

  useEffect(() => {
    if (!input.enabled || typeof window === "undefined") return;
    let last = performance.now();

    const flush = () => {
      const now = performance.now();
      const delta = Math.round((now - last) / 1000);
      last = now;
      if (delta < 1) return;
      const seconds = Math.min(delta, 120);
      trackEvent("brief_engagement", {
        content_type: "the-brief",
        content_id: contentId || slug || "the-brief",
        blog_slug: slug,
        page_title: title || document.title,
        metadata: { engagement_seconds: seconds },
      });
      gaEvent("brief_engagement", {
        engagement_time_msec: seconds * 1000,
        article_slug: slug,
        page_path: window.location.pathname,
      });
    };

    const onInterval = () => {
      if (document.visibilityState !== "visible") return;
      flush();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
      else last = performance.now();
    };
    const onPageHide = () => flush();

    const interval = window.setInterval(onInterval, 15000);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      flush();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [contentId, input.enabled, slug, title]);
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}
