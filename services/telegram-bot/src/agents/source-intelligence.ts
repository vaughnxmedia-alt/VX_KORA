/**
 * KORA Source Intelligence Agent
 * 
 * Scores processed sources for:
 * - Topical relevance
 * - Audience relevance
 * - Strategic usefulness
 * - Credibility
 * - Recency
 * 
 * Decides routing:
 * - Suggestion only
 * - Approved source
 * - Route to Telegram
 * - Route to tenant RAG
 */

import { ConfidentialBaseAgent, createConfidentialAgentOutput } from "./confidential-base-agent"
import type { PipelineContext, AgentOutput } from "../types/pipeline"
import type { AgentContext } from "../rag/context-builder"
import {
  getSourceById,
  getYouTubeVideoByVideoId,
  getYouTubeVideosByTenant,
  updateYouTubeVideoScores,
  updateSourceScores,
  updateSourceStatus,
  updateSourceRouting,
  getOrCreatePreferences,
  getSummariesByVideoId,
} from "../db/sources"
import type {
  IntelSource,
  YouTubeVideo,
  VideoSummary,
  ContentScores,
  RoutingDecision,
  IntelPreferences,
} from "../types/sources"
import { getRouter } from "../llm/router"

// ============================================================================
// TYPES
// ============================================================================

export interface SourceIntelligenceInput {
  tenantId: string
  sourceId?: string
  videoDbId?: string
  videoId?: string
  scoringOnly?: boolean
  routingOnly?: boolean
}

export interface SourceIntelligenceOutput {
  sourceId?: string
  videoDbId?: string
  
  scores: ContentScores
  scoreRationale: {
    dimension: string
    score: number
    reason: string
  }[]
  
  routingDecision: RoutingDecision
  routingReason: string
  
  routedToTelegram: boolean
  routedToRag: boolean
}

interface ScoringContext {
  tenantId: string
  preferences: IntelPreferences
  brandKeywords: string[]
  audienceKeywords: string[]
  strategyPriorities: string[]
}

// ============================================================================
// SOURCE INTELLIGENCE AGENT
// ============================================================================

export class SourceIntelligenceAgent extends ConfidentialBaseAgent<
  SourceIntelligenceInput,
  SourceIntelligenceOutput
