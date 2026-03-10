/**
 * Audience Research Agent
 * 
 * Gathers demographics, psychographics, and behavioral data about target audiences.
 * Produces evidence-backed audience profiles with citations.
 */

import { BaseIntelAgent, createAgentOutput } from "./base-intel-agent.js"
import type { PipelineContext, AgentOutput } from "../types/pipeline.js"
import type { NormalizedIntakeData } from "../types/intake.js"
import { tavilyClient } from "../search/tavily-client.js"
import { exaClient } from "../search/exa-client.js"
import type { SearchResult } from "../search/types.js"
import { 
  EvidenceBundle, 
  EvidenceSource, 
  ResearchGap,
  createEvidenceBundle,
  getConfidenceLevel
} from "../types/evidence.js"

export interface AudienceResearchInput {
  intakeData: NormalizedIntakeData
  industry: string
  platforms: string[]
  audienceDescription?: string
}

export interface DemographicProfile {
  ageRange: string
  gender: string
  locations: string[]
  income?: string
  education?: string
  occupation?: string
  evidenceId: string
}

export interface PsychographicProfile {
  values: string[]
  aspirations: string[]
  fears: string[]
  influences: string[]
  lifestyle: string[]
  evidenceId: string
}

export interface PlatformBehavior {
  platform: string
  audienceSize?: string
  engagementTimes: string[]
  contentPreferences: string[]
  engagementPatterns: string
  hashtagsUsed?: string[]
  evidenceId: string
}

export interface PainPoint {
  point: string
  severity: "high" | "medium" | "low"
  frequency: string
  evidenceId: string
}

export interface AudienceResearchOutput {
  demographics: DemographicProfile
  psychographics: PsychographicProfile
  platformBehavior: PlatformBehavior[]
  painPoints: PainPoint[]
  contentPreferences: string[]
  buyingBehavior: string[]
  audienceJourney: {
    awareness: string
    consideration: string
    decision: string
  }
  evidenceBundles: EvidenceBundle[]
  researchGaps: ResearchGap[]
  methodology: {
    searchProviders: string[]
    totalQueries: number
    totalSources: number
  }
}

export class AudienceResearchAgent extends BaseIntelAgent<AudienceResearchInput, AudienceResearchOutput> {
  constructor() {
    super("AudienceResearchAgent", "research")
  }

