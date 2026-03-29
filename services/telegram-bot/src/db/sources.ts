/**
 * KORA Source Intelligence Database Layer
 * 
 * CONFIDENTIALITY: All queries are scoped by tenant_id.
 * Never query sources across tenants.
 */

import { getDatabase } from "./client"
import { createTenantScopeEnforcer } from "../types/confidentiality"
import type {
  IntelSource,
  YouTubeVideo,
  VideoTranscript,
  VideoSummary,
  ProcessedContent,
  SourceSubscription,
  IntelPreferences,
  DiscoveryRun,
  ProcessingRun,
  SourceClass,
  SourceType,
  SourcePlatform,
  SourceStatus,
  TranscriptStatus,
  VideoProcessingStatus,
  RoutingDecision,
  SummaryType,
} from "../types/sources"

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function enforceScope(tenantId: string, table: string): void {
  const enforcer = createTenantScopeEnforcer(tenantId)
  const validation = enforcer.validateQuery(table, tenantId)
  if (!validation.isValid) {
    throw new Error(`[CONFIDENTIALITY] ${validation.error}`)
  }
}

function logAccess(tenantId: string, table: string, op: string, count?: number): void {
  console.log(`[SOURCE DB] tenant=${tenantId} table=${table} op=${op}${count !== undefined ? ` count=${count}` : ""}`)
}

// ============================================================================
// INTEL SOURCES
// ============================================================================

function mapRowToSource(row: Record<string, unknown>): IntelSource {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    sourceClass: row.source_class as SourceClass,
    sourceType: row.source_type as SourceType,
    platform: row.platform as SourcePlatform | undefined,
    name: row.name as string,
    url: row.url as string | undefined,
    handle: row.handle as string | undefined,
    externalId: row.external_id as string | undefined,
    description: row.description as string | undefined,
    thumbnailUrl: row.thumbnail_url as string | undefined,
    authorName: row.author_name as string | undefined,
    authorUrl: row.author_url as string | undefined,
    discoveredAt: new Date(row.discovered_at as string),
    discoveredBy: row.discovered_by as IntelSource["discoveredBy"],
    discoveryQuery: row.discovery_query as string | undefined,
    discoveryContext: row.discovery_context as string | undefined,
    relevanceScore: row.relevance_score ? parseFloat(row.relevance_score as string) : undefined,
    viabilityScore: row.viability_score ? parseFloat(row.viability_score as string) : undefined,
    credibilityScore: row.credibility_score ? parseFloat(row.credibility_score as string) : undefined,
    recencyScore: row.recency_score ? parseFloat(row.recency_score as string) : undefined,
    overallScore: row.overall_score ? parseFloat(row.overall_score as string) : undefined,
    status: row.status as SourceStatus,
    routeToTelegram: row.route_to_telegram as boolean,
    routeToRag: row.route_to_rag as boolean,
    telegramFrequency: row.telegram_frequency as IntelSource["telegramFrequency"],
    isActive: row.is_active as boolean,
    lastCheckedAt: row.last_checked_at ? new Date(row.last_checked_at as string) : undefined,
    nextCheckAt: row.next_check_at ? new Date(row.next_check_at as string) : undefined,
    checkFrequency: row.check_frequency as IntelSource["checkFrequency"],
    itemsIngested: row.items_ingested as number,
    lastItemAt: row.last_item_at ? new Date(row.last_item_at as string) : undefined,
    errorCount: row.error_count as number,
    lastError: row.last_error as string | undefined,
    approvedAt: row.approved_at ? new Date(row.approved_at as string) : undefined,
    approvedBy: row.approved_by as string | undefined,
    notes: row.notes as string | undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

export async function createSource(
  tenantId: string,
  input: {
    sourceClass: SourceClass
    sourceType: SourceType
    platform?: SourcePlatform
    name: string
    url?: string
    handle?: string
    externalId?: string
    description?: string
    thumbnailUrl?: string
    authorName?: string
    authorUrl?: string
    discoveredBy: IntelSource["discoveredBy"]
    discoveryQuery?: string
    discoveryContext?: string
  }
): Promise<IntelSource | null> {
  const db = getDatabase()
  if (!db) return null

  enforceScope(tenantId, "intel_sources")

  const { data, error } = await db
    .from("intel_sources")
    .insert({
      tenant_id: tenantId,
      source_class: input.sourceClass,
      source_type: input.sourceType,
      platform: input.platform,
      name: input.name,
      url: input.url,
      handle: input.handle,
      external_id: input.externalId,
      description: input.description,
      thumbnail_url: input.thumbnailUrl,
      author_name: input.authorName,
      author_url: input.authorUrl,
      discovered_by: input.discoveredBy,
      discovery_query: input.discoveryQuery,
      discovery_context: input.discoveryContext,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating source:", error)
    return null
  }

  logAccess(tenantId, "intel_sources", "create", 1)
  return mapRowToSource(data)
}

export async function getSourcesByTenant(
  tenantId: string,
  filters?: {
    sourceClass?: SourceClass
    sourceType?: SourceType
    platform?: SourcePlatform
    status?: SourceStatus
    isActive?: boolean
    hasTranscript?: boolean
    minScore?: number
  },
  limit: number = 100
): Promise<IntelSource[]> {
  const db = getDatabase()
  if (!db) return []

  enforceScope(tenantId, "intel_sources")

  let query = db
    .from("intel_sources")
    .select("*")
    .eq("tenant_id", tenantId)

  if (filters?.sourceClass) {
    query = query.eq("source_class", filters.sourceClass)
  }
  if (filters?.sourceType) {
    query = query.eq("source_type", filters.sourceType)
  }
  if (filters?.platform) {
    query = query.eq("platform", filters.platform)
  }
  if (filters?.status) {
    query = query.eq("status", filters.status)
  }
  if (filters?.isActive !== undefined) {
    query = query.eq("is_active", filters.isActive)
  }
  if (filters?.minScore !== undefined) {
    query = query.gte("overall_score", filters.minScore)
  }

  const { data, error } = await query
    .order("overall_score", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Error fetching sources:", error)
    return []
  }

  logAccess(tenantId, "intel_sources", "read", data?.length || 0)
  return (data || []).map(mapRowToSource)
}

export async function getSourceById(
  tenantId: string,
  sourceId: string
): Promise<IntelSource | null> {
  const db = getDatabase()
  if (!db) return null

  enforceScope(tenantId, "intel_sources")

  const { data, error } = await db
    .from("intel_sources")
    .select("*")
    .eq("id", sourceId)
    .eq("tenant_id", tenantId)
    .single()

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("Error fetching source:", error)
    }
    return null
  }

  logAccess(tenantId, "intel_sources", "read", 1)
  return mapRowToSource(data)
}

