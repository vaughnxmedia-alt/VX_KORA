/**
 * KORA Core Brain Types
 * 
 * CONFIDENTIALITY ARCHITECTURE:
 * 
 * The Core Brain represents KORA's "college degree" - universal professional
 * knowledge that is reusable across all tenants.
 * 
 * CRITICAL RULES:
 * - Core Brain data is NEVER tenant-specific
 * - Core Brain data may be safely reused across all tenants
 * - No client examples, case studies, or derived insights from tenant work belong here
 * - All content must be public knowledge or general best practices
 */

// ============================================================================
// CORE FRAMEWORK TYPES
// ============================================================================

export interface FrameworkComponent {
  name: string
  description: string
  examples?: string[]
}

export interface FrameworkStep {
  order: number
  name: string
  description: string
  outputs?: string[]
}

export interface CoreFramework {
  id: string
  name: string
  slug: string
  category: FrameworkCategory
  description: string
  methodology: string
  whenToUse?: string
  limitations?: string
  components?: FrameworkComponent[]
  steps?: FrameworkStep[]
  sourceAttribution?: string
  sourceUrl?: string
  isPublicKnowledge: boolean
  version: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type FrameworkCategory = 
  | "brand"
  | "audience"
  | "content"
  | "campaign"
  | "pr"
  | "social"

// ============================================================================
// CORE PROMPT TYPES
// ============================================================================

/**
 * Core prompts encode KORA's professional standards and reasoning patterns.
 * They include confidentiality controls to prevent cross-tenant data leakage.
 */
export interface CorePrompt {
  id: string
  name: string
  slug: string
  agentName: AgentName
  purpose: string
  
  // Prompt content
  systemInstruction: string
  promptTemplate: string
  outputSchema?: Record<string, unknown>
  
  // CRITICAL: Confidentiality controls
  allowedContextSources: ContextSource[]
  forbiddenContextSources: ContextSource[]
  confidentialityReminder: string
  
  // Validation
  requiredVariables: string[]
  validationRules?: ValidationRule[]
  
