type JsonRecord = Record<string, unknown>;

export type FreeAuditReportWarning = {
  severity: "info" | "warning" | "error";
  title: string;
  detail: string;
};

export type FreeAuditScore = {
  key: "positioning_score" | "audience_score" | "authority_score" | "messaging_score" | "conversion_score";
  label: string;
  value: number;
  summary: string;
};

export type FreeAuditReportSection = {
  id: "positioning" | "audience" | "authority" | "messaging" | "conversion";
  label: string;
  title: string;
  subtitle: string;
  scoreLabel: string;
  score: number;
  diagnosis: string;
  evidence: string[];
  whyItMatters: string;
  nextMove: string;
  cta: string;
};

export type FreeAuditReport = {
  auditId: string;
  businessName: string;
  contactName: string;
  recipient: string;
  subject: string;
  filename: string;
  generatedAt: string;
  readinessLevel: string;
  intentLabel: string;
  auditAngleLabel: string;
  executiveSummary: string;
  scores: FreeAuditScore[];
  sections: FreeAuditReportSection[];
  warnings: FreeAuditReportWarning[];
  evidence: {
    growthGoal: string;
    currentBlocker: string;
    targetAudience: string;
    presence: string[];
    industry: string;
    aesthetic: string;
    recommendedVibe: string;
    socialHighlights: string[];
    socialEvidenceCount: number;
  };
};

type FreeAuditRecord = JsonRecord & {
  id?: string;
  lead_key?: string | null;
  lead_email_lower?: string | null;
  contact_name?: string | null;
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
  readiness_level?: string | null;
  audit_angle?: string | null;
  score_summary?: unknown;
  metadata?: unknown;
};

type AestheticSignalRecord = JsonRecord & {
  detected_industry?: string | null;
  detected_aesthetic?: string | null;
  recommended_vibe?: string | null;
  confidence?: number | null;
  signals?: unknown;
};

type AuditFindingRecord = JsonRecord & {
  finding_category?: string | null;
  finding_title?: string | null;
  finding_summary?: string | null;
  recommended_action?: string | null;
  confidence_score?: number | null;
  report_ready?: boolean | null;
};

const SCORE_LABELS: Record<FreeAuditScore["key"], string> = {
  positioning_score: "Positioning",
  audience_score: "Audience",
  authority_score: "Authority",
  messaging_score: "Messaging",
  conversion_score: "Conversion",
};

const AUDIT_ANGLE_LABELS: Record<string, string> = {
  brand_diagnosis: "Brand diagnosis",
  general_brand: "Brand diagnosis",
  free_audit: "Brand diagnosis",
  free_brand_audit: "Brand diagnosis",
  positioning_gap: "Positioning gap",
  content_strategy: "Content strategy",
  conversion_path: "Conversion path",
  audience_clarity: "Audience clarity",
  authority_structure: "Authority structure",
};

const CANONICAL_PRIMARY_CTA = "Join the Waitlist";

