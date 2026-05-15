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
};

type SegmentUrgency = "low" | "medium" | "high";
type ConversionLikelihood = "low" | "medium" | "high";

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
      return 0.66;
    case "manual_admin_note":
      return 0.7;
    case "screenshot":
      return 0.74;
    default:
      return 0.62;
  }
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

function collectNameCandidates(audit: AgentAuditRecord, sources: AgentSource[], evidence: AuditSocialEvidence[]): string[] {
  const fromSources = sources.flatMap((source) => [
    source.source_label,
    source.handle,
    source.submitted_value,
  ]).filter(Boolean) as string[];
  const fromEvidence = evidence.flatMap((row) => [
    row.source_label,
    row.source_url.includes("://") ? new URL(row.source_url).hostname.replace(/^www\./, "") : "",
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

function pickBusinessModel(audit: AgentAuditRecord, evidence: AuditSocialEvidence[]) {
  const corpus = [
    audit.business_name,
    audit.growth_goal,
    audit.current_blocker,
    audit.target_audience_belief,
    ...evidence.map((row) => `${row.normalized_observation} ${row.raw_observation ?? ""}`),
  ].map(clean).join(" ");
  const scores = scoreRevenueSignals(corpus);
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const primary = ranked.find(([, score]) => score > 0)?.[0] ?? "Client services";
  const secondary = ranked.filter(([, score]) => score > 0).slice(1, 6).map(([label]) => label);
  const opportunities = unique([
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
    "Separate service buyers, viewers, sponsors, and partners into distinct conversion paths.",
  ]);
  const gaps = unique([
    /pricing|package|quote|book|request/i.test(corpus) ? "" : "Public sources do not clearly show purchasable offer paths.",
    /sponsor|partner/i.test(corpus) ? "" : "Sponsorship and partner pathways are not explicit yet.",
    /case stud(y|ies)|testimonial|client/i.test(corpus) ? "" : "Revenue model proof is missing from visible trust signals.",
  ]);
  const risk: Severity = gaps.length >= 3 ? "high" : gaps.length >= 1 ? "medium" : "low";
  const summary = `${clean(audit.business_name) || "This brand"} appears to operate as ${primary.toLowerCase()}${secondary.length ? ` with secondary streams in ${secondary.join(", ").toLowerCase()}` : ""}.`;
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

function pickOfferLadder(businessModel: StrategicResearchProfile["business_model"], architecture: StrategicResearchProfile["brand_architecture"]) {
  const mediaLike = /media|network|studio|production/i.test([architecture.public_brand, architecture.platform_brand].filter(Boolean).join(" "));
  const entry = mediaLike ? "Event recap, interview package, short-form content bundle" : "Starter offer with one clear deliverable";
  const core = mediaLike ? "Full event coverage, branded video package, campaign content package" : "Core service package tied to recurring client outcomes";
  const premium = mediaLike ? "Live stream production, documentary project, media retainer" : "Premium high-touch strategic implementation";
  const platform = mediaLike
    ? "Sponsor a series, partner with the platform, original show placement, exclusive feature"
    : "Partnership placement, sponsored content, or strategic alliance package";
  const offerCtas = mediaLike
    ? [
      "Request Event Coverage",
      "Book a Production Consultation",
      "Request a Live Stream Quote",
      "Sponsor a Series",
      "Partner With Us",
      "Submit a Story",
      "Get Featured",
    ]
    : [
      "Book a Consultation",
      "Request a Proposal",
      "Start a Project",
      "Partner With Us",
    ];
  return {
    entry_offer: entry,
    core_offer: core,
    premium_offer: premium,
    platform_offer: platform,
    long_term_monetization_path: businessModel.recommended_revenue_focus,
    offer_ctas: offerCtas,
    recommended_offer_ladder: [entry, core, premium, platform],
    missing_offers: businessModel.unclear_revenue_gaps.length ? ["Public pricing/packaging clarity", "Proof-linked CTA for each offer tier"] : [],
    offer_positioning_notes: "Map each offer tier to one audience and one CTA to avoid offer confusion.",
  };
}

function pickAudience(audit: AgentAuditRecord, architecture: StrategicResearchProfile["brand_architecture"], offerLadder: StrategicResearchProfile["offer_ladder"]) {
  const baseSegments: AudienceSegmentProfile[] = [
    {
      segment_name: "Buyer audience",
      wants: "Reliable media outcomes, fast communication, and clear deliverables.",
      fears: "Paying for content that does not convert or represent them well.",
      compares_against: "Local production teams and marketing agencies.",
      proof_needed: "Before/after examples, case studies, and timeline clarity.",
      best_cta: offerLadder.offer_ctas[0] ?? "Request a Proposal",
      message_angle: "We capture your moments and convert them into business visibility.",
      urgency_level: "high",
      conversion_likelihood: "high",
    },
    {
      segment_name: "Viewer audience",
      wants: "Relevant local stories, sports culture, and community moments.",
      fears: "Generic coverage that does not represent local identity.",
      compares_against: "Regional media pages and short-form creators.",
      proof_needed: "Consistent quality reels and community engagement.",
      best_cta: "Watch Latest Stories",
      message_angle: "Stories that document local culture with pride and quality.",
      urgency_level: "medium",
      conversion_likelihood: "medium",
    },
    {
      segment_name: "Subject audience",
      wants: "Visibility, respectful storytelling, and quality production.",
      fears: "Being covered without context or quality.",
      compares_against: "Independent creators and local outlets.",
      proof_needed: "Featured projects, interview quality, and distribution examples.",
      best_cta: "Submit a Story",
      message_angle: "Your story deserves professional coverage and long-term visibility.",
      urgency_level: "medium",
      conversion_likelihood: "medium",
    },
    {
      segment_name: "Sponsor audience",
      wants: "Brand-safe reach, consistent placements, and audience trust.",
      fears: "Paying for sponsorship with unclear audience outcomes.",
      compares_against: "Radio, local influencers, and event sponsorship packages.",
      proof_needed: "Audience context, sponsor case studies, and placement options.",
      best_cta: "Sponsor a Series",
      message_angle: "Align your brand with trusted cultural storytelling.",
      urgency_level: "medium",
      conversion_likelihood: "medium",
    },
    {
      segment_name: "Partner audience",
      wants: "Reliable distribution, co-production, and strategic alignment.",
      fears: "Partnerships with unclear brand structure and deliverables.",
      compares_against: "Local media networks and agency partner programs.",
      proof_needed: "Partnership outcomes and clear collaboration pathways.",
      best_cta: "Partner With Us",
      message_angle: "We bring production quality and cultural credibility to partnerships.",
      urgency_level: "medium",
      conversion_likelihood: "medium",
    },
    {
      segment_name: "Community audience",
      wants: "Representation, memory, and ownership of local stories.",
      fears: "Their community voice being ignored or misrepresented.",
      compares_against: "Word-of-mouth and grassroots social pages.",
      proof_needed: "Visible community moments and trusted local voices.",
      best_cta: "Get Featured",
      message_angle: "Community stories deserve quality documentation and reach.",
      urgency_level: "low",
      conversion_likelihood: "low",
    },
  ];

  const confusionRisk: Severity =
    architecture.interchangeable_name_risk || clean(audit.target_audience_belief).length < 50 ? "high" : "medium";
  return {
    audience_segments: baseSegments,
    primary_buyer: "Buyer audience",
    secondary_buyer: "Sponsor audience",
    viewer_segment: "Viewer audience",
    sponsor_segment: "Sponsor audience",
    audience_confusion_risk: confusionRisk,
    audience_priority_recommendation:
      "Prioritize Buyer and Sponsor audiences first, then route Viewer/Subject traffic to distinct non-sales CTAs.",
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

function pickProofInventory(evidence: AuditSocialEvidence[]) {
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
    "Partner/institution logos near primary CTAs",
    "Homepage proof reel that links content to revenue outcomes",
  ]);
  return {
    proof_assets: proofAssets,
    strongest_proof_points: strongest.length ? strongest : ["Public proof exists but needs stronger hierarchy and placement."],
    missing_proof_points: missing,
    credibility_markers: unique([
      "Production quality consistency",
      "Recognizable local organizations and people",
      "Repeat coverage themes",
      "Visible audience engagement",
    ]),
    recommended_case_studies: [
      "Event recap to booked follow-up client workflow",
      "Live stream project with sponsor or partner outcomes",
      "Feature story with measurable community reach",
    ],
    recommended_homepage_proof: [
      "Production reel",
      "Event recap samples",
      "Live stream highlights",
      "Documentary/project spotlight",
      "Client and partner logos",
      "Testimonial clips",
    ],
    authority_risk: missing.length >= 3 ? "high" : "medium",
  };
}

function detectCurrentCta(corpus: string): string {
  const patterns: Array<[RegExp, string]> = [
    [/book a strategy session|strategy session/i, "Book a Strategy Session"],
    [/book a production consultation|production consultation/i, "Book a Production Consultation"],
    [/request event coverage|event coverage/i, "Request Event Coverage"],
    [/submit a story|submit story/i, "Submit a Story"],
    [/sponsor a series|sponsorship/i, "Sponsor a Series"],
    [/partner with/i, "Partner With Us"],
    [/get featured/i, "Get Featured"],
    [/contact us|contact/i, "Contact Us"],
  ];
  return patterns.find(([pattern]) => pattern.test(corpus))?.[1] ?? "Not clearly defined";
}

function pickConversionPath(
  audit: AgentAuditRecord,
  businessModel: StrategicResearchProfile["business_model"],
  offerLadder: StrategicResearchProfile["offer_ladder"],
  audience: StrategicResearchProfile["audience"],
  evidence: AuditSocialEvidence[],
) {
  const corpus = [
    audit.intent,
    audit.growth_goal,
    audit.current_blocker,
    ...evidence.map((row) => `${row.normalized_observation} ${row.raw_observation ?? ""}`),
  ].join(" ");
  const currentCta = detectCurrentCta(corpus);
  const mediaDriven = /video production|event coverage|live streaming|sponsorships|original content/i.test(
    [businessModel.primary_revenue_model, ...businessModel.secondary_revenue_models].join(" "),
  );
  const primary = mediaDriven
    ? (offerLadder.offer_ctas.find((cta) => /event coverage|production consultation/i.test(cta)) ?? "Book a Production Consultation")
    : "Book a Strategy Session";
  const secondary = mediaDriven
    ? unique(["Request Event Coverage", "Submit a Story", "Sponsor a Series", "Partner With Mont City", "Get Featured", "Request a Live Stream Quote"])
    : unique(offerLadder.offer_ctas.slice(1));
  const byAudience = audience.audience_segments.map((segment) => ({ audience: segment.segment_name, cta: segment.best_cta }));
  const gaps = unique([
    currentCta === "Not clearly defined" ? "Primary CTA is not obvious across website/social." : "",
    "Offer-specific landing pages are missing or unclear.",
    "Audience segments are not routed to dedicated next steps.",
    /strategy session/i.test(currentCta) && mediaDriven ? "Current CTA is strategy-led, but revenue model appears production/platform-led." : "",
  ]);
  return {
    current_cta: currentCta,
    cta_matches_business_model: currentCta !== "Not clearly defined" && currentCta.toLowerCase() === primary.toLowerCase(),
    recommended_primary_cta: primary,
    recommended_secondary_ctas: secondary,
    cta_by_audience: byAudience,
    conversion_path_summary:
      `The conversion path should route different audiences to different outcomes. Primary CTA: ${primary}. Secondary CTAs should support viewers, subjects, sponsors, and partners without clutter.`,
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
  const opportunity = profile.business_model.revenue_opportunities[0]
    ?? "Create a clearer conversion path from public content to paid offers.";
  const topRisk = profile.brand_architecture.interchangeable_name_risk
    ? "Parent and platform names are blending, which can confuse trust and buying intent."
    : profile.conversion_path.conversion_gaps[0] ?? "Conversion and offer pathways are still too broad.";
  return {
    strategist_summary: `${profile.brand_architecture.brand_architecture_notes} ${profile.business_model.business_model_summary} ${profile.cultural_context.cultural_context_summary}`,
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
  const businessModel = pickBusinessModel(input.audit, input.evidence);
  const offerLadder = pickOfferLadder(businessModel, brandArchitecture);
  const audience = pickAudience(input.audit, brandArchitecture, offerLadder);
  const culturalContext = pickCulturalContext(input.audit, input.evidence);
  const proofInventory = pickProofInventory(input.evidence);
  const conversionPath = pickConversionPath(input.audit, businessModel, offerLadder, audience, input.evidence);
  const contentToRevenue = pickContentToRevenue(input.evidence);
  const profileWithoutSummary = {
    brand_architecture: brandArchitecture,
    business_model: businessModel,
    offer_ladder: offerLadder,
    audience,
    cultural_context: culturalContext,
    proof_inventory: proofInventory,
    conversion_path: conversionPath,
    content_to_revenue: contentToRevenue,
  };
  const strategistSummary = await buildHumanStrategistSummaryWithModel(profileWithoutSummary);
  return {
    ...profileWithoutSummary,
    strategist_summary: strategistSummary,
  };
}

