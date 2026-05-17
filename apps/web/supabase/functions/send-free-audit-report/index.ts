import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import { z } from "https://deno.land/x/zod/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { buildFreeAuditReport, type FreeAuditReport } from "../_shared/free-audit-report.ts";
import { logOutboundEmail } from "../_shared/outbound-email-log.ts";
import { personalizePdfAuditReport } from "../_shared/personalizedPdfAuditSummary.ts";

const bodySchema = z.object({
  auditId: z.string().uuid(),
  mode: z.enum(["preview", "send"]).default("send"),
  includeAudio: z.boolean().default(false),
  regenerate: z.boolean().default(false),
});

const FROM_NAME = "Jah Jah";
const FROM_EMAIL = "welcome@jahknowspr.com";
const PUBLIC_SITE_URL = Deno.env.get("PUBLIC_SITE_URL")?.replace(/\/$/, "") || "https://www.jahknowspr.com";
const PAGE = { width: 612, height: 792 };
const BRAND = {
  navy: rgb(0.039, 0.102, 0.208),
  gold: rgb(0.773, 0.608, 0.235),
  goldLight: rgb(0.902, 0.78, 0.412),
  offWhite: rgb(0.969, 0.953, 0.918),
  paper: rgb(1, 0.992, 0.965),
  line: rgb(0.82, 0.78, 0.68),
  muted: rgb(0.35, 0.35, 0.35),
};

type Fonts = {
  title: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  body: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  bold: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  italic: Awaited<ReturnType<PDFDocument["embedFont"]>>;
};

type PdfPage = ReturnType<PDFDocument["addPage"]>;

type ReportAudio = {
  url: string;
  filename?: string;
  script?: string;
  generated_at?: string;
  estimated_minutes?: number;
  word_count?: number;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function publicAuditSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 90) || "brand-audit";
}

function publicAuditUrl(report: FreeAuditReport): string {
  return `${PUBLIC_SITE_URL}/audit/${publicAuditSlug(report.businessName)}`;
}

function reportAudioFromAudit(audit: Record<string, unknown>): ReportAudio | null {
  const metadata = asObject(audit.metadata);
  const audio = asObject(metadata.report_audio);
  if (typeof audio.url !== "string" || !audio.url.trim()) return null;
  return {
    url: audio.url,
    filename: typeof audio.filename === "string" ? audio.filename : undefined,
    script: typeof audio.script === "string" ? audio.script : undefined,
    generated_at: typeof audio.generated_at === "string" ? audio.generated_at : undefined,
    estimated_minutes: typeof audio.estimated_minutes === "number" ? audio.estimated_minutes : undefined,
    word_count: typeof audio.word_count === "number" ? audio.word_count : undefined,
  };
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
  }
  return btoa(binary);
}

function sanitizePdfText(value: string): string {
  return value
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7E]/g, "");
}

function wrapText(value: string, font: Fonts["body"], size: number, maxWidth: number): string[] {
  const words = sanitizePdfText(value).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = `${current} ${word}`.trim();
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawWrappedText(
  page: PdfPage,
  text: string,
  options: {
    x: number;
    y: number;
    maxWidth: number;
    size: number;
    lineHeight: number;
    font: Fonts["body"];
    color?: ReturnType<typeof rgb>;
    maxLines?: number;
  },
): number {
  const lines = wrapText(text, options.font, options.size, options.maxWidth);
  const visibleLines = typeof options.maxLines === "number" ? lines.slice(0, options.maxLines) : lines;
  visibleLines.forEach((line, index) => {
    page.drawText(line, {
      x: options.x,
      y: options.y - index * options.lineHeight,
      size: options.size,
      font: options.font,
      color: options.color ?? BRAND.navy,
    });
  });
  return options.y - visibleLines.length * options.lineHeight;
}

function drawCenteredWrappedText(
  page: PdfPage,
  text: string,
  options: {
    centerX: number;
    y: number;
    maxWidth: number;
    size: number;
    lineHeight: number;
    font: Fonts["body"];
    color?: ReturnType<typeof rgb>;
    maxLines?: number;
  },
): number {
  const lines = wrapText(text, options.font, options.size, options.maxWidth);
  const visibleLines = typeof options.maxLines === "number" ? lines.slice(0, options.maxLines) : lines;
  visibleLines.forEach((line, index) => {
    const lineWidth = options.font.widthOfTextAtSize(line, options.size);
    page.drawText(line, {
      x: options.centerX - lineWidth / 2,
      y: options.y - index * options.lineHeight,
      size: options.size,
      font: options.font,
      color: options.color ?? BRAND.navy,
    });
  });
  return options.y - visibleLines.length * options.lineHeight;
}

function drawDeckCard(page: PdfPage, x: number, y: number, width: number, height: number, fill = BRAND.paper) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: fill,
    borderColor: rgb(0.86, 0.82, 0.72),
    borderWidth: 0.75,
  });
}

