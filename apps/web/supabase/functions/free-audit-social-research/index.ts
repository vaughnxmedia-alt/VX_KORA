import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod/mod.ts";
import { analyzeEvidence, buildEvidenceQualityWarnings, type AuditSocialEvidence, type EvidenceCategory } from "../_shared/evidenceAnalyzer.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { normalizeAuditSources, normalizeSource, type NormalizedSource, type SourceType } from "../_shared/sourceNormalizer.ts";
import { buildStrategicResearchProfile, computeEvidenceConfidence, type StrategicResearchProfile } from "../_shared/strategicResearchAgents.ts";
import { decryptToken } from "../_shared/token-crypto.ts";

const bodySchema = z.object({
  auditId: z.string().uuid(),
  action: z.enum(["research", "review", "approve_findings"]).default("research"),
  force: z.boolean().default(false),
  useMockData: z.boolean().default(false),
});

type AuditRecord = {
  id: string;
  lead_key: string;
  customer_id: string | null;
  business_name: string | null;
  website_link: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  other_socials: string | null;
  growth_goal: string | null;
  current_blocker: string | null;
  target_audience_belief: string | null;
  intent: string | null;
  score_summary: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
};

type EvidenceInsert = {
  audit_id: string;
  client_id: string | null;
  platform: string;
  source_type: SourceType;
  source_url: string;
  source_label: string | null;
  raw_observation: string | null;
  normalized_observation: string;
  evidence_category: EvidenceCategory;
  confidence_score: number;
  agent_name?: string;
  observed_signal?: string;
  strategic_interpretation?: string;
  source_confidence?: number;
  inference_confidence?: number;
  final_confidence?: number;
  evidence_strength?: "low" | "medium" | "high";
  suggested_audit_category?: string;
  metadata: Record<string, unknown>;
};

type KnowledgeInsert = {
  audit_id: string;
  client_id: string | null;
  knowledge_type:
    | "industry_profile"
    | "audience_segment"
    | "offer_path"
    | "conversion_path"
    | "proof_requirement"
    | "strategic_summary";
  knowledge_key: string;
  label: string;
  summary: string;
  confidence: number | null;
  source_refs: Array<Record<string, unknown>>;
  metadata: Record<string, unknown>;
};

type MetaAccount = {
  id: string;
  organization_id: string;
  account_type: "facebook_page" | "instagram_professional";
  external_account_id: string;
  account_name: string;
  username: string | null;
};

