import { getDatabase } from "./client"
import type { 
  BrandBlueprint,
  ContentStrategy,
  AudienceAnalysis,
  DeliverableStatus,
  SourceType,
  CoreValue,
  BrandPersonalityTrait,
  BrandVoice,
  VisualIdentityGuidelines,
  ResearchGap,
  ContentPillar,
  ContentTheme,
  PostingSchedule,
  PlatformStrategy,
  ContentMix,
  ExampleWeekContent,
  HashtagStrategy,
  PrimaryAudience,
  AudienceSegment,
  PlatformAudience,
  AudienceMotivation,
  ContentAttraction,
  PersonalityType,
  AudienceJourney,
  VerifiedSignal,
  InferredAssumption,
} from "../types/deliverables"

function mapRowToBrandBlueprint(row: Record<string, unknown>): BrandBlueprint {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    version: row.version as number,
    status: row.status as DeliverableStatus,
    brandEssence: row.brand_essence as string | null,
    brandEssenceConfidence: row.brand_essence_confidence ? parseFloat(row.brand_essence_confidence as string) : null,
    brandEssenceSource: row.brand_essence_source as SourceType | null,
    missionStatement: row.mission_statement as string | null,
    missionConfidence: row.mission_confidence ? parseFloat(row.mission_confidence as string) : null,
    missionSource: row.mission_source as SourceType | null,
    visionStatement: row.vision_statement as string | null,
    visionConfidence: row.vision_confidence ? parseFloat(row.vision_confidence as string) : null,
    visionSource: row.vision_source as SourceType | null,
    coreValues: (row.core_values as CoreValue[]) || [],
    brandPersonality: (row.brand_personality as BrandPersonalityTrait[]) || [],
    brandPersonalityConfidence: row.brand_personality_confidence ? parseFloat(row.brand_personality_confidence as string) : null,
    uniqueValueProposition: row.unique_value_proposition as string | null,
    uvpConfidence: row.uvp_confidence ? parseFloat(row.uvp_confidence as string) : null,
    uvpSource: row.uvp_source as SourceType | null,
    brandVoice: row.brand_voice as BrandVoice | null,
    visualIdentityGuidelines: row.visual_identity_guidelines as VisualIdentityGuidelines | null,
    positioningStatement: row.positioning_statement as string | null,
    positioningConfidence: row.positioning_confidence ? parseFloat(row.positioning_confidence as string) : null,
    avoidPerceptions: (row.avoid_perceptions as string[]) || [],
    brandStory: row.brand_story as string | null,
    brandStoryConfidence: row.brand_story_confidence ? parseFloat(row.brand_story_confidence as string) : null,
    overallConfidenceScore: row.overall_confidence_score ? parseFloat(row.overall_confidence_score as string) : null,
    lowConfidenceSections: (row.low_confidence_sections as string[]) || [],
    researchGaps: (row.research_gaps as ResearchGap[]) || [],
    generatedAt: row.generated_at ? new Date(row.generated_at as string) : null,
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at as string) : null,
    deliveredAt: row.delivered_at ? new Date(row.delivered_at as string) : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

function mapRowToContentStrategy(row: Record<string, unknown>): ContentStrategy {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    version: row.version as number,
    status: row.status as DeliverableStatus,
    contentPillars: (row.content_pillars as ContentPillar[]) || [],
    contentThemes: (row.content_themes as ContentTheme[]) || [],
    postingSchedule: row.posting_schedule as PostingSchedule | null,
    platformStrategy: (row.platform_strategy as PlatformStrategy[]) || [],
    contentMix: row.content_mix as ContentMix | null,
    exampleWeek: (row.example_week as ExampleWeekContent[]) || [],
    hashtagStrategy: row.hashtag_strategy as HashtagStrategy | null,
    growthStrategy: row.growth_strategy as string | null,
    growthStrategyConfidence: row.growth_strategy_confidence ? parseFloat(row.growth_strategy_confidence as string) : null,
    keyTips: (row.key_tips as string[]) || [],
    overallConfidenceScore: row.overall_confidence_score ? parseFloat(row.overall_confidence_score as string) : null,
    lowConfidenceSections: (row.low_confidence_sections as string[]) || [],
    researchGaps: (row.research_gaps as ResearchGap[]) || [],
    generatedAt: row.generated_at ? new Date(row.generated_at as string) : null,
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at as string) : null,
    deliveredAt: row.delivered_at ? new Date(row.delivered_at as string) : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

