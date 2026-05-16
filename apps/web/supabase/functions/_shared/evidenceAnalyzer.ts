export type EvidenceCategory =
  | "positioning"
  | "audience"
  | "authority"
  | "messaging"
  | "conversion"
  | "content_consistency"
  | "offer_clarity"
  | "trust_signals"
  | "visual_identity"
  | "engagement_quality";

export type FindingCategory =
  | "positioning_gap"
  | "audience_clarity_gap"
  | "authority_gap"
  | "messaging_gap"
  | "conversion_gap"
  | "missed_opportunity"
  | "priority_next_move";

export type AuditSocialEvidence = {
  id: string;
  audit_id: string;
  client_id: string | null;
  platform: string;
  source_type: string;
  source_url: string;
  source_label: string | null;
  raw_observation: string | null;
  normalized_observation: string;
  evidence_category: EvidenceCategory;
  confidence_score: number;
  captured_at: string;
  used_in_report: boolean;
  metadata: Record<string, unknown>;
};

export type AuditFinding = {
  audit_id: string;
  client_id: string | null;
  finding_category: FindingCategory;
  finding_title: string;
  finding_summary: string;
  evidence_ids: string[];
  severity: "info" | "low" | "medium" | "high";
  confidence_score: number;
  recommended_action: string;
  report_ready: boolean;
  diagnosis?: string;
  evidence_summary?: string;
  business_implication?: string;
  revenue_implication?: string;
  audience_implication?: string;
  source_list?: Array<{ source_type: string; source_label: string; source_url: string; confidence: number }>;
  produced_by_agent?: string;
  admin_review_status?: "pending" | "approved" | "rejected" | "edited";
  human_summary?: string;
  metadata?: Record<string, unknown>;
};

type AuditContext = {
  auditId: string;
  clientId: string | null;
  businessName: string;
  growthGoal: string;
  currentBlocker: string;
  targetAudience: string;
  websiteLink?: string | null;
  intent?: string | null;
  scoreSummary?: Record<string, unknown>;
  strategicProfile?: Record<string, unknown> | null;
};

export type QualityWarning = {
  severity: "info" | "warning" | "error";
  title: string;
  detail: string;
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

function averageConfidence(evidence: AuditSocialEvidence[]): number {
  if (!evidence.length) return 0.42;
  return clampScore(evidence.reduce((sum, item) => sum + item.confidence_score, 0) / evidence.length);
}

function byCategory(evidence: AuditSocialEvidence[], categories: EvidenceCategory[]): AuditSocialEvidence[] {
  return evidence
    .filter((item) => categories.includes(item.evidence_category))
    .sort((a, b) => b.confidence_score - a.confidence_score)
    .slice(0, 5);
}

function firstObservation(evidence: AuditSocialEvidence[], fallback: string): string {
  return evidence[0]?.normalized_observation ?? fallback;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item ?? "").trim()).filter(Boolean) : [];
}

function sourceListFromEvidence(evidence: AuditSocialEvidence[]): Array<{ source_type: string; source_label: string; source_url: string; confidence: number }> {
  return evidence.slice(0, 6).map((item) => ({
    source_type: item.source_type,
    source_label: item.source_label || item.platform || "Unknown source",
    source_url: item.source_url,
    confidence: clampScore(item.confidence_score),
  }));
}

function fallbackPrimaryCta(context: AuditContext): string {
  const blob = [
    context.businessName,
    context.growthGoal,
    context.currentBlocker,
    context.targetAudience,
    context.websiteLink,
  ].map((value) => String(value ?? "").toLowerCase()).join(" ");
  if (/nonprofit|foundation|501c|community program|community|member|membership|volunteer|get involved|join/.test(blob)) {
    if (/donor|fundraising|donate/.test(blob) && !/join|community|member|volunteer|get involved/.test(blob)) return "Donate";
    return "Join the Community";
  }
  if (/photograph|photographer|photo shoot|photoshoot|portrait|headshot|wedding|pixieset|gallery/.test(blob)) {
    return "Book a Photo Shoot";
  }
  if (/event coverage|live stream|video production|videograph|production/.test(blob)) {
    return "Request Event Coverage";
  }
  if (/book|appointment|availability|schedule/.test(blob)) return "Book an Appointment";
  if (/consult|coach|advisor|strategy/.test(blob)) return "Book a Consultation";
  if (/proposal|quote|project|service/.test(blob)) return "Request a Proposal";
  return "Request Details";
}

