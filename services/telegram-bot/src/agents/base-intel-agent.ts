import type { PipelineContext, AgentOutput, PipelineConfig, DEFAULT_PIPELINE_CONFIG } from "../types/pipeline"
import type { PipelineStage } from "../types/research"
import { getRouter } from "../llm/router"
import { updateTenantProfile } from "../db/tenant-profiles"
import { advancePipelineStage, recordStageFailure } from "../db/pipeline-runs"

export interface AgentMetrics {
  startTime: Date
  endTime?: Date
  llmCalls: number
  tokensUsed: number
  costUsd: number
  itemsProcessed: number
  errors: AgentError[]
}

export interface AgentError {
  message: string
  code?: string
  recoverable: boolean
  timestamp: Date
}

/**
 * Progress callback for reporting step progress to the pipeline orchestrator
 */
export interface ProgressCallback {
  onStepStart?: (stepName: string) => Promise<void>
  onStepComplete?: (stepName: string, metrics?: { sources?: number; queries?: number }) => Promise<void>
  onMetricsUpdate?: (metrics: { queriesExecuted?: number; sourcesFound?: number; claimsExtracted?: number }) => Promise<void>
}

export abstract class BaseIntelAgent<TInput = unknown, TOutput = unknown> {
  protected readonly name: string
  protected readonly stage: PipelineStage
  protected metrics: AgentMetrics
  protected config: PipelineConfig
  protected progressCallback: ProgressCallback | null = null

  constructor(name: string, stage: PipelineStage, config?: Partial<PipelineConfig>) {
    this.name = name
    this.stage = stage
    this.config = { 
      maxRetries: 3,
      retryDelayMs: 2000,
      timeoutMs: 300000,
      enableResearch: true,
      enableClarification: true,
      minConfidenceThreshold: 0.6,
      testMode: false,
      ...config 
    }
    this.metrics = this.initializeMetrics()
  }

  /**
   * Set progress callback for reporting step progress
   */
  setProgressCallback(callback: ProgressCallback): void {
    this.progressCallback = callback
  }

  /**
   * Report step start to progress tracker
   */
  protected async reportStepStart(stepName: string): Promise<void> {
    if (this.progressCallback?.onStepStart) {
      await this.progressCallback.onStepStart(stepName)
    }
  }

  /**
   * Report step completion to progress tracker
   */
  protected async reportStepComplete(stepName: string, metrics?: { sources?: number; queries?: number }): Promise<void> {
    if (this.progressCallback?.onStepComplete) {
      await this.progressCallback.onStepComplete(stepName, metrics)
    }
  }

  /**
   * Report metrics update to progress tracker
   */
  protected async reportMetrics(metrics: { queriesExecuted?: number; sourcesFound?: number; claimsExtracted?: number }): Promise<void> {
    if (this.progressCallback?.onMetricsUpdate) {
      await this.progressCallback.onMetricsUpdate(metrics)
    }
  }

  private initializeMetrics(): AgentMetrics {
    return {
      startTime: new Date(),
      llmCalls: 0,
      tokensUsed: 0,
      costUsd: 0,
      itemsProcessed: 0,
      errors: [],
    }
  }

  protected get router() {
    return getRouter()
  }

  async run(context: PipelineContext, input: TInput): Promise<AgentOutput<TOutput>> {
    this.metrics = this.initializeMetrics()
    
    console.log(`[${this.name}] Starting execution for tenant ${context.tenantId}`)

    try {
      await this.onStart(context)
      
      await updateTenantProfile(context.tenant.id, {
        pipelineStage: this.stage,
      })

      const result = await this.execute(context, input)

      this.metrics.endTime = new Date()

      if (result.success) {
        await this.onComplete(context, result)
        
        if (result.nextStage) {
          await advancePipelineStage(context.runId, this.stage, result.nextStage)
        }
      } else {
        await this.onError(context, new Error(result.error || "Unknown error"))
      }

      console.log(`[${this.name}] Completed. Success: ${result.success}, Duration: ${this.getDurationMs()}ms`)
      
      return result

    } catch (error) {
      this.metrics.endTime = new Date()
      const err = error as Error
      
      this.recordError(err.message, undefined, false)
      await this.onError(context, err)
      await recordStageFailure(context.runId, this.stage, err.message)

      console.error(`[${this.name}] Failed:`, err.message)

      return {
        success: false,
        error: err.message,
        shouldRetry: this.isRetryableError(err),
      }
    }
  }

  protected abstract execute(
    context: PipelineContext,
    input: TInput
  ): Promise<AgentOutput<TOutput>>

  protected async onStart(context: PipelineContext): Promise<void> {
    console.log(`[${this.name}] onStart hook`)
  }

  protected async onComplete(
    context: PipelineContext,
    result: AgentOutput<TOutput>
  ): Promise<void> {
    console.log(`[${this.name}] onComplete hook`)
  }

  protected async onError(context: PipelineContext, error: Error): Promise<void> {
    console.error(`[${this.name}] onError hook:`, error.message)
  }

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
        console.log(`[${this.name}] Retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`)
        await this.delay(delayMs)
      }
    }

    throw lastError
  }

  getMetrics(): AgentMetrics {
    return { ...this.metrics }
  }

  getName(): string {
    return this.name
  }

  getStage(): PipelineStage {
    return this.stage
  }
}

export function createAgentOutput<T>(
  success: boolean,
  data?: T,
  options?: {
    error?: string
    nextStage?: PipelineStage
    shouldRetry?: boolean
    updatedContext?: Partial<PipelineContext>
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
