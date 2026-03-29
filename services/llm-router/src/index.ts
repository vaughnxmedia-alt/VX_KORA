/**
 * KORA LLM Router Service
 * 
 * Cost-aware, task-based routing layer for LLM requests.
 * Automatically selects the most appropriate model based on task type,
 * tracks usage, and manages cost budgets.
 * 
 * @packageDocumentation
 */

export { LLMRouter, getLLMRouter } from "./router"
export { DEFAULT_ROUTER_CONFIG, DEFAULT_TASK_MAPPINGS, MODEL_PRICING } from "./config"
export type {
  LLMRequest,
  LLMResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  TaskMapping,
  RouterConfig,
  UsageStats
} from "./types"

export const LLM_ROUTER_VERSION = "1.0.0"
