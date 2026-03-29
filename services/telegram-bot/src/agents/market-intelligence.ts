/**
 * Market Intelligence Agent
 * 
 * Gathers industry trends, market data, and strategic context.
 * Produces evidence-backed market insights with citations.
 */

import { BaseIntelAgent, createAgentOutput } from "./base-intel-agent.js"
import type { PipelineContext, AgentOutput } from "../types/pipeline.js"
import type { NormalizedIntakeData } from "../types/intake.js"
import { tavilyClient } from "../search/tavily-client.js"
import { exaClient } from "../search/exa-client.js"
import type { SearchResult } from "../search/types.js"
import { 
  EvidenceBundle, 
  ResearchGap,
  createEvidenceBundle,
} from "../types/evidence.js"

export interface MarketIntelligenceInput {
  intakeData: NormalizedIntakeData
  industry: string
  subIndustry?: string
  geographicFocus?: string[]
}

export interface MarketTrend {
  trend: string
  description: string
  impact: "high" | "medium" | "low"
  timeframe: string
  evidenceId: string
}

export interface MarketStatistic {
  metric: string
  value: string
  source: string
  year?: string
  evidenceId: string
}

export interface IndustryInsight {
  insight: string
  category: "opportunity" | "threat" | "trend" | "best_practice"
  confidence: "high" | "medium" | "low"
  evidenceId: string
}

export interface ContentTrendInsight {
  platform: string
  trend: string
  engagement: string
  recommendation: string
  evidenceId: string
}

export interface MarketIntelligenceOutput {
  industryOverview: string
  marketSize?: MarketStatistic
  growthRate?: MarketStatistic
  keyTrends: MarketTrend[]
  industryInsights: IndustryInsight[]
  contentTrends: ContentTrendInsight[]
  seasonalPatterns: string[]
  emergingOpportunities: string[]
  potentialThreats: string[]
  recommendations: string[]
  evidenceBundles: EvidenceBundle[]
  researchGaps: ResearchGap[]
  methodology: {
    searchProviders: string[]
    totalQueries: number
    totalSources: number
  }
}

export class MarketIntelligenceAgent extends BaseIntelAgent<MarketIntelligenceInput, MarketIntelligenceOutput> {
  constructor() {
    super("MarketIntelligenceAgent", "research")
  }