function jsonResponse(body: Record<string, unknown>, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function cleanObservation(value: unknown, limit = 1600): string {
  return String(value ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

const IRRELEVANT_RESEARCH_PATTERN =
  /email formats?|email view details|view details flag of|founder email|chief executive officer email|contact database|lead database|people finder|find emails?|work email|rocketreach|signalhire|lusha|apollo\.io|hunter\.io|zoominfo|aeroleads|skrapp|clearbit|adapt\.io|https-?www-?facebook-?com-?profile-?php-?id|httpswwwfacebookcomprofilephpid|mibextid|tiktokstudio/i;

const IRRELEVANT_URL_PATTERN =
  /prospeo\.io|github\.com\/[^/]+\/https-|vk\.com\/video|facebook\.com\/events\/d41d8cd9|nextdoor\.com\/pages\/.*httpswwwfacebookcomprofilephpid/i;

function hostParts(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.hostname
      .replace(/^www\./i, "")
      .split(".")
      .filter((part) => part.length > 2 && !["com", "net", "org", "co"].includes(part));
  } catch {
    return [];
  }
}

function sourceHandle(value: string | null | undefined): string[] {
  return String(value ?? "")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#@\s,]+/)
    .map((part) => part.replace(/[^a-z0-9._-]/g, ""))
    .filter((part) =>
      part.length > 2 &&
      !/^\d+$/.test(part) &&
      !["instagram", "facebook", "tiktok", "linkedin", "youtube", "profile", "php", "id", "events", "reel", "video", "mibextid", "zbwkwl"].includes(part)
    );
}

const KEYWORD_STOP_WORDS = new Set([
  "and",
  "the",
  "for",
  "with",
  "that",
  "this",
  "from",
  "your",
  "you",
  "are",
  "not",
  "need",
  "needs",
  "brand",
  "public",
  "signal",
  "signals",
  "intake",
  "based",
  "social",
  "website",
  "content",
  "profile",
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
]);

function cleanKeyword(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokenizeKeywords(value: unknown): string[] {
  return cleanKeyword(String(value ?? ""))
    .split(/\s+/)
    .filter((term) => term.length > 3 && !KEYWORD_STOP_WORDS.has(term) && !/^\d+$/.test(term));
}

function relevanceTerms(audit: AuditRecord, seedTerms: string[] = []): string[] {
  const emailLocalPart = String(audit.lead_key ?? "").split("@")[0] || "";
  const terms = [
    ...String(audit.business_name ?? "").toLowerCase().split(/[^a-z0-9]+/),
    ...String(emailLocalPart).toLowerCase().split(/[^a-z0-9]+/),
    ...hostParts(audit.website_link),
    ...sourceHandle(audit.instagram),
    ...sourceHandle(audit.facebook),
    ...sourceHandle(audit.tiktok),
    ...sourceHandle(audit.other_socials),
    ...seedTerms,
  ];
  return [...new Set(terms.filter((term) =>
    term.length > 2 &&
    !/^\d+$/.test(term) &&
    !["gmail", "email", "mail", "http", "https", "www", "com", "net", "org", "profile", "facebook", "instagram", "tiktok"].includes(term)
  ))];
}

function tavilyResultIsRelevant(audit: AuditRecord, result: { title?: string; url?: string; content?: string }, seedTerms: string[] = []): boolean {
  const haystack = [result.title, result.url, result.content].join(" ").toLowerCase();
  if (!haystack.trim()) return false;
  if (IRRELEVANT_RESEARCH_PATTERN.test(haystack)) return false;
  if (IRRELEVANT_URL_PATTERN.test(String(result.url ?? ""))) return false;
  const terms = relevanceTerms(audit, seedTerms);
  if (!terms.length) return false;
  const matchingTerms = terms.filter((term) => haystack.includes(term));
  if (matchingTerms.length < 1) return false;

  const socialOrDirectoryResult = /(facebook|instagram|tiktok|youtube|x\.com|twitter|linkedin|nextdoor|github|vk)\.com/i.test(String(result.url ?? ""));
  if (!socialOrDirectoryResult) return true;

  const titleAndContent = [result.title, result.content].join(" ").toLowerCase();
  return matchingTerms.some((term) => titleAndContent.includes(term));
}

function deriveKeywordInvestigationTerms(audit: AuditRecord, ownedEvidence: EvidenceInsert[]): string[] {
  const auditSeeds = [
    audit.business_name,
    audit.website_link,
    audit.growth_goal,
    audit.current_blocker,
    audit.target_audience_belief,
  ].flatMap(tokenizeKeywords);
  const evidenceSeeds = ownedEvidence
    .filter((item) => item.source_type !== "business_discovery")
    .flatMap((item) => tokenizeKeywords(`${item.source_label ?? ""} ${item.normalized_observation} ${item.raw_observation ?? ""}`));
  const counts = [...auditSeeds, ...evidenceSeeds].reduce<Record<string, number>>((acc, term) => {
    acc[term] = (acc[term] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([term]) => term)
    .filter((term) => !IRRELEVANT_RESEARCH_PATTERN.test(term))
    .slice(0, 12);
}

function keywordInvestigatorEvidence(audit: AuditRecord, terms: string[]): EvidenceInsert | null {
  if (!terms.length) return null;
  const source = normalizeSource(audit.business_name || audit.lead_key, "unknown", "keyword_investigator", "manual_admin_note") ?? {
    field_name: "keyword_investigator",
    submitted_value: audit.business_name || audit.lead_key,
    platform: "unknown" as const,
    canonical_url: `keyword-investigator:${audit.id}`,
    handle: null,
    was_inferred: false,
    confidence: 0.82,
    source_type: "manual_admin_note" as const,
    source_label: "Keyword Investigator",
    notes: [],
  };
  return {
    ...evidenceFromSource(
      audit,
      { ...source, canonical_url: `keyword-investigator:${audit.id}`, source_label: "Keyword Investigator" },
      "manual_admin_note",
      terms.join(", "),
      `Keyword Investigator selected these connected research terms from owned sources: ${terms.join(", ")}.`,
      0.82,
      {
        keyword_terms: terms,
        based_on_owned_sources: true,
        agent_name: "Keyword Investigator Agent",
        observed_signal: `Owned source keyword cluster: ${terms.join(", ")}`,
        strategic_interpretation: "Keyword clusters improve external research precision and reduce irrelevant discovery noise.",
        suggested_audit_category: "messaging",
      },
    ),
    evidence_category: "messaging",
  };
}

function categoryFromText(value: string): EvidenceCategory {
  const lower = value.toLowerCase();
  if (/book|call|contact|buy|shop|schedule|consult|cta|link in bio/.test(lower)) return "conversion";
  if (/testimonial|client|featured|press|award|certified|case study|review/.test(lower)) return "trust_signals";
  if (/offer|service|package|program|session|pricing/.test(lower)) return "offer_clarity";
  if (/audience|client|customer|founder|owner|brand|women|men|teams/.test(lower)) return "audience";
  if (/visual|logo|brand|aesthetic|photo|feed/.test(lower)) return "visual_identity";
  if (/comment|reply|engagement|likes|views|shares/.test(lower)) return "engagement_quality";
  if (/post|caption|content|series|topic/.test(lower)) return "content_consistency";
  if (/position|promise|different|unique|known for/.test(lower)) return "positioning";
  return "messaging";
}

function evidenceFromSource(
  audit: AuditRecord,
  source: NormalizedSource,
  sourceType: SourceType,
  rawObservation: string | null,
  normalizedObservation: string,
  confidenceScore: number,
  metadata: Record<string, unknown> = {},
): EvidenceInsert {
  const sourceConfidence = sourceType === "website"
    ? 0.9
    : sourceType === "connected_account" || sourceType === "meta_graph_api"
      ? 0.93
      : sourceType === "public_profile" || sourceType === "public_data_provider"
        ? 0.78
        : sourceType === "business_discovery"
          ? 0.66
          : sourceType === "manual_admin_note"
            ? 0.72
            : 0.7;
  const inferenceConfidence = source.was_inferred ? 0.64 : 0.84;
  const finalConfidence = Math.max(0, Math.min(1, Number(((sourceConfidence * 0.45) + (inferenceConfidence * 0.2) + (confidenceScore * 0.35)).toFixed(2))));
  const evidenceStrength = finalConfidence >= 0.8 ? "high" : finalConfidence >= 0.62 ? "medium" : "low";
  const category = categoryFromText(normalizedObservation);
  return {
    audit_id: audit.id,
    client_id: audit.customer_id,
    platform: source.platform,
    source_type: sourceType,
    source_url: source.canonical_url,
    source_label: source.source_label,
    raw_observation: rawObservation,
    normalized_observation: normalizedObservation,
    evidence_category: category,
    confidence_score: Math.max(0, Math.min(1, confidenceScore)),
    agent_name: String(metadata.agent_name ?? "Research Agent"),
    observed_signal: String(metadata.observed_signal ?? normalizedObservation),
    strategic_interpretation: String(
      metadata.strategic_interpretation ??
        `This signal contributes to ${String(category).replace(/_/g, " ")} diagnosis and conversion direction.`,
    ),
    source_confidence: sourceConfidence,
    inference_confidence: inferenceConfidence,
    final_confidence: finalConfidence,
    evidence_strength: evidenceStrength,
    suggested_audit_category: String(metadata.suggested_audit_category ?? category),
    metadata: {
      ...metadata,
      normalized_source: source,
      source_confidence: sourceConfidence,
      inference_confidence: inferenceConfidence,
      final_confidence: finalConfidence,
      evidence_strength: evidenceStrength,
      private_data_collected: false,
    },
  };
}

function intakeEvidence(audit: AuditRecord): EvidenceInsert[] {
  const source = normalizeSource(audit.lead_key, "unknown", "intake", "manual_admin_note") ?? {
    field_name: "intake",
    submitted_value: audit.lead_key,
    platform: "unknown" as const,
    canonical_url: `intake:${audit.id}`,
    handle: null,
    was_inferred: false,
    confidence: 0.5,
    source_type: "manual_admin_note" as const,
    source_label: "Free Audit Intake",
    notes: [],
  };
  const observations = [
    {
      category: "positioning" as EvidenceCategory,
      raw: audit.growth_goal,
      normalized: `Intake-based signal: the stated growth goal is "${cleanObservation(audit.growth_goal, 500) || "not specific enough yet"}."`,
    },
    {
      category: "messaging" as EvidenceCategory,
      raw: audit.current_blocker,
      normalized: `Intake-based signal: the current blocker is "${cleanObservation(audit.current_blocker, 500) || "not clearly stated"}."`,
    },
    {
      category: "audience" as EvidenceCategory,
      raw: audit.target_audience_belief,
      normalized: `Intake-based signal: the described audience belief is "${cleanObservation(audit.target_audience_belief, 500) || "too broad to verify"}."`,
    },
    {
      category: "conversion" as EvidenceCategory,
      raw: audit.intent,
      normalized: `Intake-based signal: the lead intent is "${cleanObservation(audit.intent, 120) || "not provided"}," so the next action needs clear framing.`,
    },
  ];
  return observations.map((item) => ({
    ...evidenceFromSource(audit, source, "manual_admin_note", item.raw ?? null, item.normalized, 0.48, {
      based_only_on_intake: true,
      agent_name: "Intake Evidence Agent",
      observed_signal: item.normalized,
      strategic_interpretation: "Intake inputs are treated as directional context until corroborated by public evidence.",
      suggested_audit_category: item.category,
    }),
    evidence_category: item.category,
  }));
}

async function fetchWebsiteEvidence(audit: AuditRecord, source: NormalizedSource): Promise<EvidenceInsert[]> {
  if (source.platform !== "website" || !source.canonical_url.startsWith("http")) return [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const response = await fetch(source.canonical_url, {
      signal: controller.signal,
      headers: { "User-Agent": "JahKnowsPR-PublicSourceIntelligence/1.0" },
    });
    clearTimeout(timeout);
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.includes("text/html")) return [];
    const raw = await response.text();
    const cleaned = cleanObservation(raw, 2500);
    if (!cleaned) return [];
    return [
      evidenceFromSource(
        audit,
        source,
        "website",
        cleaned,
        `Website signal: the public site contains visible messaging around "${cleaned.slice(0, 220)}".`,
        0.76,
        {
          content_type: contentType,
          status: response.status,
          agent_name: "Website Evidence Agent",
          observed_signal: cleaned.slice(0, 300),
          strategic_interpretation: "Website messaging informs offer clarity, positioning hierarchy, and conversion readiness.",
          suggested_audit_category: "positioning",
        },
      ),
    ];
  } catch {
    return [];
  }
}

async function captureEvidenceScreenshot(audit: AuditRecord, source: NormalizedSource, supabase: ReturnType<typeof createClient>): Promise<EvidenceInsert[]> {
  const token = Deno.env.get("BROWSERLESS_TOKEN")?.trim();
  if (!token || !source.canonical_url.startsWith("http")) return [];
  try {
    const response = await fetch(`https://chrome.browserless.io/screenshot?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: source.canonical_url,
        options: { fullPage: true, type: "png" },
        gotoOptions: { waitUntil: "networkidle2", timeout: 20000 },
      }),
    });
    if (!response.ok) return [];
    const bytes = new Uint8Array(await response.arrayBuffer());
    const path = `screenshots/${audit.id}/${source.platform}-${Date.now()}.png`;
    const { error } = await supabase.storage.from("free-audit-evidence").upload(path, bytes, {
      contentType: "image/png",
      upsert: true,
      cacheControl: "3600",
    });
    if (error) return [];
    return [
      {
        ...evidenceFromSource(
          audit,
          source,
          "screenshot",
          "Visual evidence snapshot captured from public source.",
          `Evidence Capture signal: a visual snapshot was saved for ${source.source_label} to support visual identity and trust review.`,
          0.78,
          {
            storage_bucket: "free-audit-evidence",
            storage_path: path,
            agent_name: "Proof Inventory Agent",
            observed_signal: `Screenshot captured from ${source.canonical_url}`,
            strategic_interpretation: "Visual snapshots support authority and proof placement recommendations.",
            suggested_audit_category: "authority",
          },
        ),
        evidence_category: "visual_identity",
      },
    ];
  } catch {
    return [];
  }
}

function actorIdFor(platform: string): string | null {
  if (platform === "instagram") return Deno.env.get("APIFY_INSTAGRAM_ACTOR_ID")?.trim() || null;
  if (platform === "tiktok") return Deno.env.get("APIFY_TIKTOK_ACTOR_ID")?.trim() || null;
  if (platform === "facebook") return Deno.env.get("APIFY_FACEBOOK_ACTOR_ID")?.trim() || null;
  return null;
}

async function fetchProviderEvidence(audit: AuditRecord, source: NormalizedSource): Promise<EvidenceInsert[]> {
  const token = Deno.env.get("APIFY_TOKEN")?.trim();
  const actorId = actorIdFor(source.platform);
  if (!token || !actorId) return [];
  try {
    const response = await fetch(`https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        directUrls: [source.canonical_url],
        startUrls: [{ url: source.canonical_url }],
        resultsLimit: 12,
        commentsLimit: 25,
        addParentData: true,
      }),
    });
    if (!response.ok) return [];
    const items = await response.json() as Array<Record<string, unknown>>;
    if (!Array.isArray(items)) return [];
    return items.slice(0, 12).flatMap((item) => {
      const caption = cleanObservation(item.caption ?? item.text ?? item.description ?? item.title, 1200);
      const engagement = {
        likes: item.likesCount ?? item.likes ?? null,
        comments: item.commentsCount ?? item.comments ?? null,
        views: item.videoViewCount ?? item.playCount ?? item.views ?? null,
      };
      const rows = caption
        ? [evidenceFromSource(
          audit,
          { ...source, canonical_url: String(item.url ?? item.postUrl ?? item.link ?? source.canonical_url) },
          "public_data_provider",
          caption,
          `Social Signal Research found public content that emphasizes: ${caption.slice(0, 220)}.`,
          0.82,
          {
            provider: "apify",
            engagement,
            agent_name: "Public Data Agent",
            observed_signal: caption.slice(0, 280),
            strategic_interpretation: "Public content patterns indicate message angles and audience response patterns.",
            suggested_audit_category: "messaging",
          },
        )]
        : [];
      const comments = Array.isArray(item.latestComments) ? item.latestComments : Array.isArray(item.comments) ? item.comments : [];
      comments.slice(0, 8).forEach((comment) => {
        const text = cleanObservation(asObject(comment).text ?? asObject(comment).comment, 600);
        if (!text) return;
        rows.push({
          ...evidenceFromSource(
            audit,
            source,
            "public_data_provider",
            text,
            `Engagement quality signal: a public audience response says "${text.slice(0, 180)}".`,
            0.68,
            {
              provider: "apify",
              parent_url: item.url ?? item.postUrl ?? null,
              agent_name: "Audience Agent",
              observed_signal: text.slice(0, 280),
              strategic_interpretation: "Audience comments reveal objections, emotional triggers, and perceived relevance.",
              suggested_audit_category: "audience",
            },
          ),
          evidence_category: "engagement_quality",
        });
      });
      return rows;
    });
  } catch {
    return [];
  }
}

async function fetchOnlineResearchEvidence(audit: AuditRecord, keywordTerms: string[]): Promise<EvidenceInsert[]> {
  const apiKey = Deno.env.get("TAVILY_API_KEY")?.trim();
  const business = audit.business_name || audit.lead_key;
  if (!apiKey || !business) return [];
  const queryParts = [
    business,
    ...hostParts(audit.website_link),
    ...keywordTerms.slice(0, 8),
    "brand services offer reviews trust signals audience positioning",
  ].filter(Boolean);

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: queryParts.join(" "),
        search_depth: "advanced",
        max_results: 10,
        include_answer: true,
      }),
    });
    if (!response.ok) return [];
    const data = await response.json() as {
      answer?: string;
      results?: Array<{ title?: string; url?: string; content?: string; score?: number }>;
    };
    return (data.results ?? [])
      .filter((result) => result.url && tavilyResultIsRelevant(audit, result, keywordTerms))
      .slice(0, 10)
      .map((result, index) => {
        const source = normalizeSource(result.url, "unknown", `online_research.${index}`, "business_discovery") ?? {
          field_name: `online_research.${index}`,
          submitted_value: result.url ?? "",
          platform: "unknown" as const,
          canonical_url: result.url ?? "",
          handle: null,
          was_inferred: false,
          confidence: 0.7,
          source_type: "business_discovery" as const,
          source_label: result.title || result.url || "Online research result",
          notes: [],
        };
        const content = cleanObservation(result.content || data.answer || result.title, 1000);
        return evidenceFromSource(
          audit,
          { ...source, source_label: result.title || source.source_label },
          "business_discovery",
          content,
          `Online research signal: ${result.title || source.source_label} shows public context around "${content.slice(0, 220)}".`,
          typeof result.score === "number" ? Math.max(0.55, Math.min(0.86, result.score)) : 0.72,
          {
            provider: "tavily",
            result_rank: index + 1,
            search_query: queryParts.join(" "),
            agent_name: "Business Discovery Agent",
            observed_signal: `${result.title || source.source_label}: ${content.slice(0, 220)}`,
            strategic_interpretation: "Third-party context validates market positioning and authority narratives.",
            suggested_audit_category: "authority",
          },
        );
      });
  } catch {
    return [];
  }
}

