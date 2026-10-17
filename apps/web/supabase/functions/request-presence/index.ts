import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod/mod.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const requestSchema = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().max(80).optional().default(""),
  email: z.string().trim().email().max(200),
  organization: z.string().trim().min(1).max(200),
  event_name: z.string().trim().max(200).optional().default(""),
  event_date: z.string().trim().max(40).optional().default(""),
  city: z.string().trim().max(120).optional().default(""),
  message: z.string().trim().min(1).max(4000),
});

function createServiceClient() {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return createClient(url, key);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function notesFor(payload: z.infer<typeof requestSchema>) {
  return [
    payload.event_name ? `Event: ${payload.event_name}` : null,
    payload.event_date ? `Date: ${payload.event_date}` : null,
    payload.city ? `City: ${payload.city}` : null,
    payload.message,
  ]
    .filter(Boolean)
    .join("\n");
}

async function notifyFirm(payload: z.infer<typeof requestSchema>) {
  const resendKey = Deno.env.get("RESEND_API_KEY")?.trim();
  if (!resendKey) {
    console.error("request-presence email skipped: RESEND_API_KEY is not set");
    return;
  }

  const resend = new Resend(resendKey);
  const name = escapeHtml(`${payload.first_name} ${payload.last_name}`.trim());
  const organization = escapeHtml(payload.organization);
  const email = escapeHtml(payload.email);
  const eventName = escapeHtml(payload.event_name || "—");
  const eventDate = escapeHtml(payload.event_date || "—");
  const city = escapeHtml(payload.city || "—");
  const message = escapeHtml(payload.message).replace(/\n/g, "<br>");

  const { error } = await resend.emails.send({
    from: "JahKnowsPR Firm <welcome@jahknowspr.com>",
    to: ["welcome@jahknowspr.com"],
    subject: `Speaking request: ${payload.organization}`,
    html: `
      <p>A speaking request was submitted on the site.</p>
      <ul>
        <li><strong>Name:</strong> ${name}</li>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Organization:</strong> ${organization}</li>
        <li><strong>Event:</strong> ${eventName}</li>
        <li><strong>Date:</strong> ${eventDate}</li>
        <li><strong>City:</strong> ${city}</li>
      </ul>
      <p>${message}</p>
      <p>It is in HQ under Clients, then Inquiries, with the service Speaking.</p>
    `,
  });
  if (error) throw error;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const parsed = requestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Check the required fields and try again." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = parsed.data;
    const fullName = `${payload.first_name} ${payload.last_name}`.trim();
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("hq_leads")
      .insert({
        full_name: fullName,
        company: payload.organization,
        email: payload.email,
        lead_source: "website",
        interested_service: "speaking",
        stage: "new_lead",
        notes: notesFor(payload),
      })
      .select("id")
      .single();

    if (error) {
      console.error("request-presence insert failed", error.message);
      return new Response(JSON.stringify({ error: "Could not save the request." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      await notifyFirm(payload);
    } catch (notifyError) {
      console.error("request-presence email failed", notifyError);
    }

    return new Response(JSON.stringify({ ok: true, id: data.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("request-presence failed", message);
    return new Response(JSON.stringify({ error: "Could not save the request." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