function drawChrome(page: PdfPage, fonts: Fonts, eyebrow: string, pageNumber: number) {
  page.drawRectangle({ x: 0, y: 0, width: PAGE.width, height: PAGE.height, color: BRAND.offWhite });
  page.drawRectangle({ x: 492, y: 676, width: 148, height: 148, color: rgb(0.925, 0.875, 0.69) });
  page.drawRectangle({ x: 0, y: 0, width: PAGE.width, height: 10, color: BRAND.navy });
  page.drawText("JAHKNOWSPR", { x: 44, y: 742, size: 16, font: fonts.title, color: BRAND.navy });
  page.drawText("FIRM", { x: 75, y: 726, size: 8, font: fonts.bold, color: BRAND.muted, characterSpacing: 4 });
  page.drawText(eyebrow.toUpperCase(), { x: 422, y: 738, size: 8, font: fonts.bold, color: BRAND.gold, characterSpacing: 2.4 });
  page.drawLine({ start: { x: 44, y: 704 }, end: { x: 552, y: 704 }, thickness: 0.6, color: BRAND.line });
  page.drawText(`PAGE ${pageNumber.toString().padStart(2, "0")}`, {
    x: 490,
    y: 34,
    size: 7,
    font: fonts.bold,
    color: BRAND.muted,
    characterSpacing: 2,
  });
}

function drawScoreBar(page: PdfPage, fonts: Fonts, label: string, value: number, x: number, y: number, width = 310) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value)));
  page.drawText(label.toUpperCase(), { x, y: y + 19, size: 8.5, font: fonts.bold, color: BRAND.navy, characterSpacing: 1.6 });
  page.drawText(`${safeValue}/100`, { x: x + width + 16, y: y + 16, size: 11, font: fonts.bold, color: BRAND.navy });
  page.drawRectangle({ x, y, width, height: 9, color: rgb(0.86, 0.84, 0.78) });
  page.drawRectangle({ x, y, width: Math.max(8, (safeValue / 100) * width), height: 9, color: BRAND.gold });
}

function drawCover(page: PdfPage, fonts: Fonts, report: FreeAuditReport) {
  drawChrome(page, fonts, "Cover", 1);
  const centerX = PAGE.width / 2;
  page.drawText(report.auditAngleLabel.toUpperCase(), {
    x: centerX - fonts.bold.widthOfTextAtSize(report.auditAngleLabel.toUpperCase(), 9) / 2,
    y: 480,
    size: 9,
    font: fonts.bold,
    color: BRAND.gold,
    characterSpacing: 2.8,
  });
  drawCenteredWrappedText(page, `${report.businessName} Diagnosis`, {
    centerX,
    y: 428,
    maxWidth: 390,
    size: 48,
    lineHeight: 50,
    font: fonts.title,
    color: BRAND.navy,
    maxLines: 3,
  });
  page.drawRectangle({ x: centerX - 56, y: 258, width: 112, height: 3, color: BRAND.gold });
}

