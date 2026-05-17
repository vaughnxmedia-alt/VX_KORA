import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { collectFreeAuditAttribution, type FreeAuditAttribution } from "@/lib/freeAuditAttribution";
import { trackAuditPageView, trackAuditRequestSubmit, trackFormStart } from "@/lib/kora-analytics";
import { StructuredData } from "@/components/StructuredData";
import { breadcrumbListSchema, serviceSchema } from "@/lib/structured-data";

type Intent = "ready_now" | "open_if_it_makes_sense" | "just_looking";
type Readiness = "HOT" | "WARM" | "COLD";
type BusinessEntityType = "corporation" | "sole_proprietor" | "personal_brand_without_documentation";

type FormState = {
  email: string;
  phone: string;
  name: string;
  businessEntityType: BusinessEntityType | "";
  businessName: string;
  publicBusinessName: string;
  websiteUrl: string;
  websiteNotStarted: boolean;
  websiteLink: string;
  instagramUrl: string;
  instagramNotStarted: boolean;
  instagram: string;
  facebookUrl: string;
  facebookNotStarted: boolean;
  facebook: string;
  tiktokUrl: string;
  tiktokNotStarted: boolean;
  tiktok: string;
  otherPublicPages: string;
  otherPublicPagesNotStarted: boolean;
  otherSocials: string;
  growthGoal: string;
  currentBlocker: string;
  targetAudienceBelief: string;
  intent: Intent | "";
};

const INITIAL_FORM: FormState = {
  email: "",
  phone: "",
  name: "",
  businessEntityType: "",
  businessName: "",
  publicBusinessName: "",
  websiteUrl: "",
  websiteNotStarted: false,
  websiteLink: "",
  instagramUrl: "",
  instagramNotStarted: false,
  instagram: "",
  facebookUrl: "",
  facebookNotStarted: false,
  facebook: "",
  tiktokUrl: "",
  tiktokNotStarted: false,
  tiktok: "",
  otherPublicPages: "",
  otherPublicPagesNotStarted: false,
  otherSocials: "",
  growthGoal: "",
  currentBlocker: "",
  targetAudienceBelief: "",
  intent: "",
};

type Question = {
  key: keyof FormState;
  eyebrow: string;
  title: string;
  description?: string;
  required?: boolean;
  input: "text" | "email" | "tel" | "url" | "textarea" | "intent" | "business_entity" | "other_socials";
  placeholder?: string;
};

const OTHER_SOCIAL_OPTIONS = [
  { id: "linkedin", label: "LinkedIn", placeholder: "LinkedIn profile or company page link" },
  { id: "youtube", label: "YouTube", placeholder: "YouTube channel link or @handle" },
  { id: "google_business", label: "Google Business Profile", placeholder: "Google Business Profile link or business listing name" },
  { id: "x", label: "X / Twitter", placeholder: "X profile link or @handle" },
  { id: "threads", label: "Threads", placeholder: "Threads profile link or @handle" },
  { id: "pinterest", label: "Pinterest", placeholder: "Pinterest profile link" },
  { id: "yelp", label: "Yelp", placeholder: "Yelp listing link" },
  { id: "podcast", label: "Podcast", placeholder: "Podcast link, show page, or Spotify/Apple link" },
  { id: "newsletter", label: "Newsletter", placeholder: "Newsletter signup or publication link" },
  { id: "portfolio", label: "Portfolio / Booking Page", placeholder: "Portfolio, booking, Linktree, Beacons, or Stan Store link" },
  { id: "other", label: "Other", placeholder: "Paste any other public profile or page" },
  { id: "none", label: "No other pages", placeholder: "" },
] as const;

