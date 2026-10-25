import assert from "node:assert/strict";
import {
  csvCell,
  googleCalendarLink,
  toCsv,
  verifySquareWebhookSignature,
  workshopMissingRequirements,
} from "../supabase/functions/_shared/workshop-payments.ts";

const future = new Date(Date.now() + 86_400_000).toISOString();
const ready = workshopMissingRequirements({
  startsAt: future,
  timezone: "America/Chicago",
  capacity: 12,
  priceCents: 4900,
  cancellationTerms: "Cancel at least 48 hours before the workshop starts.",
  zoomUrl: "https://example.com/meeting",
});
assert.deepEqual(ready, []);

const closed = workshopMissingRequirements({
  startsAt: null,
  timezone: null,
  capacity: 12,
  priceCents: 4900,
  cancellationTerms: "",
  zoomUrl: null,
});
assert.ok(closed.includes("a future date and time"));
assert.ok(closed.includes("cancellation terms"));
assert.ok(closed.includes("an https Zoom link"));

assert.equal(csvCell("=HYPERLINK(\"http://evil\")"), "\"'=HYPERLINK(\"\"http://evil\"\")\"");
assert.equal(csvCell("+1"), "\"'+1\"");
assert.equal(csvCell("-10"), "\"'-10\"");
assert.equal(csvCell("@sum"), "\"'@sum\"");
assert.equal(csvCell("Ada"), "\"Ada\"");

const csv = toCsv(
  [{ full_name: "=cmd|' /C calc'!A0", email: "ada@example.com" }],
  [{ key: "full_name", header: "Full name" }, { key: "email", header: "Email" }],
);
assert.ok(csv.includes("\"'=cmd|"));
assert.ok(!csv.split("\n")[1].startsWith("="));

const calendar = googleCalendarLink({
  title: "Make Your Business Make Sense",
  startsAtIso: future,
  durationMinutes: 120,
  timezone: "America/Chicago",
  details: "Zoom access is in your confirmation email.",
});
assert.ok(calendar.startsWith("https://calendar.google.com/calendar/render?"));
assert.equal(calendar.includes("zoom.us"), false);

const key = "test-signature-key";
const url = "https://example.com/functions/v1/workshop-square-webhook";
const body = JSON.stringify({ event_id: "evt_1", type: "payment.updated" });
const cryptoKey = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(key),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign"],
);
const signed = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(url + body));
const bytes = new Uint8Array(signed);
let binary = "";
for (const byte of bytes) binary += String.fromCharCode(byte);
const signature = btoa(binary);

assert.equal(await verifySquareWebhookSignature({
  signatureKey: key,
  notificationUrl: url,
  rawBody: body,
  signatureHeader: signature,
}), true);
assert.equal(await verifySquareWebhookSignature({
  signatureKey: key,
  notificationUrl: url,
  rawBody: body + " ",
  signatureHeader: signature,
}), false);
assert.equal(await verifySquareWebhookSignature({
  signatureKey: "",
  notificationUrl: url,
  rawBody: body,
  signatureHeader: signature,
}), false);

console.log("workshop payment checks passed");
