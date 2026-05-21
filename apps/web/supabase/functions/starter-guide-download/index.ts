import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod/mod.ts";
import { Resend } from "npm:resend@2.0.0";
import QRCode from "npm:qrcode@1.5.4";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logOutboundEmail } from "../_shared/outbound-email-log.ts";

const FROM_NAME = "Jah Jah";
const FROM_EMAIL = "welcome@jahknowspr.com";
const SITE_URL = (Deno.env.get("PUBLIC_SITE_URL")?.trim() || "https://www.jahknowspr.com").replace(/\/$/, "");
const GUIDE_HUB_URL = `${SITE_URL}/the-brief/before-you-build-the-brand-starter-guide`;
const GUIDE_PATHS = [
  "/the-brief/before-you-build-the-brand-starter-guide",
  "/the-brief/before-you-build-the-brand/start-here",
  "/the-brief/before-you-build-the-brand/what-is-a-brand-foundation",
  "/the-brief/before-you-build-the-brand/why-brand-clarity-matters-before-building-online",
  "/the-brief/before-you-build-the-brand/brand-name-check",
  "/the-brief/before-you-build-the-brand/mission-vision-values",
  "/the-brief/before-you-build-the-brand/know-your-target-audience",
  "/the-brief/before-you-build-the-brand/brand-positioning",
  "/the-brief/before-you-build-the-brand/brand-messaging",
  "/the-brief/before-you-build-the-brand/offer-clarity",
  "/the-brief/before-you-build-the-brand/digital-presence",
  "/the-brief/before-you-build-the-brand/website-basics",
  "/the-brief/before-you-build-the-brand/homepage-checklist",
  "/the-brief/before-you-build-the-brand/social-media-basics",
  "/the-brief/before-you-build-the-brand/social-media-bio-formula",
  "/the-brief/before-you-build-the-brand/first-three-pinned-posts",
  "/the-brief/before-you-build-the-brand/no-website-yet",
  "/the-brief/before-you-build-the-brand/no-social-media-yet",
  "/the-brief/before-you-build-the-brand/trust-signals",
  "/the-brief/before-you-build-the-brand/common-brand-mistakes",
  "/the-brief/before-you-build-the-brand/brand-foundation-checklist",
  "/the-brief/before-you-build-the-brand/your-next-step",
];

const payloadSchema = z.object({
  auditId: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(7).max(40).optional(),
  subscribe: z.boolean().default(true),
  sourcePath: z.string().trim().max(200).default("/the-brief/before-you-build-the-brand-starter-guide"),
}).superRefine((value, context) => {
  if (value.auditId) return;
  if (!value.name || !value.email || !value.phone) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "name, email, and phone are required when auditId is not provided",
      path: ["name"],
    });
  }
});

type GuideSlide = {
  title: string;
  paragraphs: string[];
};