function primaryCtaFromProfile(context: AuditContext): string {
  const strategicProfile = asObject(context.strategicProfile);
  const conversion = asObject(strategicProfile.conversion_path);
  const cta = String(conversion.recommended_primary_cta ?? "").trim();
  if (cta && !/book a strategy session/i.test(cta)) return cta;
  return fallbackPrimaryCta(context);
}

function summaryFromParts(parts: string[]): string {
  return parts.map((part) => part.trim()).filter(Boolean).join(" ");
}

function makeFinding(
  context: AuditContext,
  category: FindingCategory,
  evidence: AuditSocialEvidence[],
  copy: {
    title: string;
    diagnosis: string;
    evidenceSummary: string;
    businessImplication: string;
    revenueImplication: string;
    audienceImplication: string;
    nextMove: string;
    producedByAgent: string;
    severity: AuditFinding["severity"];
  },
): AuditFinding {
  const confidence = averageConfidence(evidence);
  const cta = primaryCtaFromProfile(context);
  const humanSummary = summaryFromParts([
    copy.diagnosis,
    copy.businessImplication,
    `Revenue implication: ${copy.revenueImplication}`,
    `Audience implication: ${copy.audienceImplication}`,
  ]);
  return {
    audit_id: context.auditId,
    client_id: context.clientId,
    finding_category: category,
    finding_title: copy.title,
    finding_summary: humanSummary,
    evidence_ids: evidence.map((item) => item.id),
    severity: copy.severity,
    confidence_score: confidence,
    recommended_action: copy.nextMove.includes("CTA")
      ? copy.nextMove.replace(/CTA/gi, cta)
      : copy.nextMove,
    report_ready: evidence.length > 0 && confidence >= 0.55,
    diagnosis: copy.diagnosis,
    evidence_summary: copy.evidenceSummary,
    business_implication: copy.businessImplication,
    revenue_implication: copy.revenueImplication,
    audience_implication: copy.audienceImplication,
    source_list: sourceListFromEvidence(evidence),
    produced_by_agent: copy.producedByAgent,
    admin_review_status: "pending",
    human_summary: humanSummary,
    metadata: {
      diagnosis: copy.diagnosis,
      evidence_summary: copy.evidenceSummary,
      business_implication: copy.businessImplication,
      revenue_implication: copy.revenueImplication,
      audience_implication: copy.audienceImplication,
      source_list: sourceListFromEvidence(evidence),
      produced_by_agent: copy.producedByAgent,
      admin_review_status: "pending",
      human_summary: humanSummary,
      strategist_cta: cta,
    },
  };
}

