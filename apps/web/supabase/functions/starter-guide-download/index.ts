import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod/mod.ts";
import { Resend } from "npm:resend@2.0.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import { getCorsHeaders } from "../_shared/cors.ts";

const FROM_NAME = "Jah Jah";
const FROM_EMAIL = "welcome@jahknowspr.com";
const SITE_URL = (Deno.env.get("PUBLIC_SITE_URL")?.trim() || "https://www.jahknowspr.com").replace(/\/$/, "");
const GUIDE_HUB_URL = `${SITE_URL}/the-brief/before-you-build-the-brand-starter-guide`;

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

async function buildStarterGuidePdf(recipientName: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const titleFont = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 56;
  const navy = rgb(0.039, 0.102, 0.208);
  const gold = rgb(0.773, 0.608, 0.235);
  const offWhite = rgb(0.969, 0.953, 0.918);

  for (const [index, slide] of GUIDE_SLIDES.entries()) {
    const page = pdf.addPage([pageWidth, pageHeight]);
    page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: offWhite });
    page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: 10, color: navy });
    page.drawText("JAHKNOWSPR", { x: margin, y: 744, size: 16, font: titleFont, color: navy });
    page.drawText("STARTER GUIDE", {
      x: margin,
      y: 726,
      size: 8,
      font: boldFont,
      color: gold,
      characterSpacing: 2.2,
    });
    page.drawText(`PAGE ${String(index + 1).padStart(2, "0")} / ${GUIDE_SLIDES.length}`, {
      x: pageWidth - margin - 96,
      y: 726,
      size: 7.5,
      font: boldFont,
      color: navy,
      characterSpacing: 1.8,
    });

    let cursor = 654;
    const titleSize = index === 0 ? 34 : 28;
    wrapPdfText(slide.title, titleFont, titleSize, pageWidth - margin * 2).slice(0, 3).forEach((line) => {
      page.drawText(line, { x: margin, y: cursor, size: titleSize, font: titleFont, color: navy });
      cursor -= index === 0 ? 38 : 32;
    });
    cursor -= 24;

    slide.paragraphs.forEach((paragraph) => {
      wrapPdfText(paragraph, bodyFont, 11, pageWidth - margin * 2).forEach((line) => {
        page.drawText(line, { x: margin, y: cursor, size: 11, font: bodyFont, color: navy });
        cursor -= 16;
      });
      cursor -= 12;
    });

    if (index === 0) {
      page.drawText(`Prepared for ${recipientName}`, {
        x: margin,
        y: 252,
        size: 11,
        font: boldFont,
        color: navy,
      });
      page.drawText(`Read more at ${GUIDE_HUB_URL.replace(/^https?:\/\//, "")}`, {
        x: margin,
        y: 232,
        size: 10,
        font: bodyFont,
        color: navy,
      });
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
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0A1A35;">
        <h1 style="font-size:22px;margin:0 0 12px;">Before You Build the Brand</h1>
        <p style="margin:0 0 12px;">Hi ${recipientName},</p>
        <p style="margin:0 0 12px;">
          Your 22-page JahKnowsPR starter guide is attached. Use it to complete your foundation steps before submitting a new audit request.
        </p>
        <p style="margin:0 0 12px;">
          Read the companion articles here:
          <a href="${GUIDE_HUB_URL}" style="color:#8C6C27;">${GUIDE_HUB_URL}</a>
        </p>
        <p style="margin:0;">- JahKnowsPR</p>
      </div>
    `;

    await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: recipientEmail,
      subject,
      html: emailHtml,
      attachments: [
        {
          filename: "before-you-build-the-brand-starter-guide.pdf",
          content: pdfBase64,
        },
      ],
    });

    if (payload.subscribe) {
      const email = recipientEmail;
      const { data: existing } = await supabaseAdmin
        .from("subscribers")
        .select("id,access_token,lead_source")
        .eq("email", email)
        .maybeSingle();

      if (!existing) {
        await supabaseAdmin
          .from("subscribers")
          .insert({
            name: recipientName,
            email,
            access_token: generateAccessToken(),
            lead_source: {
              source: "before_you_build_brand_guide",
              source_path: payload.sourcePath,
              phone: recipientPhone || null,
            },
          });
      } else {
        const mergedLeadSource = {
          ...(existing.lead_source && typeof existing.lead_source === "object" ? existing.lead_source : {}),
          source: "before_you_build_brand_guide",
          source_path: payload.sourcePath,
          phone: recipientPhone || null,
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
