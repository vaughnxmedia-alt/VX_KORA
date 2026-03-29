import { getDatabase } from "./client"
import type {
  DeliverableReview,
  DeliverableType,
  MalformedField,
  GenericStatement,
  UnsupportedAssumption,
  MissingResearch,
  ImprovementAction,
  ConfidenceScore,
  SourceType,
  SupportingEvidence,
} from "../types/deliverables"

export interface CreateDeliverableReviewInput {
  tenantId: string
  deliverableType: DeliverableType
  deliverableId: string
  reviewRound?: number
  formattingScore?: number
  specificityScore?: number
  researchDepthScore?: number
  brandAlignmentScore?: number
  actionabilityScore?: number
  overallScore?: number
  malformedFields?: MalformedField[]
  genericStatements?: GenericStatement[]
  unsupportedAssumptions?: UnsupportedAssumption[]
  missingResearch?: MissingResearch[]
  passedReview: boolean
  reviewNotes?: string
  improvementActions?: ImprovementAction[]
}

export interface CreateConfidenceScoreInput {
  tenantId: string
  deliverableType: DeliverableType
  deliverableId: string
  fieldPath: string
  confidenceScore: number
  sourceType: SourceType
  supportingEvidence?: SupportingEvidence[]
}

function mapRowToDeliverableReview(row: Record<string, unknown>): DeliverableReview {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    deliverableType: row.deliverable_type as DeliverableType,
    deliverableId: row.deliverable_id as string,
    reviewRound: row.review_round as number,
    formattingScore: row.formatting_score ? parseFloat(row.formatting_score as string) : null,
    specificityScore: row.specificity_score ? parseFloat(row.specificity_score as string) : null,
    researchDepthScore: row.research_depth_score ? parseFloat(row.research_depth_score as string) : null,
    brandAlignmentScore: row.brand_alignment_score ? parseFloat(row.brand_alignment_score as string) : null,
    actionabilityScore: row.actionability_score ? parseFloat(row.actionability_score as string) : null,
    overallScore: row.overall_score ? parseFloat(row.overall_score as string) : null,
    malformedFields: (row.malformed_fields as MalformedField[]) || [],
    genericStatements: (row.generic_statements as GenericStatement[]) || [],
    unsupportedAssumptions: (row.unsupported_assumptions as UnsupportedAssumption[]) || [],
    missingResearch: (row.missing_research as MissingResearch[]) || [],
    passedReview: row.passed_review as boolean,
    reviewNotes: row.review_notes as string | null,
    improvementActions: (row.improvement_actions as ImprovementAction[]) || [],
    reviewedAt: new Date(row.reviewed_at as string),
    createdAt: new Date(row.created_at as string),
  }
}

function mapRowToConfidenceScore(row: Record<string, unknown>): ConfidenceScore {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    deliverableType: row.deliverable_type as DeliverableType,
    deliverableId: row.deliverable_id as string,
    fieldPath: row.field_path as string,
    confidenceScore: parseFloat(row.confidence_score as string),
    sourceType: row.source_type as SourceType,
    supportingEvidence: (row.supporting_evidence as SupportingEvidence[]) || [],
    createdAt: new Date(row.created_at as string),
  }
}

