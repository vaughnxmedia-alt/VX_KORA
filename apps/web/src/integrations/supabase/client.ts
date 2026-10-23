import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
/** Publishable / anon key — either name works (Supabase dashboard often says "anon"). */
const SUPABASE_PUBLISHABLE_KEY = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY
) as string | undefined;

const isDev = import.meta.env.DEV;

/** Treat .env.example placeholders as unset so local dev does not claim Supabase is configured. */
function isLikelySupabaseEnvPlaceholder(
  url: string | undefined,
  key: string | undefined,
): boolean {
  const u = url?.trim() ?? "";
  const k = key?.trim() ?? "";
  if (!u || !k) return true;
  if (/YOUR_PROJECT_REF|placeholder-not-configured/i.test(u)) return true;
  if (/your_anon_public_key_here/i.test(k)) return true;
  return false;
}

const hasRealConfig =
  Boolean(SUPABASE_URL?.trim() && SUPABASE_PUBLISHABLE_KEY?.trim()) &&
  !isLikelySupabaseEnvPlaceholder(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

if (!hasRealConfig && !isDev) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Copy apps/web/.env.example to apps/web/.env and set values from Supabase → Project Settings → API (never commit .env).",
  );
}

if (!hasRealConfig && isDev) {
  console.warn(
    "[apps/web] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY — using a dev placeholder so the UI can load. Add apps/web/.env for real auth and data.",
  );
}

/** True when real Supabase env vars are set (placeholders are used in dev only). */
export const supabaseIsConfigured = hasRealConfig;

/** Public Supabase URL (safe to bundle; still load from env so repos stay credential-free). */
export const supabaseUrl =
  SUPABASE_URL?.trim() || "https://placeholder-not-configured.supabase.co";
/** Supabase anon / publishable key (safe for browser; load from env only). */
export const supabasePublishableKey =
  SUPABASE_PUBLISHABLE_KEY?.trim() || "sb-dev-placeholder-anon-key";

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
