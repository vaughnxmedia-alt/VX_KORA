/**
 * Tenant Brain Database Layer
 * 
 * CONFIDENTIALITY ARCHITECTURE:
 * 
 * This module provides access to TENANT-SPECIFIC data.
 * All functions REQUIRE a tenant_id parameter.
 * All queries are ALWAYS filtered by tenant_id.
 * 
 * CRITICAL RULES:
 * - EVERY function takes tenant_id as first parameter
 * - EVERY query includes WHERE tenant_id = $tenant_id
 * - NEVER query without tenant_id filter
 * - NEVER return data from multiple tenants
 * - Log all access for audit trail
 */

import { getDatabase } from "./client"
import {
  createTenantScopeEnforcer,
  type TenantScopeEnforcer,
} from "../types/confidentiality"
import type {
  TenantRagDocument,
  TenantApprovalHistory,
  TenantCampaignIdea,
  TenantRagCategory,
  ApprovalType,
  CampaignCategory,
  CampaignStatus,
} from "../types/tenant-brain"

// ============================================================================
// TENANT SCOPE ENFORCEMENT
// ============================================================================

/**
 * Validates that a query is properly scoped to the tenant.
 * Throws an error if tenant_id is missing or mismatched.
 */
function enforceScope(
  enforcer: TenantScopeEnforcer,
  table: string,
  providedTenantId?: string
): void {
  const validation = enforcer.validateQuery(table, providedTenantId)
  
  if (!validation.isValid) {
    console.error(`[CONFIDENTIALITY VIOLATION] ${validation.error}`)
    throw new Error(`Confidentiality violation: ${validation.error}`)
  }
}

/**
 * Logs access to tenant data for audit purposes.
 */
function logTenantAccess(
  tenantId: string,
  table: string,
  operation: "read" | "write" | "delete",
  recordCount?: number
): void {
  console.log(
    `[TENANT ACCESS] tenant=${tenantId} table=${table} op=${operation}` +
    (recordCount !== undefined ? ` records=${recordCount}` : "")
  )
}

// ============================================================================
// TENANT RAG DOCUMENTS
// ============================================================================

