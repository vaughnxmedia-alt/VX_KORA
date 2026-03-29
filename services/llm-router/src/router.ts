import type { LLMProvider, LLMModel, LLMTaskType } from "@kora/sdk"
import type { 
  LLMRequest, 
  LLMResponse, 
  EmbeddingRequest, 
  EmbeddingResponse,
  RouterConfig,
  TaskMapping,
  UsageStats
} from "./types"
import { DEFAULT_ROUTER_CONFIG, MODEL_PRICING } from "./config"

export class LLMRouter {
  private config: RouterConfig
  private usageLog: Array<{
    timestamp: Date
    taskType: LLMTaskType
    provider: LLMProvider
    model: LLMModel
    tokens: number
    cost: number
    latencyMs: number
  }> = []

  constructor(config?: Partial<RouterConfig>) {
    this.config = {
      ...DEFAULT_ROUTER_CONFIG,
      ...config
    }
  }

  /**
   * Route and execute an LLM request
   */
  async complete(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now()
    const mapping = this.getTaskMapping(request.taskType)
    
    const provider = request.preferredProvider ?? mapping.primaryProvider
    const model = request.preferredProvider 
      ? this.getModelForProvider(request.preferredProvider, request.taskType)
      : mapping.primaryModel

    try {
      const response = await this.executeRequest(
        provider,
        model,
        request,
        mapping
      )

      this.logUsage(
        request.taskType,
        provider,
        model,
        response.usage.totalTokens,
        response.cost.totalCost,
        response.latencyMs
      )

      return response
    } catch (error) {
      if (this.config.fallbackEnabled && provider === mapping.primaryProvider) {
        console.warn(
          `[llm-router] Primary provider ${provider} failed, trying fallback ${mapping.fallbackProvider}`
        )
        
        return this.executeRequest(
          mapping.fallbackProvider,
          mapping.fallbackModel,
          request,
          mapping
        )
      }
      throw error
    }
  }

  /**
   * Generate embeddings
   */
  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const mapping = this.getTaskMapping("embedding")
    
    // TODO: Implement actual embedding API call
    console.log(`[llm-router] Generating embeddings with ${mapping.primaryModel}`)
    
    const inputs = Array.isArray(request.input) ? request.input : [request.input]
    
