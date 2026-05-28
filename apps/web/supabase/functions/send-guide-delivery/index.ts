import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { autoSendGuideDeliveryEmail } from "../_shared/autoGuideDelivery.ts";

const bodySchema = z.object({
  auditIds: z.array(z.string().uuid()).max(20).default([]),
  force: z.boolean().default(true),
  match: z.array(z.string().min(2)).max(10).optional(),
}).refine(
  (value) => value.auditIds.length > 0 || (value.match?.length ?? 0) > 0,
  { message: "Provide auditIds or match terms" },
);

function jsonResponse(body: Record<string, unknown>, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Server configuration incomplete" }, 500, corsHeaders);
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return jsonResponse({ error: "Invalid payload", details: parsed.error.flatten() }, 400, corsHeaders);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData.user) {
      return jsonResponse({ error: "Invalid session" }, 401, corsHeaders);
    }

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const allowed = (roleRows ?? []).some((row: { role: string }) =>
      ["admin", "author", "intern", "3pv"].includes(row.role),
    );
    if (!allowed) {
      return jsonResponse({ error: "Forbidden" }, 403, corsHeaders);
    }

    let auditIds = parsed.data.auditIds;

    if (parsed.data.match?.length) {
      const { data: rows, error } = await supabase
        .from("free_audits")
        .select("id,business_name,lead_email_lower,website_link,instagram,facebook,tiktok,other_socials,metadata")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const terms = parsed.data.match.map((t) => t.toLowerCase());
      const matched = (rows ?? []).filter((row) => {
        const blob = [
          row.business_name,
          row.lead_email_lower,
          row.website_link,
        ].filter(Boolean).join(" ").toLowerCase();
        return terms.some((term) => blob.includes(term));
      });
      auditIds = matched.map((row) => row.id as string);
      if (!auditIds.length) {
        return jsonResponse({ error: "No audits matched", match: parsed.data.match }, 404, corsHeaders);
      }
    }

    const results: Array<Record<string, unknown>> = [];

    for (const auditId of auditIds) {
      const { data: audit, error: auditError } = await supabase
        .from("free_audits")
        .select("*")
        .eq("id", auditId)
        .maybeSingle();
      if (auditError) throw auditError;
      if (!audit) {
        results.push({ auditId, ok: false, error: "not_found" });
        continue;
      }

      const row = audit as Record<string, unknown>;
      const presence = {
        website_link: row.website_link as string | null,
        instagram: row.instagram as string | null,
        facebook: row.facebook as string | null,
        tiktok: row.tiktok as string | null,
        other_socials: row.other_socials as string | null,
        metadata: row.metadata as Record<string, unknown> | null,
      };

      const guideResult = await autoSendGuideDeliveryEmail(
        supabase,
        {
          id: String(row.id),
          audit_intake_id: String(row.audit_intake_id ?? row.id),
          lead_email_lower: row.lead_email_lower as string | null,
          lead_key: row.lead_key as string | null,
          contact_name: row.contact_name as string | null,
          business_name: row.business_name as string | null,
          website_link: presence.website_link,
          instagram: presence.instagram,
          facebook: presence.facebook,
          tiktok: presence.tiktok,
          other_socials: presence.other_socials,
          follow_up_status: row.follow_up_status as string | null,
          metadata: presence.metadata,
        },
        { force: parsed.data.force, forceGuidePath: true },
      );

      results.push({
        auditId,
        business_name: row.business_name,
        email: row.lead_email_lower,
        ok: guideResult.sent,
        ...guideResult,
      });
    }

    return jsonResponse({ ok: true, results }, 200, corsHeaders);
  } catch (error) {
    console.error("send-guide-delivery error", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
      corsHeaders,
    );
  }
});
