import { getCorsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptToken } from "../_shared/token-crypto.ts";

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
      return new Response(JSON.stringify({ error: "Server OAuth configuration missing." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const code = String(body.code || "").trim();
    const state = String(body.state || "").trim();
    if (!code || !state) {
      return new Response(JSON.stringify({ error: "code and state are required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: oauthState, error: stateErr } = await admin
      .from("social_oauth_states")
      .select("*")
      .eq("provider", "meta")
      .eq("state", state)
      .maybeSingle();
    if (stateErr || !oauthState) {
      return new Response(JSON.stringify({ error: "Invalid OAuth state." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (oauthState.used_at || new Date(oauthState.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "Expired OAuth state." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const shortTokenRes = await fetch(
      `https://graph.facebook.com/v20.0/oauth/access_token` +
        `?client_id=${encodeURIComponent(META_APP_ID)}` +
        `&redirect_uri=${encodeURIComponent(oauthState.redirect_uri)}` +
        `&client_secret=${encodeURIComponent(META_APP_SECRET)}` +
        `&code=${encodeURIComponent(code)}`,
    );
    const shortTokenJson = await shortTokenRes.json();
    if (!shortTokenRes.ok || !shortTokenJson.access_token) {
      return new Response(JSON.stringify({ error: shortTokenJson?.error?.message || "Could not exchange token." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const shortToken = String(shortTokenJson.access_token);

    const longTokenRes = await fetch(
      `https://graph.facebook.com/v20.0/oauth/access_token` +
        `?grant_type=fb_exchange_token` +
        `&client_id=${encodeURIComponent(META_APP_ID)}` +
        `&client_secret=${encodeURIComponent(META_APP_SECRET)}` +
        `&fb_exchange_token=${encodeURIComponent(shortToken)}`,
    );
    const longTokenJson = await longTokenRes.json();
    const userToken = String(longTokenJson.access_token || shortToken);
    const expiresIn = Number(longTokenJson.expires_in || 60 * 60);
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const pagesRes = await fetch(
      `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${encodeURIComponent(userToken)}`,
    );
    const pagesJson = await pagesRes.json();
    const pages = Array.isArray(pagesJson?.data) ? pagesJson.data : [];

    const connected: Array<{ type: string; id: string; name: string }> = [];

    for (const page of pages) {
      const pageId = String(page.id);
      const pageName = String(page.name || page.id);
      const pageAccessToken = String(page.access_token || userToken);
      const pageEnc = await encryptToken(pageAccessToken, TOKEN_SECRET);

      const { data: pageRow, error: pageUpsertErr } = await admin
        .from("social_accounts")
        .upsert(
          {
            organization_id: oauthState.organization_id,
            provider: "meta",
            account_type: "facebook_page",
            external_account_id: pageId,
            account_name: pageName,
            status: "connected",
            scopes: [
              "pages_show_list",
              "pages_read_engagement",
              "pages_manage_posts",
              "pages_manage_metadata",
              "instagram_business_content_publish",
              "instagram_basic",
              "instagram_manage_insights",
            ],
          },
          { onConflict: "provider,external_account_id" },
        )
        .select("id")
        .single();
      if (pageUpsertErr || !pageRow) continue;

      await admin.from("social_account_tokens").upsert(
        {
          social_account_id: pageRow.id,
          encrypted_access_token: pageEnc,
          expires_at: tokenExpiresAt,
          token_status: "valid",
          last_refreshed_at: new Date().toISOString(),
        },
        { onConflict: "social_account_id" },
      );

      connected.push({ type: "facebook_page", id: pageId, name: pageName });

      const ig = page.instagram_business_account;
      if (ig?.id) {
        const igId = String(ig.id);
        const igName = String(ig.username || `IG ${igId}`);
        const { data: igRow, error: igUpsertErr } = await admin
          .from("social_accounts")
          .upsert(
            {
              organization_id: oauthState.organization_id,
              provider: "meta",
              account_type: "instagram_professional",
              external_account_id: igId,
              account_name: igName,
              username: igName,
              status: "connected",
              scopes: [
                "instagram_business_content_publish",
                "instagram_basic",
                "instagram_manage_insights",
                "pages_read_engagement",
              ],
            },
            { onConflict: "provider,external_account_id" },
          )
          .select("id")
          .single();
        if (!igUpsertErr && igRow) {
          await admin.from("social_account_tokens").upsert(
            {
              social_account_id: igRow.id,
              encrypted_access_token: pageEnc,
              expires_at: tokenExpiresAt,
              token_status: "valid",
              last_refreshed_at: new Date().toISOString(),
            },
            { onConflict: "social_account_id" },
          );
          connected.push({ type: "instagram_professional", id: igId, name: igName });
        }
      }
    }

    await admin
      .from("social_oauth_states")
      .update({ used_at: new Date().toISOString() })
      .eq("id", oauthState.id);

    return new Response(JSON.stringify({ ok: true, organizationId: oauthState.organization_id, connected }), {
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