    return {
      embeddings: inputs.map(() => []),
      provider: mapping.primaryProvider,
      model: mapping.primaryModel,
      usage: { totalTokens: 0 },
      cost: { totalCost: 0, currency: "USD" }
    }
  }

  /**
   * Get current usage statistics
   */
  getUsageStats(period: "day" | "month" = "day"): UsageStats {
    const now = new Date()
    const periodStart = new Date(now)
    
    if (period === "day") {
      periodStart.setHours(0, 0, 0, 0)
    } else {
      periodStart.setDate(1)
      periodStart.setHours(0, 0, 0, 0)
    }

    const relevantLogs = this.usageLog.filter(
      log => log.timestamp >= periodStart
    )

    const stats: UsageStats = {
      periodStart,
      periodEnd: now,
      totalRequests: relevantLogs.length,
      totalTokens: 0,
      totalCost: 0,
      byProvider: {} as UsageStats["byProvider"],
      byTask: {} as UsageStats["byTask"]
    }

    for (const log of relevantLogs) {
      stats.totalTokens += log.tokens
      stats.totalCost += log.cost

      if (!stats.byProvider[log.provider]) {
        stats.byProvider[log.provider] = { requests: 0, tokens: 0, cost: 0 }
      }
      stats.byProvider[log.provider].requests++
      stats.byProvider[log.provider].tokens += log.tokens
      stats.byProvider[log.provider].cost += log.cost

      if (!stats.byTask[log.taskType]) {
        stats.byTask[log.taskType] = { 
          requests: 0, 
          tokens: 0, 
          cost: 0, 
          avgLatencyMs: 0 
        }
      }
      stats.byTask[log.taskType].requests++
      stats.byTask[log.taskType].tokens += log.tokens
      stats.byTask[log.taskType].cost += log.cost
      stats.byTask[log.taskType].avgLatencyMs = 
        (stats.byTask[log.taskType].avgLatencyMs * (stats.byTask[log.taskType].requests - 1) + log.latencyMs) 
        / stats.byTask[log.taskType].requests
    }

    return stats
  }

  /**
   * Check if budget allows for request
   */
  checkBudget(estimatedCost: number): { allowed: boolean; reason?: string } {
    const dailyStats = this.getUsageStats("day")
    const monthlyStats = this.getUsageStats("month")

    if (dailyStats.totalCost + estimatedCost > this.config.costThresholds.dailyBudget) {
      return { 
        allowed: false, 
        reason: `Daily budget exceeded (${dailyStats.totalCost.toFixed(2)}/${this.config.costThresholds.dailyBudget})` 
      }
    }

    if (monthlyStats.totalCost + estimatedCost > this.config.costThresholds.monthlyBudget) {
      return { 
        allowed: false, 
        reason: `Monthly budget exceeded (${monthlyStats.totalCost.toFixed(2)}/${this.config.costThresholds.monthlyBudget})` 
      }
    }

    return { allowed: true }
  }

  /**
   * Update router configuration
   */
  updateConfig(config: Partial<RouterConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get task mapping for a specific task type
   */
  private getTaskMapping(taskType: LLMTaskType): TaskMapping {
    const mapping = this.config.taskMappings.find(m => m.taskType === taskType)
    if (!mapping) {
      throw new Error(`No mapping found for task type: ${taskType}`)
    }
    return mapping
  }

  /**
   * Get appropriate model for a provider and task
   */
  private getModelForProvider(provider: LLMProvider, taskType: LLMTaskType): LLMModel {
    const mapping = this.getTaskMapping(taskType)
    return provider === mapping.primaryProvider 
      ? mapping.primaryModel 
      : mapping.fallbackModel
  }

  /**
   * Execute the actual LLM API call
   */
  private async executeRequest(
    provider: LLMProvider,
    model: LLMModel,
    request: LLMRequest,
    mapping: TaskMapping
  ): Promise<LLMResponse> {
    const startTime = Date.now()

    // TODO: Implement actual API calls
    // This is a stub that returns mock data
    console.log(`[llm-router] Executing ${request.taskType} with ${provider}/${model}`)

    const mockTokens = {
      promptTokens: Math.floor(request.prompt.length / 4),
      completionTokens: Math.floor((request.maxTokens ?? mapping.maxTokens) * 0.3),
      totalTokens: 0
    }
    mockTokens.totalTokens = mockTokens.promptTokens + mockTokens.completionTokens

    const pricing = this.getModelPricing(provider, model)
    const cost = {
      inputCost: (mockTokens.promptTokens / 1000) * pricing.input,
      outputCost: (mockTokens.completionTokens / 1000) * pricing.output,
      totalCost: 0,
      currency: "USD" as const
    }
    cost.totalCost = cost.inputCost + cost.outputCost

    return {
      content: `[Mock response for ${request.taskType}]`,
      provider,
      model,
      usage: mockTokens,
      cost,
      latencyMs: Date.now() - startTime,
      cached: false
    }
  }

  /**
   * Get pricing for a model
   */
  private getModelPricing(provider: LLMProvider, model: LLMModel): { input: number; output: number } {
    const providerPricing = MODEL_PRICING[provider as keyof typeof MODEL_PRICING]
    if (!providerPricing) {
      return { input: 0.001, output: 0.002 }
    }
    
    const modelPricing = providerPricing[model as keyof typeof providerPricing]
    if (!modelPricing) {
      return { input: 0.001, output: 0.002 }
    }
    
    return modelPricing
  }

  /**
   * Log usage for tracking
   */
  private logUsage(
    taskType: LLMTaskType,
    provider: LLMProvider,
    model: LLMModel,
    tokens: number,
    cost: number,
    latencyMs: number
  ): void {
    if (!this.config.loggingEnabled) return

    this.usageLog.push({
      timestamp: new Date(),
      taskType,
      provider,
      model,
      tokens,
      cost,
      latencyMs
    })

    // Keep only last 10000 entries to prevent memory issues
    if (this.usageLog.length > 10000) {
      this.usageLog = this.usageLog.slice(-5000)
    }

    // Check alert threshold
    const dailyStats = this.getUsageStats("day")
    const threshold = this.config.costThresholds.dailyBudget * this.config.costThresholds.alertThreshold
    
    if (dailyStats.totalCost >= threshold) {
      console.warn(
        `[llm-router] Budget alert: Daily spend at ${(dailyStats.totalCost / this.config.costThresholds.dailyBudget * 100).toFixed(1)}%`
      )
    }
  }
}

// Singleton instance
let routerInstance: LLMRouter | null = null

export function getLLMRouter(config?: Partial<RouterConfig>): LLMRouter {
  if (!routerInstance) {
    routerInstance = new LLMRouter(config)
  }
  return routerInstance
}