  protected async execute(
    context: PipelineContext,
    input: MarketIntelligenceInput
  ): Promise<AgentOutput<MarketIntelligenceOutput>> {
    console.log(`[MarketIntelligenceAgent] Starting market research for ${input.industry}`)

    const evidenceBundles: EvidenceBundle[] = []
    const researchGaps: ResearchGap[] = []
    let totalQueries = 0
    let totalSources = 0
    const providersUsed = new Set<string>(["tavily"])

    // Step 1: Get Industry Overview
    await this.reportStepStart("Researching industry overview")
    const overviewResult = await this.researchIndustryOverview(input.industry)
    evidenceBundles.push(overviewResult.evidenceBundle)
    totalQueries += overviewResult.queries
    totalSources += overviewResult.sources
    await this.reportStepComplete("Researching industry overview", { queries: overviewResult.queries, sources: overviewResult.sources })
    await this.reportMetrics({ queriesExecuted: totalQueries, sourcesFound: totalSources })

    // Step 2: Get Market Statistics
    await this.reportStepStart("Analyzing market trends")
    const statsResult = await this.researchMarketStatistics(input.industry)
    evidenceBundles.push(statsResult.evidenceBundle)
    totalQueries += statsResult.queries
    totalSources += statsResult.sources
    
    if (!statsResult.marketSize && !statsResult.growthRate) {
      researchGaps.push({
        topic: "Market Statistics",
        attemptedQueries: [`${input.industry} market size`, `${input.industry} growth rate`],
        reason: "no_data",
        impact: "moderate",
        recommendation: "Consider industry reports from IBISWorld or Statista"
      })
    }
    await this.reportStepComplete("Analyzing market trends", { queries: statsResult.queries, sources: statsResult.sources })
    await this.reportMetrics({ queriesExecuted: totalQueries, sourcesFound: totalSources })

    // Step 3: Get Key Trends
    await this.reportStepStart("Analyzing content trends")
    const trendsResult = await this.researchKeyTrends(input.industry)
    evidenceBundles.push(trendsResult.evidenceBundle)
    totalQueries += trendsResult.queries
    totalSources += trendsResult.sources
    await this.reportStepComplete("Analyzing content trends", { queries: trendsResult.queries, sources: trendsResult.sources })

    // Step 4: Get Content & Social Media Trends
    await this.reportStepStart("Gathering industry news")
    const contentResult = await this.researchContentTrends(input.industry)
    evidenceBundles.push(contentResult.evidenceBundle)
    totalQueries += contentResult.queries
    totalSources += contentResult.sources
    await this.reportStepComplete("Gathering industry news", { queries: contentResult.queries, sources: contentResult.sources })

    // Step 5: Get Industry News & Developments
    await this.reportStepStart("Analyzing external factors")
    const newsResult = await this.researchIndustryNews(input.industry)
    evidenceBundles.push(newsResult.evidenceBundle)
    totalQueries += newsResult.queries
    totalSources += newsResult.sources
    await this.reportStepComplete("Analyzing external factors", { queries: newsResult.queries, sources: newsResult.sources })
    await this.reportMetrics({ queriesExecuted: totalQueries, sourcesFound: totalSources })

    // Step 6: Identify Opportunities and Threats
    await this.reportStepStart("Identifying opportunities")
    const strategicResult = this.analyzeStrategicImplications(
      trendsResult.trends,
      newsResult.insights,
      input.intakeData
    )
    await this.reportStepComplete("Identifying opportunities")

    // Step 7: Assess threats
    await this.reportStepStart("Assessing threats")
    await this.reportStepComplete("Assessing threats")

    // Step 8: Build evidence bundles and generate recommendations
    await this.reportStepStart("Building market evidence bundles")
    const recommendations = this.generateRecommendations(
      overviewResult.overview,
      trendsResult.trends,
      contentResult.contentTrends,
      strategicResult
    )
    await this.reportStepComplete("Building market evidence bundles")

    this.incrementItemsProcessed()

    return createAgentOutput(true, {
      industryOverview: overviewResult.overview,
      marketSize: statsResult.marketSize,
      growthRate: statsResult.growthRate,
      keyTrends: trendsResult.trends,
      industryInsights: newsResult.insights,
      contentTrends: contentResult.contentTrends,
      seasonalPatterns: this.extractSeasonalPatterns(trendsResult.trends),
      emergingOpportunities: strategicResult.opportunities,
      potentialThreats: strategicResult.threats,
      recommendations,
      evidenceBundles,
      researchGaps,
      methodology: {
        searchProviders: Array.from(providersUsed),
        totalQueries,
        totalSources
      }
    })
  }

  private async researchIndustryOverview(
    industry: string
  ): Promise<{
    overview: string
    evidenceBundle: EvidenceBundle
    queries: number
    sources: number
  }> {
    const queries = [
      `${industry} industry overview 2025`,
      `${industry} market landscape analysis`,
      `${industry} industry report executive summary`
    ]

    const results: SearchResult[] = []

    for (const query of queries) {
      const response = await tavilyClient.search(query, { maxResults: 5 })
      if (!response.error) {
        results.push(...response.results)
      }
    }

    const overview = this.extractIndustryOverview(results, industry)

    const evidenceBundle = createEvidenceBundle(
      `Industry overview: ${industry}`,
      "industry_trend",
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
      overview,
      evidenceBundle,
      queries: queries.length,
      sources: results.length
    }
  }

  private extractIndustryOverview(results: SearchResult[], industry: string): string {
    const overviewParts: string[] = []

    for (const result of results.slice(0, 3)) {
      const sentences = result.snippet.split(/[.!?]+/)
      for (const sentence of sentences) {
        if (sentence.length > 40 && sentence.length < 200 && 
            (sentence.toLowerCase().includes(industry.toLowerCase()) ||
             sentence.toLowerCase().includes("market") ||
             sentence.toLowerCase().includes("industry"))) {
          overviewParts.push(sentence.trim())
        }
      }
    }

    if (overviewParts.length === 0) {
      return `The ${industry} industry is a dynamic sector with evolving trends and opportunities.`
    }

    return overviewParts.slice(0, 3).join(". ") + "."
  }