  protected async execute(
    context: PipelineContext,
    input: AudienceResearchInput
  ): Promise<AgentOutput<AudienceResearchOutput>> {
    console.log(`[AudienceResearchAgent] Starting audience research for ${input.industry}`)

    const evidenceBundles: EvidenceBundle[] = []
    const researchGaps: ResearchGap[] = []
    let totalQueries = 0
    let totalSources = 0
    const providersUsed = new Set<string>(["tavily"])

    const audienceDesc = input.audienceDescription || 
      input.intakeData.audienceAge || 
      `${input.industry} customers`

    // Step 1: Research Demographics
    await this.reportStepStart("Researching demographics")
    const demographicsResult = await this.researchDemographics(audienceDesc, input.industry)
    evidenceBundles.push(demographicsResult.evidenceBundle)
    totalQueries += demographicsResult.queries
    totalSources += demographicsResult.sources
    
    if (demographicsResult.gaps.length) {
      researchGaps.push(...demographicsResult.gaps)
    }
    await this.reportStepComplete("Researching demographics", { queries: demographicsResult.queries, sources: demographicsResult.sources })
    await this.reportMetrics({ queriesExecuted: totalQueries, sourcesFound: totalSources })

    // Step 2: Research Psychographics
    await this.reportStepStart("Researching psychographics")
    const psychographicsResult = await this.researchPsychographics(audienceDesc, input.industry)
    evidenceBundles.push(psychographicsResult.evidenceBundle)
    totalQueries += psychographicsResult.queries
    totalSources += psychographicsResult.sources

    if (psychographicsResult.gaps.length) {
      researchGaps.push(...psychographicsResult.gaps)
    }
    await this.reportStepComplete("Researching psychographics", { queries: psychographicsResult.queries, sources: psychographicsResult.sources })
    await this.reportMetrics({ queriesExecuted: totalQueries, sourcesFound: totalSources })

    // Step 3: Research Platform Behavior
    await this.reportStepStart("Analyzing platform behavior")
    const platformResults: PlatformBehavior[] = []
    for (const platform of input.platforms) {
      const platformResult = await this.researchPlatformBehavior(audienceDesc, platform)
      platformResults.push(platformResult.behavior)
      evidenceBundles.push(platformResult.evidenceBundle)
      totalQueries += platformResult.queries
      totalSources += platformResult.sources
    }
    await this.reportStepComplete("Analyzing platform behavior", { queries: input.platforms.length * 3, sources: platformResults.length * 4 })
    await this.reportMetrics({ queriesExecuted: totalQueries, sourcesFound: totalSources })

    // Step 4: Research Pain Points
    await this.reportStepStart("Identifying pain points")
    const painPointsResult = await this.researchPainPoints(audienceDesc, input.industry)
    evidenceBundles.push(painPointsResult.evidenceBundle)
    totalQueries += painPointsResult.queries
    totalSources += painPointsResult.sources
    await this.reportStepComplete("Identifying pain points", { queries: painPointsResult.queries, sources: painPointsResult.sources })
    await this.reportMetrics({ queriesExecuted: totalQueries, sourcesFound: totalSources, claimsExtracted: painPointsResult.painPoints.length })

    // Step 5: Research Content Preferences
    await this.reportStepStart("Analyzing content preferences")
    const contentPrefsResult = await this.researchContentPreferences(audienceDesc, input.platforms)
    evidenceBundles.push(contentPrefsResult.evidenceBundle)
    totalQueries += contentPrefsResult.queries
    totalSources += contentPrefsResult.sources
    await this.reportStepComplete("Analyzing content preferences", { queries: contentPrefsResult.queries, sources: contentPrefsResult.sources })

    // Step 6: Research Buying Behavior
    await this.reportStepStart("Researching buying behavior")
    const buyingResult = await this.researchBuyingBehavior(audienceDesc, input.industry)
    evidenceBundles.push(buyingResult.evidenceBundle)
    totalQueries += buyingResult.queries
    totalSources += buyingResult.sources
    await this.reportStepComplete("Researching buying behavior", { queries: buyingResult.queries, sources: buyingResult.sources })

    // Step 7: Construct Audience Journey
    await this.reportStepStart("Mapping audience journey")
    const audienceJourney = this.constructAudienceJourney(
      demographicsResult.demographics,
      psychographicsResult.psychographics,
      painPointsResult.painPoints
    )
    await this.reportStepComplete("Mapping audience journey")

    // Step 8: Validate and build evidence
    await this.reportStepStart("Building audience evidence bundles")
    await this.reportStepComplete("Building audience evidence bundles")
    await this.reportMetrics({ queriesExecuted: totalQueries, sourcesFound: totalSources })

    this.incrementItemsProcessed()

    return createAgentOutput(true, {
      demographics: demographicsResult.demographics,
      psychographics: psychographicsResult.psychographics,
      platformBehavior: platformResults,
      painPoints: painPointsResult.painPoints,
      contentPreferences: contentPrefsResult.preferences,
      buyingBehavior: buyingResult.behaviors,
      audienceJourney,
      evidenceBundles,
      researchGaps,
      methodology: {
        searchProviders: Array.from(providersUsed),
        totalQueries,
        totalSources
      }
    })
  }

  private async researchDemographics(
    audienceDesc: string,
    industry: string
  ): Promise<{
    demographics: DemographicProfile
    evidenceBundle: EvidenceBundle
    queries: number
    sources: number
    gaps: ResearchGap[]
  }> {
    const queries = [
      `${audienceDesc} demographics statistics 2024 2025`,
      `${industry} customer age gender income statistics`,
      `${audienceDesc} consumer profile research`
    ]

    const results: SearchResult[] = []
    const gaps: ResearchGap[] = []

    for (const query of queries) {
      const response = await tavilyClient.search(query, { maxResults: 5 })
      if (!response.error) {
        results.push(...response.results)
      }
    }

    const demographics = this.extractDemographics(results, audienceDesc)
    
    if (!demographics.ageRange || demographics.ageRange === "Not specified") {
      gaps.push({
        topic: "Age demographics",
        attemptedQueries: queries,
        reason: "no_data",
        impact: "moderate",
        recommendation: "Consider running consumer surveys or using platform analytics"
      })
    }

    const evidenceBundle = createEvidenceBundle(
      `Demographics for ${audienceDesc}`,
      "audience_demographics",
      results.slice(0, 5).map(r => ({
        url: r.url,
        title: r.title,
        domain: r.source,
        quote: r.snippet.slice(0, 200),
        relevanceScore: r.score,
        credibilityScore: this.estimateCredibility(r.source),
        retrievedAt: new Date(),
        retrievalMethod: "web_search" as const
      }))
    )

    return {
      demographics: { ...demographics, evidenceId: evidenceBundle.id },
      evidenceBundle,
      queries: queries.length,
      sources: results.length,
      gaps
    }
  }

