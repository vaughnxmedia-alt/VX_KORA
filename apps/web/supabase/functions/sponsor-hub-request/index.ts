import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod/mod.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const requestSchema = z.object({
  business_name: z.string().min(2).max(200),
  contact_name: z.string().min(2).max(120),
  job_title: z.string().max(120).nullable().optional(),
  email: z.string().email().max(200),
  phone: z.string().max(40).nullable().optional(),
  website: z.string().max(300).nullable().optional(),
  industry: z.string().max(120).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  state: z.string().max(80).nullable().optional(),
  company_description: z.string().max(4000).nullable().optional(),
  community_initiatives: z.string().max(4000).nullable().optional(),
  sponsorship_types: z.array(z.string().max(80)).max(12).default([]),
  geographic_areas_served: z.string().max(1000).nullable().optional(),
  annual_sponsorship_budget: z.string().max(120).nullable().optional(),
  preferred_opportunities: z.string().max(2000).nullable().optional(),
  linkedin: z.string().max(300).nullable().optional(),
  logo_url: z.string().max(500).nullable().optional(),
  additional_comments: z.string().max(4000).nullable().optional(),
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

async function notifyAdmins(request: Record<string, unknown>) {
  const resendKey = Deno.env.get("RESEND_API_KEY")?.trim();
  if (!resendKey) return;

  const supabase = createServiceClient();
  const { data: roleRows } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
  const adminEmails = await Promise.all(
    (roleRows ?? []).map(async (row) => {
      const userId = String((row as { user_id?: string }).user_id ?? "").trim();
      if (!userId) return null;
      try {
        const { data } = await supabase.auth.admin.getUserById(userId);
        const email = data.user?.email?.trim().toLowerCase();
        return email?.includes("@") ? email : null;
      } catch {
        return null;
      }
    }),
  );

  const recipients = Array.from(new Set(adminEmails.filter((item): item is string => Boolean(item))));
  if (!recipients.length) return;

  const resend = new Resend(resendKey);
  const businessName = escapeHtml(String(request.business_name ?? "Unknown organization"));
  const contactName = escapeHtml(String(request.contact_name ?? ""));
  const email = escapeHtml(String(request.email ?? ""));

  await resend.emails.send({
    from: "JahKnowsPR Firm <welcome@jahknowspr.com>",
    to: recipients,
    subject: `New Strategic Sponsor Hub request: ${String(request.business_name ?? "Organization")}`,
    html: `
      <p>A new organization requested to be added to the Strategic Sponsor Hub.</p>
      <ul>
        <li><strong>Organization:</strong> ${businessName}</li>
        <li><strong>Contact:</strong> ${contactName}</li>
        <li><strong>Email:</strong> ${email}</li>
      </ul>
      <p>Review it in the JahKnowsPR dashboard under <strong>Sponsor Requests</strong>.</p>
    `,
  });
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
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = parsed.data;
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("sponsor_requests")
      .insert({
        ...payload,
        status: "pending_review",
        admin_notified_at: new Date().toISOString(),
      })
      .select("id, business_name, contact_name, email, created_at")
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      await notifyAdmins({ ...payload, id: data.id });
    } catch (notifyError) {
      console.error("sponsor-hub-request admin notify failed", notifyError);
    }

    return new Response(JSON.stringify({ ok: true, request: data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