function drawScoresPage(page: PdfPage, fonts: Fonts, report: FreeAuditReport) {
  drawChrome(page, fonts, "Ratings", 2);
  page.drawText("RATINGS PAGE", { x: 64, y: 622, size: 8, font: fonts.bold, color: BRAND.gold, characterSpacing: 3 });
  drawWrappedText(page, "Brand Readiness Scores", {
    x: 64,
    y: 590,
    maxWidth: 210,
    size: 34,
    lineHeight: 38,
    font: fonts.title,
    color: BRAND.navy,
    maxLines: 2,
  });
  drawWrappedText(page, report.executiveSummary, {
    x: 66,
    y: 498,
    maxWidth: 218,
    size: 10.4,
    lineHeight: 17,
    font: fonts.body,
    color: BRAND.muted,
    maxLines: 7,
  });

  const filingWarning = report.warnings.find((warning) => /business filing required/i.test(warning.title));
  if (filingWarning) {
    drawDeckCard(page, 60, 250, 228, 96, rgb(1, 0.96, 0.93));
    page.drawText("IMPORTANT NOTICE", { x: 76, y: 326, size: 8, font: fonts.bold, color: BRAND.gold, characterSpacing: 2 });
    drawWrappedText(page, filingWarning.detail, {
      x: 76,
      y: 308,
      maxWidth: 196,
      size: 8.8,
      lineHeight: 12.4,
      font: fonts.body,
      color: BRAND.navy,
      maxLines: 5,
    });
  }

  report.scores.forEach((score, index) => {
    const y = 604 - index * 70;
    drawScoreBar(page, fonts, score.label, score.value, 342, y, 150);
    page.drawText(score.summary, { x: 342, y: y - 18, size: 8.5, font: fonts.italic, color: BRAND.muted });
  });
}

function drawEvidenceList(page: PdfPage, fonts: Fonts, evidence: string[], x: number, y: number, maxWidth = 408): number {
  let cursor = y;
  evidence.slice(0, 3).forEach((item) => {
    page.drawRectangle({ x, y: cursor - 1, width: 5, height: 5, color: BRAND.gold });
    cursor = drawWrappedText(page, item, {
      x: x + 14,
      y: cursor,
      maxWidth,
      size: 9.5,
      lineHeight: 13,
      font: fonts.body,
      color: BRAND.navy,
      maxLines: 2,
    }) - 5;
  });
  return cursor;
}

function drawInsightPage(page: PdfPage, fonts: Fonts, report: FreeAuditReport, pageNumber: number) {
  drawChrome(page, fonts, "Evidence", pageNumber);
  page.drawText("PUBLIC SOURCE INTELLIGENCE", { x: 64, y: 610, size: 8, font: fonts.bold, color: BRAND.gold, characterSpacing: 3 });
  drawWrappedText(page, "Approved findings from Evidence Capture", {
    x: 64,
    y: 574,
    maxWidth: 440,
    size: 34,
    lineHeight: 38,
    font: fonts.title,
    color: BRAND.navy,
    maxLines: 2,
  });
  let cursor = 460;
  report.evidence.socialHighlights.slice(0, 4).forEach((highlight) => {
    drawDeckCard(page, 78, cursor - 54, 456, 64, rgb(1, 0.98, 0.94));
    drawWrappedText(page, highlight, {
      x: 98,
      y: cursor - 10,
      maxWidth: 416,
      size: 9.8,
      lineHeight: 13.5,
      font: fonts.body,
      color: BRAND.navy,
      maxLines: 3,
    });
    cursor -= 82;
  });
}

