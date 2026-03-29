/**
 * KORA RAG Retriever
 * 
 * CONFIDENTIALITY ARCHITECTURE:
 * 
 * This retriever enforces strict namespace boundaries:
 * 
 * - retrieveFromGlobal(): Only accesses Core Brain (public knowledge)
 * - retrieveFromTenant(): Only accesses one tenant's data
 * - retrieveForAgent(): Combines global + current tenant only
 * 
 * CRITICAL: The retriever NEVER returns data from other tenants.
 */

import {
  searchCoreRagDocuments,
  getCoreRagDocumentsByCategory,
  loadCoreBrainForTask,
} from "../db/core-brain"
import {
  searchTenantRagDocuments,
  getTenantRagDocuments,
} from "../db/tenant-brain"
import { getIntakeAnswersByTenant } from "../db/intake-answers"
import { getResearchFindingsByTenant } from "../db/research-findings"
import { getSocialAuditsByTenant } from "../db/social-audits"
import { getBrandBlueprint, getContentStrategy, getAudienceAnalysis } from "../db/deliverables"

import type {
  GlobalNamespaceConfig,
  TenantNamespaceConfig,
  RetrievalResult,
} from "./namespaces"
import {
  assertTenantScope,
  validateRetrievalResults,
  globalNamespace,
  tenantNamespace,
} from "./namespaces"
import type { DeliverableTypeOrAll, SocialPlatform } from "../types/core-brain"

// ============================================================================
// GLOBAL RETRIEVAL (Core Brain)
// ============================================================================

/**
 * Retrieves from the global namespace only.
 * 
 * CONFIDENTIALITY: This function NEVER accesses tenant data.
 * Results can be safely used for any tenant.
 */
export async function retrieveFromGlobal(
  query: string,
  config?: Partial<GlobalNamespaceConfig>
): Promise<RetrievalResult[]> {
  const fullConfig = globalNamespace(config)
  
  // Search core RAG documents
  const docs = await searchCoreRagDocuments(
    query,
    fullConfig.categories?.[0], // Category filter if provided
    fullConfig.maxResults || 10
  )

  const results: RetrievalResult[] = docs.map(doc => ({
    id: doc.id,
    namespace: "global" as const,
    // NO tenant_id for global results
    title: doc.title,
    content: doc.content,
    summary: doc.summary,
    sourceCategory: doc.category as RetrievalResult["sourceCategory"],
    sourceId: doc.id,
    relevanceScore: 0.8, // Default score, should be from vector search
    createdAt: doc.createdAt,
  }))

  // Validate results are properly global
  const validation = validateRetrievalResults(results)
  if (!validation.valid) {
    console.error("[CONFIDENTIALITY] Global retrieval validation failed:", validation.violations)
    // Filter out any problematic results
    return results.filter(r => !r.tenantId)
  }

  return results
}

// ============================================================================
// TENANT RETRIEVAL (Tenant Brain)
// ============================================================================

/**
 * Retrieves from a single tenant's namespace only.
 * 
 * CONFIDENTIALITY: This function ONLY accesses the specified tenant's data.
 * Results are NEVER from other tenants.
 */
export async function retrieveFromTenant(
  tenantId: string,
  query: string,
  config?: Partial<Omit<TenantNamespaceConfig, "tenantId">>
): Promise<RetrievalResult[]> {
  // CRITICAL: Validate tenant_id is provided
  if (!tenantId) {
    throw new Error("[CONFIDENTIALITY VIOLATION] retrieveFromTenant requires tenant_id")
  }

  const fullConfig = tenantNamespace(tenantId, config)
  assertTenantScope(fullConfig, tenantId)

  // Search tenant RAG documents
  const docs = await searchTenantRagDocuments(
    tenantId,
    query,
    fullConfig.categories?.[0] as any,
    fullConfig.maxResults || 20
  )

  const results: RetrievalResult[] = docs.map(doc => ({
    id: doc.id,
    namespace: "tenant" as const,
    tenantId: doc.tenantId, // MUST be present for tenant results
    title: doc.title,
    content: doc.content,
    summary: doc.summary,
    sourceCategory: doc.category as RetrievalResult["sourceCategory"],
    sourceId: doc.sourceId,
    relevanceScore: 0.8,
    createdAt: doc.createdAt,
  }))

  // Validate all results belong to correct tenant
  const validation = validateRetrievalResults(results, tenantId)
  if (!validation.valid) {
    console.error("[CONFIDENTIALITY] Tenant retrieval validation failed:", validation.violations)
    throw new Error(
      `[CONFIDENTIALITY VIOLATION] Cross-tenant data detected in retrieval: ${validation.violations.join(", ")}`
    )
  }

  return results
}

// ============================================================================
// COMBINED RETRIEVAL FOR AGENTS
// ============================================================================

/**
 * Retrieves context for an agent from both global and current tenant namespaces.
 * 
 * CONFIDENTIALITY:
 * - Global results contain public knowledge only
 * - Tenant results are ONLY from the specified tenant
 * - Results from other tenants are NEVER included
 */
