/**
 * Public checkout for a configured workshop.
 * Price, seat hold, and payment status are decided on the server.
 * A browser redirect is not treated as payment.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import {
  formatSquareAuthError,
  mismatchMessage,
  squareEnvironmentFromApplicationId,
} from "../_shared/square-environment.ts";
import { sendWorkshopConfirmationEmail } from "../_shared/workshop-email.ts";

const SQUARE_VERSION = "2024-10-17";

const bodySchema = z.object({
  slug: z.string().min(3).max(120),
  sourceId: z.string().min(4).max(500),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  businessName: z.string().trim().min(1).max(160),
  businessType: z.string().trim().min(1).max(120),
  misunderstanding: z.string().trim().min(2).max(1000),
  marketingConsent: z.boolean().optional(),
  cancellationAcknowledged: z.literal(true),
  confirmationToken: z.string().trim().min(16).max(80).optional(),
  applicationId: z.string().max(128).optional(),
});

function json(corsHeaders: HeadersInit, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(corsHeaders, 405, { error: "Method not allowed" });

  const accessToken = Deno.env.get("SQUARE_ACCESS_TOKEN")?.trim();
  const locationId = Deno.env.get("SQUARE_LOCATION_ID")?.trim();
  const useSandbox = (Deno.env.get("SQUARE_ENVIRONMENT") || "production").toLowerCase() === "sandbox";
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!accessToken || !locationId || !supabaseUrl || !serviceKey) {
    return json(corsHeaders, 503, { error: "Payment service is not configured." });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json(corsHeaders, 400, { error: "Check the form and try again." });

  const clientAppId = parsed.data.applicationId?.trim() ?? "";
  if (clientAppId) {
    const clientEnv = squareEnvironmentFromApplicationId(clientAppId);
    const serverEnv = useSandbox ? "sandbox" : "production";
    if (clientEnv && clientEnv !== serverEnv) {
      return json(corsHeaders, 503, { error: mismatchMessage(clientAppId, useSandbox) });
    }
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: reserved, error: reserveError } = await supabase.rpc("reserve_workshop_seat", {
    p_slug: parsed.data.slug,
    p_full_name: parsed.data.fullName,
    p_email: parsed.data.email,
    p_business_name: parsed.data.businessName,
    p_business_type: parsed.data.businessType,
    p_misunderstanding: parsed.data.misunderstanding,
    p_marketing_consent: parsed.data.marketingConsent === true,
    p_cancellation_acknowledged: true,
    p_confirmation_token: parsed.data.confirmationToken ?? null,
  });
  if (reserveError) {
    console.error("reserve_workshop_seat", reserveError);
    return json(corsHeaders, 500, { error: "Registration could not be started." });
  }
  const hold = reserved as {
    ok?: boolean;
    code?: string;
    registration_id?: string;
    confirmation_token?: string;
    idempotency_key?: string;
    amount_cents?: number;
    currency?: string;
    email?: string;
  };
  if (!hold?.ok) {
    const status = hold.code === "sold_out" || hold.code === "already_registered" || hold.code === "checkout_in_progress" ? 409 : 403;
    const message = hold.code === "sold_out"
      ? "This workshop is full."
      : hold.code === "already_registered"
        ? "This email already has a confirmed seat."
        : hold.code === "checkout_in_progress"
          ? "A payment for this email is already in progress. Use the same browser, or try again in 15 minutes."
          : "Registration is not open.";
    return json(corsHeaders, status, { error: message, code: hold.code });
  }

  const baseUrl = useSandbox ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com";
  let squareJson: { payment?: { id?: string; status?: string; amount_money?: { amount?: number } }; errors?: { detail?: string; code?: string }[] } = {};
  let squareOk = false;
  try {
    const squareRes = await fetch(`${baseUrl}/v2/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Square-Version": SQUARE_VERSION,
      },
      body: JSON.stringify({
        idempotency_key: hold.idempotency_key,
        source_id: parsed.data.sourceId,
        location_id: locationId,
        amount_money: { amount: hold.amount_cents, currency: hold.currency || "USD" },
        reference_id: hold.registration_id,
        note: "Make Your Business Make Sense",
        buyer_email_address: hold.email,
      }),
    });
    squareJson = await squareRes.json();
    squareOk = squareRes.ok && !squareJson.errors?.length && Boolean(squareJson.payment?.id);
    if (!squareOk) {
      const raw = squareJson.errors?.map((item) => item.detail || item.code).filter(Boolean).join("; ")
        || `Square error (${squareRes.status})`;
      await supabase.rpc("apply_workshop_payment", {
        p_registration_id: hold.registration_id,
        p_square_payment_id: squareJson.payment?.id ?? null,
        p_raw_status: "FAILED",
        p_amount_cents: hold.amount_cents,
      });
      return json(corsHeaders, 402, { error: formatSquareAuthError(raw, useSandbox) });
    }
  } catch (error) {
    console.error("workshop square charge", error);
    await supabase.rpc("apply_workshop_payment", {
      p_registration_id: hold.registration_id,
      p_square_payment_id: null,
      p_raw_status: "FAILED",
      p_amount_cents: hold.amount_cents,
    });
    return json(corsHeaders, 502, { error: "Payment could not be completed. You have not been charged a seat." });
  }

  const paymentId = squareJson.payment?.id as string;
  const rawStatus = squareJson.payment?.status || "UNKNOWN";
  const charged = squareJson.payment?.amount_money?.amount ?? hold.amount_cents;
  const { data: applied, error: applyError } = await supabase.rpc("apply_workshop_payment", {
    p_registration_id: hold.registration_id,
    p_square_payment_id: paymentId,
    p_raw_status: rawStatus,
    p_amount_cents: charged,
  });
  if (applyError) {
    console.error("apply_workshop_payment", applyError);
    return json(corsHeaders, 500, { error: "Payment was received but the seat could not be recorded. Contact JahKnowsPR with the time of the charge." });
  }

  await supabase.from("payment_transactions").insert({
    provider: "square",
    external_payment_id: paymentId,
    idempotency_key: hold.idempotency_key,
    amount_cents: charged,
    currency: hold.currency || "USD",
    buyer_email: hold.email,
    buyer_key: hold.email,
    square_location_id: locationId,
    raw_status: rawStatus,
    meeting_id: null,
    workshop_registration_id: hold.registration_id,
  });

  const result = applied as { status?: string; should_email?: boolean; confirmation_token?: string; code?: string };
  let emailStatus: string | null = null;
  if (result.should_email) {
    const { data: claim } = await supabase.rpc("claim_workshop_confirmation_email", {
      p_registration_id: hold.registration_id,
      p_force: false,
    });
    const sent = await sendWorkshopConfirmationEmail(supabase, claim || {});
    emailStatus = sent.sent ? "sent" : "failed";
  }

  return json(corsHeaders, 200, {
    ok: true,
    status: result.status,
    code: result.code ?? null,
    confirmationToken: result.confirmation_token || hold.confirmation_token,
    emailStatus,
  });
});
