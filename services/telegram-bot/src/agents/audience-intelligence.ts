import { BaseIntelAgent, createAgentOutput } from "./base-intel-agent"
import type { PipelineContext, AgentOutput } from "../types/pipeline"
import type { 
  AudienceAnalysis, 
  BrandBlueprint,
  PrimaryAudience,
  AudienceSegment,
  PlatformAudience,
  AudienceMotivation,
  ContentAttraction,
  PersonalityType,
  AudienceJourney,
  VerifiedSignal,
  InferredAssumption,
  SourceType 
} from "../types/deliverables"
import type { ResearchContext, SocialProfileAudit } from "../types/research"
import type { NormalizedIntakeData } from "../types/intake"
import { createAudienceAnalysis } from "../db/deliverables"
import { upsertConfidenceScore } from "../db/reviews"
import { updateTenantProfile } from "../db/tenant-profiles"
import { geminiAudienceSynthesis } from "../llm/gemini-client"

export interface AudienceIntelligenceInput {
  intakeData: NormalizedIntakeData
  researchContext: ResearchContext
  brandBlueprint: BrandBlueprint
}

export interface AudienceIntelligenceOutput {
  audienceAnalysis: AudienceAnalysis
}

export class AudienceIntelligenceAgent extends BaseIntelAgent<AudienceIntelligenceInput, AudienceIntelligenceOutput> {
  constructor() {
    super("AudienceIntelligenceAgent", "generation")
  }

  protected async execute(
    context: PipelineContext,
    input: AudienceIntelligenceInput
  ): Promise<AgentOutput<AudienceIntelligenceOutput>> {
    await updateTenantProfile(context.tenant.id, {
      generationStatus: "audience",
    })

    const intakeRecord = this.convertIntakeToRecord(input.intakeData)
    const socialAudits = input.researchContext.socialAudits.map(this.convertAuditToRecord)
    const blueprintRecord = this.convertBlueprintToRecord(input.brandBlueprint)

    const { audienceInsights, response } = await geminiAudienceSynthesis(
      intakeRecord,
      socialAudits,
      blueprintRecord,
      "gemini-1.5-pro"
    )

    this.recordLLMUsage(response.totalTokens, response.costUsd)

    const audienceAnalysis = await this.createAnalysisFromInsights(
      context,
      audienceInsights,
      input
    )

    if (!audienceAnalysis) {
      return createAgentOutput(false, undefined, {
        error: "Failed to save audience analysis",
        shouldRetry: true,
      })
    }

    await this.saveConfidenceScores(context.tenant.id, audienceAnalysis)

    this.incrementItemsProcessed()

    return createAgentOutput(true, {
      audienceAnalysis,
    }, {
      updatedContext: {
        audienceAnalysis,
      },
    })
  }

  private convertIntakeToRecord(intake: NormalizedIntakeData): Record<string, string> {
    const record: Record<string, string> = {}
    
    if (intake.audienceAge) record.audience_age = intake.audienceAge
    if (intake.audiencePainPoints.length) record.audience_pain_points = intake.audiencePainPoints.join(", ")
    if (intake.audienceDesires.length) record.audience_desires = intake.audienceDesires.join(", ")
    if (intake.audienceObjections.length) record.audience_objections = intake.audienceObjections.join(", ")
    if (intake.audiencePlatforms.length) record.audience_platforms = intake.audiencePlatforms.join(", ")
    if (intake.audienceSegments.length) record.audience_segments = intake.audienceSegments.join(", ")
    if (intake.callToAction) record.call_to_action = intake.callToAction
    if (intake.topicsToTrack.length) record.topics_to_track = intake.topicsToTrack.join(", ")
    if (intake.contentConsumption) record.content_consumption = intake.contentConsumption
    if (intake.thoughtLeaders.length) record.thought_leaders = intake.thoughtLeaders.join(", ")

    return record
  }

