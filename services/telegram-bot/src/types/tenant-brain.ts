/**
 * KORA Tenant Brain Types
 * 
 * CONFIDENTIALITY ARCHITECTURE:
 * 
 * The Tenant Brain is like a private client file.
 * It contains ALL data specific to a single tenant.
 * 
 * CRITICAL RULES:
 * - Every table/record MUST have tenant_id
 * - Data NEVER crosses tenant boundaries
 * - No agent may access another tenant's Tenant Brain
 * - If a pattern is globally useful, it must be expressed as public best practice,
 *   NEVER as "we learned this from another client"
 */

import type { DeliverableType, SourceType } from "./deliverables"
import type { SocialPlatform } from "./core-brain"

// ============================================================================
// TENANT RAG DOCUMENT TYPES
// ============================================================================

/**
 * Tenant RAG documents contain PRIVATE knowledge for ONE tenant only.
 * These form the TENANT-SPECIFIC retrieval space.
 * 
 * CRITICAL: Always query with tenant_id filter.
 * NEVER cross-query between tenants.
 */
export interface TenantRagDocument {
  id: string
  
  // CRITICAL: Tenant isolation
  tenantId: string
  
  title: string
  category: TenantRagCategory
  content: string
  summary?: string
  
  // Source within tenant data
  sourceType: TenantDataSourceType
  sourceId?: string
  
  // Chunking
  chunkIndex: number
  parentDocumentId?: string
  
  // Embedding for vector search
  embedding?: number[]
  
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type TenantRagCategory =
  | "intake_answer"
  | "research_finding"
  | "deliverable"
  | "approval"
  | "campaign_idea"
  | "telegram_conversation"
  | "brand_context"
  | "audience_insight"

export type TenantDataSourceType =
  | "telegram_message"
  | "intake_answer"
  | "research"
  | "generated"
  | "user_upload"
  | "approved_content"

// ============================================================================
// TENANT APPROVAL HISTORY TYPES
// ============================================================================

/**
 * Records what the tenant has approved or rejected.
 * Used for personalization and learning tenant preferences.
 */
export interface TenantApprovalHistory {
  id: string
  
  // CRITICAL: Tenant isolation
  tenantId: string
  
  approvalType: ApprovalType
  itemId: string
  itemDescription?: string
  
  approved: boolean
  approvedAt: Date
  approvedVia: "telegram" | "dashboard" | "api"
  telegramMessageId?: number
  
  feedbackNotes?: string
  
  createdAt: Date
}

export type ApprovalType =
  | "content_source"
  | "deliverable"
  | "campaign_idea"
  | "strategy_recommendation"

// ============================================================================
// TENANT CAMPAIGN IDEAS TYPES
// ============================================================================

/**
 * Campaign ideas generated specifically for this tenant.
 * Based on their brand, audience, and strategy.
 */
export interface TenantCampaignIdea {
  id: string
  
  // CRITICAL: Tenant isolation
  tenantId: string
  
  name: string
  category?: CampaignCategory
  
  objective: string
  targetAudience?: string
  keyMessages: string[]
  
  channels: string[]
  contentTypes: string[]
  timeline?: string
  
  status: CampaignStatus
  confidenceScore?: number
  
  // Where this idea came from
  generatedFrom: "strategy" | "research" | "user_request"
  sourceDeliverableId?: string
  
  approved: boolean
  approvedAt?: Date
  
  createdAt: Date
  updatedAt: Date
}

export type CampaignCategory =
  | "awareness"
  | "engagement"
  | "conversion"
  | "retention"
  | "launch"
  | "seasonal"

export type CampaignStatus =
  | "draft"
  | "proposed"
  | "approved"
  | "active"
  | "completed"
  | "archived"

// ============================================================================
// TENANT BRAIN CONTEXT FOR AGENTS
// ============================================================================

/**
 * Context that agents receive from the Tenant Brain.
 * This is the "private client file" portion of an agent's context.
 * 
 * CRITICAL: This context is ONLY for the current tenant.
 * NEVER mix contexts from different tenants.
 */
export interface TenantBrainContext {
  // The tenant this context belongs to
  tenantId: string
  tenantName?: string
  
  // Intake data
  intakeAnswers: TenantIntakeAnswer[]
  
  // Research findings (from this tenant's research only)
  researchFindings: TenantResearchFinding[]
  socialProfileAudits: TenantSocialAudit[]
  
  // Generated deliverables
  brandBlueprint?: TenantBrandBlueprint
  audienceAnalysis?: TenantAudienceAnalysis
  contentStrategy?: TenantContentStrategy
  
  // Approval history
  approvalHistory: TenantApprovalHistory[]
  
  // Campaign ideas
  campaignIdeas: TenantCampaignIdea[]
  
