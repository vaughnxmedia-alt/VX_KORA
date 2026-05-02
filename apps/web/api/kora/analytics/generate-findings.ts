import { getServiceClient, json } from "./_lib";

export const config = {
  runtime: "edge",
};

type Finding = {
  finding_type: string;
  title: string;
  summary: string;
  evidence: Record<string, unknown>;
  recommendation: string;
  priority: string;
  related_page_path?: string | null;
  related_content_id?: string | null;
  related_offer_id?: string | null;
  related_campaign_id?: string | null;
};

const VALID_FINDING_TYPES = new Set([
  "opportunity",
  "warning",
  "trend",
  "funnel_dropoff",
  "content_winner",
  "revenue_driver",
  "weak_page",
  "seo_issue",
  "backlink_opportunity",
  "cta_issue",
  "campaign_signal",
  "audience_signal",
]);

const VALID_PRIORITIES = new Set(["low", "medium", "high", "urgent"]);

function stripFences(text: string): string {
  return text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
}

function safeFinding(input: unknown): Finding | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;
  const findingType = String(row.finding_type || "").trim();
  const priority = String(row.priority || "medium").trim();
  const title = String(row.title || "").trim();
  const summary = String(row.summary || "").trim();
  const recommendation = String(row.recommendation || "").trim();
  if (!title || !summary || !recommendation) return null;
  if (!VALID_FINDING_TYPES.has(findingType)) return null;
  if (!VALID_PRIORITIES.has(priority)) return null;
  return {
    finding_type: findingType,
    title: title.slice(0, 180),
    summary: summary.slice(0, 600),
    recommendation: recommendation.slice(0, 800),
    evidence: (row.evidence as Record<string, unknown>) || {},
    priority,
    related_page_path: row.related_page_path ? String(row.related_page_path).slice(0, 300) : null,
    related_content_id: row.related_content_id ? String(row.related_content_id).slice(0, 120) : null,
    related_offer_id: row.related_offer_id ? String(row.related_offer_id).slice(0, 120) : null,
    related_campaign_id: row.related_campaign_id ? String(row.related_campaign_id).slice(0, 120) : null,
  };
}

