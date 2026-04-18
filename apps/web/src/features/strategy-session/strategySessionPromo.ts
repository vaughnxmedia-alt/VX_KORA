/** Matches server-side validation in `strategy-session-book` Edge Function. */
export const STRATEGY_SESSION_COMPLIMENTARY_PROMO = "789586";

export function isComplimentaryStrategySessionPromo(code: string | undefined | null): boolean {
  return code?.trim() === STRATEGY_SESSION_COMPLIMENTARY_PROMO;
}
