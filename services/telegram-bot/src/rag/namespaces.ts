/**
 * RAG Namespace Definitions
 * 
 * Defines the strict boundaries between global and tenant data.
 */

// ============================================================================
// NAMESPACE TYPES
// ============================================================================

export type RagNamespace = "global" | "tenant"

/**
 * Source categories within the global namespace.
 * All data here is public and reusable.
 */
export type GlobalSourceCategory =
  | "framework"
  | "playbook"
  | "platform_knowledge"
  | "industry_knowledge"
  | "best_practice"
  | "methodology"

/**
 * Source categories within the tenant namespace.
 * All data here is private to one tenant.
 */
export type TenantSourceCategory =
  | "intake_answer"
  | "research_finding"
  | "social_audit"
  | "brand_blueprint"
  | "audience_analysis"
  | "content_strategy"
  | "campaign_idea"
  | "approval"
  | "telegram_message"

// ============================================================================
// NAMESPACE CONFIGURATION
// ============================================================================

/**
 * Configuration for global namespace retrieval.
 */
export interface GlobalNamespaceConfig {
  namespace: "global"
  categories?: GlobalSourceCategory[]
  maxResults?: number
  minRelevanceScore?: number
}

/**
 * Configuration for tenant namespace retrieval.
 * CRITICAL: tenant_id is REQUIRED.
 */
export interface TenantNamespaceConfig {
  namespace: "tenant"
  tenantId: string // REQUIRED
  categories?: TenantSourceCategory[]
  maxResults?: number
  minRelevanceScore?: number
}

export type NamespaceConfig = GlobalNamespaceConfig | TenantNamespaceConfig

// ============================================================================
// NAMESPACE VALIDATION
// ============================================================================

/**
 * Validates that a namespace configuration is properly formed.
 */
export function validateNamespaceConfig(config: NamespaceConfig): {
  valid: boolean
  error?: string
} {
  if (config.namespace === "tenant") {
    if (!config.tenantId) {
      return {
        valid: false,
        error: "Tenant namespace requires tenant_id",
      }
    }
  }

  return { valid: true }
}

/**
 * Ensures we never accidentally query tenant data without tenant_id.
 */
export function assertTenantScope(
  config: NamespaceConfig,
  expectedTenantId?: string
): void {
  if (config.namespace !== "tenant") {
    return // Global namespace doesn't need tenant_id
  }

  if (!config.tenantId) {
    throw new Error(
      "[CONFIDENTIALITY VIOLATION] Attempted tenant namespace query without tenant_id"
    )
  }

  if (expectedTenantId && config.tenantId !== expectedTenantId) {
    throw new Error(
      `[CONFIDENTIALITY VIOLATION] Tenant ID mismatch: ` +
      `expected ${expectedTenantId}, got ${config.tenantId}`
    )
  }
}

// ============================================================================
// NAMESPACE HELPERS
// ============================================================================

/**
 * Creates a global namespace configuration.
 */
export function globalNamespace(
  options?: Partial<Omit<GlobalNamespaceConfig, "namespace">>
): GlobalNamespaceConfig {
  return {
    namespace: "global",
    maxResults: 10,
    minRelevanceScore: 0.5,
    ...options,
  }
}

/**
 * Creates a tenant namespace configuration.
 * CRITICAL: tenant_id is required.
 */
export function tenantNamespace(
  tenantId: string,
  options?: Partial<Omit<TenantNamespaceConfig, "namespace" | "tenantId">>
): TenantNamespaceConfig {
  if (!tenantId) {
    throw new Error(
      "[CONFIDENTIALITY VIOLATION] Cannot create tenant namespace without tenant_id"
    )
  }

  return {
    namespace: "tenant",
    tenantId,
    maxResults: 20,
    minRelevanceScore: 0.4,
    ...options,
  }
}

// ============================================================================
// RETRIEVAL RESULT TYPES
// ============================================================================

/**
 * A single retrieval result from either namespace.
 */
export interface RetrievalResult {
  id: string
  namespace: RagNamespace
  tenantId?: string // Only present for tenant namespace
  
  // Content
  title: string
  content: string
  summary?: string
  
  // Source attribution
  sourceCategory: GlobalSourceCategory | TenantSourceCategory
  sourceId?: string
  
  // Relevance
  relevanceScore: number
  
  // Metadata
  createdAt: Date
}

/**
 * Validates that retrieval results respect namespace boundaries.
 */
export function validateRetrievalResults(
  results: RetrievalResult[],
  expectedTenantId?: string
): { valid: boolean; violations: string[] } {
  const violations: string[] = []

  for (const result of results) {
    // Tenant results must have tenant_id
    if (result.namespace === "tenant" && !result.tenantId) {
      violations.push(
        `Tenant result ${result.id} missing tenant_id`
      )
    }

    // Tenant results must match expected tenant
    if (
      result.namespace === "tenant" &&
      expectedTenantId &&
      result.tenantId !== expectedTenantId
    ) {
      violations.push(
        `Tenant result ${result.id} has wrong tenant_id: ` +
        `expected ${expectedTenantId}, got ${result.tenantId}`
      )
    }

    // Global results must NOT have tenant_id
    if (result.namespace === "global" && result.tenantId) {
      violations.push(
        `Global result ${result.id} should not have tenant_id`
      )
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  }
}
