import TelegramBot from "node-telegram-bot-api"
import type { PipelineContext, PipelineConfig, DEFAULT_PIPELINE_CONFIG } from "../types/pipeline"
import type { PipelineStage, TenantProfile } from "../types/research"
import type { IntakeAnswer, NormalizedIntakeData } from "../types/intake"
import { 
  createPipelineRun, 
  getPipelineRun, 
  updatePipelineRun,
  getActivePipelineRun,
  advancePipelineStage,
  recordStageFailure,
  incrementLLMUsage 
} from "../db/pipeline-runs"
import { 
  getOrCreateTenantProfile, 
  updateTenantProfile, 
  updatePipelineStage as updateTenantStage 
} from "../db/tenant-profiles"
import { getIntakeAnswersBySession } from "../db/intake-answers"
import { getResearchFindingsByTenant } from "../db/research-findings"
import { getSocialAuditsByTenant } from "../db/social-audits"
import { StatusReporter, DETAILED_STATUS_FLOW } from "./status-reporter"
import { initializeRouter } from "../llm/router"

import { intakeCaptureAgent, IntakeCaptureInput } from "../agents/intake-capture"
import { clarificationAgent } from "../agents/clarification"
import { profileResearchAgent } from "../agents/profile-research"
import { brandIntelligenceAgent } from "../agents/brand-intelligence"
import { audienceIntelligenceAgent } from "../agents/audience-intelligence"
import { strategyIntelligenceAgent } from "../agents/strategy-intelligence"
import { qualityReviewAgent } from "../agents/quality-review"
import { deliveryAgent } from "../agents/delivery"

// New research agents
import { competitorResearchAgent, CompetitorResearchOutput } from "../agents/competitor-research.js"
import { audienceResearchAgent, AudienceResearchOutput } from "../agents/audience-research.js"
import { marketIntelligenceAgent, MarketIntelligenceOutput } from "../agents/market-intelligence.js"
import type { EvidenceBundle, ResearchGap } from "../types/evidence.js"

const DEFAULT_CONFIG: PipelineConfig = {
  maxRetries: 3,
  retryDelayMs: 2000,
  timeoutMs: 300000,
  enableResearch: true,
  enableClarification: true,
  minConfidenceThreshold: 0.6,
  testMode: false,
}

/**
 * Extended research context that includes evidence from all research agents
 */
interface ExtendedResearchContext {
  competitorResearch?: CompetitorResearchOutput
  audienceResearch?: AudienceResearchOutput
  marketIntelligence?: MarketIntelligenceOutput
  allEvidenceBundles: EvidenceBundle[]
  allResearchGaps: ResearchGap[]
  totalSearchQueries: number
  totalSources: number
  researchTimeMs: number
}

export class PipelineOrchestrator {
  private bot: TelegramBot
  private config: PipelineConfig
  private activeContexts: Map<string, PipelineContext> = new Map()

  constructor(bot: TelegramBot, config?: Partial<PipelineConfig>) {
    this.bot = bot
    this.config = { ...DEFAULT_CONFIG, ...config }
    initializeRouter()
  }

  async startPipeline(
    telegramId: number,
    telegramChatId: number,
    telegramUsername: string | null,
    customerId?: string
  ): Promise<PipelineContext> {
    const tenant = await getOrCreateTenantProfile(
      telegramId,
      telegramUsername,
      customerId
    )

    if (!tenant) {
      throw new Error("Failed to create tenant profile")
    }

    const existingRun = await getActivePipelineRun(tenant.id)
    if (existingRun) {
      const existingContext = this.activeContexts.get(existingRun.id)
      if (existingContext) {
        return existingContext
      }
    }

    const pipelineRun = await createPipelineRun({
      tenantId: tenant.id,
      runType: "full",
      trigger: "telegram_command",
    })

    if (!pipelineRun) {
      throw new Error("Failed to create pipeline run")
    }

    await updateTenantStage(tenant.id, "intake")

    const context: PipelineContext = {
      runId: pipelineRun.id,
      tenantId: tenant.id,
      telegramId,
      telegramChatId,
      tenant,
      intakeAnswers: [],
      normalizedIntake: null,
      researchContext: null,
      brandBlueprint: null,
      contentStrategy: null,
      audienceAnalysis: null,
      reviews: [],
      currentStage: "intake",
      stagesCompleted: [],
      errors: [],
      startedAt: new Date(),
      lastActivityAt: new Date(),
    }

    this.activeContexts.set(pipelineRun.id, context)

    return context
  }

