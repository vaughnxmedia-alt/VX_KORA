/**
 * Telegram Types for KORA Intelligence System
 * Defines Telegram integration, preferences, and delivery structures
 */

export type DeliveryFrequency = "daily" | "weekly" | "none"

export type TelegramMessageType =
  | "daily_briefing"
  | "weekly_digest"
  | "insight_article"
  | "strategy_suggestion"
  | "approval_request"
  | "notification"

export type TelegramMessageStatus = "pending" | "sent" | "delivered" | "failed" | "read"

export interface TelegramPreferences {
  id: string
  user_id: string
  tenant_id: string
  chat_id: string
  is_active: boolean
  is_verified: boolean
  verified_at: string | null

  // Delivery preferences
  delivery_frequency: DeliveryFrequency
  briefing_time: string
  timezone: string

  // Content preferences
  include_content_strategy: boolean
  include_industry_insights: boolean
  include_client_updates: boolean
  include_event_alerts: boolean

  // Make Me Smarter
  allow_make_me_smarter: boolean
  auto_approve_high_relevance: boolean
  high_relevance_threshold: number

  // Status
  last_message_sent_at: string | null
  last_message_id: string | null
  next_scheduled_at: string | null
  consecutive_failures: number

  created_at: string
  updated_at: string
}

export interface TelegramMessage {
  id: string
  tenant_id: string
  user_id: string
  chat_id: string
  message_type: TelegramMessageType
  status: TelegramMessageStatus
  content: TelegramMessageContent
  telegram_message_id: string | null
  sent_at: string | null
  delivered_at: string | null
  read_at: string | null
  error_message: string | null
  retry_count: number
  created_at: string
}

export interface TelegramMessageContent {
  title: string
  body: string
  items?: TelegramBriefItem[]
  actions?: TelegramAction[]
  metadata?: Record<string, unknown>
}

export interface TelegramBriefItem {
  id: string
  type: "insight" | "strategy" | "event" | "update"
  title: string
  summary: string
  relevance_score: number
  source: string
  url?: string
}

export interface TelegramAction {
  id: string
  label: string
  action_type: "approve" | "reject" | "view" | "save" | "snooze"
  target_id: string
  target_type: "insight" | "strategy" | "source" | "event"
}

export interface TelegramApproval {
  id: string
  tenant_id: string
  user_id: string
  message_id: string
  target_id: string
  target_type: "insight" | "strategy" | "source" | "event"
  action: "approved" | "rejected" | "saved" | "snoozed"
  notes: string | null
  approved_at: string
}

export interface DailyBriefingSchedule {
  id: string
  user_id: string
  tenant_id: string
  chat_id: string
  briefing_time: string
  timezone: string
  is_enabled: boolean
  include_content_strategy: boolean
  include_industry_insights: boolean
  include_client_updates: boolean
  last_sent_at: string | null
  next_send_at: string | null
  created_at: string
  updated_at: string
}

export interface TelegramBotStatus {
  is_connected: boolean
  bot_username: string | null
  connection_url: string
  qr_code_data: string | null
  last_activity_at: string | null
}
