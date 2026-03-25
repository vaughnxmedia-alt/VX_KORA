import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type OutboundEmailLogInput = {
  channel?: "resend";
  messageType: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  status: "queued" | "sent" | "failed";
  providerMessageId?: string | null;
  errorMessage?: string | null;
  relatedTable?: string | null;
  relatedId?: string | null;
  customerId?: string | null;
  subscriberId?: string | null;
  generatedBy?: "human" | "gemini" | "system";
  approvedByUserId?: string | null;
  bodyHtml?: string | null;
  bodyText?: string | null;
};

export async function logOutboundEmail(
  supabase: SupabaseClient,
  payload: OutboundEmailLogInput,
): Promise<void> {
  const { error } = await supabase.from("outbound_email_logs").insert({
    channel: payload.channel ?? "resend",
    message_type: payload.messageType,
    from_email: payload.fromEmail,
    to_email: payload.toEmail,
    subject: payload.subject,
    status: payload.status,
    provider_message_id: payload.providerMessageId ?? null,
    error_message: payload.errorMessage ?? null,
    related_table: payload.relatedTable ?? null,
    related_id: payload.relatedId ?? null,
    customer_id: payload.customerId ?? null,
    subscriber_id: payload.subscriberId ?? null,
    generated_by: payload.generatedBy ?? "system",
    approved_by_user_id: payload.approvedByUserId ?? null,
    body_html: payload.bodyHtml ?? null,
    body_text: payload.bodyText ?? null,
  });

  if (error) {
    console.error("Failed to write outbound email log:", error);
  }
}
