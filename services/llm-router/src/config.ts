import type { RouterConfig, TaskMapping } from "./types"

/**
 * Default task-to-model mappings
 * 
 * Strategy:
 * - Content generation: Use GPT-4o-mini for cost efficiency
 * - Summarization: Gemini Flash for speed
 * - Classification: GPT-4o-mini for accuracy
 * - Embeddings: text-embedding-3-small for cost
 * - Analysis: GPT-4o for complex reasoning
 */
export const DEFAULT_TASK_MAPPINGS: TaskMapping[] = [
  {
    taskType: "content_generation",
    primaryProvider: "openai",
    primaryModel: "gpt-4o-mini",
    fallbackProvider: "gemini",
    fallbackModel: "gemini-1.5-flash",
    maxTokens: 2000,
    temperature: 0.7,
    estimatedCostPer1kTokens: 0.00015
  },
  {
    taskType: "summarization",
    primaryProvider: "gemini",
    primaryModel: "gemini-1.5-flash",
    fallbackProvider: "openai",
    fallbackModel: "gpt-4o-mini",
    maxTokens: 500,
    temperature: 0.3,
    estimatedCostPer1kTokens: 0.000075
  },
  {
    taskType: "classification",
    primaryProvider: "openai",
    primaryModel: "gpt-4o-mini",
    fallbackProvider: "gemini",
    fallbackModel: "gemini-1.5-flash",
    maxTokens: 100,
    temperature: 0.1,
    estimatedCostPer1kTokens: 0.00015
  },
  {
    taskType: "entity_extraction",
    primaryProvider: "openai",
    primaryModel: "gpt-4o-mini",
    fallbackProvider: "gemini",
    fallbackModel: "gemini-1.5-flash",
    maxTokens: 500,
    temperature: 0.2,
    estimatedCostPer1kTokens: 0.00015
  },
  {
    taskType: "embedding",
    primaryProvider: "openai",
    primaryModel: "text-embedding-3-small",
    fallbackProvider: "openai",
    fallbackModel: "text-embedding-3-small",
    maxTokens: 8191,
    temperature: 0,
    estimatedCostPer1kTokens: 0.00002
  },
  {
    taskType: "strategy_generation",
    primaryProvider: "openai",
    primaryModel: "gpt-4o",
    fallbackProvider: "gemini",
    fallbackModel: "gemini-1.5-pro",
    maxTokens: 4000,
    temperature: 0.8,
    estimatedCostPer1kTokens: 0.005
  },
  {
    taskType: "analysis",
    primaryProvider: "openai",
    primaryModel: "gpt-4o",
    fallbackProvider: "gemini",
    fallbackModel: "gemini-1.5-pro",
    maxTokens: 2000,
    temperature: 0.5,
    estimatedCostPer1kTokens: 0.005
  },
  {
    taskType: "briefing_generation",
    primaryProvider: "openai",
    primaryModel: "gpt-4o-mini",
    fallbackProvider: "gemini",
    fallbackModel: "gemini-1.5-flash",
    maxTokens: 1500,
    temperature: 0.6,
    estimatedCostPer1kTokens: 0.00015
  }
]

export const DEFAULT_ROUTER_CONFIG: RouterConfig = {
  taskMappings: DEFAULT_TASK_MAPPINGS,
  costThresholds: {
    dailyBudget: 50,
    monthlyBudget: 1000,
    alertThreshold: 0.8
  },
  fallbackEnabled: true,
  cachingEnabled: true,
  loggingEnabled: true
}

/**
 * Model pricing per 1K tokens (input/output)
 * Prices as of March 2026 - should be updated periodically
 */
export const MODEL_PRICING = {
  "openai": {
    "gpt-4o": { input: 0.005, output: 0.015 },
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    "gpt-4-turbo": { input: 0.01, output: 0.03 },
    "text-embedding-3-small": { input: 0.00002, output: 0 },
    "text-embedding-3-large": { input: 0.00013, output: 0 }
  },
  "gemini": {
    "gemini-1.5-pro": { input: 0.00125, output: 0.005 },
    "gemini-1.5-flash": { input: 0.000075, output: 0.0003 },
    "gemini-1.0-pro": { input: 0.0005, output: 0.0015 }
  }
} as const
