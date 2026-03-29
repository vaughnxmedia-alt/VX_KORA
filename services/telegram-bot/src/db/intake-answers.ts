import { getDatabase } from "./client"
import type { IntakeAnswer, AnswerType } from "../types/intake"

export interface CreateIntakeAnswerInput {
  sessionId: string
  tenantId: string
  questionId: string
  questionText: string
  rawAnswer: string
  normalizedAnswer?: string
  answerType?: AnswerType
  confidenceScore?: number
}

export interface UpdateIntakeAnswerInput {
  normalizedAnswer?: string
  answerType?: AnswerType
  confidenceScore?: number
  needsClarification?: boolean
  clarificationReason?: string
  clarificationQuestion?: string
  clarifiedAt?: Date
}

function mapRowToIntakeAnswer(row: Record<string, unknown>): IntakeAnswer {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    tenantId: row.tenant_id as string,
    questionId: row.question_id as string,
    questionText: row.question_text as string,
    rawAnswer: row.raw_answer as string,
    normalizedAnswer: row.normalized_answer as string | null,
    answerType: row.answer_type as AnswerType,
    confidenceScore: parseFloat(row.confidence_score as string) || 1.0,
    needsClarification: row.needs_clarification as boolean,
    clarificationReason: row.clarification_reason as string | null,
    clarificationQuestion: row.clarification_question as string | null,
    clarifiedAt: row.clarified_at ? new Date(row.clarified_at as string) : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

export async function createIntakeAnswer(
  input: CreateIntakeAnswerInput
): Promise<IntakeAnswer | null> {
  const db = getDatabase()
  if (!db) return null

  const { data, error } = await db
    .from("intel_intake_answers")
    .insert({
      session_id: input.sessionId,
      tenant_id: input.tenantId,
      question_id: input.questionId,
      question_text: input.questionText,
      raw_answer: input.rawAnswer,
      normalized_answer: input.normalizedAnswer || null,
      answer_type: input.answerType || "user_provided",
      confidence_score: input.confidenceScore || 1.0,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating intake answer:", error)
    return null
  }

  return mapRowToIntakeAnswer(data)
}

export async function getIntakeAnswersBySession(
  sessionId: string
): Promise<IntakeAnswer[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("intel_intake_answers")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching intake answers:", error)
    return []
  }

  return (data || []).map(mapRowToIntakeAnswer)
}

export async function getIntakeAnswersByTenant(
  tenantId: string
): Promise<IntakeAnswer[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("intel_intake_answers")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching intake answers:", error)
    return []
  }

  return (data || []).map(mapRowToIntakeAnswer)
}

export async function getIntakeAnswer(
  sessionId: string,
  questionId: string
): Promise<IntakeAnswer | null> {
  const db = getDatabase()
  if (!db) return null

  const { data, error } = await db
    .from("intel_intake_answers")
    .select("*")
    .eq("session_id", sessionId)
    .eq("question_id", questionId)
    .single()

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching intake answer:", error)
    return null
  }

  return data ? mapRowToIntakeAnswer(data) : null
}

export async function updateIntakeAnswer(
  id: string,
  input: UpdateIntakeAnswerInput
): Promise<IntakeAnswer | null> {
  const db = getDatabase()
  if (!db) return null

  const updateData: Record<string, unknown> = {}
  
  if (input.normalizedAnswer !== undefined) {
    updateData.normalized_answer = input.normalizedAnswer
  }
  if (input.answerType !== undefined) {
    updateData.answer_type = input.answerType
  }
  if (input.confidenceScore !== undefined) {
    updateData.confidence_score = input.confidenceScore
  }
  if (input.needsClarification !== undefined) {
    updateData.needs_clarification = input.needsClarification
  }
  if (input.clarificationReason !== undefined) {
    updateData.clarification_reason = input.clarificationReason
  }
  if (input.clarificationQuestion !== undefined) {
    updateData.clarification_question = input.clarificationQuestion
  }
  if (input.clarifiedAt !== undefined) {
    updateData.clarified_at = input.clarifiedAt?.toISOString()
  }

  const { data, error } = await db
    .from("intel_intake_answers")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating intake answer:", error)
    return null
  }

  return mapRowToIntakeAnswer(data)
}

export async function markAnswerNeedsClarification(
  id: string,
  reason: string,
  clarificationQuestion: string
): Promise<IntakeAnswer | null> {
  return updateIntakeAnswer(id, {
    needsClarification: true,
    clarificationReason: reason,
    clarificationQuestion,
  })
}

export async function markAnswerClarified(
  id: string,
  clarifiedAnswer: string
): Promise<IntakeAnswer | null> {
  return updateIntakeAnswer(id, {
    normalizedAnswer: clarifiedAnswer,
    answerType: "clarified",
    needsClarification: false,
    clarifiedAt: new Date(),
  })
}

export async function getAnswersNeedingClarification(
  sessionId: string
): Promise<IntakeAnswer[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("intel_intake_answers")
    .select("*")
    .eq("session_id", sessionId)
    .eq("needs_clarification", true)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching answers needing clarification:", error)
    return []
  }

  return (data || []).map(mapRowToIntakeAnswer)
}

export async function deleteIntakeAnswersBySession(
  sessionId: string
): Promise<boolean> {
  const db = getDatabase()
  if (!db) return false

  const { error } = await db
    .from("intel_intake_answers")
    .delete()
    .eq("session_id", sessionId)

  if (error) {
    console.error("Error deleting intake answers:", error)
    return false
  }

  return true
}
