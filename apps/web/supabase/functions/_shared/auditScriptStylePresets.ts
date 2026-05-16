export type ScriptStyleSource = "industry_key" | "business_type" | "default";

export type AuditScriptStylePreset = {
  id: string;
  label: string;
  source: ScriptStyleSource;
  instructions: string;
};

type PresetTemplate = Omit<AuditScriptStylePreset, "source">;

const PRESET_DEFAULT: PresetTemplate = {
  id: "clear_podcast_strategy",
  label: "Clear podcast strategy",
  instructions:
    "Use a warm podcast strategist rhythm. Start with a sharp hook, then clarify stakes, then give a direct action path. Prefer concrete verbs, short sentences, and one callback phrase near the end.",
};

const PRESET_NONPROFIT: PresetTemplate = {
  id: "community_movement_invitation",
  label: "Community movement invitation",
  instructions:
    "Use movement language rooted in service and belonging. Build from mission to evidence to invitation. Keep urgency grounded in impact, dignity, and shared responsibility.",
};

const PRESET_CHURCH: PresetTemplate = {
  id: "pastoral_story_invitation",
  label: "Pastoral story invitation",
  instructions:
    "Use sermon-like pacing without preaching at the listener. Open with a clear human tension, give hope through practical clarity, and close with a gentle call to participate.",
};

const PRESET_MEDIA: PresetTemplate = {
  id: "cinematic_proof_offer",
  label: "Cinematic proof and offer",
  instructions:
    "Use cinematic cadence with clear scenes. Move from attention to trust to action. Highlight outcomes and proof quickly, then state the primary call to action with confidence.",
};

const PRESET_PHOTOGRAPHY: PresetTemplate = {
  id: "visual_story_booking",
  label: "Visual story booking",
  instructions:
    "Use image-rich phrasing that helps listeners picture the before and after. Keep language tactile and simple. Connect trust signals to one clear booking step.",
};

const PRESET_FOOD: PresetTemplate = {
  id: "hospitality_signal_clarity",
  label: "Hospitality signal clarity",
  instructions:
    "Use welcoming hospitality language. Balance appetite and trust. Keep the path from interest to reservation, order, or catering request explicit and immediate.",
};

const PRESET_WELLNESS: PresetTemplate = {
  id: "care_transformation_path",
  label: "Care transformation path",
  instructions:
    "Use a caring, grounded tone focused on outcomes and trust. Emphasize emotional safety, clear benefits, and a direct next step without hype.",
};

const PRESET_RETAIL: PresetTemplate = {
  id: "product_story_conversion",
  label: "Product story conversion",
  instructions:
    "Use crisp ecommerce pacing. Tie product promise to proof and ease. Keep the purchase path frictionless in language and end with one primary shopper action.",
};

const PRESET_PRO_SERVICES: PresetTemplate = {
  id: "executive_advisor_clarity",
  label: "Executive advisor clarity",
  instructions:
    "Use concise executive advisor language. Frame risk, opportunity, and a practical next move. Keep confidence high and avoid buzzwords.",
};

const PRESET_EDUCATION: PresetTemplate = {
  id: "mentor_guided_progression",
  label: "Mentor guided progression",
  instructions:
    "Use mentor voice and progression framing. Clarify what learners gain, why trust is earned, and what enrollment or inquiry step to take now.",
};

const PRESET_JAHKNOWSPR: PresetTemplate = {
  id: "jahknowspr_growth_funnel",
  label: "Jah Knows PR growth funnel",
  instructions:
    "Use premium strategist delivery with direct conversion language. Preserve the Jah Knows PR consultation funnel framing and keep calls to action commercially precise.",
};

const PRESET_BY_INDUSTRY: Record<string, PresetTemplate> = {
  nonprofit_church: PRESET_NONPROFIT,
  church_ministry: PRESET_CHURCH,
  media_production: PRESET_MEDIA,
  photography: PRESET_PHOTOGRAPHY,
  food_hospitality: PRESET_FOOD,
  beauty_wellness: PRESET_WELLNESS,
  retail_ecommerce: PRESET_RETAIL,
  professional_services: PRESET_PRO_SERVICES,
  education_course: PRESET_EDUCATION,
  general_business: PRESET_DEFAULT,
};

const PRESET_BY_BUSINESS_TYPE: Record<string, PresetTemplate> = {
  nonprofit: PRESET_NONPROFIT,
  church: PRESET_CHURCH,
  media_production_platform: PRESET_MEDIA,
  jahknowspr: PRESET_JAHKNOWSPR,
  general_business: PRESET_DEFAULT,
};

function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function resolveAuditScriptStylePreset(input: {
  industryKey?: unknown;
  businessType?: unknown;
}): AuditScriptStylePreset {
  const normalizedIndustry = normalize(input.industryKey);
  const byIndustry = PRESET_BY_INDUSTRY[normalizedIndustry];
  if (byIndustry) {
    return { ...byIndustry, source: "industry_key" };
  }

  const normalizedBusinessType = normalize(input.businessType);
  const byBusinessType = PRESET_BY_BUSINESS_TYPE[normalizedBusinessType];
  if (byBusinessType) {
    return { ...byBusinessType, source: "business_type" };
  }

  return { ...PRESET_DEFAULT, source: "default" };
}
