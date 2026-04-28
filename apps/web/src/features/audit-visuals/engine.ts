export type ReadinessLevel = "HOT" | "WARM" | "COLD";
export type AuditVisualType = "hero" | "score" | "insight";

export type AuditVisualInput = {
  client_name: string;
  positioning_score: number;
  audience_score: number;
  authority_score: number;
  messaging_score: number;
  conversion_score: number;
  messaging_angle: string;
  primary_gap: string;
  audience_pain: string;
  brand_tone: string;
  industry: string;
  readiness_level: ReadinessLevel;
  lls_memory_context?: string | null;
  creative_direction?: string | null;
  style_seed?: string | null;
};

const STYLE_SEEDS = [
  "Quiet luxury editorial spread, museum catalog discipline, asymmetrical navy blocks, gold rule lines.",
  "Architectural blueprint energy, precise grid, offset planes, restrained negative space, tactile paper feel.",
  "A24 title card influence, stark contrast, one symbolic rupture, cinematic but not dramatic.",
  "Luxury strategy memo, Swiss editorial grid, layered off-white cards, gold registration marks.",
  "Modern brand audit artifact, abstract alignment study, refined hierarchy, premium consultancy tone.",
  "Minimal gallery wall composition, structural shadows, subtle paper grain, deep navy anchor shapes.",
  "High-end annual report cover, bold serif scale, geometric tension, muted gold intervention.",
  "Editorial diagnosis dossier, margin notes implied by layout, fragmented center object, clean restraint.",
];

export function randomAuditVisualStyleSeed(): string {
  return STYLE_SEEDS[Math.floor(Math.random() * STYLE_SEEDS.length)];
}

export type AuditScoreKey =
  | "positioning_score"
  | "audience_score"
  | "authority_score"
  | "messaging_score"
  | "conversion_score";

const SCORE_LABELS: Record<AuditScoreKey, string> = {
  positioning_score: "Positioning",
  audience_score: "Audience",
  authority_score: "Authority",
  messaging_score: "Messaging",
  conversion_score: "Conversion",
};

const STYLE_BLOCK = [
  "Premium editorial brand strategy visual.",
  "A24 + Apple keynote + high-end magazine art direction energy.",
  "Mandatory JahKnowsPR brand system: deep navy #0A1A35, gold #C59B3C / #E6C769, off-white #F7F3EA, black-neutral accents.",
  "Leave clean negative space for fixed JahKnowsPR logo placement in the final layout header and footer.",
  "Do not invent or distort logos; the real JahKnowsPR logo is applied by the template renderer.",
  "Grid-based composition, strong negative space, minimal supporting text, bold headers.",
  "No stock illustrations, no clipart, no SaaS dashboard look, no generic icon sets.",
  "No bright startup gradients.",
].join(" ");

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function normalizeAuditVisualInput(input: AuditVisualInput): AuditVisualInput {
  return {
    ...input,
    client_name: input.client_name?.trim() || "Client",
    messaging_angle: input.messaging_angle?.trim() || "brand_diagnosis",
    primary_gap: input.primary_gap?.trim() || "Positioning gap",
    audience_pain: input.audience_pain?.trim() || "Audience lacks clarity on value",
    brand_tone: input.brand_tone?.trim() || "strategic and premium",
    industry: input.industry?.trim() || "professional services",
    creative_direction: input.creative_direction?.trim() || null,
    style_seed: input.style_seed?.trim() || null,
    positioning_score: clampScore(input.positioning_score),
    audience_score: clampScore(input.audience_score),
    authority_score: clampScore(input.authority_score),
    messaging_score: clampScore(input.messaging_score),
    conversion_score: clampScore(input.conversion_score),
  };
}

export function getWeakestMetric(input: AuditVisualInput): { key: AuditScoreKey; label: string; score: number } {
  const entries: Array<{ key: AuditScoreKey; score: number }> = [
    { key: "positioning_score", score: input.positioning_score },
    { key: "audience_score", score: input.audience_score },
    { key: "authority_score", score: input.authority_score },
    { key: "messaging_score", score: input.messaging_score },
    { key: "conversion_score", score: input.conversion_score },
  ];
  entries.sort((a, b) => a.score - b.score);
  const weakest = entries[0];
  return { key: weakest.key, score: weakest.score, label: SCORE_LABELS[weakest.key] };
}

