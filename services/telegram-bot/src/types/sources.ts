/**
 * KORA Source Intelligence Types
 * 
 * Defines types for source discovery, processing, and scoring across
 * three source classes:
 * 
 * 1. READ: blogs, articles, press releases, news, newsletters, events
 * 2. WATCH: YouTube videos, channels, interviews, podcasts, creator videos  
 * 3. FOLLOW: Instagram, TikTok, LinkedIn, YouTube creators, social accounts
 * 
 * YouTube is a first-class intelligence source with transcript support.
 */

// ============================================================================
// SOURCE CLASSIFICATION
// ============================================================================

export type SourceClass = "read" | "watch" | "follow"

export type ReadSourceType = 
  | "blog"
  | "article"
  | "press_release"
  | "news"
  | "newsletter"
  | "event"
  | "rss_feed"

export type WatchSourceType =
  | "youtube_video"
  | "youtube_channel"
  | "youtube_playlist"
  | "interview"
  | "podcast"
  | "creator_video"
  | "webinar"

export type FollowSourceType =
  | "instagram_account"
  | "tiktok_account"
  | "linkedin_creator"
  | "youtube_channel"
  | "twitter_account"
  | "threads_account"

export type SourceType = ReadSourceType | WatchSourceType | FollowSourceType

export type SourcePlatform =
  | "youtube"
  | "instagram"
  | "tiktok"
  | "linkedin"
  | "twitter"
  | "threads"
  | "web"
  | "rss"

// ============================================================================
// SOURCE STATUS
// ============================================================================

/**
 * Source status progression:
 * - suggested: Discovered but not reviewed
 * - approved: Reviewed and accepted, may feed tenant RAG
 * - trusted: Verified high-quality, influences strategy recommendations
 */
export type SourceStatus =
  | "suggested"    // discovered but not reviewed
  | "reviewing"    // currently being evaluated
  | "approved"     // approved for regular ingestion, may feed RAG
  | "trusted"      // verified high-quality, influences strategy
  | "subscribed"   // actively subscribed/following
  | "rejected"     // explicitly rejected
  | "inactive"     // temporarily disabled

// ============================================================================
// INTELLIGENCE SOURCE
// ============================================================================

export interface IntelSource {
  id: string
  tenantId: string
  
  // Classification
  sourceClass: SourceClass
  sourceType: SourceType
  platform?: SourcePlatform
  
  // Identification
  name: string
  url?: string
  handle?: string
  externalId?: string
  
  // Metadata
  description?: string
  thumbnailUrl?: string
  authorName?: string
  authorUrl?: string
  
  // Discovery
  discoveredAt: Date
  discoveredBy: "manual" | "agent" | "suggestion"
  discoveryQuery?: string
  discoveryContext?: string
  
  // Scoring (0-1)
  relevanceScore?: number
  viabilityScore?: number
  credibilityScore?: number
  recencyScore?: number
  overallScore?: number
  
  // Status
  status: SourceStatus
  
  // Routing
  routeToTelegram: boolean
  routeToRag: boolean
  telegramFrequency?: "instant" | "daily" | "weekly"
  
  // Ingestion tracking
  isActive: boolean
  lastCheckedAt?: Date
  nextCheckAt?: Date
  checkFrequency: "hourly" | "daily" | "weekly"
  itemsIngested: number
  lastItemAt?: Date
  errorCount: number
  lastError?: string
  