const QUESTIONS: Question[] = [
  {
    key: "email",
    eyebrow: "Contact",
    title: "Where should we send your audit notes?",
    required: true,
    input: "email",
    placeholder: "you@example.com",
  },
  {
    key: "name",
    eyebrow: "Contact",
    title: "What is your name?",
    input: "text",
    placeholder: "Your name",
  },
  {
    key: "phone",
    eyebrow: "Contact",
    title: "What phone number should we use if follow-up is needed?",
    input: "tel",
    placeholder: "(555) 555-5555",
  },
  {
    key: "businessEntityType",
    eyebrow: "Brand",
    title: "How is this brand set up right now?",
    description: "Choose the option that best matches how this brand is currently operating.",
    required: true,
    input: "business_entity",
  },
  {
    key: "businessName",
    eyebrow: "Brand",
    title: "What is your business or brand name?",
    input: "text",
    placeholder: "Business name",
  },
  {
    key: "publicBusinessName",
    eyebrow: "Brand",
    title: "What name does your business use publicly?",
    description: "Enter the customer-facing name people see on your website, social media, signage, content, or public profiles.",
    input: "text",
    placeholder: "Public-facing business or brand name",
  },
  {
    key: "websiteUrl",
    eyebrow: "Presence",
    title: "Do you have a website?",
    input: "url",
    placeholder: "https://...",
  },
  {
    key: "instagramUrl",
    eyebrow: "Presence",
    title: "What is your Instagram?",
    input: "text",
    placeholder: "@yourbrand",
  },
  {
    key: "facebookUrl",
    eyebrow: "Presence",
    title: "What is your Facebook?",
    input: "text",
    placeholder: "Facebook page or profile link",
  },
  {
    key: "tiktokUrl",
    eyebrow: "Presence",
    title: "What is your TikTok?",
    input: "text",
    placeholder: "@yourbrand",
  },
  {
    key: "otherPublicPages",
    eyebrow: "Presence",
    title: "Do you use any other public pages?",
    description: "Tap a platform, then add the username or paste the profile link. More links help us understand your full public brand footprint.",
    input: "other_socials",
  },
  {
    key: "growthGoal",
    eyebrow: "Diagnosis",
    title: "What are you currently trying to grow?",
    required: true,
    input: "textarea",
    placeholder: "Audience, sales, bookings, credibility, visibility...",
  },
  {
    key: "currentBlocker",
    eyebrow: "Diagnosis",
    title: "What's NOT working right now?",
    required: true,
    input: "textarea",
    placeholder: "Tell us where the brand feels stuck.",
  },
  {
    key: "targetAudienceBelief",
    eyebrow: "Diagnosis",
    title: "Who do you believe your target audience is?",
    required: true,
    input: "textarea",
    placeholder: "Describe who you think you are trying to reach.",
  },
  {
    key: "intent",
    eyebrow: "Intent",
    title: "How ready are you to fix the positioning gap?",
    required: true,
    input: "intent",
  },
].map((question) => ({ ...question, required: true }));

type PresenceFieldKey =
  | "websiteUrl"
  | "instagramUrl"
  | "facebookUrl"
  | "tiktokUrl"
  | "otherPublicPages";

type PresenceFlagKey =
  | "websiteNotStarted"
  | "instagramNotStarted"
  | "facebookNotStarted"
  | "tiktokNotStarted"
  | "otherPublicPagesNotStarted";

type LegacyPresenceFieldKey =
  | "websiteLink"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "otherSocials";

const PRESENCE_CONFIG: Record<PresenceFieldKey, { legacyKey: LegacyPresenceFieldKey; notStartedKey: PresenceFlagKey }> = {
  websiteUrl: { legacyKey: "websiteLink", notStartedKey: "websiteNotStarted" },
  instagramUrl: { legacyKey: "instagram", notStartedKey: "instagramNotStarted" },
  facebookUrl: { legacyKey: "facebook", notStartedKey: "facebookNotStarted" },
  tiktokUrl: { legacyKey: "tiktok", notStartedKey: "tiktokNotStarted" },
  otherPublicPages: { legacyKey: "otherSocials", notStartedKey: "otherPublicPagesNotStarted" },
};

const PRESENCE_FIELDS = Object.keys(PRESENCE_CONFIG) as PresenceFieldKey[];

function setMeta(selector: string, attr: "content" | "href", value: string) {
  const node = document.querySelector(selector);
  if (node) node.setAttribute(attr, value);
}

function readinessFromIntent(intent: Intent | ""): Readiness {
  if (intent === "ready_now") return "HOT";
  if (intent === "open_if_it_makes_sense") return "WARM";
  return "COLD";
}

function isQuestionAnswered(form: FormState, question: Question): boolean {
  if (PRESENCE_FIELDS.includes(question.key as PresenceFieldKey)) {
    const key = question.key as PresenceFieldKey;
    const config = PRESENCE_CONFIG[key];
    return form[key].trim().length > 0 || form[config.notStartedKey];
  }
  const value = form[question.key];
  return typeof value === "string" && value.trim().length > 0;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function contextDepth(value: string): number {
  const length = value.trim().length;
  if (length > 180) return 8;
  if (length > 90) return 5;
  if (length > 35) return 2;
  return -4;
}

function normalizeAuditAngle(value: string | null | undefined): string {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized || normalized === "free_audit" || normalized === "free_brand_audit") return "brand_diagnosis";
  return normalized.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "brand_diagnosis";
}

async function freeAuditFunctionErrorMessage(error: Error): Promise<string> {
  const context = (error as { context?: unknown }).context;
  if (context && typeof context === "object" && "json" in (context as Record<string, unknown>)) {
    try {
      const payload = await (context as { json: () => Promise<unknown> }).json();
      const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
      if (typeof record.error === "string" && record.error !== "Invalid free audit payload") return record.error;
      const details = record.details && typeof record.details === "object"
        ? record.details as { fieldErrors?: Record<string, string[]> }
        : null;
      const fieldErrors = details?.fieldErrors ?? {};
      const firstError = Object.entries(fieldErrors).find(([, messages]) => messages?.length);
      if (firstError) {
        return `Please check ${firstError[0].replace(/([A-Z])/g, " $1").toLowerCase()}: ${firstError[1][0]}`;
      }
    } catch {
      // keep fallback
    }
  }
  return error.message || "Could not submit audit.";
}