export async function updateSourceScores(
  tenantId: string,
  sourceId: string,
  scores: {
    relevanceScore?: number
    viabilityScore?: number
    credibilityScore?: number
    recencyScore?: number
    overallScore?: number
  }
): Promise<IntelSource | null> {
  const db = getDatabase()
  if (!db) return null

  enforceScope(tenantId, "intel_sources")

  const { data, error } = await db
    .from("intel_sources")
    .update({
      relevance_score: scores.relevanceScore,
      viability_score: scores.viabilityScore,
      credibility_score: scores.credibilityScore,
      recency_score: scores.recencyScore,
      overall_score: scores.overallScore,
    })
    .eq("id", sourceId)
    .eq("tenant_id", tenantId)
    .select()
    .single()

  if (error) {
    console.error("Error updating source scores:", error)
    return null
  }

  logAccess(tenantId, "intel_sources", "update", 1)
  return mapRowToSource(data)
}

export async function updateSourceStatus(
  tenantId: string,
  sourceId: string,
  status: SourceStatus,
  approvedBy?: string
): Promise<IntelSource | null> {
  const db = getDatabase()
  if (!db) return null

  enforceScope(tenantId, "intel_sources")

  const updateData: Record<string, unknown> = { status }
  if (status === "approved" || status === "trusted" || status === "subscribed") {
    updateData.approved_at = new Date().toISOString()
    updateData.approved_by = approvedBy
  }

  const { data, error } = await db
    .from("intel_sources")
    .update(updateData)
    .eq("id", sourceId)
    .eq("tenant_id", tenantId)
    .select()
    .single()

  if (error) {
    console.error("Error updating source status:", error)
    return null
  }

  logAccess(tenantId, "intel_sources", "update", 1)
  return mapRowToSource(data)
}

/**
 * Promote a source to trusted status.
 * Trusted sources influence strategy recommendations.
 */
export async function promoteToTrusted(
  tenantId: string,
  sourceId: string,
  approvedBy: string
): Promise<IntelSource | null> {
  return updateSourceStatus(tenantId, sourceId, "trusted", approvedBy)
}

/**
 * Get sources by status for feeding into RAG or strategy.
 */
export async function getApprovedOrTrustedSources(
  tenantId: string,
  options?: {
    sourceClass?: SourceClass
    platform?: SourcePlatform
    limit?: number
  }
): Promise<IntelSource[]> {
  const db = getDatabase()
  if (!db) return []

  enforceScope(tenantId, "intel_sources")

  let query = db
    .from("intel_sources")
    .select("*")
    .eq("tenant_id", tenantId)
    .in("status", ["approved", "trusted"])
    .eq("is_active", true)

  if (options?.sourceClass) {
    query = query.eq("source_class", options.sourceClass)
  }
  if (options?.platform) {
    query = query.eq("platform", options.platform)
  }

  const { data, error } = await query
    .order("status", { ascending: false }) // trusted first
    .order("overall_score", { ascending: false, nullsFirst: false })
    .limit(options?.limit || 100)

  if (error) {
    console.error("Error fetching approved/trusted sources:", error)
    return []
  }

  logAccess(tenantId, "intel_sources", "read", data?.length || 0)
  return (data || []).map(mapRowToSource)
}

/**
 * Get only trusted sources for strategy influence.
 */
