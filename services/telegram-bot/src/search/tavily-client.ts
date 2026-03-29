/**
 * Tavily Search API Client
 * 
 * Primary web search provider for KORA's research pipeline.
 * Optimized for AI agents with fast response times and relevant results.
 */

import { SearchResult, SearchOptions, SearchResponse, WebSearchClient } from "./types.js"

const TAVILY_API_URL = "https://api.tavily.com"
const DEFAULT_MAX_RESULTS = 10
const DEFAULT_SEARCH_DEPTH = "advanced"
const CACHE_TTL_MS = 1000 * 60 * 30 // 30 minutes

interface TavilySearchParams {
  api_key: string
  query: string
  search_depth?: "basic" | "advanced"
  topic?: "general" | "news"
  max_results?: number
  include_images?: boolean
  include_answer?: boolean
  include_raw_content?: boolean
  include_domains?: string[]
  exclude_domains?: string[]
}

interface TavilyResult {
  title: string
  url: string
  content: string
  raw_content?: string
  score: number
  published_date?: string
}

interface TavilyResponse {
  query: string
  answer?: string
  results: TavilyResult[]
  images?: string[]
  response_time: number
}

interface CacheEntry {
  response: SearchResponse
  timestamp: number
}

export class TavilyClient implements WebSearchClient {
  private apiKey: string
  private cache: Map<string, CacheEntry> = new Map()
  private requestCount = 0
  private errorCount = 0

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.TAVILY_API_KEY || ""
    if (!this.apiKey) {
      console.warn("TAVILY_API_KEY not set - searches will fail")
    }
  }

  private getCacheKey(query: string, options?: SearchOptions): string {
    return JSON.stringify({ query, options })
  }

  private getFromCache(key: string): SearchResponse | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      this.cache.delete(key)
      return null
    }
    
    return entry.response
  }

  private setCache(key: string, response: SearchResponse): void {
    this.cache.set(key, { response, timestamp: Date.now() })
    
    // Limit cache size
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) this.cache.delete(oldestKey)
    }
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResponse> {
    if (!this.apiKey) {
      return {
        query,
        results: [],
        totalResults: 0,
        searchTime: 0,
        provider: "tavily",
        error: "TAVILY_API_KEY not configured"
      }
    }

    // Check cache
    const cacheKey = this.getCacheKey(query, options)
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      return { ...cached, fromCache: true }
    }

    const startTime = Date.now()
    this.requestCount++

    try {
      const params: TavilySearchParams = {
        api_key: this.apiKey,
        query,
        search_depth: options?.depth === "basic" ? "basic" : DEFAULT_SEARCH_DEPTH,
        max_results: options?.maxResults || DEFAULT_MAX_RESULTS,
        include_answer: true,
        include_raw_content: options?.includeRawContent || false,
        topic: options?.topic === "news" ? "news" : "general"
      }

      if (options?.includeDomains?.length) {
        params.include_domains = options.includeDomains
      }

      if (options?.excludeDomains?.length) {
        params.exclude_domains = options.excludeDomains
      }

      const response = await fetch(`${TAVILY_API_URL}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(params)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Tavily API error ${response.status}: ${errorText}`)
      }

      const data = await response.json() as TavilyResponse
      const searchTime = Date.now() - startTime

      const results: SearchResult[] = data.results.map(r => ({
        title: r.title,
        url: r.url,
        snippet: r.content,
        rawContent: r.raw_content,
        score: r.score,
        publishedDate: r.published_date,
        source: this.extractDomain(r.url)
      }))

      const searchResponse: SearchResponse = {
        query,
        results,
        totalResults: results.length,
        searchTime,
        provider: "tavily",
        answer: data.answer,
        images: data.images
      }

      this.setCache(cacheKey, searchResponse)
      return searchResponse

    } catch (error) {
      this.errorCount++
      const searchTime = Date.now() - startTime
      
      return {
        query,
        results: [],
        totalResults: 0,
        searchTime,
        provider: "tavily",
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }
  }

  async searchIndustry(industry: string, options?: SearchOptions): Promise<SearchResponse> {
    const queries = [
      `${industry} industry trends 2025 2026`,
      `${industry} market analysis report`,
      `${industry} competitive landscape`
    ]
    
    const results = await Promise.all(
      queries.map(q => this.search(q, { ...options, maxResults: 5 }))
    )
    
    const allResults = results.flatMap(r => r.results)
    const uniqueResults = this.deduplicateResults(allResults)
    
    return {
      query: `Industry research: ${industry}`,
      results: uniqueResults,
      totalResults: uniqueResults.length,
      searchTime: Math.max(...results.map(r => r.searchTime)),
      provider: "tavily"
    }
  }

  async searchCompetitors(competitors: string[], options?: SearchOptions): Promise<SearchResponse> {
    const results = await Promise.all(
      competitors.map(async competitor => {
        const queries = [
          `"${competitor}" company about`,
          `"${competitor}" brand strategy positioning`,
          `"${competitor}" social media presence`
        ]
        
        const searchResults = await Promise.all(
          queries.map(q => this.search(q, { ...options, maxResults: 3 }))
        )
        
        return searchResults.flatMap(r => r.results)
      })
    )
    
    const allResults = results.flat()
    const uniqueResults = this.deduplicateResults(allResults)
    
    return {
      query: `Competitor research: ${competitors.join(", ")}`,
      results: uniqueResults,
      totalResults: uniqueResults.length,
      searchTime: 0,
      provider: "tavily"
    }
  }

  async searchAudience(audienceDescription: string, platforms: string[], options?: SearchOptions): Promise<SearchResponse> {
    const queries = [
      `${audienceDescription} demographics statistics`,
      `${audienceDescription} consumer behavior research`,
      `${audienceDescription} psychographics preferences`,
      ...platforms.map(p => `${audienceDescription} ${p} audience behavior`)
    ]
    
    const results = await Promise.all(
      queries.map(q => this.search(q, { ...options, maxResults: 5 }))
    )
    
    const allResults = results.flatMap(r => r.results)
    const uniqueResults = this.deduplicateResults(allResults)
    
    return {
      query: `Audience research: ${audienceDescription}`,
      results: uniqueResults,
      totalResults: uniqueResults.length,
      searchTime: Math.max(...results.map(r => r.searchTime)),
      provider: "tavily"
    }
  }

  async searchNews(topic: string, options?: SearchOptions): Promise<SearchResponse> {
    return this.search(topic, { ...options, topic: "news" })
  }

  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname.replace("www.", "")
    } catch {
      return url
    }
  }

  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>()
    return results.filter(r => {
      if (seen.has(r.url)) return false
      seen.add(r.url)
      return true
    })
  }

  getStats() {
    return {
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      cacheSize: this.cache.size,
      errorRate: this.requestCount > 0 ? this.errorCount / this.requestCount : 0
    }
  }

  clearCache(): void {
    this.cache.clear()
  }
}

export const tavilyClient = new TavilyClient()
