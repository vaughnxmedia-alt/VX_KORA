// LLM routing and execution types

export type LLMProvider = "openai" | "gemini" | "anthropic"

export type LLMModel = 
  // OpenAI models
  | "gpt-4o"
  | "gpt-4o-mini"
  | "gpt-4-turbo"
  | "gpt-3.5-turbo"
  | "text-embedding-3-small"
  | "text-embedding-3-large"
  // Gemini models
  | "gemini-1.5-pro"
  | "gemini-1.5-flash"
  | "gemini-2.0-flash"
  // Anthropic models
  | "claude-3-5-sonnet"
  | "claude-3-haiku"

export type LLMTaskType = 
  // ============================================================================
  // OPENAI TASKS - Extraction, Embeddings, Classification, Cleanup, Structured Output
  // ============================================================================
  | "embeddings"                    // Vector embeddings for RAG
  | "classification"                // Content/source classification
  | "tagging"                       // Tagging content with labels
  | "structured_output"             // Final structured JSON output
  | "json_formatting"               // Format data as clean JSON
  | "schema_enforcement"            // Validate and enforce schema
  | "cleanup"                       // Clean and normalize text
  | "entity_extraction"             // Extract entities from text
  | "relevance_scoring"             // Score content relevance (0-1)
  | "sentiment_analysis"            // Analyze sentiment
  | "summarization"                 // Create summaries
  | "quality_review"                // Review output quality
  | "intake_clarification"          // Clarify user intake responses
  | "data_normalization"            // Normalize extracted data
  | "keyword_extraction"            // Extract keywords from content
  | "topic_detection"               // Detect topics in content
  | "language_detection"            // Detect content language
  | "spam_detection"                // Detect spam/low-quality content
  | "duplicate_detection"           // Detect duplicate content
  | "campaign_formatting"           // Format campaign objects
  
  // ============================================================================
  // GEMINI TASKS - Deep Reasoning, Long-Context, Synthesis, Research Digestion
  // ============================================================================
  | "long_context_synthesis"        // Synthesize large documents
  | "website_analysis"              // Analyze website content
  | "profile_analysis"              // Analyze social profiles
  | "transcript_digestion"          // Digest video/audio transcripts
  | "strategy_reasoning"            // Deep strategic reasoning
  | "brand_synthesis"               // Synthesize brand identity
  | "audience_synthesis"            // Synthesize audience insights
  | "research_digestion"            // Digest research findings
  | "source_comparison"             // Compare multiple sources
  | "trend_analysis"                // Analyze trends across data
  | "competitive_analysis"          // Analyze competitors
  | "market_intelligence"           // Market intelligence synthesis
  | "content_strategy_generation"   // Generate content strategies
  | "insight_generation"            // Generate strategic insights
  | "weekly_brief_generation"       // Generate weekly intelligence briefs
  | "translation_synthesis"         // Translate with context preservation
  | "profile_understanding"         // Deep profile understanding
  | "industry_analysis"             // Industry-wide analysis
  | "campaign_strategy"             // Campaign strategy reasoning

export interface LLMTaskRouting {
  provider: LLMProvider
  model: LLMModel
  fallbackProvider?: LLMProvider
  fallbackModel?: LLMModel
  maxTokens?: number
  temperature?: number
}