function mapRowToAudienceAnalysis(row: Record<string, unknown>): AudienceAnalysis {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    version: row.version as number,
    status: row.status as DeliverableStatus,
    overview: row.overview as string | null,
    overviewConfidence: row.overview_confidence ? parseFloat(row.overview_confidence as string) : null,
    primaryAudience: row.primary_audience as PrimaryAudience | null,
    audienceSegments: (row.audience_segments as AudienceSegment[]) || [],
    platformBreakdown: (row.platform_breakdown as PlatformAudience[]) || [],
    audiencePsychology: row.audience_psychology as string | null,
    psychologyConfidence: row.psychology_confidence ? parseFloat(row.psychology_confidence as string) : null,
    audienceMotivations: (row.audience_motivations as AudienceMotivation[]) || [],
    contentTypesThatAttract: (row.content_types_that_attract as ContentAttraction[]) || [],
    personalityTypes: (row.personality_types as PersonalityType[]) || [],
    audienceJourney: row.audience_journey as AudienceJourney | null,
    engagementTriggers: (row.engagement_triggers as string[]) || [],
    audienceFlywheel: row.audience_flywheel as string | null,
    verifiedSignals: (row.verified_signals as VerifiedSignal[]) || [],
    inferredAssumptions: (row.inferred_assumptions as InferredAssumption[]) || [],
    overallConfidenceScore: row.overall_confidence_score ? parseFloat(row.overall_confidence_score as string) : null,
    lowConfidenceSections: (row.low_confidence_sections as string[]) || [],
    researchGaps: (row.research_gaps as ResearchGap[]) || [],
    generatedAt: row.generated_at ? new Date(row.generated_at as string) : null,
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at as string) : null,
    deliveredAt: row.delivered_at ? new Date(row.delivered_at as string) : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

export async function createBrandBlueprint(
  tenantId: string,
  data: Partial<BrandBlueprint>
): Promise<BrandBlueprint | null> {
  const db = getDatabase()
  if (!db) return null

  const { data: existing } = await db
    .from("intel_brand_blueprints")
    .select("version")
    .eq("tenant_id", tenantId)
    .order("version", { ascending: false })
    .limit(1)
    .single()

  const nextVersion = existing ? (existing.version as number) + 1 : 1

  const { data: row, error } = await db
    .from("intel_brand_blueprints")
    .insert({
      tenant_id: tenantId,
      version: nextVersion,
      status: data.status || "draft",
      brand_essence: data.brandEssence,
      brand_essence_confidence: data.brandEssenceConfidence,
      brand_essence_source: data.brandEssenceSource,
      mission_statement: data.missionStatement,
      mission_confidence: data.missionConfidence,
      mission_source: data.missionSource,
      vision_statement: data.visionStatement,
      vision_confidence: data.visionConfidence,
      vision_source: data.visionSource,
      core_values: data.coreValues || [],
      brand_personality: data.brandPersonality || [],
      brand_personality_confidence: data.brandPersonalityConfidence,
      unique_value_proposition: data.uniqueValueProposition,
      uvp_confidence: data.uvpConfidence,
      uvp_source: data.uvpSource,
      brand_voice: data.brandVoice,
      visual_identity_guidelines: data.visualIdentityGuidelines,
      positioning_statement: data.positioningStatement,
      positioning_confidence: data.positioningConfidence,
      avoid_perceptions: data.avoidPerceptions || [],
      brand_story: data.brandStory,
      brand_story_confidence: data.brandStoryConfidence,
      overall_confidence_score: data.overallConfidenceScore,
      low_confidence_sections: data.lowConfidenceSections || [],
      research_gaps: data.researchGaps || [],
      generated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating brand blueprint:", error)
    return null
  }

  return mapRowToBrandBlueprint(row)
}

export async function getBrandBlueprint(
  tenantId: string,
  version?: number
): Promise<BrandBlueprint | null> {
  const db = getDatabase()
  if (!db) return null

  let query = db
    .from("intel_brand_blueprints")
    .select("*")
    .eq("tenant_id", tenantId)

  if (version) {
    query = query.eq("version", version)
  } else {
    query = query.order("version", { ascending: false }).limit(1)
  }

  const { data, error } = await query.single()

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching brand blueprint:", error)
    return null
  }

  return data ? mapRowToBrandBlueprint(data) : null
}

export async function updateBrandBlueprintStatus(
  id: string,
  status: DeliverableStatus
): Promise<BrandBlueprint | null> {
  const db = getDatabase()
  if (!db) return null

  const updates: Record<string, unknown> = { status }
  
  if (status === "approved") {
    updates.reviewed_at = new Date().toISOString()
  }
  if (status === "delivered") {
    updates.delivered_at = new Date().toISOString()
  }

  const { data, error } = await db
    .from("intel_brand_blueprints")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating brand blueprint status:", error)
    return null
  }

  return mapRowToBrandBlueprint(data)
}