  async processIntakeAnswer(
    context: PipelineContext,
    input: IntakeCaptureInput
  ): Promise<{ isComplete: boolean; nextQuestion?: string; clarificationNeeded?: boolean }> {
    context.lastActivityAt = new Date()

    const result = await intakeCaptureAgent.run(context, input)

    if (!result.success || !result.data) {
      return { isComplete: false }
    }

    if (result.updatedContext) {
      Object.assign(context, result.updatedContext)
    }

    if (result.data.isComplete) {
      if (this.config.enableClarification) {
        const clarificationResult = await clarificationAgent.run(context, {})
        
        if (clarificationResult.success && clarificationResult.data) {
          if (!clarificationResult.data.allClear) {
            const firstQuestion = clarificationResult.data.clarificationQuestions[0]
            return {
              isComplete: false,
              clarificationNeeded: true,
              nextQuestion: firstQuestion?.clarificationQuestion,
            }
          }
        }
      }

      await this.runPostIntakePipeline(context)
      return { isComplete: true }
    }

    return { isComplete: false }
  }

  async runPostIntakePipeline(context: PipelineContext): Promise<void> {
    const statusReporter = new StatusReporter(this.bot, context.telegramChatId)

    try {
      if (!context.normalizedIntake) {
        throw new Error("No intake data available for generation")
      }

      // ============================================
      // PHASE 1: PROFILE RESEARCH (existing)
      // ============================================
      if (this.config.enableResearch) {
        await statusReporter.reportCustom("🔍 Researching your public presence...")
        
        const researchResult = await profileResearchAgent.run(context, {
          websiteUrl: context.normalizedIntake.website || undefined,
          socialHandles: context.normalizedIntake.socialHandles,
        })

        if (researchResult.success && researchResult.updatedContext) {
          Object.assign(context, researchResult.updatedContext)
        }
      }

      // ============================================
      // PHASE 2: EXTENDED RESEARCH PIPELINE (NEW)
      // ============================================
      const extendedResearch = await this.runExtendedResearch(context, statusReporter)

      // ============================================
      // PHASE 3: GENERATION WITH EVIDENCE
      // ============================================
      await statusReporter.reportCustom("✨ Synthesizing your brand identity...")
      
      const brandResult = await brandIntelligenceAgent.run(context, {
        intakeData: context.normalizedIntake,
        researchContext: this.buildEnhancedResearchContext(context, extendedResearch),
      })

      if (!brandResult.success || !brandResult.data) {
        throw new Error("Failed to generate brand blueprint")
      }

      context.brandBlueprint = brandResult.data.brandBlueprint

      await statusReporter.reportCustom("👥 Building your audience profile with real data...")

      const audienceResult = await audienceIntelligenceAgent.run(context, {
        intakeData: context.normalizedIntake,
        researchContext: this.buildEnhancedResearchContext(context, extendedResearch),
        brandBlueprint: context.brandBlueprint,
      })

      if (!audienceResult.success || !audienceResult.data) {
        throw new Error("Failed to generate audience analysis")
      }

      context.audienceAnalysis = audienceResult.data.audienceAnalysis

      await statusReporter.reportCustom("📝 Crafting your evidence-based content strategy...")

      const strategyResult = await strategyIntelligenceAgent.run(context, {
        intakeData: context.normalizedIntake,
        researchContext: this.buildEnhancedResearchContext(context, extendedResearch),
        brandBlueprint: context.brandBlueprint,
        audienceAnalysis: context.audienceAnalysis,
      })

      if (!strategyResult.success || !strategyResult.data) {
        throw new Error("Failed to generate content strategy")
      }

      context.contentStrategy = strategyResult.data.contentStrategy

      // ============================================
      // PHASE 4: QUALITY REVIEW
      // ============================================
      await statusReporter.reportCustom("✅ Reviewing quality before delivery...")

      const reviewResult = await qualityReviewAgent.run(context, {
        brandBlueprint: context.brandBlueprint,
        contentStrategy: context.contentStrategy,
        audienceAnalysis: context.audienceAnalysis,
      })

      if (reviewResult.success && reviewResult.data) {
        context.reviews = reviewResult.data.reviews

        if (!reviewResult.data.allPassed) {
          console.log("Quality review found issues, but proceeding with delivery")
        }
      }

      // ============================================
      // PHASE 5: DELIVERY
      // ============================================
      await statusReporter.reportCustom("📄 Preparing your documents...")

      const deliveryResult = await deliveryAgent.run(context, {
        brandBlueprint: context.brandBlueprint,
        contentStrategy: context.contentStrategy,
        audienceAnalysis: context.audienceAnalysis,
        bot: this.bot,
      })

      if (!deliveryResult.success) {
        throw new Error("Failed to deliver documents")
      }

      // Log research stats
      if (extendedResearch) {
        console.log(`[Pipeline] Research completed: ${extendedResearch.totalSearchQueries} queries, ${extendedResearch.totalSources} sources, ${extendedResearch.researchTimeMs}ms`)
      }

      await updatePipelineRun(context.runId, {
        status: "completed",
        currentStage: "complete",
      })

      this.activeContexts.delete(context.runId)

    } catch (error) {
      console.error("Pipeline failed:", (error as Error).message)
      
      await statusReporter.reportError((error as Error).message, false)
      
      await recordStageFailure(context.runId, context.currentStage, (error as Error).message)
      
      context.errors.push({
        stage: context.currentStage,
        agent: "orchestrator",
        error: (error as Error).message,
        recoverable: false,
        timestamp: new Date(),
      })
    }
  }

