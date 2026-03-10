/**
 * Source Types for KORA Intelligence System
 * Defines data sources for intelligence collection
 */

export type SourceType = "rss" | "youtube" | "social" | "web" | "search"

export type SourceStatus = "active" | "inactive" | "error" | "pending_approval"

export type ApprovalStatus = "pending" | "approved" | "rejected" | "archived"

export interface Source {
  id: string
  name: string
  source_type: SourceType
  url: string
  tenant_id: string | null
  status: SourceStatus
  is_active: boolean
  approval_status: ApprovalStatus
  filter_profile_id: string | null
  filter_profile_name: string | null
  relevance_score: number | null
  last_checked_at: string | null
  next_check_at: string | null
  check_frequency_hours: number
  items_count: number
  error_count: number
  error_rate: number
  last_error: string | null
  metadata: SourceMetadata
  created_at: string
  updated_at: string
}

export interface SourceMetadata {
  author?: string
  description?: string
  language?: string
  category?: string
  tags?: string[]
  feed_type?: string
  channel_id?: string
  platform?: string
  subscriber_count?: number
  post_frequency?: string
}

export interface SourceCandidate {
  id: string
  url: string
  source_type: SourceType
  discovered_via: "search" | "recommendation" | "manual" | "crawl"
  suggested_name: string
  suggested_category: string | null
  relevance_score: number
  tenant_id: string | null
  status: "pending" | "approved" | "rejected"
  metadata: Record<string, unknown>
  created_at: string
}

export interface SourceCheck {
  id: string
  source_id: string
  status: "success" | "error" | "timeout"
  items_found: number
  new_items: number
  duration_ms: number
  error_message: string | null
  checked_at: string
}