function inferIndustry(form: FormState): string {
  const blob = [
    form.businessName,
    form.publicBusinessName,
    form.websiteUrl,
    form.instagramUrl,
    form.facebookUrl,
    form.tiktokUrl,
    form.otherPublicPages,
    form.growthGoal,
    form.currentBlocker,
    form.targetAudienceBelief,
  ].join(" ").toLowerCase();
  if (/(beauty|skin|spa|salon|wellness|fitness|health|therapy)/.test(blob)) return "beauty_wellness";
  if (/(law|legal|attorney|finance|accounting|consulting firm)/.test(blob)) return "law_professional";
  if (/(real estate|realtor|property|broker|mortgage)/.test(blob)) return "real_estate";
  if (/(music|artist|film|media|podcast|entertainment)/.test(blob)) return "music_entertainment";
  if (/(coach|consultant|course|speaker|mentor|advisor)/.test(blob)) return "coaching_consulting";
  if (/(restaurant|food|chef|cafe|bar|hospitality)/.test(blob)) return "restaurant_hospitality";
  if (/(nonprofit|community|foundation|ministry|donation)/.test(blob)) return "nonprofit_community";
  return "professional_services";
}

function buildBrandStageSignals(form: FormState) {
  const normalizePresenceValue = (value: string): string => {
    const trimmed = value.trim();
    const lowered = trimmed.toLowerCase();
    if (
      !trimmed ||
      lowered === "no other public pages submitted." ||
      lowered === "no other public pages submitted" ||
      lowered === "no other pages" ||
      lowered === "none" ||
      lowered === "n/a"
    ) {
      return "";
    }
    return trimmed;
  };
  const channels = {
    website: { value: normalizePresenceValue(form.websiteUrl), not_started: form.websiteNotStarted },
    instagram: { value: normalizePresenceValue(form.instagramUrl), not_started: form.instagramNotStarted },
    facebook: { value: normalizePresenceValue(form.facebookUrl), not_started: form.facebookNotStarted },
    tiktok: { value: normalizePresenceValue(form.tiktokUrl), not_started: form.tiktokNotStarted },
    other_public_pages: { value: normalizePresenceValue(form.otherPublicPages), not_started: form.otherPublicPagesNotStarted },
  };
  const submittedPresenceCount = Object.values(channels).filter((channel) => channel.value.length > 0).length;
  const presenceNotStartedCount = Object.values(channels).filter((channel) => channel.not_started).length;

  return {
    presence_not_started_count: presenceNotStartedCount,
    submitted_presence_count: submittedPresenceCount,
    has_any_public_presence: submittedPresenceCount > 0,
    channels: {
      website_not_started: channels.website.not_started,
      instagram_not_started: channels.instagram.not_started,
      facebook_not_started: channels.facebook.not_started,
      tiktok_not_started: channels.tiktok.not_started,
      other_public_pages_not_started: channels.other_public_pages.not_started,
    },
  };
}

function normalizeCorePresenceValue(value: string): string {
  const trimmed = value.trim();
  const lowered = trimmed.toLowerCase();
  if (!trimmed || lowered === "none" || lowered === "n/a" || lowered === "not started") return "";
  return trimmed;
}

function qualifiesForAuditPipeline(form: FormState): boolean {
  const hasWebsite = normalizeCorePresenceValue(form.websiteUrl).length > 0;
  const hasAllCoreSocials = [
    normalizeCorePresenceValue(form.instagramUrl),
    normalizeCorePresenceValue(form.facebookUrl),
    normalizeCorePresenceValue(form.tiktokUrl),
  ].every((value) => value.length > 0);
  return hasWebsite || hasAllCoreSocials;
}

