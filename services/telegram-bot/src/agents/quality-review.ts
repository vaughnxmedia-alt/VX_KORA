import { BaseIntelAgent, createAgentOutput } from "./base-intel-agent"
import type { PipelineContext, AgentOutput } from "../types/pipeline"
import type { 
  BrandBlueprint, 
  ContentStrategy, 
  AudienceAnalysis,
  DeliverableReview,
  DeliverableType,
  MalformedField,
  GenericStatement,
  UnsupportedAssumption,
  MissingResearch,
  ImprovementAction 
} from "../types/deliverables"
import { createDeliverableReview, getLatestReview } from "../db/reviews"
import { updateBrandBlueprintStatus, updateContentStrategyStatus, updateAudienceAnalysisStatus } from "../db/deliverables"
import { updateTenantProfile } from "../db/tenant-profiles"

export interface QualityReviewInput {
  brandBlueprint: BrandBlueprint
  contentStrategy: ContentStrategy
  audienceAnalysis: AudienceAnalysis
}

export interface QualityReviewOutput {
  reviews: DeliverableReview[]
  allPassed: boolean
  failedDeliverables: DeliverableType[]
}

const GENERIC_PATTERNS = [
  /^(we|our|the) (help|provide|offer|deliver) (high quality|excellent|great|best)/i,
  /^(committed to|dedicated to|passionate about) (excellence|quality|service)/i,
  /^(your|our) (trusted|reliable|leading) (partner|provider|source)/i,
  /innovative solutions/i,
  /cutting-edge/i,
  /world-class/i,
  /industry-leading/i,
  /^(we believe|we think|we feel) (in|that)/i,
]

const MALFORMED_PATTERNS = [
  /\[object Object\]/,
  /undefined/,
  /null/,
  /NaN/,
  /^\s*$/,
  /^,+$/,
  /^\[,*\]$/,
]

export class QualityReviewAgent extends BaseIntelAgent<QualityReviewInput, QualityReviewOutput> {
  constructor() {
    super("QualityReviewAgent", "review")
  }

  protected async execute(
    context: PipelineContext,
    input: QualityReviewInput
  ): Promise<AgentOutput<QualityReviewOutput>> {
    await updateTenantProfile(context.tenant.id, {
      reviewStatus: "in_progress",
    })

    const reviews: DeliverableReview[] = []
    const failedDeliverables: DeliverableType[] = []

    const blueprintReview = await this.reviewBrandBlueprint(context, input.brandBlueprint)
    reviews.push(blueprintReview)
    if (!blueprintReview.passedReview) {
      failedDeliverables.push("brand_blueprint")
    }

    const strategyReview = await this.reviewContentStrategy(context, input.contentStrategy)
    reviews.push(strategyReview)
    if (!strategyReview.passedReview) {
      failedDeliverables.push("content_strategy")
    }

    const audienceReview = await this.reviewAudienceAnalysis(context, input.audienceAnalysis)
    reviews.push(audienceReview)
    if (!audienceReview.passedReview) {
      failedDeliverables.push("audience_analysis")
    }

    const allPassed = failedDeliverables.length === 0

    await this.updateDeliverableStatuses(input, allPassed)

    await updateTenantProfile(context.tenant.id, {
      reviewStatus: allPassed ? "passed" : "failed",
    })

    this.incrementItemsProcessed(3)

    return createAgentOutput(true, {
      reviews,
      allPassed,
      failedDeliverables,
    }, {
      nextStage: allPassed ? "delivery" : "generation",
      updatedContext: {
        reviews,
      },
    })
  }