export async function createDeliverableReview(
  input: CreateDeliverableReviewInput
): Promise<DeliverableReview | null> {
  const db = getDatabase()
  if (!db) return null

  const { data: existing } = await db
    .from("intel_deliverable_reviews")
    .select("review_round")
    .eq("deliverable_type", input.deliverableType)
    .eq("deliverable_id", input.deliverableId)
    .order("review_round", { ascending: false })
    .limit(1)
    .single()

  const nextRound = input.reviewRound || (existing ? (existing.review_round as number) + 1 : 1)

  const { data, error } = await db
    .from("intel_deliverable_reviews")
    .insert({
      tenant_id: input.tenantId,
      deliverable_type: input.deliverableType,
      deliverable_id: input.deliverableId,
      review_round: nextRound,
      formatting_score: input.formattingScore,
      specificity_score: input.specificityScore,
      research_depth_score: input.researchDepthScore,
      brand_alignment_score: input.brandAlignmentScore,
      actionability_score: input.actionabilityScore,
      overall_score: input.overallScore,
      malformed_fields: input.malformedFields || [],
      generic_statements: input.genericStatements || [],
      unsupported_assumptions: input.unsupportedAssumptions || [],
      missing_research: input.missingResearch || [],
      passed_review: input.passedReview,
      review_notes: input.reviewNotes,
      improvement_actions: input.improvementActions || [],
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating deliverable review:", error)
    return null
  }

  return mapRowToDeliverableReview(data)
}

export async function getDeliverableReviews(
  deliverableType: DeliverableType,
  deliverableId: string
): Promise<DeliverableReview[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("intel_deliverable_reviews")
    .select("*")
    .eq("deliverable_type", deliverableType)
    .eq("deliverable_id", deliverableId)
    .order("review_round", { ascending: false })

  if (error) {
    console.error("Error fetching deliverable reviews:", error)
    return []
  }

  return (data || []).map(mapRowToDeliverableReview)
}

export async function getLatestReview(
  deliverableType: DeliverableType,
  deliverableId: string
): Promise<DeliverableReview | null> {
  const db = getDatabase()
  if (!db) return null

  const { data, error } = await db
    .from("intel_deliverable_reviews")
    .select("*")
    .eq("deliverable_type", deliverableType)
    .eq("deliverable_id", deliverableId)
    .order("review_round", { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching latest review:", error)
    return null
  }

  return data ? mapRowToDeliverableReview(data) : null
}

export async function getReviewsByTenant(
  tenantId: string
): Promise<DeliverableReview[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("intel_deliverable_reviews")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("reviewed_at", { ascending: false })

  if (error) {
    console.error("Error fetching reviews by tenant:", error)
    return []
  }

  return (data || []).map(mapRowToDeliverableReview)
}

export async function getFailedReviews(
  tenantId: string
): Promise<DeliverableReview[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("intel_deliverable_reviews")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("passed_review", false)
    .order("reviewed_at", { ascending: false })

  if (error) {
    console.error("Error fetching failed reviews:", error)
    return []
  }

  return (data || []).map(mapRowToDeliverableReview)
}

export async function upsertConfidenceScore(
  input: CreateConfidenceScoreInput
): Promise<ConfidenceScore | null> {
  const db = getDatabase()
  if (!db) return null

  const { data, error } = await db
    .from("intel_confidence_scores")
    .upsert({
      tenant_id: input.tenantId,
      deliverable_type: input.deliverableType,
      deliverable_id: input.deliverableId,
      field_path: input.fieldPath,
      confidence_score: input.confidenceScore,
      source_type: input.sourceType,
      supporting_evidence: input.supportingEvidence || [],
    }, {
      onConflict: "deliverable_type,deliverable_id,field_path",
    })
    .select()
    .single()

  if (error) {
    console.error("Error upserting confidence score:", error)
    return null
  }

  return mapRowToConfidenceScore(data)
}

export async function getConfidenceScores(
  deliverableType: DeliverableType,
  deliverableId: string
): Promise<ConfidenceScore[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("intel_confidence_scores")
    .select("*")
    .eq("deliverable_type", deliverableType)
    .eq("deliverable_id", deliverableId)
    .order("field_path")

  if (error) {
    console.error("Error fetching confidence scores:", error)
    return []
  }

  return (data || []).map(mapRowToConfidenceScore)
}

export async function getLowConfidenceFields(
  deliverableType: DeliverableType,
  deliverableId: string,
  threshold: number = 0.6
): Promise<ConfidenceScore[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("intel_confidence_scores")
    .select("*")
    .eq("deliverable_type", deliverableType)
    .eq("deliverable_id", deliverableId)
    .lt("confidence_score", threshold)
    .order("confidence_score")

  if (error) {
    console.error("Error fetching low confidence fields:", error)
    return []
  }

  return (data || []).map(mapRowToConfidenceScore)
}

export async function deleteReviewsByTenant(
  tenantId: string
): Promise<boolean> {
  const db = getDatabase()
  if (!db) return false

  const { error: reviewsError } = await db
    .from("intel_deliverable_reviews")
    .delete()
    .eq("tenant_id", tenantId)

  if (reviewsError) {
    console.error("Error deleting reviews:", reviewsError)
    return false
  }

  const { error: scoresError } = await db
    .from("intel_confidence_scores")
    .delete()
    .eq("tenant_id", tenantId)

  if (scoresError) {
    console.error("Error deleting confidence scores:", scoresError)
    return false
  }

  return true
}
