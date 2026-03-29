import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "resend";
import { z } from "https://deno.land/x/zod/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logOutboundEmail } from "../_shared/outbound-email-log.ts";

const FROM_NAME = "Jah Jah";
const FROM_EMAIL = "welcome@jahknowspr.com";
const THE_BRIEF_URL = "https://jahknowspr.com/the-brief";

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
    const { record } = await req.json();
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
      })
      .select()
      .single();
    if (insertError) {
      if (insertError.code === "23505") {
        console.log("Email already subscribed, granting access:", email);
        // Retrieve existing access token for returning subscribers
        const { data: existingSub } = await supabaseAdmin
          .from("subscribers")
          .select("access_token")
          .eq("email", email)
          .single();
        return new Response(
          JSON.stringify({
            message: "Welcome back! You already have access.",
            alreadySubscribed: true,
            access_token: existingSub?.access_token || null,
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
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333;">
     <h2 style="color: #2563eb; margin-bottom: 20px;">Hey ${name},</h2>
      <p>Thank you for requesting access to <strong>JahKnowsPR Firm</strong>. Your name has been added to our early-access list; and that means you'll be among the first to experience what's coming next.</p>
      <p>We're currently finalizing our new platform; a home for strategy, storytelling, and visibility designed to help brands and creators be seen, heard, and remembered.</p>
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0;">
        <h3 style="color: #1e40af; margin-top: 0;">You've been granted immediate access to The Brief!</h3>
        <p>In the meantime, you can start exploring our exclusive content hub for brand strategy insights and marketing analysis.</p>
        <a href="${THE_BRIEF_URL}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">
          Explore The Brief Now
        </a>
      </div>
      <p>Stay close; we'll keep you updated as new platform features, services, and client opportunities roll out.</p>
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="margin-bottom: 5px;"><strong>Warm regards,</strong></p>
        <p style="margin-bottom: 5px;"><strong>${FROM_NAME}</strong></p>
        <p style="margin-bottom: 5px; color: #6b7280;">Founder & Lead Strategist</p>
        <p style="margin-bottom: 0; color: #6b7280;"><strong>JahKnowsPR Firm</strong></p>
      </div>
    </div>
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
