/**
 * Research Orchestrator
 * 
 * Coordinates multiple search providers and aggregates results
 * for comprehensive research queries.
 */

import { TavilyClient } from "./tavily-client.js"
import { ExaClient } from "./exa-client.js"
import { 
  SearchResult, 
  SearchOptions, 
  SearchResponse, 
  SearchCategory,
  ResearchQuery,
  ResearchPlan,
  SearchAggregation
} from "./types.js"

interface ResearchContext {
  tenantId: string
  businessName: string
  industry: string
  competitors?: string[]
  targetAudience?: string
  platforms?: string[]
  existingWebsite?: string
  socialHandles?: Record<string, string>
}

interface ResearchFindings {
  industry: SearchAggregation | null
  competitors: SearchAggregation | null
  audience: SearchAggregation | null
  market: SearchAggregation | null
  news: SearchAggregation | null
  allResults: SearchResult[]
  totalSearchTime: number
  queryCount: number
  errors: string[]
}

export class ResearchOrchestrator {
  private tavily: TavilyClient
  private exa: ExaClient
  private concurrencyLimit = 3

  constructor() {
    this.tavily = new TavilyClient()
    this.exa = new ExaClient()
  }

  async executeResearchPlan(context: ResearchContext): Promise<ResearchFindings> {
    const startTime = Date.now()
    const errors: string[] = []
    
    const findings: ResearchFindings = {
      industry: null,
      competitors: null,
      audience: null,
      market: null,
      news: null,
      allResults: [],
      totalSearchTime: 0,
      queryCount: 0,
      errors
    }

    // Execute research in parallel batches
    const researchTasks = [
      this.researchIndustry(context, errors),
      this.researchCompetitors(context, errors),
      this.researchAudience(context, errors),
      this.researchMarket(context, errors),
      this.researchNews(context, errors)
    ]

    const results = await Promise.allSettled(researchTasks)

    // Process results
    if (results[0].status === "fulfilled") findings.industry = results[0].value
    if (results[1].status === "fulfilled") findings.competitors = results[1].value
    if (results[2].status === "fulfilled") findings.audience = results[2].value
    if (results[3].status === "fulfilled") findings.market = results[3].value
    if (results[4].status === "fulfilled") findings.news = results[4].value

    // Aggregate all results
    const allAggregations = [
      findings.industry,
      findings.competitors,
      findings.audience,
      findings.market,
      findings.news
    ].filter(Boolean) as SearchAggregation[]

    findings.allResults = this.deduplicateResults(
      allAggregations.flatMap(a => a.results)
    )
    findings.queryCount = allAggregations.reduce((sum, a) => sum + a.queries.length, 0)
    findings.totalSearchTime = Date.now() - startTime

    return findings
  }

  private async researchIndustry(
    context: ResearchContext, 
    errors: string[]
  ): Promise<SearchAggregation> {
    const queries = [
      `${context.industry} industry trends 2025 2026`,
      `${context.industry} market size growth forecast`,
      `${context.industry} best practices strategies`,
      `${context.industry} challenges opportunities`
    ]

    return this.executeQueries(queries, "industry", errors)
  }

  private async researchCompetitors(
    context: ResearchContext,
    errors: string[]
  ): Promise<SearchAggregation> {
    if (!context.competitors?.length) {
      // Try to find competitors
      const discoveryQueries = [
        `top ${context.industry} companies brands`,
        `${context.industry} market leaders competitors`,
        `best ${context.industry} agencies firms`
      ]
      return this.executeQueries(discoveryQueries, "competitor", errors)
    }

    const queries = context.competitors.flatMap(competitor => [
      `"${competitor}" about company overview`,
      `"${competitor}" brand positioning strategy`,
      `"${competitor}" services products offerings`
    ])

    return this.executeQueries(queries, "competitor", errors)
  }