  private async reviewBrandBlueprint(
    context: PipelineContext,
    blueprint: BrandBlueprint
  ): Promise<DeliverableReview> {
    const malformedFields: MalformedField[] = []
    const genericStatements: GenericStatement[] = []
    const unsupportedAssumptions: UnsupportedAssumption[] = []
    const missingResearch: MissingResearch[] = []
    const improvementActions: ImprovementAction[] = []

    this.checkField(blueprint.brandEssence, "brand_essence", malformedFields, genericStatements)
    this.checkField(blueprint.missionStatement, "mission_statement", malformedFields, genericStatements)
    this.checkField(blueprint.visionStatement, "vision_statement", malformedFields, genericStatements)
    this.checkField(blueprint.uniqueValueProposition, "unique_value_proposition", malformedFields, genericStatements)
    this.checkField(blueprint.positioningStatement, "positioning_statement", malformedFields, genericStatements)
    this.checkField(blueprint.brandStory, "brand_story", malformedFields, genericStatements)

    for (let i = 0; i < blueprint.coreValues.length; i++) {
      const cv = blueprint.coreValues[i]
      this.checkField(cv.value, `core_values[${i}].value`, malformedFields, genericStatements)
      this.checkField(cv.explanation, `core_values[${i}].explanation`, malformedFields, genericStatements)
    }

    if (blueprint.brandVoice) {
      this.checkField(blueprint.brandVoice.tone, "brand_voice.tone", malformedFields, genericStatements)
      this.checkField(blueprint.brandVoice.languageStyle, "brand_voice.language_style", malformedFields, genericStatements)
    }

    for (const section of blueprint.lowConfidenceSections) {
      unsupportedAssumptions.push({
        fieldPath: section,
        assumption: `Low confidence in ${section}`,
        needs: "More user input or research",
      })
    }

    for (const gap of blueprint.researchGaps) {
      missingResearch.push({
        section: gap.section,
        whatIsMissing: gap.gapDescription,
      })
    }

    const formattingScore = 1 - (malformedFields.length * 0.2)
    const specificityScore = 1 - (genericStatements.length * 0.15)
    const researchDepthScore = Math.max(0.3, 1 - (missingResearch.length * 0.2))
    const brandAlignmentScore = blueprint.overallConfidenceScore || 0.5
    const actionabilityScore = this.calculateActionabilityScore(blueprint)

    const overallScore = (
      formattingScore * 0.25 +
      specificityScore * 0.25 +
      researchDepthScore * 0.2 +
      brandAlignmentScore * 0.15 +
      actionabilityScore * 0.15
    )

    const passedReview = 
      malformedFields.length === 0 && 
      overallScore >= 0.6 &&
      genericStatements.length <= 2

    if (!passedReview) {
      if (malformedFields.length > 0) {
        improvementActions.push({
          action: "Fix malformed fields",
          field: malformedFields.map(f => f.fieldPath).join(", "),
          priority: "high",
        })
      }
      if (genericStatements.length > 2) {
        improvementActions.push({
          action: "Make statements more specific",
          field: genericStatements.map(g => g.fieldPath).join(", "),
          priority: "medium",
        })
      }
    }

    const review = await createDeliverableReview({
      tenantId: context.tenantId,
      deliverableType: "brand_blueprint",
      deliverableId: blueprint.id,
      formattingScore: Math.max(0, formattingScore),
      specificityScore: Math.max(0, specificityScore),
      researchDepthScore: Math.max(0, researchDepthScore),
      brandAlignmentScore,
      actionabilityScore,
      overallScore: Math.max(0, overallScore),
      malformedFields,
      genericStatements,
      unsupportedAssumptions,
      missingResearch,
      passedReview,
      reviewNotes: passedReview 
        ? "Brand blueprint passed quality review" 
        : `Brand blueprint needs improvements: ${improvementActions.map(a => a.action).join(", ")}`,
      improvementActions,
    })

    return review!
  }

