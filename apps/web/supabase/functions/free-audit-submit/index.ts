import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod/mod.ts";
import { Resend } from "npm:resend@2.0.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import {
  createServiceClient,
  readAttributionFromPayload,
  safeRecordOutcome,
  safeUpsertFunnelAttribution,
} from "../_shared/lls.ts";
import { normalizeAuditSources } from "../_shared/sourceNormalizer.ts";

const submitSchema = z.object({
  email: z.string().email(),
  phone: z.string().max(40).nullable().optional(),
  name: z.string().max(120).nullable().optional(),
  businessName: z.string().max(160).nullable().optional(),
  publicBusinessName: z.string().max(160).nullable().optional(),
  websiteLink: z.string().max(300).nullable().optional(),
  instagram: z.string().max(200).nullable().optional(),
  facebook: z.string().max(200).nullable().optional(),
  tiktok: z.string().max(200).nullable().optional(),
  otherSocials: z.string().max(4000).nullable().optional(),
  growthGoal: z.string().max(1200).nullable().optional(),
  currentBlocker: z.string().max(1200).nullable().optional(),
  targetAudienceBelief: z.string().max(1200).nullable().optional(),
  intent: z.enum(["ready_now", "open_if_it_makes_sense", "just_looking"]),
  businessEntityType: z.enum(["corporation", "sole_proprietor", "personal_brand_without_documentation"]).optional(),
  readinessLevel: z.enum(["HOT", "WARM", "COLD"]),
  leadKey: z.string().min(3).optional(),
  customerId: z.string().uuid().nullable().optional(),
  auditAngle: z.string().min(1).max(100).default("general_brand"),
  intendedCta: z.string().max(200).nullable().optional(),
  predictedConversionProbability: z.number().min(0).max(1).optional(),
  expectedBaseline: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
  attribution: z.record(z.unknown()).optional(),
  leadSource: z.record(z.unknown()).optional(),
});

const FROM_NAME = "Jah Jah";
const DEFAULT_FROM_EMAIL = "welcome@jahknowspr.com";

function normalizeLeadKey(data: z.infer<typeof submitSchema>) {
  if (data.leadKey?.trim()) return data.leadKey.trim().toLowerCase();
  if (data.email?.trim()) return data.email.trim().toLowerCase();
  return data.customerId!;
}

async function safeRequestAestheticScan(auditId: string) {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/free-audit-aesthetic-scan`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ auditId }),
    });
    if (!response.ok) {
      console.warn("free-audit-aesthetic-scan skipped", await response.text());
    }
  } catch (error) {
    console.warn("free-audit-aesthetic-scan failed", error);
  }
}

async function safeRequestSocialResearch(auditId: string) {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/free-audit-social-research`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ auditId }),
    });
    if (!response.ok) {
      console.warn("free-audit-social-research skipped", await response.text());
    }
  } catch (error) {
    console.warn("free-audit-social-research failed", error);
  }
}

function normalizeEmail(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : null;
}

