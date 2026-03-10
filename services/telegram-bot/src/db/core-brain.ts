/**
 * Core Brain Database Layer
 * 
 * CONFIDENTIALITY ARCHITECTURE:
 * 
 * This module provides access to KORA's global professional knowledge.
 * All data retrieved from these tables is PUBLIC and can be reused
 * across all tenants safely.
 * 
 * CRITICAL: These functions do NOT take tenant_id parameters.
 * Core Brain data is shared across all tenants by design.
 */

import { getDatabase } from "./client"
import type {
  CoreFramework,
  CorePlaybook,
  CoreScoringRule,
  CorePlatformKnowledge,
  CoreIndustryKnowledge,
  CoreOutputTemplate,
  CoreRagDocument,
  CorePrompt,
  FrameworkCategory,
  SocialPlatform,
  DeliverableTypeOrAll,
  ScoreCategory,
} from "../types/core-brain"

// ============================================================================
// CORE FRAMEWORKS
// ============================================================================

function mapRowToFramework(row: Record<string, unknown>): CoreFramework {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    category: row.category as FrameworkCategory,
    description: row.description as string,
    methodology: row.methodology as string,
    whenToUse: row.when_to_use as string | undefined,
    limitations: row.limitations as string | undefined,
    components: row.components as CoreFramework["components"],
    steps: row.steps as CoreFramework["steps"],
    sourceAttribution: row.source_attribution as string | undefined,
    sourceUrl: row.source_url as string | undefined,
    isPublicKnowledge: row.is_public_knowledge as boolean,
    version: row.version as number,
    isActive: row.is_active as boolean,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

export async function getAllFrameworks(): Promise<CoreFramework[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("core_frameworks")
    .select("*")
    .eq("is_active", true)
    .order("category")
    .order("name")

  if (error) {
    console.error("Error fetching core frameworks:", error)
    return []
  }

  return (data || []).map(mapRowToFramework)
}

export async function getFrameworkBySlug(slug: string): Promise<CoreFramework | null> {
  const db = getDatabase()
  if (!db) return null

  const { data, error } = await db
    .from("core_frameworks")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single()

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("Error fetching framework:", error)
    }
    return null
  }

  return mapRowToFramework(data)
}

export async function getFrameworksByCategory(category: FrameworkCategory): Promise<CoreFramework[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("core_frameworks")
    .select("*")
    .eq("category", category)
    .eq("is_active", true)
    .order("name")

  if (error) {
    console.error("Error fetching frameworks by category:", error)
    return []
  }

  return (data || []).map(mapRowToFramework)
}

// ============================================================================
// CORE PROMPTS
// ============================================================================

function mapRowToPrompt(row: Record<string, unknown>): CorePrompt {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    agentName: row.agent_name as CorePrompt["agentName"],
    purpose: row.purpose as string,
    systemInstruction: row.system_instruction as string,
    promptTemplate: row.prompt_template as string,
    outputSchema: row.output_schema as Record<string, unknown> | undefined,
    allowedContextSources: row.allowed_context_sources as CorePrompt["allowedContextSources"],
    forbiddenContextSources: row.forbidden_context_sources as CorePrompt["forbiddenContextSources"],
    confidentialityReminder: row.confidentiality_reminder as string,
    requiredVariables: row.required_variables as string[],
    validationRules: row.validation_rules as CorePrompt["validationRules"],
    version: row.version as number,
    isActive: row.is_active as boolean,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

export async function getPromptByAgent(agentName: string): Promise<CorePrompt | null> {
  const db = getDatabase()
  if (!db) return null

  const { data, error } = await db
    .from("core_prompts")
    .select("*")
    .eq("agent_name", agentName)
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("Error fetching prompt:", error)
    }
    return null
  }

  return mapRowToPrompt(data)
}

export async function getAllPrompts(): Promise<CorePrompt[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("core_prompts")
    .select("*")
    .eq("is_active", true)
    .order("agent_name")

  if (error) {
    console.error("Error fetching prompts:", error)
    return []
  }

  return (data || []).map(mapRowToPrompt)
}

// ============================================================================
// CORE PLAYBOOKS
// ============================================================================