  private async reviewContentStrategy(
    context: PipelineContext,
    strategy: ContentStrategy
  ): Promise<DeliverableReview> {
    const malformedFields: MalformedField[] = []
    const genericStatements: GenericStatement[] = []
    const unsupportedAssumptions: UnsupportedAssumption[] = []
    const missingResearch: MissingResearch[] = []
    const improvementActions: ImprovementAction[] = []

    for (let i = 0; i < strategy.contentPillars.length; i++) {
      const pillar = strategy.contentPillars[i]
      this.checkField(pillar.name, `content_pillars[${i}].name`, malformedFields, genericStatements)
      this.checkField(pillar.description, `content_pillars[${i}].description`, malformedFields, genericStatements)
      this.checkField(pillar.rationale, `content_pillars[${i}].rationale`, malformedFields, genericStatements)
    }

    for (let i = 0; i < strategy.platformStrategy.length; i++) {
      const ps = strategy.platformStrategy[i]
      this.checkField(ps.focus, `platform_strategy[${i}].focus`, malformedFields, genericStatements)
    }

    for (let i = 0; i < strategy.exampleWeek.length; i++) {
      const ew = strategy.exampleWeek[i]
      this.checkField(ew.topic, `example_week[${i}].topic`, malformedFields, genericStatements)
    }

    this.checkField(strategy.growthStrategy, "growth_strategy", malformedFields, genericStatements)

    for (const section of strategy.lowConfidenceSections) {
      unsupportedAssumptions.push({
        fieldPath: section,
        assumption: `Low confidence in ${section}`,
        needs: "More context or research",
      })
    }

    for (const gap of strategy.researchGaps) {
      missingResearch.push({
        section: gap.section,
        whatIsMissing: gap.gapDescription,
      })
    }

    if (strategy.contentPillars.length < 2) {
      missingResearch.push({
        section: "content_pillars",
        whatIsMissing: "Need at least 2 content pillars for a comprehensive strategy",
      })
    }

    if (strategy.exampleWeek.length < 5) {
      missingResearch.push({
        section: "example_week",
        whatIsMissing: "Example week should have at least 5 days of content planned",
      })
    }

    const formattingScore = 1 - (malformedFields.length * 0.2)
    const specificityScore = 1 - (genericStatements.length * 0.15)
    const researchDepthScore = Math.max(0.3, 1 - (missingResearch.length * 0.15))
    const brandAlignmentScore = strategy.overallConfidenceScore || 0.5
    const actionabilityScore = this.calculateStrategyActionability(strategy)

    const overallScore = (
      formattingScore * 0.25 +
      specificityScore * 0.2 +
      researchDepthScore * 0.2 +
      brandAlignmentScore * 0.15 +
      actionabilityScore * 0.2
    )

    const passedReview = 
      malformedFields.length === 0 && 
      overallScore >= 0.6 &&
      strategy.contentPillars.length >= 2

    if (!passedReview) {
      if (strategy.contentPillars.length < 2) {
        improvementActions.push({
          action: "Add more content pillars",
          field: "content_pillars",
          priority: "high",
        })
      }
    }

    const review = await createDeliverableReview({
      tenantId: context.tenantId,
      deliverableType: "content_strategy",
      deliverableId: strategy.id,
      formattingScore: Math.max(0, formattingScore),
      specificityScore: Math.max(0, specificityScore),
      researchDepthScore: Math.max(0, researchDepthScore),
      brandAlignmentScore,
      actionabilityScore,
      overallScore: Math.max(0, overallScore),
      malformedFields,
      genericStatements,
      unsupportedAssumptions,
      missingResearch,
      passedReview,
      reviewNotes: passedReview 
        ? "Content strategy passed quality review" 
        : `Content strategy needs improvements`,
      improvementActions,
    })

    return review!
  }

  private async reviewAudienceAnalysis(
    context: PipelineContext,
    analysis: AudienceAnalysis
  ): Promise<DeliverableReview> {
    const malformedFields: MalformedField[] = []
    const genericStatements: GenericStatement[] = []
    const unsupportedAssumptions: UnsupportedAssumption[] = []
    const missingResearch: MissingResearch[] = []
    const improvementActions: ImprovementAction[] = []

    this.checkField(analysis.overview, "overview", malformedFields, genericStatements)
    this.checkField(analysis.audiencePsychology, "audience_psychology", malformedFields, genericStatements)
    this.checkField(analysis.audienceFlywheel, "audience_flywheel", malformedFields, genericStatements)

    if (analysis.primaryAudience) {
      this.checkField(analysis.primaryAudience.demographics, "primary_audience.demographics", malformedFields, genericStatements)
      this.checkField(analysis.primaryAudience.psychographics, "primary_audience.psychographics", malformedFields, genericStatements)
    }

    for (let i = 0; i < analysis.audienceSegments.length; i++) {
      const seg = analysis.audienceSegments[i]
      this.checkField(seg.description, `audience_segments[${i}].description`, malformedFields, genericStatements)
      this.checkField(seg.engagementApproach, `audience_segments[${i}].engagement_approach`, malformedFields, genericStatements)
    }

    for (const assumption of analysis.inferredAssumptions) {
      if (assumption.confidence < 0.5) {
        unsupportedAssumptions.push({
          fieldPath: "inferred_assumptions",
          assumption: assumption.assumption,
          needs: "More research to verify",
        })
      }
    }

    for (const section of analysis.lowConfidenceSections) {
      missingResearch.push({
        section,
        whatIsMissing: `Low confidence in ${section} - needs more data`,
      })
    }

    for (const gap of analysis.researchGaps) {
      missingResearch.push({
        section: gap.section,
        whatIsMissing: gap.gapDescription,
      })
    }

    const formattingScore = 1 - (malformedFields.length * 0.2)
    const specificityScore = 1 - (genericStatements.length * 0.15)
    const researchDepthScore = Math.max(0.3, 1 - (missingResearch.length * 0.15))
    const brandAlignmentScore = analysis.overallConfidenceScore || 0.5
    const actionabilityScore = this.calculateAudienceActionability(analysis)

    const overallScore = (
      formattingScore * 0.25 +
      specificityScore * 0.2 +
      researchDepthScore * 0.25 +
      brandAlignmentScore * 0.15 +
      actionabilityScore * 0.15
    )

    const passedReview = 
      malformedFields.length === 0 && 
      overallScore >= 0.55

    const review = await createDeliverableReview({
      tenantId: context.tenantId,
      deliverableType: "audience_analysis",
      deliverableId: analysis.id,
      formattingScore: Math.max(0, formattingScore),
      specificityScore: Math.max(0, specificityScore),
      researchDepthScore: Math.max(0, researchDepthScore),
      brandAlignmentScore,
      actionabilityScore,
      overallScore: Math.max(0, overallScore),
      malformedFields,
      genericStatements,
      unsupportedAssumptions,
      missingResearch,
      passedReview,
      reviewNotes: passedReview 
        ? "Audience analysis passed quality review" 
        : `Audience analysis needs improvements`,
      improvementActions,
    })

    return review!
  }

