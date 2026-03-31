import { getCorsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken } from "../_shared/token-crypto.ts";

async function publishToFacebookPage(pageId: string, token: string, message: string) {
  const res = await fetch(`https://graph.facebook.com/v20.0/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, access_token: token }),
  });
  const json = await res.json();
  return { ok: res.ok, json };
}

async function publishToInstagramAccount(igUserId: string, token: string, caption: string, mediaUrl: string) {
  const containerRes = await fetch(`https://graph.facebook.com/v20.0/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: mediaUrl,
      caption,
      access_token: token,
    }),
  });
  const containerJson = await containerRes.json();
  if (!containerRes.ok || !containerJson?.id) return { ok: false, json: containerJson };
  const publishRes = await fetch(`https://graph.facebook.com/v20.0/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: containerJson.id,
      access_token: token,
    }),
  });
  const publishJson = await publishRes.json();
  return { ok: publishRes.ok, json: publishJson };
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

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const TOKEN_SECRET = Deno.env.get("INTEGRATION_TOKEN_ENCRYPTION_KEY") ?? "";
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !TOKEN_SECRET) {
      return new Response(JSON.stringify({ error: "Server worker configuration missing." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const nowIso = new Date().toISOString();

    const { data: jobs, error: jobsErr } = await admin
      .from("publish_jobs")
      .select("id,content_item_id,content_variant_id,social_account_id,provider,retry_count,max_retries")
      .in("status", ["scheduled", "queued"])
      .lte("scheduled_for", nowIso)
      .order("scheduled_for", { ascending: true })
      .limit(10);
    if (jobsErr) throw jobsErr;

    let processed = 0;
    for (const job of jobs || []) {
      await admin
        .from("publish_jobs")
        .update({ status: "running", lock_owner: "social-publish-worker", lock_acquired_at: nowIso })
        .eq("id", job.id);

      const { data: variant } = await admin
        .from("content_variants")
        .select("body_text,metadata")
        .eq("id", job.content_variant_id)
        .single();
      const { data: account } = await admin
        .from("social_accounts")
        .select("account_type,external_account_id")
        .eq("id", job.social_account_id)
        .single();
      const { data: tokenRow } = await admin
        .from("social_account_tokens")
        .select("encrypted_access_token")
        .eq("social_account_id", job.social_account_id)
        .single();

      let status: "published" | "failed" | "action_required" = "failed";
      let providerPostId: string | null = null;
      let errorMessage: string | null = null;
      let raw: unknown = null;

      try {
        if (!variant || !account || !tokenRow?.encrypted_access_token) {
          throw new Error("Job dependencies missing (variant/account/token).");
        }
        const token = await decryptToken(tokenRow.encrypted_access_token, TOKEN_SECRET);
        const message = String(variant.body_text || "");
        const mediaUrl = String((variant.metadata as Record<string, unknown>)?.mediaUrl || "");
        if (account.account_type === "facebook_page") {
          const res = await publishToFacebookPage(account.external_account_id, token, message);
          raw = res.json;
          if (!res.ok) throw new Error(res.json?.error?.message || "Facebook publish failed.");
          providerPostId = String(res.json?.id || "");
          status = "published";
        } else if (account.account_type === "instagram_professional") {
          if (!mediaUrl) throw new Error("Instagram publishing requires metadata.mediaUrl.");
          const res = await publishToInstagramAccount(account.external_account_id, token, message, mediaUrl);
          raw = res.json;
          if (!res.ok) throw new Error(res.json?.error?.message || "Instagram publish failed.");
          providerPostId = String(res.json?.id || "");
          status = "published";
        } else {
          throw new Error("Unsupported account type for Meta worker.");
        }
      } catch (e) {
        errorMessage = e instanceof Error ? e.message : "Publish failed";
        status = "failed";
      }

      const nextRetry = status === "failed" && job.retry_count < job.max_retries
        ? new Date(Date.now() + Math.min(60, 2 ** Math.max(1, job.retry_count)) * 60_000).toISOString()
        : null;

      const nextStatus =
        status === "published"
          ? "published"
          : nextRetry
            ? "queued"
            : "dead_letter";

      await admin.from("publish_attempts").insert({
        publish_job_id: job.id,
        attempt_number: (job.retry_count || 0) + 1,
        started_at: nowIso,
        completed_at: new Date().toISOString(),
        status: status === "published" ? "success" : nextRetry ? "retrying" : "failed",
        provider_response: raw ? raw : errorMessage ? { error: errorMessage } : {},
        error_category: status === "published" ? null : "unknown",
        error_message: errorMessage,
      });

      await admin
        .from("publish_jobs")
        .update({
          status: nextStatus,
          retry_count: status === "published" ? job.retry_count : (job.retry_count || 0) + 1,
          next_retry_at: nextRetry,
          provider_post_id: providerPostId,
          last_error_message: errorMessage,
          lock_owner: null,
          lock_acquired_at: null,
        })
        .eq("id", job.id);

      processed += 1;
    }

    return new Response(JSON.stringify({ ok: true, processed }), {
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