async function resolveOrganizationId(supabase: ReturnType<typeof createClient>, audit: AuditRecord): Promise<string | null> {
  const metadata = asObject(audit.metadata);
  if (typeof metadata.organization_id === "string") return metadata.organization_id;
  if (!audit.customer_id) return null;
  const { data: customer } = await supabase.from("customers").select("user_id").eq("id", audit.customer_id).maybeSingle();
  const userId = typeof customer?.user_id === "string" ? customer.user_id : null;
  if (!userId) return null;
  const { data: membership } = await supabase.from("organization_users").select("organization_id").eq("user_id", userId).limit(1).maybeSingle();
  return typeof membership?.organization_id === "string" ? membership.organization_id : null;
}

function matchesMetaAccount(source: NormalizedSource, account: MetaAccount): boolean {
  if (source.platform === "instagram" && account.account_type !== "instagram_professional") return false;
  if (source.platform === "facebook" && account.account_type !== "facebook_page") return false;
  const handle = String(source.handle ?? "").toLowerCase();
  const username = String(account.username ?? "").toLowerCase();
  const name = account.account_name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return !handle || handle === username || name.includes(handle.replace(/[^a-z0-9]/g, ""));
}

async function fetchMetaEvidence(audit: AuditRecord, sources: NormalizedSource[], supabase: ReturnType<typeof createClient>): Promise<EvidenceInsert[]> {
  const tokenSecret = Deno.env.get("INTEGRATION_TOKEN_ENCRYPTION_KEY")?.trim();
  if (!tokenSecret) return [];
  const organizationId = await resolveOrganizationId(supabase, audit);
  if (!organizationId) return [];
  const { data: accounts } = await supabase
    .from("social_accounts")
    .select("id,organization_id,account_type,external_account_id,account_name,username")
    .eq("organization_id", organizationId)
    .eq("provider", "meta")
    .eq("status", "connected")
    .in("account_type", ["facebook_page", "instagram_professional"]);

  const rows: EvidenceInsert[] = [];
  for (const account of (accounts ?? []) as MetaAccount[]) {
    const source = sources.find((candidate) => matchesMetaAccount(candidate, account));
    if (!source) continue;
    const { data: tokenRow } = await supabase.from("social_account_tokens").select("encrypted_access_token").eq("social_account_id", account.id).single();
    const encryptedToken = typeof tokenRow?.encrypted_access_token === "string" ? tokenRow.encrypted_access_token : null;
    if (!encryptedToken) continue;
    const token = await decryptToken(encryptedToken, tokenSecret);
    const fields = account.account_type === "instagram_professional"
      ? "username,name,biography,followers_count,media_count,media.limit(12){caption,media_type,permalink,timestamp,like_count,comments_count,comments.limit(25){text,timestamp,username,like_count}}"
      : "name,fan_count,followers_count,posts.limit(12){message,created_time,permalink_url,comments.limit(25){message,created_time,from,like_count},likes.summary(true),comments.summary(true)}";
    const response = await fetch(`https://graph.facebook.com/v20.0/${account.external_account_id}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(token)}`);
    const data = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) continue;
    rows.push(evidenceFromSource(
      audit,
      source,
      "connected_account",
      cleanObservation(data.biography ?? data.name ?? account.account_name, 800),
      `Connected account signal: ${account.account_name} has profile and audience data available through authorized Meta access.`,
      0.95,
      {
        provider: "meta_graph",
        followers: data.followers_count ?? data.fan_count ?? null,
        media_count: data.media_count ?? null,
        agent_name: "Meta Graph Agent",
        observed_signal: `${account.account_name} profile metrics and bio data available from connected account.`,
        strategic_interpretation: "Connected account metrics provide high-confidence audience and authority context.",
        suggested_audit_category: "audience",
      },
    ));
    const media = Array.isArray(asObject(data.media).data)
      ? asObject(data.media).data as Array<Record<string, unknown>>
      : Array.isArray(asObject(data.posts).data)
        ? asObject(data.posts).data as Array<Record<string, unknown>>
        : [];
    media.slice(0, 12).forEach((item) => {
      const copy = cleanObservation(item.caption ?? item.message, 1200);
      if (!copy) return;
      rows.push(evidenceFromSource(
        audit,
        { ...source, canonical_url: String(item.permalink ?? item.permalink_url ?? source.canonical_url) },
        "meta_graph_api",
        copy,
        `Connected Meta signal: recent public content communicates "${copy.slice(0, 220)}".`,
        0.9,
        {
          provider: "meta_graph",
          likes: item.like_count ?? null,
          comments: item.comments_count ?? null,
          agent_name: "Meta Graph Agent",
          observed_signal: copy.slice(0, 280),
          strategic_interpretation: "Connected content evidence supports message quality and conversion intent scoring.",
          suggested_audit_category: "messaging",
        },
      ));
    });
  }
  return rows;
}

