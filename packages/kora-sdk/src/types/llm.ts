/**
 * LLM Router Types for KORA Intelligence System
 * Defines LLM task routing, cost tracking, and model configuration
 */

export type LLMProvider = "openai" | "gemini" | "anthropic"

export type LLMModel =
  | "gpt-4o"
  | "gpt-4o-mini"
  | "gpt-4-turbo"
  | "gpt-3.5-turbo"
  | "text-embedding-3-small"
  | "text-embedding-3-large"
  | "gemini-1.5-pro"
  | "gemini-1.5-flash"
  | "gemini-2.0-flash"
  | "claude-3-5-sonnet"
  | "claude-3-haiku"

export type LLMTaskType =
  | "embeddings"
  | "classification"
  | "tagging"
  | "relevance_scoring"
  | "summarization"
  | "transcript_digestion"
  | "long_form_synthesis"
  | "weekly_brief"
  | "strategy_generation"
  | "structured_output"
  | "translation"
  | "entity_extraction"
  | "sentiment_analysis"

export interface LLMRouterConfig {
  task_mappings: Record<LLMTaskType, LLMTaskConfig>
  cost_thresholds: CostThresholds
  fallback_rules: FallbackRules
  rate_limits: RateLimits
}

export interface LLMTaskConfig {
  primary_provider: LLMProvider
  primary_model: LLMModel
  fallback_provider: LLMProvider | null
  fallback_model: LLMModel | null
  max_tokens: number
  temperature: number
  use_for_long_context: boolean
  cost_per_1k_tokens: number
}

export interface CostThresholds {
  daily_budget_usd: number
  monthly_budget_usd: number
  per_request_max_usd: number
  alert_at_percent: number
}

export interface FallbackRules {
  on_rate_limit: "queue" | "fallback" | "fail"
  on_error: "retry" | "fallback" | "fail"
  max_retries: number
  retry_delay_ms: number
}

export interface RateLimits {
  requests_per_minute: number
  tokens_per_minute: number
  concurrent_requests: number
}