  version: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type AgentName =
  | "intake_capture"
  | "clarification"
  | "profile_research"
  | "brand_intelligence"
  | "audience_intelligence"
  | "strategy_intelligence"
  | "quality_review"
  | "confidentiality_review"
  | "delivery"

/**
 * Context sources define where an agent can retrieve information from.
 * This is critical for maintaining tenant confidentiality.
 */
export type ContextSource =
  | "core_knowledge"      // Global frameworks, playbooks, platform knowledge
  | "current_tenant"      // Current tenant's private data
  | "other_tenants"       // FORBIDDEN: Other tenants' private data

export interface ValidationRule {
  field: string
  rule: "required" | "min_length" | "max_length" | "pattern" | "custom"
  value?: string | number
  message: string
}

// ============================================================================
// CORE PLAYBOOK TYPES
// ============================================================================

export interface PlaybookPhase {
  order: number
  name: string
  description: string
  tasks: string[]
  deliverables: string[]
  duration?: string
}

export interface SuccessMetric {
  metric: string
  target: string
  measurementMethod: string
}

export interface CorePlaybook {
  id: string
  name: string
  slug: string
  category: PlaybookCategory
  overview: string
  targetOutcome: string
  typicalTimeline?: string
  phases: PlaybookPhase[]
  successMetrics?: SuccessMetric[]
  commonPitfalls?: string[]
  bestFor?: string[]
  notSuitableFor?: string[]
  sourceAttribution?: string
  isPublicKnowledge: boolean
  version: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type PlaybookCategory =
  | "launch"
  | "crisis"
  | "growth"
  | "engagement"
  | "awareness"

// ============================================================================
// CORE SCORING RULES TYPES
// ============================================================================

export interface ScoringCriterion {
  criterion: string
  weight: number
  scoringGuide: string
}

export interface CoreScoringRule {
  id: string
  name: string
  slug: string
  deliverableType: DeliverableTypeOrAll
  scoreCategory: ScoreCategory
  description: string
  criteria: ScoringCriterion[]
  minScore: number
  maxScore: number
  passingThreshold: number
  redFlagPatterns: string[]
  excellencePatterns: string[]
  version: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type DeliverableTypeOrAll =
  | "brand_blueprint"
  | "content_strategy"
  | "audience_analysis"
  | "all"

export type ScoreCategory =
  | "formatting"
  | "specificity"
  | "research_depth"
  | "actionability"
  | "brand_alignment"
  | "confidentiality" // New: checks for cross-tenant leakage

// ============================================================================
// CORE PLATFORM KNOWLEDGE TYPES
// ============================================================================

export interface AlgorithmFactor {
  factor: string
  importance: "high" | "medium" | "low"
  notes: string
}

export interface PostingTime {
  day: string
  timeRange: string
  timezone: string
}

export interface ContentFormat {
  format: string
  maxLength?: number
  aspectRatio?: string
  notes?: string
}

export interface EngagementBenchmark {
  good: number
  average: number
  poor: number
}

export interface CorePlatformKnowledge {
  id: string
  platform: SocialPlatform
  displayName: string
  primaryContentType: "visual" | "text" | "video" | "audio"
  audienceDemographics?: {
    ageRange?: string
    interests?: string[]
    behaviors?: string[]
  }
  algorithmFactors?: AlgorithmFactor[]
  optimalPostingTimes?: PostingTime[]
  contentBestPractices: string[]
  engagementStrategies: string[]
  growthTactics?: string[]
  commonMistakes?: string[]
  contentFormats?: ContentFormat[]
  hashtagGuidance?: Record<string, unknown>
  engagementBenchmarks?: Record<string, EngagementBenchmark>
  growthBenchmarks?: Record<string, EngagementBenchmark>
  lastResearchedAt?: Date
  sourceUrls?: string[]
  version: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type SocialPlatform =
  | "instagram"
  | "twitter"
  | "linkedin"
  | "youtube"
  | "tiktok"
  | "threads"
  | "facebook"

// ============================================================================
// CORE INDUSTRY KNOWLEDGE TYPES
// ============================================================================

export interface CoreIndustryKnowledge {
  id: string
  industry: string
  slug: string
  parentIndustry?: string
  description: string
  typicalAudience?: {
    demographics?: string
    psychographics?: string
    behaviors?: string[]
  }
  contentThemes: string[]
  commonMarketingChannels: string[]
  typicalContentFormats: string[]
  seasonalityPatterns?: Record<string, number> // month -> activity level
  typicalCompetitorsCount?: string
  differentiationFactors?: string[]
  mediaLandscape?: string
  commonPrAngles?: string[]
  sensitivityTopics?: string[]
  sourceAttribution?: string
  isPublicKnowledge: boolean
  version: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// CORE OUTPUT TEMPLATE TYPES
// ============================================================================

export interface TemplateSection {
  order: number
  name: string
  description: string
  requiredFields: string[]
  formattingNotes?: string
}

export interface CoreOutputTemplate {
  id: string
  name: string
  slug: string
  deliverableType: string
  outputFormat: "telegram" | "pdf" | "dashboard" | "json"
  sections: TemplateSection[]
  maxLength?: number
  formattingStyle: "markdown" | "html" | "plain"
  sectionSeparators?: string
  requiredSections: string[]
  optionalSections: string[]
  minimumContentPerSection?: number
  version: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// CORE RAG DOCUMENT TYPES
// ============================================================================

/**
 * Core RAG documents contain PUBLIC knowledge only.
 * These form the GLOBAL retrieval space that can be safely used for any tenant.
 * 
 * NEVER store tenant-specific information in core_rag_documents.
 */
export interface CoreRagDocument {
  id: string
  title: string
  slug: string
  category: CoreRagCategory
  content: string
  summary?: string
  chunkIndex: number
  parentDocumentId?: string
  embedding?: number[] // 1536-dimension vector
  sourceType: "public_report" | "industry_standard" | "methodology" | "best_practice"
  sourceName?: string
  sourceUrl?: string
  sourceDate?: Date
  isPublicKnowledge: boolean
  version: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type CoreRagCategory =
  | "framework"
  | "best_practice"
  | "industry_report"
  | "methodology"
  | "platform_guide"

// ============================================================================
// AGGREGATE CORE BRAIN TYPE
// ============================================================================

/**
 * The complete Core Brain contains all global knowledge KORA needs.
 * This is KORA's "college degree" - reusable across all tenants.
 */
export interface CoreBrain {
  frameworks: CoreFramework[]
  playbooks: CorePlaybook[]
  scoringRules: CoreScoringRule[]
  platformKnowledge: CorePlatformKnowledge[]
  industryKnowledge: CoreIndustryKnowledge[]
  outputTemplates: CoreOutputTemplate[]
  
  // Methods for retrieval
  getFramework(slug: string): CoreFramework | undefined
  getPlaybook(slug: string): CorePlaybook | undefined
  getPlatformKnowledge(platform: SocialPlatform): CorePlatformKnowledge | undefined
  getIndustryKnowledge(industry: string): CoreIndustryKnowledge | undefined
  getScoringRules(deliverableType: DeliverableTypeOrAll): CoreScoringRule[]
  getOutputTemplate(deliverableType: string, format: string): CoreOutputTemplate | undefined
}

// ============================================================================
// CORE BRAIN CONTEXT FOR AGENTS
// ============================================================================

/**
 * Context that agents receive from the Core Brain.
 * This is the "professional knowledge" portion of an agent's context.
 */
export interface CoreBrainContext {
  // Relevant frameworks for the current task
  applicableFrameworks: CoreFramework[]
  
  // Platform knowledge for social media strategy
  platformKnowledge: Map<SocialPlatform, CorePlatformKnowledge>
  
  // Industry context if known
  industryKnowledge?: CoreIndustryKnowledge
  
  // Scoring rules for quality review
  scoringRules: CoreScoringRule[]
  
  // Output template for formatting
  outputTemplate?: CoreOutputTemplate
  
  // System instructions with confidentiality rules
  systemInstructions: string
  
  // Confidentiality reminder to include in prompts
  confidentialityReminder: string
}
