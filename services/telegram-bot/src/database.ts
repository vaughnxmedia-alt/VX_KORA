import { createClient, SupabaseClient } from "@supabase/supabase-js"
import type { UserSession, GeneratedStrategy, SourceRecommendation } from "./types.js"

let supabase: SupabaseClient | null = null

export function initializeDatabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY

  if (!url || !key) {
    console.warn("Supabase credentials not found. Running in memory-only mode.")
    return null
  }

  supabase = createClient(url, key)
  return supabase
}

export function getDatabase(): SupabaseClient | null {
  return supabase
}

const memoryStore: Map<number, UserSession> = new Map()

export async function getSession(telegramId: number): Promise<UserSession | null> {
  if (supabase) {
    const { data, error } = await supabase
      .from("telegram_intake_sessions")
      .select("*")
      .eq("telegram_id", telegramId)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching session:", error)
    }
    return data as UserSession | null
  }

  return memoryStore.get(telegramId) || null
}

export async function createSession(
  telegramId: number,
  username: string | null
): Promise<UserSession> {
  const session: UserSession = {
    telegram_id: telegramId,
    telegram_username: username,
    current_question_id: null,
    phase: "intro",
    responses: {},
    started_at: new Date().toISOString(),
    last_activity: new Date().toISOString()
  }

  if (supabase) {
    const { error } = await supabase
      .from("telegram_intake_sessions")
      .upsert(session)

    if (error) {
      console.error("Error creating session:", error)
    }
  }

  memoryStore.set(telegramId, session)
  return session
}

export async function updateSession(
  telegramId: number,
  updates: Partial<UserSession>
): Promise<UserSession | null> {
  const existing = await getSession(telegramId)
  if (!existing) return null

  const updated: UserSession = {
    ...existing,
    ...updates,
    last_activity: new Date().toISOString()
  }

  if (supabase) {
    const { error } = await supabase
      .from("telegram_intake_sessions")
      .update(updated)
      .eq("telegram_id", telegramId)

    if (error) {
      console.error("Error updating session:", error)
    }
  }

  memoryStore.set(telegramId, updated)
  return updated
}

export async function saveResponse(
  telegramId: number,
  questionId: string,
  answer: string
): Promise<void> {
  const session = await getSession(telegramId)
  if (!session) return

  const responses = { ...session.responses, [questionId]: answer }
  await updateSession(telegramId, { responses })
}

export async function saveGeneratedStrategy(
  strategy: GeneratedStrategy
): Promise<void> {
  if (supabase) {
    const { error: blueprintError } = await supabase
      .from("brand_blueprints")
      .upsert({
        client_id: strategy.client_id,
        telegram_id: strategy.telegram_id,
        ...strategy.brand_blueprint,
        generated_at: strategy.generated_at
      })

    if (blueprintError) {
      console.error("Error saving brand blueprint:", blueprintError)
    }

    const { error: strategyError } = await supabase
      .from("content_strategies")
      .upsert({
        client_id: strategy.client_id,
        telegram_id: strategy.telegram_id,
        ...strategy.content_strategy,
        generated_at: strategy.generated_at
      })

    if (strategyError) {
      console.error("Error saving content strategy:", strategyError)
    }

    const { error: audienceError } = await supabase
      .from("audience_analyses")
      .upsert({
        client_id: strategy.client_id,
        telegram_id: strategy.telegram_id,
        ...strategy.audience_analysis,
        generated_at: strategy.generated_at
      })

    if (audienceError) {
      console.error("Error saving audience analysis:", audienceError)
    }
  }

  console.log(`Strategy saved for client: ${strategy.client_id}`)
}

export async function createOrGetClient(
  telegramId: number,
  businessName: string,
  email?: string
): Promise<string> {
  const clientId = businessName.toLowerCase().replace(/\s+/g, "-")

  if (supabase) {
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("id", clientId)
      .single()

    if (!existing) {
      await supabase.from("customers").insert({
        id: clientId,
        business_name: businessName,
        email: email || null,
        telegram_id: telegramId,
        client_status: "active",
        onboarding_status: "intake_complete",
        created_at: new Date().toISOString()
      })
    }
  }

  return clientId
}

export async function deleteSession(telegramId: number): Promise<void> {
  if (supabase) {
    await supabase
      .from("telegram_intake_sessions")
      .delete()
      .eq("telegram_id", telegramId)
  }
  memoryStore.delete(telegramId)
}

// Source Recommendation Functions
const sourceMemoryStore: Map<string, SourceRecommendation> = new Map()

export async function getSourceRecommendation(sourceId: string): Promise<SourceRecommendation | null> {
  if (supabase) {
    const { data, error } = await supabase
      .from("source_recommendations")
      .select("*")
      .eq("id", sourceId)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching source recommendation:", error)
    }
    return data as SourceRecommendation | null
  }

  return sourceMemoryStore.get(sourceId) || null
}

export async function saveSourceApproval(
  sourceId: string,
  status: "approved" | "rejected"
): Promise<void> {
  if (supabase) {
    const { error } = await supabase
      .from("source_recommendations")
      .update({ 
        status, 
        responded_at: new Date().toISOString() 
      })
      .eq("id", sourceId)

    if (error) {
      console.error("Error saving source approval:", error)
    }
  }

  const source = sourceMemoryStore.get(sourceId)
  if (source) {
    source.status = status
    source.responded_at = new Date().toISOString()
    sourceMemoryStore.set(sourceId, source)
  }
}

export async function createSourceRecommendation(
  recommendation: Omit<SourceRecommendation, "id" | "created_at" | "status">
): Promise<string> {
  const id = `src_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  const source: SourceRecommendation = {
    ...recommendation,
    id,
    status: "pending",
    created_at: new Date().toISOString()
  }

  if (supabase) {
    const { error } = await supabase
      .from("source_recommendations")
      .insert(source)

    if (error) {
      console.error("Error creating source recommendation:", error)
    }
  }

  sourceMemoryStore.set(id, source)
  return id
}

export async function getClientByTelegramId(telegramId: number): Promise<{ id: string; business_name: string } | null> {
  if (supabase) {
    const { data, error } = await supabase
      .from("customers")
      .select("id, business_name")
      .eq("telegram_id", telegramId)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching client by telegram id:", error)
    }
    return data
  }
  return null
}

export async function saveContentIntelligencePreferences(
  clientId: string,
  telegramId: number,
  preferences: {
    topics_to_track: string
    content_consumption: string
    thought_leaders: string
    content_to_create: string
    topics_to_avoid: string
  }
): Promise<void> {
  if (supabase) {
    const { error } = await supabase
      .from("content_intelligence_preferences")
      .upsert({
        client_id: clientId,
        telegram_id: telegramId,
        topics_to_track: preferences.topics_to_track,
        content_consumption: preferences.content_consumption,
        thought_leaders: preferences.thought_leaders,
        content_to_create: preferences.content_to_create,
        topics_to_avoid: preferences.topics_to_avoid,
        updated_at: new Date().toISOString()
      })

    if (error) {
      console.error("Error saving content intelligence preferences:", error)
    }
  }
}
