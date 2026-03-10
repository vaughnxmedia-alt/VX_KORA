/**
 * KORA Confidential Base Agent
 * 
 * CONFIDENTIALITY ARCHITECTURE:
 * 
 * This is the enhanced base class for all KORA intelligence agents.
 * It enforces the separation between Core Brain (global) and Tenant Brain (private).
 * 
 * Every agent that extends this class:
 * 1. Loads Core Brain context (global, reusable knowledge)
 * 2. Loads Tenant Brain context (private, isolated knowledge)
 * 3. Runs with confidentiality rules enforced
 * 4. Has its output reviewed for cross-tenant leakage
 */

import type { PipelineContext, AgentOutput, PipelineConfig } from "../types/pipeline"
import type { PipelineStage } from "../types/research"
import { getRouter, LLMRouter } from "../llm/router"
import { updateTenantProfile } from "../db/tenant-profiles"
import { advancePipelineStage, recordStageFailure } from "../db/pipeline-runs"
import { buildAgentContext, validateAgentContext, type AgentContext } from "../rag/context-builder"
import { buildSystemInstructions, CONFIDENTIALITY_REMINDERS } from "../llm/system-instructions"
import { quickConfidentialityCheck } from "./confidentiality-review"
import {
  createTenantScopeEnforcer,
  getDefaultConfidentialityRules,
  type ConfidentialityRules,
  type TenantScopeEnforcer,
} from "../types/confidentiality"
import type { DeliverableTypeOrAll, SocialPlatform } from "../types/core-brain"

// ============================================================================
// TYPES
// ============================================================================

export interface ConfidentialAgentMetrics {
  startTime: Date
  endTime?: Date
  llmCalls: number
  tokensUsed: number
  costUsd: number
  itemsProcessed: number
  errors: AgentError[]
  // Confidentiality metrics
  coreBrainQueriesCount: number
  tenantBrainQueriesCount: number
  confidentialityChecksRun: number
  confidentialityViolationsFound: number
}

export interface AgentError {
  message: string
  code?: string
  recoverable: boolean
  timestamp: Date
}

export interface ConfidentialAgentConfig extends Partial<PipelineConfig> {
  // Confidentiality settings
  enforceConfidentiality?: boolean
  runPostOutputCheck?: boolean
  blockOnViolation?: boolean
  // Context settings
  deliverableType?: DeliverableTypeOrAll
  relevantPlatforms?: SocialPlatform[]
}

// ============================================================================
// CONFIDENTIAL BASE AGENT
// ============================================================================

export abstract class ConfidentialBaseAgent<TInput = unknown, TOutput = unknown> {
  protected readonly agentName: string
  protected readonly stage: PipelineStage
  protected metrics: ConfidentialAgentMetrics
  protected config: Required<ConfidentialAgentConfig>
  
  // Confidentiality enforcement
  protected tenantScopeEnforcer?: TenantScopeEnforcer
  protected confidentialityRules?: ConfidentialityRules
  protected agentContext?: AgentContext

  constructor(
    agentName: string,
    stage: PipelineStage,
    config?: ConfidentialAgentConfig
  ) {
    this.agentName = agentName
    this.stage = stage
    this.config = {
      maxRetries: 3,
      retryDelayMs: 2000,
      timeoutMs: 300000,
      enableResearch: true,
      enableClarification: true,
      minConfidenceThreshold: 0.6,
      testMode: false,
      // Confidentiality defaults
      enforceConfidentiality: true,
      runPostOutputCheck: true,
      blockOnViolation: true,
      deliverableType: "all",
      relevantPlatforms: [],
      ...config,
    }
    this.metrics = this.initializeMetrics()
  }

  private initializeMetrics(): ConfidentialAgentMetrics {
    return {
      startTime: new Date(),
      llmCalls: 0,
      tokensUsed: 0,
      costUsd: 0,
      itemsProcessed: 0,
      errors: [],
      coreBrainQueriesCount: 0,
      tenantBrainQueriesCount: 0,
      confidentialityChecksRun: 0,
      confidentialityViolationsFound: 0,
    }
  }

  protected get router(): LLMRouter {
    return getRouter() || LLMRouter.getInstance()
  }

