import type { AnalyticsEventName, AnalyticsTrackPayload, KoraAnalyticsEvent } from "./kora-analytics-types";

const VISITOR_STORAGE_KEY = "kora_analytics_visitor_id";
const SESSION_STORAGE_KEY = "kora_analytics_session";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const TRACK_ENDPOINT = "/api/kora/analytics/track";
const DEFAULT_SITE_ID = "jahknowspr_web";
const DEFAULT_BRAND_ID = "jahknowspr";

type SessionState = {
  sessionId: string;
  lastActivityAt: number;
  startedAt: number;
};

const EVENT_NAMES: Set<AnalyticsEventName> = new Set([
  "ad_click",
  "ai_answer_view",
  "ai_referral_visit",
  "page_view",
  "content_view",
  "blog_view",
  "story_view",
  "audit_page_view",
  "strategy_session_page_view",
  "brand_blueprint_page_view",
  "cta_click",
  "offer_page_view",
  "nav_click",
  "form_start",
  "form_submit",
  "audit_request_submit",
  "booking_click",
  "checkout_start",
  "purchase_complete",
  "newsletter_signup",
  "video_play",
  "video_complete",
  "download_click",
  "internal_search",
  "outbound_link_click",
  "backlink_click",
  "client_portal_login",
  "report_view",
  "report_download",
]);

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function randomId(prefix: string): string {
  const rand = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${rand}`;
}

function getSessionState(): SessionState | null {
  if (!isBrowser()) return null;
  const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionState;
  } catch {
    return null;
  }
}

function persistSession(state: SessionState) {
  if (!isBrowser()) return;
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
}

function sanitizeMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!metadata) return {};
  const forbidden = ["password", "token", "authorization", "card", "cvv", "ssn", "secret", "note", "message"];
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (forbidden.some((f) => key.toLowerCase().includes(f))) continue;
    if (typeof value === "string") {
      out[key] = value.slice(0, 300);
      continue;
    }
    if (typeof value === "number" || typeof value === "boolean" || value === null) {
      out[key] = value;
      continue;
    }
    if (Array.isArray(value)) {
      out[key] = value.slice(0, 20).map((item) => (typeof item === "string" ? item.slice(0, 120) : item));
      continue;
    }
    if (typeof value === "object") {
      out[key] = "[object]";
    }
  }
  return out;
}

function detectDeviceType(): string {
  if (!isBrowser()) return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (/mobile|iphone|android/.test(ua)) return "mobile";
  if (/ipad|tablet/.test(ua)) return "tablet";
  return "desktop";
}

function detectBrowser(): string {
  if (!isBrowser()) return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("edg")) return "edge";
  if (ua.includes("chrome")) return "chrome";
  if (ua.includes("safari") && !ua.includes("chrome")) return "safari";
  if (ua.includes("firefox")) return "firefox";
  return "other";
}

function collectUtm(): Pick<
  KoraAnalyticsEvent,
  "utm_source" | "utm_medium" | "utm_campaign" | "utm_content" | "utm_term"
> {
  if (!isBrowser()) return {};
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_content: params.get("utm_content"),
    utm_term: params.get("utm_term"),
  };
}

function collectAttributionParams(): Pick<
  KoraAnalyticsEvent,
  | "client_id"
  | "industry_key"
  | "audience_cluster_id"
  | "lead_magnet_id"
  | "offer_stage"
  | "platform"
  | "content_angle"
  | "message_angle"
  | "landing_page_url"
  | "audit_intake_id"
  | "strategy_session_id"
  | "buyer_journey_id"
  | "audience_pool_id"
  | "offer_id"
  | "campaign_id"
  | "adset_id"
  | "creative_id"
  | "buyer_key"
> {
  if (!isBrowser()) return {};

  const params = new URLSearchParams(window.location.search);
  const readParam = (...keys: string[]): string | null => {
    for (const key of keys) {
      const value = params.get(key)?.trim();
      if (value) return value.slice(0, 180);
    }
    return null;
  };

  return {
    client_id: readParam("client_id", "k_client", "cid"),
    industry_key: readParam("industry_key", "k_industry", "industry"),
    audience_cluster_id: readParam("audience_cluster_id", "k_audience_cluster", "k_audience"),
    lead_magnet_id: readParam("lead_magnet_id", "k_lead_magnet"),
    offer_stage: readParam("offer_stage", "k_offer_stage"),
    platform: readParam("platform", "k_platform"),
    content_angle: readParam("content_angle", "k_content_angle"),
    message_angle: readParam("message_angle", "k_message_angle"),
    landing_page_url: readParam("landing_page_url", "k_landing_url"),
    audit_intake_id: readParam("audit_intake_id", "k_audit_intake"),
    strategy_session_id: readParam("strategy_session_id", "k_strategy_session"),
    buyer_journey_id: readParam("buyer_journey_id", "k_buyer_journey"),
    audience_pool_id: readParam("audience_pool_id", "k_audience_pool"),
    offer_id: readParam("offer_id", "k_offer"),
    campaign_id: readParam("campaign_id", "k_campaign"),
    adset_id: readParam("adset_id", "k_adset"),
    creative_id: readParam("creative_id", "k_creative"),
    buyer_key: readParam("buyer_key", "k_buyer"),
  };
}

export function getOrCreateAnonymousVisitorId(): string {
  if (!isBrowser()) return "server_visitor";
  const existing = window.localStorage.getItem(VISITOR_STORAGE_KEY);
  if (existing) return existing;
  const created = randomId("v");
  window.localStorage.setItem(VISITOR_STORAGE_KEY, created);
  return created;
}

export function getOrCreateSessionId(): string {
  const now = Date.now();
  const current = getSessionState();
  if (!current || now - current.lastActivityAt > SESSION_TIMEOUT_MS) {
    const fresh: SessionState = { sessionId: randomId("s"), startedAt: now, lastActivityAt: now };
    persistSession(fresh);
    return fresh.sessionId;
  }
  current.lastActivityAt = now;
  persistSession(current);
  return current.sessionId;
}

function basePayload(): Omit<AnalyticsTrackPayload, "event_name"> {
  if (!isBrowser()) {
    return {
      site_id: DEFAULT_SITE_ID,
      brand_id: DEFAULT_BRAND_ID,
      anonymous_visitor_id: "server_visitor",
      session_id: "server_session",
      metadata: {},
    };
  }

  return {
    site_id: DEFAULT_SITE_ID,
    brand_id: DEFAULT_BRAND_ID,
    page_path: window.location.pathname,
    page_title: document.title,
    referrer: document.referrer || null,
    anonymous_visitor_id: getOrCreateAnonymousVisitorId(),
    session_id: getOrCreateSessionId(),
    device_type: detectDeviceType(),
    browser: detectBrowser(),
    ...collectUtm(),
    ...collectAttributionParams(),
    metadata: {},
  };
}

function send(payload: AnalyticsTrackPayload) {
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    const ok = navigator.sendBeacon(TRACK_ENDPOINT, new Blob([body], { type: "application/json" }));
    if (ok) return;
  }

  void fetch(TRACK_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch((error) => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("[kora-analytics] tracking request failed", error);
    }
  });
}

export function trackEvent(eventName: AnalyticsEventName, properties: Partial<AnalyticsTrackPayload> = {}) {
  if (!isBrowser()) return;
  if (!EVENT_NAMES.has(eventName)) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(`[kora-analytics] unsupported event: ${eventName}`);
    }
    return;
  }

  const payload: AnalyticsTrackPayload = {
    ...basePayload(),
    ...properties,
    event_name: eventName,
    metadata: sanitizeMetadata(properties.metadata as Record<string, unknown> | undefined),
  };
  send(payload);
}

export const trackPageView = (properties: Partial<AnalyticsTrackPayload> = {}) => trackEvent("page_view", properties);
export const trackAdClick = (properties: Partial<AnalyticsTrackPayload> = {}) => trackEvent("ad_click", properties);
export const trackAIAnswerView = (properties: Partial<AnalyticsTrackPayload> = {}) =>
  trackEvent("ai_answer_view", properties);
export const trackAIReferralVisit = (properties: Partial<AnalyticsTrackPayload> = {}) =>
  trackEvent("ai_referral_visit", properties);
export const trackContentView = (properties: Partial<AnalyticsTrackPayload> = {}) => trackEvent("content_view", properties);
export const trackBlogView = (properties: Partial<AnalyticsTrackPayload> = {}) => trackEvent("blog_view", properties);
export const trackStoryView = (properties: Partial<AnalyticsTrackPayload> = {}) => trackEvent("story_view", properties);
export const trackAuditPageView = (properties: Partial<AnalyticsTrackPayload> = {}) =>
  trackEvent("audit_page_view", properties);
export const trackStrategySessionView = (properties: Partial<AnalyticsTrackPayload> = {}) =>
  trackEvent("strategy_session_page_view", properties);
export const trackBrandBlueprintView = (properties: Partial<AnalyticsTrackPayload> = {}) =>
  trackEvent("brand_blueprint_page_view", properties);
export const trackCtaClick = (properties: Partial<AnalyticsTrackPayload> = {}) => trackEvent("cta_click", properties);
export const trackOfferPageView = (properties: Partial<AnalyticsTrackPayload> = {}) => trackEvent("offer_page_view", properties);
export const trackFormStart = (properties: Partial<AnalyticsTrackPayload> = {}) => trackEvent("form_start", properties);
export const trackFormSubmit = (properties: Partial<AnalyticsTrackPayload> = {}) => trackEvent("form_submit", properties);
export const trackAuditRequestSubmit = (properties: Partial<AnalyticsTrackPayload> = {}) =>
  trackEvent("audit_request_submit", properties);
export const trackBookingClick = (properties: Partial<AnalyticsTrackPayload> = {}) => trackEvent("booking_click", properties);
export const trackCheckoutStart = (properties: Partial<AnalyticsTrackPayload> = {}) => trackEvent("checkout_start", properties);
export const trackPurchaseComplete = (properties: Partial<AnalyticsTrackPayload> = {}) =>
  trackEvent("purchase_complete", properties);
export const trackNewsletterSignup = (properties: Partial<AnalyticsTrackPayload> = {}) =>
  trackEvent("newsletter_signup", properties);
export const trackVideoPlay = (properties: Partial<AnalyticsTrackPayload> = {}) => trackEvent("video_play", properties);
export const trackOutboundLinkClick = (properties: Partial<AnalyticsTrackPayload> = {}) =>
  trackEvent("outbound_link_click", properties);
