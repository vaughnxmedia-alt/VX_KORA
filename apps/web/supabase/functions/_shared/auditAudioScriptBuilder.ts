import type { FreeAuditReport } from "./free-audit-report.ts";

type BusinessType =
  | "jahknowspr"
  | "media_production_platform"
  | "church"
  | "nonprofit"
  | "general_business";
export type AudioMode = "private_strategy_brief" | "podcast_deep_dive" | "executive_recap";

type PlainLanguageCategoryBreakdown = {
  category: "Positioning" | "Audience" | "Authority" | "Messaging" | "Conversion";
  plain_language_definition: string;
  finding: string;
  why_it_matters: string;
  recommended_move: string;
};

type PlainLanguageAudioBrief = {
  client_name: string;
  brand_name: string;
  business_type: BusinessType;
  tone: "plain-language strategist voice note";
  reading_level: "everyday business owner";
  intro: string;
  big_picture: string;
  score_read: string;
  category_breakdowns: PlainLanguageCategoryBreakdown[];
  hidden_cost: string;
  first_move: string;
  recommended_next_steps: string[];
  closing_summary: string;
};

type AudioBriefChecks = {
  jargon_translation_check: { passed: boolean; found_terms: string[] };
  business_specific_cta_check: { passed: boolean; required_cta_family: string; detected_ctas: string[] };
  strategy_session_mismatch_check: { passed: boolean; detail: string };
  parent_sub_brand_check: { passed: boolean; detail: string };
  reads_like_pdf_check: { passed: boolean; overlap_ratio: number };
  approved_for_audio: boolean;
};

const AUDIO_WORDS_PER_MINUTE = 145;
const MAX_AUDIO_SECONDS = 210;
const MAX_AUDIO_WORDS = Math.floor((MAX_AUDIO_SECONDS / 60) * AUDIO_WORDS_PER_MINUTE);

export type AuditAudioScript = {
  title: string;
  mode: AudioMode;
  script: string;
  estimatedMinutes: number;
  wordCount: number;
  segments: Array<{
    speaker: "host_woman" | "host_man";
    line: string;
  }>;
  plain_language_audio_brief: PlainLanguageAudioBrief;
  checks: AudioBriefChecks;
};

function wordCount(value: string): number {
  return value.split(/\s+/).filter(Boolean).length;
}

function estimatedMinutesFor(words: number): number {
  return Number((words / AUDIO_WORDS_PER_MINUTE).toFixed(1));
}

function truncateWords(value: string, maxWords: number): string {
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return value;
  const unsafeEndings = new Set([
    "a",
    "an",
    "and",
    "are",
    "at",
    "be",
    "because",
    "being",
    "but",
    "for",
    "from",
    "if",
    "in",
    "is",
    "of",
    "on",
    "or",
    "so",
    "that",
    "the",
    "their",
    "this",
    "to",
    "was",
    "were",
    "what",
    "where",
    "with",
    "your",
  ]);
  const clipped = words.slice(0, maxWords);
  while (clipped.length > 4 && unsafeEndings.has(clipped[clipped.length - 1].toLowerCase().replace(/[^a-z]/g, ""))) {
    clipped.pop();
  }
  return `${clipped.join(" ").replace(/[,.!?;:]+$/, "")}.`;
}