export function analyzeEvidence(context: AuditContext, evidence: AuditSocialEvidence[]): AuditFinding[] {
  const positioning = byCategory(evidence, ["positioning", "offer_clarity"]);
  const audience = byCategory(evidence, ["audience", "engagement_quality"]);
  const authority = byCategory(evidence, ["authority", "trust_signals", "visual_identity"]);
  const messaging = byCategory(evidence, ["messaging", "content_consistency"]);
  const conversion = byCategory(evidence, ["conversion", "offer_clarity", "trust_signals"]);
  const allEvidence = evidence.sort((a, b) => b.confidence_score - a.confidence_score).slice(0, 6);

  const strategicProfile = asObject(context.strategicProfile);
  const brandArchitecture = asObject(strategicProfile.brand_architecture);
  const businessModel = asObject(strategicProfile.business_model);
  const offerLadder = asObject(strategicProfile.offer_ladder);
  const audienceProfile = asObject(strategicProfile.audience);
  const conversionPath = asObject(strategicProfile.conversion_path);
  const culturalContext = asObject(strategicProfile.cultural_context);
  const proofInventory = asObject(strategicProfile.proof_inventory);
  const strategistSummary = asObject(strategicProfile.strategist_summary);

  const intakeOnlyNote = evidence.length > 0 && evidence.every((item) => item.source_type === "manual_admin_note")
    ? "This finding is based only on intake answers and should be reviewed before sending."
    : "";

  const primaryRevenue = String(businessModel.primary_revenue_model ?? "").trim() || "the core service model";
  const primaryCta = primaryCtaFromProfile(context);
  const audiencePriority = String(audienceProfile.audience_priority_recommendation ?? "").trim();
  const recommendedOfferLadder = asStringArray(offerLadder.recommended_offer_ladder).join(" -> ");
  const namingNotes = String(brandArchitecture.brand_architecture_notes ?? "").trim();
  const culturalSummary = String(culturalContext.cultural_context_summary ?? "").trim();
  const proofSummary = asStringArray(proofInventory.strongest_proof_points).slice(0, 2).join(" ");

  return [
    makeFinding(context, "positioning_gap", positioning, {
      title: "Positioning needs a clearer business architecture and promise",
      diagnosis: firstObservation(positioning, `${context.businessName} described a growth goal, but the public promise is still too broad for strong market recall. ${intakeOnlyNote}`),
      evidenceSummary: [namingNotes, recommendedOfferLadder ? `Offer ladder signals: ${recommendedOfferLadder}.` : ""].join(" ").trim(),
      businessImplication: "When the brand promise and brand hierarchy are unclear, buyers cannot quickly understand what to buy and who delivers it.",
      revenueImplication: `Revenue from ${primaryRevenue.toLowerCase()} can leak when brand and offer language is interchangeable or generic.`,
      audienceImplication: "Audience segments may consume content but delay conversion because the value proposition is not role-specific.",
      nextMove: "Define the parent/public/platform naming hierarchy and anchor one category-level promise in headlines, bios, and landing pages.",
      producedByAgent: "Brand Architecture Agent",
      severity: "high",
    }),
    makeFinding(context, "audience_clarity_gap", audience, {
      title: "Audience layers need separation by decision role",
      diagnosis: firstObservation(audience, `Audience direction exists, but buyer, viewer, sponsor, and partner roles are still blended. ${intakeOnlyNote}`),
      evidenceSummary: audiencePriority || "Audience responses indicate broad targeting without clear role routing.",
      businessImplication: "A single blended audience message lowers conversion quality and increases sales friction.",
      revenueImplication: "High-value audience segments can stay hidden when offers are not mapped to buying intent.",
      audienceImplication: "People cannot self-identify their next step if CTAs and proof are not segment-specific.",
      nextMove: "Build segment-specific messaging and CTAs for buyer, viewer, subject, sponsor, and partner journeys.",
      producedByAgent: "Audience Agent",
      severity: "medium",
    }),
    makeFinding(context, "authority_gap", authority, {
      title: "Authority proof stack needs stronger visibility and structure",
      diagnosis: firstObservation(authority, `Authority signals exist, but the strongest proof assets are not yet arranged as a trust-first conversion stack. ${intakeOnlyNote}`),
      evidenceSummary: proofSummary || "Trust-signals and visual proof are not consistently connected to key offers.",
      businessImplication: "Weak proof sequencing reduces trust before the CTA and increases objection handling load.",
      revenueImplication: "Without visible proof, premium and sponsor offers underperform even when interest exists.",
      audienceImplication: "Skeptical segments need fast trust markers before they submit, join, or get involved.",
      nextMove: "Place top proof assets, partner markers, and outcome-focused case examples directly above each primary CTA.",
      producedByAgent: "Proof Inventory Agent",
      severity: "medium",
    }),
    makeFinding(context, "messaging_gap", messaging, {
      title: "Messaging should connect cultural relevance to monetization",
      diagnosis: firstObservation(messaging, `The brand voice is active, but the public narrative does not always tie cultural relevance to clear commercial outcomes. ${intakeOnlyNote}`),
      evidenceSummary: culturalSummary || "Cultural context appears under-leveraged in conversion-facing copy.",
      businessImplication: "Message inconsistency weakens strategic differentiation and content compounding.",
      revenueImplication: "Content can attract attention while missing sponsor, partner, and buyer conversion intent.",
      audienceImplication: "Audiences may connect emotionally but still not understand the next commercial action.",
      nextMove: "Use one repeatable narrative: cultural significance, proof point, business outcome, then CTA.",
      producedByAgent: "Cultural Context Agent",
      severity: "medium",
    }),
    makeFinding(context, "conversion_gap", conversion, {
      title: "Conversion path should match the business model",
      diagnosis: firstObservation(conversion, `The current conversion path is not fully aligned with the revenue model and offer ladder. ${intakeOnlyNote}`),
      evidenceSummary: `Recommended primary CTA: ${primaryCta}.`,
      businessImplication: "When CTA language does not match service reality, qualified leads hesitate or drop.",
      revenueImplication: `Conversion performance improves when CTA copy reflects how ${context.businessName} actually earns revenue.`,
      audienceImplication: "Different audiences need dedicated CTAs to avoid funnel confusion.",
      nextMove: `Set "${primaryCta}" as the primary CTA and map secondary CTAs by audience segment.`,
      producedByAgent: "Conversion Path Agent",
      severity: "high",
    }),
    makeFinding(context, "missed_opportunity", allEvidence, {
      title: "Content-to-revenue opportunities are under-activated",
      diagnosis: firstObservation(allEvidence, `${context.businessName} has sufficient public signal, but content categories are not consistently mapped to revenue outcomes.`),
      evidenceSummary: asStringArray(asObject(strategicProfile.content_to_revenue).best_content_to_monetize).slice(0, 2).join(" "),
      businessImplication: "Content performance can remain superficial without a monetization map.",
      revenueImplication: "Awareness content is not fully converting into the right next actions, sponsorship, or partner value.",
      audienceImplication: "Audiences can engage without moving into deeper trust or transaction behavior.",
      nextMove: "Build a content-to-revenue sequence: awareness -> proof -> offer -> CTA -> follow-up proof.",
      producedByAgent: "Content-to-Revenue Agent",
      severity: "medium",
    }),
    makeFinding(context, "priority_next_move", allEvidence, {
      title: "Priority next move: operationalize the strategist roadmap",
      diagnosis: String(strategistSummary.strategist_summary ?? "").trim() ||
        `The highest-leverage move is to align offer hierarchy, proof, and CTA routing with ${context.growthGoal || "the growth goal"}.`,
      evidenceSummary: String(strategistSummary.top_opportunity ?? "").trim() || "Top opportunity still needs explicit sequencing.",
      businessImplication: "A structured roadmap turns diagnosis into implementation decisions across teams.",
      revenueImplication: "Faster execution on offer, proof, and CTA alignment improves near-term conversion quality.",
      audienceImplication: "Clear sequencing creates a coherent journey from first impression to action.",
      nextMove: String(strategistSummary.recommended_priority ?? "").trim() ||
        "Execute the top three moves from the approved findings in the next sprint.",
      producedByAgent: "Human Strategist Summary",
      severity: "high",
    }),
  ];
}