  private async researchMarketStatistics(
    industry: string
  ): Promise<{
    marketSize?: MarketStatistic
    growthRate?: MarketStatistic
    evidenceBundle: EvidenceBundle
    queries: number
    sources: number
  }> {
    const queries = [
      `${industry} market size 2024 2025 billion`,
      `${industry} industry growth rate CAGR forecast`,
      `${industry} market statistics data`
    ]

    const results: SearchResult[] = []

    for (const query of queries) {
      const response = await tavilyClient.search(query, { maxResults: 5 })
      if (!response.error) {
        results.push(...response.results)
      }
    }

    const { marketSize, growthRate } = this.extractMarketStats(results, industry)

    const evidenceBundle = createEvidenceBundle(
      `Market statistics: ${industry}`,
      "market_data",
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
      marketSize: marketSize ? { ...marketSize, evidenceId: evidenceBundle.id } : undefined,
      growthRate: growthRate ? { ...growthRate, evidenceId: evidenceBundle.id } : undefined,
      evidenceBundle,
      queries: queries.length,
      sources: results.length
    }
  }

  private extractMarketStats(
    results: SearchResult[], 
    industry: string
  ): { 
    marketSize?: Omit<MarketStatistic, "evidenceId">
    growthRate?: Omit<MarketStatistic, "evidenceId">
  } {
    let marketSize: Omit<MarketStatistic, "evidenceId"> | undefined
    let growthRate: Omit<MarketStatistic, "evidenceId"> | undefined

    for (const result of results) {
      const text = result.snippet

      // Extract market size (billions/millions)
      const sizeMatch = text.match(/\$?([\d,.]+)\s*(billion|million|B|M)/i)
      if (sizeMatch && !marketSize) {
        marketSize = {
          metric: "Market Size",
          value: `$${sizeMatch[1]} ${sizeMatch[2]}`,
          source: result.source
        }
      }

      // Extract growth rate (CAGR or percentage)
      const growthMatch = text.match(/([\d.]+)%\s*(?:CAGR|growth|increase|annually)/i)
      if (growthMatch && !growthRate) {
        growthRate = {
          metric: "Growth Rate",
          value: `${growthMatch[1]}% ${text.includes("CAGR") ? "CAGR" : "annually"}`,
          source: result.source
        }
      }

      // Extract year
      const yearMatch = text.match(/202[4-9]|203\d/)
      if (yearMatch) {
        if (marketSize && !marketSize.year) marketSize.year = yearMatch[0]
        if (growthRate && !growthRate.year) growthRate.year = yearMatch[0]
      }

      if (marketSize && growthRate) break
    }

    return { marketSize, growthRate }
  }

  private async researchKeyTrends(
    industry: string
  ): Promise<{
    trends: MarketTrend[]
    evidenceBundle: EvidenceBundle
    queries: number
    sources: number
  }> {
    const queries = [
      `${industry} trends 2025 2026`,
      `${industry} industry emerging trends`,
      `${industry} future predictions forecast`
    ]

    const results: SearchResult[] = []

    for (const query of queries) {
      const response = await tavilyClient.search(query, { maxResults: 5 })
      if (!response.error) {
        results.push(...response.results)
      }
    }

    const trends = this.extractTrends(results, industry)

    const evidenceBundle = createEvidenceBundle(
      `Key trends: ${industry}`,
      "industry_trend",
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
      trends: trends.map(t => ({ ...t, evidenceId: evidenceBundle.id })),
      evidenceBundle,
      queries: queries.length,
      sources: results.length
    }
  }

  private extractTrends(results: SearchResult[], industry: string): Omit<MarketTrend, "evidenceId">[] {
    const trends: Omit<MarketTrend, "evidenceId">[] = []
    const trendKeywords = ["trend", "emerging", "growing", "shift", "rise", "increase", "adoption", "transformation"]

    for (const result of results) {
      const sentences = result.snippet.split(/[.!?]+/)
      
      for (const sentence of sentences) {
        const lowerSentence = sentence.toLowerCase()
        
        if (trendKeywords.some(k => lowerSentence.includes(k)) && 
            sentence.length > 30 && sentence.length < 200) {
          
          const impact = lowerSentence.includes("major") || lowerSentence.includes("significant") ? "high" :
                        lowerSentence.includes("minor") || lowerSentence.includes("slight") ? "low" : "medium"
          
          trends.push({
            trend: this.extractTrendName(sentence),
            description: sentence.trim(),
            impact,
            timeframe: this.extractTimeframe(sentence) || "2025-2027"
          })
        }
      }
    }

    return [...new Map(trends.map(t => [t.trend, t])).values()].slice(0, 6)
  }