export function visualMetaphor(input: AuditVisualInput): string {
  if (input.positioning_score < 50) {
    return "Misaligned geometric planes and offset layers to represent a positioning gap.";
  }
  if (input.authority_score < 50) {
    return "Weak or unstable vertical structure with broken hierarchy blocks.";
  }
  if (input.conversion_score < 50) {
    return "An incomplete flow path with a visible break before conversion.";
  }
  if (input.audience_score < 50) {
    return "Fragmented, slightly blurred structural clusters showing audience confusion.";
  }
  if (input.messaging_score >= 70) {
    return "Crisp centered alignment and strong directional line representing messaging clarity.";
  }
  return "Balanced geometry with one subtle tension point reflecting strategic friction.";
}

function typeSpecificComposition(input: AuditVisualInput, visualType: AuditVisualType): string {
  const weakest = getWeakestMetric(input);
  if (visualType === "hero") {
    return [
      "Hero diagnosis visual with one dominant abstract composition.",
      `The main metaphor should emphasize: ${visualMetaphor(input)}`,
      `Primary gap: ${input.primary_gap}. Audience pain: ${input.audience_pain}.`,
      "Create the abstract visual layer only; do not place fake logos or large text inside the image.",
    ].join(" ");
  }

  if (visualType === "score") {
    return [
      "Minimal score visualization artifact, horizontal or radial.",
      "Show five score bands with clean labels and no dashboard clutter.",
      `Weakest metric (${weakest.label}) must be visually emphasized.`,
      "Use geometry and line weight to show weakness, not emoji/icons.",
    ].join(" ");
  }

  return [
    "Insight block visual combining short statement and symbolic visual.",
    "Include this statement exactly:",
    '"You’re not struggling to post. You’re struggling to position."',
    "Pair with metaphorical geometry and strategic negative space.",
    "Feels like a premium strategy artifact for a client handoff.",
  ].join(" ");
}

export function buildAuditVisualPrompt(inputRaw: AuditVisualInput, visualType: AuditVisualType): string {
  const input = normalizeAuditVisualInput(inputRaw);
  return [
    STYLE_BLOCK,
    typeSpecificComposition(input, visualType),
    `Client context: ${input.client_name} | Industry: ${input.industry} | Tone: ${input.brand_tone} | Readiness: ${input.readiness_level}.`,
    `Messaging angle: ${input.messaging_angle}.`,
    input.style_seed ? `Unique visual style seed for this generation: ${input.style_seed}.` : "",
    input.creative_direction
      ? `Human art direction / inspiration from JahKnowsPR: ${input.creative_direction}. Treat this like guidance from the creative director, but keep all brand rules intact.`
      : "Human art direction / inspiration: none supplied.",
    `Scores: Positioning ${input.positioning_score}/100, Audience ${input.audience_score}/100, Authority ${input.authority_score}/100, Messaging ${input.messaging_score}/100, Conversion ${input.conversion_score}/100.`,
    input.lls_memory_context
      ? `Future memory alignment context (LLS): ${input.lls_memory_context}.`
      : "Future memory alignment context (LLS): not yet attached.",
    "Strictly no stock iconography, no cartoon/clip-art, no generic infographic templates.",
  ].filter(Boolean).join("\n");
}

export function scoreRows(inputRaw: AuditVisualInput): Array<{ key: AuditScoreKey; label: string; value: number }> {
  const input = normalizeAuditVisualInput(inputRaw);
  return [
    { key: "positioning_score", label: "Positioning", value: input.positioning_score },
    { key: "audience_score", label: "Audience", value: input.audience_score },
    { key: "authority_score", label: "Authority", value: input.authority_score },
    { key: "messaging_score", label: "Messaging", value: input.messaging_score },
    { key: "conversion_score", label: "Conversion", value: input.conversion_score },
  ];
}
