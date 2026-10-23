import { createClient } from "@supabase/supabase-js";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue | undefined };

export type TrackEventName =
  | "ad_click"
  | "ai_answer_view"
  | "ai_referral_visit"
  | "page_view"
  | "content_view"
  | "blog_view"
  | "story_view"
  | "audit_page_view"
  | "strategy_session_page_view"
  | "brand_blueprint_page_view"
  | "cta_click"
  | "offer_page_view"
  | "nav_click"
  | "form_start"
  | "form_submit"
  | "audit_request_submit"
  | "booking_click"
  | "checkout_start"
  | "purchase_complete"
  | "newsletter_signup"
  | "video_play"
  | "video_complete"
  | "download_click"
  | "internal_search"
  | "outbound_link_click"
  | "backlink_click"
  | "client_portal_login"
  | "report_view"
  | "report_download"
  | "brief_engagement";

const EVENT_NAMES = new Set<TrackEventName>([
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
  "brief_engagement",
]);

const FORBIDDEN_KEY_PARTS = ["password", "token", "authorization", "card", "cvv", "ssn", "secret", "note", "message"];
const MAX_METADATA_KEYS = 40;
const MAX_STRING_LENGTH = 400;

export type TrackPayload = {
  event_name: TrackEventName;
  site_id: string;
  client_id?: string | null;
  brand_id: string;
  industry_key?: string | null;
  audience_cluster_id?: string | null;
  lead_magnet_id?: string | null;
  offer_stage?: string | null;
  platform?: string | null;
  content_angle?: string | null;
  message_angle?: string | null;
  landing_page_url?: string | null;
  audit_intake_id?: string | null;
  strategy_session_id?: string | null;
  buyer_journey_id?: string | null;
  adset_id?: string | null;
  creative_id?: string | null;
  page_path?: string | null;
  page_title?: string | null;
  referrer?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  content_id?: string | null;
  content_type?: string | null;
  content_category?: string | null;
  blog_slug?: string | null;
  campaign_id?: string | null;
  audience_pool_id?: string | null;
  offer_id?: string | null;
  funnel_id?: string | null;
  funnel_step?: string | null;
  cta_id?: string | null;
  cta_label?: string | null;
  button_text?: string | null;
  form_id?: string | null;
  form_name?: string | null;
  video_id?: string | null;
  revenue_value?: number | null;
  currency?: string | null;
  anonymous_visitor_id: string;
  session_id: string;
  user_id?: string | null;
  buyer_key?: string | null;
  device_type?: string | null;
  browser?: string | null;
  country_or_region?: string | null;
  metadata?: Record<string, unknown>;
};

export function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function getServiceClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export function sanitizeString(input: unknown, max = MAX_STRING_LENGTH): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function sanitizeJsonValue(value: unknown, depth = 0): JsonValue | undefined {
  if (depth > 2) return undefined;
  if (value === null) return null;
  if (typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return value.slice(0, MAX_STRING_LENGTH);
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeJsonValue(item, depth + 1)).filter((v) => v !== undefined) as JsonValue[];
  }
  if (typeof value === "object") {
    const out: Record<string, JsonValue> = {};
    let count = 0;
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (count >= MAX_METADATA_KEYS) break;
      if (FORBIDDEN_KEY_PARTS.some((part) => k.toLowerCase().includes(part))) continue;
      const cleanValue = sanitizeJsonValue(v, depth + 1);
      if (cleanValue !== undefined) {
        out[k.slice(0, 80)] = cleanValue;
        count += 1;
      }
    }
    return out;
  }
  return undefined;
}

export function sanitizeMetadata(metadata: unknown): Record<string, JsonValue> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  return (sanitizeJsonValue(metadata) as Record<string, JsonValue>) || {};
}