export async function getTrustedSources(
  tenantId: string,
  options?: {
    sourceClass?: SourceClass
    limit?: number
  }
): Promise<IntelSource[]> {
  const db = getDatabase()
  if (!db) return []

  enforceScope(tenantId, "intel_sources")

  let query = db
    .from("intel_sources")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", "trusted")
    .eq("is_active", true)

  if (options?.sourceClass) {
    query = query.eq("source_class", options.sourceClass)
  }

  const { data, error } = await query
    .order("overall_score", { ascending: false, nullsFirst: false })
    .limit(options?.limit || 50)

  if (error) {
    console.error("Error fetching trusted sources:", error)
    return []
  }

  logAccess(tenantId, "intel_sources", "read", data?.length || 0)
  return (data || []).map(mapRowToSource)
}

export async function updateSourceRouting(
  tenantId: string,
  sourceId: string,
  routing: {
    routeToTelegram?: boolean
    routeToRag?: boolean
    telegramFrequency?: IntelSource["telegramFrequency"]
  }
): Promise<IntelSource | null> {
  const db = getDatabase()
  if (!db) return null

  enforceScope(tenantId, "intel_sources")

  const { data, error } = await db
    .from("intel_sources")
    .update({
      route_to_telegram: routing.routeToTelegram,
      route_to_rag: routing.routeToRag,
      telegram_frequency: routing.telegramFrequency,
    })
    .eq("id", sourceId)
    .eq("tenant_id", tenantId)
    .select()
    .single()

  if (error) {
    console.error("Error updating source routing:", error)
    return null
  }

  logAccess(tenantId, "intel_sources", "update", 1)
  return mapRowToSource(data)
}

// ============================================================================
// YOUTUBE VIDEOS
// ============================================================================

function mapRowToYouTubeVideo(row: Record<string, unknown>): YouTubeVideo {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    sourceId: row.source_id as string | undefined,
    videoId: row.video_id as string,
    url: row.url as string,
    title: row.title as string,
    description: row.description as string | undefined,
    channelId: row.channel_id as string | undefined,
    channelTitle: row.channel_title as string | undefined,
    thumbnailUrl: row.thumbnail_url as string | undefined,
    durationSeconds: row.duration_seconds as number | undefined,
    publishedAt: row.published_at ? new Date(row.published_at as string) : undefined,
    viewCount: row.view_count as number | undefined,
    likeCount: row.like_count as number | undefined,
    commentCount: row.comment_count as number | undefined,
    tags: row.tags as string[] | undefined,
    categoryId: row.category_id as string | undefined,
    transcriptStatus: row.transcript_status as TranscriptStatus,
    transcriptLanguage: row.transcript_language as string | undefined,
    transcriptSource: row.transcript_source as YouTubeVideo["transcriptSource"],
    transcriptError: row.transcript_error as string | undefined,
    processingStatus: row.processing_status as VideoProcessingStatus,
    relevanceScore: row.relevance_score ? parseFloat(row.relevance_score as string) : undefined,
    audienceRelevanceScore: row.audience_relevance_score ? parseFloat(row.audience_relevance_score as string) : undefined,
    strategicUsefulnessScore: row.strategic_usefulness_score ? parseFloat(row.strategic_usefulness_score as string) : undefined,
    credibilityScore: row.credibility_score ? parseFloat(row.credibility_score as string) : undefined,
    recencyScore: row.recency_score ? parseFloat(row.recency_score as string) : undefined,
    overallScore: row.overall_score ? parseFloat(row.overall_score as string) : undefined,
    routeToTelegram: row.route_to_telegram as boolean,
    routeToRag: row.route_to_rag as boolean,
    routedToTelegramAt: row.routed_to_telegram_at ? new Date(row.routed_to_telegram_at as string) : undefined,
    routedToRagAt: row.routed_to_rag_at ? new Date(row.routed_to_rag_at as string) : undefined,
    isApproved: row.is_approved as boolean,
    approvedAt: row.approved_at ? new Date(row.approved_at as string) : undefined,
    isFeatured: row.is_featured as boolean,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

export async function createYouTubeVideo(
  tenantId: string,
  input: {
    sourceId?: string
    videoId: string
    url: string
    title: string
    description?: string
    channelId?: string
    channelTitle?: string
    thumbnailUrl?: string
    durationSeconds?: number
    publishedAt?: Date
    viewCount?: number
    likeCount?: number
    commentCount?: number
    tags?: string[]
    categoryId?: string
  }
): Promise<YouTubeVideo | null> {
  const db = getDatabase()
  if (!db) return null

  enforceScope(tenantId, "intel_youtube_videos")

  const { data, error } = await db
    .from("intel_youtube_videos")
    .insert({
      tenant_id: tenantId,
      source_id: input.sourceId,
      video_id: input.videoId,
      url: input.url,
      title: input.title,
      description: input.description,
      channel_id: input.channelId,
      channel_title: input.channelTitle,
      thumbnail_url: input.thumbnailUrl,
      duration_seconds: input.durationSeconds,
      published_at: input.publishedAt?.toISOString(),
      view_count: input.viewCount,
      like_count: input.likeCount,
      comment_count: input.commentCount,
      tags: input.tags,
      category_id: input.categoryId,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating YouTube video:", error)
    return null
  }

  logAccess(tenantId, "intel_youtube_videos", "create", 1)
  return mapRowToYouTubeVideo(data)
}

export async function getYouTubeVideosByTenant(
  tenantId: string,
  filters?: {
    transcriptStatus?: TranscriptStatus
    processingStatus?: VideoProcessingStatus
    isApproved?: boolean
    minScore?: number
  },
  limit: number = 50
): Promise<YouTubeVideo[]> {
  const db = getDatabase()
  if (!db) return []

  enforceScope(tenantId, "intel_youtube_videos")

  let query = db
    .from("intel_youtube_videos")
    .select("*")
    .eq("tenant_id", tenantId)

  if (filters?.transcriptStatus) {
    query = query.eq("transcript_status", filters.transcriptStatus)
  }
  if (filters?.processingStatus) {
    query = query.eq("processing_status", filters.processingStatus)
  }
  if (filters?.isApproved !== undefined) {
    query = query.eq("is_approved", filters.isApproved)
  }
  if (filters?.minScore !== undefined) {
    query = query.gte("overall_score", filters.minScore)
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Error fetching YouTube videos:", error)
    return []
  }

  logAccess(tenantId, "intel_youtube_videos", "read", data?.length || 0)
  return (data || []).map(mapRowToYouTubeVideo)
}

export async function getYouTubeVideoByVideoId(
  tenantId: string,
  videoId: string
): Promise<YouTubeVideo | null> {
  const db = getDatabase()
  if (!db) return null

  enforceScope(tenantId, "intel_youtube_videos")

  const { data, error } = await db
    .from("intel_youtube_videos")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("video_id", videoId)
    .single()

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("Error fetching YouTube video:", error)
    }
    return null
  }

  logAccess(tenantId, "intel_youtube_videos", "read", 1)
  return mapRowToYouTubeVideo(data)
}

