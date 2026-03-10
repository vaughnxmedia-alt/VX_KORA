/**
 * KORA Source Processing Agent
 * 
 * Processes intelligence sources across READ, WATCH, and FOLLOW classes.
 * For YouTube sources:
 * - Fetches video metadata
 * - Extracts transcripts from captions
 * - Falls back to transcription services if needed
 * - Normalizes transcript content
 * - Generates summaries
 * - Scores for relevance
 * 
 * Outputs normalized content objects ready for scoring and routing.
 */

import { ConfidentialBaseAgent, createConfidentialAgentOutput } from "./confidential-base-agent"
import type { PipelineContext, AgentOutput } from "../types/pipeline"
import type { AgentContext } from "../rag/context-builder"
import {
  getSourceById,
  createYouTubeVideo,
  getYouTubeVideoByVideoId,
  updateYouTubeVideoTranscriptStatus,
  updateYouTubeVideoProcessingStatus,
  createVideoTranscript,
  getTranscriptByVideoId,
  createVideoSummary,
} from "../db/sources"
import type {
  IntelSource,
  YouTubeVideo,
  VideoTranscript,
  VideoSummary,
  ProcessedContent,
  SourceProcessingInput,
  TranscriptStatus,
  SummaryType,
  YouTubeVideoMetadata,
  YouTubeVideoStats,
} from "../types/sources"
import { getRouter } from "../llm/router"

// ============================================================================
// TYPES
// ============================================================================

export interface SourceProcessingOutput {
  sourceId: string
  sourceClass: string
  contentType: string
  success: boolean
  
  // YouTube specific
  video?: YouTubeVideo
  transcript?: VideoTranscript
  summaries?: VideoSummary[]
  
  // Generic content
  processedContent?: Partial<ProcessedContent>
  
  // Errors
  errors?: string[]
}

interface YouTubeTranscriptResult {
  raw: string
  normalized: string
  segments?: Array<{ startMs: number; endMs: number; text: string }>
  source: VideoTranscript["source"]
  language: string
  confidence?: number
}

// ============================================================================
// SOURCE PROCESSING AGENT
// ============================================================================

export class SourceProcessingAgent extends ConfidentialBaseAgent<
  SourceProcessingInput,
  SourceProcessingOutput
