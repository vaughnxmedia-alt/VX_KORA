import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import { z } from "https://deno.land/x/zod/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logOutboundEmail } from "../_shared/outbound-email-log.ts";

const bodySchema = z.object({
  auditId: z.string().uuid(),
});

const FROM_NAME = "Jah Jah";
const FROM_EMAIL = "welcome@jahknowspr.com";
const BRAND = {
  navy: rgb(0.039, 0.102, 0.208),
  gold: rgb(0.773, 0.608, 0.235),
  offWhite: rgb(0.969, 0.953, 0.918),
  muted: rgb(0.35, 0.35, 0.35),
};

function text(value: unknown, fallback = "Not provided"): string {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function wrapText(value: string, maxChars = 78): string[] {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (`${current} ${word}`.trim().length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }
  if (current) lines.push(current);
  return lines;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
  }
  return btoa(binary);
}

async function buildReportPdf(audit: Record<string, unknown>, template: Record<string, unknown> | null, supabase: ReturnType<typeof createClient>) {
  const pdf = await PDFDocument.create();
  const titleFont = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const businessName = text(audit.business_name || audit.contact_name || audit.lead_email_lower, "Business");
  const diagnosisTitle = `${businessName} Diagnosis`;

  async function drawHeader(page: ReturnType<typeof pdf.addPage>, eyebrow: string) {
    page.drawText("JAHKNOWSPR", { x: 44, y: 742, size: 16, font: titleFont, color: BRAND.navy });
    page.drawText("FIRM", { x: 74, y: 726, size: 8, font: boldFont, color: BRAND.muted, characterSpacing: 4 });
    page.drawText(eyebrow.toUpperCase(), { x: 480, y: 738, size: 8, font: boldFont, color: BRAND.gold, characterSpacing: 3 });
    page.drawLine({ start: { x: 44, y: 704 }, end: { x: 552, y: 704 }, thickness: 0.5, color: rgb(0.82, 0.78, 0.68) });
  }

  const cover = pdf.addPage([612, 792]);
  cover.drawRectangle({ x: 0, y: 0, width: 612, height: 792, color: BRAND.offWhite });
  await drawHeader(cover, "Cover");

  if (template?.file_type === "png" && template.file_path && template.storage_bucket) {
    const { data: blob } = await supabase.storage
      .from(String(template.storage_bucket))
      .download(String(template.file_path));
    if (blob) {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const image = await pdf.embedPng(bytes).catch(() => null);
      if (image) {
        cover.drawImage(image, { x: 326, y: 294, width: 210, height: 210 });
      }
    }
  }

  cover.drawText(diagnosisTitle, { x: 64, y: 422, size: 46, font: titleFont, color: BRAND.navy, maxWidth: 420 });
  cover.drawLine({ start: { x: 64, y: 370 }, end: { x: 154, y: 370 }, thickness: 3, color: BRAND.gold });
  cover.drawText("JAHKNOWSPR FIRM / BRAND DIAGNOSIS", {
    x: 64,
    y: 92,
    size: 7,
    font: boldFont,
    color: BRAND.muted,
    characterSpacing: 3,
  });

  const scoresPage = pdf.addPage([612, 792]);
  scoresPage.drawRectangle({ x: 0, y: 0, width: 612, height: 792, color: BRAND.offWhite });
  await drawHeader(scoresPage, "Ratings");
  scoresPage.drawText("Brand Readiness Scores", { x: 64, y: 640, size: 34, font: titleFont, color: BRAND.navy });
  const scoreSummary = (audit.score_summary && typeof audit.score_summary === "object" ? audit.score_summary : {}) as Record<string, unknown>;
  const scores = [
    ["Positioning", Number(scoreSummary.positioning_score ?? 43)],
    ["Audience", Number(scoreSummary.audience_score ?? 55)],
    ["Authority", Number(scoreSummary.authority_score ?? 61)],
    ["Messaging", Number(scoreSummary.messaging_score ?? 67)],
    ["Conversion", Number(scoreSummary.conversion_score ?? 46)],
  ] as const;
  scores.forEach(([label, value], index) => {
    const y = 555 - index * 62;
    const width = Math.max(12, Math.min(100, value)) * 3.8;
    scoresPage.drawText(label.toUpperCase(), { x: 70, y: y + 14, size: 9, font: boldFont, color: BRAND.navy, characterSpacing: 2 });
    scoresPage.drawRectangle({ x: 220, y: y + 11, width: 300, height: 9, color: rgb(0.86, 0.84, 0.78) });
    scoresPage.drawRectangle({ x: 220, y: y + 11, width, height: 9, color: BRAND.gold });
    scoresPage.drawText(`${value}/100`, { x: 528, y: y + 9, size: 11, font: boldFont, color: BRAND.navy });
  });

  const deliverables = [
    ["Positioning Gap", text(scoreSummary.primary_gap ?? audit.current_blocker, "The brand needs clearer positioning before visibility scales.")],
    ["Audience Clarity", text(scoreSummary.audience_pain ?? audit.target_audience_belief, "Audience belief and offer clarity need stronger alignment.")],
    ["Authority Structure", "Build visible proof, hierarchy, and credibility before pushing for more attention."],
    ["Messaging Angle", text(audit.audit_angle, "Positioning gap")],
    ["Conversion Path", "Make the next action obvious so interest turns into a booked strategy session."],
  ] as const;

  deliverables.forEach(([title, insight], index) => {
    const page = pdf.addPage([612, 792]);
    page.drawRectangle({ x: 0, y: 0, width: 612, height: 792, color: BRAND.offWhite });
    drawHeader(page, `Deliverable ${index + 1}`);
    page.drawText(`0${index + 1}`, { x: 64, y: 606, size: 72, font: boldFont, color: BRAND.gold });
    page.drawText(title, { x: 64, y: 540, size: 40, font: titleFont, color: BRAND.navy });
    const lines = wrapText(insight, 74);
    lines.forEach((line, lineIndex) => {
      page.drawText(line, { x: 68, y: 452 - lineIndex * 22, size: 13, font: bodyFont, color: BRAND.navy });
    });
    page.drawRectangle({ x: 68, y: 170, width: 190, height: 92, borderColor: BRAND.navy, borderWidth: 2 });
    page.drawRectangle({ x: 110, y: 128, width: 190, height: 92, color: rgb(0.773, 0.608, 0.235, 0.22) });
    page.drawLine({ start: { x: 350, y: 170 }, end: { x: 508, y: 170 }, thickness: 4, color: BRAND.navy });
    page.drawLine({ start: { x: 350, y: 170 }, end: { x: 412, y: 170 }, thickness: 4, color: BRAND.gold });
  });

  return pdf.save();
}