function mockEvidence(audit: AuditRecord, sources: NormalizedSource[]): EvidenceInsert[] {
  return sources.flatMap((source) => [
    evidenceFromSource(
      audit,
      source,
      source.platform === "instagram" || source.platform === "facebook" ? "meta_graph_api" : source.source_type,
      "Mock public profile observation for provider testing.",
      `Mock Public Source Intelligence signal: ${source.source_label} has visible brand messaging, but the offer and next action need stronger hierarchy.`,
      0.78,
      {
        mock: true,
        agent_name: "Mock Research Agent",
        observed_signal: `Mock profile observation for ${source.source_label}`,
        strategic_interpretation: "Mock evidence confirms pipeline behavior when providers are unavailable.",
      },
    ),
    {
      ...evidenceFromSource(
        audit,
        source,
        source.platform === "website" ? "website" : "public_data_provider",
        "Mock recent content observation for provider testing.",
        `Mock Social Signal Research signal: recent public content is active, but proof points and conversion prompts are not consistently connected.`,
        0.74,
        {
          mock: true,
          agent_name: "Mock Research Agent",
          observed_signal: `Mock content observation for ${source.source_label}`,
          strategic_interpretation: "Mock social evidence highlights proof and CTA continuity gaps.",
        },
      ),
      evidence_category: "content_consistency",
    },
  ]);
}

