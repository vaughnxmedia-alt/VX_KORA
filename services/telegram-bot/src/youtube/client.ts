/**
 * YouTube API Client
 * 
 * Handles communication with YouTube Data API v3
 * for metadata, statistics, and caption information.
 */

import type {
  YouTubeClientConfig,
  VideoMetadata,
  VideoStats,
  CaptionTrack,
} from "./types"

// ============================================================================
// YOUTUBE CLIENT
// ============================================================================

export class YouTubeClient {
  private apiKey?: string
  private cache: Map<string, { data: unknown; timestamp: number }>
  private cacheTimeMs: number

  constructor(config: YouTubeClientConfig = {}) {
    this.apiKey = config.apiKey || process.env.YOUTUBE_API_KEY
    this.cache = new Map()
    this.cacheTimeMs = config.cacheTimeMs || 3600000 // 1 hour default
  }

  // ============================================================================
  // VIDEO METADATA
  // ============================================================================

  async getVideoMetadata(videoId: string): Promise<VideoMetadata | null> {
    const cacheKey = `metadata:${videoId}`
    const cached = this.getFromCache<VideoMetadata>(cacheKey)
    if (cached) return cached

    try {
      if (this.apiKey) {
        // Production: Use YouTube Data API
        const metadata = await this.fetchMetadataFromApi(videoId)
        if (metadata) {
          this.setCache(cacheKey, metadata)
        }
        return metadata
      } else {
        // Development: Use mock data
        console.log(`[YouTubeClient] No API key, using mock data for video: ${videoId}`)
        return this.getMockMetadata(videoId)
      }
    } catch (error) {
      const err = error as Error
      console.error(`[YouTubeClient] Failed to get metadata for ${videoId}:`, err.message)
      return null
    }
  }

  private async fetchMetadataFromApi(videoId: string): Promise<VideoMetadata | null> {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos")
    url.searchParams.set("id", videoId)
    url.searchParams.set("part", "snippet,contentDetails")
    url.searchParams.set("key", this.apiKey!)

    const response = await fetch(url.toString())
    
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    if (!data.items || data.items.length === 0) {
      return null
    }

    const item = data.items[0]
    const snippet = item.snippet
    const contentDetails = item.contentDetails

    return {
      videoId,
      title: snippet.title,
      description: snippet.description,
      channelId: snippet.channelId,
      channelTitle: snippet.channelTitle,
      publishedAt: snippet.publishedAt,
      thumbnails: snippet.thumbnails,
      duration: contentDetails.duration,
      tags: snippet.tags,
      categoryId: snippet.categoryId,
    }
  }

  private getMockMetadata(videoId: string): VideoMetadata {
    return {
      videoId,
      title: `Mock Video: ${videoId}`,
      description: "This is mock video data for development. In production, this would be fetched from YouTube Data API.",
      channelId: `UCmock-${videoId.substring(0, 6)}`,
      channelTitle: "Mock Channel",
      publishedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      thumbnails: {
        default: { url: `https://img.youtube.com/vi/${videoId}/default.jpg`, width: 120, height: 90 },
        medium: { url: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`, width: 320, height: 180 },
        high: { url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`, width: 480, height: 360 },
      },
      duration: `PT${Math.floor(Math.random() * 30) + 5}M${Math.floor(Math.random() * 60)}S`,
      tags: ["marketing", "strategy", "content", "tutorial"],
      categoryId: "22",
    }
  }

  // ============================================================================
  // VIDEO STATISTICS
  // ============================================================================

  async getVideoStats(videoId: string): Promise<VideoStats | null> {
    const cacheKey = `stats:${videoId}`
    const cached = this.getFromCache<VideoStats>(cacheKey)
    if (cached) return cached

    try {
      if (this.apiKey) {
        const stats = await this.fetchStatsFromApi(videoId)
        if (stats) {
          this.setCache(cacheKey, stats)
        }
        return stats
      } else {
        return this.getMockStats()
      }
    } catch (error) {
      const err = error as Error
      console.error(`[YouTubeClient] Failed to get stats for ${videoId}:`, err.message)
      return null
    }
  }