function mapRowToPlaybook(row: Record<string, unknown>): CorePlaybook {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    category: row.category as CorePlaybook["category"],
    overview: row.overview as string,
    targetOutcome: row.target_outcome as string,
    typicalTimeline: row.typical_timeline as string | undefined,
    phases: row.phases as CorePlaybook["phases"],
    successMetrics: row.success_metrics as CorePlaybook["successMetrics"],
    commonPitfalls: row.common_pitfalls as string[] | undefined,
    bestFor: row.best_for as string[] | undefined,
    notSuitableFor: row.not_suitable_for as string[] | undefined,
    sourceAttribution: row.source_attribution as string | undefined,
    isPublicKnowledge: row.is_public_knowledge as boolean,
    version: row.version as number,
    isActive: row.is_active as boolean,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

export async function getAllPlaybooks(): Promise<CorePlaybook[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("core_playbooks")
    .select("*")
    .eq("is_active", true)
    .order("category")
    .order("name")

  if (error) {
    console.error("Error fetching playbooks:", error)
    return []
  }

  return (data || []).map(mapRowToPlaybook)
}

export async function getPlaybookBySlug(slug: string): Promise<CorePlaybook | null> {
  const db = getDatabase()
  if (!db) return null

  const { data, error } = await db
    .from("core_playbooks")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single()

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("Error fetching playbook:", error)
    }
    return null
  }

  return mapRowToPlaybook(data)
}

// ============================================================================
// CORE SCORING RULES
// ============================================================================

function mapRowToScoringRule(row: Record<string, unknown>): CoreScoringRule {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    deliverableType: row.deliverable_type as DeliverableTypeOrAll,
    scoreCategory: row.score_category as ScoreCategory,
    description: row.description as string,
    criteria: row.criteria as CoreScoringRule["criteria"],
    minScore: parseFloat(row.min_score as string),
    maxScore: parseFloat(row.max_score as string),
    passingThreshold: parseFloat(row.passing_threshold as string),
    redFlagPatterns: row.red_flag_patterns as string[],
    excellencePatterns: row.excellence_patterns as string[],
    version: row.version as number,
    isActive: row.is_active as boolean,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

export async function getScoringRulesForDeliverable(
  deliverableType: DeliverableTypeOrAll
): Promise<CoreScoringRule[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("core_scoring_rules")
    .select("*")
    .or(`deliverable_type.eq.${deliverableType},deliverable_type.eq.all`)
    .eq("is_active", true)
    .order("score_category")

  if (error) {
    console.error("Error fetching scoring rules:", error)
    return []
  }

  return (data || []).map(mapRowToScoringRule)
}

export async function getScoringRuleByCategory(
  category: ScoreCategory
): Promise<CoreScoringRule | null> {
  const db = getDatabase()
  if (!db) return null

  const { data, error } = await db
    .from("core_scoring_rules")
    .select("*")
    .eq("score_category", category)
    .eq("is_active", true)
    .single()

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("Error fetching scoring rule:", error)
    }
    return null
  }

  return mapRowToScoringRule(data)
}

// ============================================================================
// CORE PLATFORM KNOWLEDGE
// ============================================================================

function mapRowToPlatformKnowledge(row: Record<string, unknown>): CorePlatformKnowledge {
  return {
    id: row.id as string,
    platform: row.platform as SocialPlatform,
    displayName: row.display_name as string,
    primaryContentType: row.primary_content_type as CorePlatformKnowledge["primaryContentType"],
    audienceDemographics: row.audience_demographics as CorePlatformKnowledge["audienceDemographics"],
    algorithmFactors: row.algorithm_factors as CorePlatformKnowledge["algorithmFactors"],
    optimalPostingTimes: row.optimal_posting_times as CorePlatformKnowledge["optimalPostingTimes"],
    contentBestPractices: row.content_best_practices as string[],
    engagementStrategies: row.engagement_strategies as string[],
    growthTactics: row.growth_tactics as string[] | undefined,
    commonMistakes: row.common_mistakes as string[] | undefined,
    contentFormats: row.content_formats as CorePlatformKnowledge["contentFormats"],
    hashtagGuidance: row.hashtag_guidance as Record<string, unknown> | undefined,
    engagementBenchmarks: row.engagement_benchmarks as CorePlatformKnowledge["engagementBenchmarks"],
    growthBenchmarks: row.growth_benchmarks as CorePlatformKnowledge["growthBenchmarks"],
    lastResearchedAt: row.last_researched_at ? new Date(row.last_researched_at as string) : undefined,
    sourceUrls: row.source_urls as string[] | undefined,
    version: row.version as number,
    isActive: row.is_active as boolean,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

export async function getAllPlatformKnowledge(): Promise<CorePlatformKnowledge[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("core_platform_knowledge")
    .select("*")
    .eq("is_active", true)
    .order("platform")

  if (error) {
    console.error("Error fetching platform knowledge:", error)
    return []
  }

  return (data || []).map(mapRowToPlatformKnowledge)
}

export async function getPlatformKnowledge(platform: SocialPlatform): Promise<CorePlatformKnowledge | null> {
  const db = getDatabase()
  if (!db) return null

  const { data, error } = await db
    .from("core_platform_knowledge")
    .select("*")
    .eq("platform", platform)
    .eq("is_active", true)
    .single()

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("Error fetching platform knowledge:", error)
    }
    return null
  }

  return mapRowToPlatformKnowledge(data)
}