async function discoverPublicCompetitors(audit: AuditRecord, keywordTerms: string[]): Promise<NormalizedSource[]> {
  const apiKey = Deno.env.get("TAVILY_API_KEY")?.trim();
  const business = audit.business_name || audit.lead_key;
  if (!apiKey || !business) return [];
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: `${business} ${keywordTerms.slice(0, 6).join(" ")} similar public brands Instagram TikTok Facebook`,
        search_depth: "advanced",
        max_results: 8,
      }),
    });
    if (!response.ok) return [];
    const data = await response.json() as { results?: Array<{ url?: string }> };
    return (data.results ?? [])
      .map((result, index) => result.url ? normalizeSource(result.url, "unknown", `business_discovery.${index}`, "business_discovery") : null)
      .filter((source): source is NormalizedSource => Boolean(source))
      .slice(0, 3);
  } catch {
    return [];
  }
}

function strategicProfileEvidenceRows(audit: AuditRecord, profile: StrategicResearchProfile): EvidenceInsert[] {
  const sections: Array<{
    key: string;
    agent: string;
    category: EvidenceCategory;
    summary: string;
    details: Record<string, unknown>;
  }> = [
    {
      key: "brand_architecture",
      agent: "Brand Architecture Agent",
      category: "positioning",
      summary: profile.brand_architecture.brand_architecture_notes,
      details: profile.brand_architecture as unknown as Record<string, unknown>,
    },
    {
      key: "industry_profile",
      agent: "Industry Classifier Agent",
      category: "offer_clarity",
      summary: `${profile.industry_profile.industry_label}: ${profile.industry_profile.reasoning}`,
      details: profile.industry_profile as unknown as Record<string, unknown>,
    },
    {
      key: "business_model",
      agent: "Business Model Agent",
      category: "offer_clarity",
      summary: profile.business_model.business_model_summary,
      details: profile.business_model as unknown as Record<string, unknown>,
    },
    {
      key: "offer_ladder",
      agent: "Offer Ladder Agent",
      category: "conversion",
      summary: `Offer ladder: ${profile.offer_ladder.recommended_offer_ladder.join(" -> ")}`,
      details: profile.offer_ladder as unknown as Record<string, unknown>,
    },
    {
      key: "audience",
      agent: "Audience Agent",
      category: "audience",
      summary: profile.audience.audience_priority_recommendation,
      details: profile.audience as unknown as Record<string, unknown>,
    },
    {
      key: "cultural_context",
      agent: "Cultural Context Agent",
      category: "messaging",
      summary: profile.cultural_context.cultural_context_summary,
      details: profile.cultural_context as unknown as Record<string, unknown>,
    },
    {
      key: "proof_inventory",
      agent: "Proof Inventory Agent",
      category: "authority",
      summary: profile.proof_inventory.strongest_proof_points[0] || "Proof inventory prepared.",
      details: profile.proof_inventory as unknown as Record<string, unknown>,
    },
    {
      key: "conversion_path",
      agent: "Conversion Path Agent",
      category: "conversion",
      summary: profile.conversion_path.conversion_path_summary,
      details: profile.conversion_path as unknown as Record<string, unknown>,
    },
    {
      key: "content_to_revenue",
      agent: "Content-to-Revenue Agent",
      category: "content_consistency",
      summary: profile.content_to_revenue.recommended_content_sequence.join(" -> "),
      details: profile.content_to_revenue as unknown as Record<string, unknown>,
    },
  ];

  return sections.map((section) => {
    const source = normalizeSource(
      `strategic-agent:${section.key}:${audit.id}`,
      "unknown",
      `strategic.${section.key}`,
      "manual_admin_note",
    ) ?? {
      field_name: `strategic.${section.key}`,
      submitted_value: section.summary,
      platform: "unknown" as const,
      canonical_url: `strategic-agent:${section.key}:${audit.id}`,
      handle: null,
      was_inferred: false,
      confidence: 0.86,
      source_type: "manual_admin_note" as const,
      source_label: section.agent,
      notes: [],
    };

    return {
      ...evidenceFromSource(
        audit,
        { ...source, source_label: section.agent, canonical_url: `strategic-agent:${section.key}:${audit.id}` },
        "manual_admin_note",
        JSON.stringify(section.details).slice(0, 2500),
        section.summary,
        0.86,
        {
          agent_name: section.agent,
          observed_signal: section.summary,
          strategic_interpretation: `Structured ${section.key.replace(/_/g, " ")} output generated from combined public and intake evidence.`,
          suggested_audit_category: section.category,
          strategic_section: section.key,
          structured_output: section.details,
        },
      ),
      evidence_category: section.category,
    };
  });
}

function keyFrom(value: string): string {
  return cleanObservation(value, 120)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "unknown";
}

function sourceRefsFromEvidence(evidence: AuditSocialEvidence[]): Array<Record<string, unknown>> {
  return evidence.slice(0, 8).map((item) => ({
    evidence_id: item.id,
    source_type: item.source_type,
    source_label: item.source_label,
    confidence_score: item.confidence_score,
  }));
}

function buildAgentKnowledgeRows(
  audit: AuditRecord,
  profile: StrategicResearchProfile,
  evidence: AuditSocialEvidence[],
): KnowledgeInsert[] {
  const refs = sourceRefsFromEvidence(evidence);
  const industry = profile.industry_profile;
  const baseMetadata = {
    audit_id: audit.id,
    lead_key: audit.lead_key,
    generated_by: "free-audit-social-research",
  };

  return [
    {
      audit_id: audit.id,
      client_id: audit.customer_id,
      knowledge_type: "industry_profile",
      knowledge_key: industry.industry_key,
      label: industry.industry_label,
      summary: industry.reasoning,
      confidence: industry.confidence,
      source_refs: refs,
      metadata: { ...baseMetadata, industry_profile: industry },
    },
    ...profile.audience.audience_segments.slice(0, 6).map((segment) => ({
      audit_id: audit.id,
      client_id: audit.customer_id,
      knowledge_type: "audience_segment" as const,
      knowledge_key: keyFrom(segment.segment_name),
      label: segment.segment_name,
      summary: `${segment.wants} Proof needed: ${segment.proof_needed}`,
      confidence: segment.conversion_likelihood === "high" ? 0.78 : segment.conversion_likelihood === "medium" ? 0.62 : 0.48,
      source_refs: refs,
      metadata: { ...baseMetadata, segment },
    })),
    ...profile.offer_ladder.recommended_offer_ladder.slice(0, 5).map((offer, index) => ({
      audit_id: audit.id,
      client_id: audit.customer_id,
      knowledge_type: "offer_path" as const,
      knowledge_key: keyFrom(offer),
      label: offer,
      summary: `Offer tier ${index + 1}: ${offer}. Suggested CTA: ${profile.offer_ladder.offer_ctas[index] ?? profile.conversion_path.recommended_primary_cta}.`,
      confidence: 0.64,
      source_refs: refs,
      metadata: { ...baseMetadata, offer_index: index, offer_ladder: profile.offer_ladder },
    })),
    {
      audit_id: audit.id,
      client_id: audit.customer_id,
      knowledge_type: "conversion_path",
      knowledge_key: keyFrom(profile.conversion_path.recommended_primary_cta),
      label: profile.conversion_path.recommended_primary_cta,
      summary: profile.conversion_path.conversion_path_summary,
      confidence: profile.conversion_path.cta_matches_business_model ? 0.78 : 0.58,
      source_refs: refs,
      metadata: { ...baseMetadata, conversion_path: profile.conversion_path },
    },
    ...profile.proof_inventory.missing_proof_points.slice(0, 5).map((proof) => ({
      audit_id: audit.id,
      client_id: audit.customer_id,
      knowledge_type: "proof_requirement" as const,
      knowledge_key: keyFrom(proof),
      label: proof,
      summary: `Proof needed to support trust and conversion for ${profile.industry_profile.industry_label.toLowerCase()}.`,
      confidence: 0.56,
      source_refs: refs,
      metadata: { ...baseMetadata, proof_inventory: profile.proof_inventory },
    })),
    {
      audit_id: audit.id,
      client_id: audit.customer_id,
      knowledge_type: "strategic_summary",
      knowledge_key: "strategist_summary",
      label: "Strategist summary",
      summary: profile.strategist_summary.strategist_summary,
      confidence: profile.industry_profile.confidence,
      source_refs: refs,
      metadata: { ...baseMetadata, strategist_summary: profile.strategist_summary },
    },
  ];
}