function audioClean(value: string): string {
  return cleanForSpeech(value)
    .replace(/[—–]/g, ", ")
    .replace(/[*#_[\]`>]+/g, "")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/([.!?]){2,}/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function scriptFromSegments(segments: AuditAudioScript["segments"]): string {
  return segments
    .map((segment) => segment.line)
    .join(" ");
}

function capSegmentsForMaxLength(segments: AuditAudioScript["segments"]): AuditAudioScript["segments"] {
  if (wordCount(scriptFromSegments(segments)) <= MAX_AUDIO_WORDS) return segments;
  const optionalPasses = [
    (items: AuditAudioScript["segments"]) => items.filter((segment) => !/^The third issue/i.test(segment.line)),
    (items: AuditAudioScript["segments"]) => items.filter((segment) => !/^So the brand does not need more noise first/i.test(segment.line)),
    (items: AuditAudioScript["segments"]) => items.filter((segment) => !/^Now, what should/i.test(segment.line)),
    (items: AuditAudioScript["segments"]) => items.filter((segment) => !/^The first question is simple/i.test(segment.line)),
  ];
  let next = segments;
  for (const pass of optionalPasses) {
    if (wordCount(scriptFromSegments(next)) <= MAX_AUDIO_WORDS) return next;
    next = pass(next);
  }
  if (wordCount(scriptFromSegments(next)) <= MAX_AUDIO_WORDS) return next;
  return next.map((segment) => ({ ...segment, line: limitCompleteThought(segment.line, 46) }));
}

function sentence(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function sentenceParts(value: string): string[] {
  return audioClean(value)
    .match(/[^.!?]+[.!?]+/g)
    ?.map((part) => part.trim())
    .filter(Boolean) ?? [];
}

function limitCompleteThought(value: string, maxWords: number): string {
  const parts = sentenceParts(value);
  if (!parts.length) return truncateWords(audioClean(value), maxWords);
  const selected: string[] = [];
  for (const part of parts) {
    const candidate = [...selected, part].join(" ");
    if (wordCount(candidate) > maxWords) break;
    selected.push(part);
  }
  if (selected.length) return selected.join(" ");
  return truncateWords(parts[0], maxWords);
}

function cleanForSpeech(value: string): string {
  return removeRawSlugs(value)
    .replace(/https?:\/\/\S+/gi, "your website or social page")
    .replace(/\bCTA\b/gi, "next step")
    .replace(/\bconversion path\b/gi, "what people do after they like what they see")
    .replace(/\bconversion\b/gi, "what happens after people like what they see")
    .replace(/\bsignal(s)?\b/gi, "signs")
    .replace(/\bproof points\b/gi, "examples that help people trust you")
    .replace(/\boffer ladder\b/gi, "the different ways people can work with you")
    .replace(/\bbusiness model\b/gi, "how the business makes money")
    .replace(/\baudience segment(s)?\b/gi, "different types of people you are trying to reach")
    .replace(/\bauthority structure\b/gi, "the trust your brand builds before asking people to act")
    .replace(/\bbrand architecture\b/gi, "how the main brand and sub-brands fit together")
    .replace(/\bcultural context\b/gi, "the local meaning and emotional reason the brand matters")
    .replace(/[—–]/g, ", ")
    .replace(/[*#_[\]`>]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function removeRawSlugs(value: string): string {
  return value
    .replace(/\bfree_audit\b/gi, "brand diagnosis")
    .replace(/\bbrand_diagnosis\b/gi, "brand diagnosis")
    .replace(/\bpositioning_gap\b/gi, "positioning gap")
    .replace(/[_-]+/g, " ");
}

function lowerIncludes(value: string, pattern: RegExp): boolean {
  return pattern.test(value.toLowerCase());
}

function detectBusinessType(report: FreeAuditReport): BusinessType {
  const brand = report.businessName.toLowerCase();
  const presenceText = report.evidence.presence.join(" ").toLowerCase();
  const isMontCity = /mont city|montcity/.test(`${brand} ${presenceText}`);
  if (isMontCity) return "media_production_platform";

  const haystack = [
    report.businessName,
    report.subject,
    report.executiveSummary,
    report.evidence.growthGoal,
    report.evidence.currentBlocker,
    report.evidence.targetAudience,
    report.evidence.presence.join(" "),
    report.sections.map((section) => `${section.title} ${section.diagnosis}`).join(" "),
  ]
    .join(" ")
    .toLowerCase();

  if (lowerIncludes(haystack, /church|ministry|pastor|worship|sermon/)) return "church";
  if (lowerIncludes(haystack, /nonprofit|donor|fundraising|foundation|community program|501c|join the community|become a member|membership|volunteer|get involved/)) return "nonprofit";
  if (lowerIncludes(haystack, /network|media group|production|event coverage|livestream|documentary|series|sponsor/)) {
    return "media_production_platform";
  }
  if (lowerIncludes(haystack, /jahknowspr|visionary brand blueprint|request a brand audit/)) return "jahknowspr";
  return "general_business";
}

function preferredNextStepsFor(businessType: BusinessType, report: FreeAuditReport): string[] {
  if (businessType === "jahknowspr") {
    return [
      "Book a Strategy Session",
      "Request a Brand Audit",
      "Complete the Visionary Brand Blueprint",
      "Schedule a Consultation",
    ];
  }
  if (businessType === "media_production_platform") {
    return [
      "Book a Production Consultation",
      "Request Event Coverage",
      "Submit a Story",
      "Sponsor a Series",
      "Partner With Mont City",
      "Get Featured",
      "Request a Live Stream Quote",
    ];
  }
  if (businessType === "church") {
    return [
      "Schedule a Ministry Media Consultation",
      "Request Event Coverage",
      "Submit a Communications Request",
      "Book a Live Stream Review",
    ];
  }
  if (businessType === "nonprofit") {
    return [
      "Join the Community",
      "Become a Member",
      "Get Involved",
      "Volunteer",
      "Donate",
      "Submit a Story",
      "Sponsor a Program",
      "Partner With the Organization",
    ];
  }
  const conversionSection = report.sections.find((section) => section.id === "conversion");
  const fallback = cleanForSpeech(conversionSection?.cta || "");
  const primary = primaryNextStepFromReport(report, "");
  return [
    primary || fallback || "Request a Consultation",
  ];
}

function stableHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function pickVariant(seed: string, variants: string[], salt: string): string {
  if (!variants.length) return "";
  return variants[stableHash(`${seed}:${salt}`) % variants.length];
}

function clientName(report: FreeAuditReport): string {
  return report.contactName === "there" ? "" : report.contactName;
}

function shortText(value: string, fallback: string, maxWords = 8): string {
  const cleaned = cleanForSpeech(value);
  if (!cleaned || /not provided/i.test(cleaned)) return fallback;
  return truncateWords(cleaned, maxWords).replace(/[.!?]+$/, "");
}

function primaryNextStepFromReport(report: FreeAuditReport, fallback: string): string {
  const conversionSection = report.sections.find((section) => section.id === "conversion");
  const match = conversionSection?.cta.match(/Primary CTA:\s*([^.;]+)/i);
  return cleanForSpeech(match?.[1] ?? fallback);
}

function goalPhrase(report: FreeAuditReport): string {
  return shortText(report.evidence.growthGoal, "the growth goal", 10);
}

function audiencePhrase(report: FreeAuditReport): string {
  return shortText(report.evidence.targetAudience, "the right audience", 10);
}

function nextStepPlainPhrase(primaryNextStep: string): string {
  if (/join|community/i.test(primaryNextStep)) return "joining the community";
  if (/member/i.test(primaryNextStep)) return "becoming a member";
  if (/volunteer|get involved/i.test(primaryNextStep)) return "getting involved";
  if (/donate|donor|fundraising/i.test(primaryNextStep)) return "giving";
  if (/partner|sponsor/i.test(primaryNextStep)) return "partnering";
  if (/shop|buy/i.test(primaryNextStep)) return "buying";
  if (/request|proposal|quote|coverage/i.test(primaryNextStep)) return "making an inquiry";
  return primaryNextStep.toLowerCase();
}

function openingLineFor(
  report: FreeAuditReport,
  seed: string,
  primaryNextStep: string,
  topIssues: PlainLanguageCategoryBreakdown[],
): string {
  const firstIssue = topIssues[0]?.category.toLowerCase() ?? "clarity";
  const audience = audiencePhrase(report);
  const nextStep = nextStepPlainPhrase(primaryNextStep);
  const variants = [
    `Let's be real. Some brands have a logo, a page, a few posts, and still no real reason for people to stop. But ${report.businessName} feels different. There is something underneath it. Something needed. The question is simple: when people find the brand, do they instantly understand what it is inviting them into?`,
    `Before we talk scores, start here. ${report.businessName} does not feel like a brand with no purpose. It feels like a brand with purpose that needs a sharper path. The opportunity is to make ${nextStep} feel clear, personal, and easy to act on.`,
    `Here is the real conversation. ${report.businessName} has something to build from, but attention is not the same as action. People may see the brand, respect the mission, and still pause if they do not understand what they are being invited into.`,
    `This is not a generic audit read. This is about ${report.businessName}, the people it is trying to reach, and the moment where interest should turn into ${nextStep}. The strongest starting point is ${firstIssue}.`,
    `Some brands need more noise. ${report.businessName} needs a clearer path. The work already has meaning, especially for ${audience}, but the public message has to make the next step feel obvious.`,
    `The question is not whether ${report.businessName} matters. The question is whether someone new can understand the promise, trust the proof, and know exactly how to move toward ${nextStep}.`,
  ];
  return audioClean(pickVariant(seed, variants, "opening-line"));
}

function setupLineFor(report: FreeAuditReport, seed: string, primaryNextStep: string): string {
  const variants = [
    "I am not going to read the PDF word for word. I am going to translate the important parts into plain next moves.",
    `Think of this as the quick voice note behind the report: what is clear, what is costing momentum, and what should point people toward ${primaryNextStep}.`,
    "I am going to keep this direct: what the brand is saying now, what people may be missing, and what needs to change first.",
    `The goal here is simple: make the path from interest to ${nextStepPlainPhrase(primaryNextStep)} easier to understand.`,
    "I am going to pull out the strongest pattern, then give you the first move to clean up the action path.",
  ];
  return audioClean(pickVariant(seed, variants, "setup-line"));
}

function bigPictureFor(report: FreeAuditReport, seed: string, primaryNextStep: string): string {
  const variants = [
    `${report.businessName} already has something real to build on. The opportunity is to make the value easier to understand, the proof easier to see, and ${nextStepOutcomePhrase(primaryNextStep)}.`,
    `${report.businessName} does not need to sound bigger first. It needs to make the promise sharper, especially for ${audiencePhrase(report)}.`,
    `The pattern is clear: ${report.businessName} can turn more attention into action when the message, proof, and ${nextStepPlainPhrase(primaryNextStep)} all point in the same direction.`,
    `Right now, the brand has useful signs, but the public path needs more focus. People should quickly know why it matters and what to do next.`,
  ];
  return audioClean(pickVariant(seed, variants, "big-picture"));
}

function firstMoveFor(report: FreeAuditReport, primaryNextStep: string): string {
  const conversionMove = report.sections.find((section) => section.id === "conversion")?.nextMove;
  const positioningMove = report.sections.find((section) => section.id === "positioning")?.nextMove;
  return audioClean(
    conversionMove ||
      positioningMove ||
      `Start with one clear sentence that explains the brand in plain language, then align your website, social bio, pinned content, and main buttons around ${primaryNextStep}.`,
  );
}

function nextStepOutcomePhrase(primaryNextStep: string): string {
  if (/join|community|member/i.test(primaryNextStep)) return "easier to join";
  if (/volunteer|get involved/i.test(primaryNextStep)) return "easier to get involved";
  if (/donate|donor|fundraising/i.test(primaryNextStep)) return "easier to give";
  if (/partner|sponsor/i.test(primaryNextStep)) return "easier to partner";
  if (/shop|buy/i.test(primaryNextStep)) return "easier to buy";
  if (/request|proposal|quote|coverage/i.test(primaryNextStep)) return "easier to inquire";
  return "easier to act";
}

function closingFor(report: FreeAuditReport, seed: string, primaryNextStep: string): string {
  const variants = [
    `${report.businessName} does not need to be louder first. It needs to be clearer, so the right people have a better reason to trust it and take the next step.`,
    `The next win is clarity. When the promise and proof line up, ${nextStepPlainPhrase(primaryNextStep)} becomes a natural move instead of a forced ask.`,
    `If ${report.businessName} cleans up the message and proof around this next step, the brand can feel easier to trust and ${nextStepOutcomePhrase(primaryNextStep)}.`,
    `The main takeaway: make the value plain, make the proof visible, and make ${nextStepPlainPhrase(primaryNextStep)} the obvious action.`,
  ];
  return audioClean(pickVariant(seed, variants, "closing-line"));
}

function plainDefinitionFor(category: PlainLanguageCategoryBreakdown["category"]): string {
  if (category === "Positioning") {
    return "How quickly people understand what you do, who it is for, and why it matters.";
  }
  if (category === "Audience") {
    return "The people your brand needs to reach, serve, and move to action.";
  }
  if (category === "Authority") {
    return "How much trust your brand builds before asking people to take the next step.";
  }
  if (category === "Messaging") {
    return "The words and ideas people remember about your brand.";
  }
  return "What happens after someone likes what they see, including whether the next step feels obvious.";
}

function findSection(report: FreeAuditReport, category: PlainLanguageCategoryBreakdown["category"]) {
  const idMap: Record<PlainLanguageCategoryBreakdown["category"], string> = {
    Positioning: "positioning",
    Audience: "audience",
    Authority: "authority",
    Messaging: "messaging",
    Conversion: "conversion",
  };
  return report.sections.find((section) => section.id === idMap[category]) ?? report.sections[0];
}

function buildCategoryBreakdowns(report: FreeAuditReport): PlainLanguageCategoryBreakdown[] {
  const categories: PlainLanguageCategoryBreakdown["category"][] = [
    "Positioning",
    "Audience",
    "Authority",
    "Messaging",
    "Conversion",
  ];
  return categories.map((category) => {
    const section = findSection(report, category);
    return {
      category,
      plain_language_definition: plainDefinitionFor(category),
      finding: cleanForSpeech(section.diagnosis),
      why_it_matters: cleanForSpeech(section.whyItMatters),
      recommended_move: cleanForSpeech(section.nextMove),
    };
  });
}

function buildScoreRead(report: FreeAuditReport): string {
  return report.scores
    .map((score) => `${score.label} is ${score.value} out of 100`)
    .join(". ");
}

function issueLabel(index: number): string {
  if (index === 0) return "first";
  if (index === 1) return "second";
  return "third";
}

function hiddenCostForIssue(index: number): string {
  if (index === 0) {
    return "The hidden cost is confusion. Someone can respect the brand and still not take action if the next step is not clear.";
  }
  if (index === 1) {
    return "The hidden cost is hesitation. People may like what they see, but still pause because the message does not make the next move easy.";
  }
  return "The hidden cost is missed momentum. The brand may be doing good work, but the audience needs a cleaner path to understand it and act on it.";
}

function buildIssueSegment(issue: PlainLanguageCategoryBreakdown, index: number): string {
  return [
    `The ${issueLabel(index)} issue is ${issue.category}.`,
    `In plain language, this means ${audioClean(issue.plain_language_definition).toLowerCase()}`,
    limitCompleteThought(audioClean(issue.finding), 22),
    `Why it matters: ${limitCompleteThought(audioClean(issue.why_it_matters), 20)}`,
    hiddenCostForIssue(index),
    `The next move is simple. ${limitCompleteThought(audioClean(issue.recommended_move), 24)}`,
  ].map(sentence).join(" ");
}

function buildExecutiveIssueLine(issue: PlainLanguageCategoryBreakdown): string {
  return audioClean(`${issue.category}: ${limitCompleteThought(issue.finding, 18)} Next move: ${limitCompleteThought(issue.recommended_move, 16)}`);
}

function buildPrivateStrategySegments(
  plainLanguageBrief: PlainLanguageAudioBrief,
  topIssues: PlainLanguageCategoryBreakdown[],
  filingWarning: string,
  clarityPoint: string,
  firstMove: string,
  recommendedNextSteps: string[],
  closingSummary: string,
  setupLine: string,
): AuditAudioScript["segments"] {
  return [
    {
      speaker: "host_woman",
      line: plainLanguageBrief.intro,
    },
    {
      speaker: "host_woman",
      line: setupLine,
    },
    {
      speaker: "host_woman",
      line: `Here is the big picture. ${plainLanguageBrief.big_picture}`,
    },
    {
      speaker: "host_woman",
      line: plainLanguageBrief.score_read,
    },
    ...topIssues.map((issue, index) => ({
      speaker: "host_woman" as const,
      line: buildIssueSegment(issue, index),
    })),
    ...(filingWarning
      ? [{
        speaker: "host_woman" as const,
        line: `Important note before growth: ${audioClean(filingWarning)}`,
      }]
      : []),
    {
      speaker: "host_woman",
      line: `Clarity point. ${clarityPoint}`,
    },
    {
      speaker: "host_woman",
      line: audioClean(`The next move is simple. ${firstMove}`),
    },
    {
      speaker: "host_woman",
      line: audioClean(`Recommended next steps: ${recommendedNextSteps.slice(0, 4).join(". ")}.`),
    },
    {
      speaker: "host_woman",
      line: audioClean(closingSummary),
    },
  ];
}

function buildPodcastDeepDiveSegments(
  plainLanguageBrief: PlainLanguageAudioBrief,
  topIssues: PlainLanguageCategoryBreakdown[],
  filingWarning: string,
  clarityPoint: string,
  firstMove: string,
  recommendedNextSteps: string[],
  closingSummary: string,
  setupLine: string,
): AuditAudioScript["segments"] {
  return [
    {
      speaker: "host_woman",
      line: plainLanguageBrief.intro,
    },
    {
      speaker: "host_woman",
      line: setupLine,
    },
    {
      speaker: "host_woman",
      line: `Here is the big picture. ${plainLanguageBrief.big_picture}`,
    },
    {
      speaker: "host_woman",
      line: "So the issue is not the work. It is how clearly the work is being explained.",
    },
    {
      speaker: "host_woman",
      line: `${plainLanguageBrief.score_read} This is not bad. It is a signal.`,
    },
    {
      speaker: "host_woman",
      line: "Now, what should you pay attention to first?",
    },
    ...topIssues.map((issue, index) => ({
      speaker: "host_woman" as const,
      line: `${buildIssueSegment(issue, index)} ${index === 0
        ? "That sounds like a trust issue, not just a design issue."
        : index === 1
          ? "So the audience needs to know what to do next."
          : "Let me say that another way. The brand needs the audience to understand the value faster."}`,
    })),
    ...(filingWarning
      ? [{
        speaker: "host_woman" as const,
        line: `Important note before growth: ${audioClean(filingWarning)}`,
      }]
      : []),
    {
      speaker: "host_woman",
      line: "What is the simplest next step from here?",
    },
    {
      speaker: "host_woman",
      line: `Clarity point. ${clarityPoint} The next move is simple. ${audioClean(firstMove)}`,
    },
    {
      speaker: "host_woman",
      line: audioClean(`Recommended next steps: ${recommendedNextSteps.slice(0, 4).join(". ")}.`),
    },
    {
      speaker: "host_woman",
      line: "So the brand does not need more noise first. It needs a clearer reason for people to trust and act.",
    },
    {
      speaker: "host_woman",
      line: audioClean(closingSummary),
    },
  ];
}

function buildExecutiveRecapSegments(
  plainLanguageBrief: PlainLanguageAudioBrief,
  topIssues: PlainLanguageCategoryBreakdown[],
  clarityPoint: string,
  firstMove: string,
  recommendedNextSteps: string[],
  closingSummary: string,
  setupLine: string,
): AuditAudioScript["segments"] {
  return [
    {
      speaker: "host_woman",
      line: plainLanguageBrief.intro,
    },
    {
      speaker: "host_woman",
      line: setupLine,
    },
    {
      speaker: "host_woman",
      line: plainLanguageBrief.big_picture,
    },
    {
      speaker: "host_woman",
      line: `What is unclear: ${topIssues.slice(0, 2).map((issue) => buildExecutiveIssueLine(issue)).join(" ")}`,
    },
    {
      speaker: "host_woman",
      line: "What is costing the brand opportunities: confusion. Someone can respect the brand and still not take action if the next step is not clear.",
    },
    {
      speaker: "host_woman",
      line: `What to fix first: ${audioClean(firstMove)}`,
    },
    {
      speaker: "host_woman",
      line: `Action to take now: ${recommendedNextSteps.slice(0, 3).join(". ")}.`,
    },
    {
      speaker: "host_woman",
      line: `Clarity point. ${clarityPoint}`,
    },
    {
      speaker: "host_woman",
      line: audioClean(closingSummary),
    },
  ];
}

function extractLikelyCtas(script: string): string[] {
  const ctaPatterns = [
    "Book a Strategy Session",
    "Request a Brand Audit",
    "Complete the Visionary Brand Blueprint",
    "Schedule a Consultation",
    "Book a Photo Shoot",
    "Request Pricing",
    "Ask About Availability",
    "Book a Production Consultation",
    "Request Event Coverage",
    "Submit a Story",
    "Sponsor a Series",
    "Partner With Mont City",
    "Get Featured",
    "Request a Live Stream Quote",
    "Schedule a Ministry Media Consultation",
    "Submit a Communications Request",
    "Book a Live Stream Review",
    "Request a Campaign Consultation",
    "Join the Community",
    "Become a Member",
    "Get Involved",
    "Volunteer",
    "Donate",
    "Sponsor a Program",
    "Partner With the Organization",
    "Request a Donor Communications Plan",
  ];
  const lowerScript = script.toLowerCase();
  return ctaPatterns.filter((cta) => lowerScript.includes(cta.toLowerCase()));
}

function overlapRatio(script: string, report: FreeAuditReport): number {
  const scriptTokens = cleanForSpeech(script)
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 2);
  const reportTokens = cleanForSpeech([
    report.executiveSummary,
    ...report.sections.map((section) => `${section.diagnosis} ${section.whyItMatters} ${section.nextMove}`),
  ].join(" "))
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 2);
  const reportSet = new Set(reportTokens);
  const overlaps = scriptTokens.filter((token) => reportSet.has(token)).length;
  return scriptTokens.length ? Number((overlaps / scriptTokens.length).toFixed(2)) : 0;
}

function filingWarningFromReport(report: FreeAuditReport): string {
  const warning = report.warnings.find((item) => /business filing required/i.test(item.title));
  return warning ? cleanForSpeech(warning.detail) : "";
}

function buildChecks(
  script: string,
  report: FreeAuditReport,
  businessType: BusinessType,
  recommendedNextSteps: string[],
): AudioBriefChecks {
  const jargonTerms = [
    "conversion path",
    "cta",
    "audience segment",
    "proof points",
    "offer ladder",
    "business model",
    "authority structure",
    "brand architecture",
    "cultural context",
  ];
  const lowerScript = script.toLowerCase();
  const foundTerms = jargonTerms.filter((term) => new RegExp(`\\b${term.replace(/\s+/g, "\\s+")}\\b`, "i").test(lowerScript));

  const detectedCtas = extractLikelyCtas(script);
  const ctaFamily = businessType === "jahknowspr"
    ? "JahKnowsPR consultation funnel"
    : businessType === "media_production_platform"
      ? "Media and platform growth actions"
      : businessType === "church"
        ? "Church communications and media actions"
        : businessType === "nonprofit"
          ? "Nonprofit campaign and partner actions"
          : "Business-specific next action";
  const ctaPass = detectedCtas.some((cta) => recommendedNextSteps.some((recommended) => recommended.toLowerCase() === cta.toLowerCase()));

  const strategySessionMismatch = businessType !== "jahknowspr" && /book a strategy session/i.test(script);
  const isMontCity = /mont city/i.test(report.businessName.toLowerCase()) || report.evidence.presence.some((item) => /montcity/i.test(item.toLowerCase()));
  const hasParentPlatformDistinction = /parent company/i.test(lowerScript) && /media platform/i.test(lowerScript);
  const parentBrandPass = !isMontCity || hasParentPlatformDistinction;
  const overlap = overlapRatio(script, report);
  const readsLikePdfPass = overlap < 0.84;

  const approved =
    foundTerms.length === 0 &&
    ctaPass &&
    !strategySessionMismatch &&
    parentBrandPass &&
    readsLikePdfPass;

  return {
    jargon_translation_check: {
      passed: foundTerms.length === 0,
      found_terms: foundTerms,
    },
    business_specific_cta_check: {
      passed: ctaPass,
      required_cta_family: ctaFamily,
      detected_ctas: detectedCtas,
    },
    strategy_session_mismatch_check: {
      passed: !strategySessionMismatch,
      detail: strategySessionMismatch
        ? "Script recommends Book a Strategy Session for a non-JahKnowsPR client."
        : "No strategy-session mismatch detected.",
    },
    parent_sub_brand_check: {
      passed: parentBrandPass,
      detail: parentBrandPass
        ? "Parent and platform naming is clear for this script."
        : "Parent brand and media platform need clearer distinction in the script.",
    },
    reads_like_pdf_check: {
      passed: readsLikePdfPass,
      overlap_ratio: overlap,
    },
    approved_for_audio: approved,
  };
}

export function buildAuditAudioScript(report: FreeAuditReport, mode: AudioMode = "private_strategy_brief"): AuditAudioScript {
  const businessType = detectBusinessType(report);
  const isMontCity =
    /mont city|montcity/i.test(report.businessName) ||
    report.evidence.presence.some((value) => /mont city|montcity/i.test(value));
  const recommendedNextSteps = preferredNextStepsFor(businessType, report);
  const primaryNextStep = primaryNextStepFromReport(report, recommendedNextSteps[0] ?? "Request Details");
  const filingWarning = filingWarningFromReport(report);
  const recommendedNextStepsWithFiling = filingWarning
    ? [
      "File your DBA or LLC/Corporation before scaling marketing activity",
      ...recommendedNextSteps,
    ]
    : recommendedNextSteps;
  const scoreRead = buildScoreRead(report);
  const categoryBreakdowns = buildCategoryBreakdowns(report);
  const topIssues = categoryBreakdowns.slice(0, 2);
  const seed = [
    report.auditId,
    report.generatedAt,
    report.businessName,
    report.contactName,
    report.evidence.growthGoal,
    report.evidence.targetAudience,
    primaryNextStep,
    mode,
  ].join("|");
  const montCityNamingLine = isMontCity
    ? "Quick clarity point: Mont City Media Group is the parent company, and Mont City Network is the public media platform. Keep those roles clear everywhere."
    : "";
  const clarityPoint = audioClean(
    montCityNamingLine ||
      `${report.businessName} has something to build from. The clearest opportunity is to make the promise easier to understand, easier to trust, and easier to act on.`,
  );
  const hiddenCost = "The hidden cost is confusion. Someone can respect the brand and still not take action if the next step is not clear.";
  const firstMove = firstMoveFor(report, primaryNextStep);
  const closingSummary = closingFor(report, seed, primaryNextStep);
  const intro = openingLineFor(report, seed, primaryNextStep, topIssues);
  const setupLine = setupLineFor(report, seed, primaryNextStep);
  const bigPicture = bigPictureFor(report, seed, primaryNextStep);

  const plainLanguageBrief: PlainLanguageAudioBrief = {
    client_name: clientName(report),
    brand_name: report.businessName,
    business_type: businessType,
    tone: "plain-language strategist voice note",
    reading_level: "everyday business owner",
    intro,
    big_picture: bigPicture,
    score_read: `${scoreRead}. These scores are signals, not insults. They show what is clear, what needs more trust, and where the next step needs to be easier.`,
    category_breakdowns: categoryBreakdowns,
    hidden_cost: hiddenCost,
    first_move: firstMove,
    recommended_next_steps: recommendedNextStepsWithFiling,
    closing_summary: closingSummary,
  };

  const conversationalSegments: AuditAudioScript["segments"] = mode === "podcast_deep_dive"
    ? buildPodcastDeepDiveSegments(
      plainLanguageBrief,
      topIssues,
      filingWarning,
      clarityPoint,
      firstMove,
      recommendedNextStepsWithFiling,
      closingSummary,
      setupLine,
    )
    : mode === "executive_recap"
      ? buildExecutiveRecapSegments(
        plainLanguageBrief,
        topIssues,
        clarityPoint,
        firstMove,
        recommendedNextStepsWithFiling,
        closingSummary,
        setupLine,
      )
      : buildPrivateStrategySegments(
        plainLanguageBrief,
        topIssues,
        filingWarning,
        clarityPoint,
        firstMove,
        recommendedNextStepsWithFiling,
        closingSummary,
        setupLine,
      );

  const cappedSegments = capSegmentsForMaxLength(conversationalSegments);
  const rawScript = scriptFromSegments(cappedSegments);
  const words = wordCount(rawScript);
  const checks = buildChecks(rawScript, report, businessType, recommendedNextSteps);

  return {
    title: `${report.businessName} Audio Strategy Brief`,
    mode,
    script: rawScript,
    wordCount: words,
    estimatedMinutes: estimatedMinutesFor(words),
    segments: cappedSegments,
    plain_language_audio_brief: plainLanguageBrief,
    checks,
  };
}
