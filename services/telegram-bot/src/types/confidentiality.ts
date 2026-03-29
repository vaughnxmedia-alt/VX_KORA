/**
 * KORA Confidentiality Types
 * 
 * This module defines the types and rules for maintaining strict
 * confidentiality between tenants.
 * 
 * CORE PRINCIPLE:
 * - Global knowledge (Core Brain) can be reused across all tenants
 * - Tenant knowledge (Tenant Brain) is NEVER shared between tenants
 * - No output should ever reveal, imply, or borrow from another tenant's data
 */

// ============================================================================
// CONFIDENTIALITY RULES
// ============================================================================

/**
 * Defines what sources an agent can access for a given task.
 */
export interface ConfidentialityRules {
  // What the agent CAN access
  allowedSources: DataNamespace[]
  
  // What the agent CANNOT access (explicit blocklist)
  blockedSources: DataNamespace[]
  
  // The current tenant context
  currentTenantId: string
  
  // Whether to include confidentiality reminder in prompts
  includeReminder: boolean
  
  // Whether to run post-generation confidentiality check
  runPostCheck: boolean
}

export type DataNamespace =
  | "core_frameworks"
  | "core_playbooks"
  | "core_platform_knowledge"
  | "core_industry_knowledge"
  | "core_scoring_rules"
  | "core_rag_documents"
  | "tenant_intake"
  | "tenant_research"
  | "tenant_social_audits"
  | "tenant_deliverables"
  | "tenant_approvals"
  | "tenant_campaigns"
  | "tenant_rag_documents"
  | "other_tenant_data" // ALWAYS blocked

/**
 * Default confidentiality rules for all agents.
 */
export function getDefaultConfidentialityRules(tenantId: string): ConfidentialityRules {
  return {
    allowedSources: [
      // Core Brain (global, reusable)
      "core_frameworks",
      "core_playbooks",
      "core_platform_knowledge",
      "core_industry_knowledge",
      "core_scoring_rules",
      "core_rag_documents",
      // Tenant Brain (current tenant only)
      "tenant_intake",
      "tenant_research",
      "tenant_social_audits",
      "tenant_deliverables",
      "tenant_approvals",
      "tenant_campaigns",
      "tenant_rag_documents",
    ],
    blockedSources: [
      "other_tenant_data", // CRITICAL: Always blocked
    ],
    currentTenantId: tenantId,
    includeReminder: true,
    runPostCheck: true,
  }
}

// ============================================================================
// CONFIDENTIALITY REVIEW TYPES
// ============================================================================

/**
 * Result of a confidentiality review on generated output.
 */
export interface ConfidentialityReviewResult {
  passed: boolean
  
  // What was checked
  outputType: string
  outputLength: number
  tenantId: string
  
  // Violations found
  violations: ConfidentialityViolation[]
  
  // Risk assessment
  overallRisk: "none" | "low" | "medium" | "high" | "critical"
  
  // Recommendations
  recommendations: string[]
  
  // Whether output should be blocked
  shouldBlockOutput: boolean
  
  // Timestamp
  reviewedAt: Date
}

export interface ConfidentialityViolation {
  type: ViolationType
  severity: "warning" | "error" | "critical"
  description: string
  location?: string // Where in the output
  evidence?: string // The problematic text
  suggestion?: string // How to fix
}

export type ViolationType =
  | "cross_tenant_reference"      // Directly references another tenant
  | "cross_tenant_implication"    // Implies knowledge from another tenant
  | "specific_without_source"     // Very specific claim without public basis
  | "pattern_from_other_work"     // Pattern that appears derived from other client
  | "namespace_violation"         // Accessed blocked data namespace
  | "tenant_id_mismatch"          // Data retrieved with wrong tenant_id

// ============================================================================
// CONFIDENTIALITY PATTERNS
// ============================================================================

/**
 * Patterns that indicate potential confidentiality violations.
 * Used by the ConfidentialityReviewAgent.
 */