  private checkField(
    value: string | null | undefined,
    fieldPath: string,
    malformedFields: MalformedField[],
    genericStatements: GenericStatement[]
  ): void {
    if (value === null || value === undefined) return

    for (const pattern of MALFORMED_PATTERNS) {
      if (pattern.test(value)) {
        malformedFields.push({
          fieldPath,
          issue: `Malformed value detected: ${pattern.source}`,
          rawValue: value.substring(0, 100),
        })
        return
      }
    }

    for (const pattern of GENERIC_PATTERNS) {
      if (pattern.test(value)) {
        genericStatements.push({
          fieldPath,
          text: value.substring(0, 100),
          suggestion: "Be more specific about what makes this unique to the brand",
        })
        return
      }
    }
  }

  private calculateActionabilityScore(blueprint: BrandBlueprint): number {
    let score = 0.5

    if (blueprint.missionStatement && blueprint.missionStatement.length > 20) score += 0.1
    if (blueprint.coreValues.length >= 3) score += 0.1
    if (blueprint.brandVoice && blueprint.brandVoice.principles.length >= 2) score += 0.1
    if (blueprint.uniqueValueProposition && blueprint.uniqueValueProposition.length > 30) score += 0.1
    if (blueprint.positioningStatement) score += 0.1

    return Math.min(1, score)
  }

  private calculateStrategyActionability(strategy: ContentStrategy): number {
    let score = 0.5

    if (strategy.contentPillars.length >= 3) score += 0.1
    if (strategy.platformStrategy.length >= 2) score += 0.1
    if (strategy.exampleWeek.length >= 5) score += 0.15
    if (strategy.postingSchedule && strategy.postingSchedule.optimalTimes.length >= 2) score += 0.05
    if (strategy.keyTips.length >= 3) score += 0.1

    return Math.min(1, score)
  }

  private calculateAudienceActionability(analysis: AudienceAnalysis): number {
    let score = 0.5

    if (analysis.primaryAudience) score += 0.1
    if (analysis.audienceSegments.length >= 2) score += 0.1
    if (analysis.audienceMotivations.length >= 3) score += 0.1
    if (analysis.contentTypesThatAttract.length >= 2) score += 0.1
    if (analysis.engagementTriggers.length >= 3) score += 0.1

    return Math.min(1, score)
  }

  private async updateDeliverableStatuses(
    input: QualityReviewInput,
    allPassed: boolean
  ): Promise<void> {
    const status = allPassed ? "approved" : "reviewing"
    
    await updateBrandBlueprintStatus(input.brandBlueprint.id, status)
    await updateContentStrategyStatus(input.contentStrategy.id, status)
    await updateAudienceAnalysisStatus(input.audienceAnalysis.id, status)
  }
}

export const qualityReviewAgent = new QualityReviewAgent()
