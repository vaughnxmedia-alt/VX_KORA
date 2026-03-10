/**
 * Agent Types for KORA Intelligence System
 * Defines the structure and status of all backend agents
 */

export type AgentId =
  | "source-discovery"
  | "source-processing"
  | "core-intelligence"
  | "content-strategy"
  | "campaign-assembly"
  | "telegram-delivery"
  | "rag-intelligence"
  | "intake-clarifier"

export type AgentStatus = "idle" | "running" | "healthy" | "warning" | "error" | "disabled"

export type AgentRunStatus = "pending" | "running" | "completed" | "failed" | "cancelled"

export interface Agent {
  id: AgentId
  name: string
  description: string
  status: AgentStatus
  last_run_at: string | null
  next_run_at: string | null
  error_rate_24h: number
  avg_duration_ms: number
  total_runs_24h: number
  successful_runs_24h: number
  created_at: string
  updated_at: string
}

export interface AgentRun {
  id: string
  agent_id: AgentId
  tenant_id: string | null
  status: AgentRunStatus
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  items_processed: number
  items_succeeded: number
  items_failed: number
  error_message: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface AgentQueue {
  id: string
  agent_id: AgentId
  tenant_id: string | null
  payload: Record<string, unknown>
  priority: number
  status: "pending" | "processing" | "completed" | "failed"
  attempts: number
  max_attempts: number
  scheduled_for: string | null
  processed_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface AgentLog {
  id: string
  agent_id: AgentId
  run_id: string | null
  level: "debug" | "info" | "warn" | "error"
  message: string
  metadata: Record<string, unknown>
  timestamp: string
}

export interface AgentHealth {
  agent_id: AgentId
  status: AgentStatus
  last_heartbeat: string | null
  queue_depth: number
  processing_rate: number
  error_rate: number
  avg_latency_ms: number
  memory_usage_mb: number | null
  cpu_usage_percent: number | null
}

export interface AgentConfig {
  agent_id: AgentId
  enabled: boolean
  schedule_cron: string | null
  max_concurrent: number
  timeout_ms: number
  retry_attempts: number
  retry_delay_ms: number
  config: Record<string, unknown>
  updated_at: string
}