function mapRowToTenantRagDocument(row: Record<string, unknown>): TenantRagDocument {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    title: row.title as string,
    category: row.category as TenantRagCategory,
    content: row.content as string,
    summary: row.summary as string | undefined,
    sourceType: row.source_type as TenantRagDocument["sourceType"],
    sourceId: row.source_id as string | undefined,
    chunkIndex: row.chunk_index as number,
    parentDocumentId: row.parent_document_id as string | undefined,
    embedding: row.embedding as number[] | undefined,
    isActive: row.is_active as boolean,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

/**
 * Creates a new tenant RAG document.
 * 
 * CONFIDENTIALITY: Document is scoped to specified tenant only.
 */
export async function createTenantRagDocument(
  tenantId: string,
  input: {
    title: string
    category: TenantRagCategory
    content: string
    summary?: string
    sourceType: TenantRagDocument["sourceType"]
    sourceId?: string
    chunkIndex?: number
    parentDocumentId?: string
    embedding?: number[]
  }
): Promise<TenantRagDocument | null> {
  const db = getDatabase()
  if (!db) return null

  const enforcer = createTenantScopeEnforcer(tenantId)
  enforceScope(enforcer, "tenant_rag_documents", tenantId)

  const { data, error } = await db
    .from("tenant_rag_documents")
    .insert({
      tenant_id: tenantId,
      title: input.title,
      category: input.category,
      content: input.content,
      summary: input.summary,
      source_type: input.sourceType,
      source_id: input.sourceId,
      chunk_index: input.chunkIndex || 0,
      parent_document_id: input.parentDocumentId,
      embedding: input.embedding,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating tenant RAG document:", error)
    return null
  }

  logTenantAccess(tenantId, "tenant_rag_documents", "write", 1)
  return mapRowToTenantRagDocument(data)
}

/**
 * Gets all RAG documents for a tenant.
 * 
 * CONFIDENTIALITY: Only returns documents for the specified tenant.
 */
export async function getTenantRagDocuments(
  tenantId: string,
  category?: TenantRagCategory,
  limit: number = 100
): Promise<TenantRagDocument[]> {
  const db = getDatabase()
  if (!db) return []

  const enforcer = createTenantScopeEnforcer(tenantId)
  enforceScope(enforcer, "tenant_rag_documents", tenantId)

  let query = db
    .from("tenant_rag_documents")
    .select("*")
    .eq("tenant_id", tenantId) // CRITICAL: Always filter by tenant_id
    .eq("is_active", true)

  if (category) {
    query = query.eq("category", category)
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Error fetching tenant RAG documents:", error)
    return []
  }

  logTenantAccess(tenantId, "tenant_rag_documents", "read", data?.length || 0)
  return (data || []).map(mapRowToTenantRagDocument)
}

/**
 * Searches tenant RAG documents with text search.
 * 
 * CONFIDENTIALITY: Only searches within the specified tenant's documents.
 */
export async function searchTenantRagDocuments(
  tenantId: string,
  query: string,
  category?: TenantRagCategory,
  limit: number = 10
): Promise<TenantRagDocument[]> {
  const db = getDatabase()
  if (!db) return []

  const enforcer = createTenantScopeEnforcer(tenantId)
  enforceScope(enforcer, "tenant_rag_documents", tenantId)

  let queryBuilder = db
    .from("tenant_rag_documents")
    .select("*")
    .eq("tenant_id", tenantId) // CRITICAL: Always filter by tenant_id
    .eq("is_active", true)
    .textSearch("content", query)

  if (category) {
    queryBuilder = queryBuilder.eq("category", category)
  }

  const { data, error } = await queryBuilder.limit(limit)

  if (error) {
    console.error("Error searching tenant RAG documents:", error)
    return []
  }

  logTenantAccess(tenantId, "tenant_rag_documents", "read", data?.length || 0)
  return (data || []).map(mapRowToTenantRagDocument)
}

// ============================================================================
// TENANT APPROVAL HISTORY
// ============================================================================

function mapRowToApprovalHistory(row: Record<string, unknown>): TenantApprovalHistory {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    approvalType: row.approval_type as ApprovalType,
    itemId: row.item_id as string,
    itemDescription: row.item_description as string | undefined,
    approved: row.approved as boolean,
    approvedAt: new Date(row.approved_at as string),
    approvedVia: row.approved_via as TenantApprovalHistory["approvedVia"],
    telegramMessageId: row.telegram_message_id as number | undefined,
    feedbackNotes: row.feedback_notes as string | undefined,
    createdAt: new Date(row.created_at as string),
  }
}

/**
 * Records an approval decision.
 * 
 * CONFIDENTIALITY: Approval is recorded for specified tenant only.
 */
export async function recordApproval(
  tenantId: string,
  input: {
    approvalType: ApprovalType
    itemId: string
    itemDescription?: string
    approved: boolean
    approvedVia: TenantApprovalHistory["approvedVia"]
    telegramMessageId?: number
    feedbackNotes?: string
  }
): Promise<TenantApprovalHistory | null> {
  const db = getDatabase()
  if (!db) return null

  const enforcer = createTenantScopeEnforcer(tenantId)
  enforceScope(enforcer, "tenant_approval_history", tenantId)

  const { data, error } = await db
    .from("tenant_approval_history")
    .insert({
      tenant_id: tenantId,
      approval_type: input.approvalType,
      item_id: input.itemId,
      item_description: input.itemDescription,
      approved: input.approved,
      approved_via: input.approvedVia,
      telegram_message_id: input.telegramMessageId,
      feedback_notes: input.feedbackNotes,
    })
    .select()
    .single()

  if (error) {
    console.error("Error recording approval:", error)
    return null
  }

  logTenantAccess(tenantId, "tenant_approval_history", "write", 1)
  return mapRowToApprovalHistory(data)
}

/**
 * Gets approval history for a tenant.
 * 
 * CONFIDENTIALITY: Only returns approvals for the specified tenant.
 */
export async function getTenantApprovalHistory(
  tenantId: string,
  approvalType?: ApprovalType,
  limit: number = 50
): Promise<TenantApprovalHistory[]> {
  const db = getDatabase()
  if (!db) return []

  const enforcer = createTenantScopeEnforcer(tenantId)
  enforceScope(enforcer, "tenant_approval_history", tenantId)

  let query = db
    .from("tenant_approval_history")
    .select("*")
    .eq("tenant_id", tenantId) // CRITICAL: Always filter by tenant_id

  if (approvalType) {
    query = query.eq("approval_type", approvalType)
  }

  const { data, error } = await query
    .order("approved_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Error fetching approval history:", error)
    return []
  }

  logTenantAccess(tenantId, "tenant_approval_history", "read", data?.length || 0)
  return (data || []).map(mapRowToApprovalHistory)
}

// ============================================================================
// TENANT CAMPAIGN IDEAS
// ============================================================================

