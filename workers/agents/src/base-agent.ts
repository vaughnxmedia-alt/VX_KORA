import type { AgentId, AgentStatus } from "@kora/sdk"
import type { AgentConfig, AgentContext, AgentHandler, AgentMetrics, AgentResult } from "./types"

export abstract class BaseAgent<TInput = unknown, TOutput = unknown> 
  implements AgentHandler<TInput, TOutput> {
  
  readonly id: AgentId
  readonly name: string
  readonly description: string
  protected config: AgentConfig
  protected currentStatus: AgentStatus = "idle"
  protected lastRunAt: Date | null = null
  protected lastError: string | null = null

  constructor(config: AgentConfig, name: string, description: string) {
    this.id = config.id
    this.name = name
    this.description = description
    this.config = config
  }

  async execute(input: TInput, context: AgentContext): Promise<AgentResult<TOutput>> {
    const startTime = Date.now()
    this.currentStatus = "running"
    this.lastError = null

    const metrics: AgentMetrics = {
      itemsProcessed: 0,
      itemsSucceeded: 0,
      itemsFailed: 0,
      durationMs: 0,
      llmTokensUsed: 0,
      llmCost: 0
    }

    try {
      await this.onStart(context)
      
      const result = await this.process(input, context, metrics)
      
      metrics.durationMs = Date.now() - startTime
      this.currentStatus = "idle"
      this.lastRunAt = new Date()

      await this.onComplete(context, result, metrics)

      return {
        success: true,
        data: result,
        metrics
      }
    } catch (error) {
      metrics.durationMs = Date.now() - startTime
      this.currentStatus = "error"
      this.lastError = error instanceof Error ? error.message : String(error)

      await this.onError(context, error, metrics)

      return {
        success: false,
        error: this.lastError,
        metrics
      }
    }
  }

  async getStatus(): Promise<AgentStatus> {
    return this.currentStatus
  }

  protected abstract process(
    input: TInput, 
    context: AgentContext, 
    metrics: AgentMetrics
  ): Promise<TOutput>

  protected async onStart(context: AgentContext): Promise<void> {
    console.log(`[${this.id}] Starting run ${context.runId}`)
  }

  protected async onComplete(
    context: AgentContext, 
    result: TOutput, 
    metrics: AgentMetrics
  ): Promise<void> {
    console.log(`[${this.id}] Completed run ${context.runId} in ${metrics.durationMs}ms`)
  }

  protected async onError(
    context: AgentContext, 
    error: unknown, 
    metrics: AgentMetrics
  ): Promise<void> {
    console.error(`[${this.id}] Error in run ${context.runId}:`, error)
  }
}
