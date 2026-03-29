/**
 * Tenant Types for KORA Intelligence System
 * Defines tenant and user structures
 */

export type TenantRole = "owner" | "admin" | "member" | "viewer"

export type TenantStatus = "active" | "inactive" | "suspended" | "trial"

export interface Tenant {
  id: string
  name: string
  slug: string
  industry: string
  description: string | null
  logo_url: string | null
  website_url: string | null
  status: TenantStatus
  is_internal: boolean
  settings: TenantSettings
  created_at: string
  updated_at: string
}

export interface TenantSettings {
  default_filter_profile_id: string | null
  telegram_enabled: boolean
  rag_enabled: boolean
  auto_ingest: boolean
  ingest_frequency: "daily" | "weekly" | "manual"
  max_sources: number
  max_rag_documents: number
}

export interface TenantUser {
  id: string
  tenant_id: string
  user_id: string
  role: TenantRole
  is_primary: boolean
  permissions: string[]
  invited_by: string | null
  invited_at: string | null
  accepted_at: string | null
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface UserActivity {
  id: string
  user_id: string
  tenant_id: string
  activity_type: ActivityType
  activity_date: string
  metadata: Record<string, unknown>
  created_at: string
}

export type ActivityType =
  | "generated_strategy"
  | "approved_telegram_insight"
  | "used_rag"
  | "created_campaign"
  | "viewed_deliverable"
  | "approved_source"
  | "rejected_source"
  | "updated_filters"
  | "login"

export interface ApprovalHistoryEntry {
  id: string
  tenant_id: string
  user_id: string
  target_type: "source" | "intelligence" | "strategy" | "campaign" | "enrichment"
  target_id: string
  action: "approved" | "rejected" | "archived" | "restored"
  reason: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface ActiveDaysSummary {
  user_id: string
  tenant_id: string
  total_active_days: number
  consecutive_active_days: number
  last_active_date: string | null
  activities_by_type: Record<ActivityType, number>
  should_show_rating: boolean
}
