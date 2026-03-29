import { BaseIntelAgent, createAgentOutput } from "./base-intel-agent"
import type { PipelineContext, AgentOutput } from "../types/pipeline"
import type { 
  ContentStrategy, 
  BrandBlueprint,
  AudienceAnalysis,
  ContentPillar,
  ContentTheme,
  PostingSchedule,
  PlatformStrategy,
  ContentMix,
  ExampleWeekContent,
  HashtagStrategy,
  SourceType 
} from "../types/deliverables"
import type { ResearchContext, SocialProfileAudit } from "../types/research"
import type { NormalizedIntakeData } from "../types/intake"
import { createContentStrategy } from "../db/deliverables"
import { upsertConfidenceScore } from "../db/reviews"
import { updateTenantProfile } from "../db/tenant-profiles"
import { geminiStrategySynthesis } from "../llm/gemini-client"

export interface StrategyIntelligenceInput {
  intakeData: NormalizedIntakeData
  researchContext: ResearchContext
  brandBlueprint: BrandBlueprint
  audienceAnalysis: AudienceAnalysis
}

export interface StrategyIntelligenceOutput {
  contentStrategy: ContentStrategy
}

export class StrategyIntelligenceAgent extends BaseIntelAgent<StrategyIntelligenceInput, StrategyIntelligenceOutput> {
  constructor() {
    super("StrategyIntelligenceAgent", "generation")
  }

  protected async execute(
    context: PipelineContext,
    input: StrategyIntelligenceInput
  ): Promise<AgentOutput<StrategyIntelligenceOutput>> {
    await updateTenantProfile(context.tenant.id, {
      generationStatus: "strategy",
    })

    const blueprintRecord = this.convertBlueprintToRecord(input.brandBlueprint)
    const audienceRecord = this.convertAudienceToRecord(input.audienceAnalysis)
    const intakeRecord = this.convertIntakeToRecord(input.intakeData)
    const socialAudits = input.researchContext.socialAudits.map(this.convertAuditToRecord)

    const { strategyInsights, response } = await geminiStrategySynthesis(
      blueprintRecord,
      audienceRecord,
      intakeRecord,
      socialAudits,
      "gemini-1.5-pro"
    )

    this.recordLLMUsage(response.totalTokens, response.costUsd)

    const contentStrategy = await this.createStrategyFromInsights(
      context,
      strategyInsights,
      input
    )

    if (!contentStrategy) {
      return createAgentOutput(false, undefined, {
        error: "Failed to save content strategy",
        shouldRetry: true,
      })
    }

    await this.saveConfidenceScores(context.tenant.id, contentStrategy)

    await updateTenantProfile(context.tenant.id, {
      generationStatus: "complete",
    })

    this.incrementItemsProcessed()

    return createAgentOutput(true, {
      contentStrategy,
    }, {
      nextStage: "review",
      updatedContext: {
        contentStrategy,
      },
    })
  }

  private convertBlueprintToRecord(blueprint: BrandBlueprint): Record<string, unknown> {
    return {
      brandEssence: blueprint.brandEssence,
      mission: blueprint.missionStatement,
      vision: blueprint.visionStatement,
      coreValues: blueprint.coreValues.map(cv => cv.value),
      brandPersonality: blueprint.brandPersonality.map(bp => bp.trait),
      uniqueValueProposition: blueprint.uniqueValueProposition,
      brandVoice: blueprint.brandVoice,
      positioningStatement: blueprint.positioningStatement,
    }
  }

  private convertAudienceToRecord(audience: AudienceAnalysis): Record<string, unknown> {
    return {
      overview: audience.overview,
      primaryAudience: audience.primaryAudience,
      audienceSegments: audience.audienceSegments.map(seg => ({
        name: seg.name,
        description: seg.description,
        engagementApproach: seg.engagementApproach,
      })),
      platformBreakdown: audience.platformBreakdown.map(pb => ({
        platform: pb.platform,
        audienceType: pb.audienceType,
        bestContent: pb.bestContent,
      })),
      audienceMotivations: audience.audienceMotivations.map(m => m.motivation),
      engagementTriggers: audience.engagementTriggers,
    }
  }

  private convertIntakeToRecord(intake: NormalizedIntakeData): Record<string, string> {
    const record: Record<string, string> = {}
    
    if (intake.contentPillars.length) record.content_pillars = intake.contentPillars.join(", ")
    if (intake.contentFormats.length) record.content_formats = intake.contentFormats.join(", ")
    if (intake.postingFrequency) record.posting_frequency = intake.postingFrequency
    if (intake.primaryPlatform) record.primary_platform = intake.primaryPlatform
    if (intake.contentGoals.length) record.content_goals = intake.contentGoals.join(", ")
    if (intake.competitorInspiration.length) record.competitor_inspiration = intake.competitorInspiration.join(", ")
    if (intake.expertiseAreas.length) record.expertise_areas = intake.expertiseAreas.join(", ")

    return record
  }