function fallbackStrategicProfile(audit: AuditRecord): StrategicResearchProfile {
  const businessName = cleanObservation(audit.business_name || audit.lead_key, 180) || "This brand";
  return {
    brand_architecture: {
      official_business_name: businessName,
      public_brand: businessName,
      parent_brand: null,
      platform_brand: null,
      sub_brands: [],
      interchangeable_name_risk: false,
      naming_consistency_score: 0.52,
      brand_architecture_notes: "Brand architecture agent fallback: naming hierarchy needs manual review.",
      recommended_name_usage: "Use one public brand name consistently until parent/sub-brand roles are confirmed.",
    },
    industry_profile: {
      industry_key: "general_business",
      industry_label: "General business",
      confidence: 0.42,
      reasoning: "Fallback profile used because the strategy agents could not complete; rely on intake and approved evidence.",
      primary_revenue_model: "Client or customer actions",
      default_audiences: ["Primary buyers", "High-intent leads", "Repeat customers"],
      default_ctas: ["Request details", "Book a consultation", "Request a proposal"],
      offer_examples: ["Entry offer", "Core offer", "Premium offer", "Long-term support path"],
      proof_examples: ["Customer proof", "Testimonials", "Work samples", "Clear delivery details"],
    },
    business_model: {
      primary_revenue_model: "Client services",
      secondary_revenue_models: [],
      revenue_opportunities: ["Clarify the highest-value offer and direct CTA on primary pages."],
      unclear_revenue_gaps: ["Business model agent fallback: revenue streams require manual validation."],
      business_model_summary: `${businessName} has partial data; business model details are inferred from intake signals only.`,
      business_model_risk: "medium",
      recommended_revenue_focus: "Define one primary revenue stream and one supporting offer before campaign expansion.",
    },
    offer_ladder: {
      entry_offer: "Entry-level offer pending validation",
      core_offer: "Core offer pending validation",
      premium_offer: "Premium offer pending validation",
      platform_offer: "Platform/partner offer pending validation",
      long_term_monetization_path: "Offer ladder agent fallback: build offer tiers from approved findings.",
      offer_ctas: ["Request details"],
      recommended_offer_ladder: ["Entry", "Core", "Premium", "Platform"],
      missing_offers: ["Offer clarity pending agent recovery"],
      offer_positioning_notes: "Offer ladder requires richer source evidence.",
    },
    audience: {
      audience_segments: [],
      primary_buyer: "Pending",
      secondary_buyer: "Pending",
      viewer_segment: "Pending",
      sponsor_segment: "Pending",
      audience_confusion_risk: "medium",
      audience_priority_recommendation: "Audience segmentation is unavailable; prioritize buyer-intent clarification first.",
    },
    cultural_context: {
      cultural_context_summary: "Cultural context agent fallback: no reliable cultural signals extracted.",
      local_identity_signals: [],
      community_relevance: "Needs manual review.",
      emotional_drivers: [],
      cultural_risk: "Generic language may weaken relevance until context is confirmed.",
      cultural_opportunity: "Capture region/community cues in future evidence pulls.",
      language_to_use: ["specific", "clear", "outcome-led"],
      language_to_avoid: ["generic", "vague", "one-size-fits-all"],
    },
    proof_inventory: {
      proof_assets: [],
      strongest_proof_points: ["Proof inventory agent fallback: no reliable proof stack generated."],
      missing_proof_points: ["Case studies", "Testimonials", "Offer-linked proof"],
      credibility_markers: [],
      recommended_case_studies: [],
      recommended_homepage_proof: [],
      authority_risk: "high",
    },
    conversion_path: {
      current_cta: "Not clearly defined",
      cta_matches_business_model: false,
      recommended_primary_cta: "Request details",
      recommended_secondary_ctas: [],
      cta_by_audience: [],
      conversion_path_summary: "Conversion path agent fallback: CTA routing needs manual review.",
      conversion_gaps: ["Primary CTA and offer mapping unavailable"],
      recommended_landing_paths: ["Primary offer page"],
      best_next_step: "Define one primary CTA and one proof block before publishing report.",
    },
    content_to_revenue: {
      content_categories: [],
      content_revenue_map: [],
      best_content_to_monetize: [],
      missing_content_types: ["Proof content", "Sales content"],
      recommended_content_sequence: ["Awareness -> Proof -> Offer -> CTA"],
      platform_growth_opportunities: [],
    },
    strategist_summary: {
      strategist_summary: "Strategist synthesis fallback: summary generated from limited validated evidence.",
      top_opportunity: "Clarify offer hierarchy and conversion path with validated proof.",
      top_risk: "Low-confidence evidence can lead to generic recommendations.",
      recommended_priority: "Approve high-confidence findings before sending the report.",
      next_3_moves: [
        "Validate brand architecture manually.",
        "Review CTA and offer alignment.",
        "Add proof-led examples to authority section.",
      ],
    },
  };
}