export async function updateYouTubeVideoTranscriptStatus(
  tenantId: string,
  videoDbId: string,
  status: TranscriptStatus,
  details?: {
    transcriptLanguage?: string
    transcriptSource?: YouTubeVideo["transcriptSource"]
    transcriptError?: string
  }
): Promise<YouTubeVideo | null> {
  const db = getDatabase()
  if (!db) return null

  enforceScope(tenantId, "intel_youtube_videos")

  const { data, error } = await db
    .from("intel_youtube_videos")
    .update({
      transcript_status: status,
      transcript_language: details?.transcriptLanguage,
      transcript_source: details?.transcriptSource,
      transcript_error: details?.transcriptError,
    })
    .eq("id", videoDbId)
    .eq("tenant_id", tenantId)
    .select()
    .single()

  if (error) {
    console.error("Error updating transcript status:", error)
    return null
  }

  logAccess(tenantId, "intel_youtube_videos", "update", 1)
  return mapRowToYouTubeVideo(data)
}

export async function updateYouTubeVideoProcessingStatus(
  tenantId: string,
  videoDbId: string,
  status: VideoProcessingStatus
): Promise<YouTubeVideo | null> {
  const db = getDatabase()
  if (!db) return null

  enforceScope(tenantId, "intel_youtube_videos")

  const { data, error } = await db
    .from("intel_youtube_videos")
    .update({ processing_status: status })
    .eq("id", videoDbId)
    .eq("tenant_id", tenantId)
    .select()
    .single()

  if (error) {
    console.error("Error updating processing status:", error)
    return null
  }

  logAccess(tenantId, "intel_youtube_videos", "update", 1)
  return mapRowToYouTubeVideo(data)
}

export async function updateYouTubeVideoScores(
  tenantId: string,
  videoDbId: string,
  scores: {
    relevanceScore?: number
    audienceRelevanceScore?: number
    strategicUsefulnessScore?: number
    credibilityScore?: number
    recencyScore?: number
    overallScore?: number
  }
): Promise<YouTubeVideo | null> {
  const db = getDatabase()
  if (!db) return null

  enforceScope(tenantId, "intel_youtube_videos")

  const { data, error } = await db
    .from("intel_youtube_videos")
    .update({
      relevance_score: scores.relevanceScore,
      audience_relevance_score: scores.audienceRelevanceScore,
      strategic_usefulness_score: scores.strategicUsefulnessScore,
      credibility_score: scores.credibilityScore,
      recency_score: scores.recencyScore,
      overall_score: scores.overallScore,
      processing_status: "scored",
    })
    .eq("id", videoDbId)
    .eq("tenant_id", tenantId)
    .select()
    .single()

  if (error) {
    console.error("Error updating video scores:", error)
    return null
  }

  logAccess(tenantId, "intel_youtube_videos", "update", 1)
  return mapRowToYouTubeVideo(data)
}

// ============================================================================
// VIDEO TRANSCRIPTS
// ============================================================================

