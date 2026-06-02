import type { AuditSocialEvidence } from "./evidenceAnalyzer.ts";

type Severity = "low" | "medium" | "high";

type AgentAuditRecord = {
  id: string;
  lead_key: string;
  business_name: string | null;
  website_link: string | null;
  growth_goal: string | null;
  current_blocker: string | null;
  target_audience_belief: string | null;
  intent: string | null;
};

type AgentSource = {
  platform: string;
  canonical_url: string;
  source_label: string | null;
  handle?: string | null;
  submitted_value?: string | null;
  was_inferred?: boolean;
  confidence?: number;
  source_type?: string;
};

type SegmentUrgency = "low" | "medium" | "high";
type ConversionLikelihood = "low" | "medium" | "high";
type IntelligenceScore = "low" | "medium" | "high";

type IndustryProfile = {
  industry_key: string;
  industry_label: string;
  confidence: number;
  reasoning: string;
  primary_revenue_model: string;
  default_audiences: string[];
  default_ctas: string[];
  offer_examples: string[];
  proof_examples: string[];
};

export type AudienceSegmentProfile = {
  segment_name: string;
  wants: string;
  fears: string;
  compares_against: string;
  proof_needed: string;
  best_cta: string;
  message_angle: string;
  urgency_level: SegmentUrgency;
  conversion_likelihood: ConversionLikelihood;
};

export type StrategicResearchProfile = {
  brand_architecture: {
    official_business_name: string;
    public_brand: string;
    parent_brand: string | null;
    platform_brand: string | null;
    sub_brands: string[];
    interchangeable_name_risk: boolean;
    naming_consistency_score: number;
    brand_architecture_notes: string;
    recommended_name_usage: string;
  };
  industry_profile: IndustryProfile;
  business_model: {
    primary_revenue_model: string;
    secondary_revenue_models: string[];
    revenue_opportunities: string[];
    unclear_revenue_gaps: string[];
    business_model_summary: string;
    business_model_risk: Severity;
    recommended_revenue_focus: string;
  };
  offer_ladder: {
    entry_offer: string;
    core_offer: string;
    premium_offer: string;
    platform_offer: string;
    long_term_monetization_path: string;
    offer_ctas: string[];
    recommended_offer_ladder: string[];
    missing_offers: string[];
    offer_positioning_notes: string;
  };
  audience: {
    audience_segments: AudienceSegmentProfile[];
    primary_buyer: string;
    secondary_buyer: string;
    viewer_segment: string;
    sponsor_segment: string;
    audience_confusion_risk: Severity;
    audience_priority_recommendation: string;
  };
  cultural_context: {
    cultural_context_summary: string;
    local_identity_signals: string[];
    community_relevance: string;
    emotional_drivers: string[];
    cultural_risk: string;
    cultural_opportunity: string;
    language_to_use: string[];
    language_to_avoid: string[];
  };
  proof_inventory: {
    proof_assets: string[];
    strongest_proof_points: string[];
    missing_proof_points: string[];
    credibility_markers: string[];
    recommended_case_studies: string[];
    recommended_homepage_proof: string[];
    authority_risk: Severity;
  };
  conversion_path: {
    current_cta: string;
    cta_matches_business_model: boolean;
    recommended_primary_cta: string;
    recommended_secondary_ctas: string[];
    cta_by_audience: Array<{ audience: string; cta: string }>;
    conversion_path_summary: string;
    conversion_gaps: string[];
    recommended_landing_paths: string[];
    best_next_step: string;
  };
  content_to_revenue: {
    content_categories: string[];
    content_revenue_map: Array<{ content_type: string; revenue_path: string; why_it_matters: string }>;
    best_content_to_monetize: string[];
    missing_content_types: string[];
    recommended_content_sequence: string[];
    platform_growth_opportunities: string[];
  };
  intelligence_quality: {
    source_strength: IntelligenceScore;
    source_strength_score: number;
    source_quality_summary: string;
    product_service_confidence: number;
    audience_reaction_confidence: number;
    buy_factor_confidence: number;
    product_service_keywords: string[];
    audience_reaction_signals: string[];
    buying_signals: string[];
    direct_sources: string[];
    weak_sources: string[];
    confidence_cap_reason: string | null;
  };
  growth_snapshot: {
    growth_law: string;
    social_presence: {
      has_social_accounts: boolean;
      accounts: Array<{
        platform: string;
        handle: string | null;
        url: string;
        source_type: string;
        followers: number | null;
        following: number | null;
        posts: number | null;
        recent_posts_reviewed: number;
        average_likes: number | null;
        average_comments: number | null;
        comment_themes: string[];
        user_response_behavior: string;
        data_gaps: string[];
      }>;
      missing_or_unverified_accounts: string[];
    };
    website_presence: {
      has_website: boolean;
      url: string | null;
      pages_reviewed: number;
      messaging_observed: string[];
      products_or_services_observed: string[];
      data_gaps: string[];
    };
    offer_and_scale_read: {
      observed_products_or_services: string[];
      current_growth_activity: string[];
      how_we_can_help_scale: string[];
      recommended_5x_focus: string;
      first_30_days: string[];
      data_gaps: string[];
    };
  };
  strategist_summary: {
    strategist_summary: string;
    top_opportunity: string;
    top_risk: string;
    recommended_priority: string;
    next_3_moves: string[];
  };
};