  private convertAuditToRecord(audit: SocialProfileAudit): Record<string, unknown> {
    return {
      platform: audit.platform,
      contentThemes: audit.contentThemes,
      contentFormats: audit.contentFormats,
      postingFrequency: audit.postingFrequency,
      platformStrengths: audit.platformStrengths,
      platformWeaknesses: audit.platformWeaknesses,
    }
  }

  private async createStrategyFromInsights(
    context: PipelineContext,
    insights: Record<string, unknown>,
    input: StrategyIntelligenceInput
  ): Promise<ContentStrategy | null> {
    const contentPillars: ContentPillar[] = ((insights.contentPillars as Array<{
      name: string
      description: string
      contentTypes: string[]
      frequency: string
      confidence: number
      rationale: string
    }>) || []).map(pillar => ({
      name: pillar.name,
      description: pillar.description,
      contentTypes: pillar.contentTypes || [],
      frequency: pillar.frequency || "Weekly",
      confidence: pillar.confidence || 0.7,
      rationale: pillar.rationale || "",
    }))

    if (contentPillars.length === 0 && input.intakeData.contentPillars.length > 0) {
      for (const pillar of input.intakeData.contentPillars) {
        contentPillars.push({
          name: pillar,
          description: `Content pillar from user input: ${pillar}`,
          contentTypes: input.intakeData.contentFormats.slice(0, 2),
          frequency: input.intakeData.postingFrequency || "Weekly",
          confidence: 0.9,
          rationale: "User-defined content pillar",
        })
      }
    }

    const platformStrategy: PlatformStrategy[] = ((insights.platformStrategy as Array<{
      platform: string
      focus: string
      contentTypes: string[]
      postingFrequency: string
      confidence: number
    }>) || []).map(ps => ({
      platform: ps.platform,
      focus: ps.focus,
      contentTypes: ps.contentTypes || [],
      postingFrequency: ps.postingFrequency || "3x per week",
      confidence: ps.confidence || 0.7,
    }))

    const exampleWeek: ExampleWeekContent[] = ((insights.exampleWeek as Array<{
      day: string
      contentType: string
      topic: string
      platform: string
      rationale: string
    }>) || []).map(ew => ({
      day: ew.day,
      contentType: ew.contentType,
      topic: ew.topic,
      platform: ew.platform,
      rationale: ew.rationale || "",
    }))

    const gs = insights.growthStrategy as { text?: string; confidence?: number } | undefined

    const lowConfidenceSections = (insights.lowConfidenceSections as string[]) || []
    const researchGaps = (insights.researchGaps as Array<{ section: string; gapDescription: string }>) || []

    const confidenceScores = [
      ...contentPillars.map(p => p.confidence),
      ...platformStrategy.map(ps => ps.confidence),
      gs?.confidence,
    ].filter((s): s is number => s !== undefined && s !== null)

    const overallConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
      : 0.5

    return createContentStrategy(context.tenant.id, {
      status: "draft",
      contentPillars,
      contentThemes: this.buildContentThemes(contentPillars, input.intakeData),
      postingSchedule: this.buildPostingSchedule(platformStrategy, input.intakeData),
      platformStrategy,
      contentMix: this.buildContentMix(input.intakeData),
      exampleWeek,
      hashtagStrategy: this.buildHashtagStrategy(input.intakeData, input.researchContext),
      growthStrategy: gs?.text || null,
      growthStrategyConfidence: gs?.confidence || null,
      keyTips: this.generateKeyTips(contentPillars, platformStrategy),
      overallConfidenceScore: overallConfidence,
      lowConfidenceSections,
      researchGaps,
    })
  }

  private buildContentThemes(pillars: ContentPillar[], intake: NormalizedIntakeData): ContentTheme[] {
    const themes: ContentTheme[] = []
    
    for (const pillar of pillars) {
      themes.push({
        theme: pillar.name,
        description: pillar.description,
        confidence: pillar.confidence,
      })
    }

    for (const expertise of intake.expertiseAreas.slice(0, 3)) {
      if (!themes.some(t => t.theme.toLowerCase() === expertise.toLowerCase())) {
        themes.push({
          theme: expertise,
          description: `Expertise area: ${expertise}`,
          confidence: 0.9,
        })
      }
    }

    return themes
  }