const GUIDE_SLIDES: GuideSlide[] = [
  {
    title: "Before You Build the Brand",
    paragraphs: [
      "A Starter Guide for New Businesses",
      "What to know before you create your website, social media accounts, content strategy, or visual identity.",
      "By JahKnowsPR",
    ],
  },
  {
    title: "Start Here",
    paragraphs: [
      "Before you build the outside of the brand, build the inside.",
      "Your foundation helps people understand what you do, who you help, why it matters, what makes you different, and what step to take next.",
      "A brand does not become clear because it looks good. It becomes clear because the message is built right.",
    ],
  },
  {
    title: "What Is a Brand Foundation?",
    paragraphs: [
      "Your brand foundation is the strategy behind how your business is understood.",
      "It includes your name, mission, vision, values, audience, positioning, messaging, offer clarity, digital presence, trust signals, and conversion path.",
    ],
  },
  {
    title: "Why You Need This Before You Build Online",
    paragraphs: [
      "A website cannot fix unclear messaging.",
      "A social media page cannot fix unclear positioning.",
      "A logo cannot fix an unclear offer.",
      "Before you build anything online, define what your brand should communicate.",
    ],
  },
  {
    title: "Brand Name Check",
    paragraphs: [
      "Choose a name that is easy to say, spell, remember, and search.",
      "Confirm domain and social handle availability before you commit.",
      "A strong name should work in the real world, not only in your notes.",
    ],
  },
  {
    title: "Mission, Vision, and Values",
    paragraphs: [
      "Mission: why your business exists.",
      "Vision: where your business is going.",
      "Values: what your business will stand on while it grows.",
      "Simple mission formula: We help [audience] achieve [result] through [method].",
    ],
  },
  {
    title: "Know Who You Are Talking To",
    paragraphs: [
      "Your target audience is not everybody.",
      "The clearer your audience, the easier it becomes to create messaging that connects and converts.",
    ],
  },
  {
    title: "Positioning",
    paragraphs: [
      "Positioning answers one question: what do you want your brand to be known for?",
      "Define your category, audience, problem solved, difference, and reputation.",
    ],
  },
  {
    title: "Messaging",
    paragraphs: [
      "Messaging is how your brand explains itself.",
      "If someone cannot repeat what you do after visiting your profile or website, your message needs work.",
    ],
  },
  {
    title: "Offer Clarity",
    paragraphs: [
      "A clear offer explains what it is, who it is for, what it solves, and what to do next.",
      "Confused people rarely convert. Clear offers make action easier.",
    ],
  },
  {
    title: "What Is Digital Presence?",
    paragraphs: [
      "Digital presence is how your brand shows up online.",
      "It includes website, social accounts, email, booking flow, reviews, and trust signals.",
      "Your online presence should drive clarity, credibility, and conversion.",
    ],
  },
  {
    title: "Website Basics",
    paragraphs: [
      "Your first website should answer: who you are, what you offer, who you help, why trust you, and how to contact or book.",
      "Clarity beats complexity for early-stage brands.",
    ],
  },
  {
    title: "Homepage Checklist",
    paragraphs: [
      "Use a clear headline, short explanation, offer summary, proof, and one strong CTA.",
      "Your homepage should guide people, not make them search for the point.",
    ],
  },
  {
    title: "Social Media Basics",
    paragraphs: [
      "Before posting heavily, make your profile clear.",
      "Use a searchable name, clear bio, contact link, and pinned context posts.",
    ],
  },
  {
    title: "Social Media Bio Formula",
    paragraphs: [
      "I help [audience] achieve [result] through [method].",
      "Add proof or belief, then a clear call to action.",
    ],
  },
  {
    title: "Your First 3 Pinned Posts",
    paragraphs: [
      "Post 1: Who you are and who you help.",
      "Post 2: The problem you solve.",
      "Post 3: How to work with you or the next step.",
    ],
  },
  {
    title: "If You Do Not Have a Website Yet",
    paragraphs: [
      "Start simple: secure domain, set up business email, write mission and offer, launch a clear landing page.",
      "You do not need perfect. You need clear.",
    ],
  },
  {
    title: "If You Do Not Have Social Media Yet",
    paragraphs: [
      "Secure usernames, write a clear bio, build your first 9 posts, and pin your 3 foundation posts.",
      "You do not need to be everywhere. Be clear where you show up.",
    ],
  },
  {
    title: "Trust Signals",
    paragraphs: [
      "Use testimonials, process, portfolio examples, experience, and consistency.",
      "Trust is built through clarity, consistency, and proof.",
    ],
  },
  {
    title: "Common Mistakes to Avoid",
    paragraphs: [
      "Do not build around only visuals, random posting, trends, vague bios, or unclear offers.",
      "Pretty branding gets attention. Clear branding gets action.",
    ],
  },
  {
    title: "Brand Foundation Checklist",
    paragraphs: [
      "Before building or relaunching, confirm your name, audience, offer, message, CTA, channels, and proof are all clear.",
      "Use this checklist before major spend on website, visuals, and ads.",
    ],
  },
  {
    title: "Your Next Step",
    paragraphs: [
      "Complete your foundation, then request the Free Brand Audit when your public presence is ready.",
      "Your brand is not just what people see. It is what they understand.",
    ],
  },
];

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
  }
  return btoa(binary);
}

function wrapPdfText(text: string, font: Awaited<ReturnType<PDFDocument["embedFont"]>>, size: number, maxWidth: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
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

function drawWrappedPdfText(
  page: ReturnType<PDFDocument["addPage"]>,
  text: string,
  options: {
    x: number;
    y: number;
    maxWidth: number;
    size: number;
    lineHeight: number;
    font: Awaited<ReturnType<PDFDocument["embedFont"]>>;
    color: ReturnType<typeof rgb>;
  },
): number {
  const lines = wrapPdfText(text, options.font, options.size, options.maxWidth);
  lines.forEach((line, index) => {
    page.drawText(line, {
      x: options.x,
      y: options.y - index * options.lineHeight,
      size: options.size,
      font: options.font,
      color: options.color,
    });
  });
  return options.y - lines.length * options.lineHeight;
}

async function createQrPngData(url: string): Promise<Uint8Array | null> {
  try {
    const dataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 360,
      color: {
        dark: "#0A1A35",
        light: "#FFFFFF",
      },
    });
    const base64 = dataUrl.split(",")[1];
    if (!base64) return null;
    return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  } catch (error) {
    console.error("Could not generate starter guide QR code", error);
    return null;
  }
}