function drawSectionPage(page: PdfPage, fonts: Fonts, report: FreeAuditReport, section: FreeAuditReport["sections"][number], pageNumber: number) {
  drawChrome(page, fonts, `Deliverable ${section.label}`, pageNumber);
  page.drawText(section.label, { x: 64, y: 610, size: 64, font: fonts.bold, color: BRAND.gold });
  drawWrappedText(page, section.title, {
    x: 64,
    y: 520,
    maxWidth: 190,
    size: 30,
    lineHeight: 33,
    font: fonts.title,
    color: BRAND.navy,
    maxLines: 3,
  });
  page.drawText(`${section.scoreLabel.toUpperCase()} / ${section.score}/100`, {
    x: 64,
    y: 370,
    size: 8,
    font: fonts.bold,
    color: BRAND.muted,
    characterSpacing: 1.6,
  });
  drawScoreBar(page, fonts, "", section.score, 64, 344, 150);
  drawWrappedText(page, section.subtitle, {
    x: 66,
    y: 316,
    maxWidth: 190,
    size: 10,
    lineHeight: 14,
    font: fonts.bold,
    color: BRAND.muted,
    maxLines: 5,
  });

  drawDeckCard(page, 286, 424, 254, 158, rgb(1, 0.98, 0.94));
  page.drawText("DIAGNOSIS", { x: 306, y: 554, size: 8, font: fonts.bold, color: BRAND.gold, characterSpacing: 2 });
  drawWrappedText(page, section.diagnosis, {
    x: 306,
    y: 532,
    maxWidth: 214,
    size: 9.4,
    lineHeight: 13.5,
    font: fonts.body,
    color: BRAND.navy,
    maxLines: 8,
  });

  drawDeckCard(page, 286, 256, 254, 132, rgb(1, 0.985, 0.95));
  page.drawText("EVIDENCE", { x: 306, y: 360, size: 8, font: fonts.bold, color: BRAND.gold, characterSpacing: 2 });
  drawEvidenceList(page, fonts, section.evidence, 306, 338, 208);

  page.drawText("WHY IT MATTERS", { x: 286, y: 204, size: 8, font: fonts.bold, color: BRAND.gold, characterSpacing: 2 });
  drawWrappedText(page, section.whyItMatters, {
    x: 286,
    y: 184,
    maxWidth: 116,
    size: 8.6,
    lineHeight: 12,
    font: fonts.body,
    color: BRAND.navy,
    maxLines: 6,
  });
  page.drawText("NEXT MOVE", { x: 424, y: 204, size: 8, font: fonts.bold, color: BRAND.gold, characterSpacing: 2 });
  drawWrappedText(page, section.nextMove, {
    x: 424,
    y: 184,
    maxWidth: 116,
    size: 8.6,
    lineHeight: 12,
    font: fonts.body,
    color: BRAND.navy,
    maxLines: 6,
  });
  page.drawText(report.readinessLevel, { x: 64, y: 62, size: 8, font: fonts.bold, color: BRAND.muted, characterSpacing: 2 });
}

async function buildReportPdf(
  report: FreeAuditReport,
  template: Record<string, unknown> | null,
  supabase: ReturnType<typeof createClient>,
) {
  void template;
  void supabase;
  const pdf = await PDFDocument.create();
  const fonts: Fonts = {
    title: await pdf.embedFont(StandardFonts.TimesRomanBold),
    body: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
  };
  drawCover(pdf.addPage([PAGE.width, PAGE.height]), fonts, report);
  drawScoresPage(pdf.addPage([PAGE.width, PAGE.height]), fonts, report);
  let pageNumber = 3;
  if (report.evidence.socialHighlights.length) {
    drawInsightPage(pdf.addPage([PAGE.width, PAGE.height]), fonts, report, pageNumber);
    pageNumber += 1;
  }
  report.sections.forEach((section, index) => {
    drawSectionPage(pdf.addPage([PAGE.width, PAGE.height]), fonts, report, section, pageNumber + index);
  });

  return pdf.save();
}

