import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "resend";
import { z } from "https://deno.land/x/zod/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logOutboundEmail } from "../_shared/outbound-email-log.ts";
import {
  readAttributionFromPayload,
  safeRecordOutcome,
  safeUpsertFunnelAttribution,
} from "../_shared/lls.ts";

const FROM_NAME = "Jah Jah";
const FROM_EMAIL = "welcome@jahknowspr.com";
const THE_BRIEF_URL = "https://www.jahknowspr.com/the-brief";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }
  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({
          error:
            "Missing required environment variables in Supabase function settings.",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
    const body = await req.json();
    const { record } = body;
    const validationResult = subscriberSchema.safeParse(record);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid input.",
          details: validationResult.error.flatten(),
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
    const { name, email } = validationResult.data;
    const leadSource = readAttributionFromPayload(body as Record<string, unknown>);
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const resend = new Resend(RESEND_API_KEY);

    // Generate a secure access token
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const accessToken = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');

    const { data: subscriber, error: insertError } = await supabaseAdmin
      .from("subscribers")
      .insert({
        name,
        email,
        access_token: accessToken,
        lead_source: leadSource,
      })
      .select()
      .single();
    if (insertError) {
      if (insertError.code === "23505") {
        // Do not disclose existing access tokens or subscriber existence details.
        return new Response(
          JSON.stringify({
            message: "Subscription request received.",
            alreadySubscribed: true,
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }
      console.error("Error inserting subscriber:", insertError);
      throw insertError;
    }
    const emailSubject = "Access Requested — You're on the list ✨";
    const emailHtml = createEmailHtml(name);

    try {
      const sendResult = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: email,
        subject: emailSubject,
        html: emailHtml,
      });
      await supabaseAdmin
        .from("subscribers")
        .update({
          email_sent: true,
        })
        .eq("id", subscriber.id);

      await logOutboundEmail(supabaseAdmin, {
        messageType: "subscriber_verification",
        fromEmail: FROM_EMAIL,
        toEmail: email,
        subject: emailSubject,
        status: "sent",
        providerMessageId: (sendResult as { data?: { id?: string } })?.data?.id ?? null,
        relatedTable: "subscribers",
        relatedId: subscriber.id,
        subscriberId: subscriber.id,
        generatedBy: "system",
        bodyHtml: emailHtml,
        bodyText: toPlainText(emailHtml),
      });
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      await logOutboundEmail(supabaseAdmin, {
        messageType: "subscriber_verification",
        fromEmail: FROM_EMAIL,
        toEmail: email,
        subject: emailSubject,
        status: "failed",
        errorMessage: emailError instanceof Error ? emailError.message : "Failed to send subscriber email",
        relatedTable: "subscribers",
        relatedId: subscriber.id,
        subscriberId: subscriber.id,
        generatedBy: "system",
        bodyHtml: emailHtml,
        bodyText: toPlainText(emailHtml),
      });
    }
    await Promise.allSettled([
      safeUpsertFunnelAttribution(supabaseAdmin, {
        lead_key: email.trim().toLowerCase(),
        lead_kind: "subscriber",
        attribution_confidence: 0.55,
        multi_touch_weight: 0.35,
        ...leadSource,
        metadata: { ...leadSource.metadata, subscriber_id: subscriber.id },
      }),
      safeRecordOutcome(supabaseAdmin, {
        lead_id: email.trim().toLowerCase(),
        subject_kind: "lead",
        subject_id: subscriber.id,
        actor_kind: "anonymous",
        action: "lead_captured",
        strategy_origin: "human_defined",
        learning_mode: "validated_learning",
        intended_metric_type: "strategy_session_booking",
        actual_metric_type: "subscriber_created",
        predicted_conversion_probability: 0.08,
        expected_baseline: 0,
        delta_value: 1,
        success_flag: true,
        revenue_impact: 0,
        outcome_verified: true,
        verification_source: "system",
        verification_confidence_component: 0.85,
        causal_method: "heuristic",
        causal_confidence_component: 0.45,
        evidence_strength_component: 0.2,
        status: "success",
        business_goal: "lead_quality",
        correlation_id: leadSource.correlation_id ?? email.trim().toLowerCase(),
        strategy_id: "system:subscriber-lead-capture",
        messaging_angle: leadSource.messaging_angle ?? "subscriber_signup",
        hook: leadSource.hook ?? "newsletter_signup",
        projection_version: "lls-projection-v1:lead-capture",
        intended_outcome: { target: "book_strategy_session" },
        actual_outcome: { subscriber_id: subscriber.id, email_sent: true },
        metadata: { name, leadSource },
      }),
    ]);
    return new Response(
      JSON.stringify({
        message: "Subscription successful.",
        access_token: accessToken,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

const createEmailHtml = (name: string) => `
  <body style="margin:0;background:#F7F3EA;padding:28px 12px;font-family:Arial,sans-serif;color:#0A1A35;line-height:1.6;">
    <div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #E8DFC8;border-radius:24px;overflow:hidden;">
      <div style="height:8px;background:#0A1A35;"></div>
      <div style="padding:34px 32px 28px;">
        <p style="margin:0 0 14px;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#8C6C27;font-weight:700;">JahKnowsPR Firm / The Brief</p>
        <h1 style="font-family:Georgia,serif;margin:0 0 18px;font-size:38px;line-height:1.05;color:#0A1A35;">You're in.</h1>
        <p style="margin:0 0 14px;">Hi ${name},</p>
        <p style="margin:0 0 14px;">
          Thank you for requesting access to <strong>The Brief</strong>. You now have immediate access to JahKnowsPR strategic articles.
        </p>
        <div style="margin:20px 0;padding:18px;border-left:4px solid #C59B3C;background:#F7F3EA;border-radius:0 16px 16px 0;">
          <p style="margin:0;color:#0A1A35;">
            Use The Brief to strengthen your positioning, audience clarity, messaging, and conversion decisions before your next campaign move.
          </p>
        </div>
        <p style="margin:0 0 16px;">Start reading here:</p>
        <p style="margin:0 0 18px;">
          <a href="${THE_BRIEF_URL}" style="display:inline-block;background:#0A1A35;color:#fff;padding:13px 20px;border-radius:999px;text-decoration:none;font-weight:700;">
            Explore The Brief Now
          </a>
        </p>
        <p style="margin:24px 0 0;font-size:12px;color:#666;">JahKnowsPR Firm</p>
      </div>
    </div>
  </body>
  `;
const subscriberSchema = z.object({
  name: z.string().min(2, "Name is too short").max(50, "Name is too long"),
  email: z.string().email("Invalid email format"),
});

function toPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
