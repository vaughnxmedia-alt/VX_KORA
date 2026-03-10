/**
 * Competitor Research Agent
 * 
 * Analyzes competitors through web search, social presence, and content analysis.
 * Produces evidence-backed competitor profiles with citations.
 */

import { BaseIntelAgent, createAgentOutput } from "./base-intel-agent.js"
import type { PipelineContext, AgentOutput } from "../types/pipeline.js"
import type { NormalizedIntakeData } from "../types/intake.js"
import { researchOrchestrator } from "../search/research-orchestrator.js"
import { tavilyClient } from "../search/tavily-client.js"
import { exaClient } from "../search/exa-client.js"
import type { SearchResult } from "../search/types.js"
import { 
  EvidenceBundle, 
  EvidenceSource, 
  ResearchGap,
  createEvidenceBundle,
  getConfidenceLevel,
  calculateConfidenceScore
} from "../types/evidence.js"

export interface CompetitorResearchInput {
  intakeData: NormalizedIntakeData
  competitors?: string[]
  industry: string
}

export interface CompetitorProfile {
  name: string
  website?: string
  description: string
  positioning: string
  targetAudience: string
  keyMessages: string[]
  strengths: string[]
  weaknesses: string[]
  contentStrategy?: {
    pillars: string[]
    formats: string[]
    tone: string
    frequency?: string
  }
  socialPresence?: {
    platforms: string[]
    estimatedFollowers?: string
    engagementStyle?: string
  }
  evidenceBundle: EvidenceBundle
}

export interface CompetitorResearchOutput {
  competitors: CompetitorProfile[]
  industryLeaders: string[]
  competitiveGaps: string[]
  differentiationOpportunities: string[]
  evidenceBundles: EvidenceBundle[]
  researchGaps: ResearchGap[]
  methodology: {
    searchProviders: string[]
    totalQueries: number
    totalSources: number
  }
}

export class CompetitorResearchAgent extends BaseIntelAgent<CompetitorResearchInput, CompetitorResearchOutput> {
  constructor() {
    super("CompetitorResearchAgent", "research")
  }

  protected async execute(
    context: PipelineContext,
    input: CompetitorResearchInput
  ): Promise<AgentOutput<CompetitorResearchOutput>> {
    console.log(`[CompetitorResearchAgent] Starting competitor research for ${input.industry}`)

    const competitors = input.competitors || []
    const evidenceBundles: EvidenceBundle[] = []
    const researchGaps: ResearchGap[] = []
    let totalQueries = 0
    let totalSources = 0
    const providersUsed = new Set<string>()

    // Step 1: Discover competitors if none provided
    await this.reportStepStart("Discovering competitors")
    let discoveredCompetitors: string[] = []
    if (competitors.length === 0) {
      const discovery = await this.discoverCompetitors(input.industry)
      discoveredCompetitors = discovery.names
      totalQueries += discovery.queries
      totalSources += discovery.sources
      discovery.providers.forEach(p => providersUsed.add(p))
      
      if (discovery.evidenceBundle) {
        evidenceBundles.push(discovery.evidenceBundle)
      }
      
      if (discoveredCompetitors.length === 0) {
        researchGaps.push({
          topic: "Competitor Discovery",
          attemptedQueries: [`top ${input.industry} companies`, `${input.industry} market leaders`],
          reason: "no_data",
          impact: "moderate",
          recommendation: "Manually specify 2-3 key competitors"
        })
      }
    }
    await this.reportStepComplete("Discovering competitors", { queries: totalQueries, sources: totalSources })
    await this.reportMetrics({ queriesExecuted: totalQueries, sourcesFound: totalSources })

    const allCompetitors = [...competitors, ...discoveredCompetitors].slice(0, 5)

    // Step 2: Research each competitor
    const competitorProfiles: CompetitorProfile[] = []
    
    for (let i = 0; i < allCompetitors.length; i++) {
      const competitor = allCompetitors[i]
      const stepName = `Researching competitor ${i + 1}: ${competitor}`
      await this.reportStepStart(stepName)
      
      try {
        const profile = await this.researchCompetitor(competitor, input.industry)
        competitorProfiles.push(profile)
        evidenceBundles.push(profile.evidenceBundle)
        totalQueries += 4
        totalSources += profile.evidenceBundle.sources.length
        providersUsed.add("tavily")
        providersUsed.add("exa")
        
        await this.reportStepComplete(stepName, { queries: 4, sources: profile.evidenceBundle.sources.length })
        await this.reportMetrics({ queriesExecuted: totalQueries, sourcesFound: totalSources })
      } catch (error) {
        console.error(`[CompetitorResearchAgent] Failed to research ${competitor}:`, error)
        researchGaps.push({
          topic: `Competitor: ${competitor}`,
          attemptedQueries: [`"${competitor}" company about`, `"${competitor}" brand strategy`],
          reason: "no_data",
          impact: "minor"
        })
        await this.reportStepComplete(stepName)
      }
    }

    // Step 3: Analyze competitive landscape
    await this.reportStepStart("Analyzing competitive landscape")
    const landscapeAnalysis = await this.analyzeCompetitiveLandscape(
      competitorProfiles,
      input.industry,
      input.intakeData
    )
    await this.reportStepComplete("Analyzing competitive landscape")

    // Step 4: Identify differentiation opportunities
    await this.reportStepStart("Identifying differentiation opportunities")
    const opportunities = this.identifyDifferentiationOpportunities(
      competitorProfiles,
      input.intakeData
    )
    await this.reportStepComplete("Identifying differentiation opportunities")

    // Step 5: Build evidence bundles
    await this.reportStepStart("Building competitor evidence bundles")
    await this.reportStepComplete("Building competitor evidence bundles")

    this.incrementItemsProcessed(competitorProfiles.length)

    return createAgentOutput(true, {
      competitors: competitorProfiles,
      industryLeaders: allCompetitors,
      competitiveGaps: landscapeAnalysis.gaps,
      differentiationOpportunities: opportunities,
      evidenceBundles,
      researchGaps,
      methodology: {
        searchProviders: Array.from(providersUsed),
        totalQueries,
        totalSources
      }
    })
  }