function buildAuditScoreSummary(form: FormState, readiness: Readiness, auditAngle: string) {
  const baseline = readiness === "HOT" ? 62 : readiness === "WARM" ? 54 : 44;
  const presenceCount = [form.websiteUrl, form.instagramUrl, form.facebookUrl, form.tiktokUrl, form.otherPublicPages]
    .filter((value) => value.trim().length > 0).length;
  const presenceNotStartedCount = [
    form.websiteNotStarted,
    form.instagramNotStarted,
    form.facebookNotStarted,
    form.tiktokNotStarted,
    form.otherPublicPagesNotStarted,
  ].filter(Boolean).length;
  const goalDepth = contextDepth(form.growthGoal);
  const blockerDepth = contextDepth(form.currentBlocker);
  const audienceDepth = contextDepth(form.targetAudienceBelief);
  const presenceBoost = Math.min(8, presenceCount * 2);
  const missingPresencePenalty = presenceCount > 0 ? 0 : (presenceNotStartedCount > 0 ? 0 : 8);

  return {
    positioning_score: clampScore(baseline - 8 + goalDepth - Math.max(0, blockerDepth / 2)),
    audience_score: clampScore(baseline - 5 + audienceDepth),
    authority_score: clampScore(baseline + presenceBoost - missingPresencePenalty),
    messaging_score: clampScore(baseline - 2 + Math.min(5, goalDepth + audienceDepth)),
    conversion_score: clampScore(baseline - 10 + (form.intent === "ready_now" ? 5 : 0) + Math.min(4, presenceCount)),
    primary_gap: form.currentBlocker.trim(),
    audience_pain: form.targetAudienceBelief.trim(),
    growth_goal: form.growthGoal.trim(),
    messaging_angle: auditAngle,
    brand_tone: "premium editorial strategic",
    industry: inferIndustry(form),
    evidence: {
      submitted_presence_count: presenceCount,
      presence_not_started_count: presenceNotStartedCount,
      has_website: Boolean(form.websiteUrl.trim()),
      has_social_context: presenceCount > 1,
      channels_not_started: {
        website_not_started: form.websiteNotStarted,
        instagram_not_started: form.instagramNotStarted,
        facebook_not_started: form.facebookNotStarted,
        tiktok_not_started: form.tiktokNotStarted,
        other_public_pages_not_started: form.otherPublicPagesNotStarted,
      },
      answer_depth: {
        growth_goal: form.growthGoal.trim().length,
        current_blocker: form.currentBlocker.trim().length,
        target_audience_belief: form.targetAudienceBelief.trim().length,
      },
    },
  };
}

