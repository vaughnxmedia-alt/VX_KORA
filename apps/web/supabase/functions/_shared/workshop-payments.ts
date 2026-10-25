/** Pure helpers shared by the workshop checkout, webhook, HQ export, and tests. No secrets. */

export const WORKSHOP_SLUG = "make-your-business-make-sense";
export const WORKSHOP_CANCELLATION_MIN_LENGTH = 20;
export const WORKSHOP_HOLD_MINUTES = 15;

export type WorkshopRequirementInput = {
  startsAt?: string | null;
  timezone?: string | null;
  capacity?: number | null;
  priceCents?: number | null;
  cancellationTerms?: string | null;
  zoomUrl?: string | null;
};

/** Requirements that must be true before paid registration can open. Date is never invented here. */
export function workshopMissingRequirements(event: WorkshopRequirementInput, nowMs = Date.now()): string[] {
  const missing: string[] = [];
  const starts = event.startsAt ? new Date(event.startsAt).getTime() : NaN;
  if (!event.startsAt || Number.isNaN(starts) || starts <= nowMs) missing.push("a future date and time");
  if (!event.timezone?.trim()) missing.push("a time zone");
  if (!event.capacity || event.capacity < 1) missing.push("a capacity of at least 1");
  if (!event.priceCents || event.priceCents < 1) missing.push("a price");
  if ((event.cancellationTerms?.trim().length ?? 0) < WORKSHOP_CANCELLATION_MIN_LENGTH) {
    missing.push("cancellation terms");
  }
  if (!event.zoomUrl?.trim().startsWith("https://")) missing.push("an https Zoom link");
  return missing;
}

export function csvCell(value: unknown): string {
  const raw = value == null ? "" : String(value);
  const guarded = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${guarded.replace(/"/g, '""')}"`;
}

export function toCsv(rows: Record<string, unknown>[], columns: { key: string; header: string }[]): string {
  const header = columns.map((column) => csvCell(column.header)).join(",");
  const body = rows.map((row) => columns.map((column) => csvCell(row[column.key])).join(",")).join("\n");
  return `\uFEFF${header}\n${body}\n`;
}

function timingSafeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  const length = Math.max(left.length, right.length);
  let diff = left.length === right.length ? 0 : 1;
  for (let i = 0; i < length; i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

function bytesToBase64(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  let binary = "";
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** Square webhook authenticity: HMAC-SHA256 of notification URL + raw body, base64. */
export async function verifySquareWebhookSignature(input: {
  signatureKey: string;
  notificationUrl: string;
  rawBody: string;
  signatureHeader: string | null;
}): Promise<boolean> {
  const signature = input.signatureHeader?.trim() ?? "";
  if (!input.signatureKey || !input.notificationUrl || !signature || !input.rawBody) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(input.signatureKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${input.notificationUrl}${input.rawBody}`),
  );
  return timingSafeEqual(bytesToBase64(signed), signature);
}

export function googleCalendarLink(input: {
  title: string;
  startsAtIso: string;
  durationMinutes: number;
  details: string;
  timezone: string;
}): string {
  const start = new Date(input.startsAtIso);
  const end = new Date(start.getTime() + input.durationMinutes * 60_000);
  const stamp = (value: Date) => value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates: `${stamp(start)}/${stamp(end)}`,
    details: input.details,
    ctz: input.timezone,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