  private buildPostingSchedule(
    platforms: PlatformStrategy[],
    intake: NormalizedIntakeData
  ): PostingSchedule {
    const frequencyByPlatform: Record<string, string> = {}
    
    for (const ps of platforms) {
      frequencyByPlatform[ps.platform] = ps.postingFrequency
    }

    return {
      optimalTimes: ["9:00 AM", "12:00 PM", "6:00 PM"],
      frequencyByPlatform,
      confidence: 0.7,
    }
  }

  private buildContentMix(intake: NormalizedIntakeData): ContentMix {
    const hasEducation = intake.contentGoals.some(g => 
      /educat|teach|inform|learn/i.test(g)
    )
    const hasEntertainment = intake.contentGoals.some(g => 
      /entertain|fun|engag/i.test(g)
    )
    const hasPromotion = intake.contentGoals.some(g => 
      /sell|promot|convert|lead/i.test(g)
    )
    const hasInspiration = intake.contentGoals.some(g => 
      /inspir|motivat|empower/i.test(g)
    )

    let educational = hasEducation ? 35 : 25
    let entertaining = hasEntertainment ? 25 : 20
    let promotional = hasPromotion ? 20 : 15
    let inspirational = hasInspiration ? 20 : 15

    const total = educational + entertaining + promotional + inspirational
    const scale = 100 / total

    return {
      educational: Math.round(educational * scale),
      entertaining: Math.round(entertaining * scale),
      promotional: Math.round(promotional * scale),
      inspirational: Math.round(inspirational * scale),
    }
  }

  private buildHashtagStrategy(
    intake: NormalizedIntakeData,
    research: ResearchContext
  ): HashtagStrategy {
    const primary: string[] = []
    const secondary: string[] = []
    const avoid: string[] = []

    if (intake.businessName) {
      const brandTag = intake.businessName.toLowerCase().replace(/\s+/g, "")
      primary.push(`#${brandTag}`)
    }

    for (const pillar of intake.contentPillars.slice(0, 3)) {
      const tag = pillar.toLowerCase().replace(/\s+/g, "")
      secondary.push(`#${tag}`)
    }

    for (const topic of intake.topicsToAvoid.slice(0, 3)) {
      const tag = topic.toLowerCase().replace(/\s+/g, "")
      avoid.push(`#${tag}`)
    }

    return {
      primary: primary.slice(0, 5),
      secondary: secondary.slice(0, 10),
      avoid: avoid.slice(0, 5),
      confidence: 0.6,
    }
  }

  private generateKeyTips(
    pillars: ContentPillar[],
    platforms: PlatformStrategy[]
  ): string[] {
    const tips: string[] = []

    if (pillars.length > 0) {
      tips.push(`Focus on your top pillar "${pillars[0].name}" for the first month to establish authority`)
    }

    if (platforms.length > 0) {
      const primary = platforms[0]
      tips.push(`Prioritize ${primary.platform} with ${primary.postingFrequency} posting`)
    }

    tips.push("Batch create content weekly to maintain consistency")
    tips.push("Engage with comments within the first hour of posting")
    tips.push("Repurpose high-performing content across platforms")

    return tips.slice(0, 5)
  }

  private async saveConfidenceScores(
    tenantId: string,
    strategy: ContentStrategy
  ): Promise<void> {
    for (let i = 0; i < strategy.contentPillars.length; i++) {
      const pillar = strategy.contentPillars[i]
      await upsertConfidenceScore({
        tenantId,
        deliverableType: "content_strategy",
        deliverableId: strategy.id,
        fieldPath: `content_pillars[${i}]`,
        confidenceScore: pillar.confidence,
        sourceType: "generated",
      })
    }

    for (let i = 0; i < strategy.platformStrategy.length; i++) {
      const ps = strategy.platformStrategy[i]
      await upsertConfidenceScore({
        tenantId,
        deliverableType: "content_strategy",
        deliverableId: strategy.id,
        fieldPath: `platform_strategy[${i}]`,
        confidenceScore: ps.confidence,
        sourceType: "generated",
      })
    }

    if (strategy.growthStrategyConfidence !== null) {
      await upsertConfidenceScore({
        tenantId,
        deliverableType: "content_strategy",
        deliverableId: strategy.id,
        fieldPath: "growth_strategy",
        confidenceScore: strategy.growthStrategyConfidence,
        sourceType: "generated",
      })
    }
  }
}

export const strategyIntelligenceAgent = new StrategyIntelligenceAgent()
