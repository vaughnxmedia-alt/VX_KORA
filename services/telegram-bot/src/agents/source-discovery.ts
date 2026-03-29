/**
 * KORA Strategic Source Discovery Agent
 * 
 * Multi-stage discovery process that prioritizes strategic relevance
 * over simple keyword matching.
 * 
 * STAGES:
 * 1. Build Strategic Search Profile from tenant data
 * 2. Discover large candidate pool
 * 3. Filter out weak sources
 * 4. Score remaining sources strategically
 * 5. Verify sources before recommending
 * 6. Recommend only highest scoring sources
 * 
 * SOURCE STATES:
 * - suggested: Discovered but not reviewed
 * - approved: Reviewed and accepted, may feed RAG
 * - trusted: Verified high-quality, influences strategy
 */

import { ConfidentialBaseAgent, createConfidentialAgentOutput } from "./confidential-base-agent"
import type { PipelineContext, AgentOutput } from "../types/pipeline"
import type { AgentContext } from "../rag/context-builder"
import { getRouter } from "../llm/router"
import {
  createSource,
  getSourcesByTenant,
  createDiscoveryRun,
  completeDiscoveryRun,
  getOrCreatePreferences,
  updateSourceScores,
  updateSourceStatus,
} from "../db/sources"
import type {
  IntelSource,
  SourceClass,
  SourceType,
  SourcePlatform,
  SourceDiscoveryInput,
  IntelPreferences,
  DiscoveryQuery,
  SourceScores,
} from "../types/sources"

// ============================================================================
// TYPES
// ============================================================================

export interface SourceDiscoveryOutput {
  runId: string
  sourcesDiscovered: number
  sourcesFiltered: number
  sourcesNew: number
  sourcesAutoApproved: number
  sourcesAutoRejected: number
  queriesUsed: DiscoveryQuery[]
  discoveredSources: IntelSource[]
  strategicProfile: StrategicSearchProfile
}

/**
 * Strategic Search Profile built from tenant data.
 * This drives discovery instead of simple keywords.
 */
export interface StrategicSearchProfile {
  tenantId: string
  
  // Core identity
  brandEssence: string
  industry: string
  niche: string
  
  // Strategic context
  positioningStatement: string
  differentiators: string[]
  strategicGoals: string[]
  contentThemes: string[]
  
  // Audience understanding
  primaryAudience: string
  audienceInterests: string[]
  audienceChallenges: string[]
  audiencePlatforms: SourcePlatform[]
  
  // Competitive context
  competitors: string[]
  competitorStrengths: string[]
  
  // Source preferences
  preferredSourceTypes: SourceType[]
  excludedSourceTypes: SourceType[]
  
  // Quality thresholds
  minCredibilityThreshold: number
  minRelevanceThreshold: number
  
  // Discovery focus areas
  learningPriorities: string[]
  topicBlacklist: string[]
}

/**
 * Raw candidate before filtering and verification.
 */
interface SourceCandidate {
  sourceClass: SourceClass
  sourceType: SourceType
  platform?: SourcePlatform
  name: string
  url?: string
  handle?: string
  externalId?: string
  description?: string
  thumbnailUrl?: string
  authorName?: string
  authorUrl?: string
  discoveryMethod: string
  rawSignals: CandidateSignals
}

/**
 * Signals collected about a candidate for scoring.
 */
interface CandidateSignals {
  // Activity signals
  lastPublishedDate?: Date
  publishingFrequency?: string
  totalContentCount?: number
  
  // Engagement signals
  subscriberCount?: number
  averageViews?: number
  averageEngagement?: number
  
  // Quality signals
  contentDepthIndicator?: "shallow" | "moderate" | "deep"
  originalityIndicator?: "low" | "medium" | "high"
  expertiseIndicator?: "novice" | "practitioner" | "expert" | "authority"
  
  // Topic signals
  primaryTopics?: string[]
  topicConsistency?: number
  nicheSpecificity?: "broad" | "focused" | "niche"
  
  // Credibility signals
  verifiedAccount?: boolean
  establishedPresence?: boolean
  crossPlatformPresence?: boolean
  citedByOthers?: boolean
}

/**
 * Scored candidate ready for filtering.
 */
interface ScoredCandidate extends SourceCandidate {
  scores: StrategicScores
  filterReasons: string[]
  passed: boolean
}

/**
 * Strategic scoring dimensions.
 */
interface StrategicScores {
  strategicRelevance: number    // How well aligned with tenant strategy
  audienceAlignment: number     // How well matched to target audience
  credibility: number           // Authority and trustworthiness
  publishingConsistency: number // Regular, quality output
  insightDensity: number        // Value per content piece
  recency: number               // Fresh, current content
  overallScore: number
  scoreRationale: string[]
}

/**
 * Verification result for a candidate.
 */
interface VerificationResult {
  verified: boolean
  confidence: number
  issues: string[]
  recommendations: string[]
}

// ============================================================================
// WEAK SOURCE FILTERS
// ============================================================================

const WEAK_SOURCE_PATTERNS = {
  // Motivational fluff content
  motivationalFluff: [
    /^(5|7|10|12|15|20|25|30|50|100)\s+(ways|tips|secrets|habits|rules)/i,
    /unlock your potential/i,
    /change your life/i,
    /success mindset/i,
    /millionaire/i,
    /hustle culture/i,
    /grind/i,
    /boss babe/i,
    /passive income secrets/i,
    /get rich/i,
  ],
  
  // AI spam indicators
  aiSpamIndicators: [
    /written by ai/i,
    /generated content/i,
    /\[insert [^\]]+\]/i,
    /lorem ipsum/i,
    /as an ai/i,
  ],
  
  // Low credibility patterns
  lowCredibility: [
    /free ebook/i,
    /click here to/i,
    /limited time offer/i,
    /act now/i,
    /guaranteed results/i,
    /make \$\d+/i,
    /earn from home/i,
  ],
  
  // Irrelevant content
  irrelevantContent: [
    /horoscope/i,
    /zodiac/i,
    /crypto trading/i,
    /forex signals/i,
    /betting tips/i,
    /gambling/i,
    /adult content/i,
  ],
}

// ============================================================================
// SOURCE DISCOVERY AGENT
// ============================================================================

export class SourceDiscoveryAgent extends ConfidentialBaseAgent<
  SourceDiscoveryInput,
  SourceDiscoveryOutput