  /**
   * Run extended research pipeline with competitor, audience, and market intelligence
   */
  private async runExtendedResearch(
    context: PipelineContext,
    statusReporter: StatusReporter
  ): Promise<ExtendedResearchContext | null> {
    if (!this.config.enableResearch || !context.normalizedIntake) {
      return null
    }

    const startTime = Date.now()
    const allEvidenceBundles: EvidenceBundle[] = []
    const allResearchGaps: ResearchGap[] = []
    let totalSearchQueries = 0
    let totalSources = 0

    // Determine industry from intake
    const industry = context.normalizedIntake.businessType || "general business"

    // Determine platforms from social handles or audience platforms
    let platforms = Object.keys(context.normalizedIntake.socialHandles || {})
      .filter(p => context.normalizedIntake?.socialHandles?.[p as keyof typeof context.normalizedIntake.socialHandles])

    // Also consider audience platforms if available
    if (context.normalizedIntake.audiencePlatforms?.length) {
      platforms = [...new Set([...platforms, ...context.normalizedIntake.audiencePlatforms])]
    }

    if (platforms.length === 0) {
      platforms.push("instagram", "linkedin", "tiktok")
    }

    let competitorResearch: CompetitorResearchOutput | undefined
    let audienceResearch: AudienceResearchOutput | undefined
    let marketIntelligence: MarketIntelligenceOutput | undefined

    // Run research agents in parallel where possible
    try {
      await statusReporter.reportCustom("🔎 Researching your competitors...")

      // Competitor Research
      const competitorResult = await competitorResearchAgent.run(context, {
        intakeData: context.normalizedIntake,
        competitors: context.normalizedIntake.competitorInspiration || [],
        industry,
      })

      if (competitorResult.success && competitorResult.data) {
        competitorResearch = competitorResult.data
        allEvidenceBundles.push(...competitorResult.data.evidenceBundles)
        allResearchGaps.push(...competitorResult.data.researchGaps)
        totalSearchQueries += competitorResult.data.methodology.totalQueries
        totalSources += competitorResult.data.methodology.totalSources
      }

      await statusReporter.reportCustom("📊 Gathering audience intelligence...")

      // Audience Research
      const audienceResult = await audienceResearchAgent.run(context, {
        intakeData: context.normalizedIntake,
        industry,
        platforms,
        audienceDescription: context.normalizedIntake.audienceAge || undefined,
      })

      if (audienceResult.success && audienceResult.data) {
        audienceResearch = audienceResult.data
        allEvidenceBundles.push(...audienceResult.data.evidenceBundles)
        allResearchGaps.push(...audienceResult.data.researchGaps)
        totalSearchQueries += audienceResult.data.methodology.totalQueries
        totalSources += audienceResult.data.methodology.totalSources
      }

      await statusReporter.reportCustom("📈 Analyzing market trends...")

      // Market Intelligence
      const marketResult = await marketIntelligenceAgent.run(context, {
        intakeData: context.normalizedIntake,
        industry,
      })

      if (marketResult.success && marketResult.data) {
        marketIntelligence = marketResult.data
        allEvidenceBundles.push(...marketResult.data.evidenceBundles)
        allResearchGaps.push(...marketResult.data.researchGaps)
        totalSearchQueries += marketResult.data.methodology.totalQueries
        totalSources += marketResult.data.methodology.totalSources
      }

    } catch (error) {
      console.error("[Pipeline] Extended research failed:", (error as Error).message)
      allResearchGaps.push({
        topic: "Extended Research",
        attemptedQueries: [],
        reason: "no_data",
        impact: "moderate",
        recommendation: "Research APIs may be unavailable"
      })
    }

    const researchTimeMs = Date.now() - startTime

    return {
      competitorResearch,
      audienceResearch,
      marketIntelligence,
      allEvidenceBundles,
      allResearchGaps,
      totalSearchQueries,
      totalSources,
      researchTimeMs,
    }
  }

