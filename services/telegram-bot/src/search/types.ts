/**
 * Search Types for KORA Research Pipeline
 * 
 * Common interfaces for all search providers (Tavily, Exa, etc.)
 */

export interface SearchResult {
  title: string
  url: string
  snippet: string
  rawContent?: string
  score: number
  publishedDate?: string
  source: string
  author?: string
  imageUrl?: string
}

export interface SearchOptions {
  maxResults?: number
  depth?: "basic" | "advanced"
  topic?: "general" | "news"
  includeDomains?: string[]
  excludeDomains?: string[]
  includeRawContent?: boolean
  recency?: "day" | "week" | "month" | "year" | "all"
  category?: SearchCategory
}

export type SearchCategory = 
  | "industry"
  | "competitor"
  | "audience"
  | "market"
  | "news"
  | "social"
  | "general"

export interface SearchResponse {
  query: string
  results: SearchResult[]
  totalResults: number
  searchTime: number
  provider: "tavily" | "exa" | "perplexity" | "google"
  answer?: string
  images?: string[]
  error?: string
  fromCache?: boolean
}

export interface WebSearchClient {
  search(query: string, options?: SearchOptions): Promise<SearchResponse>
  searchIndustry?(industry: string, options?: SearchOptions): Promise<SearchResponse>
  searchCompetitors?(competitors: string[], options?: SearchOptions): Promise<SearchResponse>
  searchAudience?(audienceDescription: string, platforms: string[], options?: SearchOptions): Promise<SearchResponse>
  searchNews?(topic: string, options?: SearchOptions): Promise<SearchResponse>
  getStats?(): SearchStats
  clearCache?(): void
}

export interface SearchStats {
  requestCount: number
  errorCount: number
  cacheSize: number
  errorRate: number
}

export interface CompetitorSearchResult extends SearchResult {
  competitorName: string
  contentType: "website" | "social" | "news" | "review"
}

export interface AudienceSearchResult extends SearchResult {
  dataType: "demographics" | "psychographics" | "behavior" | "preferences"
  dataPoints?: Record<string, unknown>
}

export interface MarketSearchResult extends SearchResult {
  dataType: "trend" | "forecast" | "report" | "statistics"
  metrics?: {
    name: string
    value: string | number
    unit?: string
    source: string
  }[]
}

export interface SearchAggregation {
  queries: string[]
  results: SearchResult[]
  totalSearchTime: number
  providers: string[]
  deduplicatedCount: number
}

export interface ResearchQuery {
  id: string
  type: SearchCategory
  query: string
  priority: "high" | "medium" | "low"
  requiredSources?: number
  filters?: SearchOptions
}

export interface ResearchPlan {
  tenantId: string
  queries: ResearchQuery[]
  estimatedTime: number
  estimatedCost: number
}