export async function createContentStrategy(
  tenantId: string,
  data: Partial<ContentStrategy>
): Promise<ContentStrategy | null> {
  const db = getDatabase()
  if (!db) return null

  const { data: existing } = await db
    .from("intel_content_strategies")
    .select("version")
    .eq("tenant_id", tenantId)
    .order("version", { ascending: false })
    .limit(1)
    .single()

  const nextVersion = existing ? (existing.version as number) + 1 : 1

  const { data: row, error } = await db
    .from("intel_content_strategies")
    .insert({
      tenant_id: tenantId,
      version: nextVersion,
      status: data.status || "draft",
      content_pillars: data.contentPillars || [],
      content_themes: data.contentThemes || [],
      posting_schedule: data.postingSchedule,
      platform_strategy: data.platformStrategy || [],
      content_mix: data.contentMix,
      example_week: data.exampleWeek || [],
      hashtag_strategy: data.hashtagStrategy,
      growth_strategy: data.growthStrategy,
      growth_strategy_confidence: data.growthStrategyConfidence,
      key_tips: data.keyTips || [],
      overall_confidence_score: data.overallConfidenceScore,
      low_confidence_sections: data.lowConfidenceSections || [],
      research_gaps: data.researchGaps || [],
      generated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating content strategy:", error)
    return null
  }

  return mapRowToContentStrategy(row)
}

export async function getContentStrategy(
  tenantId: string,
  version?: number
): Promise<ContentStrategy | null> {
  const db = getDatabase()
  if (!db) return null

  let query = db
    .from("intel_content_strategies")
    .select("*")
    .eq("tenant_id", tenantId)

  if (version) {
    query = query.eq("version", version)
  } else {
    query = query.order("version", { ascending: false }).limit(1)
  }

  const { data, error } = await query.single()

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching content strategy:", error)
    return null
  }

  return data ? mapRowToContentStrategy(data) : null
}

export async function updateContentStrategyStatus(
  id: string,
  status: DeliverableStatus
): Promise<ContentStrategy | null> {
  const db = getDatabase()
  if (!db) return null

  const updates: Record<string, unknown> = { status }
  
  if (status === "approved") {
    updates.reviewed_at = new Date().toISOString()
  }
  if (status === "delivered") {
    updates.delivered_at = new Date().toISOString()
  }

  const { data, error } = await db
    .from("intel_content_strategies")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating content strategy status:", error)
    return null
  }

  return mapRowToContentStrategy(data)
}

export async function createAudienceAnalysis(
  tenantId: string,
  data: Partial<AudienceAnalysis>
): Promise<AudienceAnalysis | null> {
  const db = getDatabase()
  if (!db) return null

  const { data: existing } = await db
    .from("intel_audience_analyses")
    .select("version")
    .eq("tenant_id", tenantId)
    .order("version", { ascending: false })
    .limit(1)
    .single()

  const nextVersion = existing ? (existing.version as number) + 1 : 1

  const { data: row, error } = await db
    .from("intel_audience_analyses")
    .insert({
      tenant_id: tenantId,
      version: nextVersion,
      status: data.status || "draft",
      overview: data.overview,
      overview_confidence: data.overviewConfidence,
      primary_audience: data.primaryAudience,
      audience_segments: data.audienceSegments || [],
      platform_breakdown: data.platformBreakdown || [],
      audience_psychology: data.audiencePsychology,
      psychology_confidence: data.psychologyConfidence,
      audience_motivations: data.audienceMotivations || [],
      content_types_that_attract: data.contentTypesThatAttract || [],
      personality_types: data.personalityTypes || [],
      audience_journey: data.audienceJourney,
      engagement_triggers: data.engagementTriggers || [],
      audience_flywheel: data.audienceFlywheel,
      verified_signals: data.verifiedSignals || [],
      inferred_assumptions: data.inferredAssumptions || [],
      overall_confidence_score: data.overallConfidenceScore,
      low_confidence_sections: data.lowConfidenceSections || [],
      research_gaps: data.researchGaps || [],
      generated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating audience analysis:", error)
    return null
  }

  return mapRowToAudienceAnalysis(row)
}

export async function getAudienceAnalysis(
  tenantId: string,
  version?: number
): Promise<AudienceAnalysis | null> {
  const db = getDatabase()
  if (!db) return null

  let query = db
    .from("intel_audience_analyses")
    .select("*")
    .eq("tenant_id", tenantId)

  if (version) {
    query = query.eq("version", version)
  } else {
    query = query.order("version", { ascending: false }).limit(1)
  }

  const { data, error } = await query.single()

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching audience analysis:", error)
    return null
  }

  return data ? mapRowToAudienceAnalysis(data) : null
}

export async function updateAudienceAnalysisStatus(
  id: string,
  status: DeliverableStatus
): Promise<AudienceAnalysis | null> {
  const db = getDatabase()
  if (!db) return null

  const updates: Record<string, unknown> = { status }
  
  if (status === "approved") {
    updates.reviewed_at = new Date().toISOString()
  }
  if (status === "delivered") {
    updates.delivered_at = new Date().toISOString()
  }

  const { data, error } = await db
    .from("intel_audience_analyses")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating audience analysis status:", error)
    return null
  }

  return mapRowToAudienceAnalysis(data)
}

export async function deleteDeliverablesByTenant(
  tenantId: string
): Promise<boolean> {
  const db = getDatabase()
  if (!db) return false

  const tables = [
    "intel_brand_blueprints",
    "intel_content_strategies",
    "intel_audience_analyses",
  ]

  for (const table of tables) {
    const { error } = await db.from(table).delete().eq("tenant_id", tenantId)
    if (error) {
      console.error(`Error deleting from ${table}:`, error)
      return false
    }
  }

  return true
}
