import type { 
  LLMTaskType, 
  LLMProvider, 
  LLMModel, 
  LLMRequest, 
  LLMResponse,
  LLMTaskRouting,
  TASK_ROUTING 
} from "../types/llm"
import { 
  initializeOpenAI, 
  getOpenAI, 
  openAICompletion, 
  openAIStructuredOutput,
  openAIEmbedding 
} from "./openai-client"
import { 
  initializeGemini, 
  getGemini, 
  geminiCompletion,
  geminiStructuredOutput 
} from "./gemini-client"
import { 
  createLLMRun, 
  startLLMRun, 
  completeLLMRun, 
  failLLMRun, 
  markLLMRunRetrying,
  checkCacheHit,
  hashPrompt 
} from "../db/llm-runs"
import { incrementLLMUsage } from "../db/pipeline-runs"

interface RouterConfig {
  maxRetries: number
  retryDelayMs: number
  enableCaching: boolean
  logFullPrompts: boolean
}

const DEFAULT_CONFIG: RouterConfig = {
  maxRetries: 3,
  retryDelayMs: 1000,
  enableCaching: true,
  logFullPrompts: false,
}

let config: RouterConfig = DEFAULT_CONFIG
let initialized = false

export function initializeRouter(customConfig?: Partial<RouterConfig>): void {
  config = { ...DEFAULT_CONFIG, ...customConfig }
  
  initializeOpenAI()
  initializeGemini()
  
  initialized = true
  console.log("LLM Router initialized")
}

export function getRouter(): LLMRouter {
  if (!initialized) {
    initializeRouter()
  }
  return router
}

// Import task routing from types to keep single source of truth
import { TASK_ROUTING } from "../types/llm"

const TASK_ROUTING_CONFIG: Record<LLMTaskType, LLMTaskRouting> = TASK_ROUTING

export interface RouterRequest {
  taskType: LLMTaskType
  prompt: string
  systemPrompt?: string
  agentName: string
  tenantId?: string
  sessionId?: string
  pipelineRunId?: string
  maxTokens?: number
  temperature?: number
  responseFormat?: "text" | "json"
  jsonSchema?: Record<string, unknown>
  skipCache?: boolean
}

export interface RouterResponse extends LLMResponse {
  runId: string
  taskType: LLMTaskType
  fromCache: boolean
}

