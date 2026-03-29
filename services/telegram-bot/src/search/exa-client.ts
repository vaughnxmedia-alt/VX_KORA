/**
 * Exa Search API Client
 * 
 * Semantic search provider for complex research queries.
 * Best for company/people search and multi-hop reasoning.
 */

import { SearchResult, SearchOptions, SearchResponse, WebSearchClient } from "./types.js"

const EXA_API_URL = "https://api.exa.ai"
const DEFAULT_MAX_RESULTS = 10
const CACHE_TTL_MS = 1000 * 60 * 30 // 30 minutes

interface ExaSearchParams {
  query: string
  type?: "keyword" | "neural" | "auto"
  useAutoprompt?: boolean
  numResults?: number
  includeDomains?: string[]
  excludeDomains?: string[]
  startCrawlDate?: string
  endCrawlDate?: string
  startPublishedDate?: string
  endPublishedDate?: string
  category?: string
  contents?: {
    text?: boolean | { maxCharacters?: number; includeHtmlTags?: boolean }
    highlights?: boolean | { numSentences?: number; highlightsPerUrl?: number }
    summary?: boolean | { query?: string }
  }
}

interface ExaResult {
  id: string
  url: string
  title: string
  score: number
  publishedDate?: string
  author?: string
  text?: string
  highlights?: string[]
  highlightScores?: number[]
  summary?: string
}

interface ExaResponse {
  results: ExaResult[]
  autopromptString?: string
  requestId: string
}

interface CacheEntry {
  response: SearchResponse
  timestamp: number
}

export class ExaClient implements WebSearchClient {
  private apiKey: string
  private cache: Map<string, CacheEntry> = new Map()
  private requestCount = 0
  private errorCount = 0

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.EXA_API_KEY || ""
    if (!this.apiKey) {
      console.warn("EXA_API_KEY not set - searches will fail")
    }
  }

  private getCacheKey(query: string, options?: SearchOptions): string {
    return `exa:${JSON.stringify({ query, options })}`
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
    
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) this.cache.delete(oldestKey)
    }
  }

  private getDateFilter(recency?: string): { start?: string; end?: string } {
    if (!recency || recency === "all") return {}
    
    const now = new Date()
    let startDate: Date
    
    switch (recency) {
      case "day":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case "year":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      default:
        return {}
    }
    
    return { start: startDate.toISOString().split("T")[0] }
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResponse> {
    if (!this.apiKey) {
      return {
        query,
        results: [],
        totalResults: 0,
        searchTime: 0,
        provider: "exa",
        error: "EXA_API_KEY not configured"
      }
    }

    const cacheKey = this.getCacheKey(query, options)
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      return { ...cached, fromCache: true }
    }

    const startTime = Date.now()
    this.requestCount++

    try {
      const dateFilter = this.getDateFilter(options?.recency)
      
      const params: ExaSearchParams = {
        query,
        type: "auto",
        useAutoprompt: true,
        numResults: options?.maxResults || DEFAULT_MAX_RESULTS,
        contents: {
          text: { maxCharacters: 2000 },
          highlights: { numSentences: 3, highlightsPerUrl: 3 },
          summary: true
        }
      }

      if (options?.includeDomains?.length) {
        params.includeDomains = options.includeDomains
      }

      if (options?.excludeDomains?.length) {
        params.excludeDomains = options.excludeDomains
      }

      if (dateFilter.start) {
        params.startPublishedDate = dateFilter.start
      }

      const response = await fetch(`${EXA_API_URL}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey
        },
        body: JSON.stringify(params)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Exa API error ${response.status}: ${errorText}`)
      }

      const data = await response.json() as ExaResponse
      const searchTime = Date.now() - startTime

      const results: SearchResult[] = data.results.map(r => ({
        title: r.title,
        url: r.url,
        snippet: r.summary || r.highlights?.join(" ") || r.text?.slice(0, 300) || "",
        rawContent: r.text,
        score: r.score,
        publishedDate: r.publishedDate,
        author: r.author,
        source: this.extractDomain(r.url)
      }))

      const searchResponse: SearchResponse = {
        query,
        results,
        totalResults: results.length,
        searchTime,
        provider: "exa"
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
        provider: "exa",
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }
  }

  async searchCompany(companyName: string, options?: SearchOptions): Promise<SearchResponse> {
    const queries = [
      `"${companyName}" company overview about us`,
      `"${companyName}" products services offerings`,
      `"${companyName}" leadership team founders`
    ]
    
    const results = await Promise.all(
      queries.map(q => this.search(q, { ...options, maxResults: 5 }))
    )
    
    const allResults = results.flatMap(r => r.results)
    const uniqueResults = this.deduplicateResults(allResults)
    
    return {
      query: `Company research: ${companyName}`,
      results: uniqueResults,
      totalResults: uniqueResults.length,
      searchTime: Math.max(...results.map(r => r.searchTime)),
      provider: "exa"
    }
  }

  async searchPerson(personName: string, context?: string, options?: SearchOptions): Promise<SearchResponse> {
    const contextStr = context ? ` ${context}` : ""
    const queries = [
      `"${personName}"${contextStr} professional background`,
      `"${personName}"${contextStr} expertise thought leadership`,
      `"${personName}"${contextStr} interview profile`
    ]
    
    const results = await Promise.all(
      queries.map(q => this.search(q, { ...options, maxResults: 5 }))
    )
    
    const allResults = results.flatMap(r => r.results)
    const uniqueResults = this.deduplicateResults(allResults)
    
    return {
      query: `Person research: ${personName}`,
      results: uniqueResults,
      totalResults: uniqueResults.length,
      searchTime: Math.max(...results.map(r => r.searchTime)),
      provider: "exa"
    }
  }

  async findSimilarContent(url: string, options?: SearchOptions): Promise<SearchResponse> {
    if (!this.apiKey) {
      return {
        query: `Similar to: ${url}`,
        results: [],
        totalResults: 0,
        searchTime: 0,
        provider: "exa",
        error: "EXA_API_KEY not configured"
      }
    }

    const startTime = Date.now()
    this.requestCount++

    try {
      const response = await fetch(`${EXA_API_URL}/findSimilar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey
        },
        body: JSON.stringify({
          url,
          numResults: options?.maxResults || DEFAULT_MAX_RESULTS,
          contents: {
            text: { maxCharacters: 1000 },
            highlights: true
          }
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Exa API error ${response.status}: ${errorText}`)
      }

      const data = await response.json() as ExaResponse
      const searchTime = Date.now() - startTime

      const results: SearchResult[] = data.results.map(r => ({
        title: r.title,
        url: r.url,
        snippet: r.highlights?.join(" ") || r.text?.slice(0, 300) || "",
        rawContent: r.text,
        score: r.score,
        publishedDate: r.publishedDate,
        source: this.extractDomain(r.url)
      }))

      return {
        query: `Similar to: ${url}`,
        results,
        totalResults: results.length,
        searchTime,
        provider: "exa"
      }

    } catch (error) {
      this.errorCount++
      return {
        query: `Similar to: ${url}`,
        results: [],
        totalResults: 0,
        searchTime: Date.now() - startTime,
        provider: "exa",
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }
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

export const exaClient = new ExaClient()