async function callGemini(model: string, apiKey: string, context: Record<string, unknown>) {
  const prompt = `You are KORA, a brand intelligence and analytics strategist for JahKnowsPR.
Analyze the provided first-party analytics data and return JSON only.

Return format:
{
  "findings": [
    {
      "finding_type": "opportunity|warning|trend|funnel_dropoff|content_winner|revenue_driver|weak_page|seo_issue|backlink_opportunity|cta_issue|campaign_signal|audience_signal",
      "title": "short title",
      "summary": "what is happening and why it matters",
      "evidence": { "metrics": {}, "segments": [] },
      "recommendation": "specific next action",
      "priority": "low|medium|high|urgent",
      "related_page_path": "/path or null",
      "related_content_id": "id or null",
      "related_offer_id": "id or null",
      "related_campaign_id": "id or null"
    }
  ]
}

Rules:
- No markdown, no prose outside JSON.
- Every finding must use explicit evidence from context.
- Avoid vague advice.
- Focus on: pages, CTA performance, funnels, content, audit flow, strategy session intent, revenue attribution, weak pages, SEO/backlink opportunities.
`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: `${prompt}\n\nContext:\n${JSON.stringify(context)}` }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${err.slice(0, 500)}`);
  }
  const payload = (await response.json()) as Record<string, unknown>;
  const text = String(
    (payload.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined)?.[0]?.content?.parts?.[0]?.text ||
      "",
  );
  if (!text) throw new Error("Gemini returned empty response.");
  return stripFences(text);
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") return json(405, { ok: false, error: "Method not allowed" });

  const geminiApiKey = process.env.GEMINI_API_KEY;
  const model = process.env.KORA_ANALYTICS_MODEL || "gemini-1.5-pro";
  if (!geminiApiKey) return json(503, { ok: false, error: "GEMINI_API_KEY is not configured." });

  try {
    const body = (await request.json().catch(() => ({}))) as {
      site_id?: string;
      brand_id?: string;
      days?: number;
      limit?: number;
    };

    const siteId = body.site_id || "jahknowspr_web";
    const brandId = body.brand_id || "jahknowspr";
    const days = Math.max(1, Math.min(60, Number(body.days || 14)));
    const findingsLimit = Math.max(3, Math.min(24, Number(body.limit || 10)));
    const sinceIso = new Date(Date.now() - days * 86400000).toISOString();

    const supabase = getServiceClient();
    const [rollupsRes, contentRes, funnelsRes, stepsRes, revenueRes] = await Promise.all([
      supabase
        .from("analytics_daily_rollups")
        .select("*")
        .eq("site_id", siteId)
        .eq("brand_id", brandId)
        .gte("date", sinceIso.slice(0, 10))
        .order("date", { ascending: true }),
      supabase
        .from("content_performance")
        .select("*")
        .eq("site_id", siteId)
        .eq("brand_id", brandId)
        .order("views", { ascending: false })
        .limit(40),
      supabase
        .from("funnel_reports")
        .select("*")
        .eq("site_id", siteId)
        .eq("brand_id", brandId)
        .gte("date_range_start", sinceIso.slice(0, 10))
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("funnel_steps")
        .select("*")
        .order("step_order", { ascending: true })
        .limit(300),
      supabase
        .from("revenue_attribution")
        .select("*")
        .eq("site_id", siteId)
        .eq("brand_id", brandId)
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(120),
    ]);
    if (rollupsRes.error || contentRes.error || funnelsRes.error || stepsRes.error || revenueRes.error) {
      throw new Error(
        [
          rollupsRes.error?.message,
          contentRes.error?.message,
          funnelsRes.error?.message,
          stepsRes.error?.message,
          revenueRes.error?.message,
        ]
          .filter(Boolean)
          .join(" | "),
      );
    }

    const context = {
      site_id: siteId,
      brand_id: brandId,
      date_range_start: sinceIso.slice(0, 10),
      date_range_end: new Date().toISOString().slice(0, 10),
      daily_rollups: rollupsRes.data || [],
      content_performance: contentRes.data || [],
      funnel_reports: funnelsRes.data || [],
      funnel_steps: stepsRes.data || [],
      revenue_attribution: revenueRes.data || [],
    };

    const rawModel = await callGemini(model, geminiApiKey, context);
    const parsed = JSON.parse(rawModel) as { findings?: unknown[] };
    const findings = (parsed.findings || []).map(safeFinding).filter((f): f is Finding => Boolean(f)).slice(0, findingsLimit);

    if (!findings.length) return json(200, { ok: true, stored: 0, model, message: "No valid findings generated." });

    const now = new Date().toISOString();
    const rows = findings.map((f) => ({
      site_id: siteId,
      brand_id: brandId,
      source_type: "gemini",
      finding_type: f.finding_type,
      title: f.title,
      summary: f.summary,
      evidence: f.evidence || {},
      recommendation: f.recommendation,
      priority: f.priority,
      status: "new",
      related_page_path: f.related_page_path ?? null,
      related_content_id: f.related_content_id ?? null,
      related_offer_id: f.related_offer_id ?? null,
      related_campaign_id: f.related_campaign_id ?? null,
      model_used: model,
      date_range_start: sinceIso.slice(0, 10),
      date_range_end: new Date().toISOString().slice(0, 10),
      metadata: { generated_at: now, generator: "kora_analytics_generate_findings" },
    }));

    const { error: insertError } = await supabase.from("kora_analytics_findings").insert(rows);
    if (insertError) throw insertError;
    return json(200, { ok: true, stored: rows.length, model });
  } catch (error) {
    return json(500, { ok: false, error: error instanceof Error ? error.message : "generate-findings failed" });
  }
}