export interface LLMUsageRecord {
  id: string
  agent_id: string
  tenant_id: string | null
  run_id: string | null
  task_type: LLMTaskType
  provider: LLMProvider
  model: LLMModel
  input_tokens: number
  output_tokens: number
  total_tokens: number
  cost_usd: number
  latency_ms: number
  success: boolean
  error_message: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface LLMUsageSummary {
  period: "hour" | "day" | "week" | "month"
  start_date: string
  end_date: string
  total_requests: number
  total_tokens: number
  total_cost_usd: number
  by_provider: Record<LLMProvider, ProviderUsage>
  by_task: Record<LLMTaskType, TaskUsage>
  by_agent: Record<string, AgentUsage>
}

export interface ProviderUsage {
  requests: number
  tokens: number
  cost_usd: number
  avg_latency_ms: number
  error_rate: number
}

export interface TaskUsage {
  requests: number
  tokens: number
  cost_usd: number
  provider_breakdown: Record<LLMProvider, number>
}

export interface AgentUsage {
  requests: number
  tokens: number
  cost_usd: number
  tasks: LLMTaskType[]
}

export interface LLMHealthStatus {
  provider: LLMProvider
  status: "healthy" | "degraded" | "down"
  latency_ms: number
  error_rate_1h: number
  last_check_at: string
  last_error: string | null
}

export const DEFAULT_LLM_ROUTER_CONFIG: LLMRouterConfig = {
  task_mappings: {
    embeddings: {
      primary_provider: "openai",
      primary_model: "text-embedding-3-small",
      fallback_provider: null,
      fallback_model: null,
      max_tokens: 8192,
      temperature: 0,
      use_for_long_context: false,
      cost_per_1k_tokens: 0.00002,
    },
    classification: {
      primary_provider: "openai",
      primary_model: "gpt-4o-mini",
      fallback_provider: "gemini",
      fallback_model: "gemini-1.5-flash",
      max_tokens: 1000,
      temperature: 0,
      use_for_long_context: false,
      cost_per_1k_tokens: 0.00015,
    },
    tagging: {
      primary_provider: "openai",
      primary_model: "gpt-4o-mini",
      fallback_provider: "gemini",
      fallback_model: "gemini-1.5-flash",
      max_tokens: 500,
      temperature: 0,
      use_for_long_context: false,
      cost_per_1k_tokens: 0.00015,
    },
    relevance_scoring: {
      primary_provider: "openai",
      primary_model: "gpt-4o-mini",
      fallback_provider: "gemini",
      fallback_model: "gemini-1.5-flash",
      max_tokens: 200,
      temperature: 0,
      use_for_long_context: false,
      cost_per_1k_tokens: 0.00015,
    },
    summarization: {
      primary_provider: "openai",
      primary_model: "gpt-4o-mini",
      fallback_provider: "gemini",
      fallback_model: "gemini-1.5-flash",
      max_tokens: 2000,
      temperature: 0.3,
      use_for_long_context: false,
      cost_per_1k_tokens: 0.00015,
    },
    transcript_digestion: {
      primary_provider: "gemini",
      primary_model: "gemini-1.5-pro",
      fallback_provider: "openai",
      fallback_model: "gpt-4o",
      max_tokens: 8000,
      temperature: 0.3,
      use_for_long_context: true,
      cost_per_1k_tokens: 0.00125,
    },
    long_form_synthesis: {
      primary_provider: "gemini",
      primary_model: "gemini-1.5-pro",
      fallback_provider: "openai",
      fallback_model: "gpt-4o",
      max_tokens: 4000,
      temperature: 0.5,
      use_for_long_context: true,
      cost_per_1k_tokens: 0.00125,
    },
    weekly_brief: {
      primary_provider: "gemini",
      primary_model: "gemini-1.5-pro",
      fallback_provider: "openai",
      fallback_model: "gpt-4o",
      max_tokens: 6000,
      temperature: 0.5,
      use_for_long_context: true,
      cost_per_1k_tokens: 0.00125,
    },
    strategy_generation: {
      primary_provider: "gemini",
      primary_model: "gemini-1.5-pro",
      fallback_provider: "openai",
      fallback_model: "gpt-4o",
      max_tokens: 4000,
      temperature: 0.7,
      use_for_long_context: true,
      cost_per_1k_tokens: 0.00125,
    },
    structured_output: {
      primary_provider: "openai",
      primary_model: "gpt-4o",
      fallback_provider: "gemini",
      fallback_model: "gemini-1.5-pro",
      max_tokens: 2000,
      temperature: 0,
      use_for_long_context: false,
      cost_per_1k_tokens: 0.005,
    },
    translation: {
      primary_provider: "gemini",
      primary_model: "gemini-1.5-flash",
      fallback_provider: "openai",
      fallback_model: "gpt-4o-mini",
      max_tokens: 4000,
      temperature: 0.1,
      use_for_long_context: true,
      cost_per_1k_tokens: 0.000075,
    },
    entity_extraction: {
      primary_provider: "openai",
      primary_model: "gpt-4o-mini",
      fallback_provider: "gemini",
      fallback_model: "gemini-1.5-flash",
      max_tokens: 1000,
      temperature: 0,
      use_for_long_context: false,
      cost_per_1k_tokens: 0.00015,
    },
    sentiment_analysis: {
      primary_provider: "openai",
      primary_model: "gpt-4o-mini",
      fallback_provider: "gemini",
      fallback_model: "gemini-1.5-flash",
      max_tokens: 200,
      temperature: 0,
      use_for_long_context: false,
      cost_per_1k_tokens: 0.00015,
    },
  },
  cost_thresholds: {
    daily_budget_usd: 50,
    monthly_budget_usd: 1000,
    per_request_max_usd: 1,
    alert_at_percent: 80,
  },
  fallback_rules: {
    on_rate_limit: "queue",
    on_error: "retry",
    max_retries: 3,
    retry_delay_ms: 1000,
  },
  rate_limits: {
    requests_per_minute: 100,
    tokens_per_minute: 100000,
    concurrent_requests: 10,
  },
}
