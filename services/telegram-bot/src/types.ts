export interface UserSession {
  telegram_id: number
  telegram_username: string | null
  current_question_id: string | null
  phase: "intro" | "brand_identity" | "strategy" | "audience" | "completed" | "generating"
  responses: Record<string, string>
  started_at: string
  last_activity: string
  client_id?: string
}

export interface IntakeResponse {
  question_id: string
  answer: string
  timestamp: string
}

export interface GeneratedStrategy {
  client_id: string
  telegram_id: number
  brand_blueprint: BrandBlueprint
  content_strategy: ContentStrategy
  audience_analysis: AudienceAnalysis
  generated_at: string
}

export interface BrandBlueprint {
  business_name: string
  business_type: string
  mission: string
  vision: string
  core_values: { value: string; explanation: string }[]
  unique_value_proposition: string
  brand_personality: string[]
  brand_voice: string
  avoid_perceptions: string[]
  brand_story: string
  positioning_statement: string
}

export interface ContentStrategy {
  content_pillars: ContentPillar[]
  posting_schedule: PostingSchedule
  platform_strategy: PlatformStrategy[]
  content_mix: ContentMix
  example_week: ExampleWeekContent[]
  hashtag_bank: string[]
  growth_strategy: string
  key_tips: string[]
}

export interface ContentPillar {
  name: string
  purpose: string
  examples: string[]
  percentage: number
}

export interface PostingSchedule {
  frequency: string
  recommended_times: string[]
  consistency_tips: string[]
}

export interface PlatformStrategy {
  platform: string
  priority: "primary" | "secondary" | "experimental"
  content_style: string
  audience_behavior: string
  best_practices: string[]
}

export interface ContentMix {
  educational: number
  relatable: number
  commentary: number
  promotional: number
}

export interface ExampleWeekContent {
  day: string
  content_type: string
  topic_idea: string
  pillar: string
}

export interface AudienceAnalysis {
  overview: string
  primary_platforms: string[]
  core_positioning: string
  audience_psychology: string
  audience_segments: AudienceSegment[]
  platform_breakdown: PlatformAudience[]
  audience_motivations: string[]
  content_types_that_attract: ContentAttraction[]
  personality_types: PersonalityType[]
  audience_flywheel: string
}

export interface AudienceSegment {
  name: string
  age_range: string
  examples: string[]
  pain_point: string
  why_they_follow: string
}

export interface PlatformAudience {
  platform: string
  age_range: string
  audience_description: string
  what_they_want: string
  content_style: string
}

export interface ContentAttraction {
  type: string
  examples: string[]
}

export interface PersonalityType {
  name: string
  age_range: string
  platforms: string[]
  what_they_want: string
}

export interface ContentIntelligencePreferences {
  topics_to_track: string[]
  content_consumption: string[]
  thought_leaders: string[]
  content_to_create: string[]
  topics_to_avoid: string[]
}

export interface SourceRecommendation {
  id: string
  client_id: string
  telegram_id: number
  source_url: string
  source_title: string
  source_type: "rss" | "newsletter" | "podcast" | "youtube" | "twitter" | "publication"
  relevance_reason: string
  status: "pending" | "approved" | "rejected"
  created_at: string
  responded_at?: string
}