  /**
   * Main execution entry point.
   * Sets up confidentiality context before running the agent.
   */
  async run(context: PipelineContext, input: TInput): Promise<AgentOutput<TOutput>> {
    this.metrics = this.initializeMetrics()
    
    const tenantId = context.tenantId

    console.log(
      `[${this.agentName}] Starting execution for tenant ${tenantId} ` +
      `(confidentiality=${this.config.enforceConfidentiality})`
    )

    try {
      // STEP 1: Set up tenant scope enforcement
      if (this.config.enforceConfidentiality) {
        this.tenantScopeEnforcer = createTenantScopeEnforcer(tenantId)
        this.confidentialityRules = getDefaultConfidentialityRules(tenantId)
      }

      // STEP 2: Build agent context with Core Brain + Tenant Brain
      this.agentContext = await this.buildContext(context)
      
      // Validate context is properly scoped
      const contextValidation = validateAgentContext(this.agentContext)
      if (!contextValidation.valid) {
        throw new Error(
          `[CONFIDENTIALITY VIOLATION] Invalid agent context: ${contextValidation.issues.join(", ")}`
        )
      }

      // STEP 3: Call onStart hook
      await this.onStart(context)
      
      // Update tenant profile with current stage
      await updateTenantProfile(context.tenant.id, {
        pipelineStage: this.stage,
      })

      // STEP 4: Execute the agent's main logic
      const result = await this.execute(context, input, this.agentContext)

      this.metrics.endTime = new Date()

      // STEP 5: Post-output confidentiality check
      if (result.success && result.data && this.config.runPostOutputCheck) {
        const checkResult = await this.runConfidentialityCheck(
          tenantId,
          result.data
        )
        
        if (!checkResult.passed && this.config.blockOnViolation) {
          console.error(
            `[${this.agentName}] Output blocked due to confidentiality issues: ` +
            checkResult.issues.join("; ")
          )
          
          return {
            success: false,
            error: "Output blocked: confidentiality check failed",
            shouldRetry: false,
          }
        }
      }

      // STEP 6: Complete hooks
      if (result.success) {
        await this.onComplete(context, result)
        
        if (result.nextStage) {
          await advancePipelineStage(context.runId, this.stage, result.nextStage)
        }
      } else {
        await this.onError(context, new Error(result.error || "Unknown error"))
      }

      console.log(
        `[${this.agentName}] Completed. Success: ${result.success}, ` +
        `Duration: ${this.getDurationMs()}ms, ` +
        `Confidentiality checks: ${this.metrics.confidentialityChecksRun}`
      )
      
      return result

    } catch (error) {
      this.metrics.endTime = new Date()
      const err = error as Error
      
      this.recordError(err.message, undefined, false)
      await this.onError(context, err)
      await recordStageFailure(context.runId, this.stage, err.message)

      console.error(`[${this.agentName}] Failed:`, err.message)

      return {
        success: false,
        error: err.message,
        shouldRetry: this.isRetryableError(err),
      }
    }
  }

  /**
   * Builds the agent context with Core Brain and Tenant Brain.
   */
  protected async buildContext(context: PipelineContext): Promise<AgentContext> {
    const tenantId = context.tenantId
    
    // Determine industry from tenant profile
    const industry = context.tenant.industry || undefined
    
    // Build context with both brains
    const agentContext = await buildAgentContext(
      this.agentName,
      tenantId,
      {
        deliverableType: this.config.deliverableType,
        industry,
        platforms: this.config.relevantPlatforms.length > 0
          ? this.config.relevantPlatforms
          : undefined,
      }
    )

    // Track metrics
    this.metrics.coreBrainQueriesCount++
    this.metrics.tenantBrainQueriesCount++

    return agentContext
  }

  /**
   * Runs a confidentiality check on the output.
   */
  protected async runConfidentialityCheck(
    tenantId: string,
    output: TOutput
  ): Promise<{ passed: boolean; issues: string[] }> {
    this.metrics.confidentialityChecksRun++

    const outputText = typeof output === "string"
      ? output
      : JSON.stringify(output)

    const result = await quickConfidentialityCheck(tenantId, outputText)

    if (!result.passed) {
      this.metrics.confidentialityViolationsFound += result.issues.length
    }

    return result
  }

