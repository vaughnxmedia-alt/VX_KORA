/** Shared rule: full audit research requires a website and at least one social/public profile. */

const EMPTY_MARKERS = new Set([
  "",
  "n/a",
  "na",
  "none",
  "not started",
  "not started yet",
  "no other public pages submitted.",
  "no other public pages submitted",
  "no other pages",
]);

export function normalizePresenceUrl(value: unknown): string {
  const trimmed = String(value ?? "").trim();
  const lowered = trimmed.toLowerCase();
  if (EMPTY_MARKERS.has(lowered)) return "";
  if (lowered.includes("no other public pages submitted")) return "";
  return trimmed;
}

export type AuditPresenceFields = {
  website_link?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  other_socials?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type ResolvedPresence = {
  website: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  otherPublicPages: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function resolveAuditPresence(audit: AuditPresenceFields): ResolvedPresence {
  const metadata = asRecord(audit.metadata);
  const inputs = asRecord(metadata.report_inputs);
  return {
    website: normalizePresenceUrl(inputs.website_url ?? audit.website_link),
    instagram: normalizePresenceUrl(inputs.instagram_url ?? audit.instagram),
    facebook: normalizePresenceUrl(inputs.facebook_url ?? audit.facebook),
    tiktok: normalizePresenceUrl(inputs.tiktok_url ?? audit.tiktok),
    otherPublicPages: normalizePresenceUrl(inputs.other_public_pages ?? audit.other_socials),
  };
}

export function hasWebsitePresence(presence: ResolvedPresence): boolean {
  return presence.website.length > 0;
}

export function hasAnySocialPresence(presence: ResolvedPresence): boolean {
  return (
    presence.instagram.length > 0 ||
    presence.facebook.length > 0 ||
    presence.tiktok.length > 0 ||
    presence.otherPublicPages.length > 0
  );
}

/** Website + at least one social/public profile URL. */
export function qualifiesForFullAuditResearch(audit: AuditPresenceFields): boolean {
  const presence = resolveAuditPresence(audit);
  return hasWebsitePresence(presence) && hasAnySocialPresence(presence);
}

export function usesStarterGuidePipeline(audit: AuditPresenceFields): boolean {
  return !qualifiesForFullAuditResearch(audit);
}

export type PresenceResearchGap = "website" | "social" | null;

export function presenceResearchGap(audit: AuditPresenceFields): PresenceResearchGap {
  const presence = resolveAuditPresence(audit);
  if (!hasWebsitePresence(presence)) return "website";
  if (!hasAnySocialPresence(presence)) return "social";
  return null;
}

export function presenceResearchGapLabel(gap: PresenceResearchGap): string {
  if (gap === "website") return "Add a live website URL to unlock full audit research.";
  if (gap === "social") return "Add at least one social or public profile URL (Instagram, Facebook, TikTok, or other).";
  return "";
}
