import { createClient } from "@supabase/supabase-js"

const DEFAULT_SUPABASE_URL = "https://cjgqicpuwbflypcnhuak.supabase.co"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "missing-anon-key"

if (supabaseKey === "missing-anon-key") {
  console.warn(
    "[mission-control] Missing VITE_SUPABASE_PUBLISHABLE_KEY/VITE_SUPABASE_ANON_KEY. " +
      "UI will load, but data requests will fail until env vars are set."
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)