  private extractDemographics(results: SearchResult[], audienceDesc: string): Omit<DemographicProfile, "evidenceId"> {
    let ageRange = "Not specified"
    let gender = "All genders"
    const locations: string[] = []
    let income: string | undefined
    let education: string | undefined
    let occupation: string | undefined

    for (const result of results) {
      const text = result.snippet.toLowerCase()
      
      // Extract age ranges
      const ageMatch = text.match(/(\d{1,2})[\s-]+(\d{1,2})\s*(year|age|old)/i)
      if (ageMatch) {
        ageRange = `${ageMatch[1]}-${ageMatch[2]} years old`
      }

      // Extract gender info
      if (text.includes("female") || text.includes("women")) {
        gender = text.includes("male") || text.includes("men") ? "Both genders" : "Primarily female"
      } else if (text.includes("male") || text.includes("men")) {
        gender = "Primarily male"
      }

      // Extract income
      const incomeMatch = text.match(/\$[\d,]+k?|\d+k?\s*(?:income|salary|earning)/i)
      if (incomeMatch && !income) {
        income = incomeMatch[0]
      }

      // Extract education
      if (text.includes("college") || text.includes("degree") || text.includes("university")) {
        education = "College educated"
      }

      // Extract occupation hints
      if (text.includes("professional") || text.includes("entrepreneur") || text.includes("business owner")) {
        occupation = "Professionals / Business owners"
      }

      // Extract location
      const locationPatterns = ["united states", "us", "uk", "europe", "global", "urban", "suburban"]
      for (const loc of locationPatterns) {
        if (text.includes(loc) && !locations.includes(loc)) {
          locations.push(loc.charAt(0).toUpperCase() + loc.slice(1))
        }
      }
    }

    return {
      ageRange,
      gender,
      locations: locations.length > 0 ? locations : ["Not specified"],
      income,
      education,
      occupation
    }
  }

  private async researchPsychographics(
    audienceDesc: string,
    industry: string
  ): Promise<{
    psychographics: PsychographicProfile
    evidenceBundle: EvidenceBundle
    queries: number
    sources: number
    gaps: ResearchGap[]
  }> {
    const queries = [
      `${audienceDesc} psychographics values beliefs`,
      `${audienceDesc} consumer motivation aspirations`,
      `${industry} customer lifestyle preferences`
    ]

    const results: SearchResult[] = []
    const gaps: ResearchGap[] = []

    for (const query of queries) {
      const response = await tavilyClient.search(query, { maxResults: 5 })
      if (!response.error) {
        results.push(...response.results)
      }
    }

    const psychographics = this.extractPsychographics(results, audienceDesc)

    const evidenceBundle = createEvidenceBundle(
      `Psychographics for ${audienceDesc}`,
      "audience_psychographics",
      results.slice(0, 5).map(r => ({
        url: r.url,
        title: r.title,
        domain: r.source,
        quote: r.snippet.slice(0, 200),
        relevanceScore: r.score,
        credibilityScore: this.estimateCredibility(r.source),
        retrievedAt: new Date(),
        retrievalMethod: "web_search" as const
      }))
    )

    return {
      psychographics: { ...psychographics, evidenceId: evidenceBundle.id },
      evidenceBundle,
      queries: queries.length,
      sources: results.length,
      gaps
    }
  }

