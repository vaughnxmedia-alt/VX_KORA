// Research and audit types

export type SocialPlatform = 
  | "instagram" 
  | "twitter" 
  | "linkedin" 
  | "youtube" 
  | "tiktok" 
  | "facebook" 
  | "threads"

export type DataSource = "api" | "scrape" | "manual" | "inferred"

export type PostingFrequency = 
  | "daily" 
  | "several_per_week" 
  | "weekly" 
  | "sporadic" 
  | "inactive"

export type ResearchSourceType = 
  | "website" 
  | "social_profile" 
  | "competitor" 
  | "industry_report" 
  | "news_article" 
  | "review"

export type ResearchSourceStatus = 
  | "pending" 
  | "fetching" 
  | "fetched" 
  | "analyzing" 
  | "analyzed" 
  | "failed"

export type FindingType = 
  | "brand_signal" 
  | "audience_signal" 
  | "competitor_insight" 
  | "industry_trend" 
  | "content_pattern" 
  | "engagement_pattern" 
  | "positioning_clue"

export type FindingCategory = "verified" | "inferred" | "assumption"

export interface TenantProfile {
  id: string
  customerId: string
  telegramId: number
  telegramUsername: string | null
  businessName: string | null
  websiteUrl: string | null
  socialHandles: Record<SocialPlatform, string>
  industry: string | null
  businessType: string | null
  
  intakeStatus: IntakeStatus
  researchStatus: ResearchStatus
  generationStatus: GenerationStatus
  reviewStatus: ReviewStatus
  deliveryStatus: DeliveryStatus
  
  pipelineStage: PipelineStage
  pipelineError: string | null
  pipelineStartedAt: Date | null
  pipelineCompletedAt: Date | null
  
  isTestTenant: boolean
  testNotes: string | null
  
  createdAt: Date
  updatedAt: Date
}

export type IntakeStatus = "pending" | "in_progress" | "clarifying" | "complete"
export type ResearchStatus = "pending" | "in_progress" | "complete" | "failed" | "skipped"
export type GenerationStatus = "pending" | "brand" | "audience" | "strategy" | "complete" | "failed"
export type ReviewStatus = "pending" | "in_progress" | "passed" | "failed" | "regenerating"
export type DeliveryStatus = "pending" | "in_progress" | "complete" | "failed"
export type PipelineStage = 
  | "intake" 
  | "clarification" 
  | "research" 
  | "generation" 
  | "review" 
  | "delivery" 
  | "complete" 
  | "error"

export interface SocialProfileAudit {
  id: string
  tenantId: string
  platform: SocialPlatform
  profileUrl: string | null
  profileHandle: string | null
  
  bio: string | null
  displayName: string | null
  followerCount: number | null
  followingCount: number | null
  postCount: number | null
  
  avgLikesPerPost: number | null
  avgCommentsPerPost: number | null
  avgEngagementRate: number | null
  postingFrequency: PostingFrequency | null
  lastPostDate: Date | null
  
  contentThemes: string[]
  contentFormats: string[]
  hashtagUsage: string[]
  platformStrengths: string[]
  platformWeaknesses: string[]
  notablePosts: NotablePost[]
  
  auditDate: Date
  dataSource: DataSource
  confidenceScore: number
  rawData: Record<string, unknown>
  errorMessage: string | null
  
  createdAt: Date
  updatedAt: Date
}

export interface NotablePost {
  url: string
  engagement: number
  theme: string
  type: string
}

export interface ResearchSource {
  id: string
  tenantId: string
  sourceType: ResearchSourceType
  sourceUrl: string | null
  sourceName: string | null
  
  status: ResearchSourceStatus
  accessedAt: Date | null
  analyzedAt: Date | null
  
  rawContent: string | null
  contentLength: number | null
  contentType: string | null
  
  errorMessage: string | null
  retryCount: number
  
  createdAt: Date
  updatedAt: Date
}

export interface ResearchFinding {
  id: string
  tenantId: string
  sourceId: string | null
  
  findingType: FindingType
  findingCategory: FindingCategory
  
  summary: string
  details: Record<string, unknown>
  evidence: string | null
  
  confidenceScore: number
  relevanceScore: number
  
  usedInDeliverable: boolean
  usedInSection: string | null
  
  createdAt: Date
}

export interface WebsiteAnalysis {
  url: string
  title: string | null
  tagline: string | null
  aboutSection: string | null
  services: string[]
  team: string[]
  testimonials: string[]
  brandSignals: BrandSignal[]
  toneAnalysis: ToneAnalysis
  positioningClues: string[]
  rawHtml: string | null
  fetchedAt: Date
  error: string | null
}

export interface BrandSignal {
  signal: string
  source: string
  confidence: number
}

export interface ToneAnalysis {
  overall: string
  keywords: string[]
  sentiment: "positive" | "neutral" | "negative"
  formality: "formal" | "casual" | "mixed"
}

export interface ResearchContext {
  websiteAnalysis: WebsiteAnalysis | null
  socialAudits: SocialProfileAudit[]
  findings: ResearchFinding[]
  overallConfidence: number
  gaps: string[]
}
