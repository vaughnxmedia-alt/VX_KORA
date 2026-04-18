/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_PUBLIC_SITE_URL?: string
  readonly VITE_STRATEGY_BOOKING_PATH?: string
  readonly VITE_BRAND_STRATEGY_SESSION_PATH?: string
  readonly VITE_TELEGRAM_INTAKE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
