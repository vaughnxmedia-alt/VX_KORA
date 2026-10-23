import type { IncomingMessage, ServerResponse } from "node:http";
import { createClient } from "@supabase/supabase-js";
import type { Plugin } from "vite";

const TEXT_COLUMNS = [
  "event_name",
  "site_id",
  "brand_id",
  "page_path",
  "page_title",
  "referrer",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "content_id",
  "content_type",
  "content_category",
  "blog_slug",
  "campaign_id",
  "offer_id",
  "funnel_id",
  "funnel_step",
  "cta_id",
  "cta_label",
  "button_text",
  "form_id",
  "form_name",
  "video_id",
  "currency",
  "anonymous_visitor_id",
  "session_id",
  "device_type",
  "browser",
  "country_or_region",
  "client_id",
  "audience_pool_id",
  "industry_key",
  "audience_cluster_id",
  "adset_id",
  "creative_id",
  "buyer_key",
  "lead_magnet_id",
  "offer_stage",
  "platform",
  "content_angle",
  "message_angle",
  "landing_page_url",
] as const;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function text(value: unknown, max = 300): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/** Local stand-in for the Vercel track route so dev page views are stored. */
export function devAnalyticsApi(env: Record<string, string>): Plugin {
  return {
    name: "dev-analytics-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url?.split("?")[0];
        if (pathname !== "/api/kora/analytics/track") {
          next();
          return;
        }
        await handleTrack(req, res, env);
      });
    },
  };
}

async function handleTrack(req: IncomingMessage, res: ServerResponse, env: Record<string, string>) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Method not allowed" }));
    return;
  }

  try {
    const body = JSON.parse((await readBody(req)) || "{}") as Record<string, unknown>;
    const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: false, error: "Missing server analytics credentials" }));
      return;
    }

    const row: Record<string, unknown> = { metadata: {} };
    for (const column of TEXT_COLUMNS) {
      const value = text(body[column], column === "anonymous_visitor_id" || column === "session_id" ? 128 : 300);
      if (value) row[column] = value;
    }
    if (body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)) {
      row.metadata = body.metadata;
    }
    if (typeof body.revenue_value === "number" && Number.isFinite(body.revenue_value)) {
      row.revenue_value = body.revenue_value;
    }
    if (!row.event_name || !row.site_id || !row.brand_id || !row.anonymous_visitor_id || !row.session_id) {
      res.statusCode = 400;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: false, error: "Missing required analytics fields" }));
      return;
    }

    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { error } = await supabase.from("analytics_events").insert(row);
    res.statusCode = error ? 500 : 200;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(error ? { ok: false, error: error.message } : { ok: true }));
  } catch (error) {
    res.statusCode = 400;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Bad request" }));
  }
}