function mapRowToTranscript(row: Record<string, unknown>): VideoTranscript {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    videoId: row.video_id as string,
    rawTranscript: row.raw_transcript as string,
    normalizedTranscript: row.normalized_transcript as string | undefined,
    wordCount: row.word_count as number | undefined,
    durationCoveredSeconds: row.duration_covered_seconds as number | undefined,
    language: row.language as string,
    source: row.source as VideoTranscript["source"],
    confidenceScore: row.confidence_score ? parseFloat(row.confidence_score as string) : undefined,
    hasTimestamps: row.has_timestamps as boolean,
    timestampedSegments: row.timestamped_segments as VideoTranscript["timestampedSegments"],
    isProcessed: row.is_processed as boolean,
    processedAt: row.processed_at ? new Date(row.processed_at as string) : undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

export async function createVideoTranscript(
  tenantId: string,
  input: {
    videoId: string
    rawTranscript: string
    normalizedTranscript?: string
    wordCount?: number
    durationCoveredSeconds?: number
    language?: string
    source: VideoTranscript["source"]
    confidenceScore?: number
    hasTimestamps?: boolean
    timestampedSegments?: VideoTranscript["timestampedSegments"]
  }
): Promise<VideoTranscript | null> {
  const db = getDatabase()
  if (!db) return null

  enforceScope(tenantId, "intel_video_transcripts")

  const { data, error } = await db
    .from("intel_video_transcripts")
    .insert({
      tenant_id: tenantId,
      video_id: input.videoId,
      raw_transcript: input.rawTranscript,
      normalized_transcript: input.normalizedTranscript,
      word_count: input.wordCount,
      duration_covered_seconds: input.durationCoveredSeconds,
      language: input.language || "en",
      source: input.source,
      confidence_score: input.confidenceScore,
      has_timestamps: input.hasTimestamps || false,
      timestamped_segments: input.timestampedSegments,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating transcript:", error)
    return null
  }

  logAccess(tenantId, "intel_video_transcripts", "create", 1)
  return mapRowToTranscript(data)
}

export async function getTranscriptByVideoId(
  tenantId: string,
  videoDbId: string
): Promise<VideoTranscript | null> {
  const db = getDatabase()
  if (!db) return null

  enforceScope(tenantId, "intel_video_transcripts")

  const { data, error } = await db
    .from("intel_video_transcripts")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("video_id", videoDbId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("Error fetching transcript:", error)
    }
    return null
  }

  logAccess(tenantId, "intel_video_transcripts", "read", 1)
  return mapRowToTranscript(data)
}

// ============================================================================
// VIDEO SUMMARIES
// ============================================================================

function mapRowToSummary(row: Record<string, unknown>): VideoSummary {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    videoId: row.video_id as string,
    transcriptId: row.transcript_id as string | undefined,
    summaryType: row.summary_type as SummaryType,
    summary: row.summary as string,
    keyTopics: row.key_topics as string[] | undefined,
    keyQuotes: row.key_quotes as string[] | undefined,
    mentionedEntities: row.mentioned_entities as string[] | undefined,
    sentiment: row.sentiment as VideoSummary["sentiment"],
    brandRelevanceNotes: row.brand_relevance_notes as string | undefined,
    audienceRelevanceNotes: row.audience_relevance_notes as string | undefined,
    strategyRelevanceNotes: row.strategy_relevance_notes as string | undefined,
    llmProvider: row.llm_provider as string | undefined,
    llmModel: row.llm_model as string | undefined,
    promptTokens: row.prompt_tokens as number | undefined,
    completionTokens: row.completion_tokens as number | undefined,
    createdAt: new Date(row.created_at as string),
  }
}

