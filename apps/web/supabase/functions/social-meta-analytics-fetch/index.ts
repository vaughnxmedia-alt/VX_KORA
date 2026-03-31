import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { decryptToken } from "../_shared/token-crypto.ts";

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
    const TOKEN_SECRET = Deno.env.get("INTEGRATION_TOKEN_ENCRYPTION_KEY") ?? "";
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !TOKEN_SECRET) {
      return new Response(JSON.stringify({ error: "Server configuration missing." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));
    const organizationId = String(body.organizationId || "").trim();
    if (!organizationId) {
      return new Response(JSON.stringify({ error: "organizationId is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: accounts } = await admin
      .from("social_accounts")
      .select("id,account_type,external_account_id")
      .eq("organization_id", organizationId)
      .eq("provider", "meta")
      .eq("status", "connected");

    let written = 0;
    const today = new Date().toISOString().slice(0, 10);

    for (const account of accounts || []) {
      const { data: tokenRow } = await admin
        .from("social_account_tokens")
        .select("encrypted_access_token")
        .eq("social_account_id", account.id)
        .single();
      if (!tokenRow?.encrypted_access_token) continue;
      const token = await decryptToken(tokenRow.encrypted_access_token, TOKEN_SECRET);

      let endpoint = "";
      if (account.account_type === "facebook_page") {
        endpoint = `https://graph.facebook.com/v20.0/${account.external_account_id}?fields=followers_count,fan_count,engagement&access_token=${encodeURIComponent(token)}`;
      } else if (account.account_type === "instagram_professional") {
        endpoint = `https://graph.facebook.com/v20.0/${account.external_account_id}/insights?metric=impressions,reach,profile_views&period=day&access_token=${encodeURIComponent(token)}`;
      } else {
        continue;
      }

      const res = await fetch(endpoint);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) continue;

      const { error } = await admin
        .from("social_metrics_snapshots")
        .upsert({
          organization_id: organizationId,
          social_account_id: account.id,
          provider: "meta",
          metric_date: today,
          metrics: json,
          captured_at: new Date().toISOString(),
        }, { onConflict: "social_account_id,metric_date" });
      if (!error) written += 1;
    }

    return new Response(JSON.stringify({ ok: true, written }), {
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