function buildEmailHtml(report: FreeAuditReport, reportAudio: ReportAudio | null) {
  const filingWarning = report.warnings.find((item) => /business filing required/i.test(item.title));
  const warningBlock = filingWarning
    ? `
    <div style="margin:18px 0;padding:14px;border:1px solid #E6C769;border-radius:14px;background:#FFF8EA;">
      <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#8C6C27;font-weight:700;">Important business setup note</p>
      <p style="margin:0 0 8px;font-size:13px;color:#0A1A35;"><strong>${filingWarning.title}:</strong> ${filingWarning.detail}</p>
    </div>`
    : "";
  const audioBlock = reportAudio
    ? `
    <div style="margin:24px 0;padding:20px;border:1px solid #E6C769;border-radius:18px;background:#F7F3EA;">
      <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#8C6C27;font-weight:700;">Private voice note</p>
      <h2 style="font-family: Georgia, serif;margin:0 0 10px;color:#0A1A35;font-size:24px;line-height:1.15;">Audio Strategy Brief</h2>
      <p style="margin:0 0 16px;color:#0A1A35;">I also included a personalized audio strategy brief that explains the diagnosis like a private strategist voice note.</p>
      <p style="margin:0 0 14px;"><a href="${publicAuditUrl(report)}" style="display:inline-block;background:#0A1A35;color:#fff;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:700;">Listen to Audio Brief</a></p>
      <p style="font-size:12px;color:#666;margin:0;">Note: this audio was created using your submitted audit data plus JahKnowsPR KORA assistants.</p>
    </div>`
    : "";
  return `
  <body style="margin:0;background:#F7F3EA;padding:28px 12px;font-family:Arial,sans-serif;color:#0A1A35;line-height:1.6;">
    <div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #E8DFC8;border-radius:24px;overflow:hidden;">
      <div style="height:8px;background:#0A1A35;"></div>
      <div style="padding:34px 32px 28px;">
        <p style="margin:0 0 14px;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#8C6C27;font-weight:700;">JahKnowsPR Firm / Brand Diagnosis</p>
        <h1 style="font-family:Georgia,serif;margin:0 0 18px;font-size:38px;line-height:1.05;color:#0A1A35;">Your Brand Diagnosis is ready</h1>
        <p style="margin:0 0 14px;">Hi ${report.contactName || "there"},</p>
        <p style="margin:0 0 14px;">Your JahKnowsPR Free Audit for <strong>${report.businessName}</strong> is attached as a PDF diagnosis report.</p>
        <div style="margin:20px 0;padding:18px;border-left:4px solid #C59B3C;background:#F7F3EA;border-radius:0 16px 16px 0;">
          <p style="margin:0;color:#0A1A35;">${report.executiveSummary}</p>
        </div>
        ${audioBlock}
        <p style="margin:0 0 16px;">If you're ready to turn the diagnosis into a strategy, book your Strategy Session here:</p>
        <p style="margin:0 0 18px;"><a href="https://www.jahknowspr.com/brand-strategy-session" style="display:inline-block;background:#0A1A35;color:#fff;padding:13px 20px;border-radius:999px;text-decoration:none;font-weight:700;">Book Strategy Session</a></p>
        ${warningBlock}
        <p style="margin:24px 0 0;font-size:12px;color:#666;">JahKnowsPR Firm</p>
      </div>
    </div>
  </body>`;
}

