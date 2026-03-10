/**
 * Insight & Content Types
 * 
 * TypeScript types for the insight and content draft system.
 */

// Content Preferences (stored in intel_content_preferences table)
export interface ContentPreferences {
  primaryUseCase: "pr_industry" | "podcast_creator" | "general"
  platformPriority: string[]
  contentTone: "professional" | "casual" | "creator"
  focusTopics: string[]
  industryFocus?: string[]
  podcastName?: string
  podcastThemes?: string[]
  newsSourcesPriority?: string[]
  includeHashtags?: boolean
  includePostingTimes?: boolean
  includeVisualSuggestions?: boolean
  preferredContentLength?: "short" | "medium" | "long"
}

// Delivery Schedule (stored in intel_delivery_schedules table)
export interface DeliverySchedule {
  id: string
  tenantId: string
  telegramId: number
  scheduleType: "daily" | "weekly"
  deliveryTime: string
  deliveryDay: string | null
  timezone: string
  reportType: "insight" | "content_3day" | "content_5day"
  isActive: boolean
  lastDeliveredAt: Date | null
  nextDeliveryAt: Date | null
  deliveryCount: number
  errorCount: number
  lastError: string | null
}

// Insight Report (stored in intel_insight_reports table)
export interface InsightReport {
  id: string
  tenantId: string
  reportDate: Date
  reportType: "daily" | "weekly" | "on_demand"
  topStories: TopStory[]
  strategicTakeaways: string[]
  trendingTopics: TrendingTopic[]
  contentOpportunities: ContentOpportunity[]
  sourcesReferenced: string[]
  newsApiQueries: string[]
  confidenceScore: number
  relevanceScore: number
  telegramMessageId?: number
  deliveredAt?: Date
}

export interface TopStory {
  headline: string
  source: string
  sourceUrl: string
  summary: string
  strategicAngle: string
  relevanceScore: number
  publishedAt?: string
}

export interface TrendingTopic {
  topic: string
  whyItMatters: string
  contentOpportunity: string
  platforms: string[]
}

export interface ContentOpportunity {
  idea: string
  format: string
  platform: string
  timeliness: "urgent" | "this_week" | "evergreen"
  hookSuggestion?: string
}

// Content Draft (stored in intel_content_drafts table)
export interface ContentDraft {
  id: string
  tenantId: string
  strategyType: "3day" | "5day"
  startDate: Date
  themeOverview: string
  contentPillarsUsed: string[]
  dailyContent: DayContent[]
  confidenceScore: number
  telegramMessageIds?: number[]
  deliveredAt?: Date
  feedbackRating?: number
  feedbackNotes?: string
}

export interface DayContent {
  dayNumber: number
  date: string
  dayOfWeek: string
  theme: string
  themeDescription: string
  posts: PlatformPost[]
}

export interface PlatformPost {
  platform: string
  postType: "image" | "carousel" | "reel" | "video" | "story" | "text"
  caption: string
  hashtags: string[]
  visualDescription: string
  bestPostingTime: string
  callToAction: string
  hookLine?: string
  scriptOutline?: string[]
}

// Use case templates
export const USE_CASE_TEMPLATES: Record<string, Partial<ContentPreferences>> = {
  pr_industry: {
    primaryUseCase: "pr_industry",
    platformPriority: ["linkedin", "instagram", "twitter"],
    contentTone: "professional",
    focusTopics: [
      "creator economy",
      "brand controversies",
      "PR crises",
      "viral marketing",
      "influencer partnerships"
    ],
    industryFocus: [
      "marketing",
      "public_relations",
      "creator_economy",
      "social_media"
    ],
    newsSourcesPriority: ["PR Week", "Ad Age", "Marketing Week", "Digiday"]
  },
  podcast_creator: {
    primaryUseCase: "podcast_creator",
    platformPriority: ["youtube", "tiktok", "instagram"],
    contentTone: "creator",
    focusTopics: [
      "filmmaking",
      "content creation",
      "AI tools",
      "video production",
      "storytelling"
    ],
    podcastThemes: [
      "filmmaking techniques",
      "content creation technology",
      "AI in media",
      "managing content workflows"
    ]
  },
  general: {
    primaryUseCase: "general",
    platformPriority: ["instagram", "linkedin"],
    contentTone: "professional",
    focusTopics: ["industry trends", "marketing", "content strategy"]
  }
}

// Platform metadata
export const PLATFORM_CONFIG: Record<string, {
  name: string
  emoji: string
  supportedPostTypes: PlatformPost["postType"][]
  optimalPostTimes: Record<string, string>
  hashtagLimit: number
}> = {
  instagram: {
    name: "Instagram",
    emoji: "📸",
    supportedPostTypes: ["image", "carousel", "reel", "story"],
    optimalPostTimes: {
      monday: "11:00 AM",
      tuesday: "10:00 AM",
      wednesday: "11:00 AM",
      thursday: "12:00 PM",
      friday: "10:00 AM",
      saturday: "9:00 AM",
      sunday: "10:00 AM"
    },
    hashtagLimit: 30
  },
  tiktok: {
    name: "TikTok",
    emoji: "🎵",
    supportedPostTypes: ["reel", "video"],
    optimalPostTimes: {
      monday: "6:00 PM",
      tuesday: "2:00 PM",
      wednesday: "7:00 PM",
      thursday: "9:00 PM",
      friday: "5:00 PM",
      saturday: "11:00 AM",
      sunday: "4:00 PM"
    },
    hashtagLimit: 5
  },
  youtube: {
    name: "YouTube",
    emoji: "▶️",
    supportedPostTypes: ["video"],
    optimalPostTimes: {
      monday: "2:00 PM",
      tuesday: "4:00 PM",
      wednesday: "3:00 PM",
      thursday: "5:00 PM",
      friday: "3:00 PM",
      saturday: "9:00 AM",
      sunday: "10:00 AM"
    },
    hashtagLimit: 15
  },
  linkedin: {
    name: "LinkedIn",
    emoji: "💼",
    supportedPostTypes: ["text", "image", "carousel", "video"],
    optimalPostTimes: {
      monday: "8:00 AM",
      tuesday: "9:00 AM",
      wednesday: "12:00 PM",
      thursday: "8:00 AM",
      friday: "9:00 AM",
      saturday: "10:00 AM",
      sunday: "7:00 PM"
    },
    hashtagLimit: 5
  },
  twitter: {
    name: "X (Twitter)",
    emoji: "🐦",
    supportedPostTypes: ["text", "image", "video"],
    optimalPostTimes: {
      monday: "9:00 AM",
      tuesday: "9:00 AM",
      wednesday: "9:00 AM",
      thursday: "9:00 AM",
      friday: "9:00 AM",
      saturday: "10:00 AM",
      sunday: "10:00 AM"
    },
    hashtagLimit: 3
  }
}
