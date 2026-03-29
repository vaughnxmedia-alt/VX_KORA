/**
 * Intelligence Filter Types for KORA Intelligence System
 * Defines tenant-specific filtering preferences for how KORA searches, filters, parses, and prioritizes data
 */

import type { SourceType } from "./sources"

export type SummaryStyle = "brief" | "detailed" | "executive"
export type StrategyStyle = "actionable" | "analytical" | "creative"
export type TelegramBriefStyle = "bullet" | "narrative" | "mixed"
export type ParsingDepth = "shallow" | "medium" | "deep"
export type TranscriptPriority = "high" | "medium" | "low"

export interface IntelligenceFilterProfile {
  id: string
  tenant_id: string
  name: string
  description: string | null
  is_default: boolean
  is_active: boolean

  // Topic filters
  include_topics: string[]
  exclude_topics: string[]

  // Keyword filters
  include_keywords: string[]
  exclude_keywords: string[]

  // Source type preferences
  preferred_source_types: SourceType[]
  ignored_source_types: SourceType[]

  // Entity filters
  include_entities: string[]
  exclude_entities: string[]

  // Focus areas
  audience_focus: string[]
  platform_focus: string[]
  industry_focus: string[]
  geography_focus: string[]

  // Signal prioritization
  signal_types_to_prioritize: SignalType[]
  signal_types_to_ignore: SignalType[]

  // Processing limits
  max_sources_per_run: number
  max_items_per_source: number

  // Output style preferences
  summary_style: SummaryStyle
  strategy_style: StrategyStyle
  telegram_brief_style: TelegramBriefStyle

  // Approval and routing
  require_manual_approval_for_rag: boolean
  allow_auto_route_to_rag: boolean
  allow_make_me_smarter: boolean

  // Processing preferences
  parsing_depth: ParsingDepth
  transcript_priority: TranscriptPriority
  translation_enabled: boolean

  // Timestamps
  created_at: string
  updated_at: string
}

export type SignalType =
  | "viral_content"
  | "breaking_news"
  | "trending_topic"
  | "industry_shift"
  | "competitor_move"
  | "creator_spotlight"
  | "platform_update"
  | "controversy"
  | "cultural_moment"
  | "technology_advancement"
  | "startup_news"
  | "brand_mention"
  | "audience_insight"
  | "event_announcement"

export interface FilterProfileSimplified {
  id: string
  tenant_id: string
  what_to_look_for: string[]
  what_to_avoid: string[]
  platforms_that_matter: string[]
  source_types_that_matter: SourceType[]
  update_frequency: "daily" | "weekly" | "none"
  auto_learn_from_approvals: boolean
}

export interface FilterMatch {
  profile_id: string
  profile_name: string
  matched_include_topics: string[]
  matched_include_keywords: string[]
  matched_entities: string[]
  blocked_by_exclude: boolean
  excluded_reason: string | null
  relevance_boost: number
  final_score: number
}

export const DEFAULT_JAHKNOWSPR_FILTER: Omit<IntelligenceFilterProfile, "id" | "tenant_id" | "created_at" | "updated_at"> = {
  name: "JahKnowsPR Home Profile",
  description: "Default intelligence filter profile optimized for PR, marketing, and creator economy insights",
  is_default: true,
  is_active: true,

  include_topics: [
    "creators",
    "influencers",
    "viral marketing",
    "brand controversies",
    "PR crises",
    "celebrity cultural moments",
    "creator economy",
    "social media platform changes",
    "AI in marketing",
    "technology affecting marketing",
    "startups building brands",
    "founders",
    "personal branding",
    "content strategy",
    "audience growth",
    "engagement tactics",
    "brand partnerships",
    "influencer marketing",
    "social media trends",
    "digital PR",
  ],

  exclude_topics: [
    "corporate earnings",
    "internal agency hires",
    "boring acquisitions",
    "unrelated finance news",
    "stock market analysis",
    "corporate restructuring",
    "regulatory compliance",
    "internal memos",
    "HR announcements",
    "office relocations",
  ],

  include_keywords: [
    "viral",
    "trending",
    "creator",
    "influencer",
    "brand deal",
    "controversy",
    "backlash",
    "campaign",
    "launch",
    "rebrand",
    "social media",
    "TikTok",
    "Instagram",
    "YouTube",
    "content creator",
    "brand ambassador",
    "PR crisis",
    "reputation",
  ],

  exclude_keywords: [
    "quarterly earnings",
    "shareholder",
    "dividend",
    "SEC filing",
    "merger agreement",
    "layoffs",
    "downsizing",
  ],

  preferred_source_types: ["rss", "youtube", "social", "web"],
  ignored_source_types: [],

  include_entities: [],
  exclude_entities: [],

  audience_focus: [
    "content creators",
    "brand marketers",
    "PR professionals",
    "social media managers",
    "small business owners",
    "entrepreneurs",
  ],

  platform_focus: ["Instagram", "TikTok", "YouTube", "LinkedIn", "X"],

  industry_focus: [
    "Marketing",
    "Public Relations",
    "Creator Economy",
    "Social Media",
    "Advertising",
    "Entertainment",
  ],

  geography_focus: ["United States", "Global"],

  signal_types_to_prioritize: [
    "viral_content",
    "trending_topic",
    "controversy",
    "cultural_moment",
    "creator_spotlight",
    "platform_update",
    "brand_mention",
  ],

  signal_types_to_ignore: [],

  max_sources_per_run: 50,
  max_items_per_source: 20,

  summary_style: "executive",
  strategy_style: "actionable",
  telegram_brief_style: "mixed",

  require_manual_approval_for_rag: false,
  allow_auto_route_to_rag: true,
  allow_make_me_smarter: true,

  parsing_depth: "deep",
  transcript_priority: "high",
  translation_enabled: true,
}
