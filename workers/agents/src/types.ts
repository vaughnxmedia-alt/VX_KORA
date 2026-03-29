import type { AgentId, AgentStatus, KoraEvent } from "@kora/sdk"

export interface AgentContext {
  agentId: AgentId
  runId: string
  tenantId?: string
  correlationId?: string
  startedAt: Date
}

export interface AgentResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  metrics: AgentMetrics
}

export interface AgentMetrics {
  itemsProcessed: number
  itemsSucceeded: number
  itemsFailed: number
  durationMs: number
  llmTokensUsed: number
  llmCost: number
}

export interface AgentConfig {
  id: AgentId
  name: string
  enabled: boolean
  schedule?: string
  maxConcurrency: number
  timeoutMs: number
  retryAttempts: number
  retryDelayMs: number
}

export interface AgentHandler<TInput = unknown, TOutput = unknown> {
  id: AgentId
  name: string
  description: string
  execute: (input: TInput, context: AgentContext) => Promise<AgentResult<TOutput>>
  handleEvent?: (event: KoraEvent) => Promise<void>
  getStatus: () => Promise<AgentStatus>
}

export type AgentFactory<TInput = unknown, TOutput = unknown> = (
  config: AgentConfig
) => AgentHandler<TInput, TOutput>
