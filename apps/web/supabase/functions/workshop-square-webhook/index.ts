/**
 * Square webhook. Verifies HMAC, then applies the same seat rules as checkout.
 * Duplicate notifications are safe. Unsigned requests are rejected.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifySquareWebhookSignature } from "../_shared/workshop-payments.ts";
import { sendWorkshopConfirmationEmail } from "../_shared/workshop-email.ts";

type SquareEvent = {
  event_id?: string;
  type?: string;
  data?: {
    object?: {
      payment?: { id?: string; status?: string; reference_id?: string; amount_money?: { amount?: number } };
      refund?: { id?: string; status?: string; payment_id?: string; amount_money?: { amount?: number } };
    };
  };
};

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }
  const signatureKey = Deno.env.get("SQUARE_WEBHOOK_SIGNATURE_KEY")?.trim() || "";
  const notificationUrl = Deno.env.get("SQUARE_WEBHOOK_NOTIFICATION_URL")?.trim() || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const rawBody = await req.text();
  const authentic = await verifySquareWebhookSignature({
    signatureKey,
    notificationUrl,
    rawBody,
    signatureHeader: req.headers.get("x-square-hmacsha256-signature"),
  });
  if (!authentic || !supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  let event: SquareEvent;
  try {
    event = JSON.parse(rawBody) as SquareEvent;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400 });
  }
  const notificationId = event.event_id?.trim();
  if (!notificationId) return new Response(JSON.stringify({ error: "Missing event id" }), { status: 400 });

  const payment = event.data?.object?.payment;
  const refund = event.data?.object?.refund;
  const registrationId = payment?.reference_id && /^[0-9a-f-]{36}$/i.test(payment.reference_id) ? payment.reference_id : null;
  const paymentId = payment?.id || refund?.payment_id || null;
  let rawStatus = "UNKNOWN";
  if (event.type?.startsWith("refund.")) {
    rawStatus = refund?.status === "COMPLETED" ? "REFUNDED" : "PENDING";
  } else if (payment?.status) {
    rawStatus = payment.status;
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  if (!registrationId && !paymentId) {
    return new Response(JSON.stringify({ ok: true, ignored: true }), { status: 200 });
  }

  const { data, error } = await supabase.rpc("apply_workshop_payment", {
    p_registration_id: registrationId,
    p_square_payment_id: paymentId,
    p_raw_status: rawStatus,
    p_amount_cents: payment?.amount_money?.amount ?? refund?.amount_money?.amount ?? null,
  });
  if (error) {
    console.error("workshop webhook apply", error);
    return new Response(JSON.stringify({ error: "Could not apply payment" }), { status: 500 });
  }

  const result = data as { status?: string; registration_id?: string; code?: string };
  if (result.status === "confirmed" && result.registration_id) {
    const { data: claim } = await supabase.rpc("claim_workshop_confirmation_email", {
      p_registration_id: result.registration_id,
      p_force: false,
    });
    if (claim?.claimed) await sendWorkshopConfirmationEmail(supabase, claim);
  }

  const { error: receiptError } = await supabase.from("workshop_webhook_receipts").insert({
    provider: "square",
    notification_id: notificationId,
    payment_id: paymentId,
    event_type: event.type ?? null,
    raw_status: rawStatus,
  });
  if (receiptError && receiptError.code !== "23505") {
    console.error("workshop webhook receipt", receiptError);
  }
  return new Response(JSON.stringify({ ok: true, status: result.status ?? null, code: result.code ?? null }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
