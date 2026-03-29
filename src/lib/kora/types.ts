/**
 * K.O.R.A Backend Integration Types
 * 
 * These types define the data contract between the client portal and the KORA backend.
 * The website only writes "requests" (events). Agents write outputs.
 */

// Tenant context resolved server-side from auth session
export interface TenantContext {
  tenant_id: string;
  user_id: string;
  role: TenantRole;
}

export type TenantRole = "owner" | "admin" | "member" | "viewer";

// Event types for the kora_events job queue
export type KoraEventType =
  | "content_strategy_requested"
  | "content_strategy_completed"
  | "content_strategy_failed"
  | "campaign_requested"
  | "campaign_completed"
  | "campaign_failed";

export type KoraEventStatus = "pending" | "processing" | "completed" | "failed";

// Content Strategy types
export type ContentStrategyStatus = "requested" | "processing" | "completed" | "failed";

export interface ContentStrategyWindow {
  days: 7 | 14 | 30 | 60 | 90;
  start_date?: string;
  end_date?: string;
}

export interface ContentStrategyRequestPayload {
  window: ContentStrategyWindow;
  platforms: string[];
  goals: string[];
  tone?: string;
  constraints?: string;
  additional_context?: string;
}

export interface ContentStrategyOutput {
  id: string;
  tenant_id: string;
  request_id: string;
  status: ContentStrategyStatus;
  title: string;
  summary?: string;
  platforms: string[];
  goals: string[];
  window: ContentStrategyWindow;
  content_pillars?: ContentPillar[];
  weekly_themes?: WeeklyTheme[];
  post_cadence?: PostCadence;
  key_messages?: string[];
  hashtag_strategy?: HashtagStrategy;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface ContentPillar {
  id: string;
  name: string;
  description: string;
  percentage: number;
  example_topics: string[];
}

export interface WeeklyTheme {
  week_number: number;
  theme: string;
  focus_pillar: string;
  key_dates?: string[];
}

export interface PostCadence {
  posts_per_week: number;
  platform_breakdown: Record<string, number>;
  best_posting_times: Record<string, string[]>;
}

export interface HashtagStrategy {
  branded: string[];
  industry: string[];
  trending_relevant: string[];
  niche: string[];
}

// Campaign types
export type CampaignRequestStatus = "requested" | "processing" | "completed" | "failed";

export interface CampaignRequestPayload {
  content_strategy_id: string;
  platform: string;
  objective: CampaignObjective;
  cta: string;
  length: CampaignLength;
  timeline: CampaignTimeline;
  offer?: string;
  constraints?: string;
  target_audience_override?: string;
}

export type CampaignObjective =
  | "awareness"
  | "engagement"
  | "traffic"
  | "leads"
  | "sales"
  | "retention";

export type CampaignLength = "single_post" | "series_3" | "series_5" | "series_7" | "full_campaign";

export interface CampaignTimeline {
  start_date: string;
  end_date?: string;
  publish_immediately?: boolean;
}

export interface CampaignOutput {
  id: string;
  tenant_id: string;
  request_id: string;
  content_strategy_id: string;
  status: CampaignRequestStatus;
  platform: string;
  objective: CampaignObjective;
  title: string;
  posts?: CampaignPost[];
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface CampaignPost {
  id: string;
  sequence_number: number;
  scheduled_date?: string;
  caption: string;
  hashtags: string[];
  media_suggestions?: MediaSuggestion[];
  cta: string;
  notes?: string;
}

export interface MediaSuggestion {
  type: "image" | "video" | "carousel" | "story" | "reel";
  description: string;
  dimensions?: string;
  duration_seconds?: number;
}

// API Request/Response types
export interface RequestContentStrategyRequest {
  window: ContentStrategyWindow;
  platforms: string[];
  goals: string[];
  tone?: string;
  constraints?: string;
  additional_context?: string;
}

export interface RequestContentStrategyResponse {
  success: boolean;
  event_id: string;
  request_id: string;
  message: string;
}

export interface RequestCampaignRequest {
  content_strategy_id: string;
  platform: string;
  objective: CampaignObjective;
  cta: string;
  length: CampaignLength;
  timeline: CampaignTimeline;
  offer?: string;
  constraints?: string;
  target_audience_override?: string;
}

export interface RequestCampaignResponse {
  success: boolean;
  event_id: string;
  request_id: string;
  message: string;
}

// List/Query response types
export interface ContentStrategiesListResponse {
  strategies: ContentStrategyOutput[];
  total: number;
}

export interface CampaignsListResponse {
  campaigns: CampaignOutput[];
  total: number;
}

// Error response
export interface KoraErrorResponse {
  success: false;
  error: string;
  code?: string;
}

// Database row types (for Supabase)
export interface TenantUserRow {
  id: string;
  user_id: string;
  tenant_id: string;
  role: TenantRole;
  created_at: string;
  updated_at: string;
}

export interface KoraEventRow {
  id: string;
  tenant_id: string;
  event_type: KoraEventType;
  status: KoraEventStatus;
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  error_message?: string;
  created_at: string;
  updated_at: string;
  processed_at?: string;
}

export interface ContentStrategyRequestRow {
  id: string;
  tenant_id: string;
  event_id: string;
  status: ContentStrategyStatus;
  payload: ContentStrategyRequestPayload;
  created_at: string;
  updated_at: string;
}

export interface ContentStrategyRow {
  id: string;
  tenant_id: string;
  request_id: string;
  status: ContentStrategyStatus;
  title: string;
  summary?: string;
  platforms: string[];
  goals: string[];
  window_days: number;
  window_start?: string;
  window_end?: string;
  output_json?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface CampaignRequestRow {
  id: string;
  tenant_id: string;
  event_id: string;
  content_strategy_id: string;
  status: CampaignRequestStatus;
  payload: CampaignRequestPayload;
  created_at: string;
  updated_at: string;
}

export interface CampaignOutputRow {
  id: string;
  tenant_id: string;
  request_id: string;
  content_strategy_id: string;
  status: CampaignRequestStatus;
  platform: string;
  objective: CampaignObjective;
  title: string;
  output_json?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

/** Non-secret integration status row (from list_integration_api_status RPC). */
export interface IntegrationApiStatus {
  id: string;
  tenant_id: string;
  provider: string;
  credential_kind: string;
  key_hint: string | null;
  updated_at: string;
}

export interface SaveIntegrationApiKeyResponse {
  ok: boolean;
  masked_hint?: string;
  error?: string;
}
