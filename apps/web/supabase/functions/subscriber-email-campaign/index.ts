import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "resend";
import { z } from "https://deno.land/x/zod/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logOutboundEmail } from "../_shared/outbound-email-log.ts";

const FROM_NAME = "Jah Jah";
const FROM_EMAIL = "welcome@jahknowspr.com";
const SITE_URL = "https://www.jahknowspr.com";
const THE_BRIEF_URL = `${SITE_URL}/the-brief`;

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("send_blog"),
    blogPostId: z.string().uuid(),
    subject: z.string().trim().min(3).max(200).optional(),
    ctaLabel: z.string().trim().min(1).max(80).optional(),
    ctaUrl: z.string().url().optional(),
    testEmail: z.string().trim().email().optional(),
  }),
  z.object({
    action: z.literal("send_custom"),
    subject: z.string().trim().min(3).max(200).optional(),
    previewLine: z.string().trim().max(500).optional(),
    campaignName: z.string().trim().min(1).max(120).optional(),
    ctaLabel: z.string().trim().min(1).max(80).optional(),
    ctaUrl: z.string().url().optional(),
    blogPostId: z.string().uuid().optional(),
    useLatestBlog: z.boolean().optional(),
    testEmail: z.string().trim().email().optional(),
  }),
  z.object({
    action: z.literal("send_test_welcome"),
    testEmail: z.string().trim().email().optional(),
  }),
  z.object({
    action: z.literal("send_campaign"),
    campaignId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("run_due"),
  }),
]);

type BlogPostRow = {
  id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  description: string | null;
  cover_image_url: string | null;
};

function toPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildCampaignEmailHtml(opts: {
  name: string;
  headline: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  previewLine?: string | null;
}) {
  const greeting = opts.name.trim() || "there";
  const preview = opts.previewLine?.trim()
    ? `<p style="margin:0 0 14px;font-size:15px;color:#555;">${opts.previewLine}</p>`
    : "";
  return `
  <body style="margin:0;background:#F7F3EA;padding:28px 12px;font-family:Arial,sans-serif;color:#0A1A35;line-height:1.6;">
    <div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #E8DFC8;border-radius:24px;overflow:hidden;">
      <div style="height:8px;background:#0A1A35;"></div>
      <div style="padding:34px 32px 28px;">
        <p style="margin:0 0 14px;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#8C6C27;font-weight:700;">JahKnowsPR Firm / The Brief</p>
        <h1 style="font-family:Georgia,serif;margin:0 0 18px;font-size:32px;line-height:1.1;color:#0A1A35;">${opts.headline}</h1>
        <p style="margin:0 0 14px;">Hi ${greeting},</p>
        ${preview}
        <div style="margin:16px 0 20px;">${opts.bodyHtml}</div>
        <p style="margin:0 0 18px;">
          <a href="${opts.ctaUrl}" style="display:inline-block;background:#0A1A35;color:#fff;padding:13px 20px;border-radius:999px;text-decoration:none;font-weight:700;">
            ${opts.ctaLabel}
          </a>
        </p>
        <p style="margin:24px 0 0;font-size:12px;color:#666;">JahKnowsPR Firm · <a href="${THE_BRIEF_URL}" style="color:#8C6C27;">The Brief</a></p>
      </div>
    </div>
  </body>`;
}

function buildWelcomeEmailHtml(name: string) {
  return buildCampaignEmailHtml({
    name,
    headline: "Thank you for subscribing.",
    previewLine: "You're on the list. We'll share strategic Brief updates when new editions are ready.",
    bodyHtml: `<p style="margin:0 0 14px;">
      The Brief is live — explore brand intelligence and public relations insights built for founders, creators, and organizations building long-term credibility.
    </p>`,
    ctaLabel: "Explore The Brief",
    ctaUrl: THE_BRIEF_URL,
  });
}

