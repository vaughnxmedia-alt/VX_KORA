/**
 * YouTube Processing Pipeline
 * 
 * End-to-end pipeline for processing YouTube videos:
 * 1. Fetch video metadata
 * 2. Extract or transcribe content
 * 3. Store results in database
 * 4. Queue for intelligence scoring
 */

import { YouTubeClient, getYouTubeClient } from "./client"
import { TranscriptExtractor, getTranscriptExtractor } from "./transcript"
import type {
  VideoMetadata,
  VideoStats,
  TranscriptExtractionResult,
  YouTubePipelineResult,
} from "./types"
import {
  createYouTubeVideo,
  getYouTubeVideoByVideoId,
  updateYouTubeVideoTranscriptStatus,
  updateYouTubeVideoProcessingStatus,
  createVideoTranscript,
} from "../db/sources"

// ============================================================================
// PIPELINE CONFIGURATION
// ============================================================================

export interface YouTubePipelineConfig {
  client?: YouTubeClient
  transcriptExtractor?: TranscriptExtractor
  autoScore?: boolean
  autoRoute?: boolean
}

// ============================================================================
// YOUTUBE PIPELINE
// ============================================================================

export class YouTubePipeline {
  private client: YouTubeClient
  private transcriptExtractor: TranscriptExtractor
  private autoScore: boolean
  private autoRoute: boolean

  constructor(config: YouTubePipelineConfig = {}) {
    this.client = config.client || getYouTubeClient()
    this.transcriptExtractor = config.transcriptExtractor || getTranscriptExtractor()
    this.autoScore = config.autoScore ?? true
    this.autoRoute = config.autoRoute ?? false
  }

  // ============================================================================
  // MAIN PIPELINE
  // ============================================================================

  async process(
    tenantId: string,
    videoIdOrUrl: string,
    options?: {
      sourceId?: string
      forceRefresh?: boolean
      skipTranscript?: boolean
    }
  ): Promise<YouTubePipelineResult> {
    const startTime = Date.now()
    const errors: string[] = []

    // Extract video ID
    const videoId = YouTubeClient.extractVideoId(videoIdOrUrl) || videoIdOrUrl
    if (!videoId || videoId.length !== 11) {
      return {
        success: false,
        videoId: videoIdOrUrl,
        processed: false,
        processingTimeMs: Date.now() - startTime,
        errors: ["Invalid YouTube video ID or URL"],
      }
    }

    console.log(`[YouTubePipeline] Processing video: ${videoId} for tenant: ${tenantId}`)

    // Check for existing record
    let existingVideo = await getYouTubeVideoByVideoId(tenantId, videoId)
    if (existingVideo && !options?.forceRefresh) {
      console.log(`[YouTubePipeline] Video already exists in database`)
      
      // Return existing data if transcript is already available
      if (
        existingVideo.transcriptStatus === "available" ||
        existingVideo.transcriptStatus === "transcribed"
      ) {
        return {
          success: true,
          videoId,
          metadata: this.videoToMetadata(existingVideo),
          processed: true,
          processingTimeMs: Date.now() - startTime,
          errors: [],
        }
      }
    }

    // Step 1: Fetch metadata
    const metadata = await this.client.getVideoMetadata(videoId)
    if (!metadata) {
      return {
        success: false,
        videoId,
        processed: false,
        processingTimeMs: Date.now() - startTime,
        errors: ["Failed to fetch video metadata"],
      }
    }

    // Step 2: Fetch stats
    const stats = await this.client.getVideoStats(videoId)

    // Step 3: Create or update video record
    if (!existingVideo) {
      existingVideo = await createYouTubeVideo(tenantId, {
        sourceId: options?.sourceId,
        videoId,
        url: `https://youtube.com/watch?v=${videoId}`,
        title: metadata.title,
        description: metadata.description,
        channelId: metadata.channelId,
        channelTitle: metadata.channelTitle,
        thumbnailUrl: metadata.thumbnails.high?.url || metadata.thumbnails.default?.url,
        durationSeconds: YouTubeClient.parseDuration(metadata.duration),
        publishedAt: new Date(metadata.publishedAt),
        viewCount: stats?.viewCount,
        likeCount: stats?.likeCount,
        commentCount: stats?.commentCount,
        tags: metadata.tags,
        categoryId: metadata.categoryId,
      })

      if (!existingVideo) {
        return {
          success: false,
          videoId,
          metadata,
          stats: stats || undefined,
          processed: false,
          processingTimeMs: Date.now() - startTime,
          errors: ["Failed to create video record"],
        }
      }
    }

    // Step 4: Update processing status
    await updateYouTubeVideoProcessingStatus(tenantId, existingVideo.id, "processing")

    // Step 5: Extract transcript
    let transcript: TranscriptExtractionResult | undefined

    if (!options?.skipTranscript) {
      await updateYouTubeVideoTranscriptStatus(tenantId, existingVideo.id, "fetching")

      transcript = await this.transcriptExtractor.extract(videoId)

      if (transcript.success && transcript.rawTranscript) {
        // Store transcript
        const storedTranscript = await createVideoTranscript(tenantId, {
          videoId: existingVideo.id,
          rawTranscript: transcript.rawTranscript,
          normalizedTranscript: transcript.normalizedTranscript,
          wordCount: transcript.wordCount,
          durationCoveredSeconds: transcript.durationCoveredSeconds,
          language: transcript.language || "en",
          source: transcript.source || "youtube_captions",
          confidenceScore: transcript.confidence,
          hasTimestamps: !!transcript.segments,
          timestampedSegments: transcript.segments,
        })

        if (storedTranscript) {
          await updateYouTubeVideoTranscriptStatus(
            tenantId,
            existingVideo.id,
            transcript.source === "auto_captions" ? "available" : "available",
            {
              transcriptLanguage: transcript.language,
              transcriptSource: transcript.source,
            }
          )
        } else {
          errors.push("Failed to store transcript")
          await updateYouTubeVideoTranscriptStatus(tenantId, existingVideo.id, "error", {
            transcriptError: "Failed to store transcript in database",
          })
        }
      } else {
        // No transcript available
        const transcriptStatus = transcript.source === "whisper" || transcript.source === "assembly_ai"
          ? "transcribing"
          : "unavailable"
        
        await updateYouTubeVideoTranscriptStatus(tenantId, existingVideo.id, transcriptStatus, {
          transcriptError: transcript.error,
        })
        
        if (transcript.error) {
          errors.push(transcript.error)
        }
      }
    }

    // Step 6: Update final status
    await updateYouTubeVideoProcessingStatus(
      tenantId,
      existingVideo.id,
      errors.length === 0 ? "complete" : "error"
    )

    return {
      success: errors.length === 0,
      videoId,
      metadata,
      stats: stats || undefined,
      transcript,
      processed: true,
      processingTimeMs: Date.now() - startTime,
      errors,
    }
  }