class LLMRouter {
  async complete(request: RouterRequest): Promise<RouterResponse> {
    const routing = TASK_ROUTING_CONFIG[request.taskType]
    const inputHash = hashPrompt(request.prompt)

    if (config.enableCaching && !request.skipCache) {
      const cached = await checkCacheHit(inputHash)
      if (cached && cached.fullResponse) {
        return {
          runId: cached.id,
          content: cached.fullResponse,
          provider: cached.provider as LLMProvider,
          model: cached.model as LLMModel,
          promptTokens: cached.promptTokens || 0,
          completionTokens: cached.completionTokens || 0,
          totalTokens: cached.totalTokens || 0,
          costUsd: cached.costUsd || 0,
          latencyMs: 0,
          cached: true,
          taskType: request.taskType,
          fromCache: true,
        }
      }
    }

    const run = await createLLMRun({
      tenantId: request.tenantId,
      sessionId: request.sessionId,
      agentName: request.agentName,
      taskType: request.taskType,
      provider: routing.provider,
      model: routing.model,
      promptPreview: request.prompt.substring(0, 500),
      fullPrompt: config.logFullPrompts ? request.prompt : undefined,
      inputHash,
    })

    if (!run) {
      throw new Error("Failed to create LLM run record")
    }

    await startLLMRun(run.id)

    let lastError: Error | null = null
    let currentProvider = routing.provider
    let currentModel = routing.model

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const response = await this.executeCompletion(
          currentProvider,
          currentModel,
          request,
          routing.temperature
        )

        await completeLLMRun(run.id, {
          promptTokens: response.promptTokens,
          completionTokens: response.completionTokens,
          totalTokens: response.totalTokens,
          costUsd: response.costUsd,
          latencyMs: response.latencyMs,
          responsePreview: response.content.substring(0, 500),
          fullResponse: config.logFullPrompts ? response.content : undefined,
        })

        if (request.pipelineRunId) {
          await incrementLLMUsage(
            request.pipelineRunId,
            response.totalTokens,
            response.costUsd
          )
        }

        return {
          ...response,
          runId: run.id,
          taskType: request.taskType,
          fromCache: false,
        }

      } catch (error) {
        lastError = error as Error
        console.error(`LLM call failed (attempt ${attempt + 1}):`, lastError.message)

        if (attempt < config.maxRetries) {
          await markLLMRunRetrying(run.id)

          if (routing.fallbackProvider && currentProvider !== routing.fallbackProvider) {
            console.log(`Switching to fallback: ${routing.fallbackProvider}/${routing.fallbackModel}`)
            currentProvider = routing.fallbackProvider
            currentModel = routing.fallbackModel!
          } else {
            await new Promise(r => setTimeout(r, config.retryDelayMs * (attempt + 1)))
          }
        }
      }
    }

    await failLLMRun(run.id, {
      errorMessage: lastError?.message || "Unknown error",
    })

    throw lastError || new Error("LLM completion failed after all retries")
  }

  private async executeCompletion(
    provider: LLMProvider,
    model: LLMModel,
    request: RouterRequest,
    defaultTemperature?: number
  ): Promise<LLMResponse> {
    const temperature = request.temperature ?? defaultTemperature ?? 0.7

    if (provider === "openai") {
      if (!getOpenAI()) {
        throw new Error("OpenAI client not available")
      }

      if (request.jsonSchema) {
        const { data, response } = await openAIStructuredOutput({
          model,
          prompt: request.prompt,
          systemPrompt: request.systemPrompt,
          maxTokens: request.maxTokens,
          temperature,
          schema: request.jsonSchema,
        })
        return {
          ...response,
          content: JSON.stringify(data),
        }
      }

      return openAICompletion({
        model,
        prompt: request.prompt,
        systemPrompt: request.systemPrompt,
        maxTokens: request.maxTokens,
        temperature,
        responseFormat: request.responseFormat,
      })
    }

    if (provider === "gemini") {
      if (!getGemini()) {
        throw new Error("Gemini client not available")
      }

      if (request.jsonSchema) {
        const { data, response } = await geminiStructuredOutput({
          model,
          prompt: request.prompt,
          systemPrompt: request.systemPrompt,
          maxTokens: request.maxTokens,
          temperature,
          schema: request.jsonSchema,
        })
        return {
          ...response,
          content: JSON.stringify(data),
        }
      }

      return geminiCompletion({
        model,
        prompt: request.prompt,
        systemPrompt: request.systemPrompt,
        maxTokens: request.maxTokens,
        temperature,
        responseFormat: request.responseFormat,
      })
    }

    throw new Error(`Unsupported provider: ${provider}`)
  }

  async embed(
    text: string | string[],
    agentName: string,
    tenantId?: string
  ): Promise<{ embeddings: number[][]; runId: string }> {
    const run = await createLLMRun({
      tenantId,
      agentName,
      taskType: "embeddings",
      provider: "openai",
      model: "text-embedding-3-small",
    })

    if (!run) {
      throw new Error("Failed to create LLM run record")
    }

    try {
      const result = await openAIEmbedding({ input: text })

      await completeLLMRun(run.id, {
        promptTokens: result.usage.totalTokens,
        completionTokens: 0,
        totalTokens: result.usage.totalTokens,
        costUsd: result.usage.costUsd,
        latencyMs: 0,
      })

      return {
        embeddings: result.embeddings,
        runId: run.id,
      }
    } catch (error) {
      await failLLMRun(run.id, {
        errorMessage: (error as Error).message,
      })
      throw error
    }
  }

  getRoutingConfig(taskType: LLMTaskType): LLMTaskRouting {
    return TASK_ROUTING_CONFIG[taskType]
  }
}

const router = new LLMRouter()

export { router, LLMRouter }
