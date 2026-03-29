import type { LLMProvider, LLMModel, LLMTaskType } from "@kora/sdk"

export interface LLMRequest {
  taskType: LLMTaskType
  prompt: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  tenantId?: string
  agentId?: string
  correlationId?: string
  preferredProvider?: LLMProvider
  requireStreaming?: boolean
}

export interface LLMResponse {
  content: string
  provider: LLMProvider
  model: LLMModel
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  cost: {
    inputCost: number
    outputCost: number
    totalCost: number
    currency: "USD"
  }
  latencyMs: number
  cached: boolean
}

export interface EmbeddingRequest {
  input: string | string[]
  tenantId?: string
  agentId?: string
}

export interface EmbeddingResponse {
  embeddings: number[][]
  provider: LLMProvider
  model: string
  usage: {
    totalTokens: number
  }
  cost: {
    totalCost: number
    currency: "USD"
  }
}

export interface TaskMapping {
  taskType: LLMTaskType
  primaryProvider: LLMProvider
  primaryModel: LLMModel
  fallbackProvider: LLMProvider
  fallbackModel: LLMModel
  maxTokens: number
  temperature: number
  estimatedCostPer1kTokens: number
}

export interface RouterConfig {
  taskMappings: TaskMapping[]
  costThresholds: {
    dailyBudget: number
    monthlyBudget: number
    alertThreshold: number
  }
  fallbackEnabled: boolean
  cachingEnabled: boolean
  loggingEnabled: boolean
}

export interface UsageStats {
  periodStart: Date
  periodEnd: Date
  totalRequests: number
  totalTokens: number
  totalCost: number
  byProvider: Record<LLMProvider, {
    requests: number
    tokens: number
    cost: number
  }>
  byTask: Record<LLMTaskType, {
    requests: number
    tokens: number
    cost: number
    avgLatencyMs: number
  }>
}
