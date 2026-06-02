/** Full audit research requires at least two public sources (website and/or social/public profiles). */

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

function splitOtherPublicPages(value: string): string[] {
  return value
    .split(/[\n,]+/)
    .map((item) => normalizePresenceUrl(item))
    .filter(Boolean);
}

export function countResearchPresenceSources(presence: ResolvedPresence): number {
  return [
    presence.website,
    presence.instagram,
    presence.facebook,
    presence.tiktok,
    ...splitOtherPublicPages(presence.otherPublicPages),
  ].filter(Boolean).length;
}

export function qualifiesForFullAuditResearch(audit: AuditPresenceFields): boolean {
  const presence = resolveAuditPresence(audit);
  return countResearchPresenceSources(presence) >= 2;
}

export function usesStarterGuidePipeline(audit: AuditPresenceFields): boolean {
  return !qualifiesForFullAuditResearch(audit);
}

export type PresenceResearchGap = "website" | "social" | null;

export function presenceResearchGap(audit: AuditPresenceFields): PresenceResearchGap {
  const presence = resolveAuditPresence(audit);
  if (countResearchPresenceSources(presence) >= 2) return null;
  if (!hasWebsitePresence(presence)) return "website";
  if (!hasAnySocialPresence(presence)) return "social";
  return null;
}

export function presenceResearchGapLabel(gap: PresenceResearchGap): string {
  if (gap === "website") return "Add at least two public sources (social accounts and/or a website) to unlock full internal research.";
  if (gap === "social") return "Add one more public source (Instagram, Facebook, TikTok, website, or other profile) to unlock full internal research.";
  return "";
}