function clean(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function sentence(value: string): string {
  const text = clean(value);
  if (!text) return "";
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function titleCase(value: string): string {
  return clean(value)
    .split(/\s+/)
    .map((word) => (word ? `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}` : ""))
    .join(" ")
    .trim();
}

function unique(items: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const item of items.map(clean).filter(Boolean)) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

function tokenize(value: string): string[] {
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((part) => part.length > 2);
}

function confidence(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

function average(values: number[]): number {
  if (!values.length) return 0.5;
  return confidence(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function sourceConfidenceFor(sourceType: string): number {
  switch (sourceType) {
    case "website":
      return 0.9;
    case "connected_account":
    case "meta_graph_api":
      return 0.92;
    case "public_profile":
      return 0.78;
    case "public_data_provider":
      return 0.75;
    case "business_discovery":
      return 0.42;
    case "manual_admin_note":
      return 0.7;
    case "screenshot":
      return 0.74;
    default:
      return 0.62;
  }
}

function labelForScore(value: number): IntelligenceScore {
  if (value >= 0.72) return "high";
  if (value >= 0.45) return "medium";
  return "low";
}

function evidenceText(evidence: AuditSocialEvidence): string {
  return clean(`${evidence.source_label ?? ""} ${evidence.source_url ?? ""} ${evidence.normalized_observation ?? ""} ${evidence.raw_observation ?? ""}`).toLowerCase();
}

function matchTerms(text: string, patterns: Array<[string, RegExp]>): string[] {
  return patterns.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
}

const PRODUCT_SERVICE_PATTERNS: Array<[string, RegExp]> = [
  ["menu", /\b(menu|signature dish|dish|plate|meal|food|cuisine|culinary|flavor|flavorful|taste|tasty|must[- ]try)\b/i],
  ["catering", /\b(cater|catering|event food|private event|corporate event)\b/i],
  ["food truck", /\b(food truck|truck|bus|pop[- ]?up|vendor|mobile food|mobile kitchen|street food)\b/i],
  ["booking/service", /\b(book|booking|service|package|appointment|reservation|order)\b/i],
  ["production/media", /\b(video|photo|production|coverage|livestream|recap|shoot)\b/i],
  ["retail/product", /\b(product|shop|collection|drop|bundle|merch)\b/i],
];

const AUDIENCE_REACTION_PATTERNS: Array<[string, RegExp]> = [
  ["review/recommendation", /\b(review|recommended|recommend|must[- ]try|worth trying|best|favorite|loved|great|amazing)\b/i],
  ["social engagement", /\b(comment|comments|like|likes|share|shares|viral|views|engagement|audience)\b/i],
  ["customer response", /\b(customer|diners|guests|clients|fans|community|line|sold out|repeat)\b/i],
  ["proof signal", /\b(testimonial|rating|press|featured|case study|before and after)\b/i],
];

const BUYING_SIGNAL_PATTERNS: Array<[string, RegExp]> = [
  ["order/reserve", /\b(order|reserve|reservation|book|booking|schedule|availability)\b/i],
  ["price/package", /\b(price|pricing|package|bundle|quote|estimate|deposit|payment)\b/i],
  ["purchase intent", /\b(menu|shop|buy|purchase|sold out|limited|request|inquire|contact)\b/i],
  ["event buyer", /\b(catering|event|corporate|party|wedding|private)\b/i],
  ["conversion CTA", /\b(call now|dm|link in bio|request|sign up|join|subscribe)\b/i],
];

function sourceIsDirect(evidence: AuditSocialEvidence): boolean {
  if (["website", "connected_account", "meta_graph_api"].includes(evidence.source_type)) return true;
  if (evidence.source_type === "public_profile") return true;
  return false;
}

function isThirdPartyDiscovery(value: { source_type?: string; canonical_url?: string; source_url?: string }): boolean {
  const type = value.source_type ?? "";
  const url = value.canonical_url ?? value.source_url ?? "";
  if (type === "business_discovery" || type === "public_data_provider") return true;
  return /bestversionmedia\.com|medium\.com|substack\.com|news|magazine|blog|review|article/i.test(url);
}

function computeIntelligenceQuality(input: {
  sources: AgentSource[];
  evidence: AuditSocialEvidence[];
  industryProfile: IndustryProfile;
}): StrategicResearchProfile["intelligence_quality"] {
  const evidence = input.evidence;
  const directEvidence = evidence.filter(sourceIsDirect);
  const qualityScores = evidence.map((item) => computeEvidenceConfidence(item).final_confidence);
  const directSourceRatio = evidence.length ? directEvidence.length / evidence.length : 0;
  const averageQuality = average(qualityScores);
  const sourceStrengthScore = confidence((averageQuality * 0.6) + (directSourceRatio * 0.4));

  const productTerms = unique(evidence.flatMap((item) => matchTerms(evidenceText(item), PRODUCT_SERVICE_PATTERNS)));
  const reactionTerms = unique(evidence.flatMap((item) => matchTerms(evidenceText(item), AUDIENCE_REACTION_PATTERNS)));
  const buyingTerms = unique(evidence.flatMap((item) => matchTerms(evidenceText(item), BUYING_SIGNAL_PATTERNS)));

  const productEvidence = evidence.filter((item) => matchTerms(evidenceText(item), PRODUCT_SERVICE_PATTERNS).length > 0);
  const reactionEvidence = evidence.filter((item) => matchTerms(evidenceText(item), AUDIENCE_REACTION_PATTERNS).length > 0);
  const buyEvidence = evidence.filter((item) => matchTerms(evidenceText(item), BUYING_SIGNAL_PATTERNS).length > 0);
  const supportScore = (rows: AuditSocialEvidence[]) => {
    if (!rows.length) return 0.12;
    const directRatio = rows.filter(sourceIsDirect).length / rows.length;
    return confidence((average(rows.map((item) => computeEvidenceConfidence(item).final_confidence)) * 0.7) + (directRatio * 0.3));
  };

  const directSources = unique(directEvidence.map((item) => item.source_label || item.source_url || item.platform).filter(Boolean)).slice(0, 8);
  const weakSources = unique(
    evidence
      .filter((item) => !sourceIsDirect(item) || computeEvidenceConfidence(item).final_confidence < 0.55)
      .map((item) => item.source_label || item.source_url || item.platform)
      .filter(Boolean),
  ).slice(0, 8);

  const sourceStrength = labelForScore(sourceStrengthScore);
  const confidenceCapReason =
    sourceStrength === "low"
      ? "Sources are mostly indirect or low-confidence; treat product, audience, and buy-factor conclusions as directional until confirmed by official pages, owner context, or customer proof."
      : directSources.length < 2
        ? "Only limited direct owned/source evidence is available; validate the business model and buyer reaction before using this externally."
        : null;

  const sourceQualitySummary = sourceStrength === "low"
    ? `Only weak directional intelligence is available. The system found ${evidence.length} evidence item${evidence.length === 1 ? "" : "s"}, but not enough direct owned-source proof to make strong claims.`
    : sourceStrength === "medium"
      ? `Moderate internal intelligence available. Direct sources are present, but product/service, reaction, and buy-factor signals should still be manually verified.`
      : `Strong internal intelligence available from multiple direct or high-confidence sources.`;

  return {
    source_strength: sourceStrength,
    source_strength_score: sourceStrengthScore,
    source_quality_summary: sourceQualitySummary,
    product_service_confidence: supportScore(productEvidence),
    audience_reaction_confidence: supportScore(reactionEvidence),
    buy_factor_confidence: supportScore(buyEvidence),
    product_service_keywords: productTerms.length ? productTerms : input.industryProfile.offer_examples.slice(0, 3),
    audience_reaction_signals: reactionTerms,
    buying_signals: buyingTerms,
    direct_sources: directSources,
    weak_sources: weakSources,
    confidence_cap_reason: confidenceCapReason,
  };
}

function inferenceConfidenceFor(evidence: AuditSocialEvidence): number {
  const metadata = evidence.metadata && typeof evidence.metadata === "object"
    ? evidence.metadata as Record<string, unknown>
    : {};
  const inferred = Boolean((metadata.normalized_source as Record<string, unknown> | undefined)?.was_inferred);
  if (inferred) return 0.64;
  if (evidence.source_type === "manual_admin_note") return 0.68;
  return 0.84;
}

export function computeEvidenceConfidence(evidence: AuditSocialEvidence): {
  source_confidence: number;
  inference_confidence: number;
  final_confidence: number;
  evidence_strength: "low" | "medium" | "high";
} {
  const source = sourceConfidenceFor(evidence.source_type);
  const inference = inferenceConfidenceFor(evidence);
  const final = confidence((source * 0.45) + (inference * 0.2) + (evidence.confidence_score * 0.35));
  return {
    source_confidence: source,
    inference_confidence: inference,
    final_confidence: final,
    evidence_strength: final >= 0.8 ? "high" : final >= 0.62 ? "medium" : "low",
  };
}

const FIVE_X_GROWTH_LAW =
  "Internal law: every client growth read must ladder toward 5x growth in 3 months across visibility, engagement, leads, conversion, revenue, and operational capacity.";

function recordFrom(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numericMetric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function metricFromMetadata(metadata: Record<string, unknown>, keys: string[]): number | null {
  const engagement = recordFrom(metadata.engagement);
  for (const key of keys) {
    const direct = numericMetric(metadata[key]);
    if (direct !== null) return direct;
    const nested = numericMetric(engagement[key]);
    if (nested !== null) return nested;
  }
  return null;
}

function averageMetric(values: Array<number | null>): number | null {
  const valid = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!valid.length) return null;
  return Number((valid.reduce((sum, value) => sum + value, 0) / valid.length).toFixed(1));
}

function isSocialPlatform(platform: string): boolean {
  return ["instagram", "facebook", "tiktok", "linkedin", "youtube"].includes(platform.toLowerCase());
}

function handleFromUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const segment = url.pathname.split("/").map((part) => part.trim()).filter(Boolean)[0] ?? "";
    return segment.replace(/^@/, "") || null;
  } catch {
    return null;
  }
}

function sourceKeyFor(platform: string, url: string, handle?: string | null): string {
  return `${platform.toLowerCase()}:${(handle || url).toLowerCase()}`;
}

function simpleEvidenceLines(evidence: AuditSocialEvidence[], limit = 4): string[] {
  return unique(evidence.map((item) => clean(item.normalized_observation || item.raw_observation)).filter(Boolean)).slice(0, limit);
}

function buildGrowthSnapshot(input: {
  audit: AgentAuditRecord;
  sources: AgentSource[];
  evidence: AuditSocialEvidence[];
  industryProfile: IndustryProfile;
  businessModel: StrategicResearchProfile["business_model"];
  conversionPath: StrategicResearchProfile["conversion_path"];
}): StrategicResearchProfile["growth_snapshot"] {
  const websiteSource = input.sources.find((source) => source.platform === "website") ?? null;
  const websiteEvidence = input.evidence.filter((item) => item.source_type === "website" || item.platform === "website");
  const websiteUrl = clean(input.audit.website_link || websiteSource?.canonical_url || websiteEvidence[0]?.source_url || "");
  const hasWebsite = Boolean(websiteUrl);

  const socialSources = input.sources.filter((source) => isSocialPlatform(source.platform));
  const socialEvidence = input.evidence.filter((item) => isSocialPlatform(item.platform));
  const accountMap = new Map<string, {
    platform: string;
    handle: string | null;
    url: string;
    source_type: string;
    evidence: AuditSocialEvidence[];
  }>();

  socialSources.forEach((source) => {
    const key = sourceKeyFor(source.platform, source.canonical_url, source.handle);
    accountMap.set(key, {
      platform: source.platform,
      handle: source.handle ?? handleFromUrl(source.canonical_url),
      url: source.canonical_url,
      source_type: source.source_type ?? "public_profile",
      evidence: [],
    });
  });

  socialEvidence.forEach((item) => {
    const handle = handleFromUrl(item.source_url);
    const existing = [...accountMap.values()].find((account) =>
      account.platform === item.platform &&
      (account.url === item.source_url || Boolean(handle && account.handle?.toLowerCase() === handle.toLowerCase()))
    );
    const key = existing ? sourceKeyFor(existing.platform, existing.url, existing.handle) : sourceKeyFor(item.platform, item.source_url, handle);
    const account = existing ?? {
      platform: item.platform,
      handle,
      url: item.source_url,
      source_type: item.source_type,
      evidence: [],
    };
    account.evidence.push(item);
    accountMap.set(key, account);
  });

  const accounts = [...accountMap.values()].map((account) => {
    const profileRows = account.evidence.filter((item) => ["connected_account", "public_profile"].includes(item.source_type));
    const postRows = account.evidence.filter((item) =>
      item.evidence_category === "messaging" ||
      metricFromMetadata(recordFrom(item.metadata), ["likes", "comments", "views"]) !== null
    );
    const commentRows = account.evidence.filter((item) => item.evidence_category === "engagement_quality");
    const metadataRows = account.evidence.map((item) => recordFrom(item.metadata));
    const followers = metadataRows.map((metadata) => metricFromMetadata(metadata, ["followers", "followers_count", "fan_count"])).find((value) => value !== null) ?? null;
    const following = metadataRows.map((metadata) => metricFromMetadata(metadata, ["following", "follows_count", "following_count"])).find((value) => value !== null) ?? null;
    const posts = metadataRows.map((metadata) => metricFromMetadata(metadata, ["media_count", "posts", "posts_count"])).find((value) => value !== null) ?? null;
    const averageLikes = averageMetric(postRows.map((item) => metricFromMetadata(recordFrom(item.metadata), ["likes", "likesCount", "like_count"])));
    const averageComments = averageMetric(postRows.map((item) => metricFromMetadata(recordFrom(item.metadata), ["comments", "commentsCount", "comments_count"])));
    const responseSignals = commentRows.filter((item) => /\b(reply|replied|respond|response|answered)\b/i.test(evidenceText(item)));
    return {
      platform: titleCase(account.platform),
      handle: account.handle,
      url: account.url,
      source_type: account.source_type,
      followers,
      following,
      posts,
      recent_posts_reviewed: postRows.length || profileRows.length,
      average_likes: averageLikes,
      average_comments: averageComments,
      comment_themes: simpleEvidenceLines(commentRows, 5),
      user_response_behavior: responseSignals.length
        ? simpleEvidenceLines(responseSignals, 2).join(" ")
        : "Not captured yet; review comment threads or connected account data before judging community management.",
      data_gaps: unique([
        followers === null ? "Follower count not captured" : "",
        following === null ? "Following count not captured" : "",
        posts === null ? "Total post count not captured" : "",
        averageLikes === null ? "Per-post likes not captured" : "",
        averageComments === null ? "Per-post comments not captured" : "",
        commentRows.length ? "" : "Comment text not captured",
        responseSignals.length ? "" : "Owner response behavior not captured",
      ]),
    };
  });

  const productRows = input.evidence.filter((item) => matchTerms(evidenceText(item), PRODUCT_SERVICE_PATTERNS).length > 0);
  const offerSignals = unique([
    ...input.businessModel.secondary_revenue_models,
    input.businessModel.primary_revenue_model,
    ...input.industryProfile.offer_examples,
    ...matchTerms(buildCorpus(input.audit, productRows), PRODUCT_SERVICE_PATTERNS),
  ]).slice(0, 8);
  const currentGrowthActivity = unique([
    ...simpleEvidenceLines(socialEvidence.filter((item) => item.evidence_category === "messaging" || item.evidence_category === "content_consistency"), 4),
    ...input.businessModel.revenue_opportunities.slice(0, 2),
  ]).slice(0, 6);
  const websiteProducts = unique([
    ...simpleEvidenceLines(websiteEvidence.filter((item) => matchTerms(evidenceText(item), PRODUCT_SERVICE_PATTERNS).length > 0), 4),
    ...matchTerms(buildCorpus(input.audit, websiteEvidence), PRODUCT_SERVICE_PATTERNS),
  ]).slice(0, 6);

  return {
    growth_law: FIVE_X_GROWTH_LAW,
    social_presence: {
      has_social_accounts: accounts.length > 0,
      accounts,
      missing_or_unverified_accounts: accounts.length
        ? accounts.flatMap((account) => account.data_gaps.map((gap) => `${account.platform}: ${gap}`)).slice(0, 10)
        : ["No social account was submitted or discovered for this audit."],
    },
    website_presence: {
      has_website: hasWebsite,
      url: hasWebsite ? websiteUrl : null,
      pages_reviewed: websiteEvidence.length,
      messaging_observed: simpleEvidenceLines(websiteEvidence, 5),
      products_or_services_observed: websiteProducts.length ? websiteProducts : offerSignals.slice(0, 5),
      data_gaps: unique([
        hasWebsite ? "" : "No website URL submitted or discovered",
        websiteEvidence.length ? "" : "Website page content not captured",
        websiteProducts.length ? "" : "Website products/services need direct confirmation",
      ]),
    },
    offer_and_scale_read: {
      observed_products_or_services: offerSignals,
      current_growth_activity: currentGrowthActivity.length
        ? currentGrowthActivity
        : ["Public growth activity is not clear yet from captured sources."],
      how_we_can_help_scale: [
        "Turn the strongest observed offer into one clear conversion path.",
        "Build content that proves demand: comments, reviews, orders, bookings, saves, shares, and repeat customer behavior.",
        "Create a 90-day operating plan that grows visibility, engagement, leads, conversion, revenue, and delivery capacity together.",
      ],
      recommended_5x_focus:
        `Focus the next 90 days on making ${input.conversionPath.recommended_primary_cta} measurable, repeatable, and supported by proof so the brand can pursue 5x growth without guessing.`,
      first_30_days: [
        "Confirm baseline numbers: followers, following, posts, average likes, average comments, website traffic, leads, sales, and capacity.",
        "Clarify the main offer and one primary CTA across bio, website, and highest-traffic posts.",
        "Collect and tag real audience comments, DMs, reviews, bookings, orders, and objections to guide messaging.",
      ],
      data_gaps: unique([
        "Baseline revenue, lead volume, conversion rate, and delivery capacity must be confirmed before promising a 5x path.",
        accounts.some((account) => account.followers === null || account.average_likes === null || account.average_comments === null)
          ? "Social performance metrics are incomplete."
          : "",
        websiteEvidence.length ? "" : "Website content needs direct capture.",
      ]),
    },
  };
}

const INDUSTRY_PROFILES: Array<Omit<IndustryProfile, "confidence" | "reasoning"> & { patterns: RegExp[] }> = [
  {
    industry_key: "photography",
    industry_label: "Photography services",
    patterns: [/photograph|photographer|photo shoot|photoshoot|portrait|headshot|wedding|pixieset|gallery/i],
    primary_revenue_model: "Photography sessions",
    default_audiences: ["Clients booking shoots", "Entrepreneurs", "Couples", "Event hosts"],
    default_ctas: ["Book a Photo Shoot", "View Portfolio", "Request Pricing", "Ask About Availability"],
    offer_examples: ["Mini-session", "Portrait shoot", "Event photography", "Brand photography day"],
    proof_examples: ["Portfolio galleries", "Client testimonials", "Before-and-after edits", "Turnaround and delivery details"],
  },
  {
    industry_key: "media_production",
    industry_label: "Media and production",
    patterns: [/video production|production package|filming|event coverage|recap|livestream|documentary|media day|content package/i],
    primary_revenue_model: "Media production services",
    default_audiences: ["Service buyers", "Event hosts", "Sponsors", "Partners"],
    default_ctas: ["Request Event Coverage", "Book a Production Consultation", "Request a Live Stream Quote", "View Work"],
    offer_examples: ["Event recap", "Branded video package", "Live stream package", "Campaign content package"],
    proof_examples: ["Production reel", "Event recap samples", "Client logos", "Outcome-based case studies"],
  },
  {
    industry_key: "beauty_wellness",
    industry_label: "Beauty, wellness, and personal care",
    patterns: [/beauty|salon|spa|skin|esthetic|makeup|hair|wellness|fitness|therapy|massage|coach/i],
    primary_revenue_model: "Appointments and service packages",
    default_audiences: ["Local clients", "Repeat customers", "High-intent appointment shoppers"],
    default_ctas: ["Book an Appointment", "View Services", "Request Pricing", "Join the Waitlist"],
    offer_examples: ["Intro appointment", "Signature service", "Membership or package", "Premium transformation offer"],
    proof_examples: ["Before-and-after visuals", "Reviews", "Practitioner credentials", "Service results"],
  },
  {
    industry_key: "food_hospitality",
    industry_label: "Food, hospitality, and local experiences",
    patterns: [/\brestaurant\b|\bcatering\b|\bchef\b|\bfood truck\b|\bbakery\b|\bbar\b|\bcoffee\b|\bvenue\b|\bhotel\b|\bhospitality\b|\bmenu\b|\bculinary\b|\bflavor\b|\bflavorful\b|\bmust[- ]try\b|\bfood experience\b|\bmobile food\b|\bstreet food\b/i],
    primary_revenue_model: "Orders, reservations, and event bookings",
    default_audiences: ["Local diners", "Event hosts", "Corporate buyers", "Returning guests"],
    default_ctas: ["View the Menu", "Find the Bus", "Book The Bus for an Event", "Request Catering"],
    offer_examples: ["Signature menu item", "Food truck stop", "Catering package", "Private event or pop-up"],
    proof_examples: ["Menu photos", "Customer reviews", "Event photos", "Press or local features"],
  },
  {
    industry_key: "retail_ecommerce",
    industry_label: "Retail and ecommerce",
    patterns: [/shop|store|ecommerce|e-commerce|product|merch|collection|boutique|apparel|inventory/i],
    primary_revenue_model: "Product sales",
    default_audiences: ["Shoppers", "Repeat buyers", "Gift buyers", "Community fans"],
    default_ctas: ["Shop the Offer", "View Collection", "Join the List", "Claim the Drop"],
    offer_examples: ["Hero product", "Bundle", "Limited drop", "Subscription or replenishment offer"],
    proof_examples: ["Product reviews", "UGC", "Lifestyle product photos", "Shipping and return clarity"],
  },
  {
    industry_key: "professional_services",
    industry_label: "Professional services",
    patterns: [/consult|agency|law|accounting|tax|real estate|insurance|coaching|advisor|service|proposal|quote/i],
    primary_revenue_model: "Consultations and project services",
    default_audiences: ["Business owners", "Decision-makers", "High-intent leads"],
    default_ctas: ["Request a Proposal", "Book a Consultation", "Start a Project", "Request Details"],
    offer_examples: ["Discovery consultation", "Core service package", "Implementation project", "Ongoing support"],
    proof_examples: ["Case studies", "Client outcomes", "Testimonials", "Credentials"],
  },
  {
    industry_key: "education_course",
    industry_label: "Education, courses, and training",
    patterns: [/course|class|training|workshop|school|academy|lesson|cohort|curriculum|student/i],
    primary_revenue_model: "Enrollment and training programs",
    default_audiences: ["Learners", "Parents", "Professionals", "Organizations"],
    default_ctas: ["Enroll Now", "Join the Waitlist", "Book an Info Call", "Download the Guide"],
    offer_examples: ["Workshop", "Course", "Cohort program", "Training package"],
    proof_examples: ["Student outcomes", "Curriculum preview", "Instructor credentials", "Testimonials"],
  },
  {
    industry_key: "nonprofit_church",
    industry_label: "Nonprofit, ministry, and community organizations",
    patterns: [/non[ -]?profit|donat(e|ion|ions)|donor|fundraising|foundation|church|ministry|pastor|worship|community organization|community program|online community|501c|join (the )?community|become a member|membership|volunteer|get involved/i],
    primary_revenue_model: "Donations, programs, and community support",
    default_audiences: ["Donors", "Members", "Volunteers", "Community partners"],
    default_ctas: ["Join the Community", "Become a Member", "Get Involved", "Donate", "Partner With Us", "Request Program Info"],
    offer_examples: ["Donation campaign", "Community program", "Volunteer pathway", "Partner initiative"],
    proof_examples: ["Impact stories", "Community photos", "Outcome metrics", "Partner logos"],
  },
];

const GENERAL_INDUSTRY_PROFILE: IndustryProfile = {
  industry_key: "general_business",
  industry_label: "General business",
  confidence: 0.42,
  reasoning: "No dominant industry pattern was detected; recommendations should stay tied to intake answers and public evidence.",
  primary_revenue_model: "Client or customer actions",
  default_audiences: ["Primary buyers", "High-intent leads", "Repeat customers"],
  default_ctas: ["Request Details", "Book a Consultation", "Request a Proposal", "Start a Project"],
  offer_examples: ["Entry offer", "Core offer", "Premium offer", "Long-term support path"],
  proof_examples: ["Customer proof", "Testimonials", "Work samples", "Clear delivery details"],
};

function buildCorpus(audit: AgentAuditRecord, evidence: AuditSocialEvidence[] = [], extra: string[] = []): string {
  return [
    audit.business_name,
    audit.website_link,
    audit.growth_goal,
    audit.current_blocker,
    audit.target_audience_belief,
    ...extra,
    ...evidence.map((row) => `${row.source_label ?? ""} ${row.normalized_observation} ${row.raw_observation ?? ""}`),
  ].map(clean).join(" ");
}

function inferIndustryProfile(audit: AgentAuditRecord, evidence: AuditSocialEvidence[], architecture?: StrategicResearchProfile["brand_architecture"]): IndustryProfile {
  const corpus = buildCorpus(audit, evidence, [
    architecture?.public_brand ?? "",
    architecture?.platform_brand ?? "",
    architecture?.sub_brands?.join(" ") ?? "",
  ]);
  const foodProfile = INDUSTRY_PROFILES.find((profile) => profile.industry_key === "food_hospitality");
  if (
    foodProfile &&
    /(spread bus|food bus|food truck|culinary|must[- ]try|food experience|flavorful|menu|catering|mobile food|street food)/i.test(corpus)
  ) {
    return {
      ...foodProfile,
      confidence: 0.88,
      reasoning: "Detected food/hospitality intent from food bus, culinary, menu, catering, or must-try food-experience language in the public evidence.",
    };
  }
  const nonprofitProfile = INDUSTRY_PROFILES.find((profile) => profile.industry_key === "nonprofit_church");
  if (
    nonprofitProfile &&
    /non[ -]?profit|501c|donat(e|ion|ions)|fundraising|foundation|volunteer|get involved|join (the )?community|online community|membership/i.test(corpus)
  ) {
    return {
      ...nonprofitProfile,
      confidence: 0.9,
      reasoning: "Detected nonprofit/community intent from donation, membership, volunteer, or community-join language in the intake/public evidence.",
    };
  }
  const scored = INDUSTRY_PROFILES
    .map((profile) => {
      const score = profile.patterns.reduce((sum, pattern) => {
        const matches = corpus.match(new RegExp(pattern.source, "gi")) ?? [];
        return sum + matches.length;
      }, 0);
      return { profile, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const winner = scored[0];
  if (!winner) return GENERAL_INDUSTRY_PROFILE;
  const confidenceScore = confidence(Math.min(0.92, 0.5 + (winner.score * 0.08)));
  return {
    ...winner.profile,
    confidence: confidenceScore,
    reasoning: `Detected from ${winner.score} intake/public evidence match${winner.score === 1 ? "" : "es"} for ${winner.profile.industry_label.toLowerCase()}.`,
  };
}

function collectNameCandidates(audit: AgentAuditRecord, sources: AgentSource[], evidence: AuditSocialEvidence[]): string[] {
  const fromSources = sources
    .filter((source) => !isThirdPartyDiscovery(source))
    .flatMap((source) => [
      source.source_label,
      source.handle,
      source.submitted_value,
    ])
    .filter(Boolean) as string[];
  const fromEvidence = evidence.flatMap((row) => [
    isThirdPartyDiscovery(row) ? "" : row.source_label,
    !isThirdPartyDiscovery(row) && row.source_url.includes("://") ? new URL(row.source_url).hostname.replace(/^www\./, "") : "",
  ]);
  return unique([
    clean(audit.business_name),
    ...fromSources.map(clean),
    ...fromEvidence.map(clean),
  ]).filter((name) => name && !/^https?:\/\//i.test(name));
}

function pickBrandArchitecture(audit: AgentAuditRecord, sources: AgentSource[], evidence: AuditSocialEvidence[]) {
  const candidates = collectNameCandidates(audit, sources, evidence);
  const official = clean(audit.business_name) || "Unnamed brand";
  const lowerCandidates = candidates.map((candidate) => candidate.toLowerCase());

  const parent = candidates.find((candidate) => /(group|holdings|company|llc|inc|media group)/i.test(candidate))
    ?? (/group|holdings|company|llc|inc|media group/i.test(official) ? official : null);
  const platform = candidates.find((candidate) =>
    /(network|media|tv|channel|podcast|show|studio)/i.test(candidate) && candidate.toLowerCase() !== (parent ?? "").toLowerCase()
  ) ?? null;
  const publicBrand = platform || candidates.find((candidate) => candidate.toLowerCase() !== (parent ?? "").toLowerCase()) || official;

  const rootTokens = unique(tokenize(official)).filter((token) => token.length > 3);
  const overlapScores = lowerCandidates.map((candidate) => {
    const tokens = tokenize(candidate);
    const overlap = tokens.filter((token) => rootTokens.includes(token)).length;
    return tokens.length ? overlap / tokens.length : 0;
  });
  const namingConsistencyScore = confidence(average(overlapScores.length ? overlapScores : [0.7]));
  const risk = Boolean(parent && platform && parent.toLowerCase() !== platform.toLowerCase() && namingConsistencyScore < 0.86);

  const note = risk
    ? `${parent} appears to be the parent company while ${platform} operates as the public media platform. Keep that distinction consistent in website headlines, social bios, and CTA language.`
    : `Public naming is mostly consistent around ${publicBrand}. Keep one naming hierarchy in headlines, bios, and conversion paths.`;

  const recommendedUsage = risk
    ? `Use "${parent}" for ownership/corporate context and "${platform}" for public-facing content distribution and audience growth.`
    : `Use "${publicBrand}" as the primary public brand, and keep legal/parent naming secondary unless required.`;

  return {
    official_business_name: official,
    public_brand: publicBrand,
    parent_brand: parent,
    platform_brand: platform,
    sub_brands: unique(candidates.filter((candidate) =>
      candidate.toLowerCase() !== official.toLowerCase() &&
      candidate.toLowerCase() !== (publicBrand ?? "").toLowerCase()
    )).slice(0, 8),
    interchangeable_name_risk: risk,
    naming_consistency_score: namingConsistencyScore,
    brand_architecture_notes: note,
    recommended_name_usage: recommendedUsage,
  };
}

function scoreRevenueSignals(corpus: string): Record<string, number> {
  const signalMap: Array<[string, RegExp]> = [
    ["Client services", /\b(service|client|agency|brand support|done for you)\b/i],
    ["Food truck sales", /\b(food truck|food bus|mobile food|mobile kitchen|street food|order|menu)\b/i],
    ["Catering and event bookings", /\b(cater|catering|private event|corporate event|party|festival|pop[- ]?up)\b/i],
    ["Local food experience", /\b(culinary|flavor|flavorful|must[- ]try|food experience|local diners?)\b/i],
    ["Photography sessions", /\b(photograph|photographer|photo shoot|photoshoot|portrait|headshot|wedding|pixieset|gallery)\b/i],
    ["Video production packages", /\b(video production|production package|filming|video package)\b/i],
    ["Event coverage", /\b(event coverage|recap|event video|event media)\b/i],
    ["Live streaming", /\b(live stream|livestream|broadcast)\b/i],
    ["Media retainers", /\b(retainer|monthly media|ongoing media)\b/i],
    ["Consulting", /\b(consulting|consultation|strategy session|advisory)\b/i],
    ["Sponsorships", /\b(sponsor|sponsorship|sponsored)\b/i],
    ["Digital ads", /\b(ad(s)?|advertising|campaign management)\b/i],
    ["YouTube monetization", /\b(youtube|subscriber|watch hours)\b/i],
    ["Licensing", /\b(license|licensing|rights)\b/i],
    ["Subscriptions", /\b(subscription|membership|member only)\b/i],
    ["Original content", /\b(original content|series|show|documentary|featured story)\b/i],
    ["Productized services", /\b(package|bundle|starter package|fixed scope)\b/i],
    ["Partnerships", /\b(partner|partnership|collaboration)\b/i],
  ];
  return signalMap.reduce<Record<string, number>>((acc, [label, pattern]) => {
    const matches = corpus.match(new RegExp(pattern.source, "gi")) ?? [];
    acc[label] = matches.length;
    return acc;
  }, {});
}

function pickBusinessModel(audit: AgentAuditRecord, evidence: AuditSocialEvidence[], industryProfile: IndustryProfile) {
  const productServiceEvidence = evidence.filter((item) => matchTerms(evidenceText(item), PRODUCT_SERVICE_PATTERNS).length > 0);
  const corpus = buildCorpus(audit, productServiceEvidence.length ? productServiceEvidence : evidence);
  const quality = computeIntelligenceQuality({ sources: [], evidence, industryProfile });
  const scores = scoreRevenueSignals(corpus);
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const primary = ranked.find(([, score]) => score > 0)?.[0] ?? industryProfile.primary_revenue_model;
  const secondary = ranked.filter(([, score]) => score > 0).slice(1, 6).map(([label]) => label);
  const opportunities = unique([
    industryProfile.industry_key === "food_hospitality"
      ? "Make the menu, location/route, and event booking path instantly clear before asking people to convert."
      : `Build the primary offer path around the clearest observed buyer action, not a generic CTA.`,
    primary === "Food truck sales" || secondary.includes("Food truck sales")
      ? "Clarify where customers can find the truck, what to order first, and how to follow the next stop."
      : "",
    primary === "Catering and event bookings" || secondary.includes("Catering and event bookings")
      ? "Create a separate event/catering path for people who want the bus at a private or corporate event."
      : "",
    primary === "Local food experience" || secondary.includes("Local food experience")
      ? "Turn review language into proof: what makes the food experience memorable, repeatable, and worth sharing."
      : "",
    primary === "Photography sessions" || secondary.includes("Photography sessions")
      ? "Package photo shoots by audience, occasion, deliverables, and turnaround."
      : "",
    primary === "Video production packages" || secondary.includes("Video production packages")
      ? "Package production offers by event size and distribution goals."
      : "",
    primary === "Event coverage" || secondary.includes("Event coverage")
      ? "Add a recurring event coverage CTA tied to turnaround time and deliverables."
      : "",
    secondary.includes("Live streaming") || /live stream/i.test(corpus)
      ? "Create a live-stream upsell with replay, clips, and sponsor slots."
      : "",
    secondary.includes("Sponsorships") || /sponsor/i.test(corpus)
      ? "Sell sponsor placements by audience segment, not only by generic exposure."
      : "",
    /documentary|series|original content/i.test(corpus)
      ? "Monetize original content through distribution partnerships and branded series sponsorship."
      : "",
    "Separate high-intent buyers, browsers, and repeat audiences into distinct conversion paths.",
  ]);
  const gaps = unique([
    /pricing|package|quote|book|request/i.test(corpus) ? "" : "Public sources do not clearly show purchasable offer paths.",
    /sponsor|partner/i.test(corpus) ? "" : "Sponsorship and partner pathways are not explicit yet.",
    /case stud(y|ies)|testimonial|client/i.test(corpus) ? "" : "Revenue model proof is missing from visible trust signals.",
  ]);
  const risk: Severity = gaps.length >= 3 ? "high" : gaps.length >= 1 ? "medium" : "low";
  const summary = quality.product_service_confidence < 0.45
    ? `${clean(audit.business_name) || "This brand"} has weak product/service evidence in the current sources. Treat ${primary.toLowerCase()} as a working hypothesis, not a confirmed business model.`
    : `${clean(audit.business_name) || "This brand"} appears to operate as ${primary.toLowerCase()}${secondary.length ? ` with secondary streams in ${secondary.join(", ").toLowerCase()}` : ""}.`;
  return {
    primary_revenue_model: primary,
    secondary_revenue_models: secondary,
    revenue_opportunities: opportunities,
    unclear_revenue_gaps: gaps,
    business_model_summary: summary,
    business_model_risk: risk,
    recommended_revenue_focus: opportunities[0] ?? "Clarify the primary monetization path on website and social CTAs.",
  };
}

function pickOfferLadder(
  businessModel: StrategicResearchProfile["business_model"],
  architecture: StrategicResearchProfile["brand_architecture"],
  industryProfile: IndustryProfile,
  evidence: AuditSocialEvidence[],
) {
  const corpus = buildCorpus(
    {
      id: "",
      lead_key: "",
      business_name: architecture.public_brand,
      website_link: null,
      growth_goal: null,
      current_blocker: null,
      target_audience_belief: null,
      intent: null,
    },
    evidence,
    [
      businessModel.primary_revenue_model,
      ...businessModel.secondary_revenue_models,
      industryProfile.industry_label,
    ],
  );
  const offers = industryProfile.offer_examples.length >= 4
    ? industryProfile.offer_examples
    : [...industryProfile.offer_examples, ...GENERAL_INDUSTRY_PROFILE.offer_examples].slice(0, 4);
  const entry = offers[0] ?? "Entry offer";
  const core = offers[1] ?? "Core offer";
  const premium = offers[2] ?? "Premium offer";
  const platform = offers[3] ?? "Long-term support path";
  const contextualCtas = buildContextualCtas(industryProfile, corpus);
  const offerCtas = unique([...contextualCtas, ...industryProfile.default_ctas, ...GENERAL_INDUSTRY_PROFILE.default_ctas]);
  return {
    entry_offer: entry,
    core_offer: core,
    premium_offer: premium,
    platform_offer: platform,
    long_term_monetization_path: businessModel.recommended_revenue_focus,
    offer_ctas: offerCtas,
    recommended_offer_ladder: [entry, core, premium, platform],
    missing_offers: businessModel.unclear_revenue_gaps.length ? ["Public pricing/packaging clarity", "Proof-linked CTA for each offer tier"] : [],
    offer_positioning_notes: industryProfile.industry_key === "food_hospitality"
      ? `Map ${architecture.public_brand}'s food experience into clear paths: what to try first, where to find it, and how to book it for an event.`
      : `Map each ${industryProfile.industry_label.toLowerCase()} offer tier to one audience and one CTA to avoid offer confusion for ${architecture.public_brand}.`,
  };
}

function buildContextualCtas(industryProfile: IndustryProfile, corpus: string): string[] {
  const lower = corpus.toLowerCase();
  if (industryProfile.industry_key === "food_hospitality") {
    return unique([
      /menu|dish|food|cuisine|culinary|flavor/i.test(lower) ? "View the Menu" : "",
      /truck|bus|mobile|pop[- ]?up|vendor/i.test(lower) ? "Find the Bus" : "",
      /cater|event|party|corporate|private/i.test(lower) ? "Book The Bus for an Event" : "",
      /order|buy|sold out/i.test(lower) ? "Order Now" : "",
      /review|must[- ]try|favorite|best/i.test(lower) ? "See What People Are Ordering" : "",
      "Follow the Next Stop",
    ]);
  }
  if (industryProfile.industry_key === "media_production") {
    return unique([
      /event|recap|coverage/i.test(lower) ? "Book Event Coverage" : "",
      /live ?stream/i.test(lower) ? "Request Live Stream Coverage" : "",
      /sponsor|partner/i.test(lower) ? "View Sponsor Opportunities" : "",
      "View Recent Work",
    ]);
  }
  if (industryProfile.industry_key === "retail_ecommerce") {
    return unique([
      /drop|limited/i.test(lower) ? "Claim the Drop" : "",
      /bundle|collection/i.test(lower) ? "Shop the Collection" : "",
      "Shop Best Sellers",
      "Join the List",
    ]);
  }
  return [];
}

function pickAudience(
  audit: AgentAuditRecord,
  architecture: StrategicResearchProfile["brand_architecture"],
  offerLadder: StrategicResearchProfile["offer_ladder"],
  industryProfile: IndustryProfile,
  evidence: AuditSocialEvidence[],
) {
  const quality = computeIntelligenceQuality({ sources: [], evidence, industryProfile });
  const submittedAudience = clean(audit.target_audience_belief);
  const primaryAudience = submittedAudience && submittedAudience.length > 3
    ? submittedAudience
    : industryProfile.default_audiences[0] ?? "Primary buyers";
  const audienceNames = unique([
    primaryAudience,
    ...industryProfile.default_audiences,
    "Warm prospects",
    "Repeat or referral audience",
  ]).slice(0, 5);
  const baseSegments: AudienceSegmentProfile[] = audienceNames.map((segmentName, index) => ({
    segment_name: segmentName,
    wants: index === 0
      ? `A clear reason to trust ${architecture.public_brand} and take the next step.`
      : "Clear proof, simple options, and low-friction next steps.",
    fears: "Wasting time, money, or attention on an offer that is not clearly matched to their need.",
    compares_against: `Other ${industryProfile.industry_label.toLowerCase()} options, referrals, and visible online proof.`,
    proof_needed: industryProfile.proof_examples[index % industryProfile.proof_examples.length] ?? "Relevant proof and clear delivery expectations.",
    best_cta: offerLadder.offer_ctas[index % offerLadder.offer_ctas.length] ?? "Request Details",
    message_angle: index === 0
      ? `Make ${architecture.public_brand} feel like the obvious choice for ${primaryAudience}.`
      : `Show why this offer fits ${segmentName} better than a generic alternative.`,
    urgency_level: index === 0 ? "high" : index <= 2 ? "medium" : "low",
    conversion_likelihood: index === 0 ? "high" : index <= 2 ? "medium" : "low",
  }));

  const confusionRisk: Severity =
    architecture.interchangeable_name_risk || clean(audit.target_audience_belief).length < 50 || quality.audience_reaction_confidence < 0.45 ? "high" : "medium";
  return {
    audience_segments: baseSegments,
    primary_buyer: baseSegments[0]?.segment_name ?? "Primary buyers",
    secondary_buyer: baseSegments[1]?.segment_name ?? "Warm prospects",
    viewer_segment: baseSegments[2]?.segment_name ?? "Browsers",
    sponsor_segment: baseSegments.find((segment) => /sponsor|partner|donor/i.test(segment.segment_name))?.segment_name ?? baseSegments[1]?.segment_name ?? "Partners",
    audience_confusion_risk: confusionRisk,
    audience_priority_recommendation:
      quality.audience_reaction_confidence < 0.45
        ? `Audience reaction is weakly supported by the current sources. Validate who is actually responding before locking the primary buyer. Start with ${baseSegments[0]?.segment_name ?? "the clearest buyer"} as a hypothesis.`
        : `Prioritize ${baseSegments[0]?.segment_name ?? "the clearest buyer"} first, then route other audiences to distinct next steps based on intent.`,
  };
}

function pickCulturalContext(audit: AgentAuditRecord, evidence: AuditSocialEvidence[]) {
  const corpus = [
    audit.business_name,
    audit.website_link,
    audit.growth_goal,
    audit.target_audience_belief,
    ...evidence.map((row) => `${row.normalized_observation} ${row.raw_observation ?? ""}`),
  ].join(" ").toLowerCase();
  const localSignals = unique([
    /southeast texas|beaumont/.test(corpus) ? "Southeast Texas identity" : "",
    /\bsports?\b/.test(corpus) ? "Sports culture relevance" : "",
    /\bchurch|faith\b/.test(corpus) ? "Church and faith influence" : "",
    /\bblack\b/.test(corpus) ? "Black entrepreneurship context" : "",
    /\bcommunity|local\b/.test(corpus) ? "Community storytelling orientation" : "",
    /\blegacy|history|memory\b/.test(corpus) ? "Legacy and memory preservation" : "",
  ]);
  const summary = localSignals.length
    ? `The brand carries cultural context beyond production deliverables: ${localSignals.join(", ").toLowerCase()}.`
    : "Cultural signals exist but are not yet explicit in public messaging.";
  return {
    cultural_context_summary: summary,
    local_identity_signals: localSignals,
    community_relevance: "The audience appears to value representation, local credibility, and memory-centered storytelling.",
    emotional_drivers: unique([
      "Visibility",
      "Pride",
      "Ownership",
      "Belonging",
      "Legacy",
    ]),
    cultural_risk: localSignals.length
      ? "If messaging becomes generic, the brand can lose the cultural authority that makes it trusted locally."
      : "Cultural narrative is under-articulated, which weakens emotional connection.",
    cultural_opportunity:
      "Position the brand as a culture-first media and production platform that protects community memory while driving business outcomes.",
    language_to_use: [
      "culture-first storytelling",
      "community visibility",
      "regional pride",
      "proof-driven production",
      "legacy documentation",
    ],
    language_to_avoid: [
      "generic content creation",
      "one-size-fits-all marketing",
      "vague awareness campaign",
    ],
  };
}

function pickProofInventory(evidence: AuditSocialEvidence[], industryProfile: IndustryProfile) {
  const proofRows = evidence
    .filter((row) => ["trust_signals", "visual_identity", "content_consistency", "engagement_quality", "authority"].includes(row.evidence_category))
    .sort((a, b) => b.confidence_score - a.confidence_score);
  const proofAssets = unique(proofRows.slice(0, 12).map((row) => row.source_label || row.source_url));
  const strongest = unique(proofRows.slice(0, 5).map((row) => sentence(row.normalized_observation)));
  const hasTestimonials = proofRows.some((row) => /testimonial|review|client/.test(`${row.normalized_observation} ${row.raw_observation ?? ""}`.toLowerCase()));
  const hasCaseStudy = proofRows.some((row) => /case stud(y|ies)|project/.test(`${row.normalized_observation} ${row.raw_observation ?? ""}`.toLowerCase()));
  const missing = unique([
    hasTestimonials ? "" : "Testimonial clips and direct quote proof",
    hasCaseStudy ? "" : "Case-study style pages with outcomes and deliverables",
    ...industryProfile.proof_examples,
  ]);
  return {
    proof_assets: proofAssets,
    strongest_proof_points: strongest.length ? strongest : ["Public proof exists but needs stronger hierarchy and placement."],
    missing_proof_points: missing,
    credibility_markers: unique([
      `${industryProfile.industry_label} expertise`,
      "Clear delivery expectations",
      "Visible audience engagement",
      "Repeat customer or client proof",
    ]),
    recommended_case_studies: industryProfile.offer_examples.map((offer) => `${offer} proof story with outcome and delivery details`).slice(0, 4),
    recommended_homepage_proof: unique([...industryProfile.proof_examples, "Primary offer proof block", "Customer or client quote"]),
    authority_risk: missing.length >= 3 ? "high" : "medium",
  };
}

function detectCurrentCta(corpus: string): string {
  const patterns: Array<[RegExp, string]> = [
    [/book (a )?(photo shoot|photoshoot|portrait|headshot|photography session)|ask about availability|request pricing/i, "Book a Photo Shoot"],
    [/book a strategy session|strategy session/i, "Book a Strategy Session"],
    [/book a production consultation|production consultation/i, "Book a Production Consultation"],
    [/request event coverage|event coverage/i, "Request Event Coverage"],
    [/submit a story|submit story/i, "Submit a Story"],
    [/join the community|become a member|membership|member sign up|community/i, "Join the Community"],
    [/volunteer|get involved/i, "Get Involved"],
    [/donate|donor|fundraising/i, "Donate"],
    [/sponsor a series|sponsorship/i, "Sponsor a Series"],
    [/partner with/i, "Partner With Us"],
    [/get featured/i, "Get Featured"],
    [/contact us|contact/i, "Contact Us"],
  ];
  return patterns.find(([pattern]) => pattern.test(corpus))?.[1] ?? "Not clearly defined";
}

function selectPrimaryCta(ctas: string[], industryProfile: IndustryProfile, corpus: string): string {
  if (industryProfile.industry_key === "food_hospitality") {
    if (/cater|event|party|corporate|private/i.test(corpus)) {
      const event = ctas.find((cta) => /event|cater/i.test(cta));
      if (event) return event;
    }
    if (/truck|bus|mobile|pop[- ]?up|vendor/i.test(corpus)) {
      const location = ctas.find((cta) => /find|stop|bus/i.test(cta));
      if (location) return location;
    }
    if (/menu|dish|food|cuisine|culinary|flavor|must[- ]try/i.test(corpus)) {
      const menu = ctas.find((cta) => /menu|order|ordering/i.test(cta));
      if (menu) return menu;
    }
  }
  if (/donor|fundraising|donate/i.test(corpus) && !/join|community|member|membership|volunteer|get involved/i.test(corpus)) {
    const donate = ctas.find((cta) => /donate|donor/i.test(cta));
    if (donate) return donate;
  }
  if (/nonprofit|community|join|member|membership|volunteer|get involved/i.test(corpus)) {
    const join = ctas.find((cta) => /join|member|get involved|volunteer/i.test(cta));
    if (join) return join;
  }
  if (/catering|event planner|corporate event/i.test(corpus)) {
    const catering = ctas.find((cta) => /catering|event/i.test(cta));
    if (catering) return catering;
  }
  if (/donor|fundraising|donate/i.test(corpus)) {
    const donate = ctas.find((cta) => /donate|donor/i.test(cta));
    if (donate) return donate;
  }
  if (/appointment|facial|salon|spa|therapy|massage|session/i.test(corpus)) {
    const appointment = ctas.find((cta) => /appointment|book/i.test(cta));
    if (appointment) return appointment;
  }
  if (/pricing|quote|proposal|estimate/i.test(corpus)) {
    const quote = ctas.find((cta) => /pricing|quote|proposal|estimate/i.test(cta));
    if (quote) return quote;
  }
  if (/portfolio|gallery|work|case stud/i.test(corpus)) {
    const proof = ctas.find((cta) => /portfolio|work|case/i.test(cta));
    if (proof) return proof;
  }
  return ctas[0] ?? industryProfile.default_ctas[0] ?? "Request Details";
}

function pickConversionPath(
  audit: AgentAuditRecord,
  businessModel: StrategicResearchProfile["business_model"],
  offerLadder: StrategicResearchProfile["offer_ladder"],
  audience: StrategicResearchProfile["audience"],
  evidence: AuditSocialEvidence[],
  industryProfile: IndustryProfile,
) {
  const corpus = [
    audit.intent,
    audit.growth_goal,
    audit.current_blocker,
    ...evidence.map((row) => `${row.normalized_observation} ${row.raw_observation ?? ""}`),
  ].join(" ");
  const currentCta = detectCurrentCta(corpus);
  const ctaOptions = unique([...buildContextualCtas(industryProfile, corpus), ...offerLadder.offer_ctas, ...industryProfile.default_ctas]);
  const quality = computeIntelligenceQuality({ sources: [], evidence, industryProfile });
  const primary = selectPrimaryCta(ctaOptions, industryProfile, corpus);
  const secondary = unique([
    ...ctaOptions,
    ...industryProfile.default_ctas.filter((cta) => cta.toLowerCase() !== primary.toLowerCase()),
  ]).filter((cta) => cta.toLowerCase() !== primary.toLowerCase()).slice(0, 6);
  const byAudience = audience.audience_segments.map((segment) => ({ audience: segment.segment_name, cta: segment.best_cta }));
  const gaps = unique([
    currentCta === "Not clearly defined" ? "Primary CTA is not obvious across website/social." : "",
    quality.buy_factor_confidence < 0.45 ? "Buying signals are weak; confirm whether people can actually order, book, reserve, or request the core offer." : "",
    "Offer-specific landing pages are missing or unclear.",
    "Audience segments are not routed to dedicated next steps.",
    /strategy session|request a proposal/i.test(currentCta) && !["professional_services", "general_business"].includes(industryProfile.industry_key)
      ? `Current CTA is strategy-led, but evidence points toward ${industryProfile.industry_label.toLowerCase()}.`
      : "",
  ]);
  return {
    current_cta: currentCta,
    cta_matches_business_model: currentCta !== "Not clearly defined" && currentCta.toLowerCase() === primary.toLowerCase(),
    recommended_primary_cta: primary,
    recommended_secondary_ctas: secondary,
    cta_by_audience: byAudience,
    conversion_path_summary:
      quality.buy_factor_confidence < 0.45
        ? `Buy-factor evidence is weak. Before recommending a final CTA, confirm the actual product/service, buying path, and audience response. Working CTA hypothesis: ${primary}.`
        : `The conversion path should route audiences to outcomes that match ${industryProfile.industry_label.toLowerCase()}. Primary CTA: ${primary}. Secondary CTAs should support different intent levels without clutter.`,
    conversion_gaps: gaps,
    recommended_landing_paths: unique([
      `${primary} landing page with clear deliverables and turnaround`,
      "Sponsor and partner page with audience context and placement options",
      "Story submission path for subject/community participation",
      "Proof library with case studies and featured work",
    ]),
    best_next_step: `Deploy ${primary} as the hero CTA, then pair each audience segment with one secondary CTA and one proof block.`,
  };
}

function pickContentToRevenue(evidence: AuditSocialEvidence[]) {
  const corpus = evidence.map((row) => `${row.normalized_observation} ${row.raw_observation ?? ""}`).join(" ").toLowerCase();
  const categories = unique([
    /awareness|discover|new audience|reach/.test(corpus) ? "Awareness content" : "",
    /proof|testimonial|result|case study/.test(corpus) ? "Proof content" : "",
    /book|quote|request|cta|contact/.test(corpus) ? "Sales content" : "",
    /community|story|local|culture/.test(corpus) ? "Community-building content" : "",
    /sponsor|partnership/.test(corpus) ? "Sponsorship content" : "",
    /team|hiring|join/.test(corpus) ? "Recruitment content" : "",
    /series|show|channel|subscriber|platform/.test(corpus) ? "Platform growth content" : "",
  ]);
  const map = [
    {
      content_type: "Awareness content",
      revenue_path: "Grow local visibility, then route high-intent audiences to offer-specific pages.",
      why_it_matters: "Awareness alone does not monetize until paired with a direct conversion step.",
    },
    {
      content_type: "Proof content",
      revenue_path: "Use recaps, reels, and case-style clips to increase booking confidence.",
      why_it_matters: "Proof reduces hesitation and supports higher-value offers.",
    },
    {
      content_type: "Sponsorship content",
      revenue_path: "Create sponsor-ready series packages with audience context.",
      why_it_matters: "Sponsor-ready formats turn platform growth into recurring revenue.",
    },
    {
      content_type: "Platform growth content",
      revenue_path: "Build repeat audiences that support sponsorship, partnerships, and licensing.",
      why_it_matters: "Audience growth increases long-term monetization leverage.",
    },
  ];
  return {
    content_categories: categories.length ? categories : ["Awareness content", "Proof content", "Sales content"],
    content_revenue_map: map,
    best_content_to_monetize: unique([
      "Event recap videos tied to coverage booking CTA",
      "Live stream highlights tied to sponsor/partner CTA",
      "Feature-story clips tied to submit-story and get-featured CTA",
      "Documentary teasers tied to sponsor/distribution CTA",
    ]),
    missing_content_types: unique([
      "Offer-specific sales assets",
      "Case-study format proof posts",
      "Sponsor-facing media kit content",
    ]),
    recommended_content_sequence: [
      "Awareness story",
      "Proof clip",
      "Offer explanation",
      "Direct CTA",
      "Follow-up trust proof",
    ],
    platform_growth_opportunities: unique([
      "Series-based programming with recurring sponsor inventory",
      "Cross-post strategy that points audiences to owned landing pages",
      "Community feature format that increases submissions and partner trust",
    ]),
  };
}

function buildHeuristicSummary(profile: Omit<StrategicResearchProfile, "strategist_summary">): StrategicResearchProfile["strategist_summary"] {
  const quality = profile.intelligence_quality;
  if (quality.source_strength === "low") {
    return {
      strategist_summary:
        `${quality.source_quality_summary} Current sources are not strong enough to support confident business-growth claims. Use this as meeting prep: validate products/services, actual buyer reaction, and the buy path before making recommendations.`,
      top_opportunity:
        "Use the Strategy Session to confirm the real offer, best-selling product/service, and customer buying path before building the growth plan.",
      top_risk:
        quality.confidence_cap_reason ?? "The available sources may describe visibility, but they do not yet prove what people buy or why they buy it.",
      recommended_priority:
        "Collect owner-confirmed offer details, customer reaction proof, and one direct conversion path before treating the intelligence as strategy-ready.",
      next_3_moves: [
        "Confirm the core product/service and what buyers actually pay for.",
        "Ask for proof of audience reaction: reviews, repeat purchases, comments, DMs, bookings, orders, or referrals.",
        "Map the buy factor: what makes someone decide to order, book, reserve, or request the offer.",
      ],
    };
  }
  const opportunity = profile.business_model.revenue_opportunities[0]
    ?? "Create a clearer conversion path from public content to paid offers.";
  const topRisk = profile.brand_architecture.interchangeable_name_risk
    ? "Parent and platform names are blending, which can confuse trust and buying intent."
    : profile.conversion_path.conversion_gaps[0] ?? "Conversion and offer pathways are still too broad.";
  return {
    strategist_summary: `${profile.brand_architecture.brand_architecture_notes} ${profile.industry_profile.reasoning} ${profile.business_model.business_model_summary} ${profile.cultural_context.cultural_context_summary}`,
    top_opportunity: opportunity,
    top_risk: topRisk,
    recommended_priority: profile.conversion_path.best_next_step,
    next_3_moves: unique([
      "Clarify brand architecture and naming hierarchy across website and social bios.",
      `Launch ${profile.conversion_path.recommended_primary_cta} as the primary action with proof placed directly above it.`,
      "Build a proof-led content sequence that maps each audience to one CTA and one offer tier.",
    ]).slice(0, 3),
  };
}

export async function buildHumanStrategistSummaryWithModel(
  profile: Omit<StrategicResearchProfile, "strategist_summary">,
): Promise<StrategicResearchProfile["strategist_summary"]> {
  const openAiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
  if (!openAiKey) return buildHeuristicSummary(profile);
  try {
    const prompt = [
      "You are a senior brand and revenue strategist.",
      "Use the structured profile JSON below and return strict JSON with keys:",
      "strategist_summary, top_opportunity, top_risk, recommended_priority, next_3_moves",
      "The writing should be concise, business-aware, and culturally intelligent.",
      "Internal law: all recommendations must support a 5x growth goal in 3 months, but only after baseline metrics and capacity are verified.",
      "Critical rule: if intelligence_quality.source_strength is low or product_service_confidence/audience_reaction_confidence/buy_factor_confidence are weak, do not overstate conclusions. Frame them as hypotheses and recommend validation in the Strategy Session.",
      "Focus specifically on: confirmed products/services, audience reaction to those offers, and buy-factor signals that indicate whether people can or will purchase.",
      "Do not use generic CTAs like Request a Proposal unless the business is clearly B2B/professional services. Recommend CTAs that match the actual product/service and customer behavior found in evidence.",
      JSON.stringify(profile),
    ].join("\n");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!response.ok) return buildHeuristicSummary(profile);
    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = payload.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const moves = Array.isArray(parsed.next_3_moves) ? parsed.next_3_moves.map((item) => clean(item)).filter(Boolean) : [];
    return {
      strategist_summary: clean(parsed.strategist_summary) || buildHeuristicSummary(profile).strategist_summary,
      top_opportunity: clean(parsed.top_opportunity) || buildHeuristicSummary(profile).top_opportunity,
      top_risk: clean(parsed.top_risk) || buildHeuristicSummary(profile).top_risk,
      recommended_priority: clean(parsed.recommended_priority) || buildHeuristicSummary(profile).recommended_priority,
      next_3_moves: moves.length ? moves.slice(0, 3) : buildHeuristicSummary(profile).next_3_moves,
    };
  } catch {
    return buildHeuristicSummary(profile);
  }
}

export async function buildStrategicResearchProfile(input: {
  audit: AgentAuditRecord;
  sources: AgentSource[];
  evidence: AuditSocialEvidence[];
}): Promise<StrategicResearchProfile> {
  const brandArchitecture = pickBrandArchitecture(input.audit, input.sources, input.evidence);
  const industryProfile = inferIndustryProfile(input.audit, input.evidence, brandArchitecture);
  const businessModel = pickBusinessModel(input.audit, input.evidence, industryProfile);
  const offerLadder = pickOfferLadder(businessModel, brandArchitecture, industryProfile, input.evidence);
  const audience = pickAudience(input.audit, brandArchitecture, offerLadder, industryProfile, input.evidence);
  const culturalContext = pickCulturalContext(input.audit, input.evidence);
  const proofInventory = pickProofInventory(input.evidence, industryProfile);
  const conversionPath = pickConversionPath(input.audit, businessModel, offerLadder, audience, input.evidence, industryProfile);
  const contentToRevenue = pickContentToRevenue(input.evidence);
  const intelligenceQuality = computeIntelligenceQuality({
    sources: input.sources,
    evidence: input.evidence,
    industryProfile,
  });
  const growthSnapshot = buildGrowthSnapshot({
    audit: input.audit,
    sources: input.sources,
    evidence: input.evidence,
    industryProfile,
    businessModel,
    conversionPath,
  });
  const profileWithoutSummary = {
    brand_architecture: brandArchitecture,
    industry_profile: industryProfile,
    business_model: businessModel,
    offer_ladder: offerLadder,
    audience,
    cultural_context: culturalContext,
    proof_inventory: proofInventory,
    conversion_path: conversionPath,
    content_to_revenue: contentToRevenue,
    intelligence_quality: intelligenceQuality,
    growth_snapshot: growthSnapshot,
  };
  const strategistSummary = await buildHumanStrategistSummaryWithModel(profileWithoutSummary);
  return {
    ...profileWithoutSummary,
    strategist_summary: strategistSummary,
  };
}