  // RAG documents (tenant-specific only)
  relevantDocuments: TenantRagDocument[]
}

// Simplified versions of existing types for context
export interface TenantIntakeAnswer {
  questionId: string
  questionText: string
  answer: string
  answerType: "user_provided" | "clarified" | "inferred"
  confidenceScore: number
}

export interface TenantResearchFinding {
  findingType: string
  category: "verified" | "inferred" | "assumption"
  summary: string
  confidenceScore: number
  source?: string
}

export interface TenantSocialAudit {
  platform: SocialPlatform
  profileHandle?: string
  bio?: string
  followerCount?: number
  postingFrequency?: string
  contentThemes: string[]
  strengths: string[]
  weaknesses: string[]
  confidenceScore: number
}

export interface TenantBrandBlueprint {
  brandEssence?: string
  missionStatement?: string
  visionStatement?: string
  coreValues: Array<{ value: string; explanation: string }>
  uniqueValueProposition?: string
  brandVoice?: {
    tone: string[]
    principles: string[]
  }
  overallConfidenceScore: number
  lowConfidenceSections: string[]
}

export interface TenantAudienceAnalysis {
  primaryAudience?: {
    demographics: string
    psychographics: string
  }
  audienceSegments: Array<{
    name: string
    description: string
    size?: string
    engagementApproach: string
  }>
  verifiedSignals: string[]
  inferredAssumptions: string[]
  overallConfidenceScore: number
}

export interface TenantContentStrategy {
  contentPillars: Array<{
    name: string
    description: string
    frequency: string
  }>
  platformStrategy: Array<{
    platform: SocialPlatform
    focus: string
    postingFrequency: string
  }>
  growthStrategy?: string
  overallConfidenceScore: number
}

// ============================================================================
// TENANT ISOLATION TYPES
// ============================================================================

/**
 * Tenant isolation configuration.
 * Used to enforce data boundaries.
 */
export interface TenantIsolationConfig {
  // The tenant ID that this context is scoped to
  currentTenantId: string
  
  // Whether to enforce strict isolation (should always be true in production)
  strictIsolation: boolean
  
  // Allowed operations
  canReadCoreBrain: boolean
  canReadOwnTenantBrain: boolean
  canReadOtherTenantBrains: boolean // Should ALWAYS be false
  
  // Audit logging
  logAllAccess: boolean
}

/**
 * Default isolation config - enforces strict tenant boundaries
 */
export const DEFAULT_TENANT_ISOLATION: Omit<TenantIsolationConfig, "currentTenantId"> = {
  strictIsolation: true,
  canReadCoreBrain: true,
  canReadOwnTenantBrain: true,
  canReadOtherTenantBrains: false, // CRITICAL: Always false
  logAllAccess: true,
}

// ============================================================================
// TENANT ACCESS AUDIT TYPES
// ============================================================================

/**
 * Audit log for tenant data access.
 * Used to verify no cross-tenant access occurred.
 */
export interface TenantAccessAudit {
  id: string
  timestamp: Date
  
  // Who is accessing
  accessorType: "agent" | "service" | "api"
  accessorName: string
  
  // What tenant context is active
  currentTenantId: string
  
  // What data was accessed
  accessedDataType: "core_brain" | "tenant_brain"
  accessedTenantId?: string // Should match currentTenantId for tenant_brain
  accessedTable?: string
  accessedRecordId?: string
  
  // Was this a valid access?
  isValidAccess: boolean
  violationType?: "cross_tenant_read" | "cross_tenant_implication" | "none"
  
  // Additional context
  agentStage?: string
  notes?: string
}

// ============================================================================
// DATA SOURCE ATTRIBUTION
// ============================================================================

/**
 * Tracks the source of any piece of information.
 * Used to ensure transparency about what is global vs tenant-specific.
 */
export interface DataSourceAttribution {
  sourceType: "core_knowledge" | "tenant_provided" | "tenant_research" | "tenant_inferred"
  sourceName?: string
  sourceId?: string
  confidenceScore: number
  
  // For tenant data, must include tenant_id
  tenantId?: string
  
  // For core data, must not have tenant_id
  isPublicKnowledge?: boolean
}

/**
 * Validates that a data source attribution is consistent.
 */
export function validateSourceAttribution(attr: DataSourceAttribution): boolean {
  // Core knowledge should not have tenant_id
  if (attr.sourceType === "core_knowledge") {
    if (attr.tenantId) {
      console.error("Core knowledge source should not have tenant_id")
      return false
    }
    return true
  }
  
  // Tenant sources must have tenant_id
  if (attr.sourceType.startsWith("tenant_")) {
    if (!attr.tenantId) {
      console.error("Tenant source must have tenant_id")
      return false
    }
    return true
  }
  
  return true
}