  private extractTrendName(sentence: string): string {
    // Extract the main subject of the trend
    const words = sentence.split(/\s+/)
    const keyTerms = words.filter(w => 
      w.length > 4 && 
      !["trend", "growing", "emerging", "increase", "being", "their", "which", "about"].includes(w.toLowerCase())
    ).slice(0, 3)
    
    return keyTerms.join(" ") || "Industry trend"
  }

  private extractTimeframe(sentence: string): string | null {
    const yearMatch = sentence.match(/202[4-9]|203\d/)
    if (yearMatch) return yearMatch[0]
    return null
  }

  private async researchContentTrends(
    industry: string
  ): Promise<{
    contentTrends: ContentTrendInsight[]
    evidenceBundle: EvidenceBundle
    queries: number
    sources: number
  }> {
    const queries = [
      `${industry} content marketing trends 2025`,
      `${industry} social media trends best practices`,
      `${industry} digital marketing trends`
    ]

    const results: SearchResult[] = []

    for (const query of queries) {
      const response = await tavilyClient.search(query, { maxResults: 5 })
      if (!response.error) {
        results.push(...response.results)
      }
    }

    const contentTrends = this.extractContentTrends(results, industry)

    const evidenceBundle = createEvidenceBundle(
      `Content trends: ${industry}`,
      "industry_trend",
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
      contentTrends: contentTrends.map(ct => ({ ...ct, evidenceId: evidenceBundle.id })),
      evidenceBundle,
      queries: queries.length,
      sources: results.length
    }
  }

  private extractContentTrends(results: SearchResult[], industry: string): Omit<ContentTrendInsight, "evidenceId">[] {
    const contentTrends: Omit<ContentTrendInsight, "evidenceId">[] = []
    const platforms = ["instagram", "tiktok", "linkedin", "youtube", "twitter", "facebook"]
    const contentTypes = ["video", "short-form", "live", "stories", "reels", "carousel", "podcast", "newsletter"]

    for (const result of results) {
      const text = result.snippet.toLowerCase()
      
      for (const platform of platforms) {
        if (text.includes(platform)) {
          for (const contentType of contentTypes) {
            if (text.includes(contentType)) {
              contentTrends.push({
                platform: platform.charAt(0).toUpperCase() + platform.slice(1),
                trend: `${contentType} content is performing well`,
                engagement: "High engagement reported",
                recommendation: `Consider ${contentType} content on ${platform}`
              })
            }
          }
        }
      }
    }

    // Deduplicate by platform
    return [...new Map(contentTrends.map(ct => [ct.platform, ct])).values()].slice(0, 5)
  }

  private async researchIndustryNews(
    industry: string
  ): Promise<{
    insights: IndustryInsight[]
    evidenceBundle: EvidenceBundle
    queries: number
    sources: number
  }> {
    const queries = [
      `${industry} industry news latest developments`,
      `${industry} market news announcements 2025`
    ]

    const results: SearchResult[] = []

    for (const query of queries) {
      const response = await tavilyClient.searchNews(query, { maxResults: 5 })
      if (!response.error) {
        results.push(...response.results)
      }
    }

    const insights = this.extractInsights(results)

    const evidenceBundle = createEvidenceBundle(
      `Industry news: ${industry}`,
      "industry_trend",
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
      insights: insights.map(i => ({ ...i, evidenceId: evidenceBundle.id })),
      evidenceBundle,
      queries: queries.length,
      sources: results.length
    }
  }