// ============================================================================
// CORE INDUSTRY KNOWLEDGE
// ============================================================================

function mapRowToIndustryKnowledge(row: Record<string, unknown>): CoreIndustryKnowledge {
  return {
    id: row.id as string,
    industry: row.industry as string,
    slug: row.slug as string,
    parentIndustry: row.parent_industry as string | undefined,
    description: row.description as string,
    typicalAudience: row.typical_audience as CoreIndustryKnowledge["typicalAudience"],
    contentThemes: row.content_themes as string[],
    commonMarketingChannels: row.common_marketing_channels as string[],
    typicalContentFormats: row.typical_content_formats as string[],
    seasonalityPatterns: row.seasonality_patterns as Record<string, number> | undefined,
    typicalCompetitorsCount: row.typical_competitors_count as string | undefined,
    differentiationFactors: row.differentiation_factors as string[] | undefined,
    mediaLandscape: row.media_landscape as string | undefined,
    commonPrAngles: row.common_pr_angles as string[] | undefined,
    sensitivityTopics: row.sensitivity_topics as string[] | undefined,
    sourceAttribution: row.source_attribution as string | undefined,
    isPublicKnowledge: row.is_public_knowledge as boolean,
    version: row.version as number,
    isActive: row.is_active as boolean,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

export async function getIndustryKnowledge(industry: string): Promise<CoreIndustryKnowledge | null> {
  const db = getDatabase()
  if (!db) return null

  const { data, error } = await db
    .from("core_industry_knowledge")
    .select("*")
    .or(`industry.ilike.%${industry}%,slug.ilike.%${industry}%`)
    .eq("is_active", true)
    .limit(1)
    .single()

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("Error fetching industry knowledge:", error)
    }
    return null
  }

  return mapRowToIndustryKnowledge(data)
}

export async function getAllIndustryKnowledge(): Promise<CoreIndustryKnowledge[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("core_industry_knowledge")
    .select("*")
    .eq("is_active", true)
    .order("industry")

  if (error) {
    console.error("Error fetching industry knowledge:", error)
    return []
  }

  return (data || []).map(mapRowToIndustryKnowledge)
}

// ============================================================================
// CORE OUTPUT TEMPLATES
// ============================================================================

function mapRowToOutputTemplate(row: Record<string, unknown>): CoreOutputTemplate {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    deliverableType: row.deliverable_type as string,
    outputFormat: row.output_format as CoreOutputTemplate["outputFormat"],
    sections: row.sections as CoreOutputTemplate["sections"],
    maxLength: row.max_length as number | undefined,
    formattingStyle: row.formatting_style as CoreOutputTemplate["formattingStyle"],
    sectionSeparators: row.section_separators as string | undefined,
    requiredSections: row.required_sections as string[],
    optionalSections: row.optional_sections as string[],
    minimumContentPerSection: row.minimum_content_per_section as number | undefined,
    version: row.version as number,
    isActive: row.is_active as boolean,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

export async function getOutputTemplate(
  deliverableType: string,
  outputFormat: string
): Promise<CoreOutputTemplate | null> {
  const db = getDatabase()
  if (!db) return null

  const { data, error } = await db
    .from("core_output_templates")
    .select("*")
    .eq("deliverable_type", deliverableType)
    .eq("output_format", outputFormat)
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("Error fetching output template:", error)
    }
    return null
  }

  return mapRowToOutputTemplate(data)
}

