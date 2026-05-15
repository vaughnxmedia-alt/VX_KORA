export type SourcePlatform = "website" | "instagram" | "facebook" | "tiktok" | "linkedin" | "youtube" | "unknown";

export type SourceType =
  | "meta_graph_api"
  | "business_discovery"
  | "connected_account"
  | "website"
  | "public_profile"
  | "screenshot"
  | "public_data_provider"
  | "manual_admin_note";

export type NormalizedSource = {
  field_name: string;
  submitted_value: string;
  platform: SourcePlatform;
  canonical_url: string;
  handle: string | null;
  was_inferred: boolean;
  confidence: number;
  source_type: SourceType;
  source_label: string;
  notes: string[];
};

type AuditSourceInput = {
  website_link?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  other_socials?: string | null;
};

function cleanHandle(value: string): string {
  return value
    .trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split(/[/?#]/)[0]
    .replace(/[^a-z0-9._-]/gi, "");
}

function urlFrom(value: string): URL | null {
  const raw = value.trim();
  if (!raw) return null;
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
}

function inferPlatform(value: string, fallback: SourcePlatform = "unknown"): SourcePlatform {
  const lower = value.toLowerCase();
  if (/instagram\.com|^ig:|^instagram:/.test(lower)) return "instagram";
  if (/facebook\.com|fb\.com|^fb:|^facebook:/.test(lower)) return "facebook";
  if (/tiktok\.com|^tt:|^tiktok:/.test(lower)) return "tiktok";
  if (/linkedin\.com|^linkedin:/.test(lower)) return "linkedin";
  if (/youtube\.com|youtu\.be|^youtube:/.test(lower)) return "youtube";
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(value.trim())) return "website";
  return fallback;
}

function handleFromUrl(url: URL, platform: SourcePlatform): string | null {
  const segments = url.pathname.split("/").map((segment) => segment.trim()).filter(Boolean);
  if (platform === "tiktok") return segments.find((segment) => segment.startsWith("@"))?.replace(/^@/, "") ?? null;
  if (platform === "youtube") {
    const handle = segments.find((segment) => segment.startsWith("@"));
    return handle?.replace(/^@/, "") ?? segments[1] ?? segments[0] ?? null;
  }
  if (platform === "linkedin") {
    return segments.at(-1)?.replace(/^@/, "") ?? null;
  }
  if (platform === "website") return url.hostname.replace(/^www\./i, "");
  return segments[0]?.replace(/^@/, "") ?? null;
}

function canonicalFor(platform: SourcePlatform, handle: string): string | null {
  if (!handle) return null;
  if (platform === "instagram") return `https://www.instagram.com/${handle}/`;
  if (platform === "facebook") return `https://www.facebook.com/${handle}`;
  if (platform === "tiktok") return `https://www.tiktok.com/@${handle}`;
  if (platform === "linkedin") return `https://www.linkedin.com/in/${handle}/`;
  if (platform === "youtube") return `https://www.youtube.com/@${handle}`;
  if (platform === "website") return `https://${handle}/`;
  return null;
}

function sourceTypeFor(platform: SourcePlatform, wasInferred: boolean): SourceType {
  if (platform === "website") return "website";
  return wasInferred ? "public_profile" : "public_profile";
}

function labelFor(platform: SourcePlatform, handle: string | null, canonicalUrl: string): string {
  if (handle && platform !== "website") return `${platform} / @${handle}`;
  if (handle && platform === "website") return `Website / ${handle}`;
  return canonicalUrl;
}

export function normalizeSource(
  submittedValue: unknown,
  platformHint: SourcePlatform,
  fieldName: string,
  sourceType?: SourceType,
): NormalizedSource | null {
  const submitted = String(submittedValue ?? "").trim();
  if (!submitted) return null;

  const platform = platformHint === "unknown" ? inferPlatform(submitted, platformHint) : platformHint;
  const directUrl = urlFrom(submitted);
  const handle = directUrl
    ? handleFromUrl(directUrl, platform)
    : cleanHandle(submitted.replace(/^(ig|instagram|fb|facebook|tt|tiktok|linkedin|youtube):/i, ""));
  const inferredUrl = canonicalFor(platform, handle);
  const canonicalUrl = directUrl ? directUrl.toString() : inferredUrl ?? submitted;
  const wasInferred = !directUrl && Boolean(inferredUrl);
  const confidence = directUrl
    ? 0.98
    : inferredUrl
      ? platform === "facebook" ? 0.72 : 0.88
      : 0.35;
  const notes: string[] = [];

  if (wasInferred) notes.push(`Canonical URL inferred from ${platform} handle.`);
  if (platform === "facebook" && wasInferred) notes.push("Facebook page URLs can vary from submitted vanity names.");
  if (platform === "unknown") notes.push("Platform could not be confidently identified.");

  return {
    field_name: fieldName,
    submitted_value: submitted,
    platform,
    canonical_url: canonicalUrl,
    handle: handle || null,
    was_inferred: wasInferred,
    confidence,
    source_type: sourceType ?? sourceTypeFor(platform, wasInferred),
    source_label: labelFor(platform, handle || null, canonicalUrl),
    notes,
  };
}

export function normalizeAuditSources(audit: AuditSourceInput): NormalizedSource[] {
  const sources = [
    normalizeSource(audit.website_link, "website", "website_link", "website"),
    normalizeSource(audit.instagram, "instagram", "instagram"),
    normalizeSource(audit.facebook, "facebook", "facebook"),
    normalizeSource(audit.tiktok, "tiktok", "tiktok"),
  ].filter((source): source is NormalizedSource => Boolean(source));

  String(audit.other_socials ?? "")
    .split(/[\n,]+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value, index) => {
      const source = normalizeSource(value, inferPlatform(value), `other_socials.${index}`);
      if (source) sources.push(source);
    });

  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = `${source.platform}:${source.canonical_url.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