function asObject(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function clean(value: unknown, fallback = ""): string {
  const normalized = String(value ?? "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized || fallback;
}

function originalText(value: unknown, fallback = ""): string {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .map((word) => word ? `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}` : word)
    .join(" ");
}

function humanize(value: unknown, fallback = "Not provided"): string {
  const normalized = clean(value, fallback);
  return normalized === fallback ? fallback : titleCase(normalized);
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreFrom(summary: JsonRecord, key: FreeAuditScore["key"], fallback: number): number {
  const value = summary[key];
  return clampScore(typeof value === "number" ? value : fallback);
}

function hasUsefulText(value: string): boolean {
  return value.trim().replace(/not provided/gi, "").length >= 12;
}

function sentence(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function readableAngle(value: unknown): string {
  const raw = String(value ?? "").trim();
  const key = raw.toLowerCase();
  return AUDIT_ANGLE_LABELS[key] ?? humanize(raw || "brand_diagnosis", "Brand diagnosis");
}

function intentLabel(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (raw === "ready_now") return "Ready now";
  if (raw === "open_if_it_makes_sense") return "Open if the next step makes sense";
  if (raw === "just_looking") return "Just looking";
  return humanize(raw, "Open if the next step makes sense");
}

function fileSafe(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 80) || "brand";
}

function scoreSummary(key: FreeAuditScore["key"], value: number): string {
  const summaries: Record<FreeAuditScore["key"], [string, string, string, string]> = {
    positioning_score: [
      "Promise needs sharper focus",
      "Clear idea forming, needs tighter words",
      "Solid direction with room to sharpen",
      "Strong promise ready for more proof",
    ],
    audience_score: [
      "Audience needs clearer definition",
      "Good starting point, needs buyer detail",
      "Audience is clear enough to refine",
      "Strong audience read to build from",
    ],
    authority_score: [
      "Trust signals need more visibility",
      "Proof exists, but needs better placement",
      "Credibility is building well",
      "Strong trust foundation",
    ],
    messaging_score: [
      "Message needs a simpler main point",
      "Good ideas, needs a clearer hook",
      "Message is close to campaign-ready",
      "Strong message direction",
    ],
    conversion_score: [
      "Next step needs to be clearer",
      "Path to action needs fewer gaps",
      "Good path with small friction points",
      "Strong next-step flow",
    ],
  };
  const bucket = value < 45 ? 0 : value < 60 ? 1 : value < 75 ? 2 : 3;
  return summaries[key][bucket];
}

function presenceList(audit: FreeAuditRecord): string[] {
  return [
    audit.website_link,
    audit.instagram,
    audit.facebook,
    audit.tiktok,
    audit.other_socials,
  ]
    .map((value) => originalText(value))
    .filter(Boolean);
}

function normalizePrimaryCta(value: unknown): string {
  const submitted = originalText(value);
  if (submitted) return submitted;
  return CANONICAL_PRIMARY_CTA;
}

function actionResultLabel(primaryCta: string): string {
  if (/join|community|member|get involved|volunteer/i.test(primaryCta)) return "community join path";
  if (/donate|donor|fundraising/i.test(primaryCta)) return "donation path";
  if (/partner|sponsor/i.test(primaryCta)) return "partner action";
  if (/photo|shoot|portrait|headshot|wedding/i.test(primaryCta)) return "booked shoot";
  if (/coverage/i.test(primaryCta)) return "coverage request";
  if (/shop|buy/i.test(primaryCta)) return "purchase path";
  if (/proposal|quote|details/i.test(primaryCta)) return "qualified inquiry";
  if (/appointment|consultation|call|session/i.test(primaryCta)) return "booked conversation";
  return "clear next action";
}

function nextStepInstruction(primaryCta: string): string {
  if (/join|community|member/i.test(primaryCta)) return "what joining means, who the community is for, and what happens after they join";
  if (/volunteer|get involved/i.test(primaryCta)) return "how to get involved, who it is for, and what happens after they raise their hand";
  if (/donate|donor|fundraising/i.test(primaryCta)) return "what the donation supports, who it helps, and what happens after they give";
  if (/partner|sponsor/i.test(primaryCta)) return "what partnership supports, who it is for, and what happens after they inquire";
  if (/shop|buy/i.test(primaryCta)) return "what they are buying, who it is for, and what happens after purchase";
  if (/proposal|quote|details|coverage/i.test(primaryCta)) return "what they can request, who it is for, and what happens after they click";
  return "what the next step helps them do, who it is for, and what happens after they click";
}

function clientFacingCopy(value: unknown, fallback: string, primaryCta: string): string {
  const normalized = originalText(value, fallback);
  // Keep explicit CTA label lines verbatim so they always match canonical profile values.
  if (/^(Current CTA:|Recommended next action:|Primary CTA:)/i.test(normalized)) return normalized;
  return normalized
    .replace(/Book a Strategy Session/gi, primaryCta)
    .replace(/\bstrategy session\b/gi, "next step")
    .replace(/\bbooked action\b/gi, actionResultLabel(primaryCta));
}

function socialHighlightsFromFindings(findings: AuditFindingRecord[], metadata: JsonRecord): string[] {
  const approvedHighlights = findings
    .filter((finding) => finding.report_ready === true)
    .map((finding) => {
      const title = originalText(finding.finding_title);
      const summary = originalText(finding.finding_summary);
      if (!title && !summary) return "";
      return `${title}: ${summary}`;
    })
    .filter(Boolean)
    .slice(0, 5);

  if (approvedHighlights.length) return approvedHighlights;

  const socialResearch = asObject(metadata.social_research);
  const totals = asObject(socialResearch.totals);
  const totalCount = Object.values(totals).reduce((sum, value) => sum + (typeof value === "number" ? value : 0), 0);
  return [];
}

function reportBusinessName(audit: FreeAuditRecord, recipient: string): string {
  const metadata = asObject(audit.metadata);
  const legalName = originalText(metadata.legal_or_registered_business_name);
  const publicName = originalText(metadata.public_business_name);
  return originalText(
    publicName || audit.business_name || legalName || audit.contact_name || recipient,
    "Your Brand",
  );
}

function metadataQualityWarnings(metadata: JsonRecord): FreeAuditReportWarning[] {
  const socialResearch = asObject(metadata.social_research);
  const rawWarnings = Array.isArray(socialResearch.quality_warnings) ? socialResearch.quality_warnings : [];
  return rawWarnings
    .map((warning) => {
      const record = asObject(warning);
      const severity = record.severity === "error" || record.severity === "warning" || record.severity === "info"
        ? record.severity
        : "info";
      return {
        severity,
        title: originalText(record.title, "Evidence quality warning"),
        detail: originalText(record.detail, "Review Public Source Intelligence before sending."),
      };
    })
    .filter((warning) => warning.title);
}

function businessFilingWarning(audit: FreeAuditRecord): FreeAuditReportWarning | null {
  const metadata = asObject(audit.metadata);
  const reportInputs = asObject(metadata.report_inputs);
  const entityFromInputs = originalText(reportInputs.business_entity_type);
  const entityFromMetadata = originalText(metadata.business_entity_type);
  const entityType = entityFromInputs || entityFromMetadata;
  const requiresNotice = reportInputs.requires_filing_notice === true || metadata.requires_filing_notice === true;
  if (!(requiresNotice || entityType === "personal_brand_without_documentation")) return null;
  return {
    severity: "warning",
    title: "Business filing required before scaling",
    detail:
      "Your brand is currently operating without business documentation. File a DBA or LLC/Corporation as your immediate next step before scaling marketing activity.",
  };
}

function qualityWarnings(report: Omit<FreeAuditReport, "warnings">, audit: FreeAuditRecord): FreeAuditReportWarning[] {
  const warnings: FreeAuditReportWarning[] = [];
  const metadata = asObject(audit.metadata);
  const contextLength = [
    report.evidence.growthGoal,
    report.evidence.currentBlocker,
    report.evidence.targetAudience,
    report.evidence.presence.join(" "),
  ].join(" ").replace(/Not provided/g, "").trim().length;

  if (!report.recipient.includes("@")) {
    warnings.push({
      severity: "error",
      title: "Missing recipient",
      detail: "This audit does not have a valid email address. Add one before sending.",
    });
  }

  if (!hasUsefulText(report.businessName) || report.businessName === "Your Brand") {
    warnings.push({
      severity: "warning",
      title: "Missing business name",
      detail: "The report can still be generated, but the cover and email will feel less personal.",
    });
  }

  if (contextLength < 80) {
    warnings.push({
      severity: "warning",
      title: "Low-context audit",
      detail: "The submission has limited written context, so review the preview before sending.",
    });
  }

  const rawAngle = String(audit.audit_angle ?? "");
  if (rawAngle.includes("_") || rawAngle === "free_audit") {
    warnings.push({
      severity: "info",
      title: "Audit angle normalized",
      detail: `Client-facing copy uses "${report.auditAngleLabel}" instead of the raw value "${rawAngle}".`,
    });
  }

  const shortSections = report.sections.filter((section) => section.diagnosis.length < 90 || section.nextMove.length < 70);
  if (shortSections.length) {
    warnings.push({
      severity: "warning",
      title: "Short section copy",
      detail: `${shortSections.length} report section${shortSections.length === 1 ? "" : "s"} should be reviewed for depth.`,
    });
  }

  const filingWarning = businessFilingWarning(audit);
  const combined = [...warnings, ...metadataQualityWarnings(metadata)];
  if (filingWarning) combined.unshift(filingWarning);
  return combined;
}

export function buildFreeAuditReport(
  audit: FreeAuditRecord,
  aestheticSignal: AestheticSignalRecord | null = null,
  approvedFindings: AuditFindingRecord[] = [],
): FreeAuditReport {
  const scoreData = asObject(audit.score_summary);
  const metadata = asObject(audit.metadata);
  const metadataScan = asObject(metadata.aesthetic_scan);
  const recipient = originalText(audit.lead_email_lower || audit.lead_key);
  const businessName = reportBusinessName(audit, recipient);
  const contactName = originalText(audit.contact_name, "there");
  const readinessLevel = originalText(audit.readiness_level, "WARM").toUpperCase();
  const readinessBaseline = readinessLevel === "HOT" ? 62 : readinessLevel === "COLD" ? 44 : 54;
  const growthGoal = originalText(audit.growth_goal, "Clarify what the brand is trying to grow.");
  const currentBlocker = originalText(audit.current_blocker, "The current positioning blocker was not clearly described.");
  const targetAudience = originalText(audit.target_audience_belief, "The target audience needs more definition.");
  const presence = presenceList(audit);
  const auditAngleLabel = readableAngle(audit.audit_angle);
  const industry = humanize(
    aestheticSignal?.detected_industry ?? metadata.detected_industry ?? metadataScan.detected_industry ?? scoreData.industry,
    "Professional Services",
  );
  const aesthetic = clean(
    aestheticSignal?.detected_aesthetic ?? metadata.detected_aesthetic ?? metadataScan.detected_aesthetic,
    "Strategic editorial",
  );
  const recommendedVibe = originalText(
    aestheticSignal?.recommended_vibe ?? metadata.recommended_vibe ?? metadataScan.recommended_vibe,
    "Use a premium editorial strategy direction that makes the offer feel clearer, more trusted, and easier to act on.",
  );
  const socialHighlights = socialHighlightsFromFindings(approvedFindings, metadata);
  const socialResearch = asObject(metadata.social_research);
  const strategicProfile = asObject(socialResearch.strategic_profile);
  const brandArchitectureProfile = asObject(strategicProfile.brand_architecture);
  const audienceProfile = asObject(strategicProfile.audience);
  const proofProfile = asObject(strategicProfile.proof_inventory);
  const culturalProfile = asObject(strategicProfile.cultural_context);
  const conversionProfile = asObject(strategicProfile.conversion_path);
  const socialEvidenceCount = approvedFindings.filter((finding) => finding.report_ready === true).length;
  const readyFindings = approvedFindings.filter((finding) => finding.report_ready === true);
  const findingFor = (category: string) => readyFindings.find((finding) => finding.finding_category === category);
  const intakeOnlyReport = readyFindings.length === 0;
  const hasPresence = presence.length > 0;
  const longGoal = growthGoal.length > 90;
  const clearAudience = targetAudience.length > 50;
  const authorityBoost = hasPresence ? 4 : -6;
  const conversionDrag = String(audit.intent ?? "") === "ready_now" ? 2 : -4;

  const scores: FreeAuditScore[] = [
    {
      key: "positioning_score",
      label: SCORE_LABELS.positioning_score,
      value: scoreFrom(scoreData, "positioning_score", readinessBaseline - (hasUsefulText(currentBlocker) ? 10 : 16) + (longGoal ? 3 : 0)),
      summary: "",
    },
    {
      key: "audience_score",
      label: SCORE_LABELS.audience_score,
      value: scoreFrom(scoreData, "audience_score", readinessBaseline - (clearAudience ? 3 : 10)),
      summary: "",
    },
    {
      key: "authority_score",
      label: SCORE_LABELS.authority_score,
      value: scoreFrom(scoreData, "authority_score", readinessBaseline + authorityBoost),
      summary: "",
    },
    {
      key: "messaging_score",
      label: SCORE_LABELS.messaging_score,
      value: scoreFrom(scoreData, "messaging_score", readinessBaseline - 2),
      summary: "",
    },
    {
      key: "conversion_score",
      label: SCORE_LABELS.conversion_score,
      value: scoreFrom(scoreData, "conversion_score", readinessBaseline - 8 + conversionDrag),
      summary: "",
    },
  ].map((score) => ({ ...score, summary: scoreSummary(score.key, score.value) }));

  const scoreByKey = Object.fromEntries(scores.map((score) => [score.key, score.value])) as Record<FreeAuditScore["key"], number>;
  const primaryGap = originalText(scoreData.primary_gap, currentBlocker);
  const audiencePain = originalText(scoreData.audience_pain, targetAudience);
  const presenceEvidence = socialHighlights[0] ?? (hasPresence
    ? `Visible presence reviewed: ${presence.slice(0, 3).join(", ")}${presence.length > 3 ? " and more." : "."}`
    : "No website or social channel was submitted, so the authority read depends heavily on the written answers.");
  const socialEvidenceLine = socialHighlights.length
    ? `Approved Public Source Intelligence finding: ${socialHighlights[0]}`
    : "This read is based on the information shared in the audit and the visible brand presence available for review.";
  const offerGoal = sentence(growthGoal);
  const blockerSentence = sentence(currentBlocker);
  const positioningFinding = findingFor("positioning_gap");
  const audienceFinding = findingFor("audience_clarity_gap");
  const authorityFinding = findingFor("authority_gap");
  const messagingFinding = findingFor("messaging_gap");
  const namingNotes = originalText(
    brandArchitectureProfile.brand_architecture_notes,
    "",
  );
  const audiencePriority = originalText(
    audienceProfile.audience_priority_recommendation,
    "",
  );
  const proofHighlights = Array.isArray(proofProfile.strongest_proof_points)
    ? (proofProfile.strongest_proof_points as unknown[])
      .map((item) => clean(item, ""))
      .filter(Boolean)
      .slice(0, 2)
    : [];
  const culturalSummary = originalText(culturalProfile.cultural_context_summary, "");
  const recommendedPrimaryCta = normalizePrimaryCta(conversionProfile.recommended_primary_cta);
  const currentCta = originalText(conversionProfile.current_cta);
  const actionResult = actionResultLabel(recommendedPrimaryCta);
  const secondaryCtas = Array.isArray(conversionProfile.recommended_secondary_ctas)
    ? (conversionProfile.recommended_secondary_ctas as unknown[])
      .map((item) => clientFacingCopy(clean(item, ""), "", recommendedPrimaryCta))
      .filter(Boolean)
      .filter((item) => item.toLowerCase() !== recommendedPrimaryCta.toLowerCase())
      .slice(0, 4)
    : [];

  const rawSections: FreeAuditReportSection[] = [
    {
      id: "positioning",
      label: "01",
      title: "Positioning Gap",
      subtitle: "Where the brand promise needs to become easier to understand.",
      scoreLabel: SCORE_LABELS.positioning_score,
      score: scoreByKey.positioning_score,
      diagnosis: clientFacingCopy(positioningFinding?.finding_summary, intakeOnlyReport
        ? `${businessName} has useful signals to build from. The next opportunity is making the promise easier to understand, so the goal, blocker, audience, and outcome connect faster.`
        : `${businessName} needs a sharper promise that says who it helps, what changes, and why that change matters now.${namingNotes ? ` ${namingNotes}` : ""}`,
        recommendedPrimaryCta),
      evidence: readyFindings.length
        ? [originalText(positioningFinding?.finding_title, "Approved positioning finding"), namingNotes || socialHighlights[1] || socialEvidenceLine]
        : [`Growth goal: ${growthGoal}`, `Current blocker: ${primaryGap}`],
      whyItMatters: "A broad or unclear position forces the audience to work too hard. When the promise is not specific, content may get attention without creating trust, urgency, or a reason to act.",
      nextMove: clientFacingCopy(positioningFinding?.recommended_action, "Rewrite the primary brand promise into one sentence that names the audience, the pain, and the outcome. Use that promise as the anchor for the website hero, social bio, pinned content, and next campaign.", recommendedPrimaryCta),
      cta: `Use this section to tighten messaging before driving traffic to "${recommendedPrimaryCta}".`,
    },
    {
      id: "audience",
      label: "02",
      title: "Audience Clarity",
      subtitle: "How clearly the brand understands who it is speaking to.",
      scoreLabel: SCORE_LABELS.audience_score,
      score: scoreByKey.audience_score,
      diagnosis: clientFacingCopy(audienceFinding?.finding_summary, intakeOnlyReport
        ? "The audience description gives the brand a real starting point. The next opportunity is adding more buyer detail: what they believe, what they compare, and what would make them trust faster."
        : `The audience read points toward ${audiencePain}, but the buying context still needs sharper detail.`,
        recommendedPrimaryCta),
      evidence: readyFindings.length
        ? [originalText(audienceFinding?.finding_title, "Approved audience finding"), socialHighlights[2] ?? `Detected industry context: ${industry}`]
        : [`Audience belief: ${targetAudience}`, audiencePriority || `Detected industry context: ${industry}`],
      whyItMatters: "Audience clarity is what turns general content into content that feels personally relevant. Without it, the brand may post consistently but still sound replaceable.",
      nextMove: clientFacingCopy(audienceFinding?.recommended_action, "Define the top audience segment as a real decision-maker with a current pain, a desired identity, and one objection. Then shape the next three pieces of content around those details.", recommendedPrimaryCta),
      cta: `Build audience-specific paths that feed into "${recommendedPrimaryCta}" and the right secondary CTAs.`,
    },
    {
      id: "authority",
      label: "03",
      title: "Authority Structure",
      subtitle: "How much trust the brand builds before asking for action.",
      scoreLabel: SCORE_LABELS.authority_score,
      score: scoreByKey.authority_score,
      diagnosis: clientFacingCopy(authorityFinding?.finding_summary, `${presenceEvidence} The brand needs visible proof, stronger hierarchy, and clearer credibility cues so people can quickly understand why ${businessName} is worth listening to before they compare alternatives.`, recommendedPrimaryCta),
      evidence: readyFindings.length
        ? [originalText(authorityFinding?.finding_title, "Approved authority finding"), socialHighlights[3] ?? socialEvidenceLine]
        : [presenceEvidence, proofHighlights[0] ?? `Detected aesthetic: ${aesthetic}`],
      whyItMatters: "Authority reduces hesitation. If proof, positioning, and presentation feel scattered, the audience may like the brand but still delay the next step.",
      nextMove: clientFacingCopy(authorityFinding?.recommended_action, "Add three trust signals to the main conversion path: a clear result, a credibility marker, and a short proof statement. Place them before the call to action, not after.", recommendedPrimaryCta),
      cta: `Place authority proof directly above "${recommendedPrimaryCta}" for faster trust-to-action flow.`,
    },
    {
      id: "messaging",
      label: "04",
      title: "Messaging Angle",
      subtitle: "The clearest idea to test in the next public-facing message.",
      scoreLabel: SCORE_LABELS.messaging_score,
      score: scoreByKey.messaging_score,
      diagnosis: clientFacingCopy(messagingFinding?.finding_summary, `The strongest immediate angle is ${auditAngleLabel.toLowerCase()}. The message should move away from describing activity and toward naming the strategic problem the audience already feels.`, recommendedPrimaryCta),
      evidence: readyFindings.length
        ? [originalText(messagingFinding?.finding_title, "Approved messaging finding"), socialHighlights[4] ?? socialEvidenceLine]
        : [`Audit angle: ${auditAngleLabel}`, culturalSummary || `Current blocker: ${currentBlocker}`],
      whyItMatters: "A strong messaging angle creates recognition. It helps the right person think, 'This is about my problem,' before they evaluate the service or price.",
      nextMove: clientFacingCopy(messagingFinding?.recommended_action, "Create one hook, one proof point, and one call to action around the core angle. Keep the language plain enough to repeat across the bio, caption, landing page, and email follow-up.", recommendedPrimaryCta),
      cta: `Align message hooks to "${recommendedPrimaryCta}" so each audience segment understands the next move.`,
    },
    {
      id: "conversion",
      label: "05",
      title: "Conversion Path",
      subtitle: "What needs to happen after attention is earned.",
      scoreLabel: SCORE_LABELS.conversion_score,
      score: scoreByKey.conversion_score,
      diagnosis: `${businessName} needs a more obvious next action after someone understands the message. The conversion path should make "${recommendedPrimaryCta}" feel like the natural next step.`,
      evidence: readyFindings.length
        ? [
          `Lead intent: ${intentLabel(audit.intent)}`,
          currentCta ? `Current CTA: ${currentCta}` : "Current CTA: Not clearly defined",
          `Recommended next action: ${recommendedPrimaryCta}`,
          socialHighlights[0] ?? socialEvidenceLine,
        ]
        : [
          `Lead intent: ${intentLabel(audit.intent)}`,
          currentCta ? `Current CTA: ${currentCta}` : "Current CTA: Not clearly defined",
          `Recommended next action: ${recommendedPrimaryCta}`,
        ],
      whyItMatters: `Interest fades when the next step is unclear. A clean path turns attention into a ${actionResult} while the need is still active in the prospect's mind.`,
      nextMove: `Place one direct call to action near the clearest proof point. The CTA should explain ${nextStepInstruction(recommendedPrimaryCta)}.`,
      cta: secondaryCtas.length
        ? `Primary CTA: ${recommendedPrimaryCta}. Secondary CTAs: ${secondaryCtas.join(", ")}.`
        : `Primary CTA: ${recommendedPrimaryCta}.`,
    },
  ];
  const sections = rawSections.map((section) => ({
    ...section,
    evidence: section.evidence.map((item) => clientFacingCopy(item, item, recommendedPrimaryCta)),
  }));

  const executiveSummary = intakeOnlyReport
    ? `${businessName} has enough signal to build from. The biggest opportunity is to make the promise clearer, the proof easier to see, and the next step simple to take.`
    : `${businessName} has enough approved evidence to build from, but the audit points to a sharper need: clarify the promise, tighten the audience, strengthen visible proof, and make the next action unmistakable.`;
  const reportWithoutWarnings: Omit<FreeAuditReport, "warnings"> = {
    auditId: originalText(audit.id, ""),
    businessName,
    contactName,
    recipient,
    subject: `${businessName} Brand Diagnosis`,
    filename: `${fileSafe(businessName)}-diagnosis.pdf`,
    generatedAt: new Date().toISOString(),
    readinessLevel,
    intentLabel: intentLabel(audit.intent),
    auditAngleLabel,
    executiveSummary,
    scores,
    sections,
    evidence: {
      growthGoal,
      currentBlocker,
      targetAudience,
      presence,
      industry,
      aesthetic,
      recommendedVibe,
      socialHighlights,
      socialEvidenceCount,
    },
  };

  return {
    ...reportWithoutWarnings,
    warnings: qualityWarnings(reportWithoutWarnings, audit),
  };
}
