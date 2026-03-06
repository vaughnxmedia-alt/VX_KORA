export interface Tenant {
  id: string
  name: string
  slug: string
  industry: string
  target_audience: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TenantProfile {
  id: string
  tenant_id: string
  company_description: string
  keywords: string[]
  competitors: string[]
  content_preferences: {
    tone: string
    formats: string[]
    frequency: string
  }
  created_at: string
  updated_at: string
}

export interface GlobalRssItem {
  id: string
  title: string
  url: string
  source_name: string
  source_id: string
  content: string
  snippet: string
  published_at: string
  categories: string[]
  author: string | null
  image_url: string | null
  is_distributed: boolean
  created_at: string
}

export interface GlobalIngestRun {
  id: string
  started_at: string
  finished_at: string | null
  status: "running" | "completed" | "failed" | "completed_with_errors"
  sources_count: number
  items_seen: number
  items_inserted: number
  items_skipped: number
  errors_count: number
  errors: { message: string; source?: string }[]
  duration_ms: number | null
}

export interface TenantItemQueue {
  id: string
  tenant_id: string
  global_item_id: string
  relevance_score: number
  relevance_reasons: string[]
  is_processed: boolean
  processed_at: string | null
  created_at: string
  item?: GlobalRssItem
}

export interface TenantRoutingRun {
  id: string
  tenant_id: string
  started_at: string
  finished_at: string | null
  status: "running" | "completed" | "failed"
  items_evaluated: number
  items_routed: number
  avg_relevance_score: number
  duration_ms: number | null
}

export type KoraEventType =
  | "global_ingest_requested"
  | "global_ingest_completed"
  | "tenant_routing_requested"
  | "tenant_routing_completed"
  | "enrichment_requested"
  | "enrichment_completed"
  | "rag_sync_requested"
  | "rag_sync_completed"
  | "strategy_generation_requested"
  | "strategy_generation_completed"

export interface KoraEvent {
  id: string
  event_type: KoraEventType
  tenant_id: string | null
  payload: Record<string, unknown>
  created_at: string
  processed_at: string | null
  locked_by: string | null
  locked_at: string | null
  error_message: string | null
  retry_count: number
  max_retries: number
  status: "pending" | "processing" | "completed" | "failed" | "dead_letter"
}

export interface ContentStrategy {
  id: string
  tenant_id: string
  title: string
  status: "draft" | "active" | "archived"
  strategy_data: {
    executive_summary: string
    target_personas: string[]
    content_pillars: {
      name: string
      description: string
      topics: string[]
    }[]
    recommended_channels: string[]
    content_calendar: {
      frequency: string
      themes: string[]
    }
    key_messages: string[]
    competitive_positioning: string
  }
  insights_used: string[]
  created_at: string
  updated_at: string
}

export interface AgentHealth {
  agent_name: string
  status: "healthy" | "warning" | "down"
  last_run_at: string | null
  last_run_status: "completed" | "failed" | "running" | null
  error_rate_24h: number
  avg_duration_ms: number
}

export interface ActivityItem {
  id: string
  type: "ingest" | "routing" | "enrichment" | "rag_sync" | "strategy" | "error"
  title: string
  description: string
  tenant_id: string | null
  tenant_name: string | null
  timestamp: string
}