  // Audit
  approvedAt?: Date
  approvedBy?: string
  notes?: string
  
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// SOURCE SCORING
// ============================================================================

export interface SourceScores {
  relevanceScore: number     // How relevant to tenant's brand/strategy
  viabilityScore: number     // Quality and reliability of source
  credibilityScore: number   // Authority and trustworthiness
  recencyScore: number       // Freshness of content
  overallScore: number       // Weighted aggregate
}

/**
 * Strategic scoring dimensions used by the Source Discovery Agent.
 * These prioritize strategic value over simple keyword matching.
 */
export interface StrategicScores {
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
 * Signals collected about a source candidate for scoring decisions.
 */
export interface CandidateSignals {
  // Activity signals
  lastPublishedDate?: Date
  publishingFrequency?: "inactive" | "sporadic" | "monthly" | "bi-weekly" | "weekly" | "daily"
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

export interface ContentScores {
  topicalRelevanceScore: number      // Topic alignment with tenant
  audienceRelevanceScore: number     // Audience alignment
  strategicUsefulnessScore: number   // Value for strategy
  credibilityScore: number           // Source credibility
  recencyScore: number               // Freshness
  overallScore: number               // Weighted aggregate
}

export interface ScoreRationale {
  dimension: string
  score: number
  reason: string
  evidence?: string[]
}

// ============================================================================
// YOUTUBE VIDEO
// ============================================================================

export type TranscriptStatus =
  | "pending"       // not yet attempted
  | "fetching"      // currently fetching
  | "available"     // captions available and fetched
  | "transcribing"  // using fallback transcription
  | "transcribed"   // fallback transcription complete
  | "unavailable"   // no captions and transcription failed
  | "error"         // fetch error

export type VideoProcessingStatus =
  | "pending"
  | "processing"
  | "summarized"
  | "scored"
  | "complete"
  | "error"

export interface YouTubeVideo {
  id: string
  tenantId: string
  sourceId?: string
  
  // Video identification
  videoId: string
  url: string
  
  // Metadata
  title: string
  description?: string
  channelId?: string
  channelTitle?: string
  thumbnailUrl?: string
  durationSeconds?: number
  publishedAt?: Date
  
  // Engagement
  viewCount?: number
  likeCount?: number
  commentCount?: number
  
  // Categories
  tags?: string[]
  categoryId?: string
  
  // Transcript
  transcriptStatus: TranscriptStatus
  transcriptLanguage?: string
  transcriptSource?: "youtube_captions" | "auto_captions" | "whisper" | "assembly_ai"
  transcriptError?: string
  
  // Processing
  processingStatus: VideoProcessingStatus
  
  // Scoring
  relevanceScore?: number
  audienceRelevanceScore?: number
  strategicUsefulnessScore?: number
  credibilityScore?: number
  recencyScore?: number
  overallScore?: number
  
  // Routing
  routeToTelegram: boolean
  routeToRag: boolean
  routedToTelegramAt?: Date
  routedToRagAt?: Date
  
  // Approval
  isApproved: boolean
  approvedAt?: Date
  isFeatured: boolean
  
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// VIDEO TRANSCRIPT
// ============================================================================

export interface TranscriptSegment {
  startMs: number
  endMs: number
  text: string
}

export interface VideoTranscript {
  id: string
  tenantId: string
  videoId: string
  
  // Content
  rawTranscript: string
  normalizedTranscript?: string
  wordCount?: number
  durationCoveredSeconds?: number
  
  // Metadata
  language: string
  source: "youtube_captions" | "auto_captions" | "whisper" | "assembly_ai" | "manual"
  confidenceScore?: number
  
  // Timestamps
  hasTimestamps: boolean
  timestampedSegments?: TranscriptSegment[]
  
  // Processing
  isProcessed: boolean
  processedAt?: Date
  
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// VIDEO SUMMARY
// ============================================================================

export type SummaryType =
  | "brief"         // 1-2 sentence summary
  | "detailed"      // comprehensive summary
  | "key_points"    // bullet points
  | "actionable"    // actionable takeaways
  | "content_ideas" // content inspiration

export interface VideoSummary {
  id: string
  tenantId: string
  videoId: string
  transcriptId?: string
  
  // Summary
  summaryType: SummaryType
  summary: string
  
  // Extracted data
  keyTopics?: string[]
  keyQuotes?: string[]
  mentionedEntities?: string[]
  sentiment?: "positive" | "neutral" | "negative" | "mixed"
  
  // Relevance notes
  brandRelevanceNotes?: string
  audienceRelevanceNotes?: string
  strategyRelevanceNotes?: string
  