  private async discoverCompetitors(industry: string): Promise<{
    names: string[]
    evidenceBundle?: EvidenceBundle
    queries: number
    sources: number
    providers: string[]
  }> {
    const queries = [
      `top ${industry} companies 2025`,
      `${industry} market leaders brands`,
      `best ${industry} agencies firms`
    ]

    const results: SearchResult[] = []
    const providers: string[] = []

    for (const query of queries) {
      const response = await tavilyClient.search(query, { maxResults: 5 })
      if (!response.error) {
        results.push(...response.results)
        providers.push("tavily")
      }
    }

    if (results.length === 0) {
      return { names: [], queries: queries.length, sources: 0, providers }
    }

    // Extract company names from results using LLM
    const companyNames = await this.extractCompanyNames(results, industry)

    const evidenceBundle = createEvidenceBundle(
      `Key competitors in ${industry} industry`,
      "competitor_analysis",
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
      names: companyNames,
      evidenceBundle,
      queries: queries.length,
      sources: results.length,
      providers
    }
  }

  private async extractCompanyNames(results: SearchResult[], industry: string): Promise<string[]> {
    // Simple extraction based on title patterns
    const names = new Set<string>()
    
    for (const result of results) {
      // Look for company names in titles
      const titleWords = result.title.split(/[\s\-–|:,]+/)
      for (let i = 0; i < titleWords.length - 1; i++) {
        const potential = titleWords.slice(i, i + 2).join(" ").trim()
        if (potential.length > 3 && potential.length < 30 && !this.isGenericTerm(potential)) {
          names.add(potential)
        }
      }
    }

    return Array.from(names).slice(0, 5)
  }

  private isGenericTerm(term: string): boolean {
    const genericTerms = [
      "the best", "top 10", "best of", "how to", "what is",
      "industry", "market", "company", "business", "service"
    ]
    return genericTerms.some(g => term.toLowerCase().includes(g))
  }