export async function createVideoSummary(
  tenantId: string,
  input: {
    videoId: string
    transcriptId?: string
    summaryType: SummaryType
    summary: string
    keyTopics?: string[]
    keyQuotes?: string[]
    mentionedEntities?: string[]
    sentiment?: VideoSummary["sentiment"]
    brandRelevanceNotes?: string
    audienceRelevanceNotes?: string
    strategyRelevanceNotes?: string
    llmProvider?: string
    llmModel?: string
    promptTokens?: number
    completionTokens?: number
  }
): Promise<VideoSummary | null> {
  const db = getDatabase()
  if (!db) return null

  enforceScope(tenantId, "intel_video_summaries")

  const { data, error } = await db
    .from("intel_video_summaries")
    .insert({
      tenant_id: tenantId,
      video_id: input.videoId,
      transcript_id: input.transcriptId,
      summary_type: input.summaryType,
      summary: input.summary,
      key_topics: input.keyTopics,
      key_quotes: input.keyQuotes,
      mentioned_entities: input.mentionedEntities,
      sentiment: input.sentiment,
      brand_relevance_notes: input.brandRelevanceNotes,
      audience_relevance_notes: input.audienceRelevanceNotes,
      strategy_relevance_notes: input.strategyRelevanceNotes,
      llm_provider: input.llmProvider,
      llm_model: input.llmModel,
      prompt_tokens: input.promptTokens,
      completion_tokens: input.completionTokens,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating summary:", error)
    return null
  }

  logAccess(tenantId, "intel_video_summaries", "create", 1)
  return mapRowToSummary(data)
}

export async function getSummariesByVideoId(
  tenantId: string,
  videoDbId: string
): Promise<VideoSummary[]> {
  const db = getDatabase()
  if (!db) return []

  enforceScope(tenantId, "intel_video_summaries")

  const { data, error } = await db
    .from("intel_video_summaries")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("video_id", videoDbId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching summaries:", error)
    return []
  }

  logAccess(tenantId, "intel_video_summaries", "read", data?.length || 0)
  return (data || []).map(mapRowToSummary)
}

// ============================================================================
// INTEL PREFERENCES
// ============================================================================

function mapRowToPreferences(row: Record<string, unknown>): IntelPreferences {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    readSourcesEnabled: row.read_sources_enabled as boolean,
    watchSourcesEnabled: row.watch_sources_enabled as boolean,
    followSourcesEnabled: row.follow_sources_enabled as boolean,
    preferredPlatforms: row.preferred_platforms as SourcePlatform[],
    excludedPlatforms: row.excluded_platforms as SourcePlatform[] | undefined,
    preferredTopics: row.preferred_topics as string[] | undefined,
    excludedTopics: row.excluded_topics as string[] | undefined,
    preferredContentTypes: row.preferred_content_types as string[] | undefined,
    autoDiscoverEnabled: row.auto_discover_enabled as boolean,
    autoApproveThreshold: parseFloat(row.auto_approve_threshold as string),
    autoRejectThreshold: parseFloat(row.auto_reject_threshold as string),
    telegramEnabled: row.telegram_enabled as boolean,
    telegramMinScore: parseFloat(row.telegram_min_score as string),
    telegramDigestFrequency: row.telegram_digest_frequency as IntelPreferences["telegramDigestFrequency"],
    ragEnabled: row.rag_enabled as boolean,
    ragMinScore: parseFloat(row.rag_min_score as string),
    youtubeTranscriptRequired: row.youtube_transcript_required as boolean,
    youtubeMinDurationSeconds: row.youtube_min_duration_seconds as number,
    youtubeMaxDurationSeconds: row.youtube_max_duration_seconds as number,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

export async function getOrCreatePreferences(
  tenantId: string
): Promise<IntelPreferences | null> {
  const db = getDatabase()
  if (!db) return null

  enforceScope(tenantId, "intel_preferences")

  // Try to get existing
  const { data: existing } = await db
    .from("intel_preferences")
    .select("*")
    .eq("tenant_id", tenantId)
    .single()

  if (existing) {
    logAccess(tenantId, "intel_preferences", "read", 1)
    return mapRowToPreferences(existing)
  }

  // Create default preferences
  const { data, error } = await db
    .from("intel_preferences")
    .insert({ tenant_id: tenantId })
    .select()
    .single()

  if (error) {
    console.error("Error creating preferences:", error)
    return null
  }

  logAccess(tenantId, "intel_preferences", "create", 1)
  return mapRowToPreferences(data)
}

export async function updatePreferences(
  tenantId: string,
  updates: Partial<Omit<IntelPreferences, "id" | "tenantId" | "createdAt" | "updatedAt">>
): Promise<IntelPreferences | null> {
  const db = getDatabase()
  if (!db) return null

  enforceScope(tenantId, "intel_preferences")

  const updateData: Record<string, unknown> = {}
  
  if (updates.readSourcesEnabled !== undefined) updateData.read_sources_enabled = updates.readSourcesEnabled
  if (updates.watchSourcesEnabled !== undefined) updateData.watch_sources_enabled = updates.watchSourcesEnabled
  if (updates.followSourcesEnabled !== undefined) updateData.follow_sources_enabled = updates.followSourcesEnabled
  if (updates.preferredPlatforms !== undefined) updateData.preferred_platforms = updates.preferredPlatforms
  if (updates.excludedPlatforms !== undefined) updateData.excluded_platforms = updates.excludedPlatforms
  if (updates.preferredTopics !== undefined) updateData.preferred_topics = updates.preferredTopics
  if (updates.excludedTopics !== undefined) updateData.excluded_topics = updates.excludedTopics
  if (updates.autoDiscoverEnabled !== undefined) updateData.auto_discover_enabled = updates.autoDiscoverEnabled
  if (updates.autoApproveThreshold !== undefined) updateData.auto_approve_threshold = updates.autoApproveThreshold
  if (updates.autoRejectThreshold !== undefined) updateData.auto_reject_threshold = updates.autoRejectThreshold
  if (updates.telegramEnabled !== undefined) updateData.telegram_enabled = updates.telegramEnabled
  if (updates.telegramMinScore !== undefined) updateData.telegram_min_score = updates.telegramMinScore
  if (updates.telegramDigestFrequency !== undefined) updateData.telegram_digest_frequency = updates.telegramDigestFrequency
  if (updates.ragEnabled !== undefined) updateData.rag_enabled = updates.ragEnabled
  if (updates.ragMinScore !== undefined) updateData.rag_min_score = updates.ragMinScore
  if (updates.youtubeTranscriptRequired !== undefined) updateData.youtube_transcript_required = updates.youtubeTranscriptRequired
  if (updates.youtubeMinDurationSeconds !== undefined) updateData.youtube_min_duration_seconds = updates.youtubeMinDurationSeconds
  if (updates.youtubeMaxDurationSeconds !== undefined) updateData.youtube_max_duration_seconds = updates.youtubeMaxDurationSeconds

  const { data, error } = await db
    .from("intel_preferences")
    .update(updateData)
    .eq("tenant_id", tenantId)
    .select()
    .single()

  if (error) {
    console.error("Error updating preferences:", error)
    return null
  }

  logAccess(tenantId, "intel_preferences", "update", 1)
  return mapRowToPreferences(data)
}

// ============================================================================
// DISCOVERY RUNS
// ============================================================================

export async function createDiscoveryRun(
  tenantId: string,
  input: {
    runType: DiscoveryRun["runType"]
    sourceClasses?: SourceClass[]
  }
): Promise<DiscoveryRun | null> {
  const db = getDatabase()
  if (!db) return null

  enforceScope(tenantId, "intel_discovery_runs")

  const { data, error } = await db
    .from("intel_discovery_runs")
    .insert({
      tenant_id: tenantId,
      run_type: input.runType,
      source_classes: input.sourceClasses || ["read", "watch", "follow"],
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating discovery run:", error)
    return null
  }

  logAccess(tenantId, "intel_discovery_runs", "create", 1)
  return {
    id: data.id,
    tenantId: data.tenant_id,
    runType: data.run_type,
    sourceClasses: data.source_classes,
    status: data.status,
    queriesUsed: data.queries_used,
    sourcesDiscovered: data.sources_discovered,
    sourcesNew: data.sources_new,
    sourcesUpdated: data.sources_updated,
    sourcesAutoApproved: data.sources_auto_approved,
    sourcesAutoRejected: data.sources_auto_rejected,
    startedAt: data.started_at ? new Date(data.started_at) : undefined,
    completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
    durationMs: data.duration_ms,
    errorMessage: data.error_message,
    createdAt: new Date(data.created_at),
  }
}

export async function completeDiscoveryRun(
  tenantId: string,
  runId: string,
  results: {
    sourcesDiscovered: number
    sourcesNew: number
    sourcesUpdated: number
    sourcesAutoApproved: number
    sourcesAutoRejected: number
    queriesUsed?: DiscoveryRun["queriesUsed"]
    errorMessage?: string
  }
): Promise<void> {
  const db = getDatabase()
  if (!db) return

  enforceScope(tenantId, "intel_discovery_runs")

  const startedAt = await db
    .from("intel_discovery_runs")
    .select("started_at")
    .eq("id", runId)
    .eq("tenant_id", tenantId)
    .single()

  const durationMs = startedAt.data?.started_at
    ? Date.now() - new Date(startedAt.data.started_at).getTime()
    : undefined

  await db
    .from("intel_discovery_runs")
    .update({
      status: results.errorMessage ? "failed" : "completed",
      sources_discovered: results.sourcesDiscovered,
      sources_new: results.sourcesNew,
      sources_updated: results.sourcesUpdated,
      sources_auto_approved: results.sourcesAutoApproved,
      sources_auto_rejected: results.sourcesAutoRejected,
      queries_used: results.queriesUsed,
      completed_at: new Date().toISOString(),
      duration_ms: durationMs,
      error_message: results.errorMessage,
    })
    .eq("id", runId)
    .eq("tenant_id", tenantId)

  logAccess(tenantId, "intel_discovery_runs", "update", 1)
}

// ============================================================================
// STRATEGIC PROFILES
// ============================================================================

export interface StrategicProfile {
  id: string
  tenantId: string
  brandEssence?: string
  industry?: string
  niche?: string
  positioningStatement?: string
  differentiators: string[]
  strategicGoals: string[]
  contentThemes: string[]
  primaryAudience?: string
  audienceInterests: string[]
  audienceChallenges: string[]
  audiencePlatforms: string[]
  competitors: string[]
  competitorStrengths: string[]
  learningPriorities: string[]
  topicBlacklist: string[]
  minCredibilityThreshold: number
  minRelevanceThreshold: number
  lastBuiltAt?: Date
  buildSource?: "auto" | "manual"
  createdAt: Date
  updatedAt: Date
}

function mapRowToStrategicProfile(row: Record<string, unknown>): StrategicProfile {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    brandEssence: row.brand_essence as string | undefined,
    industry: row.industry as string | undefined,
    niche: row.niche as string | undefined,
    positioningStatement: row.positioning_statement as string | undefined,
    differentiators: (row.differentiators as string[]) || [],
    strategicGoals: (row.strategic_goals as string[]) || [],
    contentThemes: (row.content_themes as string[]) || [],
    primaryAudience: row.primary_audience as string | undefined,
    audienceInterests: (row.audience_interests as string[]) || [],
    audienceChallenges: (row.audience_challenges as string[]) || [],
    audiencePlatforms: (row.audience_platforms as string[]) || [],
    competitors: (row.competitors as string[]) || [],
    competitorStrengths: (row.competitor_strengths as string[]) || [],
    learningPriorities: (row.learning_priorities as string[]) || [],
    topicBlacklist: (row.topic_blacklist as string[]) || [],
    minCredibilityThreshold: parseFloat(row.min_credibility_threshold as string) || 0.5,
    minRelevanceThreshold: parseFloat(row.min_relevance_threshold as string) || 0.4,
    lastBuiltAt: row.last_built_at ? new Date(row.last_built_at as string) : undefined,
    buildSource: row.build_source as StrategicProfile["buildSource"],
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

export async function getOrCreateStrategicProfile(
  tenantId: string
): Promise<StrategicProfile | null> {
  const db = getDatabase()
  if (!db) return null

  enforceScope(tenantId, "intel_strategic_profiles")

  // Try to get existing
  const { data: existing } = await db
    .from("intel_strategic_profiles")
    .select("*")
    .eq("tenant_id", tenantId)
    .single()

  if (existing) {
    logAccess(tenantId, "intel_strategic_profiles", "read", 1)
    return mapRowToStrategicProfile(existing)
  }

  // Create default profile
  const { data, error } = await db
    .from("intel_strategic_profiles")
    .insert({ tenant_id: tenantId })
    .select()
    .single()

  if (error) {
    console.error("Error creating strategic profile:", error)
    return null
  }

  logAccess(tenantId, "intel_strategic_profiles", "create", 1)
  return mapRowToStrategicProfile(data)
}

export async function updateStrategicProfile(
  tenantId: string,
  updates: Partial<Omit<StrategicProfile, "id" | "tenantId" | "createdAt" | "updatedAt">>
): Promise<StrategicProfile | null> {
  const db = getDatabase()
  if (!db) return null

  enforceScope(tenantId, "intel_strategic_profiles")

  const updateData: Record<string, unknown> = {
    last_built_at: new Date().toISOString(),
  }

  if (updates.brandEssence !== undefined) updateData.brand_essence = updates.brandEssence
  if (updates.industry !== undefined) updateData.industry = updates.industry
  if (updates.niche !== undefined) updateData.niche = updates.niche
  if (updates.positioningStatement !== undefined) updateData.positioning_statement = updates.positioningStatement
  if (updates.differentiators !== undefined) updateData.differentiators = updates.differentiators
  if (updates.strategicGoals !== undefined) updateData.strategic_goals = updates.strategicGoals
  if (updates.contentThemes !== undefined) updateData.content_themes = updates.contentThemes
  if (updates.primaryAudience !== undefined) updateData.primary_audience = updates.primaryAudience
  if (updates.audienceInterests !== undefined) updateData.audience_interests = updates.audienceInterests
  if (updates.audienceChallenges !== undefined) updateData.audience_challenges = updates.audienceChallenges
  if (updates.audiencePlatforms !== undefined) updateData.audience_platforms = updates.audiencePlatforms
  if (updates.competitors !== undefined) updateData.competitors = updates.competitors
  if (updates.competitorStrengths !== undefined) updateData.competitor_strengths = updates.competitorStrengths
  if (updates.learningPriorities !== undefined) updateData.learning_priorities = updates.learningPriorities
  if (updates.topicBlacklist !== undefined) updateData.topic_blacklist = updates.topicBlacklist
  if (updates.minCredibilityThreshold !== undefined) updateData.min_credibility_threshold = updates.minCredibilityThreshold
  if (updates.minRelevanceThreshold !== undefined) updateData.min_relevance_threshold = updates.minRelevanceThreshold
  if (updates.buildSource !== undefined) updateData.build_source = updates.buildSource

  const { data, error } = await db
    .from("intel_strategic_profiles")
    .update(updateData)
    .eq("tenant_id", tenantId)
    .select()
    .single()

  if (error) {
    console.error("Error updating strategic profile:", error)
    return null
  }

  logAccess(tenantId, "intel_strategic_profiles", "update", 1)
  return mapRowToStrategicProfile(data)
}

/**
 * Update source with strategic scoring data.
 */
export async function updateSourceStrategicScores(
  tenantId: string,
  sourceId: string,
  scores: {
    strategicRelevance?: number
    audienceAlignment?: number
    credibilityScore?: number
    publishingConsistency?: number
    insightDensity?: number
    recencyScore?: number
    overallScore?: number
  },
  metadata?: {
    candidateSignals?: Record<string, unknown>
    verificationResult?: Record<string, unknown>
    filterReasons?: string[]
  }
): Promise<IntelSource | null> {
  const db = getDatabase()
  if (!db) return null

  enforceScope(tenantId, "intel_sources")

  const updateData: Record<string, unknown> = {}
  
  if (scores.strategicRelevance !== undefined) updateData.strategic_relevance = scores.strategicRelevance
  if (scores.audienceAlignment !== undefined) updateData.audience_alignment = scores.audienceAlignment
  if (scores.credibilityScore !== undefined) updateData.credibility_score = scores.credibilityScore
  if (scores.publishingConsistency !== undefined) updateData.publishing_consistency = scores.publishingConsistency
  if (scores.insightDensity !== undefined) updateData.insight_density = scores.insightDensity
  if (scores.recencyScore !== undefined) updateData.recency_score = scores.recencyScore
  if (scores.overallScore !== undefined) updateData.overall_score = scores.overallScore
  
  if (metadata?.candidateSignals) updateData.candidate_signals = metadata.candidateSignals
  if (metadata?.verificationResult) updateData.verification_result = metadata.verificationResult
  if (metadata?.filterReasons) updateData.filter_reasons = metadata.filterReasons

  const { data, error } = await db
    .from("intel_sources")
    .update(updateData)
    .eq("id", sourceId)
    .eq("tenant_id", tenantId)
    .select()
    .single()

  if (error) {
    console.error("Error updating source strategic scores:", error)
    return null
  }

  logAccess(tenantId, "intel_sources", "update", 1)
  return mapRowToSource(data)
}