  private extractInsights(results: SearchResult[]): Omit<IndustryInsight, "evidenceId">[] {
    const insights: Omit<IndustryInsight, "evidenceId">[] = []

    for (const result of results) {
      const sentences = result.snippet.split(/[.!?]+/)
      
      for (const sentence of sentences) {
        if (sentence.length > 40 && sentence.length < 200) {
          const lowerSentence = sentence.toLowerCase()
          
          let category: IndustryInsight["category"] = "trend"
          if (lowerSentence.includes("opportunity") || lowerSentence.includes("growth")) {
            category = "opportunity"
          } else if (lowerSentence.includes("threat") || lowerSentence.includes("risk") || lowerSentence.includes("decline")) {
            category = "threat"
          } else if (lowerSentence.includes("best practice") || lowerSentence.includes("recommend")) {
            category = "best_practice"
          }

          insights.push({
            insight: sentence.trim(),
            category,
            confidence: result.score > 0.7 ? "high" : result.score > 0.4 ? "medium" : "low"
          })
        }
      }
    }

    return [...new Set(insights.map(i => i.insight))].map(insight => 
      insights.find(i => i.insight === insight)!
    ).slice(0, 6)
  }

  private analyzeStrategicImplications(
    trends: MarketTrend[],
    insights: IndustryInsight[],
    intake: NormalizedIntakeData
  ): { opportunities: string[]; threats: string[] } {
    const opportunities: string[] = []
    const threats: string[] = []

    // Extract opportunities from high-impact trends
    for (const trend of trends.filter(t => t.impact === "high")) {
      opportunities.push(`Capitalize on: ${trend.trend}`)
    }

    // Extract from insights
    for (const insight of insights) {
      if (insight.category === "opportunity") {
        opportunities.push(insight.insight)
      } else if (insight.category === "threat") {
        threats.push(insight.insight)
      }
    }

    // Add based on intake data
    if (intake.uniqueValue) {
      opportunities.push(`Leverage unique positioning: ${intake.uniqueValue}`)
    }

    return {
      opportunities: [...new Set(opportunities)].slice(0, 5),
      threats: [...new Set(threats)].slice(0, 4)
    }
  }

  private extractSeasonalPatterns(trends: MarketTrend[]): string[] {
    const patterns: string[] = []
    const seasonalKeywords = ["seasonal", "holiday", "summer", "winter", "spring", "fall", "q1", "q2", "q3", "q4"]

    for (const trend of trends) {
      const lowerDesc = trend.description.toLowerCase()
      if (seasonalKeywords.some(k => lowerDesc.includes(k))) {
        patterns.push(trend.description)
      }
    }

    // Add generic seasonal patterns if none found
    if (patterns.length === 0) {
      patterns.push(
        "Q4 typically sees increased consumer activity",
        "Summer months may have different engagement patterns"
      )
    }

    return patterns.slice(0, 4)
  }

  private generateRecommendations(
    overview: string,
    trends: MarketTrend[],
    contentTrends: ContentTrendInsight[],
    strategic: { opportunities: string[]; threats: string[] }
  ): string[] {
    const recommendations: string[] = []

    // Based on high-impact trends
    for (const trend of trends.filter(t => t.impact === "high").slice(0, 2)) {
      recommendations.push(`Align content strategy with: ${trend.trend}`)
    }

    // Based on content trends
    for (const ct of contentTrends.slice(0, 2)) {
      recommendations.push(ct.recommendation)
    }

    // Based on opportunities
    for (const opp of strategic.opportunities.slice(0, 2)) {
      if (!opp.startsWith("Capitalize") && !opp.startsWith("Leverage")) {
        recommendations.push(`Consider: ${opp}`)
      }
    }

    // Address threats
    for (const threat of strategic.threats.slice(0, 1)) {
      recommendations.push(`Monitor and mitigate: ${threat}`)
    }

    return [...new Set(recommendations)].slice(0, 6)
  }

  private estimateCredibility(domain: string): number {
    const highCredibility = ["forbes", "bloomberg", "reuters", "mckinsey", "deloitte", "statista", "ibisworld"]
    const mediumCredibility = ["techcrunch", "entrepreneur", "inc.com", "fastcompany", "businessinsider"]
    
    const lowerDomain = domain.toLowerCase()
    
    if (highCredibility.some(d => lowerDomain.includes(d))) return 0.9
    if (mediumCredibility.some(d => lowerDomain.includes(d))) return 0.7
    return 0.5
  }
}

export const marketIntelligenceAgent = new MarketIntelligenceAgent()
