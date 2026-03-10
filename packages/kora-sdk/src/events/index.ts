/**
 * KORA Event Contracts
 * Defines the event types and payloads for inter-agent communication
 */

import type { AgentId } from "../types/agents"
import type { SourceType } from "../types/sources"
import type { LLMTaskType } from "../types/llm"

export type KoraEventType =
  // Source Discovery Events
  | "source.discovered"
  | "source.approved"
  | "source.rejected"
  | "source.check.completed"
  | "source.check.failed"
  // Source Processing Events
  | "content.scraped"
  | "content.transcribed"
  | "content.translated"
  | "content.parsed"
  | "content.normalized"
  // Core Intelligence Events
  | "intelligence.scored"
  | "intelligence.routed"
  | "intelligence.enriched"
  | "insight.generated"
  | "insight.approved"
  // Content Strategy Events
  | "strategy.requested"
  | "strategy.generated"
  | "strategy.approved"
  | "strategy.rejected"
  // Campaign Events
  | "campaign.requested"
  | "campaign.generated"
  | "campaign.approved"
  | "campaign.published"
  // Telegram Events
  | "telegram.message.sent"
  | "telegram.message.delivered"
  | "telegram.approval.received"
  | "telegram.brief.scheduled"
  // RAG Events
  | "rag.document.added"
  | "rag.document.removed"
  | "rag.embedding.created"
  | "rag.query.executed"
  // System Events
  | "agent.started"
  | "agent.completed"
  | "agent.failed"
  | "ingest.run.started"
  | "ingest.run.completed"

export type KoraEventStatus = "pending" | "processing" | "completed" | "failed"

export interface KoraEvent<T = unknown> {
  id: string
  event_type: KoraEventType
  status: KoraEventStatus
  tenant_id: string | null
  agent_id: AgentId | null
  correlation_id: string | null
  payload: T
  result: unknown | null
  error_message: string | null
  created_at: string
  processed_at: string | null
}

// Source Discovery Event Payloads
export interface SourceDiscoveredPayload {
  url: string
  source_type: SourceType
  discovered_via: "search" | "recommendation" | "manual" | "crawl"
  suggested_name: string
  metadata: Record<string, unknown>
}

export interface SourceApprovedPayload {
  source_id: string
  approved_by: string
  filter_profile_id: string | null
}

// Source Processing Event Payloads
export interface ContentScrapedPayload {
  source_id: string
  item_id: string
  url: string
  raw_content: string
  content_type: string
}

export interface ContentParsedPayload {
  item_id: string
  title: string
  summary: string
  entities: Array<{ name: string; type: string }>
  categories: string[]
  language: string
}

// Core Intelligence Event Payloads
export interface IntelligenceScoredPayload {
  item_id: string
  tenant_scores: Array<{
    tenant_id: string
    score: number
    matched_filters: string[]
  }>
}

export interface IntelligenceRoutedPayload {
  item_id: string
  tenant_id: string
  rag_document_id: string
  approval_type: "auto" | "manual"
}

export interface InsightGeneratedPayload {
  insight_id: string
  tenant_id: string
  title: string
  source_items: string[]
}

// Content Strategy Event Payloads
export interface StrategyRequestedPayload {
  tenant_id: string
  user_id: string
  platforms: string[]
  goals: string[]
  window_days: number
}

export interface StrategyGeneratedPayload {
  strategy_id: string
  tenant_id: string
  title: string
  pillars_count: number
}

// Campaign Event Payloads
export interface CampaignRequestedPayload {
  tenant_id: string
  user_id: string
  strategy_id: string
  platform: string
  objective: string
}

export interface CampaignGeneratedPayload {
  campaign_id: string
  tenant_id: string
  title: string
  posts_count: number
}

// Telegram Event Payloads
export interface TelegramMessageSentPayload {
  message_id: string
  tenant_id: string
  chat_id: string
  message_type: string
}

export interface TelegramApprovalReceivedPayload {
  message_id: string
  tenant_id: string
  target_id: string
  target_type: string
  action: "approved" | "rejected" | "saved" | "snoozed"
}

// RAG Event Payloads
export interface RAGDocumentAddedPayload {
  document_id: string
  tenant_id: string
  intelligence_item_id: string
  embedding_id: string
}

// System Event Payloads
export interface AgentStartedPayload {
  agent_id: AgentId
  run_id: string
  trigger: "scheduled" | "manual" | "webhook" | "event"
}

export interface AgentCompletedPayload {
  agent_id: AgentId
  run_id: string
  duration_ms: number
  items_processed: number
  success_count: number
  failure_count: number
}

export interface IngestRunStartedPayload {
  run_id: string
  tenant_id: string | null
  sources_count: number
  trigger: "scheduled" | "manual"
}

export interface IngestRunCompletedPayload {
  run_id: string
  tenant_id: string | null
  items_discovered: number
  items_processed: number
  items_routed: number
  duration_ms: number
  llm_cost: number
}

// Event Factory Functions
export function createEvent<T>(
  event_type: KoraEventType,
  payload: T,
  options?: {
    tenant_id?: string
    agent_id?: AgentId
    correlation_id?: string
  }
): Omit<KoraEvent<T>, "id" | "created_at"> {
  return {
    event_type,
    status: "pending",
    tenant_id: options?.tenant_id ?? null,
    agent_id: options?.agent_id ?? null,
    correlation_id: options?.correlation_id ?? null,
    payload,
    result: null,
    error_message: null,
    processed_at: null,
  }
}