async function safeNotifyNewAuditEmail(input: { contactName?: string | null; businessName?: string | null }) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY")?.trim();
  if (!resendApiKey) return;

  const recipientRaw = Deno.env.get("AUDIT_NOTIFICATION_EMAILS")?.trim() ||
    Deno.env.get("STRATEGY_SESSION_OPS_EMAIL")?.trim() ||
    "";
  if (!recipientRaw) return;

  const recipients = Array.from(
    new Set(
      recipientRaw
        .split(",")
        .map((item) => normalizeEmail(item))
        .filter((item): item is string => Boolean(item)),
    ),
  );
  if (!recipients.length) return;

  const fromEmail = (Deno.env.get("FREE_AUDIT_FROM_EMAIL")?.trim() ||
    Deno.env.get("STRATEGY_SESSION_FROM_EMAIL")?.trim() ||
    DEFAULT_FROM_EMAIL);
  const publicSiteUrl = (Deno.env.get("PUBLIC_SITE_URL")?.trim() || "https://www.jahknowspr.com").replace(/\/$/, "");
  const dashboardUrl = `${publicSiteUrl}/dashboard/audits`;
  const contactName = input.contactName?.trim() || "Unknown";
  const businessName = input.businessName?.trim() || "Unknown business";
  const subject = `NEW Audit Submittion: ${contactName} | ${businessName}`;
  const text = [
    "NEW Audit Submittion",
    "",
    "A new free audit was submitted and is ready for review.",
    `Name: ${contactName}`,
    `Business: ${businessName}`,
    "",
    `Open dashboard: ${dashboardUrl}`,
  ].join("\n");
  const html = `
  <body style="margin:0;background:#F7F3EA;padding:28px 12px;font-family:Arial,sans-serif;color:#0A1A35;line-height:1.6;">
    <div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #E8DFC8;border-radius:24px;overflow:hidden;">
      <div style="height:8px;background:#0A1A35;"></div>
      <div style="padding:34px 32px 28px;">
        <p style="margin:0 0 14px;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#8C6C27;font-weight:700;">JahKnowsPR Firm / Admin Alert</p>
        <h1 style="font-family:Georgia,serif;margin:0 0 18px;font-size:38px;line-height:1.05;color:#0A1A35;">NEW Audit Submittion</h1>
        <p style="margin:0 0 14px;">A new free audit was submitted and is ready for review.</p>
        <div style="margin:20px 0;padding:18px;border-left:4px solid #C59B3C;background:#F7F3EA;border-radius:0 16px 16px 0;">
          <p style="margin:0;color:#0A1A35;"><strong>Name:</strong> ${contactName}<br /><strong>Business:</strong> ${businessName}</p>
        </div>
        <p style="margin:0 0 16px;">Open the dashboard to review this submission and all new audits.</p>
        <p style="margin:0 0 18px;"><a href="${dashboardUrl}" style="display:inline-block;background:#0A1A35;color:#fff;padding:13px 20px;border-radius:999px;text-decoration:none;font-weight:700;">Open Audits Dashboard</a></p>
        <p style="margin:24px 0 0;font-size:12px;color:#666;">JahKnowsPR Firm</p>
      </div>
    </div>
  </body>`;

  try {
    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: `${FROM_NAME} <${fromEmail}>`,
      to: recipients,
      subject,
      text,
      html,
    });
  } catch (error) {
    console.warn("free-audit-submit email notification failed", error);
  }
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
    const body = await req.json();
    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid free audit payload", details: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const p = parsed.data;
    const supabase = createServiceClient();
    const leadKey = normalizeLeadKey(p);
    const leadEmailLower = p.email?.trim().toLowerCase() ?? null;
    if (leadEmailLower) {
      const { data: existingAudit, error: existingAuditError } = await supabase
        .from("free_audits")
        .select("id")
        .eq("lead_email_lower", leadEmailLower)
        .limit(1)
        .maybeSingle();
      if (existingAuditError) throw existingAuditError;
      if (existingAudit) {
        return new Response(
          JSON.stringify({
            error: "An audit already exists for this email. Ask JahKnowsPR to delete the existing audit before submitting again.",
            code: "duplicate_email",
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }
    const normalizedSocialSources = normalizeAuditSources({
      website_link: p.websiteLink,
      instagram: p.instagram,
      facebook: p.facebook,
      tiktok: p.tiktok,
      other_socials: p.otherSocials,
    });

    const { data: audit, error } = await supabase
      .from("free_audits")
      .insert({
        lead_key: leadKey,
        lead_email_lower: leadEmailLower,
        customer_id: p.customerId ?? null,
        contact_name: p.name ?? null,
        phone: p.phone ?? null,
        business_name: p.publicBusinessName?.trim() || p.businessName || null,
        website_link: p.websiteLink ?? null,
        instagram: p.instagram ?? null,
        facebook: p.facebook ?? null,
        tiktok: p.tiktok ?? null,
        other_socials: p.otherSocials ?? null,
        growth_goal: p.growthGoal ?? null,
        current_blocker: p.currentBlocker ?? null,
        target_audience_belief: p.targetAudienceBelief ?? null,
        intent: p.intent,
        readiness_level: p.readinessLevel,
        audience_segment: p.readinessLevel,
        follow_up_status: p.readinessLevel === "HOT" ? "follow_up_needed" : "new",
        retargeting_ready: true,
        correlation_id: readAttributionFromPayload(body).correlation_id ?? leadKey,
        lead_source: readAttributionFromPayload(body).lead_source ?? "direct",
        audit_angle: p.auditAngle,
        intended_cta: p.intendedCta ?? "book_strategy_session",
        predicted_conversion_probability: p.predictedConversionProbability ?? 0.12,
        expected_baseline: p.expectedBaseline ?? 0,
        completion_status: "started",
        metadata: {
          ...(p.metadata ?? {}),
          attribution: readAttributionFromPayload(body),
          business_entity_type: p.businessEntityType ?? null,
          legal_or_registered_business_name: p.businessName ?? null,
          public_business_name: p.publicBusinessName ?? null,
          requires_filing_notice: p.businessEntityType === "personal_brand_without_documentation",
          normalized_social_sources: normalizedSocialSources,
          social_research: {
            status: "queued",
            queued_at: new Date().toISOString(),
            normalized_sources: normalizedSocialSources,
          },
        },
      })
      .select("id, started_at, contact_name, business_name")
      .single();
    if (error) {
      if ((error as { code?: string }).code === "23505") {
        return new Response(
          JSON.stringify({
            error: "An audit already exists for this email. Ask JahKnowsPR to delete the existing audit before submitting again.",
            code: "duplicate_email",
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw error;
    }

    const attribution = readAttributionFromPayload(body);
    const correlationId = attribution.correlation_id ?? leadKey;
    const messagingAngle = attribution.messaging_angle ?? p.auditAngle;
    const hook = attribution.hook ?? p.intendedCta ?? "start_free_audit";
    await Promise.allSettled([
      safeUpsertFunnelAttribution(supabase, {
        lead_key: leadKey,
        lead_kind: "free_audit",
        tenant_id: p.customerId ?? null,
        attribution_confidence: 0.55,
        multi_touch_weight: 0.35,
        ...attribution,
        metadata: { ...attribution.metadata, audit_id: audit.id, audit_angle: p.auditAngle },
      }),
      safeRecordOutcome(supabase, {
        tenant_id: p.customerId ?? null,
        lead_id: leadKey,
        subject_kind: "free_audit",
        subject_id: audit.id,
        actor_kind: "anonymous",
        action: "free_audit_started",
        strategy_origin: "human_defined",
        learning_mode: "exploratory_learning",
        intended_metric_type: "strategy_session_booking",
        actual_metric_type: "audit_started",
        predicted_conversion_probability: p.predictedConversionProbability ?? 0.12,
        expected_baseline: p.expectedBaseline ?? 0,
        delta_value: 0,
        success_flag: null,
        revenue_impact: 0,
        outcome_verified: true,
        verification_source: "system",
        verification_confidence_component: 0.8,
        causal_method: "direct_attribution",
        causal_confidence_component: 0.55,
        evidence_strength_component: 0.2,
        status: "pending",
        business_goal: "booked_strategy_session",
        correlation_id: correlationId,
        strategy_id: "system:free-audit-funnel",
        messaging_angle: messagingAngle,
        hook,
        projection_version: "lls-projection-v1:free-audit",
        intended_outcome: {
          cta: p.intendedCta ?? "book_strategy_session",
          audit_angle: p.auditAngle,
        },
        actual_outcome: { audit_started: true },
        metadata: { ...(p.metadata ?? {}), attribution },
      }),
      safeRecordOutcome(supabase, {
        tenant_id: p.customerId ?? null,
        lead_id: leadKey,
        subject_kind: "lead",
        subject_id: audit.id,
        actor_kind: "anonymous",
        action: "lead_captured",
        strategy_origin: "human_defined",
        learning_mode: "validated_learning",
        intended_metric_type: "lead_quality",
        actual_metric_type: "free_audit_lead_capture",
        predicted_conversion_probability: p.predictedConversionProbability ?? 0.12,
        expected_baseline: p.expectedBaseline ?? 0,
        delta_value: 1,
        success_flag: true,
        revenue_impact: 0,
        outcome_verified: true,
        verification_source: "system",
        verification_confidence_component: 0.9,
        causal_method: "direct_attribution",
        causal_confidence_component: 0.7,
        evidence_strength_component: 0.3,
        status: "success",
        business_goal: "lead_quality",
        correlation_id: correlationId,
        strategy_id: "system:free-audit-funnel",
        messaging_angle: messagingAngle,
        hook,
        projection_version: "lls-projection-v1:free-audit",
        intended_outcome: { readiness_level: p.readinessLevel, intent: p.intent },
        actual_outcome: { lead_captured: true, audit_id: audit.id },
        metadata: { ...(p.metadata ?? {}), attribution, readiness_level: p.readinessLevel },
      }),
      safeRequestAestheticScan(audit.id),
      safeRequestSocialResearch(audit.id),
      safeNotifyNewAuditEmail({
        contactName: audit.contact_name,
        businessName: audit.business_name,
      }),
    ]);

    return new Response(JSON.stringify({ auditId: audit.id, leadKey, startedAt: audit.started_at }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("free-audit-submit error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