function mapRowToCampaignIdea(row: Record<string, unknown>): TenantCampaignIdea {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    name: row.name as string,
    category: row.category as CampaignCategory | undefined,
    objective: row.objective as string,
    targetAudience: row.target_audience as string | undefined,
    keyMessages: row.key_messages as string[],
    channels: row.channels as string[],
    contentTypes: row.content_types as string[],
    timeline: row.timeline as string | undefined,
    status: row.status as CampaignStatus,
    confidenceScore: row.confidence_score ? parseFloat(row.confidence_score as string) : undefined,
    generatedFrom: row.generated_from as TenantCampaignIdea["generatedFrom"],
    sourceDeliverableId: row.source_deliverable_id as string | undefined,
    approved: row.approved as boolean,
    approvedAt: row.approved_at ? new Date(row.approved_at as string) : undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

/**
 * Creates a campaign idea for a tenant.
 * 
 * CONFIDENTIALITY: Campaign is created for specified tenant only.
 */
export async function createCampaignIdea(
  tenantId: string,
  input: {
    name: string
    category?: CampaignCategory
    objective: string
    targetAudience?: string
    keyMessages: string[]
    channels: string[]
    contentTypes: string[]
    timeline?: string
    confidenceScore?: number
    generatedFrom: TenantCampaignIdea["generatedFrom"]
    sourceDeliverableId?: string
  }
): Promise<TenantCampaignIdea | null> {
  const db = getDatabase()
  if (!db) return null

  const enforcer = createTenantScopeEnforcer(tenantId)
  enforceScope(enforcer, "tenant_campaign_ideas", tenantId)

  const { data, error } = await db
    .from("tenant_campaign_ideas")
    .insert({
      tenant_id: tenantId,
      name: input.name,
      category: input.category,
      objective: input.objective,
      target_audience: input.targetAudience,
      key_messages: input.keyMessages,
      channels: input.channels,
      content_types: input.contentTypes,
      timeline: input.timeline,
      confidence_score: input.confidenceScore,
      generated_from: input.generatedFrom,
      source_deliverable_id: input.sourceDeliverableId,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating campaign idea:", error)
    return null
  }

  logTenantAccess(tenantId, "tenant_campaign_ideas", "write", 1)
  return mapRowToCampaignIdea(data)
}

/**
 * Gets campaign ideas for a tenant.
 * 
 * CONFIDENTIALITY: Only returns campaigns for the specified tenant.
 */
export async function getTenantCampaignIdeas(
  tenantId: string,
  status?: CampaignStatus,
  limit: number = 50
): Promise<TenantCampaignIdea[]> {
  const db = getDatabase()
  if (!db) return []

  const enforcer = createTenantScopeEnforcer(tenantId)
  enforceScope(enforcer, "tenant_campaign_ideas", tenantId)

  let query = db
    .from("tenant_campaign_ideas")
    .select("*")
    .eq("tenant_id", tenantId) // CRITICAL: Always filter by tenant_id

  if (status) {
    query = query.eq("status", status)
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Error fetching campaign ideas:", error)
    return []
  }

  logTenantAccess(tenantId, "tenant_campaign_ideas", "read", data?.length || 0)
  return (data || []).map(mapRowToCampaignIdea)
}

/**
 * Updates a campaign idea status.
 * 
 * CONFIDENTIALITY: Only updates if campaign belongs to specified tenant.
 */
export async function updateCampaignStatus(
  tenantId: string,
  campaignId: string,
  status: CampaignStatus,
  approved?: boolean
): Promise<TenantCampaignIdea | null> {
  const db = getDatabase()
  if (!db) return null

  const enforcer = createTenantScopeEnforcer(tenantId)
  enforceScope(enforcer, "tenant_campaign_ideas", tenantId)

  const updateData: Record<string, unknown> = { status }
  if (approved !== undefined) {
    updateData.approved = approved
    if (approved) {
      updateData.approved_at = new Date().toISOString()
    }
  }

  const { data, error } = await db
    .from("tenant_campaign_ideas")
    .update(updateData)
    .eq("id", campaignId)
    .eq("tenant_id", tenantId) // CRITICAL: Ensure we only update this tenant's data
    .select()
    .single()

  if (error) {
    console.error("Error updating campaign status:", error)
    return null
  }

  logTenantAccess(tenantId, "tenant_campaign_ideas", "write", 1)
  return mapRowToCampaignIdea(data)
}

// ============================================================================
// AGGREGATE TENANT BRAIN LOADER
// ============================================================================

/**
 * Loads all Tenant Brain data needed for agent context.
 * This is the "private client file" that is NEVER shared between tenants.
 * 
 * CONFIDENTIALITY: All data is scoped to the specified tenant.
 */
export interface TenantBrainData {
  tenantId: string
  ragDocuments: TenantRagDocument[]
  approvalHistory: TenantApprovalHistory[]
  campaignIdeas: TenantCampaignIdea[]
}

export async function loadTenantBrain(tenantId: string): Promise<TenantBrainData> {
  // Validate tenant_id is provided
  if (!tenantId) {
    throw new Error("Confidentiality violation: tenant_id is required to load Tenant Brain")
  }

  const [
    ragDocuments,
    approvalHistory,
    campaignIdeas,
  ] = await Promise.all([
    getTenantRagDocuments(tenantId),
    getTenantApprovalHistory(tenantId),
    getTenantCampaignIdeas(tenantId),
  ])

  console.log(
    `[TENANT BRAIN LOADED] tenant=${tenantId} ` +
    `docs=${ragDocuments.length} approvals=${approvalHistory.length} campaigns=${campaignIdeas.length}`
  )

  return {
    tenantId,
    ragDocuments,
    approvalHistory,
    campaignIdeas,
  }
}
