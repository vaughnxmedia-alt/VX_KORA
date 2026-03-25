import type { IntakeValues } from "@/features/strategy-session/schema";

export const STRATEGY_SESSION_DRAFT_KEY = "kora_strategy_session_booking_draft";

export type StrategySessionBookingDraft = {
  values: IntakeValues;
  selectedSlotIso: string;
  timezone: string;
  bookingKind?:
    | "full_program_sales"
    | "creative_consultation"
    | "telegram"
    | "strategy_session"
    | "campaign_retainer";
};

export function readDraftFromStorage(): StrategySessionBookingDraft | null {
  try {
    const raw = sessionStorage.getItem(STRATEGY_SESSION_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StrategySessionBookingDraft;
  } catch {
    return null;
  }
}

export function writeDraftToStorage(draft: StrategySessionBookingDraft): void {
  sessionStorage.setItem(STRATEGY_SESSION_DRAFT_KEY, JSON.stringify(draft));
}

export function clearDraftFromStorage(): void {
  sessionStorage.removeItem(STRATEGY_SESSION_DRAFT_KEY);
}

/** Append Lemon Squeezy checkout email prefill when URL is configured. */
export function buildLemonCheckoutUrl(checkoutBaseUrl: string, email: string): string {
  const trimmed = checkoutBaseUrl.trim();
  if (!trimmed) return "";
  const sep = trimmed.includes("?") ? "&" : "?";
  const q = new URLSearchParams();
  q.set("checkout[email]", email.trim());
  return `${trimmed}${sep}${q.toString()}`;
}
