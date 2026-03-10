/**
 * Evidence Bundle Types for KORA Research Pipeline
 * 
 * These types ensure all claims in strategy documents are grounded
 * in verifiable sources with proper citations and confidence scoring.
 */

/**
 * A single source that supports a claim
 */
export interface EvidenceSource {
  id: string
  url: string
  title: string
  domain: string
  quote: string
  relevanceScore: number
  credibilityScore: number
  retrievedAt: Date
  retrievalMethod: "web_search" | "social_api" | "market_data" | "internal_rag"
  metadata?: {
    author?: string
    publishedDate?: string
    sourceType?: "article" | "report" | "social" | "news" | "academic"
  }
}

/**
 * A bundle of evidence supporting a single claim
 */
export interface EvidenceBundle {
  id: string
  claim: string
  claimType: ClaimType
  sources: EvidenceSource[]
  aggregateConfidence: ConfidenceLevel
  confidenceScore: number
  conflictingEvidence?: ConflictingEvidence[]
  synthesizedFrom?: string[]
  createdAt: Date
}

/**
 * Types of claims that require evidence
 */
export type ClaimType = 
  | "market_data"
  | "audience_demographics"
  | "audience_psychographics"
  | "competitor_analysis"
  | "industry_trend"
  | "best_practice"
  | "platform_insight"
  | "consumer_behavior"
  | "strategic_recommendation"

/**
 * Confidence levels for claims
 */
export type ConfidenceLevel = 
  | "high"      // 3+ corroborating sources
  | "medium"    // 2 sources
  | "low"       // 1 source
  | "unverified" // No sources, based on general knowledge
  | "conflicted" // Sources disagree

/**
 * When sources provide conflicting information
 */
export interface ConflictingEvidence {
  position: string
  sources: EvidenceSource[]
  resolution?: string
}

/**
 * A gap in research where data couldn't be found
 */
export interface ResearchGap {
  topic: string
  attemptedQueries: string[]
  reason: "no_data" | "conflicting_data" | "outdated_data" | "insufficient_sources"
  impact: "critical" | "moderate" | "minor"
  recommendation?: string
}

/**
 * Output with full evidence grounding
 */
export interface GroundedOutput<T = Record<string, unknown>> {
  content: T
  evidence: EvidenceBundle[]
  gaps: ResearchGap[]
  overallConfidence: ConfidenceLevel
  confidenceScore: number
  methodology: ResearchMethodology
  generatedAt: Date
}

/**
 * How the research was conducted
 */
export interface ResearchMethodology {
  searchProviders: string[]
  totalQueries: number
  totalSources: number
  uniqueSources: number
  searchTimeMs: number
  llmCalls: number
  llmTokens: number
}

/**
 * A section of a deliverable with its evidence
 */
export interface GroundedSection {
  sectionId: string
  sectionName: string
  content: unknown
  evidence: EvidenceBundle[]
  confidence: ConfidenceLevel
  gaps?: ResearchGap[]
}

/**
 * A grounded Brand Blueprint
 */
export interface GroundedBrandBlueprint extends GroundedOutput {
  content: {
    brandEssence: string
    missionStatement: string
    visionStatement: string
    coreValues: Array<{
      value: string
      explanation: string
      evidenceId?: string
    }>
    brandPersonality: string
    uniqueValueProposition: string
    brandVoice: {
      tone: string
      languageStyle: string
      communicationPrinciples: string[]
    }
    visualIdentityGuidelines: {
      colorPsychology: string
      imageryStyle: string
      typographyDirection: string
    }
    competitivePositioning?: {
      competitors: Array<{
        name: string
        positioning: string
        strengths: string[]
        weaknesses: string[]
        evidenceId?: string
      }>
      differentiation: string
    }
  }
  sections: GroundedSection[]
}

/**
 * A grounded Audience Analysis
 */
export interface GroundedAudienceAnalysis extends GroundedOutput {
  content: {
    primaryAudience: {
      demographics: {
        ageRange: string
        gender: string
        location: string[]
        income?: string
        education?: string
        occupation?: string
        evidenceId?: string
      }
      psychographics: {
        values: string[]
        aspirations: string[]
        fears: string[]
        influences: string[]
        evidenceId?: string
      }
      painPoints: Array<{
        point: string
        severity: "high" | "medium" | "low"
        evidenceId?: string
      }>
      contentPreferences: string[]
    }
    secondaryAudiences: Array<{
      segmentName: string
      description: string
      engagementApproach: string
      evidenceId?: string
    }>
    audienceJourney: {
      awarenessStage: string
      considerationStage: string
      decisionStage: string
    }
    platformBehavior: Array<{
      platform: string
      audienceSize?: string
      engagementPattern: string
      contentPreferences: string[]
      bestTimes: string[]
      evidenceId?: string
    }>
  }
  sections: GroundedSection[]
}