async function insertFindingsWithFallback(
  supabase: ReturnType<typeof createClient>,
  generatedFindings: ReturnType<typeof analyzeEvidence>,
) {
  const enrichedPayload = generatedFindings.map((finding) => ({
    audit_id: finding.audit_id,
    client_id: finding.client_id,
    finding_category: finding.finding_category,
    finding_title: finding.finding_title,
    finding_summary: finding.finding_summary,
    evidence_ids: finding.evidence_ids,
    severity: finding.severity,
    confidence_score: finding.confidence_score,
    recommended_action: finding.recommended_action,
    report_ready: false,
    diagnosis: finding.diagnosis ?? null,
    evidence_summary: finding.evidence_summary ?? null,
    business_implication: finding.business_implication ?? null,
    revenue_implication: finding.revenue_implication ?? null,
    audience_implication: finding.audience_implication ?? null,
    evidence_source_list: finding.source_list ?? [],
    produced_by_agent: finding.produced_by_agent ?? "Research Agent",
    human_summary: finding.human_summary ?? finding.finding_summary,
    admin_review_status: finding.admin_review_status ?? "pending",
    metadata: finding.metadata ?? {},
    strategist_summary: String((finding.metadata as Record<string, unknown> | undefined)?.strategist_summary ?? ""),
    top_opportunity: String((finding.metadata as Record<string, unknown> | undefined)?.top_opportunity ?? ""),
    top_risk: String((finding.metadata as Record<string, unknown> | undefined)?.top_risk ?? ""),
    recommended_priority: String((finding.metadata as Record<string, unknown> | undefined)?.recommended_priority ?? ""),
    next_3_moves: Array.isArray((finding.metadata as Record<string, unknown> | undefined)?.next_3_moves)
      ? (finding.metadata as Record<string, unknown>).next_3_moves
      : [],
  }));

  const firstTry = await supabase.from("audit_findings").insert(enrichedPayload).select("*");
  if (!firstTry.error) return firstTry;
  if (!/column .* does not exist/i.test(firstTry.error.message)) return firstTry;

  const legacyPayload = generatedFindings.map((finding) => ({
    audit_id: finding.audit_id,
    client_id: finding.client_id,
    finding_category: finding.finding_category,
    finding_title: finding.finding_title,
    finding_summary: finding.finding_summary,
    evidence_ids: finding.evidence_ids,
    severity: finding.severity,
    confidence_score: finding.confidence_score,
    recommended_action: finding.recommended_action,
    report_ready: false,
  }));
  return await supabase.from("audit_findings").insert(legacyPayload).select("*");
}

async function insertEvidenceWithFallback(
  supabase: ReturnType<typeof createClient>,
  rows: EvidenceInsert[],
) {
  const firstTry = await supabase.from("audit_social_evidence").insert(rows).select("*");
  if (!firstTry.error) return firstTry;
  if (!/column .* does not exist/i.test(firstTry.error.message)) return firstTry;

  const legacyRows = rows.map((row) => ({
    audit_id: row.audit_id,
    client_id: row.client_id,
    platform: row.platform,
    source_type: row.source_type,
    source_url: row.source_url,
    source_label: row.source_label,
    raw_observation: row.raw_observation,
    normalized_observation: row.normalized_observation,
    evidence_category: row.evidence_category,
    confidence_score: row.confidence_score,
    metadata: row.metadata,
  }));
  return await supabase.from("audit_social_evidence").insert(legacyRows).select("*");
}

async function replaceAgentKnowledge(
  supabase: ReturnType<typeof createClient>,
  auditId: string,
  rows: KnowledgeInsert[],
) {
  if (!rows.length) return { skipped: true };
  const deleteResult = await supabase.from("audit_agent_knowledge").delete().eq("audit_id", auditId);
  if (deleteResult.error && /relation .* does not exist/i.test(deleteResult.error.message)) {
    console.warn("audit_agent_knowledge table missing; skipping knowledge write");
    return { skipped: true, error: deleteResult.error.message };
  }
  if (deleteResult.error) return { error: deleteResult.error.message };
  const insertResult = await supabase.from("audit_agent_knowledge").insert(rows).select("id");
  if (insertResult.error && /relation .* does not exist/i.test(insertResult.error.message)) {
    console.warn("audit_agent_knowledge table missing; skipping knowledge write");
    return { skipped: true, error: insertResult.error.message };
  }
  if (insertResult.error) return { error: insertResult.error.message };
  return { inserted: insertResult.data?.length ?? 0 };
}

function buildResearchSummary(
  sources: NormalizedSource[],
  evidence: AuditSocialEvidence[],
  findingsWritten: number,
  warnings: unknown[],
  strategicProfile: StrategicResearchProfile,
) {
  const confidenceRows = evidence.map((item) => computeEvidenceConfidence(item));
  const averageFinalConfidence = confidenceRows.length
    ? Number((confidenceRows.reduce((sum, row) => sum + row.final_confidence, 0) / confidenceRows.length).toFixed(2))
    : 0.5;
  return {
    status: "completed",
    researched_at: new Date().toISOString(),
    normalized_sources: sources,
    evidence_count: evidence.length,
    findings_count: findingsWritten,
    totals: evidence.reduce<Record<string, number>>((counts, item) => {
      counts[item.evidence_category] = (counts[item.evidence_category] ?? 0) + 1;
      return counts;
    }, {}),
    sources_used: [...new Set(evidence.map((item) => item.source_type))],
    provider_config: {
      meta_graph: Boolean(Deno.env.get("INTEGRATION_TOKEN_ENCRYPTION_KEY")),
      public_data_provider: Boolean(Deno.env.get("APIFY_TOKEN")),
      screenshot_capture: Boolean(Deno.env.get("BROWSERLESS_TOKEN")),
      business_discovery: Boolean(Deno.env.get("TAVILY_API_KEY")),
    },
    confidence: {
      average_final_confidence: averageFinalConfidence,
      evidence_strength_counts: confidenceRows.reduce<Record<string, number>>((acc, row) => {
        acc[row.evidence_strength] = (acc[row.evidence_strength] ?? 0) + 1;
        return acc;
      }, {}),
    },
    strategic_profile: strategicProfile,
    strategist_summary: strategicProfile.strategist_summary,
    quality_warnings: warnings,
  };
}

async function loadReviewPayload(supabase: ReturnType<typeof createClient>, auditId: string) {
  const { data: evidence, error: evidenceError } = await supabase
    .from("audit_social_evidence")
    .select("*")
    .eq("audit_id", auditId)
    .order("confidence_score", { ascending: false })
    .limit(80);
  if (evidenceError) throw evidenceError;

  const { data: findings, error: findingsError } = await supabase
    .from("audit_findings")
    .select("*")
    .eq("audit_id", auditId)
    .order("confidence_score", { ascending: false });
  if (findingsError) throw findingsError;

  const { data: knowledge } = await supabase
    .from("audit_agent_knowledge")
    .select("*")
    .eq("audit_id", auditId)
    .order("confidence", { ascending: false });

  const { data: auditRow, error: auditError } = await supabase
    .from("free_audits")
    .select("metadata")
    .eq("id", auditId)
    .maybeSingle();
  if (auditError) throw auditError;
  const metadata = asObject(auditRow?.metadata);
  const socialResearch = asObject(metadata.social_research);

  return {
    evidence: evidence ?? [],
    findings: findings ?? [],
    knowledge: knowledge ?? [],
    strategic_profile: socialResearch.strategic_profile ?? null,
    strategist_summary: socialResearch.strategist_summary ?? null,
  };
}