  private convertAuditToRecord(audit: SocialProfileAudit): Record<string, unknown> {
    return {
      platform: audit.platform,
      followerCount: audit.followerCount,
      engagementRate: audit.avgEngagementRate,
      contentThemes: audit.contentThemes,
      postingFrequency: audit.postingFrequency,
      platformStrengths: audit.platformStrengths,
      platformWeaknesses: audit.platformWeaknesses,
    }
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
    }
  }

  private async createAnalysisFromInsights(
    context: PipelineContext,
    insights: Record<string, unknown>,
    input: AudienceIntelligenceInput
  ): Promise<AudienceAnalysis | null> {
    const overview = insights.overview as { text?: string; confidence?: number } | undefined

    const pa = insights.primaryAudience as {
      demographics?: string
      psychographics?: string
      painPoints?: string[]
      aspirations?: string[]
      confidence?: number
    } | undefined

    const primaryAudience: PrimaryAudience | null = pa ? {
      demographics: pa.demographics || "",
      psychographics: pa.psychographics || "",
      painPoints: pa.painPoints || input.intakeData.audiencePainPoints,
      aspirations: pa.aspirations || input.intakeData.audienceDesires,
      confidence: pa.confidence || 0.7,
    } : null

    const audienceSegments: AudienceSegment[] = ((insights.audienceSegments as Array<{
      name: string
      description: string
      sizeEstimate: string
      engagementApproach: string
      confidence: number
      source: string
    }>) || []).map(seg => ({
      name: seg.name,
      description: seg.description,
      sizeEstimate: seg.sizeEstimate || "Unknown",
      engagementApproach: seg.engagementApproach,
      confidence: seg.confidence,
      source: this.mapSource(seg.source),
    }))

    const verifiedSignals: VerifiedSignal[] = ((insights.verifiedSignals as Array<{
      signal: string
      source: string
      evidence: string
    }>) || []).map(sig => ({
      signal: sig.signal,
      source: sig.source,
      evidence: sig.evidence,
    }))

    const inferredAssumptions: InferredAssumption[] = ((insights.inferredAssumptions as Array<{
      assumption: string
      basis: string
      confidence: number
    }>) || []).map(ia => ({
      assumption: ia.assumption,
      basis: ia.basis,
      confidence: ia.confidence,
    }))

    const lowConfidenceSections = (insights.lowConfidenceSections as string[]) || []
    const researchGaps = (insights.researchGaps as Array<{ section: string; gapDescription: string }>) || []

    const confidenceScores = [
      overview?.confidence,
      primaryAudience?.confidence,
      ...audienceSegments.map(seg => seg.confidence),
      ...inferredAssumptions.map(ia => ia.confidence),
    ].filter((s): s is number => s !== undefined && s !== null)

    const overallConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
      : 0.5

    return createAudienceAnalysis(context.tenant.id, {
      status: "draft",
      overview: overview?.text || null,
      overviewConfidence: overview?.confidence || null,
      primaryAudience,
      audienceSegments,
      platformBreakdown: this.buildPlatformBreakdown(input.researchContext.socialAudits, input.intakeData),
      audiencePsychology: null,
      psychologyConfidence: null,
      audienceMotivations: this.buildMotivations(input.intakeData),
      contentTypesThatAttract: this.buildContentAttractions(input.researchContext.socialAudits),
      personalityTypes: [],
      audienceJourney: null,
      engagementTriggers: input.intakeData.audienceDesires.slice(0, 5),
      audienceFlywheel: null,
      verifiedSignals,
      inferredAssumptions,
      overallConfidenceScore: overallConfidence,
      lowConfidenceSections,
      researchGaps,
    })
  }

  private mapSource(source?: string): SourceType {
    const sourceMap: Record<string, SourceType> = {
      user_input: "user_input",
      research: "research",
      inferred: "inferred",
      generated: "generated",
    }
    return sourceMap[source || ""] || "inferred"
  }

  private buildPlatformBreakdown(
    audits: SocialProfileAudit[],
    intake: NormalizedIntakeData
  ): PlatformAudience[] {
    return audits.map(audit => ({
      platform: audit.platform,
      audienceType: this.inferAudienceType(audit.platform, intake),
      behavior: audit.postingFrequency 
        ? `Posting frequency: ${audit.postingFrequency}` 
        : "Behavior patterns not yet analyzed",
      bestContent: audit.contentThemes.slice(0, 2).join(", ") || "To be determined",
      confidence: audit.confidenceScore,
    }))
  }

  private inferAudienceType(platform: string, intake: NormalizedIntakeData): string {
    const platformAudiences: Record<string, string> = {
      instagram: "Visual content consumers, lifestyle-focused audience",
      twitter: "News-oriented, thought leadership seekers",
      linkedin: "Professional network, B2B decision makers",
      youtube: "Long-form content consumers, learners",
      tiktok: "Short-form video audience, trend followers",
      facebook: "Community-oriented, diverse demographics",
      threads: "Conversation seekers, text-based content consumers",
    }
    return platformAudiences[platform] || "General audience"
  }

  private buildMotivations(intake: NormalizedIntakeData): AudienceMotivation[] {
    const motivations: AudienceMotivation[] = []

    for (const desire of intake.audienceDesires.slice(0, 4)) {
      motivations.push({
        motivation: desire,
        evidence: "From user intake",
        confidence: 0.9,
      })
    }

    for (const painPoint of intake.audiencePainPoints.slice(0, 3)) {
      motivations.push({
        motivation: `Solving: ${painPoint}`,
        evidence: "From user intake",
        confidence: 0.9,
      })
    }

    return motivations
  }

  private buildContentAttractions(audits: SocialProfileAudit[]): ContentAttraction[] {
    const attractions: ContentAttraction[] = []
    const seenTypes = new Set<string>()

    for (const audit of audits) {
      for (const format of audit.contentFormats.slice(0, 2)) {
        if (!seenTypes.has(format)) {
          seenTypes.add(format)
          attractions.push({
            type: format,
            whyItWorks: `Effective on ${audit.platform} based on platform analysis`,
            confidence: audit.confidenceScore,
          })
        }
      }
    }

    return attractions
  }

  private async saveConfidenceScores(
    tenantId: string,
    analysis: AudienceAnalysis
  ): Promise<void> {
    if (analysis.overviewConfidence !== null) {
      await upsertConfidenceScore({
        tenantId,
        deliverableType: "audience_analysis",
        deliverableId: analysis.id,
        fieldPath: "overview",
        confidenceScore: analysis.overviewConfidence,
        sourceType: "generated",
      })
    }

    if (analysis.primaryAudience) {
      await upsertConfidenceScore({
        tenantId,
        deliverableType: "audience_analysis",
        deliverableId: analysis.id,
        fieldPath: "primary_audience",
        confidenceScore: analysis.primaryAudience.confidence,
        sourceType: "generated",
      })
    }

    for (let i = 0; i < analysis.audienceSegments.length; i++) {
      const seg = analysis.audienceSegments[i]
      await upsertConfidenceScore({
        tenantId,
        deliverableType: "audience_analysis",
        deliverableId: analysis.id,
        fieldPath: `audience_segments[${i}]`,
        confidenceScore: seg.confidence,
        sourceType: seg.source,
      })
    }
  }
}

export const audienceIntelligenceAgent = new AudienceIntelligenceAgent()