> {
  constructor() {
    super("source_processing", "research", {
      deliverableType: "all",
      maxRetries: 2,
      timeoutMs: 300000, // 5 minutes for transcript processing
    })
  }

  protected async execute(
    context: PipelineContext,
    input: SourceProcessingInput,
    agentContext: AgentContext
  ): Promise<AgentOutput<SourceProcessingOutput>> {
    const { tenantId, sourceId } = input
    const errors: string[] = []

    // Get source
    const source = await getSourceById(tenantId, sourceId)
    if (!source) {
      return createConfidentialAgentOutput(false, undefined, {
        error: `Source not found: ${sourceId}`,
        shouldRetry: false,
      })
    }

    console.log(`[SourceProcessing] Processing ${source.sourceClass}/${source.sourceType} source: ${source.name}`)

    let output: SourceProcessingOutput = {
      sourceId,
      sourceClass: source.sourceClass,
      contentType: source.sourceType,
      success: false,
      errors: [],
    }

    try {
      switch (source.sourceClass) {
        case "watch":
          output = await this.processWatchSource(tenantId, source, input, agentContext)
          break
        case "read":
          output = await this.processReadSource(tenantId, source, input, agentContext)
          break
        case "follow":
          output = await this.processFollowSource(tenantId, source, input, agentContext)
          break
        default:
          errors.push(`Unknown source class: ${source.sourceClass}`)
      }
    } catch (error) {
      const err = error as Error
      errors.push(err.message)
      output.errors = errors
    }

    output.success = errors.length === 0 && (output.errors?.length || 0) === 0

    return createConfidentialAgentOutput(output.success, output, {
      error: output.success ? undefined : (output.errors?.join("; ") || "Processing failed"),
      shouldRetry: this.isRetryableError(new Error(output.errors?.join("; ") || "")),
    })
  }

  // ============================================================================
  // WATCH SOURCE PROCESSING (YouTube)
  // ============================================================================

  private async processWatchSource(
    tenantId: string,
    source: IntelSource,
    input: SourceProcessingInput,
    agentContext: AgentContext
  ): Promise<SourceProcessingOutput> {
    const errors: string[] = []

    // Handle YouTube videos
    if (source.sourceType === "youtube_video" || source.sourceType === "youtube_channel") {
      return this.processYouTubeSource(tenantId, source, input, agentContext)
    }

    // Handle other watch sources (podcasts, interviews, etc.)
    return {
      sourceId: source.id,
      sourceClass: "watch",
      contentType: source.sourceType,
      success: true,
      processedContent: {
        contentClass: "watch",
        contentType: source.sourceType,
        title: source.name,
        originalUrl: source.url,
        originalAuthor: source.authorName,
      },
    }
  }

  private async processYouTubeSource(
    tenantId: string,
    source: IntelSource,
    input: SourceProcessingInput,
    agentContext: AgentContext
  ): Promise<SourceProcessingOutput> {
    const errors: string[] = []
    
    // Extract video ID from URL or use the one from input
    const videoUrl = input.videoUrl || source.url
    const videoId = this.extractYouTubeVideoId(videoUrl || "")
    
    if (!videoId) {
      return {
        sourceId: source.id,
        sourceClass: "watch",
        contentType: source.sourceType,
        success: false,
        errors: ["Could not extract YouTube video ID from URL"],
      }
    }

    // Check if we already have this video
    let video = await getYouTubeVideoByVideoId(tenantId, videoId)

    if (!video) {
      // Fetch video metadata from YouTube
      const metadata = await this.fetchYouTubeMetadata(videoId)
      const stats = await this.fetchYouTubeStats(videoId)

      if (!metadata) {
        return {
          sourceId: source.id,
          sourceClass: "watch",
          contentType: source.sourceType,
          success: false,
          errors: ["Failed to fetch YouTube video metadata"],
        }
      }

      // Create video record
      video = await createYouTubeVideo(tenantId, {
        sourceId: source.id,
        videoId,
        url: `https://youtube.com/watch?v=${videoId}`,
        title: metadata.title,
        description: metadata.description,
        channelId: metadata.channelId,
        channelTitle: metadata.channelTitle,
        thumbnailUrl: metadata.thumbnails.high?.url || metadata.thumbnails.default?.url,
        durationSeconds: this.parseDuration(metadata.duration),
        publishedAt: new Date(metadata.publishedAt),
        viewCount: stats ? parseInt(stats.viewCount, 10) : undefined,
        likeCount: stats ? parseInt(stats.likeCount, 10) : undefined,
        commentCount: stats ? parseInt(stats.commentCount, 10) : undefined,
        tags: metadata.tags,
        categoryId: metadata.categoryId,
      })

      if (!video) {
        return {
          sourceId: source.id,
          sourceClass: "watch",
          contentType: source.sourceType,
          success: false,
          errors: ["Failed to create video record"],
        }
      }
    }

    // Update processing status
    await updateYouTubeVideoProcessingStatus(tenantId, video.id, "processing")

    // Attempt transcript extraction
    let transcript: VideoTranscript | null = null

    if (video.transcriptStatus === "pending" || input.forceTranscription) {
      await updateYouTubeVideoTranscriptStatus(tenantId, video.id, "fetching")

      // Try to get captions first
      const transcriptResult = await this.fetchYouTubeTranscript(videoId)

      if (transcriptResult) {
        transcript = await createVideoTranscript(tenantId, {
          videoId: video.id,
          rawTranscript: transcriptResult.raw,
          normalizedTranscript: transcriptResult.normalized,
          wordCount: this.countWords(transcriptResult.normalized),
          language: transcriptResult.language,
          source: transcriptResult.source,
          confidenceScore: transcriptResult.confidence,
          hasTimestamps: !!transcriptResult.segments,
          timestampedSegments: transcriptResult.segments,
        })

        if (transcript) {
          await updateYouTubeVideoTranscriptStatus(tenantId, video.id, "available", {
            transcriptLanguage: transcriptResult.language,
            transcriptSource: transcriptResult.source,
          })
        } else {
          errors.push("Failed to save transcript")
        }
      } else {
        // No captions available, mark for transcription fallback
        await updateYouTubeVideoTranscriptStatus(tenantId, video.id, "transcribing")
        
        // In production, this would queue for Whisper or AssemblyAI
        // For now, we mark as unavailable
        await updateYouTubeVideoTranscriptStatus(tenantId, video.id, "unavailable", {
          transcriptError: "No captions available, transcription service not configured",
        })
        
        errors.push("Transcript unavailable: no captions and transcription not configured")
      }
    } else {
      // Try to get existing transcript
      transcript = await getTranscriptByVideoId(tenantId, video.id)
    }

    // Generate summaries if transcript available
    const summaries: VideoSummary[] = []
    
    if (transcript && input.generateSummary !== false) {
      const summaryTypes = input.summaryTypes || ["brief", "key_points", "actionable"]
      
      for (const summaryType of summaryTypes) {
        const summary = await this.generateVideoSummary(
          tenantId,
          video,
          transcript,
          summaryType as SummaryType,
          agentContext
        )
        if (summary) {
          summaries.push(summary)
        }
      }

      if (summaries.length > 0) {
        await updateYouTubeVideoProcessingStatus(tenantId, video.id, "summarized")
      }
    }

    // Update final status
    await updateYouTubeVideoProcessingStatus(
      tenantId,
      video.id,
      errors.length === 0 ? "complete" : "error"
    )

    return {
      sourceId: source.id,
      sourceClass: "watch",
      contentType: source.sourceType,
      success: errors.length === 0,
      video: video || undefined,
      transcript: transcript || undefined,
      summaries,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  // ============================================================================
  // YOUTUBE HELPERS
  // ============================================================================

  private extractYouTubeVideoId(url: string): string | null {
    if (!url) return null

    // Handle various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        return match[1]
      }
    }

    return null
  }

  private parseDuration(duration: string): number {
    // Parse ISO 8601 duration (PT1H2M3S)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return 0

    const hours = parseInt(match[1] || "0", 10)
    const minutes = parseInt(match[2] || "0", 10)
    const seconds = parseInt(match[3] || "0", 10)

    return hours * 3600 + minutes * 60 + seconds
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(w => w.length > 0).length
  }

  private async fetchYouTubeMetadata(videoId: string): Promise<YouTubeVideoMetadata | null> {
    // In production, this would call YouTube Data API v3
    // GET https://www.googleapis.com/youtube/v3/videos?id={videoId}&part=snippet,contentDetails
    
    // Mock implementation for development
    console.log(`[YouTube] Fetching metadata for video: ${videoId}`)
    
    // Simulate API delay
    await this.delay(200)

    // Return mock metadata
    return {
      videoId,
      title: `Video ${videoId} - Mock Title`,
      description: `This is a mock description for video ${videoId}. In production, this would contain the actual video description from YouTube.`,
      channelId: `UCmock-channel-${videoId.substring(0, 6)}`,
      channelTitle: "Mock Channel",
      publishedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      thumbnails: {
        default: { url: `https://img.youtube.com/vi/${videoId}/default.jpg`, width: 120, height: 90 },
        medium: { url: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`, width: 320, height: 180 },
        high: { url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`, width: 480, height: 360 },
      },
      duration: `PT${Math.floor(Math.random() * 60) + 5}M${Math.floor(Math.random() * 60)}S`,
      tags: ["marketing", "strategy", "content"],
      categoryId: "22", // People & Blogs
    }
  }

  private async fetchYouTubeStats(videoId: string): Promise<YouTubeVideoStats | null> {
    // In production, this would call YouTube Data API v3
    // GET https://www.googleapis.com/youtube/v3/videos?id={videoId}&part=statistics
    
    console.log(`[YouTube] Fetching stats for video: ${videoId}`)
    await this.delay(100)

    return {
      viewCount: String(Math.floor(Math.random() * 100000) + 1000),
      likeCount: String(Math.floor(Math.random() * 5000) + 100),
      commentCount: String(Math.floor(Math.random() * 500) + 10),
    }
  }

  private async fetchYouTubeTranscript(videoId: string): Promise<YouTubeTranscriptResult | null> {
    // In production, this would:
    // 1. First try YouTube's official captions API
    // 2. Fall back to third-party transcript services
    // 3. Finally fall back to audio transcription (Whisper, AssemblyAI)
    
    console.log(`[YouTube] Fetching transcript for video: ${videoId}`)
    await this.delay(300)

    // Mock: 70% chance of having captions
    const hasCaption = Math.random() > 0.3

    if (!hasCaption) {
      console.log(`[YouTube] No captions available for video: ${videoId}`)
      return null
    }

    // Generate mock transcript
    const mockParagraphs = [
      "Welcome back to the channel. Today we're going to talk about marketing strategy and how to build a successful brand.",
      "The first thing you need to understand is your target audience. Who are they? What do they care about? What problems are they trying to solve?",
      "Once you understand your audience, you can start to craft messaging that resonates with them. This is where brand positioning comes in.",
      "Let's look at some examples of brands that have done this really well. Take Apple for instance. They don't just sell computers, they sell a lifestyle.",
      "Another key element is consistency. Your brand voice, your visual identity, your messaging - it all needs to work together.",
      "Content marketing is also crucial. You need to provide value to your audience before you ask for anything in return.",
      "Social media plays a huge role in modern marketing. But you don't need to be on every platform. Pick the ones where your audience is.",
      "Remember, marketing is a long game. Don't expect overnight results. Build relationships, provide value, and the results will come.",
    ]

    const segments = mockParagraphs.map((text, i) => ({
      startMs: i * 30000,
      endMs: (i + 1) * 30000,
      text,
    }))

    const raw = mockParagraphs.join("\n\n")
    const normalized = this.normalizeTranscript(raw)

    return {
      raw,
      normalized,
      segments,
      source: Math.random() > 0.5 ? "youtube_captions" : "auto_captions",
      language: "en",
      confidence: Math.random() > 0.5 ? 0.95 : 0.85,
    }
  }

  private normalizeTranscript(raw: string): string {
    // Clean up transcript
    let normalized = raw

    // Remove filler words and stuttering
    normalized = normalized.replace(/\b(um|uh|er|ah|like|you know)\b/gi, "")

    // Clean up multiple spaces
    normalized = normalized.replace(/\s+/g, " ")

    // Clean up multiple newlines
    normalized = normalized.replace(/\n{3,}/g, "\n\n")

    // Trim
    normalized = normalized.trim()

    return normalized
  }

  // ============================================================================
  // SUMMARY GENERATION
  // ============================================================================

  private async generateVideoSummary(
    tenantId: string,
    video: YouTubeVideo,
    transcript: VideoTranscript,
    summaryType: SummaryType,
    agentContext: AgentContext
  ): Promise<VideoSummary | null> {
    const router = getRouter()
    if (!router) {
      console.error("[SourceProcessing] LLM router not available")
      return null
    }

    const systemInstructions = this.getSystemInstructions()
    const tenantContext = this.getFormattedContext().tenantKnowledge

    let prompt: string

    switch (summaryType) {
      case "brief":
        prompt = this.buildBriefSummaryPrompt(video, transcript, tenantContext)
        break
      case "key_points":
        prompt = this.buildKeyPointsPrompt(video, transcript, tenantContext)
        break
      case "actionable":
        prompt = this.buildActionablePrompt(video, transcript, tenantContext)
        break
      case "detailed":
        prompt = this.buildDetailedSummaryPrompt(video, transcript, tenantContext)
        break
      case "content_ideas":
        prompt = this.buildContentIdeasPrompt(video, transcript, tenantContext)
        break
      default:
        prompt = this.buildBriefSummaryPrompt(video, transcript, tenantContext)
    }

    try {
      const response = await router.route({
        prompt,
        systemPrompt: systemInstructions,
        maxTokens: summaryType === "detailed" ? 2000 : 1000,
        temperature: 0.7,
      })

      if (!response.content) {
        return null
      }

      // Parse response
      const parsed = this.parseSummaryResponse(response.content, summaryType)

      // Create summary record
      return await createVideoSummary(tenantId, {
        videoId: video.id,
        transcriptId: transcript.id,
        summaryType,
        summary: parsed.summary,
        keyTopics: parsed.keyTopics,
        keyQuotes: parsed.keyQuotes,
        mentionedEntities: parsed.entities,
        sentiment: parsed.sentiment,
        brandRelevanceNotes: parsed.brandRelevance,
        audienceRelevanceNotes: parsed.audienceRelevance,
        strategyRelevanceNotes: parsed.strategyRelevance,
        llmProvider: "anthropic",
        llmModel: response.model || "claude",
        promptTokens: response.usage?.promptTokens,
        completionTokens: response.usage?.completionTokens,
      })
    } catch (error) {
      const err = error as Error
      console.error(`[SourceProcessing] Summary generation failed: ${err.message}`)
      return null
    }
  }

  private buildBriefSummaryPrompt(
    video: YouTubeVideo,
    transcript: VideoTranscript,
    tenantContext: string
  ): string {
    return `
Summarize this video in 1-2 sentences that capture the main point.

Video: ${video.title}
Channel: ${video.channelTitle || "Unknown"}
Duration: ${Math.floor((video.durationSeconds || 0) / 60)} minutes

Transcript:
${transcript.normalizedTranscript || transcript.rawTranscript}

Tenant Context (for relevance assessment):
${tenantContext}

Provide:
1. A brief 1-2 sentence summary
2. 3-5 key topics (comma-separated)
3. Any notable quotes (up to 3)
4. Sentiment (positive/neutral/negative/mixed)
5. Brief note on brand relevance
6. Brief note on audience relevance

Format your response as:
SUMMARY: [your summary]
TOPICS: [topic1, topic2, topic3]
QUOTES: [quote1 | quote2 | quote3]
SENTIMENT: [sentiment]
BRAND_RELEVANCE: [note]
AUDIENCE_RELEVANCE: [note]
`.trim()
  }

  private buildKeyPointsPrompt(
    video: YouTubeVideo,
    transcript: VideoTranscript,
    tenantContext: string
  ): string {
    return `
Extract the key points from this video as bullet points.

Video: ${video.title}
Channel: ${video.channelTitle || "Unknown"}

Transcript:
${transcript.normalizedTranscript || transcript.rawTranscript}

Tenant Context (for relevance assessment):
${tenantContext}

Provide:
1. 5-10 key points as bullet items
2. 3-5 key topics
3. Any notable quotes
4. Sentiment assessment
5. Strategic relevance note

Format your response as:
SUMMARY:
- [point 1]
- [point 2]
- [point 3]
(etc.)

TOPICS: [topic1, topic2, topic3]
QUOTES: [quote1 | quote2]
SENTIMENT: [sentiment]
STRATEGY_RELEVANCE: [note]
`.trim()
  }

  private buildActionablePrompt(
    video: YouTubeVideo,
    transcript: VideoTranscript,
    tenantContext: string
  ): string {
    return `
Extract actionable takeaways from this video that could inform content strategy or marketing.

Video: ${video.title}
Channel: ${video.channelTitle || "Unknown"}

Transcript:
${transcript.normalizedTranscript || transcript.rawTranscript}

Tenant Context:
${tenantContext}

Provide:
1. 3-7 actionable takeaways (things to try/implement)
2. Key topics
3. Strategic usefulness note
4. Specific recommendations for the tenant

Format your response as:
SUMMARY:
- ACTION: [action 1]
- ACTION: [action 2]
- ACTION: [action 3]

TOPICS: [topic1, topic2]
STRATEGY_RELEVANCE: [how this applies to the tenant]
`.trim()
  }

  private buildDetailedSummaryPrompt(
    video: YouTubeVideo,
    transcript: VideoTranscript,
    tenantContext: string
  ): string {
    return `
Provide a comprehensive summary of this video.

Video: ${video.title}
Channel: ${video.channelTitle || "Unknown"}
Duration: ${Math.floor((video.durationSeconds || 0) / 60)} minutes

Transcript:
${transcript.normalizedTranscript || transcript.rawTranscript}

Tenant Context:
${tenantContext}

Provide:
1. Detailed summary (3-5 paragraphs)
2. All key topics covered
3. Notable quotes
4. People/brands/products mentioned
5. Sentiment
6. Brand, audience, and strategy relevance notes

Format your response as:
SUMMARY:
[Your detailed summary here]

TOPICS: [topic1, topic2, topic3, ...]
QUOTES: [quote1 | quote2 | ...]
ENTITIES: [entity1, entity2, ...]
SENTIMENT: [sentiment]
BRAND_RELEVANCE: [note]
AUDIENCE_RELEVANCE: [note]
STRATEGY_RELEVANCE: [note]
`.trim()
  }

  private buildContentIdeasPrompt(
    video: YouTubeVideo,
    transcript: VideoTranscript,
    tenantContext: string
  ): string {
    return `
Based on this video, generate content ideas that could work for the tenant.

Video: ${video.title}
Channel: ${video.channelTitle || "Unknown"}

Transcript:
${transcript.normalizedTranscript || transcript.rawTranscript}

Tenant Context:
${tenantContext}

Provide:
1. 5-10 content ideas inspired by this video (adapted for the tenant)
2. Topics to explore further
3. How this content could be repurposed

Format your response as:
SUMMARY:
CONTENT IDEAS:
- [idea 1]
- [idea 2]
- [idea 3]

TOPICS: [topic1, topic2]
STRATEGY_RELEVANCE: [how to use these ideas]
`.trim()
  }

  private parseSummaryResponse(
    response: string,
    summaryType: SummaryType
  ): {
    summary: string
    keyTopics?: string[]
    keyQuotes?: string[]
    entities?: string[]
    sentiment?: VideoSummary["sentiment"]
    brandRelevance?: string
    audienceRelevance?: string
    strategyRelevance?: string
  } {
    const result: ReturnType<typeof this.parseSummaryResponse> = {
      summary: "",
    }

    // Extract summary
    const summaryMatch = response.match(/SUMMARY:\s*([\s\S]*?)(?=\n(?:TOPICS|QUOTES|ENTITIES|SENTIMENT|BRAND_RELEVANCE|AUDIENCE_RELEVANCE|STRATEGY_RELEVANCE):|$)/i)
    if (summaryMatch) {
      result.summary = summaryMatch[1].trim()
    } else {
      result.summary = response.trim()
    }

    // Extract topics
    const topicsMatch = response.match(/TOPICS:\s*(.+?)(?=\n[A-Z_]+:|$)/i)
    if (topicsMatch) {
      result.keyTopics = topicsMatch[1].split(/[,|]/).map(t => t.trim()).filter(Boolean)
    }

    // Extract quotes
    const quotesMatch = response.match(/QUOTES:\s*(.+?)(?=\n[A-Z_]+:|$)/i)
    if (quotesMatch) {
      result.keyQuotes = quotesMatch[1].split(/\|/).map(q => q.trim()).filter(Boolean)
    }

    // Extract entities
    const entitiesMatch = response.match(/ENTITIES:\s*(.+?)(?=\n[A-Z_]+:|$)/i)
    if (entitiesMatch) {
      result.entities = entitiesMatch[1].split(/[,|]/).map(e => e.trim()).filter(Boolean)
    }

    // Extract sentiment
    const sentimentMatch = response.match(/SENTIMENT:\s*(\w+)/i)
    if (sentimentMatch) {
      const sentiment = sentimentMatch[1].toLowerCase()
      if (["positive", "neutral", "negative", "mixed"].includes(sentiment)) {
        result.sentiment = sentiment as VideoSummary["sentiment"]
      }
    }

    // Extract relevance notes
    const brandMatch = response.match(/BRAND_RELEVANCE:\s*(.+?)(?=\n[A-Z_]+:|$)/i)
    if (brandMatch) {
      result.brandRelevance = brandMatch[1].trim()
    }

    const audienceMatch = response.match(/AUDIENCE_RELEVANCE:\s*(.+?)(?=\n[A-Z_]+:|$)/i)
    if (audienceMatch) {
      result.audienceRelevance = audienceMatch[1].trim()
    }

    const strategyMatch = response.match(/STRATEGY_RELEVANCE:\s*(.+?)(?=\n[A-Z_]+:|$)/i)
    if (strategyMatch) {
      result.strategyRelevance = strategyMatch[1].trim()
    }

    return result
  }

  // ============================================================================
  // READ SOURCE PROCESSING
  // ============================================================================

  private async processReadSource(
    tenantId: string,
    source: IntelSource,
    input: SourceProcessingInput,
    agentContext: AgentContext
  ): Promise<SourceProcessingOutput> {
    // In production, this would:
    // 1. Fetch the article content
    // 2. Extract text from HTML
    // 3. Generate summary
    // 4. Score for relevance

    console.log(`[SourceProcessing] Processing read source: ${source.name}`)

    // Mock processing
    await this.delay(200)

    return {
      sourceId: source.id,
      sourceClass: "read",
      contentType: source.sourceType,
      success: true,
      processedContent: {
        contentClass: "read",
        contentType: source.sourceType,
        title: source.name,
        originalUrl: source.url,
        originalAuthor: source.authorName,
        summary: `Mock summary for ${source.name}. In production, this would contain an AI-generated summary of the article content.`,
        keyPoints: [
          "Key point 1 from the article",
          "Key point 2 from the article",
          "Key point 3 from the article",
        ],
        topics: ["marketing", "strategy", "content"],
        language: "en",
      },
    }
  }

  // ============================================================================
  // FOLLOW SOURCE PROCESSING
  // ============================================================================

  private async processFollowSource(
    tenantId: string,
    source: IntelSource,
    input: SourceProcessingInput,
    agentContext: AgentContext
  ): Promise<SourceProcessingOutput> {
    // In production, this would:
    // 1. Fetch recent posts/content from the account
    // 2. Analyze content themes
    // 3. Extract engagement metrics
    // 4. Identify relevant content for the tenant

    console.log(`[SourceProcessing] Processing follow source: ${source.name}`)

    await this.delay(200)

    return {
      sourceId: source.id,
      sourceClass: "follow",
      contentType: source.sourceType,
      success: true,
      processedContent: {
        contentClass: "follow",
        contentType: source.sourceType,
        title: source.name,
        originalUrl: source.url,
        summary: `Profile analysis for ${source.handle || source.name}. In production, this would analyze recent posts and content themes.`,
        topics: ["content creator", "industry expert"],
        language: "en",
      },
    }
  }
}