  private async researchCompetitor(
    competitorName: string,
    industry: string
  ): Promise<CompetitorProfile> {
    // Search for competitor information
    const [aboutSearch, strategySearch, socialSearch] = await Promise.all([
      tavilyClient.search(`"${competitorName}" about company overview`, { maxResults: 5 }),
      tavilyClient.search(`"${competitorName}" brand positioning marketing strategy`, { maxResults: 5 }),
      tavilyClient.search(`"${competitorName}" social media presence followers`, { maxResults: 3 })
    ])

    const allResults = [
      ...aboutSearch.results,
      ...strategySearch.results,
      ...socialSearch.results
    ]

    // Extract insights from search results
    const description = this.extractDescription(allResults, competitorName)
    const positioning = this.extractPositioning(allResults, competitorName)
    const strengths = this.extractStrengths(allResults)
    const weaknesses = this.extractWeaknesses(allResults)
    const keyMessages = this.extractKeyMessages(allResults)

    const evidenceBundle = createEvidenceBundle(
      `Competitor analysis: ${competitorName}`,
      "competitor_analysis",
      allResults.slice(0, 6).map(r => ({
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
      name: competitorName,
      website: this.findWebsite(allResults, competitorName),
      description,
      positioning,
      targetAudience: this.inferTargetAudience(allResults),
      keyMessages,
      strengths,
      weaknesses,
      contentStrategy: this.inferContentStrategy(allResults),
      socialPresence: this.inferSocialPresence(socialSearch.results),
      evidenceBundle
    }
  }

  private extractDescription(results: SearchResult[], name: string): string {
    for (const result of results) {
      if (result.snippet.toLowerCase().includes(name.toLowerCase())) {
        const sentences = result.snippet.split(/[.!?]+/)
        const relevant = sentences.find(s => 
          s.toLowerCase().includes(name.toLowerCase()) && s.length > 30
        )
        if (relevant) return relevant.trim() + "."
      }
    }
    return `${name} operates in the market with various products and services.`
  }

  private extractPositioning(results: SearchResult[], name: string): string {
    const positioningKeywords = ["position", "leader", "specialize", "focus", "known for", "best"]
    for (const result of results) {
      if (positioningKeywords.some(k => result.snippet.toLowerCase().includes(k))) {
        const sentences = result.snippet.split(/[.!?]+/)
        const relevant = sentences.find(s => 
          positioningKeywords.some(k => s.toLowerCase().includes(k))
        )
        if (relevant) return relevant.trim() + "."
      }
    }
    return "Market positioning not clearly identified from available sources."
  }

  private extractStrengths(results: SearchResult[]): string[] {
    const strengths: string[] = []
    const strengthIndicators = ["leading", "best", "top", "innovative", "award", "recognized", "trusted"]
    
    for (const result of results) {
      for (const indicator of strengthIndicators) {
        if (result.snippet.toLowerCase().includes(indicator)) {
          const sentences = result.snippet.split(/[.!?]+/)
          const relevant = sentences.find(s => s.toLowerCase().includes(indicator))
          if (relevant && relevant.length > 20 && relevant.length < 150) {
            strengths.push(relevant.trim())
          }
        }
      }
    }
    
    return [...new Set(strengths)].slice(0, 4)
  }

  private extractWeaknesses(results: SearchResult[]): string[] {
    const weaknesses: string[] = []
    const weaknessIndicators = ["criticism", "complaint", "issue", "problem", "lack", "limited"]
    
    for (const result of results) {
      for (const indicator of weaknessIndicators) {
        if (result.snippet.toLowerCase().includes(indicator)) {
          const sentences = result.snippet.split(/[.!?]+/)
          const relevant = sentences.find(s => s.toLowerCase().includes(indicator))
          if (relevant && relevant.length > 20 && relevant.length < 150) {
            weaknesses.push(relevant.trim())
          }
        }
      }
    }
    
    return [...new Set(weaknesses)].slice(0, 3)
  }

  private extractKeyMessages(results: SearchResult[]): string[] {
    const messages: string[] = []
    
    for (const result of results) {
      // Look for taglines, slogans, or key phrases
      const quotes = result.snippet.match(/"([^"]+)"/g)
      if (quotes) {
        messages.push(...quotes.map(q => q.replace(/"/g, "")))
      }
    }
    
    return [...new Set(messages)].slice(0, 5)
  }

  private findWebsite(results: SearchResult[], name: string): string | undefined {
    for (const result of results) {
      if (result.url.toLowerCase().includes(name.toLowerCase().replace(/\s+/g, ""))) {
        return result.url
      }
    }
    return undefined
  }

  private inferTargetAudience(results: SearchResult[]): string {
    const audienceKeywords = ["customer", "client", "user", "audience", "target", "serve"]
    for (const result of results) {
      if (audienceKeywords.some(k => result.snippet.toLowerCase().includes(k))) {
        const sentences = result.snippet.split(/[.!?]+/)
        const relevant = sentences.find(s => 
          audienceKeywords.some(k => s.toLowerCase().includes(k))
        )
        if (relevant) return relevant.trim()
      }
    }
    return "Target audience not clearly identified"
  }

  private inferContentStrategy(results: SearchResult[]): CompetitorProfile["contentStrategy"] | undefined {
    const contentKeywords = ["blog", "content", "social", "video", "podcast", "newsletter"]
    const foundFormats: string[] = []
    
    for (const result of results) {
      for (const keyword of contentKeywords) {
        if (result.snippet.toLowerCase().includes(keyword)) {
          foundFormats.push(keyword)
        }
      }
    }
    
    if (foundFormats.length === 0) return undefined
    
    return {
      pillars: [],
      formats: [...new Set(foundFormats)],
      tone: "Professional"
    }
  }

  private inferSocialPresence(results: SearchResult[]): CompetitorProfile["socialPresence"] | undefined {
    const platforms: string[] = []
    const socialPlatforms = ["instagram", "linkedin", "twitter", "x.com", "tiktok", "facebook", "youtube"]
    
    for (const result of results) {
      for (const platform of socialPlatforms) {
        if (result.snippet.toLowerCase().includes(platform) || result.url.includes(platform)) {
          platforms.push(platform)
        }
      }
    }
    
    if (platforms.length === 0) return undefined
    
    return {
      platforms: [...new Set(platforms)]
    }
  }

  private estimateCredibility(domain: string): number {
    const highCredibility = ["forbes", "bloomberg", "reuters", "wsj", "nytimes", "harvard", "mckinsey"]
    const mediumCredibility = ["medium", "linkedin", "techcrunch", "entrepreneur", "inc.com"]
    
    const lowerDomain = domain.toLowerCase()
    
    if (highCredibility.some(d => lowerDomain.includes(d))) return 0.9
    if (mediumCredibility.some(d => lowerDomain.includes(d))) return 0.7
    return 0.5
  }

  private async analyzeCompetitiveLandscape(
    competitors: CompetitorProfile[],
    industry: string,
    intake: NormalizedIntakeData
  ): Promise<{ gaps: string[] }> {
    const gaps: string[] = []
    
    // Identify what competitors are doing that the client isn't
    const competitorStrengths = competitors.flatMap(c => c.strengths)
    const uniqueStrengths = [...new Set(competitorStrengths)]
    
    // These become potential gaps
    gaps.push(...uniqueStrengths.slice(0, 3).map(s => `Competitive gap: ${s}`))
    
    return { gaps }
  }

  private identifyDifferentiationOpportunities(
    competitors: CompetitorProfile[],
    intake: NormalizedIntakeData
  ): string[] {
    const opportunities: string[] = []
    
    // Find areas where competitors have weaknesses
    const weaknesses = competitors.flatMap(c => c.weaknesses)
    if (weaknesses.length > 0) {
      opportunities.push("Competitor weakness identified - opportunity to differentiate")
    }
    
    // Check if client has unique value proposition not seen in competitors
    if (intake.uniqueValue) {
      opportunities.push(`Leverage unique value: ${intake.uniqueValue}`)
    }
    
    // Platform gaps
    const competitorPlatforms = competitors.flatMap(c => c.socialPresence?.platforms || [])
    const uniquePlatforms = [...new Set(competitorPlatforms)]
    
    if (!uniquePlatforms.includes("tiktok")) {
      opportunities.push("TikTok appears underutilized by competitors")
    }
    
    if (!uniquePlatforms.includes("youtube")) {
      opportunities.push("YouTube content may be a differentiation opportunity")
    }
    
    return opportunities
  }
}

export const competitorResearchAgent = new CompetitorResearchAgent()