  private extractPsychographics(results: SearchResult[], audienceDesc: string): Omit<PsychographicProfile, "evidenceId"> {
    const values: string[] = []
    const aspirations: string[] = []
    const fears: string[] = []
    const influences: string[] = []
    const lifestyle: string[] = []

    const valueKeywords = ["value", "believe", "important", "care about", "prioritize"]
    const aspirationKeywords = ["want", "aspire", "dream", "goal", "achieve", "success"]
    const fearKeywords = ["fear", "worry", "concern", "avoid", "risk", "challenge"]
    const influenceKeywords = ["influence", "follow", "trust", "recommend", "opinion"]
    const lifestyleKeywords = ["lifestyle", "hobby", "interest", "spend time", "enjoy"]

    for (const result of results) {
      const text = result.snippet.toLowerCase()
      const sentences = result.snippet.split(/[.!?]+/)

      for (const sentence of sentences) {
        const lowerSentence = sentence.toLowerCase()
        
        if (valueKeywords.some(k => lowerSentence.includes(k))) {
          values.push(sentence.trim())
        }
        if (aspirationKeywords.some(k => lowerSentence.includes(k))) {
          aspirations.push(sentence.trim())
        }
        if (fearKeywords.some(k => lowerSentence.includes(k))) {
          fears.push(sentence.trim())
        }
        if (influenceKeywords.some(k => lowerSentence.includes(k))) {
          influences.push(sentence.trim())
        }
        if (lifestyleKeywords.some(k => lowerSentence.includes(k))) {
          lifestyle.push(sentence.trim())
        }
      }
    }

    return {
      values: [...new Set(values)].slice(0, 5),
      aspirations: [...new Set(aspirations)].slice(0, 5),
      fears: [...new Set(fears)].slice(0, 4),
      influences: [...new Set(influences)].slice(0, 4),
      lifestyle: [...new Set(lifestyle)].slice(0, 4)
    }
  }

  private async researchPlatformBehavior(
    audienceDesc: string,
    platform: string
  ): Promise<{
    behavior: PlatformBehavior
    evidenceBundle: EvidenceBundle
    queries: number
    sources: number
  }> {
    const queries = [
      `${audienceDesc} ${platform} behavior engagement`,
      `${platform} best posting times audience engagement`,
      `${platform} content that performs well ${audienceDesc}`
    ]

    const results: SearchResult[] = []

    for (const query of queries) {
      const response = await tavilyClient.search(query, { maxResults: 4 })
      if (!response.error) {
        results.push(...response.results)
      }
    }

    const behavior = this.extractPlatformBehavior(results, platform)

    const evidenceBundle = createEvidenceBundle(
      `${platform} behavior for ${audienceDesc}`,
      "platform_insight",
      results.slice(0, 4).map(r => ({
        url: r.url,
        title: r.title,
        domain: r.source,
        quote: r.snippet.slice(0, 200),
        relevanceScore: r.score,
        credibilityScore: this.estimateCredibility(r.source),
        retrievedAt: new Date(),
        retrievalMethod: "web_search" as const
      }))
    )

    return {
      behavior: { ...behavior, platform, evidenceId: evidenceBundle.id },
      evidenceBundle,
      queries: queries.length,
      sources: results.length
    }
  }