/**
 * A grounded Content Strategy
 */
export interface GroundedContentStrategy extends GroundedOutput {
  content: {
    contentPillars: Array<{
      name: string
      description: string
      rationale: string
      contentTypes: string[]
      frequency: string
      evidenceId?: string
    }>
    contentThemes: Array<{
      theme: string
      relevance: string
      evidenceId?: string
    }>
    postingSchedule: {
      optimalTimes: string[]
      frequencyByPlatform: Record<string, string>
      evidenceId?: string
    }
    engagementStrategy: {
      approach: string
      tactics: string[]
      metrics: string[]
    }
    exampleWeek: Array<{
      day: string
      contentType: string
      topic: string
      platform: string
      rationale: string
    }>
    competitorInsights?: {
      topPerformingContent: string[]
      contentGaps: string[]
      evidenceId?: string
    }
  }
  sections: GroundedSection[]
}

/**
 * Research context passed between pipeline stages
 */
export interface ResearchContext {
  tenantId: string
  pipelineRunId: string
  intakeData: Record<string, string>
  
  // Research findings
  industryResearch?: GroundedSection
  competitorResearch?: GroundedSection
  audienceResearch?: GroundedSection
  marketResearch?: GroundedSection
  
  // All evidence collected
  evidenceBundles: EvidenceBundle[]
  researchGaps: ResearchGap[]
  
  // Metadata
  methodology: ResearchMethodology
  startedAt: Date
  completedAt?: Date
}

/**
 * Calculate confidence level from score
 */
export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 0.8) return "high"
  if (score >= 0.6) return "medium"
  if (score >= 0.3) return "low"
  return "unverified"
}

/**
 * Calculate confidence score from sources
 */
export function calculateConfidenceScore(sources: EvidenceSource[]): number {
  if (sources.length === 0) return 0
  
  const sourceCount = Math.min(sources.length, 5)
  const countScore = sourceCount * 0.15
  
  const avgRelevance = sources.reduce((sum, s) => sum + s.relevanceScore, 0) / sources.length
  const avgCredibility = sources.reduce((sum, s) => sum + s.credibilityScore, 0) / sources.length
  
  const qualityScore = (avgRelevance * 0.4 + avgCredibility * 0.6) * 0.75
  
  return Math.min(countScore + qualityScore, 1)
}

/**
 * Create an evidence bundle from search results
 */
export function createEvidenceBundle(
  claim: string,
  claimType: ClaimType,
  sources: Omit<EvidenceSource, "id">[]
): EvidenceBundle {
  const evidenceSources: EvidenceSource[] = sources.map((s, i) => ({
    ...s,
    id: `src_${Date.now()}_${i}`
  }))
  
  const confidenceScore = calculateConfidenceScore(evidenceSources)
  
  return {
    id: `eb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    claim,
    claimType,
    sources: evidenceSources,
    aggregateConfidence: getConfidenceLevel(confidenceScore),
    confidenceScore,
    createdAt: new Date()
  }
}

/**
 * Format evidence for LLM context
 */
export function formatEvidenceForPrompt(bundles: EvidenceBundle[]): string {
  if (bundles.length === 0) return "No external research available."
  
  let formatted = "RESEARCH EVIDENCE:\n\n"
  
  bundles.forEach((bundle, i) => {
    formatted += `[Source ${i + 1}] ${bundle.claim}\n`
    formatted += `Confidence: ${bundle.aggregateConfidence.toUpperCase()}\n`
    formatted += `Sources:\n`
    
    bundle.sources.forEach(source => {
      formatted += `  - ${source.title} (${source.domain})\n`
      formatted += `    "${source.quote}"\n`
    })
    
    if (bundle.conflictingEvidence?.length) {
      formatted += `Conflicts:\n`
      bundle.conflictingEvidence.forEach(conflict => {
        formatted += `  - ${conflict.position}\n`
      })
    }
    
    formatted += "\n"
  })
  
  return formatted
}

/**
 * Format research gaps for transparency
 */
export function formatGapsForOutput(gaps: ResearchGap[]): string[] {
  return gaps.map(gap => {
    const impact = gap.impact === "critical" ? "⚠️" : gap.impact === "moderate" ? "⚡" : "ℹ️"
    return `${impact} ${gap.topic}: ${gap.reason.replace(/_/g, " ")}${gap.recommendation ? ` - ${gap.recommendation}` : ""}`
  })
}