function jsonResponse(body: Record<string, unknown>, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Server configuration incomplete" }, 500, corsHeaders);
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return jsonResponse({ error: "Invalid payload", details: parsed.error.flatten() }, 400, corsHeaders);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData.user) {
      return jsonResponse({ error: "Invalid session" }, 401, corsHeaders);
    }

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const allowed = (roleRows ?? []).some((row: { role: string }) =>
      ["admin", "author", "intern", "3pv"].includes(row.role),
    );
    if (!allowed) {
      return jsonResponse({ error: "Forbidden" }, 403, corsHeaders);
    }

    const { auditId, mode, includeAudio } = parsed.data;
    const { data: audit, error: auditError } = await supabase
      .from("free_audits")
      .select("*")
      .eq("id", auditId)
      .maybeSingle();
    if (auditError) throw auditError;
    if (!audit) {
      return jsonResponse({ error: "Audit not found" }, 404, corsHeaders);
    }

    const { data: aestheticSignal } = await supabase
      .from("audit_aesthetic_signals")
      .select("*")
      .eq("audit_id", audit.id)
      .maybeSingle();
    const { data: approvedFindings } = await supabase
      .from("audit_findings")
      .select("finding_category,finding_title,finding_summary,recommended_action,confidence_score,report_ready")
      .eq("audit_id", audit.id)
      .eq("report_ready", true)
      .order("confidence_score", { ascending: false })
      .limit(40);
    const baseReport = buildFreeAuditReport(audit, aestheticSignal ?? null, approvedFindings ?? []);
    const report = await personalizePdfAuditReport({
      report: baseReport,
      audit: audit as Record<string, unknown>,
      approvedFindings: (approvedFindings ?? []) as Record<string, unknown>[],
    });
    const reportAudio = reportAudioFromAudit(audit);
    const blockingWarning = report.warnings.find((warning) => warning.severity === "error");
    if (blockingWarning) {
      return jsonResponse({ error: blockingWarning.detail, report, warnings: report.warnings }, 400, corsHeaders);
    }

    const { data: template } = await supabase
      .from("free_audit_templates")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const pdfBytes = await buildReportPdf(report, template, supabase);
    const pdfBase64 = bytesToBase64(pdfBytes);
    const previewEmailHtml = buildEmailHtml(report, reportAudio);

    if (mode === "preview") {
      return jsonResponse({
        ok: true,
        mode,
        report,
        warnings: report.warnings,
        filename: report.filename,
        pdfBase64,
        contentType: "application/pdf",
        audioBrief: reportAudio,
        emailHtml: previewEmailHtml,
      }, 200, corsHeaders);
    }

    if (includeAudio && !reportAudio) {
      return jsonResponse({ error: "Generate and review the audio brief before sending it to the client." }, 400, corsHeaders);
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return jsonResponse({ error: "RESEND_API_KEY is not configured" }, 500, corsHeaders);
    }

    const html = buildEmailHtml(report, includeAudio ? reportAudio : null);
    const resend = new Resend(RESEND_API_KEY);
    const sendResult = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: report.recipient,
      subject: report.subject,
      html,
      attachments: [
        {
          filename: report.filename,
          content: pdfBase64,
        },
      ],
    });

    const auditRecord = audit as Record<string, unknown>;
    const auditIntakeId = typeof auditRecord.audit_intake_id === "string"
      ? auditRecord.audit_intake_id
      : String(audit.id);
    const generatedAt = new Date().toISOString();

    await Promise.allSettled([
      supabase
        .from("free_audits")
        .update({ follow_up_status: "audit_sent" })
        .eq("id", audit.id),
      supabase
        .from("audit_intakes")
        .update({
          status: "audit_sent",
          last_touch_at: generatedAt,
        })
        .eq("id", auditIntakeId),
      supabase
        .from("audit_pdf_deliverables")
        .upsert({
          // PDF deliverable content is persisted separately from intake answers/analysis.
          audit_intake_id: auditIntakeId,
          free_audit_id: String(audit.id),
          delivery_status: "sent",
          generated_at: generatedAt,
          sent_at: generatedAt,
          report_subject: report.subject,
          report_filename: report.filename,
          pdf_public_url: publicAuditUrl(report),
          report_payload: {
            audit_id: report.auditId,
            business_name: report.businessName,
            contact_name: report.contactName,
            recipient: report.recipient,
            executive_summary: report.executiveSummary,
            generated_at: report.generatedAt,
            intent_label: report.intentLabel,
            readiness_level: report.readinessLevel,
            audit_angle_label: report.auditAngleLabel,
          },
          ratings_payload: { scores: report.scores },
          diagnosis_sections: report.sections,
          recommendations: report.sections.map((section) => ({
            id: section.id,
            cta: section.cta,
            next_move: section.nextMove,
          })),
          warnings: report.warnings,
          metadata: {
            email_provider_message_id: (sendResult as { data?: { id?: string } })?.data?.id ?? null,
            include_audio: includeAudio,
          },
        }, { onConflict: "audit_intake_id" }),
    ]);

    await logOutboundEmail(supabase, {
      messageType: "free_audit_report",
      fromEmail: FROM_EMAIL,
      toEmail: report.recipient,
      subject: report.subject,
      status: "sent",
      providerMessageId: (sendResult as { data?: { id?: string } })?.data?.id ?? null,
      relatedTable: "free_audits",
      relatedId: audit.id as string,
      generatedBy: "system",
      bodyHtml: html,
    });

    return jsonResponse({
      ok: true,
      to: report.recipient,
      report,
      warnings: report.warnings,
      audioBrief: includeAudio ? reportAudio : null,
    }, 200, corsHeaders);
  } catch (error) {
    console.error("send-free-audit-report error", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500, corsHeaders);
  }
});
