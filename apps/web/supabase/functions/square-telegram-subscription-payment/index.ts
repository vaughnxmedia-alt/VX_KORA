/**
 * Public: create a Square monthly subscription for Telegram access ($15/mo),
 * then email a bot join link using a one-time invite token.
 *
 * Required secrets:
 * - SQUARE_ACCESS_TOKEN
 * - SQUARE_LOCATION_ID
 * - SQUARE_SUBSCRIPTION_PLAN_VARIATION_ID
 * - RESEND_API_KEY
 * - SUPABASE_SERVICE_ROLE_KEY (provided by runtime)
 * - SUPABASE_URL (provided by runtime)
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod/mod.ts";
import { Resend } from "npm:resend@2.0.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logOutboundEmail } from "../_shared/outbound-email-log.ts";

const bodySchema = z.object({
  sourceId: z.string().min(4, "Invalid payment source"),
  idempotencyKey: z.string().uuid("Invalid idempotency key"),
  email: z.string().email(),
  fullName: z.string().min(2).max(120),
});

const FROM_NAME = "Jah Jah";
const DEFAULT_FROM_EMAIL = "welcome@jahknowspr.com";
const TELEGRAM_BOT_LINK = "https://t.me/VX_kora_bot";
const SQUARE_VERSION = "2024-10-17";
const AMOUNT_CENTS = 1500;

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function splitName(full: string): { first: string; last: string | null } {
  const t = full.trim();
  const i = t.indexOf(" ");
  if (i === -1) return { first: t, last: null };
  return { first: t.slice(0, i).trim(), last: t.slice(i + 1).trim() || null };
}

function buildTelegramAccessEmailHtml(name: string, joinLink: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;line-height:1.6;color:#111827;">
      <h2 style="margin:0 0 12px;color:#0f172a;">You're in, ${name}.</h2>
      <p style="margin:0 0 12px;">Your KORA Telegram access subscription is active.</p>
      <p style="margin:0 0 20px;">Tap below to join and connect your Telegram account:</p>
      <a href="${joinLink}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">
        Join KORA on Telegram
      </a>
      <p style="margin:20px 0 0;color:#6b7280;font-size:14px;">
        If the button does not open, use this link: ${joinLink}
      </p>
    </div>
  `;
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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const SQUARE_ACCESS_TOKEN = Deno.env.get("SQUARE_ACCESS_TOKEN") ?? "";
    const SQUARE_LOCATION_ID = Deno.env.get("SQUARE_LOCATION_ID") ?? "";
    const PLAN_VARIATION_ID = Deno.env.get("SQUARE_SUBSCRIPTION_PLAN_VARIATION_ID") ?? "";
    const SQUARE_ENVIRONMENT = (Deno.env.get("SQUARE_ENVIRONMENT") || "production").toLowerCase();
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
    const FROM_EMAIL = Deno.env.get("TELEGRAM_SUBSCRIPTION_FROM_EMAIL") || DEFAULT_FROM_EMAIL;

    if (
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY ||
      !SQUARE_ACCESS_TOKEN ||
      !SQUARE_LOCATION_ID ||
      !PLAN_VARIATION_ID ||
      !RESEND_API_KEY
    ) {
      return new Response(JSON.stringify({ error: "Server configuration incomplete." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input.", details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { sourceId, idempotencyKey, email, fullName } = parsed.data;
    const emailNorm = email.trim().toLowerCase();

    const squareBaseUrl =
      SQUARE_ENVIRONMENT === "sandbox"
        ? "https://connect.squareupsandbox.com"
        : "https://connect.squareup.com";

    const squareHeaders = {
      Authorization: `Bearer ${SQUARE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "Square-Version": SQUARE_VERSION,
    };

    const customerRes = await fetch(`${squareBaseUrl}/v2/customers`, {
      method: "POST",
      headers: squareHeaders,
      body: JSON.stringify({
        given_name: splitName(fullName).first,
        family_name: splitName(fullName).last ?? undefined,
        email_address: emailNorm,
        idempotency_key: `${idempotencyKey}-customer`,
      }),
    });
    const customerJson = await customerRes.json();
    const squareCustomerId = customerJson?.customer?.id as string | undefined;
    if (!customerRes.ok || !squareCustomerId) {
      console.error("Square create customer failed:", customerRes.status, customerJson);
      return new Response(JSON.stringify({ error: "Could not start subscription." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cardRes = await fetch(`${squareBaseUrl}/v2/cards`, {
      method: "POST",
      headers: squareHeaders,
      body: JSON.stringify({
        source_id: sourceId,
        idempotency_key: `${idempotencyKey}-card`,
        customer_id: squareCustomerId,
      }),
    });
    const cardJson = await cardRes.json();
    const squareCardId = cardJson?.card?.id as string | undefined;
    if (!cardRes.ok || !squareCardId) {
      console.error("Square create card failed:", cardRes.status, cardJson);
      return new Response(JSON.stringify({ error: "Card could not be saved for billing." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subscriptionRes = await fetch(`${squareBaseUrl}/v2/subscriptions`, {
      method: "POST",
      headers: squareHeaders,
      body: JSON.stringify({
        idempotency_key: `${idempotencyKey}-subscription`,
        location_id: SQUARE_LOCATION_ID,
        plan_variation_id: PLAN_VARIATION_ID,
        customer_id: squareCustomerId,
        card_id: squareCardId,
        start_date: new Date().toISOString().slice(0, 10),
      }),
    });
    const subscriptionJson = await subscriptionRes.json();
    const squareSubscriptionId = subscriptionJson?.subscription?.id as string | undefined;
    const squareStatus = (subscriptionJson?.subscription?.status as string | undefined) || "UNKNOWN";
    if (!subscriptionRes.ok || !squareSubscriptionId) {
      console.error("Square create subscription failed:", subscriptionRes.status, subscriptionJson);
      return new Response(JSON.stringify({ error: "Subscription could not be created." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: subscriptionRow, error: subscriptionInsertErr } = await supabaseAdmin
      .from("telegram_subscriptions")
      .insert({
        email: emailNorm,
        full_name: fullName.trim(),
        provider: "square",
        square_customer_id: squareCustomerId,
        square_card_id: squareCardId,
        square_subscription_id: squareSubscriptionId,
        square_status: squareStatus,
        plan_variation_id: PLAN_VARIATION_ID,
        amount_cents: AMOUNT_CENTS,
        currency: "USD",
        access_status: "active",
      })
      .select("id")
      .single();
    if (subscriptionInsertErr) {
      console.error("telegram_subscriptions insert error:", subscriptionInsertErr);
      return new Response(JSON.stringify({ error: "Subscription created but could not be recorded." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = randomToken();
    const inviteRow = await supabaseAdmin
      .from("telegram_access_invites")
      .insert({
        subscription_id: subscriptionRow.id,
        email: emailNorm,
        full_name: fullName.trim(),
        token,
      })
      .select("id")
      .single();
    if (inviteRow.error) {
      console.error("telegram_access_invites insert error:", inviteRow.error);
      return new Response(JSON.stringify({ error: "Subscription created but invite setup failed." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const joinLink = `${TELEGRAM_BOT_LINK}?start=join_${token}`;
    const emailSubject = "KORA Telegram Access Active";
    const emailHtml = buildTelegramAccessEmailHtml(fullName.trim(), joinLink);
    const resend = new Resend(RESEND_API_KEY);

    try {
      const sendResult = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: emailNorm,
        subject: emailSubject,
        html: emailHtml,
      });
      await logOutboundEmail(supabaseAdmin, {
        messageType: "telegram_subscription_access",
        fromEmail: FROM_EMAIL,
        toEmail: emailNorm,
        subject: emailSubject,
        status: "sent",
        providerMessageId: (sendResult as { data?: { id?: string } })?.data?.id ?? null,
        relatedTable: "telegram_subscriptions",
        relatedId: subscriptionRow.id,
        generatedBy: "system",
        bodyHtml: emailHtml,
      });
    } catch (emailErr) {
      console.error("telegram subscription email error:", emailErr);
      await logOutboundEmail(supabaseAdmin, {
        messageType: "telegram_subscription_access",
        fromEmail: FROM_EMAIL,
        toEmail: emailNorm,
        subject: emailSubject,
        status: "failed",
        errorMessage: emailErr instanceof Error ? emailErr.message : "Failed to send telegram access email",
        relatedTable: "telegram_subscriptions",
        relatedId: subscriptionRow.id,
        generatedBy: "system",
        bodyHtml: emailHtml,
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        squareSubscriptionId,
        status: squareStatus,
        joinLink,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
