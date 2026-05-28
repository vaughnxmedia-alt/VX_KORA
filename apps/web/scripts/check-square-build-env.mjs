/**
 * Fail production builds when Square Web Payments env is missing.
 * Vite inlines VITE_* at build time — Supabase SQUARE_ACCESS_TOKEN alone does not enable checkout.
 */
const isVercelProduction =
  process.env.VERCEL === "1" && process.env.VERCEL_ENV === "production";

if (!isVercelProduction) {
  process.exit(0);
}

const appId = (process.env.VITE_SQUARE_APPLICATION_ID || "").trim();
const locationId = (process.env.VITE_SQUARE_LOCATION_ID || "").trim();

const appOk = appId && appId.startsWith("sq0") && !appId.startsWith("VITE_");
const locOk = locationId && !locationId.startsWith("VITE_");

if (appOk && locOk) {
  process.exit(0);
}

console.error(
  [
    "",
    "Strategy Session checkout requires Vercel Production environment variables:",
    "  VITE_SQUARE_APPLICATION_ID  (Square Developer → Application → Production credentials)",
    "  VITE_SQUARE_LOCATION_ID       (same Location ID as SQUARE_LOCATION_ID on Supabase)",
    "",
    "Set both in Vercel → Project → Settings → Environment Variables → Production, then redeploy.",
    appId && !appOk
      ? `  Current VITE_SQUARE_APPLICATION_ID is invalid (got "${appId.slice(0, 32)}…"). Use Production Application ID from Square (sq0idp-…).`
      : "",
    "Supabase Edge secrets (SQUARE_ACCESS_TOKEN) do not replace these client-side vars.",
    "",
  ].join("\n"),
);
process.exit(1);