// ============================================================================
// CORE RAG DOCUMENTS
// ============================================================================

function mapRowToRagDocument(row: Record<string, unknown>): CoreRagDocument {
  return {
    id: row.id as string,
    title: row.title as string,
    slug: row.slug as string,
    category: row.category as CoreRagDocument["category"],
    content: row.content as string,
    summary: row.summary as string | undefined,
    chunkIndex: row.chunk_index as number,
    parentDocumentId: row.parent_document_id as string | undefined,
    embedding: row.embedding as number[] | undefined,
    sourceType: row.source_type as CoreRagDocument["sourceType"],
    sourceName: row.source_name as string | undefined,
    sourceUrl: row.source_url as string | undefined,
    sourceDate: row.source_date ? new Date(row.source_date as string) : undefined,
    isPublicKnowledge: row.is_public_knowledge as boolean,
    version: row.version as number,
    isActive: row.is_active as boolean,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

export async function searchCoreRagDocuments(
  query: string,
  category?: string,
  limit: number = 10
): Promise<CoreRagDocument[]> {
  const db = getDatabase()
  if (!db) return []

  let queryBuilder = db
    .from("core_rag_documents")
    .select("*")
    .eq("is_active", true)
    .textSearch("content", query)

  if (category) {
    queryBuilder = queryBuilder.eq("category", category)
  }

  const { data, error } = await queryBuilder
    .limit(limit)

  if (error) {
    console.error("Error searching core RAG documents:", error)
    return []
  }

  return (data || []).map(mapRowToRagDocument)
}

export async function getCoreRagDocumentsByCategory(
  category: string,
  limit: number = 50
): Promise<CoreRagDocument[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("core_rag_documents")
    .select("*")
    .eq("category", category)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Error fetching core RAG documents:", error)
    return []
  }

  return (data || []).map(mapRowToRagDocument)
}

// ============================================================================
// AGGREGATE CORE BRAIN LOADER
// ============================================================================

/**
 * Loads all Core Brain data needed for agent context.
 * This is the "professional knowledge" that is safe to use for any tenant.
 */
export interface CoreBrainData {
  frameworks: CoreFramework[]
  playbooks: CorePlaybook[]
  scoringRules: CoreScoringRule[]
  platformKnowledge: CorePlatformKnowledge[]
  industryKnowledge: CoreIndustryKnowledge[]
}

export async function loadCoreBrain(): Promise<CoreBrainData> {
  const [
    frameworks,
    playbooks,
    scoringRules,
    platformKnowledge,
    industryKnowledge,
  ] = await Promise.all([
    getAllFrameworks(),
    getAllPlaybooks(),
    getScoringRulesForDeliverable("all"),
    getAllPlatformKnowledge(),
    getAllIndustryKnowledge(),
  ])

  return {
    frameworks,
    playbooks,
    scoringRules,
    platformKnowledge,
    industryKnowledge,
  }
}

/**
 * Loads Core Brain data relevant to a specific task.
 */
export async function loadCoreBrainForTask(
  deliverableType: DeliverableTypeOrAll,
  industry?: string,
  platforms?: SocialPlatform[]
): Promise<CoreBrainData> {
  const [
    frameworks,
    playbooks,
    scoringRules,
    allPlatformKnowledge,
    industryKnowledge,
  ] = await Promise.all([
    getAllFrameworks(),
    getAllPlaybooks(),
    getScoringRulesForDeliverable(deliverableType),
    getAllPlatformKnowledge(),
    industry ? getIndustryKnowledge(industry) : Promise.resolve(null),
  ])

  // Filter platform knowledge to relevant platforms
  const platformKnowledge = platforms && platforms.length > 0
    ? allPlatformKnowledge.filter(pk => platforms.includes(pk.platform))
    : allPlatformKnowledge

  return {
    frameworks,
    playbooks,
    scoringRules,
    platformKnowledge,
    industryKnowledge: industryKnowledge ? [industryKnowledge] : [],
  }
}
