// Pipeline orchestration types

import type { TenantProfile, ResearchContext, PipelineStage } from "./research"
import type { NormalizedIntakeData, IntakeAnswer } from "./intake"
import type { BrandBlueprint, ContentStrategy, AudienceAnalysis, DeliverableReview } from "./deliverables"

export type PipelineRunType = "full" | "resume" | "regenerate" | "redelivery"
export type PipelineTrigger = "telegram_command" | "manual" | "scheduled" | "retry"
export type PipelineRunStatus = "running" | "paused" | "completed" | "failed" | "cancelled"

export interface PipelineRun {
  id: string
  tenantId: string
  
  runType: PipelineRunType
  trigger: PipelineTrigger
  
  currentStage: PipelineStage | null
  stagesCompleted: PipelineStage[]
  stagesFailed: StageFailure[]
  
  status: PipelineRunStatus
  errorMessage: string | null
  
  totalLlmCalls: number
  totalTokensUsed: number
  totalCostUsd: number
  
  startedAt: Date
  completedAt: Date | null
  
  createdAt: Date
}

export interface StageFailure {
  stage: PipelineStage
  error: string
  timestamp: Date
}

export interface PipelineContext {
  runId: string
  tenantId: string
  telegramId: number
  telegramChatId: number
  
  tenant: TenantProfile
  intakeAnswers: IntakeAnswer[]
  normalizedIntake: NormalizedIntakeData | null
  researchContext: ResearchContext | null
  
  brandBlueprint: BrandBlueprint | null
  contentStrategy: ContentStrategy | null
  audienceAnalysis: AudienceAnalysis | null
  
  reviews: DeliverableReview[]
  
  currentStage: PipelineStage
  stagesCompleted: PipelineStage[]
  errors: PipelineError[]
  
  startedAt: Date
  lastActivityAt: Date
}

export interface PipelineError {
  stage: PipelineStage
  agent: string
  error: string
  recoverable: boolean
  timestamp: Date
}

export interface AgentInput<T = unknown> {
  context: PipelineContext
  data: T
}

export interface AgentOutput<T = unknown> {
  success: boolean
  data?: T
  error?: string
  nextStage?: PipelineStage
  shouldRetry?: boolean
  updatedContext?: Partial<PipelineContext>
}

export interface PipelineConfig {
  maxRetries: number
  retryDelayMs: number
  timeoutMs: number
  enableResearch: boolean
  enableClarification: boolean
  minConfidenceThreshold: number
  testMode: boolean
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  maxRetries: 3,
  retryDelayMs: 2000,
  timeoutMs: 300000, // 5 minutes
  enableResearch: true,
  enableClarification: true,
  minConfidenceThreshold: 0.6,
  testMode: false,
}

export type StatusMessageKey = 
  | "intake_saving"
  | "intake_clarifying"
  | "research_starting"
  | "research_website"
  | "research_social"
  | "generation_brand"
  | "generation_audience"
  | "generation_strategy"
  | "review_starting"
  | "review_passed"
  | "review_failed"
  | "delivery_preparing"
  | "delivery_sending"
  | "error_generic"
  | "error_retry"

export const STATUS_MESSAGES: Record<StatusMessageKey, string> = {
  intake_saving: "Saving your responses...",
  intake_clarifying: "I need a bit more detail on that. Let me ask a follow-up...",
  research_starting: "Researching your public presence...",
  research_website: "Analyzing your website...",
  research_social: "Auditing your social profiles...",
  generation_brand: "Analyzing your brand signals...",
  generation_audience: "Building your audience profile...",
  generation_strategy: "Crafting your content strategy...",
  review_starting: "Reviewing quality before delivery...",
  review_passed: "Quality checks passed!",
  review_failed: "Making some improvements...",
  delivery_preparing: "Preparing your documents...",
  delivery_sending: "Sending your strategy package...",
  error_generic: "I encountered an issue. Please try again or type /restart.",
  error_retry: "Retrying the last step...",
}

export interface StageTransition {
  from: PipelineStage
  to: PipelineStage
  condition?: (context: PipelineContext) => boolean
}

export const PIPELINE_TRANSITIONS: StageTransition[] = [
  { from: "intake", to: "clarification" },
  { 
    from: "clarification", 
    to: "research",
    condition: (ctx) => !ctx.intakeAnswers.some(a => a.needsClarification)
  },
  { from: "research", to: "generation" },
  { from: "generation", to: "review" },
  { 
    from: "review", 
    to: "delivery",
    condition: (ctx) => ctx.reviews.length > 0 && ctx.reviews[ctx.reviews.length - 1].passedReview
  },
  { 
    from: "review", 
    to: "generation",
    condition: (ctx) => ctx.reviews.length > 0 && !ctx.reviews[ctx.reviews.length - 1].passedReview
  },
  { from: "delivery", to: "complete" },
]
