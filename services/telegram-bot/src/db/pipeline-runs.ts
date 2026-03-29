import { getDatabase } from "./client"
import type { 
  PipelineRun, 
  PipelineRunType, 
  PipelineTrigger, 
  PipelineRunStatus,
  StageFailure 
} from "../types/pipeline"
import type { PipelineStage } from "../types/research"

export interface CreatePipelineRunInput {
  tenantId: string
  runType: PipelineRunType
  trigger: PipelineTrigger
}

export interface UpdatePipelineRunInput {
  currentStage?: PipelineStage
  stagesCompleted?: PipelineStage[]
  status?: PipelineRunStatus
  errorMessage?: string
  totalLlmCalls?: number
  totalTokensUsed?: number
  totalCostUsd?: number
}

function mapRowToPipelineRun(row: Record<string, unknown>): PipelineRun {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    runType: row.run_type as PipelineRunType,
    trigger: row.trigger as PipelineTrigger,
    currentStage: row.current_stage as PipelineStage | null,
    stagesCompleted: (row.stages_completed as PipelineStage[]) || [],
    stagesFailed: (row.stages_failed as StageFailure[]) || [],
    status: row.status as PipelineRunStatus,
    errorMessage: row.error_message as string | null,
    totalLlmCalls: row.total_llm_calls as number,
    totalTokensUsed: row.total_tokens_used as number,
    totalCostUsd: row.total_cost_usd ? parseFloat(row.total_cost_usd as string) : 0,
    startedAt: new Date(row.started_at as string),
    completedAt: row.completed_at ? new Date(row.completed_at as string) : null,
    createdAt: new Date(row.created_at as string),
  }
}

export async function createPipelineRun(
  input: CreatePipelineRunInput
): Promise<PipelineRun | null> {
  const db = getDatabase()
  if (!db) return null

  const { data, error } = await db
    .from("intel_pipeline_runs")
    .insert({
      tenant_id: input.tenantId,
      run_type: input.runType,
      trigger: input.trigger,
      current_stage: "intake",
      status: "running",
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating pipeline run:", error)
    return null
  }

  return mapRowToPipelineRun(data)
}

export async function getPipelineRun(id: string): Promise<PipelineRun | null> {
  const db = getDatabase()
  if (!db) return null

  const { data, error } = await db
    .from("intel_pipeline_runs")
    .select("*")
    .eq("id", id)
    .single()

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching pipeline run:", error)
    return null
  }

  return data ? mapRowToPipelineRun(data) : null
}

export async function getLatestPipelineRun(
  tenantId: string
): Promise<PipelineRun | null> {
  const db = getDatabase()
  if (!db) return null

  const { data, error } = await db
    .from("intel_pipeline_runs")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching latest pipeline run:", error)
    return null
  }

  return data ? mapRowToPipelineRun(data) : null
}

export async function getActivePipelineRun(
  tenantId: string
): Promise<PipelineRun | null> {
  const db = getDatabase()
  if (!db) return null

  const { data, error } = await db
    .from("intel_pipeline_runs")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", "running")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching active pipeline run:", error)
    return null
  }

  return data ? mapRowToPipelineRun(data) : null
}

export async function updatePipelineRun(
  id: string,
  input: UpdatePipelineRunInput
): Promise<PipelineRun | null> {
  const db = getDatabase()
  if (!db) return null

  const updateData: Record<string, unknown> = {}

  if (input.currentStage !== undefined) updateData.current_stage = input.currentStage
  if (input.stagesCompleted !== undefined) updateData.stages_completed = input.stagesCompleted
  if (input.status !== undefined) updateData.status = input.status
  if (input.errorMessage !== undefined) updateData.error_message = input.errorMessage
  if (input.totalLlmCalls !== undefined) updateData.total_llm_calls = input.totalLlmCalls
  if (input.totalTokensUsed !== undefined) updateData.total_tokens_used = input.totalTokensUsed
  if (input.totalCostUsd !== undefined) updateData.total_cost_usd = input.totalCostUsd

  if (input.status === "completed" || input.status === "failed" || input.status === "cancelled") {
    updateData.completed_at = new Date().toISOString()
  }

  const { data, error } = await db
    .from("intel_pipeline_runs")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating pipeline run:", error)
    return null
  }

  return mapRowToPipelineRun(data)
}

export async function advancePipelineStage(
  id: string,
  completedStage: PipelineStage,
  nextStage: PipelineStage | null
): Promise<PipelineRun | null> {
  const db = getDatabase()
  if (!db) return null

  const { data: current } = await db
    .from("intel_pipeline_runs")
    .select("stages_completed")
    .eq("id", id)
    .single()

  const stagesCompleted = [...((current?.stages_completed as PipelineStage[]) || []), completedStage]

  const updateData: Record<string, unknown> = {
    stages_completed: stagesCompleted,
    current_stage: nextStage,
  }

  if (nextStage === null || nextStage === "complete") {
    updateData.status = "completed"
    updateData.completed_at = new Date().toISOString()
  }

  const { data, error } = await db
    .from("intel_pipeline_runs")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error advancing pipeline stage:", error)
    return null
  }

  return mapRowToPipelineRun(data)
}

export async function recordStageFailure(
  id: string,
  stage: PipelineStage,
  error: string
): Promise<PipelineRun | null> {
  const db = getDatabase()
  if (!db) return null

  const { data: current } = await db
    .from("intel_pipeline_runs")
    .select("stages_failed")
    .eq("id", id)
    .single()

  const stagesFailed = [
    ...((current?.stages_failed as StageFailure[]) || []),
    { stage, error, timestamp: new Date() },
  ]

  const { data, error: updateError } = await db
    .from("intel_pipeline_runs")
    .update({
      stages_failed: stagesFailed,
      status: "failed",
      error_message: error,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (updateError) {
    console.error("Error recording stage failure:", updateError)
    return null
  }

  return mapRowToPipelineRun(data)
}

export async function getPipelineRunsByTenant(
  tenantId: string,
  limit: number = 10
): Promise<PipelineRun[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("intel_pipeline_runs")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Error fetching pipeline runs:", error)
    return []
  }

  return (data || []).map(mapRowToPipelineRun)
}

export async function getAllActivePipelineRuns(): Promise<PipelineRun[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("intel_pipeline_runs")
    .select("*")
    .eq("status", "running")
    .order("started_at", { ascending: true })

  if (error) {
    console.error("Error fetching active pipeline runs:", error)
    return []
  }

  return (data || []).map(mapRowToPipelineRun)
}

export async function incrementLLMUsage(
  id: string,
  tokens: number,
  cost: number
): Promise<void> {
  const db = getDatabase()
  if (!db) return

  const { data: current } = await db
    .from("intel_pipeline_runs")
    .select("total_llm_calls, total_tokens_used, total_cost_usd")
    .eq("id", id)
    .single()

  if (!current) return

  await db
    .from("intel_pipeline_runs")
    .update({
      total_llm_calls: ((current.total_llm_calls as number) || 0) + 1,
      total_tokens_used: ((current.total_tokens_used as number) || 0) + tokens,
      total_cost_usd: (parseFloat(current.total_cost_usd as string) || 0) + cost,
    })
    .eq("id", id)
}