  // LLM metadata
  llmProvider?: string
  llmModel?: string
  promptTokens?: number
  completionTokens?: number
  
  createdAt: Date
}

// ============================================================================
// PROCESSED CONTENT
// ============================================================================

export type RoutingDecision =
  | "suggestion_only"  // keep as suggestion
  | "approve_source"   // approve the source for regular ingestion
  | "route_telegram"   // send to Telegram
  | "route_rag"        // add to tenant RAG
  | "route_both"       // Telegram and RAG
  | "reject"           // not valuable

export interface ProcessedContent {
  id: string
  tenantId: string
  sourceId?: string
  
  // Content type
  contentClass: SourceClass
  contentType: string
  
  // Original source
  originalUrl?: string
  originalTitle?: string
  originalAuthor?: string
  originalPublishedAt?: Date
  
  // Normalized content
  title: string
  content?: string
  summary?: string
  keyPoints?: string[]
  
  // Extracted metadata
  topics?: string[]
  entities?: string[]
  sentiment?: string
  language: string
  wordCount?: number
  readingTimeMinutes?: number
  
  // Media
  thumbnailUrl?: string
  mediaUrls?: string[]
  
  // Scoring
  topicalRelevanceScore?: number
  audienceRelevanceScore?: number
  strategicUsefulnessScore?: number
  credibilityScore?: number
  recencyScore?: number
  overallScore?: number
  scoreRationale?: ScoreRationale[]
  
  // Routing
  routingDecision?: RoutingDecision
  routingReason?: string
  routedToTelegram: boolean
  routedToTelegramAt?: Date
  routedToRag: boolean
  routedToRagAt?: Date
  
  // Approval
  isApproved: boolean
  approvedAt?: Date
  approvedBy?: "auto" | "user" | "admin"
  
  // Embedding
  isEmbedded: boolean
  embeddingId?: string
  
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// SOURCE SUBSCRIPTION
// ============================================================================

export interface SourceSubscription {
  id: string
  tenantId: string
  sourceId: string
  
  // Settings
  isActive: boolean
  checkFrequency: "hourly" | "daily" | "weekly"
  
  // Routing preferences
  routeToTelegram: boolean
  telegramFrequency?: "instant" | "daily_digest" | "weekly_digest"
  routeToRag: boolean
  
  // Filters
  minScoreThreshold: number
  keywordFilters?: string[]
  excludeKeywords?: string[]
  
  // Tracking
  lastCheckedAt?: Date
  itemsReceived: number
  itemsApproved: number
  itemsRejected: number
  
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// INTELLIGENCE PREFERENCES
// ============================================================================

export interface IntelPreferences {
  id: string
  tenantId: string
  
  // Source class preferences
  readSourcesEnabled: boolean
  watchSourcesEnabled: boolean
  followSourcesEnabled: boolean
  
  // Platform preferences
  preferredPlatforms: SourcePlatform[]
  excludedPlatforms?: SourcePlatform[]
  
  // Content preferences
  preferredTopics?: string[]
  excludedTopics?: string[]
  preferredContentTypes?: string[]
  
  // Discovery preferences
  autoDiscoverEnabled: boolean
  autoApproveThreshold: number  // auto-approve if score >= this
  autoRejectThreshold: number   // auto-reject if score <= this
  
  // Telegram routing
  telegramEnabled: boolean
  telegramMinScore: number
  telegramDigestFrequency: "instant" | "daily" | "weekly"
  
  // RAG routing
  ragEnabled: boolean
  ragMinScore: number
  
  // YouTube specific
  youtubeTranscriptRequired: boolean
  youtubeMinDurationSeconds: number
  youtubeMaxDurationSeconds: number
  
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// DISCOVERY RUN
// ============================================================================

export interface DiscoveryQuery {
  query: string
  sourceClass: SourceClass
  resultsCount: number
}

export interface DiscoveryRun {
  id: string
  tenantId: string
  
  // Run metadata
  runType: "scheduled" | "manual" | "triggered"
  sourceClasses: SourceClass[]
  