> {
  constructor() {
    super("source_discovery", "research", {
      deliverableType: "all",
      maxRetries: 2,
      timeoutMs: 300000, // 5 minutes for comprehensive discovery
    })
  }

  protected async execute(
    context: PipelineContext,
    input: SourceDiscoveryInput,
    agentContext: AgentContext
  ): Promise<AgentOutput<SourceDiscoveryOutput>> {
    const tenantId = input.tenantId

    // Create discovery run record
    const run = await createDiscoveryRun(tenantId, {
      runType: "manual",
      sourceClasses: input.sourceClasses,
    })

    if (!run) {
      return createConfidentialAgentOutput(false, undefined, {
        error: "Failed to create discovery run",
        shouldRetry: true,
      })
    }

    try {
      // Get preferences
      const preferences = await getOrCreatePreferences(tenantId)
      if (!preferences) {
        throw new Error("Failed to load intelligence preferences")
      }

      // ================================================================
      // STAGE 1: Build Strategic Search Profile
      // ================================================================
      console.log(`[SourceDiscovery] Stage 1: Building strategic search profile`)
      const strategicProfile = await this.buildStrategicSearchProfile(
        tenantId,
        preferences,
        agentContext
      )

      // Get existing sources to avoid duplicates
      const existingSources = await getSourcesByTenant(tenantId, {}, 1000)
      const existingUrls = new Set(
        existingSources.filter(s => s.url).map(s => this.normalizeUrl(s.url!))
      )
      const existingHandles = new Set(
        existingSources.filter(s => s.handle).map(s => s.handle!.toLowerCase())
      )

      // ================================================================
      // STAGE 2: Discover Large Candidate Pool
      // ================================================================
      console.log(`[SourceDiscovery] Stage 2: Discovering candidate pool`)
      const classesToDiscover = input.sourceClasses || ["read", "watch", "follow"]
      const allCandidates: SourceCandidate[] = []
      const queriesUsed: DiscoveryQuery[] = []

      for (const sourceClass of classesToDiscover) {
        if (sourceClass === "read" && !preferences.readSourcesEnabled) continue
        if (sourceClass === "watch" && !preferences.watchSourcesEnabled) continue
        if (sourceClass === "follow" && !preferences.followSourcesEnabled) continue

        const { candidates, queries } = await this.discoverCandidatePool(
          sourceClass,
          strategicProfile,
          preferences,
          input.maxResultsPerClass || 30 // Get more to filter down
        )

        allCandidates.push(...candidates)
        queriesUsed.push(...queries)
      }

      // Remove duplicates against existing sources
      const deduplicatedCandidates = allCandidates.filter(c => {
        if (c.url) {
          const normalized = this.normalizeUrl(c.url)
          if (existingUrls.has(normalized)) return false
        }
        if (c.handle) {
          if (existingHandles.has(c.handle.toLowerCase())) return false
        }
        return true
      })

      console.log(`[SourceDiscovery] Found ${deduplicatedCandidates.length} unique candidates`)

      // ================================================================
      // STAGE 3: Filter Out Weak Sources
      // ================================================================
      console.log(`[SourceDiscovery] Stage 3: Filtering weak sources`)
      const filteredCandidates = await this.filterWeakSources(
        deduplicatedCandidates,
        strategicProfile
      )

      console.log(`[SourceDiscovery] ${filteredCandidates.length} candidates passed filtering`)

      // ================================================================
      // STAGE 4: Score Remaining Sources Strategically
      // ================================================================
      console.log(`[SourceDiscovery] Stage 4: Strategic scoring`)
      const scoredCandidates = await this.scoreCandidatesStrategically(
        filteredCandidates,
        strategicProfile,
        agentContext
      )

      // ================================================================
      // STAGE 5: Verify Top Sources
      // ================================================================
      console.log(`[SourceDiscovery] Stage 5: Verifying top sources`)
      // Only verify candidates that passed and have high enough scores
      const candidatesToVerify = scoredCandidates
        .filter(c => c.passed && c.scores.overallScore >= strategicProfile.minRelevanceThreshold)
        .slice(0, 20) // Verify top 20

      const verifiedCandidates = await this.verifySources(
        candidatesToVerify,
        strategicProfile
      )

      // ================================================================
      // STAGE 6: Create Source Records for Recommended Sources
      // ================================================================
      console.log(`[SourceDiscovery] Stage 6: Creating source records`)
      const createdSources: IntelSource[] = []
      let autoApproved = 0
      let autoRejected = 0

      for (const candidate of verifiedCandidates) {
        if (!candidate.verified) {
          autoRejected++
          continue
        }

        // Determine initial status based on score
        let status: IntelSource["status"] = "suggested"
        const score = candidate.scores.overallScore

        if (score >= preferences.autoApproveThreshold) {
          status = "approved"
          autoApproved++
        } else if (score <= preferences.autoRejectThreshold) {
          status = "rejected"
          autoRejected++
          continue // Skip creating rejected sources
        }

        const source = await createSource(tenantId, {
          sourceClass: candidate.sourceClass,
          sourceType: candidate.sourceType,
          platform: candidate.platform,
          name: candidate.name,
          url: candidate.url,
          handle: candidate.handle,
          externalId: candidate.externalId,
          description: candidate.description,
          thumbnailUrl: candidate.thumbnailUrl,
          authorName: candidate.authorName,
          authorUrl: candidate.authorUrl,
          discoveredBy: "agent",
          discoveryQuery: candidate.discoveryMethod,
          discoveryContext: this.formatDiscoveryContext(candidate, strategicProfile),
        })

        if (source) {
          // Update scores
          const scoredSource = await updateSourceScores(tenantId, source.id, {
            relevanceScore: candidate.scores.strategicRelevance,
            viabilityScore: candidate.scores.publishingConsistency,
            credibilityScore: candidate.scores.credibility,
            recencyScore: candidate.scores.recency,
            overallScore: candidate.scores.overallScore,
          })

          if (scoredSource) {
            if (status !== "suggested") {
              await updateSourceStatus(tenantId, scoredSource.id, status, "auto")
            }
            createdSources.push(scoredSource)
          }
        }
      }

      // Complete the run
      await completeDiscoveryRun(tenantId, run.id, {
        sourcesDiscovered: allCandidates.length,
        sourcesNew: createdSources.length,
        sourcesUpdated: 0,
        sourcesAutoApproved: autoApproved,
        sourcesAutoRejected: autoRejected,
        queriesUsed,
      })

      const output: SourceDiscoveryOutput = {
        runId: run.id,
        sourcesDiscovered: allCandidates.length,
        sourcesFiltered: allCandidates.length - filteredCandidates.length,
        sourcesNew: createdSources.length,
        sourcesAutoApproved: autoApproved,
        sourcesAutoRejected: autoRejected,
        queriesUsed,
        discoveredSources: createdSources,
        strategicProfile,
      }

      return createConfidentialAgentOutput(true, output)

    } catch (error) {
      const err = error as Error
      await completeDiscoveryRun(tenantId, run.id, {
        sourcesDiscovered: 0,
        sourcesNew: 0,
        sourcesUpdated: 0,
        sourcesAutoApproved: 0,
        sourcesAutoRejected: 0,
        errorMessage: err.message,
      })

      return createConfidentialAgentOutput(false, undefined, {
        error: err.message,
        shouldRetry: this.isRetryableError(err),
      })
    }
  }

  // ============================================================================
  // STAGE 1: STRATEGIC SEARCH PROFILE
  // ============================================================================

  private async buildStrategicSearchProfile(
    tenantId: string,
    preferences: IntelPreferences,
    agentContext: AgentContext
  ): Promise<StrategicSearchProfile> {
    const tenantBrain = this.getTenantBrainData()
    const coreBrain = this.getCoreBrainData()

    // Extract core identity
    const brandEssence = this.extractBrandEssence(tenantBrain)
    const industry = tenantBrain.brandBlueprint?.industry || "general business"
    const niche = this.extractNiche(tenantBrain)

    // Extract strategic context
    const positioningStatement = tenantBrain.brandStrategy?.positioningStatement || ""
    const differentiators = this.extractDifferentiators(tenantBrain)
    const strategicGoals = this.extractStrategicGoals(tenantBrain)
    const contentThemes = this.extractContentThemes(tenantBrain)

    // Extract audience understanding
    const { primaryAudience, interests, challenges, platforms } = this.extractAudienceProfile(tenantBrain)

    // Extract competitive context
    const { competitors, strengths } = this.extractCompetitiveContext(tenantBrain)

    // Determine learning priorities based on strategy gaps
    const learningPriorities = await this.determineLearningPriorities(
      tenantBrain,
      coreBrain,
      agentContext
    )

    // Build topic blacklist
    const topicBlacklist = this.buildTopicBlacklist(tenantBrain, preferences)

    return {
      tenantId,
      brandEssence,
      industry,
      niche,
      positioningStatement,
      differentiators,
      strategicGoals,
      contentThemes,
      primaryAudience,
      audienceInterests: interests,
      audienceChallenges: challenges,
      audiencePlatforms: platforms,
      competitors,
      competitorStrengths: strengths,
      preferredSourceTypes: this.determinePreferredSourceTypes(preferences, platforms),
      excludedSourceTypes: [],
      minCredibilityThreshold: 0.5,
      minRelevanceThreshold: preferences.autoRejectThreshold + 0.1,
      learningPriorities,
      topicBlacklist,
    }
  }

  private extractBrandEssence(tenantBrain: AgentContext["tenantBrain"]): string {
    const parts: string[] = []

    if (tenantBrain.brandBlueprint?.brandVoice) {
      parts.push(tenantBrain.brandBlueprint.brandVoice)
    }

    if (tenantBrain.brandBlueprint?.keyMessages?.length) {
      parts.push(tenantBrain.brandBlueprint.keyMessages[0])
    }

    if (tenantBrain.brandStrategy?.positioningStatement) {
      parts.push(tenantBrain.brandStrategy.positioningStatement)
    }

    // Fallback to intake answers
    if (parts.length === 0) {
      const brandAnswer = tenantBrain.intakeAnswers.find(
        a => a.questionKey.includes("brand") || a.questionKey.includes("business")
      )
      if (brandAnswer) {
        parts.push(brandAnswer.answer)
      }
    }

    return parts.join(". ").slice(0, 500) || "Professional service provider"
  }

  private extractNiche(tenantBrain: AgentContext["tenantBrain"]): string {
    // Look for niche indicators in intake and strategy
    const nicheAnswer = tenantBrain.intakeAnswers.find(
      a => a.questionKey.includes("niche") || 
           a.questionKey.includes("specialty") ||
           a.questionKey.includes("focus")
    )

    if (nicheAnswer) return nicheAnswer.answer

    if (tenantBrain.brandStrategy?.keyObjectives?.length) {
      return tenantBrain.brandStrategy.keyObjectives[0]
    }

    return tenantBrain.brandBlueprint?.industry || "general"
  }

  private extractDifferentiators(tenantBrain: AgentContext["tenantBrain"]): string[] {
    const differentiators: string[] = []

    // From brand strategy
    if (tenantBrain.brandStrategy?.keyObjectives) {
      differentiators.push(...tenantBrain.brandStrategy.keyObjectives)
    }

    // From brand blueprint
    if (tenantBrain.brandBlueprint?.uniqueValueProposition) {
      differentiators.push(tenantBrain.brandBlueprint.uniqueValueProposition)
    }

    // From intake
    const diffAnswer = tenantBrain.intakeAnswers.find(
      a => a.questionKey.includes("different") || 
           a.questionKey.includes("unique") ||
           a.questionKey.includes("standout")
    )
    if (diffAnswer) {
      differentiators.push(...diffAnswer.answer.split(/[,;.]/))
    }

    return differentiators.filter(d => d.length > 5).slice(0, 5)
  }

  private extractStrategicGoals(tenantBrain: AgentContext["tenantBrain"]): string[] {
    const goals: string[] = []

    if (tenantBrain.brandStrategy?.keyObjectives) {
      goals.push(...tenantBrain.brandStrategy.keyObjectives)
    }

    const goalsAnswer = tenantBrain.intakeAnswers.find(
      a => a.questionKey.includes("goal") || a.questionKey.includes("objective")
    )
    if (goalsAnswer) {
      goals.push(...goalsAnswer.answer.split(/[,;.]/))
    }

    return goals.filter(g => g.length > 5).slice(0, 5)
  }

  private extractContentThemes(tenantBrain: AgentContext["tenantBrain"]): string[] {
    const themes: string[] = []

    // From content strategy if available
    if (tenantBrain.contentStrategy?.contentPillars) {
      themes.push(...tenantBrain.contentStrategy.contentPillars)
    }

    // From brand strategy
    if (tenantBrain.brandStrategy?.keyObjectives) {
      themes.push(...tenantBrain.brandStrategy.keyObjectives)
    }

    // From intake
    const contentAnswer = tenantBrain.intakeAnswers.find(
      a => a.questionKey.includes("content") || a.questionKey.includes("topic")
    )
    if (contentAnswer) {
      themes.push(...contentAnswer.answer.split(/[,;]/))
    }

    return [...new Set(themes.map(t => t.trim()))].filter(t => t.length > 3).slice(0, 8)
  }

  private extractAudienceProfile(tenantBrain: AgentContext["tenantBrain"]): {
    primaryAudience: string
    interests: string[]
    challenges: string[]
    platforms: SourcePlatform[]
  } {
    let primaryAudience = "business professionals"
    const interests: string[] = []
    const challenges: string[] = []
    const platforms: SourcePlatform[] = ["youtube", "linkedin"]

    // From target audience analysis
    if (tenantBrain.targetAudienceAnalysis?.segments?.length) {
      const segment = tenantBrain.targetAudienceAnalysis.segments[0]
      primaryAudience = segment.name || primaryAudience
      if (segment.interests) interests.push(...segment.interests)
      if (segment.painPoints) challenges.push(...segment.painPoints)
    }

    // From intake
    const audienceAnswer = tenantBrain.intakeAnswers.find(
      a => a.questionKey.includes("audience") || a.questionKey.includes("customer")
    )
    if (audienceAnswer) {
      primaryAudience = audienceAnswer.answer.split(/[,;]/)[0] || primaryAudience
    }

    // Platform preferences from intake
    const platformAnswer = tenantBrain.intakeAnswers.find(
      a => a.questionKey.includes("platform") || a.questionKey.includes("social")
    )
    if (platformAnswer) {
      const answer = platformAnswer.answer.toLowerCase()
      const detectedPlatforms: SourcePlatform[] = []
      if (answer.includes("youtube")) detectedPlatforms.push("youtube")
      if (answer.includes("instagram")) detectedPlatforms.push("instagram")
      if (answer.includes("linkedin")) detectedPlatforms.push("linkedin")
      if (answer.includes("tiktok")) detectedPlatforms.push("tiktok")
      if (answer.includes("twitter") || answer.includes("x")) detectedPlatforms.push("twitter")
      if (detectedPlatforms.length > 0) {
        platforms.length = 0
        platforms.push(...detectedPlatforms)
      }
    }

    return { primaryAudience, interests, challenges, platforms }
  }

  private extractCompetitiveContext(tenantBrain: AgentContext["tenantBrain"]): {
    competitors: string[]
    strengths: string[]
  } {
    const competitors: string[] = []
    const strengths: string[] = []

    // From brand strategy
    if (tenantBrain.brandStrategy?.competitorAnalysis) {
      const analysis = tenantBrain.brandStrategy.competitorAnalysis
      if (Array.isArray(analysis)) {
        for (const comp of analysis) {
          if (typeof comp === "string") {
            competitors.push(comp)
          } else if (typeof comp === "object") {
            if (comp.name) competitors.push(comp.name)
            if (comp.strengths) strengths.push(...(Array.isArray(comp.strengths) ? comp.strengths : [comp.strengths]))
          }
        }
      }
    }

    // From intake
    const compAnswer = tenantBrain.intakeAnswers.find(
      a => a.questionKey.includes("competitor")
    )
    if (compAnswer) {
      competitors.push(...compAnswer.answer.split(/[,;]/))
    }

    return {
      competitors: [...new Set(competitors.map(c => c.trim()))].filter(c => c.length > 2),
      strengths: [...new Set(strengths)],
    }
  }

  private async determineLearningPriorities(
    tenantBrain: AgentContext["tenantBrain"],
    coreBrain: AgentContext["coreBrain"],
    agentContext: AgentContext
  ): Promise<string[]> {
    const priorities: string[] = []

    // Based on strategic goals
    if (tenantBrain.brandStrategy?.keyObjectives) {
      for (const objective of tenantBrain.brandStrategy.keyObjectives.slice(0, 3)) {
        priorities.push(`Learn: How to ${objective.toLowerCase()}`)
      }
    }

    // Based on audience challenges
    if (tenantBrain.targetAudienceAnalysis?.segments) {
      for (const segment of tenantBrain.targetAudienceAnalysis.segments) {
        if (segment.painPoints?.length) {
          priorities.push(`Understand: ${segment.painPoints[0]}`)
        }
      }
    }

    // Based on industry
    const industry = tenantBrain.brandBlueprint?.industry
    if (industry) {
      priorities.push(`${industry} trends and insights`)
      priorities.push(`${industry} best practices`)
    }

    // Default priorities
    if (priorities.length === 0) {
      priorities.push(
        "Content marketing strategies",
        "Audience engagement tactics",
        "Brand building approaches"
      )
    }

    return priorities.slice(0, 6)
  }

  private buildTopicBlacklist(
    tenantBrain: AgentContext["tenantBrain"],
    preferences: IntelPreferences
  ): string[] {
    const blacklist: string[] = []

    // Add excluded topics from preferences
    if (preferences.excludedTopics?.length) {
      blacklist.push(...preferences.excludedTopics)
    }

    // Default blacklisted topics
    blacklist.push(
      "crypto trading",
      "forex",
      "gambling",
      "get rich quick",
      "mlm",
      "pyramid scheme"
    )

    return [...new Set(blacklist.map(t => t.toLowerCase()))]
  }

  private determinePreferredSourceTypes(
    preferences: IntelPreferences,
    audiencePlatforms: SourcePlatform[]
  ): SourceType[] {
    const types: SourceType[] = []

    // Add based on preferences
    if (preferences.readSourcesEnabled) {
      types.push("blog", "article", "newsletter")
    }
    if (preferences.watchSourcesEnabled) {
      types.push("youtube_channel", "youtube_video", "podcast")
    }
    if (preferences.followSourcesEnabled) {
      // Prioritize platforms where audience is
      if (audiencePlatforms.includes("linkedin")) types.push("linkedin_creator")
      if (audiencePlatforms.includes("instagram")) types.push("instagram_account")
      if (audiencePlatforms.includes("youtube")) types.push("youtube_channel")
    }

    return types
  }

  // ============================================================================
  // STAGE 2: CANDIDATE POOL DISCOVERY
  // ============================================================================

  private async discoverCandidatePool(
    sourceClass: SourceClass,
    profile: StrategicSearchProfile,
    preferences: IntelPreferences,
    maxResults: number
  ): Promise<{ candidates: SourceCandidate[]; queries: DiscoveryQuery[] }> {
    const candidates: SourceCandidate[] = []
    const queries: DiscoveryQuery[] = []

    // Build strategic queries based on profile
    const strategicQueries = this.buildStrategicQueries(sourceClass, profile)

    for (const query of strategicQueries) {
      // In production, call actual search APIs
      const results = await this.executeStrategicSearch(sourceClass, query, profile)
      
      queries.push({
        query: query.queryString,
        sourceClass,
        resultsCount: results.length,
      })

      candidates.push(...results)

      if (candidates.length >= maxResults * 2) break // Get 2x for filtering buffer
    }

    return { candidates: candidates.slice(0, maxResults * 2), queries }
  }

  private buildStrategicQueries(
    sourceClass: SourceClass,
    profile: StrategicSearchProfile
  ): Array<{ queryString: string; intent: string; priority: number }> {
    const queries: Array<{ queryString: string; intent: string; priority: number }> = []

    switch (sourceClass) {
      case "read":
        // Industry-specific expert content
        queries.push({
          queryString: `${profile.industry} strategy expert blog`,
          intent: "Find industry thought leaders",
          priority: 1,
        })
        
        // Audience-focused content
        queries.push({
          queryString: `${profile.primaryAudience} marketing insights`,
          intent: "Find audience-relevant content",
          priority: 1,
        })

        // Learning priorities
        for (const priority of profile.learningPriorities.slice(0, 3)) {
          queries.push({
            queryString: `${priority} best practices guide`,
            intent: `Learn: ${priority}`,
            priority: 2,
          })
        }

        // Content themes
        for (const theme of profile.contentThemes.slice(0, 2)) {
          queries.push({
            queryString: `${theme} case studies analysis`,
            intent: `Theme research: ${theme}`,
            priority: 2,
          })
        }

        // Competitor research
        for (const competitor of profile.competitors.slice(0, 2)) {
          queries.push({
            queryString: `${competitor} strategy analysis`,
            intent: `Competitive intelligence: ${competitor}`,
            priority: 3,
          })
        }
        break

      case "watch":
        // Expert YouTube channels
        queries.push({
          queryString: `${profile.industry} expert channel youtube`,
          intent: "Find expert YouTube channels",
          priority: 1,
        })

        // Educational content
        queries.push({
          queryString: `${profile.niche} tutorial masterclass youtube`,
          intent: "Find educational content",
          priority: 1,
        })

        // Interview/podcast content
        queries.push({
          queryString: `${profile.industry} expert interview podcast`,
          intent: "Find expert interviews",
          priority: 2,
        })

        // Audience-focused
        queries.push({
          queryString: `how to reach ${profile.primaryAudience} youtube`,
          intent: "Find audience engagement strategies",
          priority: 2,
        })

        // Strategy content
        for (const goal of profile.strategicGoals.slice(0, 2)) {
          queries.push({
            queryString: `${goal} strategy youtube`,
            intent: `Strategy learning: ${goal}`,
            priority: 2,
          })
        }
        break

      case "follow":
        // Industry leaders
        for (const platform of profile.audiencePlatforms.slice(0, 2)) {
          queries.push({
            queryString: `${profile.industry} thought leader ${platform}`,
            intent: `Find industry leaders on ${platform}`,
            priority: 1,
          })
        }

        // Audience-relevant creators
        queries.push({
          queryString: `${profile.primaryAudience} content creator ${profile.audiencePlatforms[0] || "linkedin"}`,
          intent: "Find audience-relevant creators",
          priority: 1,
        })

        // Niche experts
        queries.push({
          queryString: `${profile.niche} expert ${profile.audiencePlatforms[0] || "linkedin"}`,
          intent: "Find niche experts",
          priority: 2,
        })
        break
    }

    // Sort by priority
    return queries.sort((a, b) => a.priority - b.priority)
  }

  private async executeStrategicSearch(
    sourceClass: SourceClass,
    query: { queryString: string; intent: string; priority: number },
    profile: StrategicSearchProfile
  ): Promise<SourceCandidate[]> {
    // Simulate API delay
    await this.delay(100)

    // In production, this would call:
    // - Google Custom Search API for blogs/articles
    // - YouTube Data API for videos/channels
    // - Social platform APIs for creators

    return this.generateStrategicMockResults(sourceClass, query, profile)
  }

  private generateStrategicMockResults(
    sourceClass: SourceClass,
    query: { queryString: string; intent: string; priority: number },
    profile: StrategicSearchProfile
  ): SourceCandidate[] {
    const candidates: SourceCandidate[] = []

    switch (sourceClass) {
      case "read": {
        // Generate realistic blog/article sources
        const blogTypes = [
          { name: `${profile.industry} Insights Weekly`, type: "newsletter" as SourceType },
          { name: `The ${profile.niche} Report`, type: "blog" as SourceType },
          { name: `${query.queryString.split(" ")[0]} Strategy Hub`, type: "blog" as SourceType },
        ]

        for (const blog of blogTypes.slice(0, 2)) {
          candidates.push({
            sourceClass: "read",
            sourceType: blog.type,
            platform: "web",
            name: blog.name,
            url: `https://${blog.name.toLowerCase().replace(/\s+/g, "-")}.com`,
            description: `Expert analysis and insights on ${profile.industry}. Covers ${profile.contentThemes.slice(0, 2).join(", ")}.`,
            authorName: `${profile.industry} Expert Team`,
            discoveryMethod: query.intent,
            rawSignals: {
              publishingFrequency: "weekly",
              totalContentCount: Math.floor(Math.random() * 200) + 50,
              contentDepthIndicator: "deep",
              originalityIndicator: "high",
              expertiseIndicator: "expert",
              primaryTopics: profile.contentThemes.slice(0, 3),
              topicConsistency: 0.8,
              nicheSpecificity: "focused",
              establishedPresence: true,
            },
          })
        }
        break
      }

      case "watch": {
        // Generate realistic YouTube sources
        const channelId = this.generateMockId()
        candidates.push({
          sourceClass: "watch",
          sourceType: "youtube_channel",
          platform: "youtube",
          name: `${profile.industry} Mastery`,
          url: `https://youtube.com/channel/${channelId}`,
          handle: `@${profile.industry.toLowerCase().replace(/\s+/g, "")}mastery`,
          externalId: channelId,
          description: `Deep dives into ${profile.industry} strategies. Weekly videos on ${profile.contentThemes[0] || "industry trends"}.`,
          authorName: "Industry Expert",
          discoveryMethod: query.intent,
          rawSignals: {
            publishingFrequency: "weekly",
            totalContentCount: Math.floor(Math.random() * 100) + 30,
            subscriberCount: Math.floor(Math.random() * 50000) + 5000,
            averageViews: Math.floor(Math.random() * 10000) + 1000,
            contentDepthIndicator: "deep",
            originalityIndicator: "high",
            expertiseIndicator: "practitioner",
            primaryTopics: profile.contentThemes.slice(0, 3),
            topicConsistency: 0.75,
            nicheSpecificity: "focused",
            verifiedAccount: Math.random() > 0.5,
            establishedPresence: true,
          },
        })

        // Add a podcast/interview source
        const podcastId = this.generateMockId()
        candidates.push({
          sourceClass: "watch",
          sourceType: "podcast",
          platform: "youtube",
          name: `The ${profile.niche} Podcast`,
          url: `https://youtube.com/channel/${podcastId}`,
          handle: `@${profile.niche.toLowerCase().replace(/\s+/g, "")}podcast`,
          externalId: podcastId,
          description: `Interviews with ${profile.industry} experts. Deep conversations about ${profile.strategicGoals[0] || "strategy"}.`,
          authorName: "Podcast Host",
          discoveryMethod: query.intent,
          rawSignals: {
            publishingFrequency: "bi-weekly",
            totalContentCount: Math.floor(Math.random() * 80) + 20,
            subscriberCount: Math.floor(Math.random() * 20000) + 2000,
            averageViews: Math.floor(Math.random() * 5000) + 500,
            contentDepthIndicator: "deep",
            originalityIndicator: "high",
            expertiseIndicator: "authority",
            primaryTopics: [profile.industry, ...profile.learningPriorities.slice(0, 2)],
            topicConsistency: 0.85,
            nicheSpecificity: "niche",
            verifiedAccount: true,
            establishedPresence: true,
          },
        })
        break
      }

      case "follow": {
        // Generate realistic social creator sources
        const platform = profile.audiencePlatforms[0] || "linkedin"
        
        candidates.push({
          sourceClass: "follow",
          sourceType: platform === "linkedin" ? "linkedin_creator" : 
                     platform === "instagram" ? "instagram_account" :
                     platform === "tiktok" ? "tiktok_account" : "linkedin_creator",
          platform,
          name: `${profile.industry} Strategist`,
          handle: `@${profile.industry.toLowerCase().replace(/\s+/g, "")}strategist`,
          url: platform === "linkedin" 
            ? `https://linkedin.com/in/${profile.industry.toLowerCase().replace(/\s+/g, "-")}-strategist`
            : `https://${platform}.com/@${profile.industry.toLowerCase().replace(/\s+/g, "")}strategist`,
          description: `${profile.industry} expert sharing daily insights on ${profile.contentThemes[0] || "strategy"}.`,
          authorName: "Industry Strategist",
          discoveryMethod: query.intent,
          rawSignals: {
            publishingFrequency: "daily",
            totalContentCount: Math.floor(Math.random() * 500) + 100,
            subscriberCount: Math.floor(Math.random() * 30000) + 5000,
            averageEngagement: Math.random() * 0.05 + 0.02,
            contentDepthIndicator: "moderate",
            originalityIndicator: "high",
            expertiseIndicator: "practitioner",
            primaryTopics: profile.contentThemes.slice(0, 3),
            topicConsistency: 0.7,
            nicheSpecificity: "focused",
            verifiedAccount: Math.random() > 0.3,
            establishedPresence: true,
            crossPlatformPresence: Math.random() > 0.5,
          },
        })
        break
      }
    }

    return candidates
  }

  private generateMockId(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    let result = "UC"
    for (let i = 0; i < 22; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  // ============================================================================
  // STAGE 3: FILTER WEAK SOURCES
  // ============================================================================

  private async filterWeakSources(
    candidates: SourceCandidate[],
    profile: StrategicSearchProfile
  ): Promise<SourceCandidate[]> {
    const filtered: SourceCandidate[] = []

    for (const candidate of candidates) {
      const filterResult = this.evaluateSourceQuality(candidate, profile)
      
      if (filterResult.passed) {
        filtered.push(candidate)
      } else {
        console.log(`[SourceDiscovery] Filtered out: ${candidate.name}. Reasons: ${filterResult.reasons.join(", ")}`)
      }
    }

    return filtered
  }

  private evaluateSourceQuality(
    candidate: SourceCandidate,
    profile: StrategicSearchProfile
  ): { passed: boolean; reasons: string[] } {
    const reasons: string[] = []
    const text = [
      candidate.name,
      candidate.description || "",
    ].join(" ")

    // Check for motivational fluff
    for (const pattern of WEAK_SOURCE_PATTERNS.motivationalFluff) {
      if (pattern.test(text)) {
        reasons.push("Motivational fluff content detected")
        break
      }
    }

    // Check for AI spam
    for (const pattern of WEAK_SOURCE_PATTERNS.aiSpamIndicators) {
      if (pattern.test(text)) {
        reasons.push("AI-generated spam indicators detected")
        break
      }
    }

    // Check for low credibility patterns
    for (const pattern of WEAK_SOURCE_PATTERNS.lowCredibility) {
      if (pattern.test(text)) {
        reasons.push("Low credibility marketing patterns detected")
        break
      }
    }

    // Check for irrelevant content
    for (const pattern of WEAK_SOURCE_PATTERNS.irrelevantContent) {
      if (pattern.test(text)) {
        reasons.push("Irrelevant content type detected")
        break
      }
    }

    // Check topic blacklist
    for (const topic of profile.topicBlacklist) {
      if (text.toLowerCase().includes(topic)) {
        reasons.push(`Blacklisted topic: ${topic}`)
        break
      }
    }

    // Check activity signals
    if (candidate.rawSignals.publishingFrequency === "inactive" ||
        candidate.rawSignals.totalContentCount === 0) {
      reasons.push("Inactive source")
    }

    // Check content depth
    if (candidate.rawSignals.contentDepthIndicator === "shallow") {
      reasons.push("Shallow content depth")
    }

    // Check originality
    if (candidate.rawSignals.originalityIndicator === "low") {
      reasons.push("Low originality indicator")
    }

    // Check expertise level for certain source types
    if (["blog", "newsletter", "youtube_channel", "podcast"].includes(candidate.sourceType)) {
      if (candidate.rawSignals.expertiseIndicator === "novice") {
        reasons.push("Novice-level expertise for expert source type")
      }
    }

    // Check topic consistency
    if (candidate.rawSignals.topicConsistency !== undefined && 
        candidate.rawSignals.topicConsistency < 0.4) {
      reasons.push("Low topic consistency")
    }

    return {
      passed: reasons.length === 0,
      reasons,
    }
  }

  // ============================================================================
  // STAGE 4: STRATEGIC SCORING
  // ============================================================================

  private async scoreCandidatesStrategically(
    candidates: SourceCandidate[],
    profile: StrategicSearchProfile,
    agentContext: AgentContext
  ): Promise<ScoredCandidate[]> {
    const scored: ScoredCandidate[] = []

    for (const candidate of candidates) {
      const scores = await this.calculateStrategicScores(candidate, profile, agentContext)
      const filterReasons: string[] = []
      
      // Additional strategic filtering
      if (scores.strategicRelevance < profile.minRelevanceThreshold) {
        filterReasons.push(`Strategic relevance ${scores.strategicRelevance.toFixed(2)} below threshold ${profile.minRelevanceThreshold}`)
      }
      if (scores.credibility < profile.minCredibilityThreshold) {
        filterReasons.push(`Credibility ${scores.credibility.toFixed(2)} below threshold ${profile.minCredibilityThreshold}`)
      }

      scored.push({
        ...candidate,
        scores,
        filterReasons,
        passed: filterReasons.length === 0,
      })
    }

    // Sort by overall score
    scored.sort((a, b) => b.scores.overallScore - a.scores.overallScore)

    return scored
  }

  private async calculateStrategicScores(
    candidate: SourceCandidate,
    profile: StrategicSearchProfile,
    agentContext: AgentContext
  ): Promise<StrategicScores> {
    const rationale: string[] = []

    // ----------------------------------------------------------------
    // 1. Strategic Relevance (0-1)
    // ----------------------------------------------------------------
    let strategicRelevance = 0.3 // Base score

    const text = [
      candidate.name,
      candidate.description || "",
      ...(candidate.rawSignals.primaryTopics || []),
    ].join(" ").toLowerCase()

    // Check alignment with content themes
    const themeMatches = profile.contentThemes.filter(theme => 
      text.includes(theme.toLowerCase())
    )
    strategicRelevance += Math.min(themeMatches.length * 0.12, 0.36)
    if (themeMatches.length > 0) {
      rationale.push(`Matches content themes: ${themeMatches.slice(0, 2).join(", ")}`)
    }

    // Check alignment with learning priorities
    const priorityMatches = profile.learningPriorities.filter(priority =>
      text.includes(priority.toLowerCase().replace(/^learn:\s*/i, "").replace(/^understand:\s*/i, ""))
    )
    strategicRelevance += Math.min(priorityMatches.length * 0.1, 0.2)
    if (priorityMatches.length > 0) {
      rationale.push(`Matches learning priorities`)
    }

    // Check industry alignment
    if (text.includes(profile.industry.toLowerCase())) {
      strategicRelevance += 0.1
      rationale.push(`Industry aligned: ${profile.industry}`)
    }

    // Check niche specificity
    if (candidate.rawSignals.nicheSpecificity === "niche") {
      strategicRelevance += 0.1
    } else if (candidate.rawSignals.nicheSpecificity === "focused") {
      strategicRelevance += 0.05
    }

    strategicRelevance = Math.min(strategicRelevance, 1)

    // ----------------------------------------------------------------
    // 2. Audience Alignment (0-1)
    // ----------------------------------------------------------------
    let audienceAlignment = 0.4 // Base score

    // Check if source targets similar audience
    if (text.includes(profile.primaryAudience.toLowerCase())) {
      audienceAlignment += 0.2
      rationale.push(`Targets same audience: ${profile.primaryAudience}`)
    }

    // Check audience interest overlap
    const interestMatches = profile.audienceInterests.filter(interest =>
      text.includes(interest.toLowerCase())
    )
    audienceAlignment += Math.min(interestMatches.length * 0.1, 0.2)

    // Check platform alignment
    if (candidate.platform && profile.audiencePlatforms.includes(candidate.platform)) {
      audienceAlignment += 0.15
      rationale.push(`Platform aligned: ${candidate.platform}`)
    }

    audienceAlignment = Math.min(audienceAlignment, 1)

    // ----------------------------------------------------------------
    // 3. Credibility (0-1)
    // ----------------------------------------------------------------
    let credibility = 0.4 // Base score

    // Expertise indicator
    switch (candidate.rawSignals.expertiseIndicator) {
      case "authority":
        credibility += 0.35
        rationale.push("Authority-level expertise")
        break
      case "expert":
        credibility += 0.25
        rationale.push("Expert-level expertise")
        break
      case "practitioner":
        credibility += 0.15
        break
    }

    // Verified account
    if (candidate.rawSignals.verifiedAccount) {
      credibility += 0.1
    }

    // Established presence
    if (candidate.rawSignals.establishedPresence) {
      credibility += 0.1
    }

    // Cross-platform presence
    if (candidate.rawSignals.crossPlatformPresence) {
      credibility += 0.05
    }

    // Subscriber/follower count (moderate signal)
    if (candidate.rawSignals.subscriberCount) {
      if (candidate.rawSignals.subscriberCount > 50000) {
        credibility += 0.1
      } else if (candidate.rawSignals.subscriberCount > 10000) {
        credibility += 0.05
      }
    }

    credibility = Math.min(credibility, 1)

    // ----------------------------------------------------------------
    // 4. Publishing Consistency (0-1)
    // ----------------------------------------------------------------
    let publishingConsistency = 0.5 // Base score

    switch (candidate.rawSignals.publishingFrequency) {
      case "daily":
        publishingConsistency += 0.3
        break
      case "weekly":
        publishingConsistency += 0.25
        break
      case "bi-weekly":
        publishingConsistency += 0.15
        break
    }

    // Content volume
    if (candidate.rawSignals.totalContentCount) {
      if (candidate.rawSignals.totalContentCount > 100) {
        publishingConsistency += 0.15
      } else if (candidate.rawSignals.totalContentCount > 50) {
        publishingConsistency += 0.1
      }
    }

    // Topic consistency
    if (candidate.rawSignals.topicConsistency) {
      publishingConsistency += candidate.rawSignals.topicConsistency * 0.1
    }

    publishingConsistency = Math.min(publishingConsistency, 1)

    // ----------------------------------------------------------------
    // 5. Insight Density (0-1)
    // ----------------------------------------------------------------
    let insightDensity = 0.4 // Base score

    // Content depth
    switch (candidate.rawSignals.contentDepthIndicator) {
      case "deep":
        insightDensity += 0.35
        rationale.push("Deep content analysis")
        break
      case "moderate":
        insightDensity += 0.2
        break
    }

    // Originality
    switch (candidate.rawSignals.originalityIndicator) {
      case "high":
        insightDensity += 0.2
        break
      case "medium":
        insightDensity += 0.1
        break
    }

    insightDensity = Math.min(insightDensity, 1)

    // ----------------------------------------------------------------
    // 6. Recency (0-1)
    // ----------------------------------------------------------------
    let recency = 0.6 // Base for active sources

    if (candidate.rawSignals.lastPublishedDate) {
      const ageMs = Date.now() - candidate.rawSignals.lastPublishedDate.getTime()
      const ageDays = ageMs / (1000 * 60 * 60 * 24)

      if (ageDays <= 7) recency = 1.0
      else if (ageDays <= 30) recency = 0.85
      else if (ageDays <= 90) recency = 0.7
      else if (ageDays <= 180) recency = 0.5
      else recency = 0.3
    }

    // ----------------------------------------------------------------
    // Calculate Overall Score
    // ----------------------------------------------------------------
    // Weighted: Strategic relevance is most important
    const overallScore = 
      strategicRelevance * 0.30 +
      audienceAlignment * 0.20 +
      credibility * 0.20 +
      publishingConsistency * 0.10 +
      insightDensity * 0.15 +
      recency * 0.05

    return {
      strategicRelevance: Math.round(strategicRelevance * 100) / 100,
      audienceAlignment: Math.round(audienceAlignment * 100) / 100,
      credibility: Math.round(credibility * 100) / 100,
      publishingConsistency: Math.round(publishingConsistency * 100) / 100,
      insightDensity: Math.round(insightDensity * 100) / 100,
      recency: Math.round(recency * 100) / 100,
      overallScore: Math.round(overallScore * 100) / 100,
      scoreRationale: rationale,
    }
  }

  // ============================================================================
  // STAGE 5: VERIFICATION
  // ============================================================================

  private async verifySources(
    candidates: ScoredCandidate[],
    profile: StrategicSearchProfile
  ): Promise<Array<ScoredCandidate & { verified: boolean; verificationResult: VerificationResult }>> {
    const verified: Array<ScoredCandidate & { verified: boolean; verificationResult: VerificationResult }> = []

    for (const candidate of candidates) {
      const result = await this.verifySource(candidate, profile)
      
      verified.push({
        ...candidate,
        verified: result.verified,
        verificationResult: result,
      })
    }

    return verified
  }

  private async verifySource(
    candidate: ScoredCandidate,
    profile: StrategicSearchProfile
  ): Promise<VerificationResult> {
    const issues: string[] = []
    const recommendations: string[] = []
    let confidence = 0.7 // Base confidence

    // ----------------------------------------------------------------
    // Publishing History Check
    // ----------------------------------------------------------------
    if (!candidate.rawSignals.totalContentCount || candidate.rawSignals.totalContentCount < 10) {
      issues.push("Limited publishing history")
      confidence -= 0.15
    } else if (candidate.rawSignals.totalContentCount > 50) {
      confidence += 0.1
    }

    // ----------------------------------------------------------------
    // Engagement Check (for video/social sources)
    // ----------------------------------------------------------------
    if (candidate.sourceClass === "watch" || candidate.sourceClass === "follow") {
      if (candidate.rawSignals.averageEngagement !== undefined) {
        if (candidate.rawSignals.averageEngagement < 0.01) {
          issues.push("Low engagement rate")
          confidence -= 0.1
        } else if (candidate.rawSignals.averageEngagement > 0.03) {
          confidence += 0.1
        }
      }

      if (candidate.rawSignals.averageViews !== undefined) {
        if (candidate.rawSignals.averageViews < 100) {
          issues.push("Very low view counts")
          confidence -= 0.15
        }
      }
    }

    // ----------------------------------------------------------------
    // Topic Consistency Check
    // ----------------------------------------------------------------
    if (candidate.rawSignals.topicConsistency !== undefined) {
      if (candidate.rawSignals.topicConsistency < 0.5) {
        issues.push("Inconsistent topic coverage")
        recommendations.push("Monitor for topic drift")
        confidence -= 0.1
      } else if (candidate.rawSignals.topicConsistency > 0.8) {
        confidence += 0.05
      }
    }

    // ----------------------------------------------------------------
    // Author Credibility Check
    // ----------------------------------------------------------------
    if (!candidate.rawSignals.establishedPresence) {
      issues.push("Not an established presence")
      recommendations.push("Verify author credentials manually")
      confidence -= 0.1
    }

    if (!candidate.rawSignals.verifiedAccount && 
        (candidate.sourceClass === "follow" || candidate.sourceType === "youtube_channel")) {
      recommendations.push("Consider verifying account authenticity")
    }

    // ----------------------------------------------------------------
    // Score-based Verification
    // ----------------------------------------------------------------
    if (candidate.scores.strategicRelevance < 0.5) {
      issues.push("Strategic relevance below threshold")
      confidence -= 0.15
    }

    if (candidate.scores.credibility < 0.5) {
      issues.push("Credibility below threshold")
      confidence -= 0.15
    }

    // ----------------------------------------------------------------
    // Final Verification Decision
    // ----------------------------------------------------------------
    confidence = Math.max(0, Math.min(1, confidence))
    const verified = confidence >= 0.5 && issues.length < 3

    if (!verified && issues.length === 0) {
      issues.push("Insufficient verification signals")
    }

    return {
      verified,
      confidence,
      issues,
      recommendations,
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private formatDiscoveryContext(
    candidate: ScoredCandidate,
    profile: StrategicSearchProfile
  ): string {
    const parts = [
      `Discovery method: ${candidate.discoveryMethod}`,
      `Strategic relevance: ${(candidate.scores.strategicRelevance * 100).toFixed(0)}%`,
      `Audience alignment: ${(candidate.scores.audienceAlignment * 100).toFixed(0)}%`,
    ]

    if (candidate.scores.scoreRationale.length > 0) {
      parts.push(`Signals: ${candidate.scores.scoreRationale.slice(0, 3).join("; ")}`)
    }

    return parts.join(". ")
  }

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url)
      let normalized = parsed.hostname.replace(/^www\./, "") + parsed.pathname
      normalized = normalized.replace(/\/$/, "")
      return normalized.toLowerCase()
    } catch {
      return url.toLowerCase()
    }
  }
}

// ============================================================================
// EXPORT INSTANCE
// ============================================================================

export const sourceDiscoveryAgent = new SourceDiscoveryAgent()

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export async function runSourceDiscovery(
  tenantId: string,
  options?: {
    sourceClasses?: SourceClass[]
    platforms?: SourcePlatform[]
    maxResultsPerClass?: number
  }
): Promise<SourceDiscoveryOutput | null> {
  const agent = new SourceDiscoveryAgent()

  const context: PipelineContext = {
    tenantId,
    runId: `discovery-${Date.now()}`,
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
      timeoutMs: 300000,
      enableResearch: true,
      enableClarification: false,
      minConfidenceThreshold: 0.5,
      testMode: false,
    },
    startedAt: new Date(),
    previousResponses: {},
  }

  const input: SourceDiscoveryInput = {
    tenantId,
    sourceClasses: options?.sourceClasses,
    platforms: options?.platforms,
    maxResultsPerClass: options?.maxResultsPerClass || 15,
  }

  const result = await agent.run(context, input)

  if (result.success && result.data) {
    return result.data
  }

  console.error("Source discovery failed:", result.error)
  return null
}

/**
 * Run a quick strategic profile analysis without full discovery.
 */
export async function analyzeStrategicProfile(
  tenantId: string
): Promise<StrategicSearchProfile | null> {
  // This would be implemented to just build the profile
  // without running full discovery - useful for debugging
  // and understanding what KORA sees about a tenant
  return null
}
