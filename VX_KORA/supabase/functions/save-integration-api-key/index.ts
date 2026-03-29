import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/i, "");
  if (clean.length % 2 !== 0) throw new Error("invalid hex");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function encryptPayload(plaintext: string, keyHex: string): Promise<string> {
  const keyRaw = hexToBytes(keyHex);
  if (keyRaw.length !== 32) {
    throw new Error("INTEGRATION_TOKEN_ENCRYPTION_KEY must be 64 hex chars (32 bytes)");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    keyRaw,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext),
  );
  const buf = new Uint8Array(cipher);
  const combined = new Uint8Array(iv.length + buf.length);
  combined.set(iv, 0);
  combined.set(buf, iv.length);
  return bytesToBase64(combined);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseAnon || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as {
      provider?: string;
      api_key?: string;
      api_secret?: string | null;
    };
    const provider = body.provider?.trim();
    const apiKey = body.api_key?.trim();
    const apiSecret = body.api_secret?.trim() || null;
    if (!provider || !apiKey) {
      return new Response(JSON.stringify({ error: "provider and api_key are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: tu, error: tuErr } = await admin
      .from("tenant_users")
      .select("tenant_id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (tuErr || !tu) {
      return new Response(JSON.stringify({ error: "No tenant membership" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["owner", "admin"].includes(tu.role as string)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const keyHex = Deno.env.get("INTEGRATION_TOKEN_ENCRYPTION_KEY");
    if (!keyHex) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({ api_key: apiKey, api_secret: apiSecret });
    const encryptedPayload = await encryptPayload(payload, keyHex.replace(/^0x/i, ""));
    const hint = apiKey.length >= 4 ? apiKey.slice(-4) : "****";

    const { error: upsertErr } = await admin.from("integration_api_credentials").upsert(
      {
        tenant_id: tu.tenant_id,
        provider,
        credential_kind: "api_key",
        encrypted_payload: encryptedPayload,
        key_hint: hint,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,provider" },
    );

    if (upsertErr) {
      console.error(upsertErr);
      return new Response(JSON.stringify({ error: upsertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, masked_hint: `…${hint}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