function buildBlogEmailHtml(
  name: string,
  post: BlogPostRow,
  ctaLabel: string,
  ctaUrl: string,
) {
  const slug = post.slug?.trim() || post.id;
  const postUrl = ctaUrl || `${SITE_URL}/the-brief/${encodeURIComponent(slug)}`;
  const excerpt = (post.excerpt || post.description || "").trim();
  const cover = post.cover_image_url?.trim()
    ? `<p style="margin:0 0 16px;"><img src="${post.cover_image_url}" alt="" style="max-width:100%;border-radius:12px;" /></p>`
    : "";
  return buildCampaignEmailHtml({
    name,
    headline: post.title,
    previewLine: excerpt || null,
    bodyHtml: `${cover}<p style="margin:0 0 14px;">A new edition of <strong>The Brief</strong> is ready for you.</p>`,
    ctaLabel,
    ctaUrl: postUrl,
  });
}

function computeNextSendAt(cadence: string, sendTime: string, sendDayOfWeek: string | null): string | null {
  const now = new Date();
  const [hh, mm] = sendTime.split(":").map((v) => Number(v));
  const next = new Date(now);
  next.setHours(hh || 9, mm || 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);

  if (cadence === "daily") return next.toISOString();
  if (cadence === "weekly") {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const target = days.indexOf((sendDayOfWeek || "monday").toLowerCase());
    const current = next.getDay();
    let delta = target - current;
    if (delta <= 0) delta += 7;
    next.setDate(next.getDate() + delta);
    return next.toISOString();
  }
  if (cadence === "monthly") {
    next.setMonth(next.getMonth() + 1, 1);
    return next.toISOString();
  }
  return null;
}

async function requireDashboardUser(req: Request, supabase: ReturnType<typeof createClient>) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) };
  }
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
  if (userErr || !userData.user) {
    return { error: new Response(JSON.stringify({ error: "Invalid session" }), { status: 401 }) };
  }
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  const role = roleRow?.role as string | undefined;
  if (!role || !["admin", "author", "intern", "3pv"].includes(role)) {
    return { error: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }) };
  }
  return { user: userData.user };
}

type SendRecipient = { id: string | null; name: string; email: string };

async function sendToRecipients(
  supabase: ReturnType<typeof createClient>,
  resend: Resend,
  recipients: SendRecipient[],
  buildForSubscriber: (name: string, email: string) => { subject: string; html: string },
  messageType: string,
  relatedId?: string,
  relatedTable?: string,
) {
  const list = recipients;
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const sub of list) {
    const email = String(sub.email).trim().toLowerCase();
    const { subject, html } = buildForSubscriber(String(sub.name || ""), email);
    try {
      const result = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: email,
        subject,
        html,
      });
      sent += 1;
      await logOutboundEmail(supabase, {
        messageType,
        fromEmail: FROM_EMAIL,
        toEmail: email,
        subject,
        status: "sent",
        providerMessageId: (result as { data?: { id?: string } })?.data?.id ?? null,
        relatedTable: relatedTable ?? (relatedId ? "subscriber_email_campaigns" : "blog_posts"),
        relatedId: relatedId ?? null,
        subscriberId: sub.id,
        generatedBy: "human",
        bodyHtml: html,
        bodyText: toPlainText(html),
      });
    } catch (err) {
      failed += 1;
      const msg = err instanceof Error ? err.message : "Send failed";
      errors.push(`${email}: ${msg}`);
      await logOutboundEmail(supabase, {
        messageType,
        fromEmail: FROM_EMAIL,
        toEmail: email,
        subject,
        status: "failed",
        errorMessage: msg,
        relatedTable: relatedTable ?? (relatedId ? "subscriber_email_campaigns" : "blog_posts"),
        relatedId: relatedId ?? null,
        subscriberId: sub.id,
        generatedBy: "human",
        bodyHtml: html,
        bodyText: toPlainText(html),
      });
    }
  }

  return { total: list.length, sent, failed, errors: errors.slice(0, 5), testMode: list.length === 1 };
}

async function loadAllSubscribers(supabase: ReturnType<typeof createClient>): Promise<SendRecipient[]> {
  const { data: subscribers, error } = await supabase
    .from("subscribers")
    .select("id, name, email")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (subscribers ?? []).map((sub) => ({
    id: sub.id,
    name: String(sub.name || ""),
    email: String(sub.email).trim().toLowerCase(),
  }));
}