function buildEmailHtml(name: string, businessName: string) {
  return `
  <div style="font-family: Arial, sans-serif; color:#0A1A35; line-height:1.6;">
    <h1 style="font-family: Georgia, serif;">Your Brand Diagnosis is ready</h1>
    <p>Hi ${name || "there"},</p>
    <p>Your JahKnowsPR Free Audit for <strong>${businessName}</strong> is attached as a PDF diagnosis report.</p>
    <p>This report breaks down positioning, audience clarity, authority, messaging, and conversion path so you can see what needs to change before more visibility is pushed.</p>
    <p>If you're ready to turn the diagnosis into a strategy, book your Strategy Session here:</p>
    <p><a href="https://www.jahknowspr.com/brand-strategy-session" style="background:#0A1A35;color:#fff;padding:12px 18px;border-radius:999px;text-decoration:none;">Book Strategy Session</a></p>
    <p style="font-size:12px;color:#666;">JahKnowsPR Firm</p>
  </div>`;
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Server configuration incomplete" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid payload", details: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const allowed = (roleRows ?? []).some((row: { role: string }) =>
      ["admin", "author", "intern", "3pv"].includes(row.role),
    );
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: audit, error: auditError } = await supabase
      .from("free_audits")
      .select("*")
      .eq("id", parsed.data.auditId)
      .maybeSingle();
    if (auditError) throw auditError;
    if (!audit) {
      return new Response(JSON.stringify({ error: "Audit not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const recipient = String(audit.lead_email_lower || audit.lead_key || "").trim().toLowerCase();
    if (!recipient || !recipient.includes("@")) {
      return new Response(JSON.stringify({ error: "Audit has no valid email recipient" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: template } = await supabase
      .from("free_audit_templates")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const pdfBytes = await buildReportPdf(audit, template, supabase);
    const businessName = text(audit.business_name || audit.contact_name || recipient, "Your Brand");
    const contactName = text(audit.contact_name, "there");
    const subject = `${businessName} Brand Diagnosis`;
    const html = buildEmailHtml(contactName, businessName);
    const resend = new Resend(RESEND_API_KEY);
    const sendResult = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: recipient,
      subject,
      html,
      attachments: [
        {
          filename: `${businessName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}-diagnosis.pdf`,
          content: bytesToBase64(pdfBytes),
        },
      ],
    });

    await supabase
      .from("free_audits")
      .update({ follow_up_status: "audit_sent" })
      .eq("id", audit.id);

    await logOutboundEmail(supabase, {
      messageType: "free_audit_report",
      fromEmail: FROM_EMAIL,
      toEmail: recipient,
      subject,
      status: "sent",
      providerMessageId: (sendResult as { data?: { id?: string } })?.data?.id ?? null,
      relatedTable: "free_audits",
      relatedId: audit.id as string,
      generatedBy: "system",
      bodyHtml: html,
    });

    return new Response(JSON.stringify({ ok: true, to: recipient }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-free-audit-report error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
