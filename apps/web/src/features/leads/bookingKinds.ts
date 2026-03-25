export const BOOKING_KINDS = [
  "full_program_sales",
  "creative_consultation",
  "telegram",
  "strategy_session",
  "campaign_retainer",
] as const;

export type BookingKind = (typeof BOOKING_KINDS)[number];

export const BOOKING_KIND_LABEL: Record<BookingKind, string> = {
  full_program_sales: "Full program sales call",
  creative_consultation: "Creative consultation",
  telegram: "Telegram request",
  strategy_session: "Strategy Session",
  campaign_retainer: "Campaign & retainer",
};

export function normalizeBookingKind(raw: string | null | undefined): BookingKind {
  const v = (raw || "").trim();
  if (
    v === "full_program_sales" ||
    v === "creative_consultation" ||
    v === "telegram" ||
    v === "strategy_session" ||
    v === "campaign_retainer"
  ) {
    return v;
  }
  return "full_program_sales";
}
