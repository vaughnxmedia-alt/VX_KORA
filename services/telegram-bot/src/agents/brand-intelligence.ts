import { BaseIntelAgent, createAgentOutput } from "./base-intel-agent"
import type { PipelineContext, AgentOutput } from "../types/pipeline"
import type { BrandBlueprint, CoreValue, BrandPersonalityTrait, BrandVoice, SourceType } from "../types/deliverables"
import type { ResearchContext } from "../types/research"
import type { NormalizedIntakeData } from "../types/intake"
import { createBrandBlueprint, getBrandBlueprint } from "../db/deliverables"
import { upsertConfidenceScore } from "../db/reviews"
import { updateTenantProfile } from "../db/tenant-profiles"
import { geminiBrandSynthesis } from "../llm/gemini-client"

export interface BrandIntelligenceInput {
  intakeData: NormalizedIntakeData
  researchContext: ResearchContext
}

export interface BrandIntelligenceOutput {
  brandBlueprint: BrandBlueprint
}

export class BrandIntelligenceAgent extends BaseIntelAgent<BrandIntelligenceInput, BrandIntelligenceOutput> {
  constructor() {
    super("BrandIntelligenceAgent", "generation")
  }

  protected async execute(
    context: PipelineContext,
    input: BrandIntelligenceInput
  ): Promise<AgentOutput<BrandIntelligenceOutput>> {
    await updateTenantProfile(context.tenant.id, {
      generationStatus: "brand",
    })

    const intakeRecord = this.convertIntakeToRecord(input.intakeData)
    const researchRecord = this.convertResearchToRecord(input.researchContext)

    const { brandInsights, response } = await geminiBrandSynthesis(
      intakeRecord,
      researchRecord,
      "gemini-1.5-pro"
    )

    this.recordLLMUsage(response.totalTokens, response.costUsd)

    const brandBlueprint = await this.createBlueprintFromInsights(
      context,
      brandInsights,
      input
    )

    if (!brandBlueprint) {
      return createAgentOutput(false, undefined, {
        error: "Failed to save brand blueprint",
        shouldRetry: true,
      })
    }

    await this.saveConfidenceScores(context.tenant.id, brandBlueprint)

    this.incrementItemsProcessed()

    return createAgentOutput(true, {
      brandBlueprint,
    }, {
      updatedContext: {
        brandBlueprint,
      },
    })
  }

  private convertIntakeToRecord(intake: NormalizedIntakeData): Record<string, string> {
    const record: Record<string, string> = {}
    
    if (intake.businessName) record.business_name = intake.businessName
    if (intake.businessType) record.business_type = intake.businessType
    if (intake.mission) record.mission = intake.mission
    if (intake.vision) record.vision = intake.vision
    if (intake.coreValues.length) record.core_values = intake.coreValues.join(", ")
    if (intake.brandPersonality.length) record.brand_personality = intake.brandPersonality.join(", ")
    if (intake.brandVoice) record.brand_voice = intake.brandVoice
    if (intake.uniqueValue) record.unique_value = intake.uniqueValue
    if (intake.avoidPerceptions.length) record.avoid_perceptions = intake.avoidPerceptions.join(", ")
    if (intake.brandStory) record.brand_story = intake.brandStory
    if (intake.expertiseAreas.length) record.expertise_areas = intake.expertiseAreas.join(", ")

    return record
  }

  private convertResearchToRecord(research: ResearchContext): Record<string, unknown> {
    return {
      websiteAnalysis: research.websiteAnalysis ? {
        title: research.websiteAnalysis.title,
        tagline: research.websiteAnalysis.tagline,
        aboutSection: research.websiteAnalysis.aboutSection,
        services: research.websiteAnalysis.services,
        brandSignals: research.websiteAnalysis.brandSignals,
        toneAnalysis: research.websiteAnalysis.toneAnalysis,
        positioningClues: research.websiteAnalysis.positioningClues,
      } : null,
      socialAudits: research.socialAudits.map(audit => ({
        platform: audit.platform,
        contentThemes: audit.contentThemes,
        platformStrengths: audit.platformStrengths,
        platformWeaknesses: audit.platformWeaknesses,
        postingFrequency: audit.postingFrequency,
      })),
      findings: research.findings.map(f => ({
        type: f.findingType,
        category: f.findingCategory,
        summary: f.summary,
        confidence: f.confidenceScore,
      })),
      researchGaps: research.gaps,
      overallConfidence: research.overallConfidence,
    }
  }