  // Status
  status: "pending" | "running" | "completed" | "failed"
  
  // Queries
  queriesUsed?: DiscoveryQuery[]
  
  // Results
  sourcesDiscovered: number
  sourcesNew: number
  sourcesUpdated: number
  sourcesAutoApproved: number
  sourcesAutoRejected: number
  
  // Timing
  startedAt?: Date
  completedAt?: Date
  durationMs?: number
  
  // Errors
  errorMessage?: string
  
  createdAt: Date
}

// ============================================================================
// PROCESSING RUN
// ============================================================================

export interface ProcessingRun {
  id: string
  tenantId: string
  sourceId?: string
  
  // Run metadata
  contentClass: SourceClass
  contentType: string
  
  // Status
  status: "pending" | "fetching" | "processing" | "scoring" | "routing" | "completed" | "failed"
  
  // Processing details
  itemsFetched: number
  itemsProcessed: number
  itemsScored: number
  itemsRoutedTelegram: number
  itemsRoutedRag: number
  
  // YouTube specific
  transcriptsFetched: number
  transcriptsGenerated: number
  summariesGenerated: number
  
  // Timing
  startedAt?: Date
  completedAt?: Date
  durationMs?: number
  
  // Errors
  errorMessage?: string
  
  createdAt: Date
}

// ============================================================================
// SOURCE DISCOVERY INPUT
// ============================================================================

export interface SourceDiscoveryInput {
  tenantId: string
  
  // What to discover
  sourceClasses?: SourceClass[]
  platforms?: SourcePlatform[]
  
  // Context from tenant
  brandKeywords?: string[]
  industryKeywords?: string[]
  audienceKeywords?: string[]
  competitorNames?: string[]
  
  // Search parameters
  maxResultsPerClass?: number
  minScoreThreshold?: number
}

// ============================================================================
// SOURCE PROCESSING INPUT
// ============================================================================

export interface SourceProcessingInput {
  tenantId: string
  sourceId: string
  
  // For YouTube
  videoUrl?: string
  forceTranscription?: boolean
  
  // Options
  generateSummary?: boolean
  summaryTypes?: SummaryType[]
  scoreContent?: boolean
  autoRoute?: boolean
}

// ============================================================================
// YOUTUBE API TYPES
// ============================================================================

export interface YouTubeVideoMetadata {
  videoId: string
  title: string
  description: string
  channelId: string
  channelTitle: string
  publishedAt: string
  thumbnails: {
    default?: { url: string; width: number; height: number }
    medium?: { url: string; width: number; height: number }
    high?: { url: string; width: number; height: number }
    maxres?: { url: string; width: number; height: number }
  }
  duration: string // ISO 8601 duration
  tags?: string[]
  categoryId: string
}

export interface YouTubeVideoStats {
  viewCount: string
  likeCount: string
  commentCount: string
}

export interface YouTubeCaptionTrack {
  id: string
  language: string
  name: string
  isAutoGenerated: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const SOURCE_CLASS_LABELS: Record<SourceClass, string> = {
  read: "Read",
  watch: "Watch",
  follow: "Follow",
}

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  // Read
  blog: "Blog",
  article: "Article",
  press_release: "Press Release",
  news: "News",
  newsletter: "Newsletter",
  event: "Event",
  rss_feed: "RSS Feed",
  // Watch
  youtube_video: "YouTube Video",
  youtube_channel: "YouTube Channel",
  youtube_playlist: "YouTube Playlist",
  interview: "Interview",
  podcast: "Podcast",
  creator_video: "Creator Video",
  webinar: "Webinar",
  // Follow
  instagram_account: "Instagram Account",
  tiktok_account: "TikTok Account",
  linkedin_creator: "LinkedIn Creator",
  twitter_account: "Twitter Account",
  threads_account: "Threads Account",
}

export const PLATFORM_LABELS: Record<SourcePlatform, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  twitter: "Twitter",
  threads: "Threads",
  web: "Web",
  rss: "RSS",
}