async function buildStarterGuidePdf(recipientName: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const titleFont = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 1920;
  const pageHeight = 1080;
  const margin = 150;
  const navy = rgb(0.039, 0.102, 0.208);
  const gold = rgb(0.773, 0.608, 0.235);
  const offWhite = rgb(0.969, 0.953, 0.918);

  for (const [index, slide] of GUIDE_SLIDES.entries()) {
    const page = pdf.addPage([pageWidth, pageHeight]);
    page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: offWhite });
    page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: 18, color: navy });
    page.drawRectangle({ x: pageWidth - 390, y: pageHeight - 210, width: 420, height: 210, color: rgb(0.925, 0.875, 0.69) });
    page.drawText("JAHKNOWSPR", { x: margin, y: 982, size: 36, font: titleFont, color: navy });
    page.drawText("STARTER GUIDE", {
      x: margin,
      y: 944,
      size: 14,
      font: boldFont,
      color: gold,
      characterSpacing: 4,
    });
    page.drawText(`PAGE ${String(index + 1).padStart(2, "0")} / ${GUIDE_SLIDES.length}`, {
      x: pageWidth - margin - 220,
      y: 944,
      size: 13,
      font: boldFont,
      color: navy,
      characterSpacing: 3,
    });

    let cursor = 806;
    const titleSize = index === 0 ? 88 : 72;
    const titleLineHeight = index === 0 ? 96 : 82;
    wrapPdfText(slide.title, titleFont, titleSize, 1250).slice(0, 3).forEach((line) => {
      page.drawText(line, { x: margin, y: cursor, size: titleSize, font: titleFont, color: navy });
      cursor -= titleLineHeight;
    });
    cursor -= 34;

    page.drawRectangle({
      x: margin,
      y: 295,
      width: 1280,
      height: Math.max(350, cursor - 295),
      color: rgb(1, 0.992, 0.965),
      borderColor: rgb(0.86, 0.82, 0.72),
      borderWidth: 1.2,
    });

    cursor -= 8;

    slide.paragraphs.forEach((paragraph) => {
      if (cursor < 345) return;
      wrapPdfText(paragraph, bodyFont, 38, 1180).forEach((line) => {
        page.drawText(line, { x: margin + 42, y: cursor, size: 38, font: bodyFont, color: navy });
        cursor -= 52;
      });
      cursor -= 24;
    });

    if (index === 0) {
      page.drawText(`Prepared for ${recipientName}`, {
        x: margin + 42,
        y: 388,
        size: 32,
        font: boldFont,
        color: navy,
      });
      page.drawText(`Read more at ${GUIDE_HUB_URL.replace(/^https?:\/\//, "")}`, {
        x: margin + 42,
        y: 340,
        size: 26,
        font: bodyFont,
        color: navy,
      });
    }

    const readMorePath = GUIDE_PATHS[index] ?? GUIDE_PATHS[0];
    const readMoreUrl = `${SITE_URL}${readMorePath}`;
    page.drawRectangle({
      x: margin,
      y: 66,
      width: pageWidth - margin * 2,
      height: 154,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.86, 0.82, 0.72),
      borderWidth: 1.4,
    });
    const footerLabel = index === 0 ? "OPEN THE GUIDE HUB" : "READ THE FULL BREAKDOWN";
    page.drawText(footerLabel, {
      x: margin + 42,
      y: 172,
      size: 18,
      font: boldFont,
      color: gold,
      characterSpacing: 3.2,
    });
    drawWrappedPdfText(page, `Read more: jahknowspr.com${readMorePath}`, {
      x: margin + 42,
      y: 132,
      maxWidth: 1320,
      size: 22,
      lineHeight: 30,
      font: boldFont,
      color: navy,
    });
    const qrPng = await createQrPngData(readMoreUrl);
    if (qrPng) {
      const qrImage = await pdf.embedPng(qrPng);
      page.drawImage(qrImage, { x: pageWidth - margin - 126, y: 88, width: 110, height: 110 });
    }
  }

  return pdf.save();
}