export function sanitizeEventPayload(input: Record<string, unknown>): TrackPayload {
  const event_name = sanitizeString(input.event_name, 64) as TrackEventName | null;
  if (!event_name || !EVENT_NAMES.has(event_name)) throw new Error("Unsupported event_name.");

  const site_id = sanitizeString(input.site_id, 64);
  const brand_id = sanitizeString(input.brand_id, 64);
  const anonymous_visitor_id = sanitizeString(input.anonymous_visitor_id, 128);
  const session_id = sanitizeString(input.session_id, 128);
  if (!site_id || !brand_id || !anonymous_visitor_id || !session_id) {
    throw new Error("Missing required site_id, brand_id, anonymous_visitor_id, or session_id.");
  }

  const revenueRaw = input.revenue_value;
  const revenue_value =
    typeof revenueRaw === "number" && Number.isFinite(revenueRaw) ? Number(revenueRaw.toFixed(2)) : null;

  const payload: TrackPayload = {
    event_name,
    site_id,
    client_id: sanitizeString(input.client_id, 120),
    brand_id,
    industry_key: sanitizeString(input.industry_key, 120),
    audience_cluster_id: sanitizeString(input.audience_cluster_id, 120),
    lead_magnet_id: sanitizeString(input.lead_magnet_id, 120),
    offer_stage: sanitizeString(input.offer_stage, 80),
    platform: sanitizeString(input.platform, 80),
    content_angle: sanitizeString(input.content_angle, 160),
    message_angle: sanitizeString(input.message_angle, 160),
    landing_page_url: sanitizeString(input.landing_page_url, 300),
    audit_intake_id: sanitizeString(input.audit_intake_id, 64),
    strategy_session_id: sanitizeString(input.strategy_session_id, 64),
    buyer_journey_id: sanitizeString(input.buyer_journey_id, 64),
    adset_id: sanitizeString(input.adset_id, 120),
    creative_id: sanitizeString(input.creative_id, 120),
    anonymous_visitor_id,
    session_id,
    page_path: sanitizeString(input.page_path, 300),
    page_title: sanitizeString(input.page_title, 180),
    referrer: sanitizeString(input.referrer, 300),
    utm_source: sanitizeString(input.utm_source, 120),
    utm_medium: sanitizeString(input.utm_medium, 120),
    utm_campaign: sanitizeString(input.utm_campaign, 160),
    utm_content: sanitizeString(input.utm_content, 160),
    utm_term: sanitizeString(input.utm_term, 160),
    content_id: sanitizeString(input.content_id, 120),
    content_type: sanitizeString(input.content_type, 80),
    content_category: sanitizeString(input.content_category, 120),
    blog_slug: sanitizeString(input.blog_slug, 180),
    campaign_id: sanitizeString(input.campaign_id, 120),
    audience_pool_id: sanitizeString(input.audience_pool_id, 120),
    offer_id: sanitizeString(input.offer_id, 120),
    funnel_id: sanitizeString(input.funnel_id, 120),
    funnel_step: sanitizeString(input.funnel_step, 120),
    cta_id: sanitizeString(input.cta_id, 120),
    cta_label: sanitizeString(input.cta_label, 200),
    button_text: sanitizeString(input.button_text, 200),
    form_id: sanitizeString(input.form_id, 120),
    form_name: sanitizeString(input.form_name, 200),
    video_id: sanitizeString(input.video_id, 120),
    revenue_value,
    currency: sanitizeString(input.currency, 16),
    user_id: sanitizeString(input.user_id, 64),
    buyer_key: sanitizeString(input.buyer_key, 180),
    device_type: sanitizeString(input.device_type, 40),
    browser: sanitizeString(input.browser, 60),
    country_or_region: sanitizeString(input.country_or_region, 80),
    metadata: sanitizeMetadata(input.metadata),
  };

  const metadataSize = JSON.stringify(payload.metadata).length;
  if (metadataSize > 7000) throw new Error("metadata exceeds max size");
  return payload;
}

export function eventKind(eventName: TrackEventName) {
  return {
    isPageView: ["page_view", "content_view", "blog_view", "story_view", "offer_page_view", "audit_page_view", "strategy_session_page_view", "brand_blueprint_page_view"].includes(
      eventName,
    ),
    isCtaClick: ["ad_click", "cta_click", "nav_click", "booking_click", "checkout_start", "download_click", "outbound_link_click"].includes(
      eventName,
    ),
    isConversion: ["form_submit", "audit_request_submit", "booking_click", "purchase_complete", "newsletter_signup"].includes(
      eventName,
    ),
  };
}
