export const AUDIENCE_LIFECYCLE_STATUSES = [
  "draft",
  "queued",
  "in_progress",
  "needs_review",
  "complete",
  "approved",
  "activation_ready",
  "synced",
  "failed",
] as const

export type AudienceLifecycleStatus = (typeof AUDIENCE_LIFECYCLE_STATUSES)[number]

export type AudienceType = "ai_generated" | "custom" | "hybrid"

export interface AudienceProfileRecord {
  id: string
  client_id: string
  audience_name: string
  audience_type: AudienceType
  status: AudienceLifecycleStatus
  offer_id?: string | null
  service_id?: string | null
  product_id?: string | null
  campaign_id?: string | null
  confidence_score?: number | null
  completeness_score?: number | null
  last_run_at?: string | null
  created_by?: string | null
  updated_by?: string | null
  approved_by?: string | null
  created_at: string
  updated_at: string
}

export interface AudienceSegmentRecord {
  id: string
  audience_profile_id: string
  version_id?: string | null
  segment_name: string
  description?: string | null
  pain_point?: string | null
  why_they_follow?: string | null
  why_they_hesitate?: string | null
  buying_motivation?: string | null
  best_content_angle?: string | null
  best_cta?: string | null
}

export interface AudiencePersonaRecord {
  id: string
  audience_profile_id: string
  version_id?: string | null
  persona_name: string
  role_title?: string | null
  stage_of_business?: string | null
  goals?: string[] | null
  fears?: string[] | null
  objections?: string[] | null
  platforms_used?: string[] | null
  resonant_messaging?: string[] | null
  offer_fit?: string | null
}

export interface AudiencePsychologySignalRecord {
  id: string
  audience_profile_id: string
  version_id?: string | null
  motivations?: string[] | null
  fears?: string[] | null
  trust_drivers?: string[] | null
  emotional_triggers?: string[] | null
  buying_barriers?: string[] | null
}

export interface MessageAngleRecord {
  id: string
  audience_profile_id: string
  version_id?: string | null
  hooks?: string[] | null
  story_angles?: string[] | null
  educational_themes?: string[] | null
  trust_building?: string[] | null
  conversion_content?: string[] | null
  content_to_avoid?: string[] | null
}

export interface PlatformActivationSpecRecord {
  id: string
  audience_profile_id: string
  version_id?: string | null
  platform: "meta" | "tiktok" | "linkedin"
  relevance_score?: number | null
  best_content_type?: string | null
  tone_style?: string | null
  conversion_role?: string | null
  activation_status: AudienceLifecycleStatus
  sync_log?: string | null
  last_synced_at?: string | null
}

export interface AudienceAnalysisRunRecord {
  id: string
  audience_profile_id: string
  client_id: string
  status: AudienceLifecycleStatus
  trigger_source: "main_site" | "mission_control" | "intake" | "brand_strategy_session" | "manual"
  requested_by?: string | null
  assigned_to?: string | null
  confidence_score?: number | null
  version_id?: string | null
  created_at: string
  updated_at: string
  started_at?: string | null
  completed_at?: string | null
  failed_reason?: string | null
}

export interface ApprovalRequestRecord {
  id: string
  audience_profile_id: string
  analysis_run_id?: string | null
  version_id?: string | null
  status: "pending" | "approved" | "revisions_requested" | "rejected"
  requested_by?: string | null
  approved_by?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface CustomAudienceVersionRecord {
  id: string
  audience_profile_id: string
  based_on_version_id?: string | null
  source_type: AudienceType
  changed_by?: string | null
  change_notes?: string | null
  version_number: number
  status: AudienceLifecycleStatus
  created_at: string
}
