/**
 * Intelligence Types for KORA Intelligence System
 * Defines the global intelligence pool, tenant RAG, and enrichment structures
 */

import type { SourceType, ApprovalStatus } from "./sources"

export type IntelligenceStatus = "discovered" | "processing" | "ready" | "routed" | "archived" | "rejected"

export type ContentType = "article" | "video" | "podcast" | "social_post" | "event" | "report" | "thread"

export type ParserStatus = "pending" | "parsed" | "enriched" | "failed"

export interface GlobalIntelligenceItem {
  id: string
  source_id: string
  source_name: string
  source_type: SourceType
  content_type: ContentType
  title: string
  url: string
  extracted_summary: string | null
  raw_content: string | null
  raw_type: string
  language: string
  author: string | null
  published_at: string | null
  discovered_at: string
  status: IntelligenceStatus
  parser_status: ParserStatus
  tenant_matches: TenantMatch[]
  relevance_scores: Record<string, number>
  categories: string[]
  entities: ExtractedEntity[]
  sentiment: number | null
  is_event: boolean
  event_data: EventData | null
  embedding_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface TenantMatch {
  tenant_id: string
  tenant_name: string
  relevance_score: number
  matched_keywords: string[]
  matched_topics: string[]
  filter_profile_id: string
  recommended_action: "route" | "review" | "skip"
}

export interface ExtractedEntity {
  name: string
  type: "person" | "organization" | "location" | "product" | "event" | "topic"
  confidence: number
  context: string | null
}

export interface EventData {
  event_title: string
  event_date: string | null
  event_end_date: string | null
  location: string | null
  is_virtual: boolean
  registration_url: string | null
  price: string | null
  organizer: string | null
}

export interface TenantRAGDocument {
  id: string
  tenant_id: string
  intelligence_item_id: string
  source_id: string
  title: string
  content: string
  summary: string
  embedding_id: string
  approval_source: "auto" | "manual" | "telegram"
  approved_by: string | null
  approved_at: string
  strategy_linkage: string[]
  usage_count: number
  last_used_at: string | null
  quality_score: number | null
  is_active: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface EnrichmentQueueItem {
  id: string
  intelligence_item_id: string
  tenant_id: string | null
  enrichment_type: "make_smarter" | "telegram_brief" | "strategy_candidate" | "rag_addition" | "review"
  status: "pending" | "processing" | "completed" | "rejected"
  priority: number
  requested_by: string | null
  processed_by: string | null
  result: EnrichmentResult | null
  created_at: string
  processed_at: string | null
}

export interface EnrichmentResult {
  action_taken: "approved" | "rejected" | "sent_to_telegram" | "added_to_rag" | "converted_to_strategy"
  output_id: string | null
  notes: string | null
}

export interface IngestRun {
  id: string
  agent_id: string
  tenant_id: string | null
  trigger_source: "scheduled" | "manual" | "webhook" | "event"
  status: "pending" | "running" | "completed" | "failed"
  started_at: string
  completed_at: string | null
  sources_processed: number
  items_discovered: number
  items_processed: number
  items_embedded: number
  items_routed: number
  telegram_sends: number
  llm_tokens_used: number
  llm_cost_estimate: number
  model_usage: ModelUsageSummary
  error_message: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface ModelUsageSummary {
  openai_tokens: number
  openai_cost: number
  gemini_tokens: number
  gemini_cost: number
  tasks: Record<string, { model: string; tokens: number; cost: number }>
}

export interface InsightArticle {
  id: string
  tenant_id: string
  title: string
  summary: string
  full_content: string
  source_items: string[]
  key_takeaways: string[]
  recommended_actions: string[]
  relevance_score: number
  status: "draft" | "pending_approval" | "approved" | "sent" | "rejected"
  telegram_message_id: string | null
  sent_at: string | null
  approved_at: string | null
  created_at: string
}

export interface ContentStrategyRecommendation {
  id: string
  tenant_id: string
  insight_article_id: string | null
  title: string
  description: string
  strategy_type: "content_pillar" | "campaign_idea" | "trending_topic" | "audience_insight"
  platforms: string[]
  suggested_content: SuggestedContent[]
  relevance_score: number
  status: "suggested" | "pending_approval" | "approved" | "rejected" | "implemented"
  telegram_message_id: string | null
  approved_at: string | null
  implemented_at: string | null
  created_at: string
}

export interface SuggestedContent {
  format: string
  hook: string
  key_points: string[]
  call_to_action: string
  hashtags: string[]
  best_time: string | null
}