function generateAccessToken() {
  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  return Array.from(tokenBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY")?.trim();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
    if (!resendApiKey || !supabaseUrl || !serviceRole) {
      return new Response(JSON.stringify({ error: "Missing required environment variables." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = payloadSchema.parse(await req.json());
    const resend = new Resend(resendApiKey);
    const supabaseAdmin = createClient(supabaseUrl, serviceRole);

    let recipientName = payload.name?.trim() || "there";
    let recipientEmail = payload.email?.trim().toLowerCase() || "";
    let recipientPhone = payload.phone?.trim() || "";

    if (payload.auditId) {
      const { data: audit, error: auditError } = await supabaseAdmin
        .from("free_audits")
        .select("contact_name,business_name,lead_email_lower,phone")
        .eq("id", payload.auditId)
        .maybeSingle();

      if (auditError || !audit || !audit.lead_email_lower) {
        throw new Error("We could not find a valid audit recipient email for this guide request.");
      }

      recipientEmail = String(audit.lead_email_lower).trim().toLowerCase();
      recipientName = String(audit.contact_name || audit.business_name || "there").trim();
      recipientPhone = String(audit.phone || recipientPhone || "").trim();
    }

    if (!recipientEmail) {
      throw new Error("A valid recipient email is required.");
    }

    const pdfBytes = await buildStarterGuidePdf(recipientName);
    const pdfBase64 = bytesToBase64(pdfBytes);
    const subject = "Before You Build the Brand - Starter Guide for New Businesses";
    const emailHtml = `
      <body style="margin:0;background:#F7F3EA;padding:28px 12px;font-family:Arial,sans-serif;color:#0A1A35;line-height:1.6;">
        <div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #E8DFC8;border-radius:24px;overflow:hidden;">
          <div style="height:8px;background:#0A1A35;"></div>
          <div style="padding:34px 32px 28px;">
            <p style="margin:0 0 14px;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#8C6C27;font-weight:700;">JahKnowsPR Firm / Starter Guide</p>
            <h1 style="font-family:Georgia,serif;margin:0 0 18px;font-size:38px;line-height:1.05;color:#0A1A35;">Before You Build the Brand</h1>
            <p style="margin:0 0 14px;">Hi ${recipientName},</p>
            <p style="margin:0 0 14px;">
              Your 22-page JahKnowsPR starter guide is attached as a presentation-style PDF.
            </p>
            <div style="margin:20px 0;padding:18px;border-left:4px solid #C59B3C;background:#F7F3EA;border-radius:0 16px 16px 0;">
              <p style="margin:0;color:#0A1A35;">
                Use this guide to complete your brand foundation steps before submitting a new audit request. Each slide includes a QR code that opens the deeper Brief article for that topic.
              </p>
            </div>
            <p style="margin:0 0 16px;">Read the companion guide hub here:</p>
            <p style="margin:0 0 18px;">
              <a href="${GUIDE_HUB_URL}" style="display:inline-block;background:#0A1A35;color:#fff;padding:13px 20px;border-radius:999px;text-decoration:none;font-weight:700;">
                Open the Guide Hub
              </a>
            </p>
            <p style="margin:24px 0 0;font-size:12px;color:#666;">JahKnowsPR Firm</p>
          </div>
        </div>
      </body>
    `;

    const sendResult = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: recipientEmail,
      subject,
      html: emailHtml,
      attachments: [
        {
          filename: "jahknowspr-before-you-build-the-brand-starter-guide.pdf",
          content: pdfBase64,
        },
      ],
    });

    let subscriberId: string | null = null;

    await supabaseAdmin.from("making_of_a_brand_pdf_downloads").insert({
      name: recipientName,
      email: recipientEmail,
      phone: recipientPhone || null,
      subscribed: payload.subscribe,
      source_path: payload.sourcePath,
      audit_id: payload.auditId ?? null,
    });

    await logOutboundEmail(supabaseAdmin, {
      messageType: "making_of_a_brand_pdf",
      fromEmail: FROM_EMAIL,
      toEmail: recipientEmail,
      subject,
      status: "sent",
      providerMessageId: (sendResult as { data?: { id?: string } })?.data?.id ?? null,
      relatedTable: "making_of_a_brand_pdf_downloads",
      generatedBy: "system",
      bodyHtml: emailHtml,
    });

    if (payload.subscribe) {
      const email = recipientEmail;
      const { data: existing } = await supabaseAdmin
        .from("subscribers")
        .select("id,access_token,lead_source")
        .eq("email", email)
        .maybeSingle();

      if (!existing) {
        const { data: inserted } = await supabaseAdmin
          .from("subscribers")
          .insert({
            name: recipientName,
            email,
            access_token: generateAccessToken(),
            lead_source: {
              source: "before_you_build_brand_guide",
              source_path: payload.sourcePath,
              phone: recipientPhone || null,
              series: "The Making of a Brand",
            },
          })
          .select("id")
          .single();
        subscriberId = inserted?.id ?? null;
      } else {
        subscriberId = existing.id;
        const mergedLeadSource = {
          ...(existing.lead_source && typeof existing.lead_source === "object" ? existing.lead_source : {}),
          source: "before_you_build_brand_guide",
          source_path: payload.sourcePath,
          phone: recipientPhone || null,
          series: "The Making of a Brand",
        };
        await supabaseAdmin
          .from("subscribers")
          .update({
            name: recipientName,
            lead_source: mergedLeadSource,
          })
          .eq("id", existing.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sentTo: recipientEmail,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to send starter guide.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