export default function FreeAudit() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [attribution, setAttribution] = useState<FreeAuditAttribution | null>(null);
  const [started, setStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [filingAcknowledged, setFilingAcknowledged] = useState(false);
  const [selectedOtherSocial, setSelectedOtherSocial] = useState<(typeof OTHER_SOCIAL_OPTIONS)[number]["id"] | null>(null);
  const [otherSocialValues, setOtherSocialValues] = useState<Record<string, string>>({});
  const readiness = useMemo(() => readinessFromIntent(form.intent), [form.intent]);
  const currentQuestion = QUESTIONS[currentStep];
  const requiresFilingAcknowledgement = form.businessEntityType === "personal_brand_without_documentation";
  const isBusinessNameStep = currentQuestion?.key === "businessName";
  const filingAckRequiredNow = requiresFilingAcknowledgement && isBusinessNameStep;
  const filingAckMissing = requiresFilingAcknowledgement && !filingAcknowledged;
  const resolvedQuestion = useMemo(() => {
    if (!currentQuestion || currentQuestion.key !== "businessName") return currentQuestion;
    if (form.businessEntityType === "corporation") {
      return {
        ...currentQuestion,
        title: "What is your registered business name?",
        description: "Use the business name exactly as registered for your corporation or LLC.",
        placeholder: "Registered business name",
      };
    }
    if (form.businessEntityType === "sole_proprietor") {
      return {
        ...currentQuestion,
        title: "What is your DBA name?",
        description: "Use the Doing Business As (DBA) name you are using publicly.",
        placeholder: "DBA name",
      };
    }
    if (form.businessEntityType === "personal_brand_without_documentation") {
      return {
        ...currentQuestion,
        title: "What is your brand name? (without documentation)",
        description: "We can still run your full audit. Before scaling marketing, filing a DBA or LLC/Corporation should be your immediate next step.",
        placeholder: "Brand name used publicly",
      };
    }
    return {
      ...currentQuestion,
      title: "What is your business or brand name?",
      description: "Choose your business structure first, then add the matching name here.",
      placeholder: "Business or brand name",
    };
  }, [currentQuestion, form.businessEntityType]);
  const progress = Math.round(((currentStep + 1) / QUESTIONS.length) * 100);
  const currentRequiredMissing = Boolean(
    (currentQuestion?.required && !isQuestionAnswered(form, currentQuestion)) ||
    filingAckRequiredNow && !filingAcknowledged,
  );
  const allQuestionsAnswered = QUESTIONS.every((question) => isQuestionAnswered(form, question));

  useEffect(() => {
    document.title = "Free Brand Audit | JahKnowsPR";
    setMeta('meta[name="description"]', "content", "Start a free JahKnowsPR brand audit to identify what is blocking your brand from converting.");
    setMeta('link[rel="canonical"]', "href", "https://www.jahknowspr.com/free-audit");
    setMeta('meta[property="og:title"]', "content", "Free Brand Audit | JahKnowsPR");
    setMeta('meta[property="og:description"]', "content", "Identify what is blocking your brand from converting and move into a Strategy Session when ready.");
    setMeta('meta[property="og:url"]', "content", "https://www.jahknowspr.com/free-audit");
    setAttribution(collectFreeAuditAttribution());
    trackAuditPageView({
      page_path: "/free-audit",
      funnel_id: "free_audit",
      funnel_step: "landing",
      offer_id: "free_audit",
      lead_magnet_id: "free_audit",
      offer_stage: "free",
    });
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setSubmitError(null);
    setForm((current) => {
      const next = { ...current, [key]: value } as FormState;
      if (key === "businessEntityType" && value !== "personal_brand_without_documentation") {
        setFilingAcknowledged(false);
      }
      if (PRESENCE_FIELDS.includes(key as PresenceFieldKey)) {
        const field = key as PresenceFieldKey;
        const config = PRESENCE_CONFIG[field];
        const textValue = String(value ?? "");
        next[config.legacyKey] = textValue;
        if (textValue.trim()) next[config.notStartedKey] = false;
      }
      return next;
    });
  }

  function setPresenceNotStarted(field: PresenceFieldKey, checked: boolean) {
    const config = PRESENCE_CONFIG[field];
    setSubmitError(null);
    setForm((current) => {
      const next = { ...current, [config.notStartedKey]: checked } as FormState;
      if (checked) {
        next[field] = "";
        next[config.legacyKey] = "";
      }
      return next;
    });
    if (field === "otherPublicPages") {
      if (checked) {
        setSelectedOtherSocial("none");
        setOtherSocialValues({});
      } else if (selectedOtherSocial === "none") {
        setSelectedOtherSocial(null);
      }
    }
  }

  function syncOtherSocials(nextValues: Record<string, string>, selectedId = selectedOtherSocial) {
    const lines = OTHER_SOCIAL_OPTIONS
      .filter((option) => option.id !== "none")
      .map((option) => {
        const value = nextValues[option.id]?.trim();
        return value ? `${option.label}: ${value}` : "";
      })
      .filter(Boolean);
    if (selectedId === "none") {
      setPresenceNotStarted("otherPublicPages", true);
      return;
    }
    update("otherPublicPages", lines.join("\n"));
  }

  function selectOtherSocial(optionId: (typeof OTHER_SOCIAL_OPTIONS)[number]["id"]) {
    setSubmitError(null);
    setSelectedOtherSocial(optionId);
    if (optionId === "none") {
      const cleared: Record<string, string> = {};
      setOtherSocialValues(cleared);
      setPresenceNotStarted("otherPublicPages", true);
      return;
    }
    if (form.otherPublicPagesNotStarted) setPresenceNotStarted("otherPublicPages", false);
    syncOtherSocials(otherSocialValues, optionId);
  }

  function updateOtherSocialValue(optionId: string, value: string) {
    setSubmitError(null);
    if (form.otherPublicPagesNotStarted) setPresenceNotStarted("otherPublicPages", false);
    const nextValues = { ...otherSocialValues, [optionId]: value };
    setOtherSocialValues(nextValues);
    syncOtherSocials(nextValues, optionId as (typeof OTHER_SOCIAL_OPTIONS)[number]["id"]);
  }

  function goNext() {
    if (currentRequiredMissing) return;
    trackFormStart({
      page_path: "/free-audit",
      form_id: "free-audit-form",
      form_name: "Free Audit Diagnosis",
      funnel_id: "free_audit",
      funnel_step: `question_${currentStep + 1}`,
      lead_magnet_id: "free_audit",
      offer_stage: "free",
    });
    setCurrentStep((step) => Math.min(QUESTIONS.length - 1, step + 1));
  }

  function goBack() {
    setCurrentStep((step) => Math.max(0, step - 1));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (filingAckMissing) {
      setSubmitError("Please acknowledge the filing notice before submitting.");
      return;
    }
    if (!form.intent) {
      setSubmitError("Please select your readiness intent before submitting.");
      return;
    }
    if (currentRequiredMissing || !allQuestionsAnswered) {
      setSubmitError("Please complete all required questions before submitting.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    const nextAttribution = collectFreeAuditAttribution({
      messaging_angle: attribution?.messaging_angle ?? "positioning_gap",
      hook: attribution?.hook ?? "free_brand_audit",
    });
    const auditAngle = normalizeAuditAngle(nextAttribution.messaging_angle);
    const scoreSummary = buildAuditScoreSummary(form, readiness, auditAngle);
    const brandStageSignals = buildBrandStageSignals(form);
    const usesBrandFoundationPipeline = !qualifiesForAuditPipeline(form);
    try {
      const submit = await supabase.functions.invoke("free-audit-submit", {
        body: {
          ...form,
          intent: form.intent,
          readinessLevel: readiness,
          auditAngle,
          intendedCta: "book_strategy_session",
          predictedConversionProbability: readiness === "HOT" ? 0.42 : readiness === "WARM" ? 0.22 : 0.08,
          expectedBaseline: 0.12,
          attribution: { ...nextAttribution, messaging_angle: auditAngle },
          leadSource: { ...nextAttribution, messaging_angle: auditAngle },
          metadata: {
            readiness_level: readiness,
            source_page: "free_audit",
            lead_magnet_id: "free_audit",
            offer_stage: "free",
            buyer_key: nextAttribution.buyer_key,
            brand_stage_signals: brandStageSignals,
            report_mode: usesBrandFoundationPipeline ? "starter_guide" : "brand_diagnosis",
            report_inputs: {
              business_entity_type: form.businessEntityType,
              public_business_name: form.publicBusinessName.trim(),
              requires_filing_notice: form.businessEntityType === "personal_brand_without_documentation",
              website_url: form.websiteUrl.trim(),
              website_not_started: form.websiteNotStarted,
              instagram_url: form.instagramUrl.trim(),
              instagram_not_started: form.instagramNotStarted,
              facebook_url: form.facebookUrl.trim(),
              facebook_not_started: form.facebookNotStarted,
              tiktok_url: form.tiktokUrl.trim(),
              tiktok_not_started: form.tiktokNotStarted,
              other_public_pages: form.otherPublicPages.trim(),
              other_public_pages_not_started: form.otherPublicPagesNotStarted,
              growth_goal: form.growthGoal.trim(),
              current_blocker: form.currentBlocker.trim(),
              target_audience_belief: form.targetAudienceBelief.trim(),
              inferred_industry: scoreSummary.industry,
              audit_angle: auditAngle,
            },
          },
        },
      });
      if (submit.error || !submit.data?.auditId) {
        if (submit.error) throw new Error(await freeAuditFunctionErrorMessage(submit.error));
        throw new Error("Could not submit audit.");
      }
      const submitData = submit.data as {
        auditId: string;
        nextStep?: string;
        reportMode?: string;
      };
      const shouldRouteToBrandFoundation = usesBrandFoundationPipeline ||
        submitData.nextStep === "brand_foundation" ||
        submitData.reportMode === "starter_guide";

      await supabase.functions.invoke("free-audit-complete", {
        body: {
          auditId: submitData.auditId,
          completionStatus: "completed",
          scoreSummary: {
            readiness_level: readiness,
            intent: form.intent,
            ...scoreSummary,
          },
          actualOutcome: {
            lead_segmented: true,
            readiness_level: readiness,
            audit_angle: auditAngle,
          },
          ctaClicked: false,
          metadata: {
            attribution: { ...nextAttribution, messaging_angle: auditAngle },
            readiness_level: readiness,
            brand_stage_signals: brandStageSignals,
            report_mode: usesBrandFoundationPipeline ? "starter_guide" : "brand_diagnosis",
            report_inputs: {
              business_entity_type: form.businessEntityType,
              public_business_name: form.publicBusinessName.trim(),
              requires_filing_notice: form.businessEntityType === "personal_brand_without_documentation",
              website_url: form.websiteUrl.trim(),
              website_not_started: form.websiteNotStarted,
              instagram_url: form.instagramUrl.trim(),
              instagram_not_started: form.instagramNotStarted,
              facebook_url: form.facebookUrl.trim(),
              facebook_not_started: form.facebookNotStarted,
              tiktok_url: form.tiktokUrl.trim(),
              tiktok_not_started: form.tiktokNotStarted,
              other_public_pages: form.otherPublicPages.trim(),
              other_public_pages_not_started: form.otherPublicPagesNotStarted,
              growth_goal: form.growthGoal.trim(),
              current_blocker: form.currentBlocker.trim(),
              target_audience_belief: form.targetAudienceBelief.trim(),
              inferred_industry: scoreSummary.industry,
              audit_angle: auditAngle,
            },
          },
        },
      });

      trackAuditRequestSubmit({
        page_path: "/free-audit",
        form_id: "free-audit-form",
        form_name: "Free Audit Diagnosis",
        funnel_id: "free_audit",
        funnel_step: "submit",
        offer_id: "free_audit",
        lead_magnet_id: "free_audit",
        offer_stage: "free",
        buyer_key: nextAttribution.buyer_key,
        metadata: {
          readiness_level: readiness,
          correlation_id: nextAttribution.correlation_id,
        },
      });

      if (shouldRouteToBrandFoundation) {
        navigate("/brand-foundation", {
          replace: true,
          state: {
            readiness,
            auditId: submitData.auditId,
            businessName: form.publicBusinessName.trim() || form.businessName.trim() || "your new business",
          },
        });
      } else {
        navigate("/free-audit/thank-you", {
          replace: true,
          state: { readiness, nextStep: submitData.nextStep, reportMode: submitData.reportMode },
        });
      }
    } catch (error) {
      console.error("free audit submit failed", error);
      const message = error instanceof Error ? error.message : "Could not submit audit.";
      setSubmitError(message);
      alert(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <StructuredData
        id="free-brand-diagnosis"
        data={[
          serviceSchema({
            name: "Free Brand Diagnosis",
            description:
              "A free diagnostic review that helps entrepreneurs and businesses identify positioning, presence, audience clarity, and conversion blockers.",
            url: "/free-audit",
            serviceType: "Brand diagnosis",
            areaServed: "Texas",
          }),
          breadcrumbListSchema([
            { name: "Home", url: "/" },
            { name: "Free Brand Diagnosis", url: "/free-audit" },
          ]),
        ]}
      />
      {!started ? (
        <section className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 sm:px-6 md:py-16">
          <div className="space-y-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gold">Free Brand Audit</p>
            <h1 className="text-4xl font-bold leading-tight md:text-6xl">
              You&rsquo;re Not Struggling to Post. You&rsquo;re Struggling to Position.
            </h1>
          </div>

          <div className="aspect-video bg-gradient-to-br from-gold/20 via-gold/10 to-gold/5 rounded-2xl border border-gold/40 shadow-lg overflow-hidden flex items-center justify-center">
            <div className="text-center px-6">
              <p className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-gold via-gold-dark to-gold bg-clip-text text-transparent">
                Audit Diagnosis Video
              </p>
              <p className="text-sm md:text-base mt-3 text-gold-dark/70">
                Video placement coming soon
              </p>
            </div>
          </div>

          <div className="mx-auto max-w-3xl space-y-5 text-center">
            <p className="text-lg text-muted-foreground md:text-xl">
              The Audit Diagnosis reviews your presence, positioning, audience clarity, and conversion gaps so
              JahKnowsPR can identify what is blocking the brand from turning attention into booked action.
            </p>
            <Button
              size="lg"
              className="h-16 rounded-full px-12 text-lg font-bold shadow-xl shadow-primary/20"
              onClick={() => setStarted(true)}
            >
              Begin
            </Button>
          </div>
        </section>
      ) : (
        <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-4xl flex-col px-4 py-8 sm:px-6">
          <div className="sticky top-0 z-20 -mx-4 mb-8 bg-background/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <span>Audit Diagnosis</span>
              <span>{progress}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold via-primary to-gold transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <form id="free-audit-form" onSubmit={handleSubmit} className="flex flex-1 flex-col justify-center">
            <div className="rounded-3xl border border-gold/20 bg-card p-6 shadow-xl shadow-primary/5 md:p-10">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-gold">
                {resolvedQuestion.eyebrow}
              </p>
              <h2 className="text-3xl font-serif font-bold leading-tight md:text-5xl">{resolvedQuestion.title}</h2>
              {resolvedQuestion.description ? (
                <p className="mt-3 text-muted-foreground">{resolvedQuestion.description}</p>
              ) : null}

              <div className="mt-8">
                {resolvedQuestion.input === "other_socials" ? (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {OTHER_SOCIAL_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          disabled={form.otherPublicPagesNotStarted}
                          className={`rounded-2xl border p-4 text-left transition ${
                            selectedOtherSocial === option.id
                              ? "border-gold bg-gold/10 shadow-lg shadow-gold/10"
                              : "border-border bg-background hover:border-gold/50"
                          }`}
                          onClick={() => selectOtherSocial(option.id)}
                        >
                          <span className="block font-semibold">{option.label}</span>
                          <span className="mt-1 block text-sm text-muted-foreground">
                            {option.id === "none" ? "Skip this step if there are no other pages." : "Add username or profile link."}
                          </span>
                        </button>
                      ))}
                    </div>

                    {selectedOtherSocial && selectedOtherSocial !== "none" ? (
                      <div className="rounded-2xl border border-gold/30 bg-gold/5 p-4">
                        <p className="mb-2 text-sm font-semibold">
                          Add {OTHER_SOCIAL_OPTIONS.find((option) => option.id === selectedOtherSocial)?.label}
                        </p>
                        <Input
                          autoFocus
                          className="h-12 text-base"
                          disabled={form.otherPublicPagesNotStarted}
                          placeholder={OTHER_SOCIAL_OPTIONS.find((option) => option.id === selectedOtherSocial)?.placeholder}
                          value={otherSocialValues[selectedOtherSocial] ?? ""}
                          onChange={(event) => updateOtherSocialValue(selectedOtherSocial, event.target.value)}
                        />
                        {form.otherPublicPages.trim() ? (
                          <div className="mt-4 rounded-xl bg-background/70 p-3 text-sm text-muted-foreground">
                            <p className="font-medium text-foreground">Added so far</p>
                            <p className="mt-1 whitespace-pre-wrap">{form.otherPublicPages}</p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : resolvedQuestion.input === "textarea" ? (
                  <Textarea
                    autoFocus
                    className="min-h-40 text-lg"
                    required={resolvedQuestion.required}
                    placeholder={resolvedQuestion.placeholder}
                    value={String(form[resolvedQuestion.key])}
                    onChange={(event) => update(resolvedQuestion.key, event.target.value as never)}
                  />
                ) : resolvedQuestion.input === "intent" ? (
                  <div className="grid gap-3">
                    {[
                      ["ready_now", "Yes, I'm ready now", "I know this needs to be fixed and I want the next step."],
                      ["open_if_it_makes_sense", "I'm open if it makes sense", "I need the diagnosis to show me where the gap is."],
                      ["just_looking", "Just looking for feedback", "I want clarity first, then I may follow up later."],
                    ].map(([value, label, description]) => (
                      <button
                        key={value}
                        type="button"
                        className={`rounded-2xl border p-4 text-left transition ${
                          form.intent === value
                            ? "border-gold bg-gold/10 shadow-lg shadow-gold/10"
                            : "border-border bg-background hover:border-gold/50"
                        }`}
                        onClick={() => update("intent", value as Intent)}
                      >
                        <span className="block font-semibold">{label}</span>
                        <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
                      </button>
                    ))}
                  </div>
                ) : resolvedQuestion.input === "business_entity" ? (
                  <div className="grid gap-3">
                    {[
                      ["corporation", "Corporation / LLC", "Registered entity with a legal business name."],
                      ["sole_proprietor", "Sole Proprietor", "Operating under DBA."],
                      ["personal_brand_without_documentation", "Personal Brand (without documentation)", "No DBA/LLC/Corporate filing yet."],
                    ].map(([value, label, description]) => (
                      <button
                        key={value}
                        type="button"
                        className={`rounded-2xl border p-4 text-left transition ${
                          form.businessEntityType === value
                            ? "border-gold bg-gold/10 shadow-lg shadow-gold/10"
                            : "border-border bg-background hover:border-gold/50"
                        }`}
                        onClick={() => update("businessEntityType", value as BusinessEntityType)}
                      >
                        <span className="block font-semibold">{label}</span>
                        <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <Input
                    autoFocus
                    className="h-14 text-lg"
                    disabled={PRESENCE_FIELDS.includes(resolvedQuestion.key as PresenceFieldKey)
                      ? form[PRESENCE_CONFIG[resolvedQuestion.key as PresenceFieldKey].notStartedKey]
                      : false}
                    required={resolvedQuestion.required}
                    type={resolvedQuestion.input}
                    placeholder={resolvedQuestion.placeholder}
                    value={String(form[resolvedQuestion.key])}
                    onChange={(event) => update(resolvedQuestion.key, event.target.value as never)}
                  />
                )}
                {PRESENCE_FIELDS.includes(resolvedQuestion.key as PresenceFieldKey) ? (
                  <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={form[PRESENCE_CONFIG[resolvedQuestion.key as PresenceFieldKey].notStartedKey]}
                      onChange={(event) => setPresenceNotStarted(resolvedQuestion.key as PresenceFieldKey, event.target.checked)}
                    />
                    <span>I don&rsquo;t have this at all yet.</span>
                  </label>
                ) : null}
                {filingAckRequiredNow ? (
                  <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
                    <p className="text-sm font-semibold text-destructive">Immediate next step before continuing</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Since this is a personal brand without documentation, file a DBA or LLC/Corporation before scaling your marketing.
                      We will still complete your full audit and include this compliance warning in the email, audio brief, and PDF.
                    </p>
                    <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={filingAcknowledged}
                        onChange={(event) => setFilingAcknowledged(event.target.checked)}
                      />
                      <span>I understand filing a DBA or LLC/Corporation is my immediate next step.</span>
                    </label>
                  </div>
                ) : null}
              </div>

              <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button type="button" variant="outline" className="rounded-full" onClick={goBack} disabled={currentStep === 0}>
                  Back
                </Button>
                {currentStep === QUESTIONS.length - 1 ? (
                  <Button type="submit" size="lg" className="rounded-full px-10" disabled={submitting || currentRequiredMissing || !allQuestionsAnswered || filingAckMissing}>
                    {submitting ? "Submitting..." : "Submit Audit"}
                  </Button>
                ) : (
                  <Button type="button" size="lg" className="rounded-full px-10" onClick={goNext} disabled={currentRequiredMissing}>
                    Continue
                  </Button>
                )}
              </div>
              {submitError ? (
                <p className="mt-4 text-sm font-medium text-destructive">
                  {submitError}
                </p>
              ) : null}
            </div>
          </form>
        </section>
      )}
    </main>
  );
}