  /**
   * Build enhanced research context combining existing research with new research agents
   */
  private buildEnhancedResearchContext(
    context: PipelineContext,
    extendedResearch: ExtendedResearchContext | null
  ) {
    const baseContext = context.researchContext || {
      websiteAnalysis: null,
      socialAudits: [],
      findings: [],
      overallConfidence: 0.3,
      gaps: ["No research data available"],
    }

    if (!extendedResearch) {
      return baseContext
    }

    // Enhance findings with research data
    const enhancedFindings = [...baseContext.findings]

    // Add competitor insights
    if (extendedResearch.competitorResearch?.competitors) {
      for (const competitor of extendedResearch.competitorResearch.competitors) {
        enhancedFindings.push({
          findingType: "competitor_analysis",
          findingCategory: "competitive_landscape",
          summary: `${competitor.name}: ${competitor.positioning}`,
          confidenceScore: competitor.evidenceBundle.confidenceScore,
          sourceUrl: competitor.website,
        })
      }
    }

    // Add audience insights
    if (extendedResearch.audienceResearch) {
      const ar = extendedResearch.audienceResearch
      enhancedFindings.push({
        findingType: "audience_insight",
        findingCategory: "demographics",
        summary: `Target audience: ${ar.demographics.ageRange}, ${ar.demographics.gender}, ${ar.demographics.locations.join(", ")}`,
        confidenceScore: 0.7,
      })

      for (const painPoint of ar.painPoints.slice(0, 3)) {
        enhancedFindings.push({
          findingType: "audience_insight",
          findingCategory: "pain_points",
          summary: painPoint.point,
          confidenceScore: painPoint.severity === "high" ? 0.8 : 0.6,
        })
      }
    }

    // Add market insights
    if (extendedResearch.marketIntelligence) {
      const mi = extendedResearch.marketIntelligence
      
      if (mi.marketSize) {
        enhancedFindings.push({
          findingType: "market_data",
          findingCategory: "market_size",
          summary: `Market size: ${mi.marketSize.value}`,
          confidenceScore: 0.8,
          sourceUrl: mi.marketSize.source,
        })
      }

      for (const trend of mi.keyTrends.slice(0, 3)) {
        enhancedFindings.push({
          findingType: "market_trend",
          findingCategory: "industry_trends",
          summary: trend.description,
          confidenceScore: trend.impact === "high" ? 0.8 : 0.6,
        })
      }
    }

    // Calculate overall confidence based on research completeness
    const hasCompetitor = !!extendedResearch.competitorResearch?.competitors?.length
    const hasAudience = !!extendedResearch.audienceResearch?.demographics
    const hasMarket = !!extendedResearch.marketIntelligence?.keyTrends?.length
    
    const researchCompleteness = [hasCompetitor, hasAudience, hasMarket].filter(Boolean).length / 3
    const overallConfidence = Math.max(baseContext.overallConfidence, 0.4 + (researchCompleteness * 0.4))

    // Combine gaps
    const allGaps = [
      ...baseContext.gaps,
      ...extendedResearch.allResearchGaps.map(g => g.topic)
    ]

    return {
      ...baseContext,
      findings: enhancedFindings,
      overallConfidence,
      gaps: allGaps,
      extendedResearch: {
        competitorProfiles: extendedResearch.competitorResearch?.competitors || [],
        audienceProfile: extendedResearch.audienceResearch,
        marketIntelligence: extendedResearch.marketIntelligence,
        evidenceBundles: extendedResearch.allEvidenceBundles,
        totalSources: extendedResearch.totalSources,
      },
    }
  }

  async resumePipeline(runId: string): Promise<PipelineContext | null> {
    const existingContext = this.activeContexts.get(runId)
    if (existingContext) {
      return existingContext
    }

    const pipelineRun = await getPipelineRun(runId)
    if (!pipelineRun || pipelineRun.status === "completed" || pipelineRun.status === "cancelled") {
      return null
    }

    console.log(`Resuming pipeline ${runId} from stage ${pipelineRun.currentStage}`)

    return null
  }

  getActiveContext(runId: string): PipelineContext | undefined {
    return this.activeContexts.get(runId)
  }

  async getContextByTelegramId(telegramId: number): Promise<PipelineContext | null> {
    for (const context of this.activeContexts.values()) {
      if (context.telegramId === telegramId) {
        return context
      }
    }
    return null
  }
}

let orchestrator: PipelineOrchestrator | null = null

export function initializeOrchestrator(
  bot: TelegramBot,
  config?: Partial<PipelineConfig>
): PipelineOrchestrator {
  orchestrator = new PipelineOrchestrator(bot, config)
  return orchestrator
}

export function getOrchestrator(): PipelineOrchestrator {
  if (!orchestrator) {
    throw new Error("Orchestrator not initialized. Call initializeOrchestrator first.")
  }
  return orchestrator
}
