import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const bodySchema = z.object({
  auditId: z.string().uuid(),
});

function cleanText(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 6000);
}

function urlOrNull(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim();
  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(withProtocol).toString();
  } catch {
    return raw;
  }
}

async function fetchWebsiteContext(url: string | null): Promise<string | null> {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "JahKnowsPR-AuditBot/1.0",
      },
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) return null;
    return cleanText(await response.text());
  } catch {
    return null;
  }
}

function heuristicIndustry(blob: string): string {
  const lower = blob.toLowerCase();
  if (/(beauty|skin|wellness|spa|salon|fitness|health|therapy)/.test(lower)) return "beauty_wellness";
  if (/(law|legal|attorney|compliance|accounting|finance|consulting firm)/.test(lower)) return "law_professional";
  if (/(real estate|realtor|property|broker|mortgage|listing)/.test(lower)) return "real_estate";
  if (/(music|artist|entertainment|record|film|media|podcast)/.test(lower)) return "music_entertainment";
  if (/(coach|consultant|course|speaker|mentor|advisor)/.test(lower)) return "coaching_consulting";
  if (/(restaurant|cafe|bar|food|hospitality|chef|menu)/.test(lower)) return "restaurant_hospitality";
  if (/(nonprofit|community|foundation|donation|impact|ministry)/.test(lower)) return "nonprofit_community";
  return "default_brand";
}

function heuristicAesthetic(blob: string): string {
  const lower = blob.toLowerCase();
  if (/(luxury|premium|elegant|minimal|editorial)/.test(lower)) return "premium minimal";
  if (/(bold|loud|culture|street|artist|music)/.test(lower)) return "bold cultural";
  if (/(soft|calm|wellness|natural|organic)/.test(lower)) return "soft refined";
  if (/(corporate|professional|trusted|secure|legal)/.test(lower)) return "structured authority";
  return "strategic editorial";
}

async function classifyWithOpenAI(input: {
  businessName: string;
  websiteContext: string | null;
  formContext: string;
  sourceUrls: string[];
  fallbackIndustry: string;
  fallbackAesthetic: string;
}) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return {
      detected_industry: input.fallbackIndustry,
      detected_aesthetic: input.fallbackAesthetic,
      recommended_vibe: "Use the approved industry profile, elevated by JahKnowsPR strategy rules.",
      confidence: 0.45,
      rationale: "OPENAI_API_KEY not configured; heuristic fallback used.",
    };
  }

  const prompt = [
    "You are JahKnowsPR's brand aesthetic analyst.",
    "Classify the lead's industry and current aesthetic from public website/social/form context.",
    "Do not recommend copying weak branding. Recommend the strategic vibe that would improve conversion while staying aligned with JahKnowsPR premium editorial style.",
    "Return strict JSON only with keys: detected_industry, detected_aesthetic, recommended_vibe, confidence, rationale.",
    "Allowed detected_industry values: beauty_wellness, law_professional, real_estate, music_entertainment, coaching_consulting, restaurant_hospitality, nonprofit_community, default_brand.",
    `Business: ${input.businessName}`,
    `Source URLs: ${input.sourceUrls.join(", ")}`,
    `Form context: ${input.formContext}`,
    `Website context: ${input.websiteContext ?? "Unavailable"}`,
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_CHAT_MODEL")?.trim() || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    return {
      detected_industry: input.fallbackIndustry,
      detected_aesthetic: input.fallbackAesthetic,
      recommended_vibe: "Use the approved industry profile, elevated by JahKnowsPR strategy rules.",
      confidence: 0.45,
      rationale: `OpenAI classification failed: ${await response.text()}`,
    };
  }

  const data = await response.json();
  const content = String(data?.choices?.[0]?.message?.content ?? "{}");
  const parsed = JSON.parse(content) as Record<string, unknown>;
  return {
    detected_industry: typeof parsed.detected_industry === "string" ? parsed.detected_industry : input.fallbackIndustry,
    detected_aesthetic: typeof parsed.detected_aesthetic === "string" ? parsed.detected_aesthetic : input.fallbackAesthetic,
    recommended_vibe: typeof parsed.recommended_vibe === "string"
      ? parsed.recommended_vibe
      : "Use the approved industry profile, elevated by JahKnowsPR strategy rules.",
    confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0.6,
    rationale: typeof parsed.rationale === "string" ? parsed.rationale : "Classified from submitted audit context.",
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid payload", details: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Server configuration incomplete" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: audit, error } = await supabase
      .from("free_audits")
      .select("*")
      .eq("id", parsed.data.auditId)
      .maybeSingle();
    if (error) throw error;
    if (!audit) {
      return new Response(JSON.stringify({ error: "Audit not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sourceUrls = [
      urlOrNull(audit.website_link),
      urlOrNull(audit.instagram),
      urlOrNull(audit.facebook),
      urlOrNull(audit.tiktok),
      urlOrNull(audit.other_socials),
    ].filter((value): value is string => Boolean(value));
    const websiteContext = await fetchWebsiteContext(urlOrNull(audit.website_link));
    const formContext = [
      audit.business_name,
      audit.growth_goal,
      audit.current_blocker,
      audit.target_audience_belief,
      audit.audit_angle,
    ].filter(Boolean).join(" | ");
    const blob = `${formContext} ${websiteContext ?? ""} ${sourceUrls.join(" ")}`;
    const fallbackIndustry = heuristicIndustry(blob);
    const fallbackAesthetic = heuristicAesthetic(blob);
    const classification = await classifyWithOpenAI({
      businessName: String(audit.business_name || audit.contact_name || audit.lead_key || "Unknown brand"),
      websiteContext,
      formContext,
      sourceUrls,
      fallbackIndustry,
      fallbackAesthetic,
    });

    const signals = {
      ...classification,
      website_context_available: Boolean(websiteContext),
      source_count: sourceUrls.length,
      form_context: formContext,
    };

    const { error: upsertError } = await supabase.from("audit_aesthetic_signals").upsert(
      {
        audit_id: audit.id,
        lead_key: audit.lead_key,
        detected_industry: classification.detected_industry,
        detected_aesthetic: classification.detected_aesthetic,
        recommended_vibe: classification.recommended_vibe,
        confidence: classification.confidence,
        source_urls: sourceUrls,
        signals,
      },
      { onConflict: "audit_id" },
    );
    if (upsertError) throw upsertError;

    const existingMetadata = audit.metadata && typeof audit.metadata === "object" ? audit.metadata as Record<string, unknown> : {};
    await supabase
      .from("free_audits")
      .update({
        metadata: {
          ...existingMetadata,
          aesthetic_scan: signals,
          detected_industry: classification.detected_industry,
          detected_aesthetic: classification.detected_aesthetic,
          recommended_vibe: classification.recommended_vibe,
        },
      })
      .eq("id", audit.id);

    return new Response(JSON.stringify({ ok: true, ...signals }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("free-audit-aesthetic-scan error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