  // ============================================================================
  // BATCH PROCESSING
  // ============================================================================

  async processBatch(
    tenantId: string,
    videoIds: string[],
    options?: {
      sourceId?: string
      concurrency?: number
      stopOnError?: boolean
    }
  ): Promise<Map<string, YouTubePipelineResult>> {
    const results = new Map<string, YouTubePipelineResult>()
    const concurrency = options?.concurrency || 3

    console.log(`[YouTubePipeline] Batch processing ${videoIds.length} videos with concurrency ${concurrency}`)

    // Process in batches
    for (let i = 0; i < videoIds.length; i += concurrency) {
      const batch = videoIds.slice(i, i + concurrency)
      
      const batchPromises = batch.map(async (videoId) => {
        const result = await this.process(tenantId, videoId, {
          sourceId: options?.sourceId,
        })
        return { videoId, result }
      })

      const batchResults = await Promise.all(batchPromises)

      for (const { videoId, result } of batchResults) {
        results.set(videoId, result)

        if (options?.stopOnError && !result.success) {
          console.log(`[YouTubePipeline] Stopping batch due to error on video: ${videoId}`)
          return results
        }
      }

      // Small delay between batches to avoid rate limits
      if (i + concurrency < videoIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    const successful = [...results.values()].filter(r => r.success).length
    console.log(`[YouTubePipeline] Batch complete: ${successful}/${videoIds.length} successful`)

    return results
  }

  // ============================================================================
  // CHANNEL PROCESSING
  // ============================================================================

  async processChannel(
    tenantId: string,
    channelId: string,
    options?: {
      maxVideos?: number
      newerThan?: Date
      sourceId?: string
    }
  ): Promise<{
    channelId: string
    videosFound: number
    videosProcessed: number
    results: Map<string, YouTubePipelineResult>
  }> {
    console.log(`[YouTubePipeline] Processing channel: ${channelId}`)

    // In production, this would:
    // 1. Fetch channel's uploads playlist
    // 2. Get video list
    // 3. Filter by date if specified
    // 4. Process each video

    // Mock implementation
    const mockVideoIds = [
      "dQw4w9WgXcQ",
      "jNQXAC9IVRw",
      "9bZkp7q19f0",
    ].slice(0, options?.maxVideos || 10)

    const results = await this.processBatch(tenantId, mockVideoIds, {
      sourceId: options?.sourceId,
      concurrency: 2,
    })

    return {
      channelId,
      videosFound: mockVideoIds.length,
      videosProcessed: results.size,
      results,
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private videoToMetadata(video: {
    videoId: string
    title: string
    description?: string
    channelId?: string
    channelTitle?: string
    publishedAt?: Date
    thumbnailUrl?: string
    durationSeconds?: number
    tags?: string[]
    categoryId?: string
  }): VideoMetadata {
    return {
      videoId: video.videoId,
      title: video.title,
      description: video.description || "",
      channelId: video.channelId || "",
      channelTitle: video.channelTitle || "",
      publishedAt: video.publishedAt?.toISOString() || new Date().toISOString(),
      thumbnails: {
        high: video.thumbnailUrl ? { url: video.thumbnailUrl, width: 480, height: 360 } : undefined,
      },
      duration: video.durationSeconds 
        ? `PT${Math.floor(video.durationSeconds / 60)}M${video.durationSeconds % 60}S`
        : "PT0S",
      tags: video.tags,
      categoryId: video.categoryId || "22",
    }
  }
}

// ============================================================================
// FACTORY
// ============================================================================

let defaultPipeline: YouTubePipeline | null = null

export function getYouTubePipeline(): YouTubePipeline {
  if (!defaultPipeline) {
    defaultPipeline = new YouTubePipeline()
  }
  return defaultPipeline
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export async function processYouTubeUrl(
  tenantId: string,
  url: string,
  options?: {
    sourceId?: string
    forceRefresh?: boolean
  }
): Promise<YouTubePipelineResult> {
  const pipeline = getYouTubePipeline()
  return pipeline.process(tenantId, url, options)
}

export async function batchProcessYouTubeUrls(
  tenantId: string,
  urls: string[],
  options?: {
    sourceId?: string
    concurrency?: number
  }
): Promise<Map<string, YouTubePipelineResult>> {
  const pipeline = getYouTubePipeline()
  
  const videoIds = urls
    .map(url => YouTubeClient.extractVideoId(url) || url)
    .filter(id => id && id.length === 11)

  return pipeline.processBatch(tenantId, videoIds, options)
}
