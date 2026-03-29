import { getDatabase } from "./client"
import type { 
  TestingFeedback, 
  FeedbackForm, 
  FeedbackSummary,
  SpecificIssue 
} from "../types/testing"
import type { DeliverableType } from "../types/deliverables"

function mapRowToTestingFeedback(row: Record<string, unknown>): TestingFeedback {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    deliverableType: row.deliverable_type as DeliverableType,
    deliverableId: row.deliverable_id as string,
    pipelineRunId: row.pipeline_run_id as string | null,
    testerTelegramId: row.tester_telegram_id as number | null,
    testerName: row.tester_name as string | null,
    contextQuality: row.context_quality as number | null,
    researchDepth: row.research_depth as number | null,
    usefulness: row.usefulness as number | null,
    brandAlignment: row.brand_alignment as number | null,
    formattingQuality: row.formatting_quality as number | null,
    overallGrade: row.overall_grade as number | null,
    feedbackNotes: row.feedback_notes as string | null,
    improvementSuggestions: row.improvement_suggestions as string | null,
    specificIssues: (row.specific_issues as SpecificIssue[]) || [],
    whatWorkedWell: (row.what_worked_well as string[]) || [],
    createdAt: new Date(row.created_at as string),
  }
}

export async function createTestingFeedback(
  tenantId: string,
  form: FeedbackForm,
  testerTelegramId?: number,
  testerName?: string,
  pipelineRunId?: string
): Promise<TestingFeedback | null> {
  const db = getDatabase()
  if (!db) return null

  const { data, error } = await db
    .from("intel_testing_feedback")
    .insert({
      tenant_id: tenantId,
      deliverable_type: form.deliverableType,
      deliverable_id: form.deliverableId,
      pipeline_run_id: pipelineRunId || null,
      tester_telegram_id: testerTelegramId || null,
      tester_name: testerName || null,
      context_quality: form.contextQuality || null,
      research_depth: form.researchDepth || null,
      usefulness: form.usefulness || null,
      brand_alignment: form.brandAlignment || null,
      formatting_quality: form.formattingQuality || null,
      overall_grade: form.overallGrade || null,
      feedback_notes: form.feedbackNotes || null,
      improvement_suggestions: form.improvementSuggestions || null,
      specific_issues: form.specificIssues || [],
      what_worked_well: form.whatWorkedWell || [],
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating testing feedback:", error)
    return null
  }

  return mapRowToTestingFeedback(data)
}

export async function getFeedbackByDeliverable(
  deliverableType: DeliverableType,
  deliverableId: string
): Promise<TestingFeedback[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("intel_testing_feedback")
    .select("*")
    .eq("deliverable_type", deliverableType)
    .eq("deliverable_id", deliverableId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching feedback by deliverable:", error)
    return []
  }

  return (data || []).map(mapRowToTestingFeedback)
}

export async function getFeedbackByTenant(
  tenantId: string
): Promise<TestingFeedback[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("intel_testing_feedback")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching feedback by tenant:", error)
    return []
  }

  return (data || []).map(mapRowToTestingFeedback)
}

export async function getFeedbackByTester(
  testerTelegramId: number
): Promise<TestingFeedback[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("intel_testing_feedback")
    .select("*")
    .eq("tester_telegram_id", testerTelegramId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching feedback by tester:", error)
    return []
  }

  return (data || []).map(mapRowToTestingFeedback)
}

export async function getAllFeedback(
  limit: number = 100
): Promise<TestingFeedback[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("intel_testing_feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Error fetching all feedback:", error)
    return []
  }

  return (data || []).map(mapRowToTestingFeedback)
}

export async function getTenantFeedbackSummary(
  tenantId: string
): Promise<FeedbackSummary | null> {
  const feedback = await getFeedbackByTenant(tenantId)
  
  if (feedback.length === 0) {
    return null
  }

  const withGrades = feedback.filter(f => f.overallGrade !== null)
  
  const avg = (values: (number | null)[]) => {
    const valid = values.filter((v): v is number => v !== null)
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : 0
  }

  const allIssues = feedback.flatMap(f => f.specificIssues.map(i => i.issue))
  const allPraise = feedback.flatMap(f => f.whatWorkedWell)

  const issueCount = new Map<string, number>()
  allIssues.forEach(issue => {
    issueCount.set(issue, (issueCount.get(issue) || 0) + 1)
  })

  const praiseCount = new Map<string, number>()
  allPraise.forEach(praise => {
    praiseCount.set(praise, (praiseCount.get(praise) || 0) + 1)
  })

  return {
    tenantId,
    totalFeedback: feedback.length,
    averageContextQuality: avg(withGrades.map(f => f.contextQuality)),
    averageResearchDepth: avg(withGrades.map(f => f.researchDepth)),
    averageUsefulness: avg(withGrades.map(f => f.usefulness)),
    averageBrandAlignment: avg(withGrades.map(f => f.brandAlignment)),
    averageFormattingQuality: avg(withGrades.map(f => f.formattingQuality)),
    averageOverallGrade: avg(withGrades.map(f => f.overallGrade)),
    commonIssues: [...issueCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([issue]) => issue),
    commonPraise: [...praiseCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([praise]) => praise),
  }
}

export async function getLowRatedDeliverables(
  threshold: number = 3
): Promise<TestingFeedback[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("intel_testing_feedback")
    .select("*")
    .not("overall_grade", "is", null)
    .lte("overall_grade", threshold)
    .order("overall_grade", { ascending: true })

  if (error) {
    console.error("Error fetching low rated deliverables:", error)
    return []
  }

  return (data || []).map(mapRowToTestingFeedback)
}

export async function deleteFeedbackByTenant(
  tenantId: string
): Promise<boolean> {
  const db = getDatabase()
  if (!db) return false

  const { error } = await db
    .from("intel_testing_feedback")
    .delete()
    .eq("tenant_id", tenantId)

  if (error) {
    console.error("Error deleting testing feedback:", error)
    return false
  }

  return true
}
