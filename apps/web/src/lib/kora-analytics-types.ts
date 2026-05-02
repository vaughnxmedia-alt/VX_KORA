export type AnalyticsEventName =
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
  | "report_download";

export type FindingType =
  | "opportunity"
  | "warning"
  | "trend"
  | "funnel_dropoff"
  | "content_winner"
  | "revenue_driver"
  | "weak_page"
  | "seo_issue"
  | "backlink_opportunity"
  | "cta_issue"
  | "campaign_signal"
  | "audience_signal";

export type FindingPriority = "low" | "medium" | "high" | "urgent";
export type FindingStatus = "new" | "reviewed" | "in_progress" | "resolved" | "dismissed";
export type AnalyticsSource = "first_party" | "mission_control" | "gemini" | "external_connector";

export type JahKnowsPROffer =
  | "free_audit"
  | "strategy_session"
  | "brand_blueprint"
  | "campaign_retainer"
  | "creative_production"
  | "newsletter"
  | "unknown";

export type JahKnowsPRFunnel =
  | "free_audit"
  | "strategy_session"
  | "brand_blueprint"
  | "contact_lead"
  | "newsletter"
  | "checkout"
  | "unknown";

export type KoraAnalyticsEvent = {
  id?: string;
  created_at?: string;
  event_name: AnalyticsEventName;
  site_id: string;
  client_id?: string | null;
  brand_id: string;
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
  device_type?: string | null;
  browser?: string | null;
  country_or_region?: string | null;
  metadata?: Record<string, unknown>;
};

export type AnalyticsSession = {
  id: string;
  created_at: string;
  updated_at: string;
  site_id: string;
  client_id?: string | null;
  brand_id: string;
  anonymous_visitor_id: string;
  session_id: string;
  first_page_path: string | null;
  last_page_path: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  device_type: string | null;
  browser: string | null;
  event_count: number;
  page_view_count: number;
  cta_click_count: number;
  conversion_count: number;
  revenue_value: number;
  duration_seconds: number;
};

export type AnalyticsDailyRollup = {
  id: string;
  date: string;
  site_id: string;
  brand_id: string;
  page_views: number;
  unique_visitors: number;
  sessions: number;
  cta_clicks: number;
  form_starts: number;
  form_submits: number;
  booking_clicks: number;
  checkout_starts: number;
  purchases: number;
  revenue: number;
  conversion_rate: number;
  top_page_path: string | null;
  top_offer_id: string | null;
  top_campaign_id: string | null;
  metadata: Record<string, unknown>;
};

export type ContentPerformance = {
  id: string;
  created_at: string;
  updated_at: string;
  site_id: string;
  brand_id: string;
  content_id: string | null;
  content_type: string | null;
  title: string | null;
  slug: string | null;
  page_path: string | null;
  category: string | null;
  views: number;
  unique_visitors: number;
  clicks: number;
  click_rate: number;
  avg_engagement_time: number;
  form_submits: number;
  booking_clicks: number;
  revenue_attributed: number;
  conversion_rate: number;
  seo_status: string | null;
  backlink_status: string | null;
  recommended_action: string | null;
  metadata: Record<string, unknown>;
};

export type FunnelReport = {
  id: string;
  created_at: string;
  updated_at: string;
  site_id: string;
  brand_id: string;
  funnel_id: string;
  funnel_name: string;
  date_range_start: string;
  date_range_end: string;
  total_entries: number;
  total_conversions: number;
  conversion_rate: number;
  largest_dropoff_step: string | null;
  largest_dropoff_rate: number;
  revenue: number;
  metadata: Record<string, unknown>;
};

export type FunnelStep = {
  id: string;
  funnel_report_id: string;
  step_order: number;
  step_name: string;
  event_name: string;
  page_path: string | null;
  visitors: number;
  completed: number;
  dropoff_count: number;
  dropoff_rate: number;
  conversion_rate: number;
};

export type RevenueAttribution = {
  id: string;
  created_at: string;
  site_id: string;
  brand_id: string;
  order_id: string | null;
  payment_provider: string | null;
  offer_id: string | null;
  offer_name: string | null;
  amount: number;
  currency: string | null;
  page_path: string | null;
  campaign_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  anonymous_visitor_id: string | null;
  session_id: string | null;
  user_id: string | null;
  metadata: Record<string, unknown>;
};

export type KoraAnalyticsFinding = {
  id: string;
  created_at: string;
  updated_at: string;
  site_id: string;
  brand_id: string;
  source_type: AnalyticsSource | string;
  finding_type: FindingType | string;
  title: string;
  summary: string;
  evidence: Record<string, unknown>;
  recommendation: string;
  priority: FindingPriority | string;
  status: FindingStatus | string;
  related_page_path: string | null;
  related_content_id: string | null;
  audience_pool_id?: string | null;
  related_offer_id: string | null;
  related_campaign_id: string | null;
  model_used: string | null;
  date_range_start: string | null;
  date_range_end: string | null;
  metadata: Record<string, unknown>;
};

export type AnalyticsTrackPayload = Pick<
  KoraAnalyticsEvent,
  | "event_name"
  | "site_id"
  | "client_id"
  | "brand_id"
  | "page_path"
  | "page_title"
  | "referrer"
  | "utm_source"
  | "utm_medium"
  | "utm_campaign"
  | "utm_content"
  | "utm_term"
  | "content_id"
  | "content_type"
  | "content_category"
  | "blog_slug"
  | "campaign_id"
  | "audience_pool_id"
  | "offer_id"
  | "funnel_id"
  | "funnel_step"
  | "cta_id"
  | "cta_label"
  | "button_text"
  | "form_id"
  | "form_name"
  | "video_id"
  | "revenue_value"
  | "currency"
  | "anonymous_visitor_id"
  | "session_id"
  | "user_id"
  | "device_type"
  | "browser"
  | "country_or_region"
  | "metadata"
>;