function testRecipientFromUser(user: { email?: string; user_metadata?: Record<string, unknown> }): SendRecipient {
  const email = String(user.email ?? "").trim().toLowerCase();
  const metaName = user.user_metadata?.full_name ?? user.user_metadata?.name;
  const name = typeof metaName === "string" && metaName.trim() ? metaName.trim() : email.split("@")[0] || "there";
  return { id: null, name, email };
}

async function executeCampaignSend(
  supabase: ReturnType<typeof createClient>,
  resend: Resend,
  campaignId: string,
) {
  const { data: campaign, error: campErr } = await supabase
    .from("subscriber_email_campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();
  if (campErr || !campaign) {
    throw new Error("Campaign not found.");
  }

  let post: BlogPostRow | null = null;
  if (campaign.blog_post_id) {
    const { data } = await supabase
      .from("blog_posts")
      .select("id, title, slug, excerpt, description, cover_image_url")
      .eq("id", campaign.blog_post_id)
      .maybeSingle();
    post = data as BlogPostRow | null;
  } else if (campaign.use_latest_blog) {
    const { data } = await supabase
      .from("blog_posts")
      .select("id, title, slug, excerpt, description, cover_image_url")
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    post = data as BlogPostRow | null;
  }

  const ctaLabel = campaign.custom_cta_label?.trim() || "Read The Brief";
  const ctaUrl = campaign.custom_cta_url?.trim() || THE_BRIEF_URL;
  const subject =
    campaign.subject?.trim() ||
    (post ? `The Brief: ${post.title}` : "Updates from JahKnowsPR");

  const result = await sendToRecipients(
    supabase,
    resend,
    await loadAllSubscribers(supabase),
    (name) => {
      if (post) {
        return { subject, html: buildBlogEmailHtml(name, post, ctaLabel, ctaUrl) };
      }
      return {
        subject,
        html: buildCampaignEmailHtml({
          name,
          headline: campaign.name,
          previewLine: campaign.preview_line,
          bodyHtml: `<p style="margin:0 0 14px;">${campaign.preview_line || "Your latest strategic update from JahKnowsPR."}</p>`,
          ctaLabel,
          ctaUrl,
        }),
      };
    },
    "subscriber_scheduled_campaign",
    campaign.id,
    "subscriber_email_campaigns",
  );

  const nextSend = campaign.cadence === "one_time"
    ? null
    : computeNextSendAt(campaign.cadence, campaign.send_time, campaign.send_day_of_week);
  await supabase
    .from("subscriber_email_campaigns")
    .update({
      last_sent_at: new Date().toISOString(),
      next_send_at: nextSend,
      is_active: campaign.cadence === "one_time" ? false : campaign.is_active,
    })
    .eq("id", campaign.id);

  return result;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing server configuration." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const auth = await requireDashboardUser(req, supabase);
  if ("error" in auth && auth.error) {
    return new Response(await auth.error.text(), {
      status: auth.error.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const raw = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid input", details: parsed.error.flatten() }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const resend = new Resend(RESEND_API_KEY);

  try {
    if (parsed.data.action === "send_blog") {
      const { data: post, error: postErr } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, description, cover_image_url")
        .eq("id", parsed.data.blogPostId)
        .maybeSingle();
      if (postErr || !post) {
        return new Response(JSON.stringify({ error: "Blog post not found." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const slug = post.slug?.trim() || post.id;
      const defaultUrl = `${SITE_URL}/the-brief/${encodeURIComponent(slug)}`;
      const ctaLabel = parsed.data.ctaLabel?.trim() || "Read this edition";
      const ctaUrl = parsed.data.ctaUrl?.trim() || defaultUrl;
      const subject = parsed.data.subject?.trim() || `New on The Brief: ${post.title}`;
      const recipients = parsed.data.testEmail
        ? [{ id: null, name: testRecipientFromUser(auth.user!).name, email: parsed.data.testEmail.trim().toLowerCase() }]
        : await loadAllSubscribers(supabase);
      const result = await sendToRecipients(
        supabase,
        resend,
        recipients,
        (name) => ({
          subject,
          html: buildBlogEmailHtml(name, post as BlogPostRow, ctaLabel, ctaUrl),
        }),
        parsed.data.testEmail ? "subscriber_campaign_test" : "subscriber_blog_campaign",
        post.id,
        "blog_posts",
      );
      return new Response(JSON.stringify({ ok: true, ...result }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (parsed.data.action === "send_custom") {
      let post: BlogPostRow | null = null;
      if (parsed.data.blogPostId) {
        const { data } = await supabase
          .from("blog_posts")
          .select("id, title, slug, excerpt, description, cover_image_url")
          .eq("id", parsed.data.blogPostId)
          .maybeSingle();
        post = data as BlogPostRow | null;
      } else if (parsed.data.useLatestBlog) {
        const { data } = await supabase
          .from("blog_posts")
          .select("id, title, slug, excerpt, description, cover_image_url")
          .eq("status", "published")
          .order("published_at", { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle();
        post = data as BlogPostRow | null;
      }
      const ctaLabel = parsed.data.ctaLabel?.trim() || "Read The Brief";
      const ctaUrl = parsed.data.ctaUrl?.trim() || THE_BRIEF_URL;
      const campaignName = parsed.data.campaignName?.trim() || "Updates from JahKnowsPR";
      const subject =
        parsed.data.subject?.trim() ||
        (post ? `The Brief: ${post.title}` : campaignName);
      const recipients = parsed.data.testEmail
        ? [{ id: null, name: testRecipientFromUser(auth.user!).name, email: parsed.data.testEmail.trim().toLowerCase() }]
        : await loadAllSubscribers(supabase);
      const isTest = Boolean(parsed.data.testEmail);
      const result = await sendToRecipients(
        supabase,
        resend,
        recipients,
        (name) => {
          if (post) {
            return { subject, html: buildBlogEmailHtml(name, post, ctaLabel, ctaUrl) };
          }
          return {
            subject,
            html: buildCampaignEmailHtml({
              name,
              headline: campaignName,
              previewLine: parsed.data.previewLine,
              bodyHtml: `<p style="margin:0 0 14px;">${parsed.data.previewLine || "Your latest strategic update from JahKnowsPR."}</p>`,
              ctaLabel,
              ctaUrl,
            }),
          };
        },
        isTest ? "subscriber_campaign_test" : "subscriber_scheduled_campaign",
        post?.id ?? null,
        "subscriber_email_campaigns",
      );
      return new Response(JSON.stringify({ ok: true, ...result }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (parsed.data.action === "send_test_welcome") {
      const testEmail =
        parsed.data.testEmail?.trim().toLowerCase() ||
        String(auth.user?.email ?? "").trim().toLowerCase();
      if (!testEmail) {
        return new Response(JSON.stringify({ error: "No email on your account for test send." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const recipient = testRecipientFromUser(auth.user!);
      recipient.email = testEmail;
      const subject = "Thank you for subscribing";
      const result = await sendToRecipients(
        supabase,
        resend,
        [recipient],
        (name) => ({ subject, html: buildWelcomeEmailHtml(name) }),
        "subscriber_campaign_test",
        undefined,
        "subscribers",
      );
      return new Response(JSON.stringify({ ok: true, ...result }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (parsed.data.action === "send_campaign") {
      try {
        const result = await executeCampaignSend(supabase, resend, parsed.data.campaignId);
        return new Response(JSON.stringify({ ok: true, ...result }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Campaign send failed";
        return new Response(JSON.stringify({ error: message }), {
          status: message === "Campaign not found." ? 404 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const now = new Date().toISOString();
    const { data: due, error: dueErr } = await supabase
      .from("subscriber_email_campaigns")
      .select("id, name")
      .eq("is_active", true)
      .neq("cadence", "one_time")
      .lte("next_send_at", now);
    if (dueErr) throw dueErr;

    const summaries: { campaignId: string; name: string; sent: number; failed: number }[] = [];
    for (const row of due ?? []) {
      try {
        const result = await executeCampaignSend(supabase, resend, row.id);
        summaries.push({
          campaignId: row.id,
          name: row.name,
          sent: result.sent,
          failed: result.failed,
        });
      } catch {
        summaries.push({ campaignId: row.id, name: row.name, sent: 0, failed: 0 });
      }
    }

    return new Response(JSON.stringify({ ok: true, dueCount: due?.length ?? 0, summaries }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