> {
  constructor() {
    super("source_intelligence", "research", {
      deliverableType: "all",
      maxRetries: 2,
      timeoutMs: 120000,
    })
  }

  protected async execute(
    context: PipelineContext,
    input: SourceIntelligenceInput,
    agentContext: AgentContext
  ): Promise<AgentOutput<SourceIntelligenceOutput>> {
    const { tenantId, sourceId, videoDbId, videoId } = input

    // Get preferences
    const preferences = await getOrCreatePreferences(tenantId)
    if (!preferences) {
      return createConfidentialAgentOutput(false, undefined, {
        error: "Failed to load intelligence preferences",
        shouldRetry: true,
      })
    }

    // Build scoring context
    const scoringContext = await this.buildScoringContext(tenantId, preferences, agentContext)

    let output: SourceIntelligenceOutput

    // Score YouTube video
    if (videoDbId || videoId) {
      let video: YouTubeVideo | null = null

      if (videoDbId) {
        const videos = await getYouTubeVideosByTenant(tenantId, { minScore: 0 }, 1000)
        video = videos.find(v => v.id === videoDbId) || null
      } else if (videoId) {
        video = await getYouTubeVideoByVideoId(tenantId, videoId)
      }

      if (!video) {
        return createConfidentialAgentOutput(false, undefined, {
          error: `Video not found`,
          shouldRetry: false,
        })
      }

      output = await this.scoreAndRouteVideo(video, scoringContext, agentContext, input.scoringOnly, input.routingOnly)
      
    // Score source
    } else if (sourceId) {
      const source = await getSourceById(tenantId, sourceId)
      if (!source) {
        return createConfidentialAgentOutput(false, undefined, {
          error: `Source not found: ${sourceId}`,
          shouldRetry: false,
        })
      }

      output = await this.scoreAndRouteSource(source, scoringContext, agentContext, input.scoringOnly, input.routingOnly)
      
    } else {
      return createConfidentialAgentOutput(false, undefined, {
        error: "Must provide sourceId, videoDbId, or videoId",
        shouldRetry: false,
      })
    }

    return createConfidentialAgentOutput(true, output)
  }

  // ============================================================================
  // SCORING CONTEXT
  // ============================================================================

  private async buildScoringContext(
    tenantId: string,
    preferences: IntelPreferences,
    agentContext: AgentContext
  ): Promise<ScoringContext> {
    const tenantBrain = this.getTenantBrainData()

    // Extract brand keywords
    const brandKeywords: string[] = []
    if (tenantBrain.brandBlueprint?.keyMessages) {
      brandKeywords.push(...tenantBrain.brandBlueprint.keyMessages)
    }
    if (tenantBrain.brandBlueprint?.brandVoice) {
      brandKeywords.push(...tenantBrain.brandBlueprint.brandVoice.split(/[,;]/))
    }

    // Extract audience keywords
    const audienceKeywords: string[] = []
    if (tenantBrain.targetAudienceAnalysis?.segments) {
      for (const segment of tenantBrain.targetAudienceAnalysis.segments) {
        if (segment.interests) audienceKeywords.push(...segment.interests)
        if (segment.name) audienceKeywords.push(segment.name)
      }
    }

    // Extract strategy priorities
    const strategyPriorities: string[] = []
    if (tenantBrain.brandStrategy?.keyObjectives) {
      strategyPriorities.push(...tenantBrain.brandStrategy.keyObjectives)
    }
    if (tenantBrain.brandStrategy?.positioningStatement) {
      strategyPriorities.push(tenantBrain.brandStrategy.positioningStatement)
    }

    return {
      tenantId,
      preferences,
      brandKeywords: [...new Set(brandKeywords.map(k => k.trim().toLowerCase()))],
      audienceKeywords: [...new Set(audienceKeywords.map(k => k.trim().toLowerCase()))],
      strategyPriorities: [...new Set(strategyPriorities)],
    }
  }

  // ============================================================================
  // VIDEO SCORING
  // ============================================================================

  private async scoreAndRouteVideo(
    video: YouTubeVideo,
    scoringContext: ScoringContext,
    agentContext: AgentContext,
    scoringOnly?: boolean,
    routingOnly?: boolean
  ): Promise<SourceIntelligenceOutput> {
    // Get video summaries for scoring
    const summaries = await getSummariesByVideoId(scoringContext.tenantId, video.id)

    // Calculate scores
    const { scores, rationale } = await this.calculateVideoScores(
      video,
      summaries,
      scoringContext,
      agentContext
    )

    // Update video scores
    if (!routingOnly) {
      await updateYouTubeVideoScores(scoringContext.tenantId, video.id, {
        relevanceScore: scores.topicalRelevanceScore,
        audienceRelevanceScore: scores.audienceRelevanceScore,
        strategicUsefulnessScore: scores.strategicUsefulnessScore,
        credibilityScore: scores.credibilityScore,
        recencyScore: scores.recencyScore,
        overallScore: scores.overallScore,
      })
    }

    // Determine routing
    const { decision, reason, routeToTelegram, routeToRag } = this.determineRouting(
      scores,
      scoringContext.preferences,
      video.transcriptStatus === "available" || video.transcriptStatus === "transcribed"
    )

    return {
      videoDbId: video.id,
      scores,
      scoreRationale: rationale,
      routingDecision: decision,
      routingReason: reason,
      routedToTelegram: routeToTelegram,
      routedToRag: routeToRag,
    }
  }

  private async calculateVideoScores(
    video: YouTubeVideo,
    summaries: VideoSummary[],
    scoringContext: ScoringContext,
    agentContext: AgentContext
  ): Promise<{
    scores: ContentScores
    rationale: { dimension: string; score: number; reason: string }[]
  }> {
    const rationale: { dimension: string; score: number; reason: string }[] = []

    // Combine all text for analysis
    const contentText = [
      video.title,
      video.description || "",
      video.channelTitle || "",
      ...(video.tags || []),
      ...summaries.map(s => s.summary),
      ...summaries.flatMap(s => s.keyTopics || []),
    ].join(" ").toLowerCase()

    // 1. Topical Relevance
    const brandMatches = scoringContext.brandKeywords.filter(k => contentText.includes(k))
    let topicalScore = 0.4 + Math.min(brandMatches.length * 0.1, 0.4)
    
    // Boost for having summaries
    if (summaries.length > 0) {
      topicalScore += 0.1
    }

    // Check relevance notes from summaries
    const brandRelevanceNotes = summaries.find(s => s.brandRelevanceNotes)?.brandRelevanceNotes
    if (brandRelevanceNotes && brandRelevanceNotes.length > 20) {
      topicalScore += 0.1
    }

    topicalScore = Math.min(topicalScore, 1)
    rationale.push({
      dimension: "topical_relevance",
      score: topicalScore,
      reason: `${brandMatches.length} brand keyword matches. ${summaries.length} summaries available.`,
    })

    // 2. Audience Relevance
    const audienceMatches = scoringContext.audienceKeywords.filter(k => contentText.includes(k))
    let audienceScore = 0.4 + Math.min(audienceMatches.length * 0.12, 0.4)

    const audienceRelevanceNotes = summaries.find(s => s.audienceRelevanceNotes)?.audienceRelevanceNotes
    if (audienceRelevanceNotes && audienceRelevanceNotes.length > 20) {
      audienceScore += 0.15
    }

    audienceScore = Math.min(audienceScore, 1)
    rationale.push({
      dimension: "audience_relevance",
      score: audienceScore,
      reason: `${audienceMatches.length} audience keyword matches.`,
    })

    // 3. Strategic Usefulness
    let strategicScore = 0.5

    // Videos with actionable summaries are more strategically useful
    const actionableSummary = summaries.find(s => s.summaryType === "actionable")
    if (actionableSummary) {
      strategicScore += 0.2
    }

    // Content ideas summary
    const contentIdeasSummary = summaries.find(s => s.summaryType === "content_ideas")
    if (contentIdeasSummary) {
      strategicScore += 0.15
    }

    // Strategy relevance notes
    const strategyRelevanceNotes = summaries.find(s => s.strategyRelevanceNotes)?.strategyRelevanceNotes
    if (strategyRelevanceNotes && strategyRelevanceNotes.length > 20) {
      strategicScore += 0.1
    }

    strategicScore = Math.min(strategicScore, 1)
    rationale.push({
      dimension: "strategic_usefulness",
      score: strategicScore,
      reason: `Actionable summary: ${!!actionableSummary}. Content ideas: ${!!contentIdeasSummary}.`,
    })

    // 4. Credibility
    let credibilityScore = 0.5

    // View count as credibility signal
    if (video.viewCount) {
      if (video.viewCount >= 100000) credibilityScore += 0.25
      else if (video.viewCount >= 10000) credibilityScore += 0.15
      else if (video.viewCount >= 1000) credibilityScore += 0.1
    }

    // Like ratio
    if (video.viewCount && video.likeCount) {
      const likeRatio = video.likeCount / video.viewCount
      if (likeRatio > 0.04) credibilityScore += 0.15
      else if (likeRatio > 0.02) credibilityScore += 0.1
    }

    // Duration indicates depth
    if (video.durationSeconds) {
      if (video.durationSeconds >= 600 && video.durationSeconds <= 1800) {
        credibilityScore += 0.1 // 10-30 min sweet spot
      }
    }

    credibilityScore = Math.min(credibilityScore, 1)
    rationale.push({
      dimension: "credibility",
      score: credibilityScore,
      reason: `Views: ${video.viewCount || 0}. Likes: ${video.likeCount || 0}.`,
    })

    // 5. Recency
    let recencyScore = 0.5

    if (video.publishedAt) {
      const ageMs = Date.now() - video.publishedAt.getTime()
      const ageDays = ageMs / (1000 * 60 * 60 * 24)

      if (ageDays <= 7) recencyScore = 1.0
      else if (ageDays <= 30) recencyScore = 0.9
      else if (ageDays <= 90) recencyScore = 0.75
      else if (ageDays <= 180) recencyScore = 0.6
      else if (ageDays <= 365) recencyScore = 0.45
      else recencyScore = 0.3
    }

    rationale.push({
      dimension: "recency",
      score: recencyScore,
      reason: video.publishedAt 
        ? `Published: ${video.publishedAt.toISOString().split("T")[0]}`
        : "Unknown publish date",
    })

    // Calculate overall
    const overallScore = this.calculateOverallScore(
      topicalScore,
      audienceScore,
      strategicScore,
      credibilityScore,
      recencyScore
    )

    rationale.push({
      dimension: "overall",
      score: overallScore,
      reason: "Weighted average of all dimensions",
    })

    return {
      scores: {
        topicalRelevanceScore: Math.round(topicalScore * 100) / 100,
        audienceRelevanceScore: Math.round(audienceScore * 100) / 100,
        strategicUsefulnessScore: Math.round(strategicScore * 100) / 100,
        credibilityScore: Math.round(credibilityScore * 100) / 100,
        recencyScore: Math.round(recencyScore * 100) / 100,
        overallScore,
      },
      rationale,
    }
  }

  // ============================================================================
  // SOURCE SCORING
  // ============================================================================

  private async scoreAndRouteSource(
    source: IntelSource,
    scoringContext: ScoringContext,
    agentContext: AgentContext,
    scoringOnly?: boolean,
    routingOnly?: boolean
  ): Promise<SourceIntelligenceOutput> {
    // Calculate scores
    const { scores, rationale } = await this.calculateSourceScores(
      source,
      scoringContext,
      agentContext
    )

    // Update source scores
    if (!routingOnly) {
      await updateSourceScores(scoringContext.tenantId, source.id, {
        relevanceScore: scores.topicalRelevanceScore,
        viabilityScore: scores.audienceRelevanceScore, // Map to viability for sources
        credibilityScore: scores.credibilityScore,
        recencyScore: scores.recencyScore,
        overallScore: scores.overallScore,
      })
    }

    // Determine routing
    const { decision, reason, routeToTelegram, routeToRag } = this.determineRouting(
      scores,
      scoringContext.preferences,
      true // Sources are always "transcript available" for routing purposes
    )

    // Update source status based on decision
    if (!scoringOnly) {
      if (decision === "approve_source") {
        await updateSourceStatus(scoringContext.tenantId, source.id, "approved", "auto")
      } else if (decision === "reject") {
        await updateSourceStatus(scoringContext.tenantId, source.id, "rejected", "auto")
      }

      // Update routing
      await updateSourceRouting(scoringContext.tenantId, source.id, {
        routeToTelegram,
        routeToRag,
        telegramFrequency: routeToTelegram ? "daily" : undefined,
      })
    }

    return {
      sourceId: source.id,
      scores,
      scoreRationale: rationale,
      routingDecision: decision,
      routingReason: reason,
      routedToTelegram: routeToTelegram,
      routedToRag: routeToRag,
    }
  }

  private async calculateSourceScores(
    source: IntelSource,
    scoringContext: ScoringContext,
    agentContext: AgentContext
  ): Promise<{
    scores: ContentScores
    rationale: { dimension: string; score: number; reason: string }[]
  }> {
    const rationale: { dimension: string; score: number; reason: string }[] = []

    const contentText = [
      source.name,
      source.description || "",
      source.authorName || "",
      source.discoveryContext || "",
    ].join(" ").toLowerCase()

    // 1. Topical Relevance
    const brandMatches = scoringContext.brandKeywords.filter(k => contentText.includes(k))
    let topicalScore = 0.4 + Math.min(brandMatches.length * 0.12, 0.4)

    // Platform bonus
    if (source.platform === "linkedin" || source.platform === "youtube") {
      topicalScore += 0.1
    }

    topicalScore = Math.min(topicalScore, 1)
    rationale.push({
      dimension: "topical_relevance",
      score: topicalScore,
      reason: `${brandMatches.length} brand keyword matches.`,
    })

    // 2. Audience Relevance (mapped to viability for sources)
    const audienceMatches = scoringContext.audienceKeywords.filter(k => contentText.includes(k))
    let audienceScore = 0.5 + Math.min(audienceMatches.length * 0.1, 0.3)

    // Source type bonuses
    if (source.sourceType === "blog" || source.sourceType === "newsletter") {
      audienceScore += 0.1 // Regular content sources
    }

    audienceScore = Math.min(audienceScore, 1)
    rationale.push({
      dimension: "audience_relevance",
      score: audienceScore,
      reason: `${audienceMatches.length} audience keyword matches.`,
    })

    // 3. Strategic Usefulness
    let strategicScore = 0.5

    // Content that feeds strategy
    if (source.sourceClass === "watch") {
      strategicScore += 0.15 // Video content for inspiration
    }
    if (source.sourceType === "newsletter" || source.sourceType === "blog") {
      strategicScore += 0.1 // Regular insights
    }

    strategicScore = Math.min(strategicScore, 1)
    rationale.push({
      dimension: "strategic_usefulness",
      score: strategicScore,
      reason: `Source class: ${source.sourceClass}, type: ${source.sourceType}`,
    })

    // 4. Credibility
    let credibilityScore = 0.5

    // Known platforms are more credible
    if (["youtube", "linkedin", "instagram"].includes(source.platform || "")) {
      credibilityScore += 0.2
    }

    // Sources with low error rate
    if (source.errorCount === 0) {
      credibilityScore += 0.1
    }

    credibilityScore = Math.min(credibilityScore, 1)
    rationale.push({
      dimension: "credibility",
      score: credibilityScore,
      reason: `Platform: ${source.platform || "web"}. Error count: ${source.errorCount}`,
    })

    // 5. Recency
    let recencyScore = 0.5

    if (source.lastItemAt) {
      const ageMs = Date.now() - source.lastItemAt.getTime()
      const ageDays = ageMs / (1000 * 60 * 60 * 24)

      if (ageDays <= 7) recencyScore = 1.0
      else if (ageDays <= 30) recencyScore = 0.85
      else if (ageDays <= 90) recencyScore = 0.7
      else recencyScore = 0.5
    } else if (source.discoveredAt) {
      const ageMs = Date.now() - source.discoveredAt.getTime()
      const ageDays = ageMs / (1000 * 60 * 60 * 24)
      recencyScore = ageDays <= 7 ? 0.8 : 0.6
    }

    rationale.push({
      dimension: "recency",
      score: recencyScore,
      reason: source.lastItemAt 
        ? `Last item: ${source.lastItemAt.toISOString().split("T")[0]}`
        : "No items yet",
    })

    const overallScore = this.calculateOverallScore(
      topicalScore,
      audienceScore,
      strategicScore,
      credibilityScore,
      recencyScore
    )

    rationale.push({
      dimension: "overall",
      score: overallScore,
      reason: "Weighted average of all dimensions",
    })

    return {
      scores: {
        topicalRelevanceScore: Math.round(topicalScore * 100) / 100,
        audienceRelevanceScore: Math.round(audienceScore * 100) / 100,
        strategicUsefulnessScore: Math.round(strategicScore * 100) / 100,
        credibilityScore: Math.round(credibilityScore * 100) / 100,
        recencyScore: Math.round(recencyScore * 100) / 100,
        overallScore,
      },
      rationale,
    }
  }

  // ============================================================================
  // ROUTING DECISIONS
  // ============================================================================

  private determineRouting(
    scores: ContentScores,
    preferences: IntelPreferences,
    hasTranscript: boolean
  ): {
    decision: RoutingDecision
    reason: string
    routeToTelegram: boolean
    routeToRag: boolean
  } {
    const { overallScore } = scores
    let decision: RoutingDecision = "suggestion_only"
    let reason = ""
    let routeToTelegram = false
    let routeToRag = false

    // Auto-reject low scores
    if (overallScore <= preferences.autoRejectThreshold) {
      return {
        decision: "reject",
        reason: `Score ${overallScore} below rejection threshold ${preferences.autoRejectThreshold}`,
        routeToTelegram: false,
        routeToRag: false,
      }
    }

    // Auto-approve high scores
    if (overallScore >= preferences.autoApproveThreshold) {
      decision = "approve_source"
      reason = `Score ${overallScore} meets approval threshold ${preferences.autoApproveThreshold}`
    }

    // Telegram routing
    if (preferences.telegramEnabled && overallScore >= preferences.telegramMinScore) {
      routeToTelegram = true
      
      if (decision === "suggestion_only") {
        decision = "route_telegram"
        reason = `Score ${overallScore} meets Telegram threshold ${preferences.telegramMinScore}`
      }
    }

    // RAG routing
    if (preferences.ragEnabled && overallScore >= preferences.ragMinScore) {
      // For YouTube, require transcript
      if (!preferences.youtubeTranscriptRequired || hasTranscript) {
        routeToRag = true
        
        if (decision === "suggestion_only") {
          decision = "route_rag"
          reason = `Score ${overallScore} meets RAG threshold ${preferences.ragMinScore}`
        } else if (routeToTelegram) {
          decision = "route_both"
          reason = `Score ${overallScore} meets both Telegram and RAG thresholds`
        }
      }
    }

    // Default reason for suggestions
    if (decision === "suggestion_only") {
      reason = `Score ${overallScore} - kept as suggestion for review`
    }

    return {
      decision,
      reason,
      routeToTelegram,
      routeToRag,
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private calculateOverallScore(
    topical: number,
    audience: number,
    strategic: number,
    credibility: number,
    recency: number
  ): number {
    // Weighted average:
    // - Topical: 25%
    // - Audience: 25%
    // - Strategic: 20%
    // - Credibility: 15%
    // - Recency: 15%
    const score = 
      topical * 0.25 +
      audience * 0.25 +
      strategic * 0.20 +
      credibility * 0.15 +
      recency * 0.15

    return Math.round(score * 100) / 100
  }
}

// ============================================================================
// EXPORT INSTANCE
// ============================================================================

export const sourceIntelligenceAgent = new SourceIntelligenceAgent()

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export async function scoreSource(
  tenantId: string,
  sourceId: string
): Promise<SourceIntelligenceOutput | null> {
  const agent = new SourceIntelligenceAgent()

  const context: PipelineContext = {
    tenantId,
    runId: `scoring-${Date.now()}`,
    tenant: {
      id: tenantId,
      userId: "",
      businessName: "",
      businessType: "",
      contactEmail: "",
      pipelineStage: "research",
      createdAt: new Date(),
    },
    config: {
      maxRetries: 2,
      retryDelayMs: 2000,
      timeoutMs: 120000,
      enableResearch: true,
      enableClarification: false,
      minConfidenceThreshold: 0.5,
      testMode: false,
    },
    startedAt: new Date(),
    previousResponses: {},
  }

  const input: SourceIntelligenceInput = {
    tenantId,
    sourceId,
  }

  const result = await agent.run(context, input)

  if (result.success && result.data) {
    return result.data
  }

  console.error("Source scoring failed:", result.error)
  return null
}

export async function scoreYouTubeVideo(
  tenantId: string,
  videoDbId: string
): Promise<SourceIntelligenceOutput | null> {
  const agent = new SourceIntelligenceAgent()

  const context: PipelineContext = {
    tenantId,
    runId: `scoring-${Date.now()}`,
    tenant: {
      id: tenantId,
      userId: "",
      businessName: "",
      businessType: "",
      contactEmail: "",
      pipelineStage: "research",
      createdAt: new Date(),
    },
    config: {
      maxRetries: 2,
      retryDelayMs: 2000,
      timeoutMs: 120000,
      enableResearch: true,
      enableClarification: false,
      minConfidenceThreshold: 0.5,
      testMode: false,
    },
    startedAt: new Date(),
    previousResponses: {},
  }

  const input: SourceIntelligenceInput = {
    tenantId,
    videoDbId,
  }

  const result = await agent.run(context, input)

  if (result.success && result.data) {
    return result.data
  }

  console.error("Video scoring failed:", result.error)
  return null
}

export async function batchScoreSources(
  tenantId: string,
  sourceIds: string[]
): Promise<Map<string, SourceIntelligenceOutput>> {
  const results = new Map<string, SourceIntelligenceOutput>()

  for (const sourceId of sourceIds) {
    const result = await scoreSource(tenantId, sourceId)
    if (result) {
      results.set(sourceId, result)
    }
  }

  return results
}