  /**
   * Gets system instructions with confidentiality rules.
   */
  protected getSystemInstructions(additionalInstructions?: string): string {
    if (!this.agentContext) {
      return buildSystemInstructions(
        this.agentName,
        "unknown",
        { additionalInstructions }
      )
    }

    return this.agentContext.systemInstructions + (additionalInstructions || "")
  }

  /**
   * Gets the formatted context for prompt inclusion.
   */
  protected getFormattedContext(): {
    globalKnowledge: string
    tenantKnowledge: string
    combined: string
  } {
    if (!this.agentContext) {
      return {
        globalKnowledge: "",
        tenantKnowledge: "",
        combined: "",
      }
    }

    return this.agentContext.formattedContext
  }

  /**
   * Abstract method: implement the agent's main logic.
   * Now receives the AgentContext with Core Brain and Tenant Brain.
   */
  protected abstract execute(
    context: PipelineContext,
    input: TInput,
    agentContext: AgentContext
  ): Promise<AgentOutput<TOutput>>

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  protected async onStart(context: PipelineContext): Promise<void> {
    console.log(`[${this.agentName}] onStart hook for tenant ${context.tenantId}`)
  }

  protected async onComplete(
    context: PipelineContext,
    result: AgentOutput<TOutput>
  ): Promise<void> {
    console.log(`[${this.agentName}] onComplete hook`)
  }

  protected async onError(context: PipelineContext, error: Error): Promise<void> {
    console.error(`[${this.agentName}] onError hook:`, error.message)
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  protected recordError(message: string, code?: string, recoverable: boolean = true): void {
    this.metrics.errors.push({
      message,
      code,
      recoverable,
      timestamp: new Date(),
    })
  }

  protected recordLLMUsage(tokens: number, cost: number): void {
    this.metrics.llmCalls++
    this.metrics.tokensUsed += tokens
    this.metrics.costUsd += cost
  }

  protected incrementItemsProcessed(count: number = 1): void {
    this.metrics.itemsProcessed += count
  }

  protected getDurationMs(): number {
    const end = this.metrics.endTime || new Date()
    return end.getTime() - this.metrics.startTime.getTime()
  }

  protected isRetryableError(error: Error): boolean {
    const retryablePatterns = [
      /rate limit/i,
      /timeout/i,
      /network/i,
      /ECONNRESET/i,
      /503/i,
      /429/i,
    ]
    return retryablePatterns.some(pattern => pattern.test(error.message))
  }

  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.maxRetries
  ): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (!this.isRetryableError(lastError) || attempt === maxRetries) {
          throw lastError
        }

        const delayMs = this.config.retryDelayMs * Math.pow(2, attempt)
        console.log(
          `[${this.agentName}] Retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`
        )
        await this.delay(delayMs)
      }
    }

    throw lastError
  }

  // ============================================================================
  // CONFIDENTIALITY HELPERS
  // ============================================================================

  /**
   * Safely accesses Core Brain data.
   */
  protected getCoreBrainData() {
    if (!this.agentContext) {
      throw new Error("Agent context not initialized")
    }
    this.metrics.coreBrainQueriesCount++
    return this.agentContext.coreBrain
  }

  /**
   * Safely accesses Tenant Brain data.
   */
  protected getTenantBrainData() {
    if (!this.agentContext) {
      throw new Error("Agent context not initialized")
    }
    this.metrics.tenantBrainQueriesCount++
    return this.agentContext.tenantBrain
  }

  /**
   * Gets the confidentiality reminder to include in prompts.
   */
  protected getConfidentialityReminder(): string {
    return CONFIDENTIALITY_REMINDERS.short
  }

  // ============================================================================
  // GETTERS
  // ============================================================================

  getMetrics(): ConfidentialAgentMetrics {
    return { ...this.metrics }
  }

  getName(): string {
    return this.agentName
  }

  getStage(): PipelineStage {
    return this.stage
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function createConfidentialAgentOutput<T>(
  success: boolean,
  data?: T,
  options?: {
    error?: string
    nextStage?: PipelineStage
    shouldRetry?: boolean
    updatedContext?: Partial<PipelineContext>
    confidentialityPassed?: boolean
  }
): AgentOutput<T> {
  return {
    success,
    data,
    error: options?.error,
    nextStage: options?.nextStage,
    shouldRetry: options?.shouldRetry,
    updatedContext: options?.updatedContext,
  }
}