  private async researchAudience(
    context: ResearchContext,
    errors: string[]
  ): Promise<SearchAggregation> {
    const audienceDesc = context.targetAudience || `${context.industry} customers`
    const platforms = context.platforms || ["instagram", "linkedin", "tiktok"]

    const queries = [
      `${audienceDesc} demographics statistics 2025`,
      `${audienceDesc} psychographics consumer behavior`,
      `${audienceDesc} pain points challenges needs`,
      `${audienceDesc} content preferences habits`,
      ...platforms.map(p => `${audienceDesc} ${p} behavior engagement`)
    ]

    return this.executeQueries(queries, "audience", errors)
  }

  private async researchMarket(
    context: ResearchContext,
    errors: string[]
  ): Promise<SearchAggregation> {
    const queries = [
      `${context.industry} market report 2025 2026`,
      `${context.industry} industry statistics data`,
      `${context.industry} consumer spending trends`,
      `${context.industry} digital transformation trends`
    ]

    return this.executeQueries(queries, "market", errors)
  }

  private async researchNews(
    context: ResearchContext,
    errors: string[]
  ): Promise<SearchAggregation> {
    const queries = [
      `${context.industry} news latest developments`,
      `${context.businessName} news announcements`,
      `${context.industry} innovations trends 2025`
    ]

    return this.executeQueries(queries, "news", errors, { topic: "news" })
  }

  private async executeQueries(
    queries: string[],
    category: SearchCategory,
    errors: string[],
    options?: SearchOptions
  ): Promise<SearchAggregation> {
    const results: SearchResult[] = []
    const providers: Set<string> = new Set()
    let totalSearchTime = 0

    // Execute queries with concurrency limit
    for (let i = 0; i < queries.length; i += this.concurrencyLimit) {
      const batch = queries.slice(i, i + this.concurrencyLimit)
      
      const batchResults = await Promise.all(
        batch.map(async query => {
          // Use Tavily as primary, Exa as fallback
          let response = await this.tavily.search(query, { 
            ...options, 
            maxResults: 5 
          })
          
          providers.add("tavily")
          
          // If Tavily fails or returns few results, try Exa
          if (response.error || response.results.length < 2) {
            const exaResponse = await this.exa.search(query, { 
              ...options, 
              maxResults: 5 
            })
            
            if (!exaResponse.error) {
              providers.add("exa")
              response = {
                ...response,
                results: [...response.results, ...exaResponse.results],
                totalResults: response.totalResults + exaResponse.totalResults
              }
            }
          }
          
          if (response.error) {
            errors.push(`${category}: ${response.error}`)
          }
          
          totalSearchTime += response.searchTime
          return response.results
        })
      )
      
      results.push(...batchResults.flat())
    }

    const uniqueResults = this.deduplicateResults(results)
    
    return {
      queries,
      results: uniqueResults,
      totalSearchTime,
      providers: Array.from(providers),
      deduplicatedCount: results.length - uniqueResults.length
    }
  }

  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>()
    return results.filter(r => {
      const key = r.url.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }).sort((a, b) => b.score - a.score)
  }

  async searchWithFallback(
    query: string, 
    options?: SearchOptions
  ): Promise<SearchResponse> {
    // Try Tavily first
    const tavilyResult = await this.tavily.search(query, options)
    
    if (!tavilyResult.error && tavilyResult.results.length >= 3) {
      return tavilyResult
    }
    
    // Fallback to Exa
    const exaResult = await this.exa.search(query, options)
    
    if (!exaResult.error) {
      // Merge results if Tavily had some
      if (tavilyResult.results.length > 0) {
        return {
          ...exaResult,
          results: this.deduplicateResults([
            ...tavilyResult.results,
            ...exaResult.results
          ])
        }
      }
      return exaResult
    }
    
    // Return Tavily result even if partial
    return tavilyResult
  }

  getStats() {
    return {
      tavily: this.tavily.getStats(),
      exa: this.exa.getStats()
    }
  }

  clearAllCaches(): void {
    this.tavily.clearCache()
    this.exa.clearCache()
  }
}

export const researchOrchestrator = new ResearchOrchestrator()