export function buildEvidenceQualityWarnings(context: AuditContext, evidence: AuditSocialEvidence[], findings: AuditFinding[]): QualityWarning[] {
  const warnings: QualityWarning[] = [];
  const sourceTypes = new Set(evidence.map((item) => item.source_type));
  const categories = new Set(evidence.map((item) => item.evidence_category));
  const avgConfidence = averageConfidence(evidence);
  const recentPosts = evidence.filter((item) => ["public_data_provider", "meta_graph_api", "connected_account"].includes(item.source_type)).length;
  const strategicProfile = asObject(context.strategicProfile);
  const conversionPath = asObject(strategicProfile.conversion_path);
  const recommendedPrimaryCta = String(conversionPath.recommended_primary_cta ?? "").trim();

  if (!sourceTypes.has("meta_graph_api") && !sourceTypes.has("connected_account")) {
    warnings.push({ severity: "info", title: "No connected Meta data", detail: "Findings do not include authorized Instagram/Facebook account data." });
  }
  if (!context.websiteLink && !sourceTypes.has("website")) {
    warnings.push({ severity: "warning", title: "No website found", detail: "The conversion and authority read has limited website evidence." });
  }
  if (avgConfidence < 0.6) {
    warnings.push({ severity: "warning", title: "Low evidence confidence", detail: "Review findings before approving them for the client report." });
  }
  if (recentPosts < 3) {
    warnings.push({ severity: "info", title: "Too few recent posts", detail: "Public Source Intelligence has limited recent content evidence." });
  }
  if (context.targetAudience.length < 40) {
    warnings.push({ severity: "warning", title: "Broad audience answer", detail: "The intake answer needs more buyer-context detail." });
  }
  if (context.growthGoal.length < 35) {
    warnings.push({ severity: "warning", title: "Missing offer", detail: "The offer or growth goal is not specific enough for a strong recommendation." });
  }
  if (!String(context.intent ?? "").includes("ready") && !recommendedPrimaryCta) {
    warnings.push({ severity: "info", title: "Missing CTA", detail: "The audit should reinforce one clear next action." });
  }
  if (!categories.has("conversion")) {
    warnings.push({ severity: "warning", title: "Weak conversion path", detail: "No strong conversion evidence has been captured yet." });
  }
  if (!categories.has("authority") && !categories.has("trust_signals")) {
    warnings.push({ severity: "warning", title: "No authority signals found", detail: "Authority recommendations are based on limited proof evidence." });
  }
  if (!findings.some((finding) => finding.report_ready)) {
    warnings.push({ severity: "warning", title: "No approved findings", detail: "The report will fall back to intake-based guidance until findings are approved." });
  }

  return warnings;
}
