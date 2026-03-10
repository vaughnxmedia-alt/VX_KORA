import { createClient, SupabaseClient } from "@supabase/supabase-js"

let supabase: SupabaseClient | null = null

export function initializeDatabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY

  if (!url || !key) {
    console.warn("Supabase credentials not found. Running in memory-only mode.")
    return null
  }

  supabase = createClient(url, key)
  console.log("Database initialized")
  return supabase
}

export function getDatabase(): SupabaseClient | null {
  return supabase
}

export function requireDatabase(): SupabaseClient {
  if (!supabase) {
    throw new Error("Database not initialized. Call initializeDatabase() first.")
  }
  return supabase
}

export function isConnected(): boolean {
  return supabase !== null
}
