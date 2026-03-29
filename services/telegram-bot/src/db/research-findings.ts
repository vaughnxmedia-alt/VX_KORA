import { getDatabase } from "./client"
import type { 
  ResearchSource, 
  ResearchFinding, 
  ResearchSourceType, 
  ResearchSourceStatus,
  FindingType,
  FindingCategory 
} from "../types/research"

export interface CreateResearchSourceInput {
  tenantId: string
  sourceType: ResearchSourceType
  sourceUrl?: string
  sourceName?: string
}

export interface UpdateResearchSourceInput {
  status?: ResearchSourceStatus
  accessedAt?: Date
  analyzedAt?: Date
  rawContent?: string
  contentLength?: number
  contentType?: string
  errorMessage?: string
  retryCount?: number
}

export interface CreateResearchFindingInput {
  tenantId: string
  sourceId?: string
  findingType: FindingType
  findingCategory: FindingCategory
  summary: string
  details?: Record<string, unknown>
  evidence?: string
  confidenceScore?: number
  relevanceScore?: number
}

function mapRowToResearchSource(row: Record<string, unknown>): ResearchSource {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    sourceType: row.source_type as ResearchSourceType,
    sourceUrl: row.source_url as string | null,
    sourceName: row.source_name as string | null,
    status: row.status as ResearchSourceStatus,
    accessedAt: row.accessed_at ? new Date(row.accessed_at as string) : null,
    analyzedAt: row.analyzed_at ? new Date(row.analyzed_at as string) : null,
    rawContent: row.raw_content as string | null,
    contentLength: row.content_length as number | null,
    contentType: row.content_type as string | null,
    errorMessage: row.error_message as string | null,
    retryCount: row.retry_count as number,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

function mapRowToResearchFinding(row: Record<string, unknown>): ResearchFinding {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    sourceId: row.source_id as string | null,
    findingType: row.finding_type as FindingType,
    findingCategory: row.finding_category as FindingCategory,
    summary: row.summary as string,
    details: (row.details as Record<string, unknown>) || {},
    evidence: row.evidence as string | null,
    confidenceScore: row.confidence_score ? parseFloat(row.confidence_score as string) : 0.5,
    relevanceScore: row.relevance_score ? parseFloat(row.relevance_score as string) : 0.5,
    usedInDeliverable: row.used_in_deliverable as boolean,
    usedInSection: row.used_in_section as string | null,
    createdAt: new Date(row.created_at as string),
  }
}

export async function createResearchSource(
  input: CreateResearchSourceInput
): Promise<ResearchSource | null> {
  const db = getDatabase()
  if (!db) return null

  const { data, error } = await db
    .from("intel_research_sources")
    .insert({
      tenant_id: input.tenantId,
      source_type: input.sourceType,
      source_url: input.sourceUrl || null,
      source_name: input.sourceName || null,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating research source:", error)
    return null
  }

  return mapRowToResearchSource(data)
}

export async function getResearchSourcesByTenant(
  tenantId: string
): Promise<ResearchSource[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("intel_research_sources")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching research sources:", error)
    return []
  }

  return (data || []).map(mapRowToResearchSource)
}

export async function updateResearchSource(
  id: string,
  input: UpdateResearchSourceInput
): Promise<ResearchSource | null> {
  const db = getDatabase()
  if (!db) return null

  const updateData: Record<string, unknown> = {}

  if (input.status !== undefined) updateData.status = input.status
  if (input.accessedAt !== undefined) updateData.accessed_at = input.accessedAt?.toISOString()
  if (input.analyzedAt !== undefined) updateData.analyzed_at = input.analyzedAt?.toISOString()
  if (input.rawContent !== undefined) updateData.raw_content = input.rawContent
  if (input.contentLength !== undefined) updateData.content_length = input.contentLength
  if (input.contentType !== undefined) updateData.content_type = input.contentType
  if (input.errorMessage !== undefined) updateData.error_message = input.errorMessage
  if (input.retryCount !== undefined) updateData.retry_count = input.retryCount

  const { data, error } = await db
    .from("intel_research_sources")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating research source:", error)
    return null
  }

  return mapRowToResearchSource(data)
}

export async function createResearchFinding(
  input: CreateResearchFindingInput
): Promise<ResearchFinding | null> {
  const db = getDatabase()
  if (!db) return null

  const { data, error } = await db
    .from("intel_research_findings")
    .insert({
      tenant_id: input.tenantId,
      source_id: input.sourceId || null,
      finding_type: input.findingType,
      finding_category: input.findingCategory,
      summary: input.summary,
      details: input.details || {},
      evidence: input.evidence || null,
      confidence_score: input.confidenceScore || 0.5,
      relevance_score: input.relevanceScore || 0.5,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating research finding:", error)
    return null
  }

  return mapRowToResearchFinding(data)
}

export async function getResearchFindingsByTenant(
  tenantId: string
): Promise<ResearchFinding[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("intel_research_findings")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("confidence_score", { ascending: false })

  if (error) {
    console.error("Error fetching research findings:", error)
    return []
  }

  return (data || []).map(mapRowToResearchFinding)
}

export async function getResearchFindingsByType(
  tenantId: string,
  findingType: FindingType
): Promise<ResearchFinding[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("intel_research_findings")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("finding_type", findingType)
    .order("confidence_score", { ascending: false })

  if (error) {
    console.error("Error fetching research findings by type:", error)
    return []
  }

  return (data || []).map(mapRowToResearchFinding)
}

export async function getHighConfidenceFindings(
  tenantId: string,
  minConfidence: number = 0.7
): Promise<ResearchFinding[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("intel_research_findings")
    .select("*")
    .eq("tenant_id", tenantId)
    .gte("confidence_score", minConfidence)
    .order("confidence_score", { ascending: false })

  if (error) {
    console.error("Error fetching high confidence findings:", error)
    return []
  }

  return (data || []).map(mapRowToResearchFinding)
}

export async function markFindingUsed(
  id: string,
  usedInSection: string
): Promise<ResearchFinding | null> {
  const db = getDatabase()
  if (!db) return null

  const { data, error } = await db
    .from("intel_research_findings")
    .update({
      used_in_deliverable: true,
      used_in_section: usedInSection,
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error marking finding as used:", error)
    return null
  }

  return mapRowToResearchFinding(data)
}

export async function deleteResearchDataByTenant(
  tenantId: string
): Promise<boolean> {
  const db = getDatabase()
  if (!db) return false

  const { error: findingsError } = await db
    .from("intel_research_findings")
    .delete()
    .eq("tenant_id", tenantId)

  if (findingsError) {
    console.error("Error deleting research findings:", findingsError)
    return false
  }

  const { error: sourcesError } = await db
    .from("intel_research_sources")
    .delete()
    .eq("tenant_id", tenantId)

  if (sourcesError) {
    console.error("Error deleting research sources:", sourcesError)
    return false
  }

  return true
}
