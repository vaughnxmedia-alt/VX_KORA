import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const bodySchema = z.object({
  slug: z.string().min(2).max(120),
});

function jsonResponse(body: Record<string, unknown>, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function publicAuditSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 90) || "brand-audit";
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
  }

  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return jsonResponse({ error: "Invalid audit audio link" }, 400, corsHeaders);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Server configuration incomplete" }, 500, corsHeaders);
    }

    const requestedSlug = publicAuditSlug(parsed.data.slug);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase
      .from("free_audits")
      .select("id,business_name,contact_name,metadata,created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;

    const match = (data ?? []).find((audit) => {
      const metadata = asObject(audit.metadata);
      const audio = asObject(metadata.report_audio);
      const storedSlug = typeof audio.public_slug === "string" ? publicAuditSlug(audio.public_slug) : "";
      const businessSlug = publicAuditSlug(String(audit.business_name ?? ""));
      return storedSlug === requestedSlug || businessSlug === requestedSlug;
    });

    if (!match) {
      return jsonResponse({ error: "Audio brief not found" }, 404, corsHeaders);
    }

    const metadata = asObject(match.metadata);
    const audio = asObject(metadata.report_audio);
    const audioUrl = typeof audio.url === "string" ? audio.url : "";
    if (!audioUrl) {
      return jsonResponse({ error: "Audio brief not available yet" }, 404, corsHeaders);
    }

    return jsonResponse({
      businessName: match.business_name ?? "Your Brand",
      contactName: match.contact_name ?? null,
      audioUrl,
      audioMode: audio.audio_mode ?? null,
      generatedAt: audio.generated_at ?? null,
      estimatedMinutes: audio.estimated_minutes ?? null,
      wordCount: audio.word_count ?? null,
    }, 200, corsHeaders);
  } catch (error) {
    console.error("audit-audio-page error", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500, corsHeaders);
  }
});
