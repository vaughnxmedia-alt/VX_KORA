/**
 * Admin-only: GA4 Data API (runReport) via service account.
 * Secrets (Supabase Dashboard → Edge Functions → Secrets, or `supabase secrets set`):
 *   GA4_SERVICE_ACCOUNT_JSON — full JSON key for a service account with Analytics Data API access
 *   GA4_PROPERTY_ID — numeric GA4 property id (Admin → Property settings)
 * Also add the service account email under GA4 → Admin → Property access (Viewer).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SignJWT, importPKCS8 } from "npm:jose@5.9.6";
import { getCorsHeaders } from "../_shared/cors.ts";

const ANALYTICS_DATA_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

type RunReportResponse = {
  metricHeaders?: { name?: string }[];
  dimensionHeaders?: { name?: string }[];
  rows?: {
    dimensionValues?: { value?: string }[];
    metricValues?: { value?: string }[];
  }[];
};

async function getAccessTokenFromServiceAccountJson(jsonStr: string): Promise<string> {
  const sa = JSON.parse(jsonStr) as { client_email: string; private_key: string };
  if (!sa.client_email || !sa.private_key) {
    throw new Error("Invalid GA4_SERVICE_ACCOUNT_JSON: missing client_email or private_key");
  }
  const key = await importPKCS8(sa.private_key, "RS256");
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: ANALYTICS_DATA_SCOPE })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(sa.client_email)
    .setSubject(sa.client_email)
    .setAudience(TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3500)
    .sign(key);

  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!tokenRes.ok || !tokenJson.access_token) {
    const msg = tokenJson.error_description || tokenJson.error || `Token HTTP ${tokenRes.status}`;
    throw new Error(msg);
  }
  return tokenJson.access_token;
}

async function runReport(
  accessToken: string,
  propertyId: string,
  body: Record<string, unknown>,
): Promise<RunReportResponse> {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as RunReportResponse & {
    error?: { message?: string; status?: string };
  };
  if (!res.ok) {
    const msg = json.error?.message || `runReport HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

function parseTotals(report: RunReportResponse): Record<string, number> {
  const out: Record<string, number> = {};
  const headers = report.metricHeaders ?? [];
  const row = report.rows?.[0];
  if (!row?.metricValues) return out;
  headers.forEach((h, i) => {
    const name = h.name;
    if (!name) return;
    const raw = row.metricValues?.[i]?.value;
    const n = raw !== undefined && raw !== "" ? Number(raw) : NaN;
    out[name] = Number.isFinite(n) ? n : 0;
  });
  return out;
}

function parseTopPages(report: RunReportResponse): { path: string; views: number }[] {
  const headers = report.dimensionHeaders ?? [];
  const metricHeaders = report.metricHeaders ?? [];
  const pathIdx = headers.findIndex((h) => h.name === "pagePath");
  const viewsIdx = metricHeaders.findIndex((h) => h.name === "screenPageViews");
  if (pathIdx < 0 || viewsIdx < 0) return [];
  return (report.rows ?? []).map((row) => {
    const path = row.dimensionValues?.[pathIdx]?.value ?? "";
    const raw = row.metricValues?.[viewsIdx]?.value;
    const views = raw !== undefined && raw !== "" ? Number(raw) : 0;
    return { path, views: Number.isFinite(views) ? views : 0 };
  });
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const saJson = (Deno.env.get("GA4_SERVICE_ACCOUNT_JSON") ?? "").trim();
  const propertyId = (Deno.env.get("GA4_PROPERTY_ID") ?? "").trim().replace(/^properties\//, "");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: adminRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!adminRow) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!saJson || !propertyId) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "GA4 is not configured for this project.",
        hint: "Set Edge Function secrets GA4_SERVICE_ACCOUNT_JSON and GA4_PROPERTY_ID (Supabase CLI or Dashboard).",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let body: { startDate?: string; endDate?: string };
  try {
    body = (await req.json()) as { startDate?: string; endDate?: string };
  } catch {
    body = {};
  }
  const startDate = (body.startDate ?? "7daysAgo").trim();
  const endDate = (body.endDate ?? "today").trim();

  try {
    const accessToken = await getAccessTokenFromServiceAccountJson(saJson);

    const summaryReport = await runReport(accessToken, propertyId, {
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: "sessions" },
        { name: "activeUsers" },
        { name: "newUsers" },
        { name: "screenPageViews" },
        { name: "eventCount" },
      ],
    });

    const pagesReport = await runReport(accessToken, propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 15,
    });

    const totals = parseTotals(summaryReport);
    const topPages = parseTopPages(pagesReport);

    return new Response(
      JSON.stringify({
        ok: true,
        dateRange: { start: startDate, end: endDate },
        propertyId,
        totals: {
          sessions: totals.sessions ?? null,
          activeUsers: totals.activeUsers ?? null,
          newUsers: totals.newUsers ?? null,
          screenPageViews: totals.screenPageViews ?? null,
          eventCount: totals.eventCount ?? null,
        },
        topPages,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("ga4-analytics-report:", msg);
    return new Response(
      JSON.stringify({
        ok: false,
        error: msg,
        hint:
          "Ensure Google Analytics Data API is enabled for the GCP project, and the service account email has Viewer access on the GA4 property.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
