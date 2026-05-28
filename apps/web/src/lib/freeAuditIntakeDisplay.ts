import type { Json } from "@/integrations/supabase/types";
import { qualifiesForFullAuditResearch, resolveAuditPresence } from "@/lib/auditResearchEligibility";

export type AuditIntakeSource = {
  lead_email_lower?: string | null;
  contact_name?: string | null;
  phone?: string | null;
  business_name?: string | null;
  website_link?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  other_socials?: string | null;
  growth_goal?: string | null;
  current_blocker?: string | null;
  target_audience_belief?: string | null;
  intent?: string | null;
  follow_up_status?: string | null;
  metadata?: Json;
};

export type AuditIntakeFieldRow = {
  label: string;
  value: string;
  group: string;
};

const INTENT_LABELS: Record<string, string> = {
  ready_now: "Ready to fix the positioning gap now",
  open_if_it_makes_sense: "Open to fixing it if the audit makes sense",
  just_looking: "Just looking / exploring",
};

const ENTITY_LABELS: Record<string, string> = {
  corporation: "Corporation or LLC (registered name)",
  sole_proprietor: "Sole proprietor (DBA)",
  personal_brand_without_documentation: "Personal brand (not yet filed)",
};

function asRecord(value: Json | undefined): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function rawValue(value: unknown, fallback = "Not provided"): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function presenceValue(
  url: string | null | undefined,
  notStarted: boolean | undefined,
  legacyNotStarted?: boolean,
  missingForAudit = false,
): string {
  if (notStarted || legacyNotStarted) return "Not started yet";
  const text = String(url ?? "").trim();
  if (!text) {
    return missingForAudit ? "Missing" : "Not provided";
  }
  return text;
}

export function getAuditReportMode(audit: AuditIntakeSource): "starter_guide" | "brand_diagnosis" {
  return qualifiesForFullAuditResearch(audit) ? "brand_diagnosis" : "starter_guide";
}

export function getAuditDeliveryLabel(audit: AuditIntakeSource): string {
  const mode = getAuditReportMode(audit);
  if (mode === "starter_guide") {
    return audit.follow_up_status === "audit_sent"
      ? "Starter guide + Brief"
      : "Starter guide → Brief (no full audit)";
  }
  if (audit.follow_up_status === "audit_sent") return "Full audit sent";
  return "Full audit (pending send)";
}

/** One-word path type: full audit vs starter guide → Brief. */
export function getAuditDeliveryPathShortLabel(audit: AuditIntakeSource): "Audit" | "Guide" {
  return isStarterGuideBriefPath(audit) ? "Guide" : "Audit";
}

/** One-word label for table badges (Delivery column). */
export function getAuditDeliveryShortLabel(audit: AuditIntakeSource): string {
  if (isStarterGuideBriefPath(audit)) return "Guide";
  if (audit.follow_up_status === "audit_sent") return "Sent";
  return "Queued";
}

/** One-word label for table badges (Status column). */
export function followUpShortLabel(status: string | null | undefined): string {
  switch (status) {
    case "new":
      return "New";
    case "reviewed":
      return "Reviewed";
    case "audit_sent":
      return "Sent";
    case "follow_up_needed":
      return "Followup";
    case "booked_strategy_session":
      return "Booked";
    case "converted":
      return "Converted";
    case "not_ready":
      return "Hold";
    default:
      return "Open";
  }
}

export function isStarterGuideBriefPath(audit: AuditIntakeSource): boolean {
  return !qualifiesForFullAuditResearch(audit);
}

export function buildAuditIntakeFieldRows(audit: AuditIntakeSource): AuditIntakeFieldRow[] {
  const metadata = asRecord(audit.metadata);
  const inputs = asRecord(metadata.report_inputs);
  const channels = asRecord(asRecord(metadata.brand_stage_signals).channels_not_started);
  const evidenceChannels = asRecord(asRecord(asRecord(metadata.brand_stage_signals).evidence).channels_not_started);

  const notStarted = (key: string) =>
    Boolean(inputs[`${key}_not_started`]) ||
    Boolean(channels[`${key}_not_started`]) ||
    Boolean(evidenceChannels[`${key}_not_started`]);

  const guidePath = isStarterGuideBriefPath(audit);
  const missingSocialForAudit = guidePath && Boolean(resolveAuditPresence(audit).website);

  const entityType = rawValue(
    inputs.business_entity_type ?? metadata.business_entity_type,
    "",
  );
  const entityLabel = entityType ? (ENTITY_LABELS[entityType] ?? entityType) : "Not provided";

  const intentKey = rawValue(audit.intent ?? inputs.intent, "");
  const intentLabel = intentKey ? (INTENT_LABELS[intentKey] ?? intentKey) : "Not provided";

  return [
    { group: "Contact", label: "Email", value: rawValue(audit.lead_email_lower) },
    { group: "Contact", label: "Name", value: rawValue(audit.contact_name) },
    { group: "Contact", label: "Phone", value: rawValue(audit.phone) },
    { group: "Brand", label: "How is this brand set up right now?", value: entityLabel },
    {
      group: "Brand",
      label: "Business or brand name (registered / DBA / internal)",
      value: rawValue(inputs.legal_or_registered_business_name ?? metadata.legal_or_registered_business_name),
    },
    {
      group: "Brand",
      label: "Public business name",
      value: rawValue(inputs.public_business_name ?? audit.business_name),
    },
    {
      group: "Presence",
      label: "Website",
      value: presenceValue(inputs.website_url ?? audit.website_link, notStarted("website")),
    },
    {
      group: "Presence",
      label: "Instagram",
      value: presenceValue(
        inputs.instagram_url ?? audit.instagram,
        notStarted("instagram"),
        false,
        missingSocialForAudit,
      ),
    },
    {
      group: "Presence",
      label: "Facebook",
      value: presenceValue(
        inputs.facebook_url ?? audit.facebook,
        notStarted("facebook"),
        false,
        missingSocialForAudit,
      ),
    },
    {
      group: "Presence",
      label: "TikTok",
      value: presenceValue(
        inputs.tiktok_url ?? audit.tiktok,
        notStarted("tiktok"),
        false,
        missingSocialForAudit,
      ),
    },
    {
      group: "Presence",
      label: "Other public pages",
      value: presenceValue(
        inputs.other_public_pages ?? audit.other_socials,
        notStarted("other_public_pages"),
        false,
        missingSocialForAudit,
      ),
    },
    {
      group: "Diagnosis",
      label: "What are you currently trying to grow?",
      value: rawValue(inputs.growth_goal ?? audit.growth_goal),
    },
    {
      group: "Diagnosis",
      label: "What's NOT working right now?",
      value: rawValue(inputs.current_blocker ?? audit.current_blocker),
    },
    {
      group: "Diagnosis",
      label: "Who do you believe your target audience is?",
      value: rawValue(inputs.target_audience_belief ?? audit.target_audience_belief),
    },
    { group: "Intent", label: "How ready are you to fix the positioning gap?", value: intentLabel },
  ];
}