export const VIOLATION_PATTERNS = {
  // Patterns that suggest cross-tenant reference
  crossTenantIndicators: [
    /another (client|brand|company|business) (we|I) (worked with|helped|advised)/i,
    /similar to (a|another) (client|brand) (we|I) (have|had)/i,
    /based on (our|my) experience with (other|similar) (clients|brands)/i,
    /we('ve| have) seen this (work|succeed|fail) (for|with) (other|another)/i,
    /(one of|some of) our (other|previous) clients/i,
    /like we did (for|with)/i,
    /reminds me of (a|another) (client|brand|company)/i,
  ],
  
  // Patterns that suggest overly specific claims
  suspiciouslySpecific: [
    /increased (engagement|followers|revenue|sales) by \d+%/i, // Without citing source
    /generated \$[\d,]+ in (revenue|sales)/i, // Specific dollar amounts
    /grew (from|to) [\d,]+ followers/i, // Specific follower numbers
    /achieved (a |)[\d.]+ (engagement|conversion) rate/i, // Specific rates
  ],
  
  // Patterns that are always safe (public knowledge indicators)
  safePatterns: [
    /industry (average|standard|benchmark)/i,
    /according to (research|studies|data)/i,
    /best practices suggest/i,
    /generally (speaking|recommended)/i,
    /(common|typical) in (this|the) industry/i,
    /public data (shows|indicates)/i,
  ],
}

// ============================================================================
// CONFIDENTIALITY ENFORCEMENT
// ============================================================================

/**
 * Enforces that a database query is properly scoped to the current tenant.
 */
export interface TenantScopeEnforcer {
  // The tenant ID that must be present in all queries
  requiredTenantId: string
  
  // Tables that require tenant_id filtering
  tenantScopedTables: string[]
  
  // Tables that are global (no tenant_id required)
  globalTables: string[]
  
  // Validate a query
  validateQuery(table: string, tenantIdInQuery?: string): TenantScopeValidation
}

export interface TenantScopeValidation {
  isValid: boolean
  table: string
  requiredTenantId: string
  providedTenantId?: string
  error?: string
}

/**
 * List of tenant-scoped tables (require tenant_id in all queries)
 */
export const TENANT_SCOPED_TABLES = [
  "intel_intake_answers",
  "intel_telegram_messages",
  "intel_tenant_profiles",
  "intel_social_profile_audits",
  "intel_research_sources",
  "intel_research_findings",
  "intel_brand_blueprints",
  "intel_content_strategies",
  "intel_audience_analyses",
  "intel_deliverable_reviews",
  "intel_confidence_scores",
  "intel_llm_runs",
  "intel_pipeline_runs",
  "intel_testing_feedback",
  "tenant_rag_documents",
  "tenant_approval_history",
  "tenant_campaign_ideas",
]

/**
 * List of global tables (no tenant_id required)
 */
export const GLOBAL_TABLES = [
  "core_frameworks",
  "core_prompts",
  "core_playbooks",
  "core_scoring_rules",
  "core_platform_knowledge",
  "core_industry_knowledge",
  "core_output_templates",
  "core_rag_documents",
]

/**
 * Creates a tenant scope enforcer for the given tenant.
 */
export function createTenantScopeEnforcer(tenantId: string): TenantScopeEnforcer {
  return {
    requiredTenantId: tenantId,
    tenantScopedTables: TENANT_SCOPED_TABLES,
    globalTables: GLOBAL_TABLES,
    
    validateQuery(table: string, tenantIdInQuery?: string): TenantScopeValidation {
      // Global tables don't need tenant_id
      if (GLOBAL_TABLES.includes(table)) {
        return {
          isValid: true,
          table,
          requiredTenantId: tenantId,
        }
      }
      
      // Tenant-scoped tables require matching tenant_id
      if (TENANT_SCOPED_TABLES.includes(table)) {
        if (!tenantIdInQuery) {
          return {
            isValid: false,
            table,
            requiredTenantId: tenantId,
            error: `Query to ${table} requires tenant_id filter`,
          }
        }
        
        if (tenantIdInQuery !== tenantId) {
          return {
            isValid: false,
            table,
            requiredTenantId: tenantId,
            providedTenantId: tenantIdInQuery,
            error: `Query to ${table} has wrong tenant_id: ${tenantIdInQuery} (expected ${tenantId})`,
          }
        }
        
        return {
          isValid: true,
          table,
          requiredTenantId: tenantId,
          providedTenantId: tenantIdInQuery,
        }
      }
      
      // Unknown table - allow but log warning
      console.warn(`Unknown table in tenant scope validation: ${table}`)
      return {
        isValid: true,
        table,
        requiredTenantId: tenantId,
      }
    },
  }
}

// ============================================================================
// AGENT CONTEXT ISOLATION
// ============================================================================

/**
 * Ensures an agent only receives data from allowed sources.
 */
export interface AgentContextIsolation {
  agentName: string
  tenantId: string
  
  // What Core Brain data was loaded
  coreBrainSources: string[]
  
  // What Tenant Brain data was loaded
  tenantBrainSources: string[]
  
  // Verification that no cross-tenant data was accessed
  crossTenantAccessAttempts: CrossTenantAccessAttempt[]
  
  // Whether the context is valid for use
  isValid: boolean
}

export interface CrossTenantAccessAttempt {
  timestamp: Date
  attemptedTable: string
  attemptedTenantId: string
  currentTenantId: string
  wasBlocked: boolean
}
