import type { Json } from "@/integrations/supabase/types";
import { normalizeAuditVisualInput, type AuditVisualInput } from "./engine";

type AuditRecord = {
  contact_name?: string | null;
  business_name?: string | null;
  lead_email_lower?: string | null;
  readiness_level?: string | null;
  audit_angle?: string | null;
  current_blocker?: string | null;
  target_audience_belief?: string | null;
  growth_goal?: string | null;
  metadata?: Json;
  score_summary?: Json;
};

function asObject(value: Json | undefined): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function scoreFrom(summary: Record<string, unknown>, key: string, fallback: number): number {
  const value = summary[key];
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.min(100, value));
  return fallback;
}

export function buildAuditVisualInput(record: AuditRecord): AuditVisualInput {
  const summary = asObject(record.score_summary);
  const metadata = asObject(record.metadata);
  const readiness = record.readiness_level === "HOT" || record.readiness_level === "WARM" || record.readiness_level === "COLD"
    ? record.readiness_level
    : "WARM";

  // Fallback heuristics for early submissions before full scoring model rolls in.
  const baseline = readiness === "HOT" ? 58 : readiness === "WARM" ? 50 : 44;

  return normalizeAuditVisualInput({
    client_name: record.business_name || record.contact_name || record.lead_email_lower || "Client",
    positioning_score: scoreFrom(summary, "positioning_score", baseline - 8),
    audience_score: scoreFrom(summary, "audience_score", baseline - 3),
    authority_score: scoreFrom(summary, "authority_score", baseline),
    messaging_score: scoreFrom(summary, "messaging_score", baseline + 2),
    conversion_score: scoreFrom(summary, "conversion_score", baseline - 6),
    messaging_angle: record.audit_angle || "positioning_gap",
    primary_gap: String(summary.primary_gap ?? record.current_blocker ?? "Positioning clarity gap"),
    audience_pain: String(summary.audience_pain ?? record.target_audience_belief ?? "Audience is not clearly aligned"),
    brand_tone: String(summary.brand_tone ?? metadata.brand_tone ?? "premium editorial strategic"),
    industry: String(summary.industry ?? metadata.industry ?? "professional services"),
    readiness_level: readiness,
    lls_memory_context:
      typeof metadata.projection_version === "string"
        ? `projection_version:${metadata.projection_version}`
        : null,
  });
}