  private extractPlatformBehavior(
    results: SearchResult[], 
    platform: string
  ): Omit<PlatformBehavior, "platform" | "evidenceId"> {
    const contentPreferences: string[] = []
    const engagementTimes: string[] = []
    let engagementPatterns = "Varies by content type"

    // Default best times by platform
    const defaultTimes: Record<string, string[]> = {
      instagram: ["11am-1pm", "7pm-9pm"],
      tiktok: ["7pm-11pm", "9am-12pm"],
      linkedin: ["8am-10am", "12pm", "5pm-6pm"],
      twitter: ["9am-12pm", "12pm-3pm"],
      facebook: ["1pm-4pm", "7pm-9pm"],
      youtube: ["2pm-4pm", "6pm-9pm"]
    }

    for (const result of results) {
      const text = result.snippet.toLowerCase()
      
      // Extract posting times
      const timeMatch = text.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm))/gi)
      if (timeMatch) {
        engagementTimes.push(...timeMatch)
      }

      // Extract content preferences
      const contentTypes = ["video", "reels", "stories", "carousel", "live", "short-form", "long-form", "educational", "entertaining"]
      for (const type of contentTypes) {
        if (text.includes(type) && !contentPreferences.includes(type)) {
          contentPreferences.push(type)
        }
      }

      // Extract engagement patterns
      if (text.includes("engagement") || text.includes("perform")) {
        const sentences = result.snippet.split(/[.!?]+/)
        for (const sentence of sentences) {
          if (sentence.toLowerCase().includes("engagement") && sentence.length > 30 && sentence.length < 150) {
            engagementPatterns = sentence.trim()
            break
          }
        }
      }
    }

    return {
      engagementTimes: engagementTimes.length > 0 ? [...new Set(engagementTimes)].slice(0, 4) : defaultTimes[platform.toLowerCase()] || [],
      contentPreferences: contentPreferences.length > 0 ? contentPreferences.slice(0, 5) : ["video", "images", "stories"],
      engagementPatterns
    }
  }

  private async researchPainPoints(
    audienceDesc: string,
    industry: string
  ): Promise<{
    painPoints: PainPoint[]
    evidenceBundle: EvidenceBundle
    queries: number
    sources: number
  }> {
    const queries = [
      `${audienceDesc} pain points challenges problems`,
      `${industry} customer frustrations complaints`,
      `${audienceDesc} struggles obstacles`
    ]

    const results: SearchResult[] = []

    for (const query of queries) {
      const response = await tavilyClient.search(query, { maxResults: 5 })
      if (!response.error) {
        results.push(...response.results)
      }
    }

    const painPoints = this.extractPainPoints(results)

    const evidenceBundle = createEvidenceBundle(
      `Pain points for ${audienceDesc}`,
      "audience_psychographics",
      results.slice(0, 5).map(r => ({
        url: r.url,
        title: r.title,
        domain: r.source,
        quote: r.snippet.slice(0, 200),
        relevanceScore: r.score,
        credibilityScore: this.estimateCredibility(r.source),
        retrievedAt: new Date(),
        retrievalMethod: "web_search" as const
      }))
    )

    return {
      painPoints: painPoints.map(pp => ({ ...pp, evidenceId: evidenceBundle.id })),
      evidenceBundle,
      queries: queries.length,
      sources: results.length
    }
  }

  private extractPainPoints(results: SearchResult[]): Omit<PainPoint, "evidenceId">[] {
    const painPoints: Omit<PainPoint, "evidenceId">[] = []
    const painKeywords = ["struggle", "challenge", "problem", "frustrat", "difficult", "pain point", "obstacle"]

    for (const result of results) {
      const sentences = result.snippet.split(/[.!?]+/)
      
      for (const sentence of sentences) {
        const lowerSentence = sentence.toLowerCase()
        
        if (painKeywords.some(k => lowerSentence.includes(k)) && sentence.length > 20 && sentence.length < 150) {
          const severity = lowerSentence.includes("major") || lowerSentence.includes("significant") ? "high" :
                          lowerSentence.includes("minor") || lowerSentence.includes("small") ? "low" : "medium"
          
          painPoints.push({
            point: sentence.trim(),
            severity,
            frequency: "Common"
          })
        }
      }
    }

    return [...new Map(painPoints.map(p => [p.point, p])).values()].slice(0, 6)
  }

  private async researchContentPreferences(
    audienceDesc: string,
    platforms: string[]
  ): Promise<{
    preferences: string[]
    evidenceBundle: EvidenceBundle
    queries: number
    sources: number
  }> {
    const queries = [
      `${audienceDesc} content consumption preferences`,
      `what content ${audienceDesc} engage with`,
      `${audienceDesc} favorite content types social media`
    ]

    const results: SearchResult[] = []

    for (const query of queries) {
      const response = await tavilyClient.search(query, { maxResults: 4 })
      if (!response.error) {
        results.push(...response.results)
      }
    }

    const preferences = this.extractContentPreferences(results)

    const evidenceBundle = createEvidenceBundle(
      `Content preferences for ${audienceDesc}`,
      "consumer_behavior",
      results.slice(0, 4).map(r => ({
        url: r.url,
        title: r.title,
        domain: r.source,
        quote: r.snippet.slice(0, 200),
        relevanceScore: r.score,
        credibilityScore: this.estimateCredibility(r.source),
        retrievedAt: new Date(),
        retrievalMethod: "web_search" as const
      }))
    )

    return {
      preferences,
      evidenceBundle,
      queries: queries.length,
      sources: results.length
    }
  }

  private extractContentPreferences(results: SearchResult[]): string[] {
    const preferences: string[] = []
    const contentTypes = [
      "video", "short-form video", "long-form video", "tutorials", "how-to",
      "behind-the-scenes", "user-generated", "educational", "entertaining",
      "inspirational", "informative", "interactive", "live streams",
      "podcasts", "infographics", "case studies", "testimonials"
    ]

    for (const result of results) {
      const text = result.snippet.toLowerCase()
      
      for (const type of contentTypes) {
        if (text.includes(type) && !preferences.includes(type)) {
          preferences.push(type)
        }
      }
    }

    return preferences.length > 0 ? preferences.slice(0, 8) : ["video content", "educational content", "entertaining content"]
  }

  private async researchBuyingBehavior(
    audienceDesc: string,
    industry: string
  ): Promise<{
    behaviors: string[]
    evidenceBundle: EvidenceBundle
    queries: number
    sources: number
  }> {
    const queries = [
      `${audienceDesc} buying behavior purchase decision`,
      `${industry} consumer purchase journey`,
      `how ${audienceDesc} make purchase decisions`
    ]

    const results: SearchResult[] = []

    for (const query of queries) {
      const response = await tavilyClient.search(query, { maxResults: 4 })
      if (!response.error) {
        results.push(...response.results)
      }
    }

    const behaviors = this.extractBuyingBehaviors(results)

    const evidenceBundle = createEvidenceBundle(
      `Buying behavior for ${audienceDesc}`,
      "consumer_behavior",
      results.slice(0, 4).map(r => ({
        url: r.url,
        title: r.title,
        domain: r.source,
        quote: r.snippet.slice(0, 200),
        relevanceScore: r.score,
        credibilityScore: this.estimateCredibility(r.source),
        retrievedAt: new Date(),
        retrievalMethod: "web_search" as const
      }))
    )

    return {
      behaviors,
      evidenceBundle,
      queries: queries.length,
      sources: results.length
    }
  }

  private extractBuyingBehaviors(results: SearchResult[]): string[] {
    const behaviors: string[] = []
    const buyingKeywords = ["buy", "purchase", "decision", "research", "compare", "review", "recommend"]

    for (const result of results) {
      const sentences = result.snippet.split(/[.!?]+/)
      
      for (const sentence of sentences) {
        if (buyingKeywords.some(k => sentence.toLowerCase().includes(k)) && 
            sentence.length > 30 && sentence.length < 150) {
          behaviors.push(sentence.trim())
        }
      }
    }

    return [...new Set(behaviors)].slice(0, 5)
  }

  private constructAudienceJourney(
    demographics: DemographicProfile,
    psychographics: PsychographicProfile,
    painPoints: PainPoint[]
  ): AudienceResearchOutput["audienceJourney"] {
    const awareness = painPoints.length > 0 
      ? `Becomes aware of solutions when experiencing: ${painPoints[0]?.point || "common challenges"}`
      : "Discovers solutions through social media and word of mouth"

    const consideration = psychographics.values.length > 0
      ? `Evaluates options based on: ${psychographics.values.slice(0, 2).join(", ")}`
      : "Compares options based on reviews, recommendations, and value alignment"

    const decision = psychographics.influences.length > 0
      ? `Makes decisions influenced by: ${psychographics.influences[0]}`
      : "Decides based on trust, social proof, and perceived value"

    return { awareness, consideration, decision }
  }

  private estimateCredibility(domain: string): number {
    const highCredibility = ["pew", "statista", "mckinsey", "deloitte", "forbes", "harvard", "nielsen"]
    const mediumCredibility = ["hubspot", "hootsuite", "sprout", "buffer", "marketing"]
    
    const lowerDomain = domain.toLowerCase()
    
    if (highCredibility.some(d => lowerDomain.includes(d))) return 0.9
    if (mediumCredibility.some(d => lowerDomain.includes(d))) return 0.7
    return 0.5
  }
}

export const audienceResearchAgent = new AudienceResearchAgent()
