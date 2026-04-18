/** Public JKPR site URLs for Mission Control (share with clients / reps). */

const DEFAULT_SITE = "https://jahknowspr.com"

export function getPublicSiteBase(): string {
  const raw = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.trim().replace(/\/$/, "")
  return raw || DEFAULT_SITE
}

/** Strategy Session booking flow (form + payment). */
export function getStrategySessionBookingUrl(): string {
  const path =
    (import.meta.env.VITE_STRATEGY_BOOKING_PATH as string | undefined)?.trim() || "/strategy-session"
  return `${getPublicSiteBase()}${path.startsWith("/") ? path : `/${path}`}`
}

/** Marketing landing for the Strategy Session offer (optional second link). */
export function getBrandStrategySessionLandingUrl(): string {
  const path =
    (import.meta.env.VITE_BRAND_STRATEGY_SESSION_PATH as string | undefined)?.trim() ||
    "/brand-strategy-session"
  return `${getPublicSiteBase()}${path.startsWith("/") ? path : `/${path}`}`
}

/** Telegram bot or deep link for guided intake (@koranewstrategy flow). */
export function getTelegramIntakeUrl(): string {
  const raw = (import.meta.env.VITE_TELEGRAM_INTAKE_URL as string | undefined)?.trim()
  return raw || "https://t.me/koranewstrategy"
}
