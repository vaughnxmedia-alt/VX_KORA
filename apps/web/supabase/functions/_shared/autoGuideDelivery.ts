import { Resend } from "npm:resend@2.0.0";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { usesStarterGuidePipeline } from "./auditResearchEligibility.ts";
import {
  buildGuideDeliveryEmailHtml,
  GUIDE_DELIVERY_EMAIL_SUBJECT,
} from "./guideDeliveryEmail.ts";
import { logOutboundEmail } from "./outbound-email-log.ts";

const FROM_NAME = "Jah Jah";
const DEFAULT_FROM_EMAIL = "welcome@jahknowspr.com";

export type GuideDeliveryAuditRow = {
  id: string;
  audit_intake_id?: string | null;
  lead_email_lower?: string | null;
  lead_key?: string | null;
  contact_name?: string | null;
  business_name?: string | null;
  website_link?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  other_socials?: string | null;
  follow_up_status?: string | null;
  metadata?: Record<string, unknown> | null;
};

function normalizeEmail(value: unknown): string | null {
  const email = String(value ?? "").trim().toLowerCase();
  return email.includes("@") ? email : null;
}

export async function autoSendGuideDeliveryEmail(
  supabase: SupabaseClient,
  audit: GuideDeliveryAuditRow,
  options?: { force?: boolean; forceGuidePath?: boolean },
): Promise<{ sent: boolean; skipped?: boolean; reason?: string; to?: string }> {
  if (!options?.forceGuidePath && !usesStarterGuidePipeline(audit)) {
    return { sent: false, skipped: true, reason: "not_guide_path" };
  }

  const metadata = audit.metadata && typeof audit.metadata === "object"
    ? (audit.metadata as Record<string, unknown>)
    : {};
  const guideEmailMeta = metadata.guide_email && typeof metadata.guide_email === "object"
    ? (metadata.guide_email as Record<string, unknown>)
    : {};
  const guideAlreadySent = Boolean(guideEmailMeta.sent_at);

  if (guideAlreadySent && !options?.force) {
    return { sent: false, skipped: true, reason: "guide_already_sent" };
  }

  if (audit.follow_up_status === "audit_sent" && metadata.audit_delivery_mode === "brand_diagnosis") {
    console.warn(
      `autoSendGuideDeliveryEmail: correcting mistaken audit send for guide-path lead ${audit.id}`,
    );
  }

  const recipient = normalizeEmail(audit.lead_email_lower) ?? normalizeEmail(audit.lead_key);
  if (!recipient) {
    return { sent: false, skipped: true, reason: "no_email" };
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY")?.trim();
  if (!resendApiKey) {
    console.warn("autoSendGuideDeliveryEmail: RESEND_API_KEY missing");
    return { sent: false, skipped: true, reason: "resend_not_configured" };
  }

  const fromEmail = (
    Deno.env.get("FREE_AUDIT_FROM_EMAIL")?.trim() ||
    Deno.env.get("STRATEGY_SESSION_FROM_EMAIL")?.trim() ||
    DEFAULT_FROM_EMAIL
  );
  const html = buildGuideDeliveryEmailHtml({
    contactName: audit.contact_name,
    businessName: audit.business_name,
  });
  const sentAt = new Date().toISOString();
  const auditIntakeId = String(audit.audit_intake_id ?? audit.id);

  try {
    const resend = new Resend(resendApiKey);
    const sendResult = await resend.emails.send({
      from: `${FROM_NAME} <${fromEmail}>`,
      to: recipient,
      subject: GUIDE_DELIVERY_EMAIL_SUBJECT,
      html,
    });

    const providerMessageId = (sendResult as { data?: { id?: string } })?.data?.id ?? null;

    await Promise.allSettled([
      supabase
        .from("free_audits")
        .update({
          follow_up_status: "audit_sent",
          metadata: {
            ...metadata,
            report_mode: "starter_guide",
            audit_delivery_mode: "starter_guide",
            guide_email: {
              sent_at: sentAt,
              subject: GUIDE_DELIVERY_EMAIL_SUBJECT,
              provider_message_id: providerMessageId,
              auto: true,
            },
          },
        })
        .eq("id", audit.id),
      supabase
        .from("audit_intakes")
        .update({ status: "audit_sent", last_touch_at: sentAt })
        .eq("id", auditIntakeId),
    ]);

    await logOutboundEmail(supabase, {
      messageType: "free_audit_guide",
      fromEmail,
      toEmail: recipient,
      subject: GUIDE_DELIVERY_EMAIL_SUBJECT,
      status: "sent",
      providerMessageId,
      relatedTable: "free_audits",
      relatedId: audit.id,
      generatedBy: "system",
      bodyHtml: html,
    });

    return { sent: true, to: recipient };
  } catch (error) {
    console.warn("autoSendGuideDeliveryEmail failed", error);
    return { sent: false, skipped: true, reason: "send_failed" };
  }
}
