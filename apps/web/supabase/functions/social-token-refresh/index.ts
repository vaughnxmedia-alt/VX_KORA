import { getCorsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken, encryptToken } from "../_shared/token-crypto.ts";

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
    const META_APP_ID = Deno.env.get("META_APP_ID") ?? "";
    const META_APP_SECRET = Deno.env.get("META_APP_SECRET") ?? "";
    const TOKEN_SECRET = Deno.env.get("INTEGRATION_TOKEN_ENCRYPTION_KEY") ?? "";
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !META_APP_ID || !META_APP_SECRET || !TOKEN_SECRET) {
      return new Response(JSON.stringify({ error: "Server refresh configuration missing." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const socialAccountId = String(body.socialAccountId || "").trim();
    if (!socialAccountId) {
      return new Response(JSON.stringify({ error: "socialAccountId is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: tokenRow, error: tokenErr } = await admin
      .from("social_account_tokens")
      .select("id,encrypted_access_token")
      .eq("social_account_id", socialAccountId)
      .single();
    if (tokenErr || !tokenRow?.encrypted_access_token) {
      return new Response(JSON.stringify({ error: "Token row not found." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentToken = await decryptToken(tokenRow.encrypted_access_token, TOKEN_SECRET);
    const refreshRes = await fetch(
      `https://graph.facebook.com/v20.0/oauth/access_token` +
        `?grant_type=fb_exchange_token` +
        `&client_id=${encodeURIComponent(META_APP_ID)}` +
        `&client_secret=${encodeURIComponent(META_APP_SECRET)}` +
        `&fb_exchange_token=${encodeURIComponent(currentToken)}`,
    );
    const refreshJson = await refreshRes.json();
    if (!refreshRes.ok || !refreshJson.access_token) {
      await admin
        .from("social_account_tokens")
        .update({
          token_status: "refresh_failed",
          refresh_error: refreshJson?.error?.message || "Refresh failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", tokenRow.id);
      return new Response(JSON.stringify({ error: refreshJson?.error?.message || "Refresh failed." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nextToken = String(refreshJson.access_token);
    const expiresIn = Number(refreshJson.expires_in || 60 * 60);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    const encrypted = await encryptToken(nextToken, TOKEN_SECRET);

    await admin
      .from("social_account_tokens")
      .update({
        encrypted_access_token: encrypted,
        expires_at: expiresAt,
        token_status: "valid",
        refresh_error: null,
        last_refreshed_at: new Date().toISOString(),
      })
      .eq("id", tokenRow.id);

    return new Response(JSON.stringify({ ok: true, expiresAt }), {
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