async function approveFindings(supabase: ReturnType<typeof createClient>, auditId: string) {
  let findingsResponse = await supabase
    .from("audit_findings")
    .update({ report_ready: true, admin_review_status: "approved" })
    .eq("audit_id", auditId)
    .select("evidence_ids");
  if (findingsResponse.error && /column .* does not exist/i.test(findingsResponse.error.message)) {
    findingsResponse = await supabase
      .from("audit_findings")
      .update({ report_ready: true })
      .eq("audit_id", auditId)
      .select("evidence_ids");
  }
  const { data: findings, error: findingError } = findingsResponse;
  if (findingError) throw findingError;

  const evidenceIds = [...new Set((findings ?? []).flatMap((finding) => Array.isArray(finding.evidence_ids) ? finding.evidence_ids : []))];
  if (evidenceIds.length) {
    const { error: evidenceError } = await supabase
      .from("audit_social_evidence")
      .update({ used_in_report: true })
      .in("id", evidenceIds);
    if (evidenceError) throw evidenceError;
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);

  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return jsonResponse({ error: "Invalid payload", details: parsed.error.flatten() }, 400, corsHeaders);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return jsonResponse({ error: "Server configuration incomplete" }, 500, corsHeaders);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: audit, error } = await supabase.from("free_audits").select("*").eq("id", parsed.data.auditId).maybeSingle();
    if (error) throw error;
    if (!audit) return jsonResponse({ error: "Audit not found" }, 404, corsHeaders);

    const auditRecord = audit as AuditRecord;
    if (parsed.data.action === "review") {
      const review = await loadReviewPayload(supabase, auditRecord.id);
      return jsonResponse({ ok: true, ...review }, 200, corsHeaders);
    }
    if (parsed.data.action === "approve_findings") {
      await approveFindings(supabase, auditRecord.id);
      const review = await loadReviewPayload(supabase, auditRecord.id);
      return jsonResponse({ ok: true, approved: true, ...review }, 200, corsHeaders);
    }

    if (parsed.data.force) {
      await supabase.from("audit_findings").delete().eq("audit_id", auditRecord.id);
      await supabase.from("audit_social_evidence").delete().eq("audit_id", auditRecord.id);
      await supabase.from("audit_agent_knowledge").delete().eq("audit_id", auditRecord.id);
    }

    const ownedSources = normalizeAuditSources(auditRecord);
    let sources = [...ownedSources];
    const useMockData = parsed.data.useMockData || Deno.env.get("KORA_USE_MOCK_RESEARCH") === "true";
    const evidenceRows: EvidenceInsert[] = [...intakeEvidence(auditRecord)];

    if (useMockData) {
      evidenceRows.push(...mockEvidence(auditRecord, sources));
    } else {
      evidenceRows.push(...await fetchMetaEvidence(auditRecord, ownedSources, supabase));
      for (const source of ownedSources) {
        evidenceRows.push(...await fetchWebsiteEvidence(auditRecord, source));
        evidenceRows.push(...await fetchProviderEvidence(auditRecord, source));
        evidenceRows.push(...await captureEvidenceScreenshot(auditRecord, source, supabase));
      }
      const keywordTerms = deriveKeywordInvestigationTerms(auditRecord, evidenceRows);
      const keywordEvidence = keywordInvestigatorEvidence(auditRecord, keywordTerms);
      if (keywordEvidence) evidenceRows.push(keywordEvidence);
      evidenceRows.push(...await fetchOnlineResearchEvidence(auditRecord, keywordTerms));

      const discoveredSources = await discoverPublicCompetitors(auditRecord, keywordTerms);
      sources = [...ownedSources, ...discoveredSources];
      for (const source of discoveredSources) {
        evidenceRows.push(...await captureEvidenceScreenshot(auditRecord, source, supabase));
      }
    }

    const { data: insertedEvidence, error: insertError } = await insertEvidenceWithFallback(supabase, evidenceRows);
    if (insertError) throw insertError;

    let evidence = (insertedEvidence ?? []) as AuditSocialEvidence[];
    let strategicProfile: StrategicResearchProfile;
    try {
      strategicProfile = await buildStrategicResearchProfile({
        audit: auditRecord,
        sources,
        evidence,
      });
    } catch (agentError) {
      console.warn("strategic profile fallback", agentError);
      strategicProfile = fallbackStrategicProfile(auditRecord);
    }

    const strategicAgentRows = strategicProfileEvidenceRows(auditRecord, strategicProfile);
    if (strategicAgentRows.length) {
      const { data: strategicEvidence, error: strategicInsertError } = await insertEvidenceWithFallback(supabase, strategicAgentRows);
      if (!strategicInsertError) {
        evidence = [...evidence, ...((strategicEvidence ?? []) as AuditSocialEvidence[])];
      }
    }
    const knowledgeRows = buildAgentKnowledgeRows(auditRecord, strategicProfile, evidence);
    const knowledgeWrite = await replaceAgentKnowledge(supabase, auditRecord.id, knowledgeRows);

    const context = {
      auditId: auditRecord.id,
      clientId: auditRecord.customer_id,
      businessName: auditRecord.business_name || auditRecord.lead_key,
      growthGoal: cleanObservation(auditRecord.growth_goal, 500),
      currentBlocker: cleanObservation(auditRecord.current_blocker, 500),
      targetAudience: cleanObservation(auditRecord.target_audience_belief, 500),
      websiteLink: auditRecord.website_link,
      intent: auditRecord.intent,
      scoreSummary: asObject(auditRecord.score_summary),
      strategicProfile,
    };
    const strategist = strategicProfile.strategist_summary;
    const generatedFindings = analyzeEvidence(context, evidence).map((finding) => ({
      ...finding,
      metadata: {
        ...(finding.metadata ?? {}),
        strategist_summary: strategist.strategist_summary,
        top_opportunity: strategist.top_opportunity,
        top_risk: strategist.top_risk,
        recommended_priority: strategist.recommended_priority,
        next_3_moves: strategist.next_3_moves,
      },
    }));

    const { data: findings, error: findingError } = await insertFindingsWithFallback(supabase, generatedFindings);
    if (findingError) throw findingError;

    const warnings = buildEvidenceQualityWarnings(context, evidence, generatedFindings);
    const existingMetadata = asObject(auditRecord.metadata);
    const socialResearch = {
      ...buildResearchSummary(sources, evidence, findings?.length ?? 0, warnings, strategicProfile),
      agentic_knowledge: {
        rows_prepared: knowledgeRows.length,
        rows_written: "inserted" in knowledgeWrite ? knowledgeWrite.inserted : 0,
        skipped: "skipped" in knowledgeWrite ? knowledgeWrite.skipped : false,
        error: "error" in knowledgeWrite ? knowledgeWrite.error : null,
        knowledge_types: [...new Set(knowledgeRows.map((row) => row.knowledge_type))],
      },
    };
    const { error: updateError } = await supabase
      .from("free_audits")
      .update({ metadata: { ...existingMetadata, social_research: socialResearch, normalized_social_sources: sources } })
      .eq("id", auditRecord.id);
    if (updateError) throw updateError;

    return jsonResponse({
      ok: true,
      evidenceWritten: evidence.length,
      findingsWritten: findings?.length ?? 0,
      knowledgeWritten: "inserted" in knowledgeWrite ? knowledgeWrite.inserted : 0,
      evidence,
      findings: findings ?? [],
      strategic_profile: socialResearch.strategic_profile,
      strategist_summary: socialResearch.strategist_summary,
      ...socialResearch,
    }, 200, corsHeaders);
  } catch (error) {
    console.error("free-audit-social-research error", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500, corsHeaders);
  }
});