  private async createBlueprintFromInsights(
    context: PipelineContext,
    insights: Record<string, unknown>,
    input: BrandIntelligenceInput
  ): Promise<BrandBlueprint | null> {
    const be = insights.brandEssence as { statement?: string; confidence?: number; source?: string } | undefined
    const ms = insights.missionStatement as { statement?: string; confidence?: number; source?: string } | undefined
    const vs = insights.visionStatement as { statement?: string; confidence?: number; source?: string } | undefined
    const uvp = insights.uniqueValueProposition as { statement?: string; confidence?: number; source?: string } | undefined
    const pos = insights.positioningStatement as { statement?: string; confidence?: number } | undefined
    const bv = insights.brandVoice as { tone?: string; languageStyle?: string; principles?: string[]; confidence?: number } | undefined

    const coreValues = (insights.coreValues as Array<{
      value: string
      explanation: string
      confidence: number
      source: string
    }> || []).map(cv => ({
      value: cv.value,
      explanation: cv.explanation,
      confidence: cv.confidence,
      source: this.mapSource(cv.source),
    }))

    const brandPersonality = (insights.brandPersonality as Array<{
      trait: string
      description: string
      confidence: number
    }> || []).map(bp => ({
      trait: bp.trait,
      description: bp.description,
      confidence: bp.confidence,
    }))

    const brandVoice: BrandVoice | null = bv ? {
      tone: bv.tone || "",
      languageStyle: bv.languageStyle || "",
      principles: bv.principles || [],
      confidence: bv.confidence || 0.5,
    } : null

    const lowConfidenceSections = (insights.lowConfidenceSections as string[]) || []
    const researchGaps = (insights.researchGaps as Array<{ section: string; gapDescription: string }>) || []

    const scores = [
      be?.confidence,
      ms?.confidence,
      vs?.confidence,
      uvp?.confidence,
      ...coreValues.map(cv => cv.confidence),
      ...brandPersonality.map(bp => bp.confidence),
      brandVoice?.confidence,
      pos?.confidence,
    ].filter((s): s is number => s !== undefined && s !== null)

    const overallConfidence = scores.length > 0 
      ? scores.reduce((a, b) => a + b, 0) / scores.length 
      : 0.5

    return createBrandBlueprint(context.tenant.id, {
      status: "draft",
      brandEssence: be?.statement || null,
      brandEssenceConfidence: be?.confidence || null,
      brandEssenceSource: this.mapSource(be?.source),
      missionStatement: ms?.statement || input.intakeData.mission,
      missionConfidence: ms?.confidence || (input.intakeData.mission ? 0.9 : null),
      missionSource: ms?.source ? this.mapSource(ms.source) : (input.intakeData.mission ? "user_input" : null),
      visionStatement: vs?.statement || input.intakeData.vision,
      visionConfidence: vs?.confidence || (input.intakeData.vision ? 0.9 : null),
      visionSource: vs?.source ? this.mapSource(vs.source) : (input.intakeData.vision ? "user_input" : null),
      coreValues,
      brandPersonality,
      brandPersonalityConfidence: brandPersonality.length > 0 
        ? brandPersonality.reduce((sum, bp) => sum + bp.confidence, 0) / brandPersonality.length 
        : null,
      uniqueValueProposition: uvp?.statement || input.intakeData.uniqueValue,
      uvpConfidence: uvp?.confidence || (input.intakeData.uniqueValue ? 0.9 : null),
      uvpSource: uvp?.source ? this.mapSource(uvp.source) : (input.intakeData.uniqueValue ? "user_input" : null),
      brandVoice,
      positioningStatement: pos?.statement || null,
      positioningConfidence: pos?.confidence || null,
      avoidPerceptions: input.intakeData.avoidPerceptions,
      brandStory: input.intakeData.brandStory,
      brandStoryConfidence: input.intakeData.brandStory ? 0.9 : null,
      overallConfidenceScore: overallConfidence,
      lowConfidenceSections,
      researchGaps,
    })
  }

  private mapSource(source?: string): SourceType | null {
    if (!source) return null
    const sourceMap: Record<string, SourceType> = {
      user_input: "user_input",
      research: "research",
      inferred: "inferred",
      generated: "generated",
    }
    return sourceMap[source] || "inferred"
  }

  private async saveConfidenceScores(
    tenantId: string,
    blueprint: BrandBlueprint
  ): Promise<void> {
    const fields = [
      { path: "brand_essence", score: blueprint.brandEssenceConfidence, source: blueprint.brandEssenceSource },
      { path: "mission_statement", score: blueprint.missionConfidence, source: blueprint.missionSource },
      { path: "vision_statement", score: blueprint.visionConfidence, source: blueprint.visionSource },
      { path: "unique_value_proposition", score: blueprint.uvpConfidence, source: blueprint.uvpSource },
      { path: "positioning_statement", score: blueprint.positioningConfidence, source: null },
      { path: "brand_story", score: blueprint.brandStoryConfidence, source: "user_input" as SourceType },
    ]

    for (const field of fields) {
      if (field.score !== null) {
        await upsertConfidenceScore({
          tenantId,
          deliverableType: "brand_blueprint",
          deliverableId: blueprint.id,
          fieldPath: field.path,
          confidenceScore: field.score,
          sourceType: field.source || "generated",
        })
      }
    }

    for (let i = 0; i < blueprint.coreValues.length; i++) {
      const cv = blueprint.coreValues[i]
      await upsertConfidenceScore({
        tenantId,
        deliverableType: "brand_blueprint",
        deliverableId: blueprint.id,
        fieldPath: `core_values[${i}]`,
        confidenceScore: cv.confidence,
        sourceType: cv.source,
      })
    }

    for (let i = 0; i < blueprint.brandPersonality.length; i++) {
      const bp = blueprint.brandPersonality[i]
      await upsertConfidenceScore({
        tenantId,
        deliverableType: "brand_blueprint",
        deliverableId: blueprint.id,
        fieldPath: `brand_personality[${i}]`,
        confidenceScore: bp.confidence,
        sourceType: "generated",
      })
    }
  }
}

export const brandIntelligenceAgent = new BrandIntelligenceAgent()