export async function retrieveForAgent(
  tenantId: string,
  query: string,
  options?: {
    globalConfig?: Partial<GlobalNamespaceConfig>
    tenantConfig?: Partial<Omit<TenantNamespaceConfig, "tenantId">>
  }
): Promise<{
  global: RetrievalResult[]
  tenant: RetrievalResult[]
  combined: RetrievalResult[]
}> {
  // CRITICAL: Validate tenant_id
  if (!tenantId) {
    throw new Error("[CONFIDENTIALITY VIOLATION] retrieveForAgent requires tenant_id")
  }

  // Retrieve from both namespaces in parallel
  const [globalResults, tenantResults] = await Promise.all([
    retrieveFromGlobal(query, options?.globalConfig),
    retrieveFromTenant(tenantId, query, options?.tenantConfig),
  ])

  // Final validation: ensure no cross-tenant contamination
  const allResults = [...globalResults, ...tenantResults]
  const validation = validateRetrievalResults(allResults, tenantId)
  
  if (!validation.valid) {
    console.error("[CONFIDENTIALITY] Combined retrieval validation failed:", validation.violations)
    throw new Error(
      `[CONFIDENTIALITY VIOLATION] Invalid retrieval results: ${validation.violations.join(", ")}`
    )
  }

  // Log retrieval for audit
  console.log(
    `[RAG RETRIEVAL] tenant=${tenantId} query="${query.substring(0, 50)}..." ` +
    `global=${globalResults.length} tenant=${tenantResults.length}`
  )

  return {
    global: globalResults,
    tenant: tenantResults,
    combined: allResults,
  }
}

// ============================================================================
// STRUCTURED CONTEXT RETRIEVAL
// ============================================================================

/**
 * Retrieves structured context for a specific deliverable type.
 * 
 * CONFIDENTIALITY: Always scoped to one tenant.
 */
export async function retrieveDeliverableContext(
  tenantId: string,
  deliverableType: DeliverableTypeOrAll,
  options?: {
    industry?: string
    platforms?: SocialPlatform[]
  }
): Promise<{
  coreBrain: Awaited<ReturnType<typeof loadCoreBrainForTask>>
  intakeAnswers: Awaited<ReturnType<typeof getIntakeAnswersByTenant>>
  researchFindings: Awaited<ReturnType<typeof getResearchFindingsByTenant>>
  socialAudits: Awaited<ReturnType<typeof getSocialAuditsByTenant>>
  existingDeliverables: {
    brandBlueprint?: Awaited<ReturnType<typeof getBrandBlueprint>>
    contentStrategy?: Awaited<ReturnType<typeof getContentStrategy>>
    audienceAnalysis?: Awaited<ReturnType<typeof getAudienceAnalysis>>
  }
}> {
  if (!tenantId) {
    throw new Error("[CONFIDENTIALITY VIOLATION] retrieveDeliverableContext requires tenant_id")
  }

  // Load Core Brain (global, safe for any tenant)
  const coreBrain = await loadCoreBrainForTask(
    deliverableType,
    options?.industry,
    options?.platforms
  )

  // Load Tenant Brain data (scoped to this tenant only)
  const [
    intakeAnswers,
    researchFindings,
    socialAudits,
    brandBlueprint,
    contentStrategy,
    audienceAnalysis,
  ] = await Promise.all([
    getIntakeAnswersByTenant(tenantId),
    getResearchFindingsByTenant(tenantId),
    getSocialAuditsByTenant(tenantId),
    getBrandBlueprint(tenantId),
    getContentStrategy(tenantId),
    getAudienceAnalysis(tenantId),
  ])

  console.log(
    `[CONTEXT RETRIEVAL] tenant=${tenantId} type=${deliverableType} ` +
    `core_frameworks=${coreBrain.frameworks.length} intake=${intakeAnswers.length} ` +
    `research=${researchFindings.length} audits=${socialAudits.length}`
  )

  return {
    coreBrain,
    intakeAnswers,
    researchFindings,
    socialAudits,
    existingDeliverables: {
      brandBlueprint: brandBlueprint || undefined,
      contentStrategy: contentStrategy || undefined,
      audienceAnalysis: audienceAnalysis || undefined,
    },
  }
}

// ============================================================================
// RETRIEVAL UTILITIES
// ============================================================================

/**
 * Formats retrieval results for inclusion in a prompt.
 */
export function formatRetrievalResultsForPrompt(
  results: RetrievalResult[],
  options?: {
    maxTotalLength?: number
    includeSourceInfo?: boolean
  }
): string {
  const maxLength = options?.maxTotalLength || 8000
  const includeSource = options?.includeSourceInfo ?? true

  let formatted = ""
  
  for (const result of results) {
    const sourceInfo = includeSource
      ? ` [Source: ${result.namespace}/${result.sourceCategory}]`
      : ""
    
    const entry = `### ${result.title}${sourceInfo}\n${result.content}\n\n`
    
    if (formatted.length + entry.length > maxLength) {
      break
    }
    
    formatted += entry
  }

  return formatted.trim()
}

/**
 * Separates results by namespace for clear attribution.
 */
export function separateResultsByNamespace(
  results: RetrievalResult[]
): {
  globalKnowledge: string
  tenantKnowledge: string
} {
  const globalResults = results.filter(r => r.namespace === "global")
  const tenantResults = results.filter(r => r.namespace === "tenant")

  return {
    globalKnowledge: formatRetrievalResultsForPrompt(globalResults),
    tenantKnowledge: formatRetrievalResultsForPrompt(tenantResults),
  }
}
