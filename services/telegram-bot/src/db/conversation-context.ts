/**
 * Conversation Context Database Operations
 * 
 * Manages persistent conversation context and learned user preferences.
 * KORA learns from every interaction to personalize future insights.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js"

let _supabase: SupabaseClient | null = null
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY) are required.")
    _supabase = createClient(url, key)
  }
  return _supabase
}

// ============================================================================
// Types
// ============================================================================

export interface ConversationContext {
  id: string
  telegramId: number
  tenantId: string | null
  lastInsightReport: any | null
  lastInsightAt: Date | null
  lastSearchQueries: string[]
  lastTopics: string[]
  recentMessages: ConversationMessage[]
  createdAt: Date
  updatedAt: Date
}

export interface ConversationMessage {
  role: "user" | "assistant"
  content: string
  timestamp: string
  metadata?: Record<string, any>
}

export interface LearnedSignal {
  id: string
  telegramId: number
  tenantId: string | null
  signalType: SignalType
  signalKey: string
  signalValue: number
  sourceMessage: string | null
  sourceContext: any | null
  lastReinforcedAt: Date
  reinforcementCount: number
  createdAt: Date
}

export type SignalType = 
  | "topic_interest"        // User wants more of a topic
  | "perspective_preference" // User prefers certain perspectives/angles
  | "source_preference"      // User likes certain sources
  | "negative_signal"        // User doesn't want certain content
  | "tone_preference"        // User prefers certain tones
  | "timing_signal"          // User engages at certain times

export interface UserLearnedPreferences {
  topicInterests: Array<{ key: string; weight: number; count: number }>
  perspectivePreferences: Array<{ key: string; weight: number; count: number }>
  sourcePreferences: Array<{ key: string; weight: number; count: number }>
  negativeSignals: Array<{ key: string; weight: number; count: number }>
  tonePreferences: Array<{ key: string; weight: number; count: number }>
  timingSignals: Array<{ key: string; weight: number; count: number }>
}

// ============================================================================
// Conversation Context Operations
// ============================================================================

export async function getConversationContext(
  telegramId: number
): Promise<ConversationContext | null> {
  const { data, error } = await getSupabase()
    .from("intel_conversation_context")
    .select("*")
    .eq("telegram_id", telegramId)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    telegramId: data.telegram_id,
    tenantId: data.tenant_id,
    lastInsightReport: data.last_insight_report,
    lastInsightAt: data.last_insight_at ? new Date(data.last_insight_at) : null,
    lastSearchQueries: data.last_search_queries || [],
    lastTopics: data.last_topics || [],
    recentMessages: data.recent_messages || [],
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  }
}

export async function updateConversationContext(
  telegramId: number,
  tenantId: string,
  updates: {
    lastInsightReport?: any
    searchQueries?: string[]
    topics?: string[]
    message?: ConversationMessage
  }
): Promise<string | null> {
  try {
    const { data, error } = await getSupabase().rpc("update_conversation_context", {
      p_telegram_id: telegramId,
      p_tenant_id: tenantId,
      p_last_insight: updates.lastInsightReport || null,
      p_search_queries: updates.searchQueries || null,
      p_topics: updates.topics || null,
      p_message: updates.message || null
    })

    if (error) {
      console.error("[ConversationContext] Update error:", error)
      return null
    }

    return data
  } catch (e) {
    console.error("[ConversationContext] Update exception:", e)
    return null
  }
}

export async function addMessageToContext(
  telegramId: number,
  tenantId: string,
  role: "user" | "assistant",
  content: string,
  metadata?: Record<string, any>
): Promise<void> {
  const message: ConversationMessage = {
    role,
    content,
    timestamp: new Date().toISOString(),
    metadata
  }

  await updateConversationContext(telegramId, tenantId, { message })
}

export async function getRecentConversation(
  telegramId: number,
  limit: number = 10
): Promise<ConversationMessage[]> {
  const context = await getConversationContext(telegramId)
  if (!context) return []
  return context.recentMessages.slice(0, limit)
}

// ============================================================================
// Learned Signals Operations
// ============================================================================

export async function addLearnedSignal(
  telegramId: number,
  tenantId: string,
  signalType: SignalType,
  signalKey: string,
  signalValue: number = 1.0,
  sourceMessage?: string,
  sourceContext?: any
): Promise<string | null> {
  try {
    const { data, error } = await getSupabase().rpc("upsert_learned_signal", {
      p_telegram_id: telegramId,
      p_tenant_id: tenantId,
      p_signal_type: signalType,
      p_signal_key: normalizeSignalKey(signalKey),
      p_signal_value: signalValue,
      p_source_message: sourceMessage || null,
      p_source_context: sourceContext || null
    })

    if (error) {
      console.error("[LearnedSignals] Add error:", error)
      return null
    }

    console.log(`[LearnedSignals] ${signalType}:${signalKey} = ${signalValue} for user ${telegramId}`)
    return data
  } catch (e) {
    console.error("[LearnedSignals] Add exception:", e)
    return null
  }
}

export async function getLearnedPreferences(
  telegramId: number
): Promise<UserLearnedPreferences> {
  const defaults: UserLearnedPreferences = {
    topicInterests: [],
    perspectivePreferences: [],
    sourcePreferences: [],
    negativeSignals: [],
    tonePreferences: [],
    timingSignals: []
  }

  try {
    const { data, error } = await getSupabase().rpc("get_learned_preferences", {
      p_telegram_id: telegramId
    })

    if (error || !data) return defaults

    for (const row of data) {
      const entry = {
        key: row.signal_key,
        weight: row.signal_value,
        count: row.reinforcement_count
      }

      switch (row.signal_type) {
        case "topic_interest":
          defaults.topicInterests.push(entry)
          break
        case "perspective_preference":
          defaults.perspectivePreferences.push(entry)
          break
        case "source_preference":
          defaults.sourcePreferences.push(entry)
          break
        case "negative_signal":
          defaults.negativeSignals.push(entry)
          break
        case "tone_preference":
          defaults.tonePreferences.push(entry)
          break
        case "timing_signal":
          defaults.timingSignals.push(entry)
          break
      }
    }

    return defaults
  } catch (e) {
    console.error("[LearnedSignals] Get preferences exception:", e)
    return defaults
  }
}

export async function getAllSignalsForUser(
  telegramId: number
): Promise<LearnedSignal[]> {
  const { data, error } = await getSupabase()
    .from("intel_learned_signals")
    .select("*")
    .eq("telegram_id", telegramId)
    .order("signal_value", { ascending: false })

  if (error || !data) return []

  return data.map(row => ({
    id: row.id,
    telegramId: row.telegram_id,
    tenantId: row.tenant_id,
    signalType: row.signal_type as SignalType,
    signalKey: row.signal_key,
    signalValue: row.signal_value,
    sourceMessage: row.source_message,
    sourceContext: row.source_context,
    lastReinforcedAt: new Date(row.last_reinforced_at),
    reinforcementCount: row.reinforcement_count,
    createdAt: new Date(row.created_at)
  }))
}

// ============================================================================
// Query Building with Learned Preferences
// ============================================================================

export function buildPersonalizedQueries(
  baseQueries: string[],
  preferences: UserLearnedPreferences
): string[] {
  const personalizedQueries: string[] = [...baseQueries]

  // Add perspective modifiers to queries
  for (const pref of preferences.perspectivePreferences.slice(0, 3)) {
    if (pref.weight > 0.5) {
      const perspectiveLabel = denormalizeSignalKey(pref.key)
      for (const query of baseQueries.slice(0, 2)) {
        personalizedQueries.push(`${perspectiveLabel} ${query}`)
      }
    }
  }

  // Add topic interests as additional queries
  for (const topic of preferences.topicInterests.slice(0, 3)) {
    if (topic.weight > 0.5) {
      const topicLabel = denormalizeSignalKey(topic.key)
      personalizedQueries.push(`${topicLabel} news today`)
    }
  }

  // Remove queries related to negative signals
  const negativeKeys = new Set(
    preferences.negativeSignals
      .filter(n => n.weight < -0.3)
      .map(n => n.key.toLowerCase())
  )

  return personalizedQueries.filter(query => {
    const lowerQuery = query.toLowerCase()
    return !Array.from(negativeKeys).some(neg => lowerQuery.includes(neg))
  })
}

export function filterResultsByPreferences(
  results: any[],
  preferences: UserLearnedPreferences
): any[] {
  const negativeKeys = new Set(
    preferences.negativeSignals
      .filter(n => n.weight < -0.3)
      .map(n => n.key.toLowerCase())
  )

  return results.filter(result => {
    const text = `${result.title || ""} ${result.content || ""}`.toLowerCase()
    return !Array.from(negativeKeys).some(neg => text.includes(neg))
  })
}

export function scoreResultByPreferences(
  result: any,
  preferences: UserLearnedPreferences
): number {
  let score = result.score || 0.5
  const text = `${result.title || ""} ${result.content || ""}`.toLowerCase()

  // Boost for perspective preferences
  for (const pref of preferences.perspectivePreferences) {
    if (text.includes(pref.key.replace(/_/g, " "))) {
      score += 0.1 * Math.min(pref.weight, 2)
    }
  }

  // Boost for topic interests
  for (const topic of preferences.topicInterests) {
    if (text.includes(topic.key.replace(/_/g, " "))) {
      score += 0.08 * Math.min(topic.weight, 2)
    }
  }

  // Boost for preferred sources
  for (const source of preferences.sourcePreferences) {
    if (result.url && result.url.toLowerCase().includes(source.key)) {
      score += 0.15 * Math.min(source.weight, 2)
    }
  }

  // Penalize for negative signals
  for (const neg of preferences.negativeSignals) {
    if (text.includes(neg.key.replace(/_/g, " "))) {
      score -= 0.2 * Math.abs(neg.weight)
    }
  }

  return Math.max(0, Math.min(1, score))
}

// ============================================================================
// Utilities
// ============================================================================

function normalizeSignalKey(key: string): string {
  return key
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_")
}

function denormalizeSignalKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase())
}

export function formatPreferencesForPrompt(
  preferences: UserLearnedPreferences
): string {
  const parts: string[] = []

  if (preferences.perspectivePreferences.length > 0) {
    const perspectives = preferences.perspectivePreferences
      .slice(0, 3)
      .map(p => denormalizeSignalKey(p.key))
      .join(", ")
    parts.push(`User prefers perspectives: ${perspectives}`)
  }

  if (preferences.topicInterests.length > 0) {
    const topics = preferences.topicInterests
      .slice(0, 5)
      .map(t => denormalizeSignalKey(t.key))
      .join(", ")
    parts.push(`User is interested in: ${topics}`)
  }

  if (preferences.negativeSignals.length > 0) {
    const negatives = preferences.negativeSignals
      .slice(0, 3)
      .map(n => denormalizeSignalKey(n.key))
      .join(", ")
    parts.push(`User is NOT interested in: ${negatives}`)
  }

  if (preferences.tonePreferences.length > 0) {
    const tones = preferences.tonePreferences
      .slice(0, 2)
      .map(t => denormalizeSignalKey(t.key))
      .join(", ")
    parts.push(`Preferred content tone: ${tones}`)
  }

  return parts.length > 0 
    ? `LEARNED USER PREFERENCES:\n${parts.join("\n")}`
    : ""
}
