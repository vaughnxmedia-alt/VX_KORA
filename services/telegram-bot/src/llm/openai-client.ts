import OpenAI from "openai"
import type { LLMModel, LLMResponse } from "../types/llm"
import { calculateCost } from "../types/llm"

let openai: OpenAI | null = null

export function initializeOpenAI(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    console.warn("OpenAI API key not found")
    return null
  }

  openai = new OpenAI({ apiKey })
  console.log("OpenAI client initialized")
  return openai
}

export function getOpenAI(): OpenAI | null {
  return openai
}

export interface OpenAICompletionOptions {
  model: LLMModel
  prompt: string
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
  responseFormat?: "text" | "json"
  jsonSchema?: Record<string, unknown>
}

export async function openAICompletion(
  options: OpenAICompletionOptions
): Promise<LLMResponse> {
  if (!openai) {
    throw new Error("OpenAI client not initialized")
  }

  const startTime = Date.now()

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []
  
  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt })
  }
  
  messages.push({ role: "user", content: options.prompt })

  const requestOptions: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
    model: options.model,
    messages,
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature ?? 0.7,
  }

  if (options.responseFormat === "json") {
    requestOptions.response_format = { type: "json_object" }
  }

  const response = await openai.chat.completions.create(requestOptions)

  const latencyMs = Date.now() - startTime
  const promptTokens = response.usage?.prompt_tokens || 0
  const completionTokens = response.usage?.completion_tokens || 0
  const totalTokens = response.usage?.total_tokens || 0
  const costUsd = calculateCost(options.model, promptTokens, completionTokens)

  return {
    content: response.choices[0]?.message?.content || "",
    provider: "openai",
    model: options.model,
    promptTokens,
    completionTokens,
    totalTokens,
    costUsd,
    latencyMs,
    cached: false,
  }
}

export interface OpenAIEmbeddingOptions {
  model?: LLMModel
  input: string | string[]
}

export async function openAIEmbedding(
  options: OpenAIEmbeddingOptions
): Promise<{ embeddings: number[][]; usage: { totalTokens: number; costUsd: number } }> {
  if (!openai) {
    throw new Error("OpenAI client not initialized")
  }

  const model = options.model || "text-embedding-3-small"
  const input = Array.isArray(options.input) ? options.input : [options.input]

  const response = await openai.embeddings.create({
    model,
    input,
  })

  const totalTokens = response.usage?.total_tokens || 0
  const costUsd = calculateCost(model as LLMModel, totalTokens, 0)

  return {
    embeddings: response.data.map(d => d.embedding),
    usage: { totalTokens, costUsd },
  }
}

export async function openAIStructuredOutput<T>(
  options: OpenAICompletionOptions & { schema: Record<string, unknown> }
): Promise<{ data: T; response: LLMResponse }> {
  const response = await openAICompletion({
    ...options,
    responseFormat: "json",
    systemPrompt: options.systemPrompt 
      ? `${options.systemPrompt}\n\nYou MUST respond with valid JSON matching this schema:\n${JSON.stringify(options.schema, null, 2)}`
      : `You MUST respond with valid JSON matching this schema:\n${JSON.stringify(options.schema, null, 2)}`,
  })

  let data: T
  try {
    data = JSON.parse(response.content) as T
  } catch (e) {
    throw new Error(`Failed to parse JSON response: ${response.content.substring(0, 200)}`)
  }

  return { data, response }
}

export async function openAIClassify(
  text: string,
  categories: string[],
  model: LLMModel = "gpt-4o-mini"
): Promise<{ category: string; confidence: number; response: LLMResponse }> {
  const schema = {
    type: "object",
    properties: {
      category: { type: "string", enum: categories },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      reasoning: { type: "string" },
    },
    required: ["category", "confidence"],
  }

  const { data, response } = await openAIStructuredOutput<{
    category: string
    confidence: number
    reasoning?: string
  }>({
    model,
    prompt: `Classify the following text into one of these categories: ${categories.join(", ")}\n\nText: ${text}`,
    schema,
    temperature: 0.3,
  })

  return {
    category: data.category,
    confidence: data.confidence,
    response,
  }
}

export async function openAIExtractEntities(
  text: string,
  entityTypes: string[],
  model: LLMModel = "gpt-4o"
): Promise<{ entities: Array<{ type: string; value: string; confidence: number }>; response: LLMResponse }> {
  const schema = {
    type: "object",
    properties: {
      entities: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string", enum: entityTypes },
            value: { type: "string" },
            confidence: { type: "number", minimum: 0, maximum: 1 },
          },
          required: ["type", "value", "confidence"],
        },
      },
    },
    required: ["entities"],
  }

  const { data, response } = await openAIStructuredOutput<{
    entities: Array<{ type: string; value: string; confidence: number }>
  }>({
    model,
    prompt: `Extract the following entity types from the text: ${entityTypes.join(", ")}\n\nText: ${text}`,
    schema,
    temperature: 0.3,
  })

  return {
    entities: data.entities,
    response,
  }
}

export async function openAICleanupJSON<T>(
  malformedJSON: string,
  expectedSchema: Record<string, unknown>,
  model: LLMModel = "gpt-4o"
): Promise<{ data: T; response: LLMResponse }> {
  const { data, response } = await openAIStructuredOutput<T>({
    model,
    prompt: `The following JSON is malformed or has issues. Clean it up and return valid JSON matching the expected schema.\n\nMalformed JSON:\n${malformedJSON}\n\nExpected Schema:\n${JSON.stringify(expectedSchema, null, 2)}`,
    schema: expectedSchema,
    temperature: 0.2,
  })

  return { data, response }
}
