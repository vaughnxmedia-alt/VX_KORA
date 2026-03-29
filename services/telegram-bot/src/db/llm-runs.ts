import { getDatabase } from "./client"
import type { LLMRun, LLMRunStatus, LLMProvider, LLMModel, LLMTaskType } from "../types/llm"
import { createHash } from "crypto"

export interface CreateLLMRunInput {
  tenantId?: string
  sessionId?: string
  agentName: string
  taskType: LLMTaskType
  taskDescription?: string
  provider: LLMProvider
  model: LLMModel
  promptPreview?: string
  fullPrompt?: string
  inputHash?: string
}

export interface CompleteLLMRunInput {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  costUsd: number
  latencyMs: number
  responsePreview?: string
  fullResponse?: string
  cacheHit?: boolean
}

export interface FailLLMRunInput {
  errorMessage: string
  errorCode?: string
}

function mapRowToLLMRun(row: Record<string, unknown>): LLMRun {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string | null,
    sessionId: row.session_id as string | null,
    agentName: row.agent_name as string,
    taskType: row.task_type as LLMTaskType,
    taskDescription: row.task_description as string | null,
    provider: row.provider as LLMProvider,
    model: row.model as LLMModel,
    promptTokens: row.prompt_tokens as number | null,
    completionTokens: row.completion_tokens as number | null,
    totalTokens: row.total_tokens as number | null,
    costUsd: row.cost_usd ? parseFloat(row.cost_usd as string) : null,
    latencyMs: row.latency_ms as number | null,
    inputHash: row.input_hash as string | null,
    cacheHit: row.cache_hit as boolean,
    promptPreview: row.prompt_preview as string | null,
    responsePreview: row.response_preview as string | null,
    fullPrompt: row.full_prompt as string | null,
    fullResponse: row.full_response as string | null,
    status: row.status as LLMRunStatus,
    errorMessage: row.error_message as string | null,
    errorCode: row.error_code as string | null,
    retryCount: row.retry_count as number,
    createdAt: new Date(row.created_at as string),
    startedAt: row.started_at ? new Date(row.started_at as string) : null,
    completedAt: row.completed_at ? new Date(row.completed_at as string) : null,
  }
}

export function hashPrompt(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex").substring(0, 32)
}

export async function createLLMRun(
  input: CreateLLMRunInput
): Promise<LLMRun | null> {
  const db = getDatabase()
  if (!db) return null

  const inputHash = input.inputHash || (input.fullPrompt ? hashPrompt(input.fullPrompt) : null)

  const { data, error } = await db
    .from("intel_llm_runs")
    .insert({
      tenant_id: input.tenantId || null,
      session_id: input.sessionId || null,
      agent_name: input.agentName,
      task_type: input.taskType,
      task_description: input.taskDescription || null,
      provider: input.provider,
      model: input.model,
      prompt_preview: input.promptPreview || (input.fullPrompt?.substring(0, 500) || null),
      full_prompt: input.fullPrompt || null,
      input_hash: inputHash,
      status: "pending",
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating LLM run:", error)
    return null
  }

  return mapRowToLLMRun(data)
}

export async function startLLMRun(id: string): Promise<LLMRun | null> {
  const db = getDatabase()
  if (!db) return null

  const { data, error } = await db
    .from("intel_llm_runs")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error starting LLM run:", error)
    return null
  }

  return mapRowToLLMRun(data)
}

export async function completeLLMRun(
  id: string,
  input: CompleteLLMRunInput
): Promise<LLMRun | null> {
  const db = getDatabase()
  if (!db) return null

  const { data, error } = await db
    .from("intel_llm_runs")
    .update({
      status: "success",
      prompt_tokens: input.promptTokens,
      completion_tokens: input.completionTokens,
      total_tokens: input.totalTokens,
      cost_usd: input.costUsd,
      latency_ms: input.latencyMs,
      response_preview: input.responsePreview,
      full_response: input.fullResponse,
      cache_hit: input.cacheHit || false,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error completing LLM run:", error)
    return null
  }

  return mapRowToLLMRun(data)
}

export async function failLLMRun(
  id: string,
  input: FailLLMRunInput
): Promise<LLMRun | null> {
  const db = getDatabase()
  if (!db) return null

  const { data: current } = await db
    .from("intel_llm_runs")
    .select("retry_count")
    .eq("id", id)
    .single()

  const retryCount = ((current?.retry_count as number) || 0) + 1

  const { data, error } = await db
    .from("intel_llm_runs")
    .update({
      status: "failed",
      error_message: input.errorMessage,
      error_code: input.errorCode || null,
      retry_count: retryCount,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error failing LLM run:", error)
    return null
  }

  return mapRowToLLMRun(data)
}

export async function markLLMRunRetrying(id: string): Promise<LLMRun | null> {
  const db = getDatabase()
  if (!db) return null

  const { data: current } = await db
    .from("intel_llm_runs")
    .select("retry_count")
    .eq("id", id)
    .single()

  const retryCount = ((current?.retry_count as number) || 0) + 1

  const { data, error } = await db
    .from("intel_llm_runs")
    .update({
      status: "retrying",
      retry_count: retryCount,
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error marking LLM run as retrying:", error)
    return null
  }

  return mapRowToLLMRun(data)
}

export async function getLLMRunsByTenant(
  tenantId: string,
  limit: number = 100
): Promise<LLMRun[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("intel_llm_runs")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Error fetching LLM runs:", error)
    return []
  }

  return (data || []).map(mapRowToLLMRun)
}

export async function getLLMRunsByAgent(
  agentName: string,
  limit: number = 100
): Promise<LLMRun[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("intel_llm_runs")
    .select("*")
    .eq("agent_name", agentName)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Error fetching LLM runs by agent:", error)
    return []
  }

  return (data || []).map(mapRowToLLMRun)
}

export async function getFailedLLMRuns(
  tenantId?: string,
  limit: number = 100
): Promise<LLMRun[]> {
  const db = getDatabase()
  if (!db) return []

  let query = db
    .from("intel_llm_runs")
    .select("*")
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (tenantId) {
    query = query.eq("tenant_id", tenantId)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching failed LLM runs:", error)
    return []
  }

  return (data || []).map(mapRowToLLMRun)
}

export async function checkCacheHit(inputHash: string): Promise<LLMRun | null> {
  const db = getDatabase()
  if (!db) return null

  const { data, error } = await db
    .from("intel_llm_runs")
    .select("*")
    .eq("input_hash", inputHash)
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== "PGRST116") {
    console.error("Error checking cache hit:", error)
    return null
  }

  return data ? mapRowToLLMRun(data) : null
}

export async function getTenantLLMUsage(
  tenantId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{ totalCost: number; totalTokens: number; runCount: number }> {
  const db = getDatabase()
  if (!db) return { totalCost: 0, totalTokens: 0, runCount: 0 }

  let query = db
    .from("intel_llm_runs")
    .select("cost_usd, total_tokens")
    .eq("tenant_id", tenantId)
    .eq("status", "success")

  if (startDate) {
    query = query.gte("created_at", startDate.toISOString())
  }
  if (endDate) {
    query = query.lte("created_at", endDate.toISOString())
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching tenant LLM usage:", error)
    return { totalCost: 0, totalTokens: 0, runCount: 0 }
  }

  const runs = data || []
  return {
    totalCost: runs.reduce((sum, r) => sum + (parseFloat(r.cost_usd as string) || 0), 0),
    totalTokens: runs.reduce((sum, r) => sum + ((r.total_tokens as number) || 0), 0),
    runCount: runs.length,
  }
}
