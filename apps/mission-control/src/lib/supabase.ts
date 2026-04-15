import { createClient } from "@supabase/supabase-js"

const DEFAULT_SUPABASE_URL = "https://cjgqicpuwbflypcnhuak.supabase.co"
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_xrVUTBjtvYgsNcvYWJrkyQ_3CEU3AOB"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  DEFAULT_SUPABASE_PUBLISHABLE_KEY

if (supabaseKey === DEFAULT_SUPABASE_PUBLISHABLE_KEY) {
  console.warn(
    "[mission-control] Using default publishable key fallback. " +
      "Set VITE_SUPABASE_PUBLISHABLE_KEY/VITE_SUPABASE_ANON_KEY to override by environment."
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)