export const TASK_ROUTING: Record<LLMTaskType, LLMTaskRouting> = {
  // ============================================================================
  // OPENAI TASKS
  // Use for: Extraction, Embeddings, Classification, Cleanup, Structured Output
  // Strengths: Deterministic JSON, fast classification, reliable schema enforcement
  // ============================================================================
  
  embeddings: { 
    provider: "openai", 
    model: "text-embedding-3-small" 
  },
  classification: { 
    provider: "openai", 
    model: "gpt-4o-mini",
    temperature: 0.2
  },
  tagging: { 
    provider: "openai", 
    model: "gpt-4o-mini",
    temperature: 0.2
  },
  structured_output: { 
    provider: "openai", 
    model: "gpt-4o",
    temperature: 0.3
  },
  json_formatting: { 
    provider: "openai", 
    model: "gpt-4o",
    temperature: 0.2
  },
  schema_enforcement: { 
    provider: "openai", 
    model: "gpt-4o",
    temperature: 0.1
  },
  cleanup: { 
    provider: "openai", 
    model: "gpt-4o-mini",
    temperature: 0.2
  },
  entity_extraction: { 
    provider: "openai", 
    model: "gpt-4o",
    temperature: 0.2
  },
  relevance_scoring: { 
    provider: "openai", 
    model: "gpt-4o-mini",
    temperature: 0.1
  },
  sentiment_analysis: { 
    provider: "openai", 
    model: "gpt-4o-mini",
    temperature: 0.2
  },
  summarization: { 
    provider: "openai", 
    model: "gpt-4o-mini",
    temperature: 0.4
  },
  quality_review: { 
    provider: "openai", 
    model: "gpt-4o",
    temperature: 0.2
  },
  intake_clarification: { 
    provider: "openai", 
    model: "gpt-4o",
    temperature: 0.3
  },
  data_normalization: { 
    provider: "openai", 
    model: "gpt-4o-mini",
    temperature: 0.1
  },
  keyword_extraction: { 
    provider: "openai", 
    model: "gpt-4o-mini",
    temperature: 0.2
  },
  topic_detection: { 
    provider: "openai", 
    model: "gpt-4o-mini",
    temperature: 0.2
  },
  language_detection: { 
    provider: "openai", 
    model: "gpt-4o-mini",
    temperature: 0.1
  },
  spam_detection: { 
    provider: "openai", 
    model: "gpt-4o-mini",
    temperature: 0.1
  },
  duplicate_detection: { 
    provider: "openai", 
    model: "gpt-4o-mini",
    temperature: 0.1
  },
  campaign_formatting: { 
    provider: "openai", 
    model: "gpt-4o",
    temperature: 0.2
  },
  
  // ============================================================================
  // GEMINI TASKS
  // Use for: Deep Reasoning, Long-Context Synthesis, Profile Understanding, Research
  // Strengths: 1M+ token context, nuanced reasoning, complex synthesis
  // ============================================================================
  
  long_context_synthesis: { 
    provider: "gemini", 
    model: "gemini-1.5-pro",
    fallbackProvider: "openai",
    fallbackModel: "gpt-4o",
    temperature: 0.7
  },
  website_analysis: { 
    provider: "gemini", 
    model: "gemini-1.5-flash",
    temperature: 0.5
  },
  profile_analysis: { 
    provider: "gemini", 
    model: "gemini-1.5-flash",
    temperature: 0.5
  },
  transcript_digestion: { 
    provider: "gemini", 
    model: "gemini-1.5-pro",
    temperature: 0.5
  },
  strategy_reasoning: { 
    provider: "gemini", 
    model: "gemini-1.5-pro",
    fallbackProvider: "openai",
    fallbackModel: "gpt-4o",
    temperature: 0.7
  },
  brand_synthesis: { 
    provider: "gemini", 
    model: "gemini-1.5-pro",
    fallbackProvider: "openai",
    fallbackModel: "gpt-4o",
    temperature: 0.7
  },
  audience_synthesis: { 
    provider: "gemini", 
    model: "gemini-1.5-pro",
    fallbackProvider: "openai",
    fallbackModel: "gpt-4o",
    temperature: 0.7
  },
  research_digestion: { 
    provider: "gemini", 
    model: "gemini-1.5-pro",
    temperature: 0.6
  },
  source_comparison: { 
    provider: "gemini", 
    model: "gemini-1.5-pro",
    temperature: 0.5
  },
  trend_analysis: { 
    provider: "gemini", 
    model: "gemini-1.5-pro",
    temperature: 0.6
  },
  competitive_analysis: { 
    provider: "gemini", 
    model: "gemini-1.5-pro",
    temperature: 0.6
  },
  market_intelligence: { 
    provider: "gemini", 
    model: "gemini-1.5-pro",
    temperature: 0.6
  },
  content_strategy_generation: { 
    provider: "gemini", 
    model: "gemini-1.5-pro",
    fallbackProvider: "openai",
    fallbackModel: "gpt-4o",
    temperature: 0.7
  },
  insight_generation: { 
    provider: "gemini", 
    model: "gemini-1.5-pro",
    temperature: 0.7
  },
  weekly_brief_generation: { 
    provider: "gemini", 
    model: "gemini-1.5-pro",
    temperature: 0.7
  },
  translation_synthesis: { 
    provider: "gemini", 
    model: "gemini-1.5-pro",
    temperature: 0.4
  },
  profile_understanding: { 
    provider: "gemini", 
    model: "gemini-1.5-pro",
    temperature: 0.6
  },
  industry_analysis: { 
    provider: "gemini", 
    model: "gemini-1.5-pro",
    temperature: 0.6
  },
  campaign_strategy: { 
    provider: "gemini", 
    model: "gemini-1.5-pro",
    fallbackProvider: "openai",
    fallbackModel: "gpt-4o",
    temperature: 0.7
  },
}

