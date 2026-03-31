import { getCorsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Server configuration missing." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    const organizationId = String(body.organizationId || "").trim();
    const contentItemId = String(body.contentItemId || "").trim();
    const contentVariantId = String(body.contentVariantId || "").trim();
    const socialAccountId = String(body.socialAccountId || "").trim();
    const scheduledFor = String(body.scheduledFor || "").trim();
    if (!organizationId || !contentItemId || !contentVariantId || !socialAccountId || !scheduledFor) {
      return new Response(JSON.stringify({ error: "Missing required fields." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: account, error: accountErr } = await admin
      .from("social_accounts")
      .select("id,provider,status")
      .eq("id", socialAccountId)
      .eq("organization_id", organizationId)
      .single();
    if (accountErr || !account || account.status !== "connected") {
      return new Response(JSON.stringify({ error: "Social account not eligible for publishing." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tokenRow } = await admin
      .from("social_account_tokens")
      .select("token_status,expires_at")
      .eq("social_account_id", socialAccountId)
      .single();
    if (!tokenRow || tokenRow.token_status !== "valid") {
      return new Response(JSON.stringify({ error: "Token invalid. Reconnect social account." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: job, error: jobErr } = await admin
      .from("publish_jobs")
      .insert({
        organization_id: organizationId,
        content_item_id: contentItemId,
        content_variant_id: contentVariantId,
        social_account_id: socialAccountId,
        provider: account.provider,
        scheduled_for: scheduledFor,
        status: "scheduled",
      })
      .select("id,status,scheduled_for")
      .single();
    if (jobErr || !job) {
      return new Response(JSON.stringify({ error: jobErr?.message || "Could not enqueue job." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, job }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
