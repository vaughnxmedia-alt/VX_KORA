import type { IntakeValues } from "@/features/strategy-session/schema";

export const STRATEGY_SESSION_DRAFT_KEY = "kora_strategy_session_booking_draft";
export const STRATEGY_SESSION_PAYMENT_PROOF_KEY = "kora_strategy_session_square_payment";

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

/** Stored after Square charge succeeds; required for strategy-session-book. */
export type StrategySessionPaymentProof = {
  squarePaymentId: string;
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

export function readPaymentProofFromStorage(): StrategySessionPaymentProof | null {
  try {
    const raw = sessionStorage.getItem(STRATEGY_SESSION_PAYMENT_PROOF_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StrategySessionPaymentProof;
  } catch {
    return null;
  }
}

export function writePaymentProofToStorage(proof: StrategySessionPaymentProof): void {
  sessionStorage.setItem(STRATEGY_SESSION_PAYMENT_PROOF_KEY, JSON.stringify(proof));
}

export function clearPaymentProofFromStorage(): void {
  sessionStorage.removeItem(STRATEGY_SESSION_PAYMENT_PROOF_KEY);
}

/** Clear draft + payment (after successful booking or abandoned flow). */
export function clearStrategySessionBookingStorage(): void {
  clearDraftFromStorage();
  clearPaymentProofFromStorage();
}