export interface LLMRequest {
  taskType: LLMTaskType
  prompt: string
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
  responseFormat?: "text" | "json"
  jsonSchema?: Record<string, unknown>
  context?: Record<string, unknown>
}

export interface LLMResponse {
  content: string
  provider: LLMProvider
  model: LLMModel
  promptTokens: number
  completionTokens: number
  totalTokens: number
  costUsd: number
  latencyMs: number
  cached: boolean
}

export interface LLMRun {
  id: string
  tenantId: string | null
  sessionId: string | null
  
  agentName: string
  taskType: LLMTaskType
  taskDescription: string | null
  
  provider: LLMProvider
  model: LLMModel
  
  promptTokens: number | null
  completionTokens: number | null
  totalTokens: number | null
  costUsd: number | null
  latencyMs: number | null
  
  inputHash: string | null
  cacheHit: boolean
  
  promptPreview: string | null
  responsePreview: string | null
  fullPrompt: string | null
  fullResponse: string | null
  
  status: LLMRunStatus
  errorMessage: string | null
  errorCode: string | null
  retryCount: number
  
  createdAt: Date
  startedAt: Date | null
  completedAt: Date | null
}

export type LLMRunStatus = "pending" | "running" | "success" | "failed" | "retrying"

export const MODEL_PRICING: Record<LLMModel, { input: number; output: number }> = {
  // OpenAI pricing per 1M tokens
  "gpt-4o": { input: 2.50, output: 10.00 },
  "gpt-4o-mini": { input: 0.15, output: 0.60 },
  "gpt-4-turbo": { input: 10.00, output: 30.00 },
  "gpt-3.5-turbo": { input: 0.50, output: 1.50 },
  "text-embedding-3-small": { input: 0.02, output: 0 },
  "text-embedding-3-large": { input: 0.13, output: 0 },
  // Gemini pricing per 1M tokens
  "gemini-1.5-pro": { input: 1.25, output: 5.00 },
  "gemini-1.5-flash": { input: 0.075, output: 0.30 },
  "gemini-2.0-flash": { input: 0.10, output: 0.40 },
  // Anthropic pricing per 1M tokens
  "claude-3-5-sonnet": { input: 3.00, output: 15.00 },
  "claude-3-haiku": { input: 0.25, output: 1.25 },
}

export function calculateCost(
  model: LLMModel, 
  promptTokens: number, 
  completionTokens: number
): number {
  const pricing = MODEL_PRICING[model]
  if (!pricing) return 0
  
  const inputCost = (promptTokens / 1_000_000) * pricing.input
  const outputCost = (completionTokens / 1_000_000) * pricing.output
  
  return inputCost + outputCost
}