  private async fetchStatsFromApi(videoId: string): Promise<VideoStats | null> {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos")
    url.searchParams.set("id", videoId)
    url.searchParams.set("part", "statistics")
    url.searchParams.set("key", this.apiKey!)

    const response = await fetch(url.toString())
    
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.items || data.items.length === 0) {
      return null
    }

    const stats = data.items[0].statistics

    return {
      viewCount: parseInt(stats.viewCount || "0", 10),
      likeCount: parseInt(stats.likeCount || "0", 10),
      commentCount: parseInt(stats.commentCount || "0", 10),
    }
  }

  private getMockStats(): VideoStats {
    return {
      viewCount: Math.floor(Math.random() * 100000) + 1000,
      likeCount: Math.floor(Math.random() * 5000) + 100,
      commentCount: Math.floor(Math.random() * 500) + 10,
    }
  }

  // ============================================================================
  // CAPTION TRACKS
  // ============================================================================

  async getCaptionTracks(videoId: string): Promise<CaptionTrack[]> {
    const cacheKey = `captions:${videoId}`
    const cached = this.getFromCache<CaptionTrack[]>(cacheKey)
    if (cached) return cached

    try {
      if (this.apiKey) {
        const tracks = await this.fetchCaptionTracksFromApi(videoId)
        this.setCache(cacheKey, tracks)
        return tracks
      } else {
        return this.getMockCaptionTracks()
      }
    } catch (error) {
      const err = error as Error
      console.error(`[YouTubeClient] Failed to get caption tracks for ${videoId}:`, err.message)
      return []
    }
  }

  private async fetchCaptionTracksFromApi(videoId: string): Promise<CaptionTrack[]> {
    const url = new URL("https://www.googleapis.com/youtube/v3/captions")
    url.searchParams.set("videoId", videoId)
    url.searchParams.set("part", "snippet")
    url.searchParams.set("key", this.apiKey!)

    const response = await fetch(url.toString())
    
    if (!response.ok) {
      // 403 often means captions are disabled
      if (response.status === 403) {
        return []
      }
      throw new Error(`YouTube API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.items) {
      return []
    }

    return data.items.map((item: Record<string, unknown>) => {
      const snippet = item.snippet as Record<string, unknown>
      return {
        id: item.id as string,
        language: snippet.language as string,
        languageName: snippet.name as string || snippet.language as string,
        isAutoGenerated: snippet.trackKind === "ASR",
        isTranslatable: snippet.isTranslatable as boolean || false,
      }
    })
  }

  private getMockCaptionTracks(): CaptionTrack[] {
    // 70% chance of having captions
    if (Math.random() > 0.3) {
      const tracks: CaptionTrack[] = [
        {
          id: "mock-en",
          language: "en",
          languageName: "English",
          isAutoGenerated: Math.random() > 0.5,
          isTranslatable: true,
        },
      ]

      // 30% chance of having additional languages
      if (Math.random() > 0.7) {
        tracks.push({
          id: "mock-es",
          language: "es",
          languageName: "Spanish",
          isAutoGenerated: true,
          isTranslatable: false,
        })
      }

      return tracks
    }

    return []
  }

  // ============================================================================
  // CACHE HELPERS
  // ============================================================================

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > this.cacheTimeMs) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  clearCache(): void {
    this.cache.clear()
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  static extractVideoId(url: string): string | null {
    if (!url) return null

    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        return match[1]
      }
    }

    return null
  }

  static parseDuration(duration: string): number {
    // Parse ISO 8601 duration (PT1H2M3S)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return 0

    const hours = parseInt(match[1] || "0", 10)
    const minutes = parseInt(match[2] || "0", 10)
    const seconds = parseInt(match[3] || "0", 10)

    return hours * 3600 + minutes * 60 + seconds
  }

  static formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
    }
    return `${m}:${s.toString().padStart(2, "0")}`
  }
}

// ============================================================================
// FACTORY
// ============================================================================

let defaultClient: YouTubeClient | null = null

export function createYouTubeClient(config?: YouTubeClientConfig): YouTubeClient {
  return new YouTubeClient(config)
}

export function getYouTubeClient(): YouTubeClient {
  if (!defaultClient) {
    defaultClient = new YouTubeClient()
  }
  return defaultClient
}