// ============================================================================
// EXPORT INSTANCE
// ============================================================================

export const sourceProcessingAgent = new SourceProcessingAgent()

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export async function processSource(
  tenantId: string,
  sourceId: string,
  options?: {
    videoUrl?: string
    forceTranscription?: boolean
    generateSummary?: boolean
    summaryTypes?: SummaryType[]
  }
): Promise<SourceProcessingOutput | null> {
  const agent = new SourceProcessingAgent()

  // Build minimal pipeline context
  const context: PipelineContext = {
    tenantId,
    runId: `processing-${Date.now()}`,
    tenant: {
      id: tenantId,
      userId: "",
      businessName: "",
      businessType: "",
      contactEmail: "",
      pipelineStage: "research",
      createdAt: new Date(),
    },
    config: {
      maxRetries: 2,
      retryDelayMs: 2000,
      timeoutMs: 300000,
      enableResearch: true,
      enableClarification: false,
      minConfidenceThreshold: 0.5,
      testMode: false,
    },
    startedAt: new Date(),
    previousResponses: {},
  }

  const input: SourceProcessingInput = {
    tenantId,
    sourceId,
    videoUrl: options?.videoUrl,
    forceTranscription: options?.forceTranscription,
    generateSummary: options?.generateSummary,
    summaryTypes: options?.summaryTypes,
  }

  const result = await agent.run(context, input)

  if (result.success && result.data) {
    return result.data
  }

  console.error("Source processing failed:", result.error)
  return null
}

export async function processYouTubeVideo(
  tenantId: string,
  videoUrl: string,
  options?: {
    sourceId?: string
    generateSummary?: boolean
    summaryTypes?: SummaryType[]
  }
): Promise<SourceProcessingOutput | null> {
  // If no sourceId provided, create a temporary source
  const sourceId = options?.sourceId || `temp-youtube-${Date.now()}`

  return processSource(tenantId, sourceId, {
    videoUrl,
    generateSummary: options?.generateSummary ?? true,
    summaryTypes: options?.summaryTypes || ["brief", "key_points", "actionable"],
  })
}
