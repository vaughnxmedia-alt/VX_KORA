import { type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Eye, FileAudio, FileText, Headphones, Loader2, Palette, RefreshCcw, SearchCheck, Send, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AuditHeroVisual,
  ScoreBreakdownVisual,
} from "@/features/audit-visuals/components";
import { buildAuditVisualInput } from "@/features/audit-visuals/mapper";
import {
  FreeAuditReportPreview,
  type FreeAuditReportPreviewData,
  type FreeAuditReportWarning,
} from "@/features/audit-visuals/FreeAuditReportPreview";
import {
  buildAuditIntakeFieldRows,
  followUpShortLabel,
  getAuditDeliveryLabel,
  getAuditDeliveryPathShortLabel,
  getAuditDeliveryShortLabel,
  isStarterGuideBriefPath,
} from "@/lib/freeAuditIntakeDisplay";
import {
  buildGuideDeliveryEmailHtml,
  GUIDE_DELIVERY_EMAIL_SUBJECT,
  GUIDE_DELIVERY_HUB_URL,
} from "@/lib/guideDeliveryEmail";

type AuditRow = {
  id: string;
  lead_key: string;
  lead_email_lower: string | null;
  contact_name: string | null;
  phone: string | null;
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
  readiness_level: string | null;
  follow_up_status: string;
  audience_segment: string | null;
  correlation_id: string | null;
  lead_source: string | null;
  audit_angle: string;
  completion_status: string;
  score_summary: Json;
  actual_outcome: Json;
  metadata: Json;
  created_at: string;
  completed_at: string | null;
};

type AestheticSignal = {
  audit_id: string;
  detected_industry: string | null;
  detected_aesthetic: string | null;
  recommended_vibe: string | null;
  confidence: number;
  signals: Json;
};

type AuditReportFunctionResponse = {
  ok?: boolean;
  mode?: "preview" | "send";
  to?: string;
  report?: FreeAuditReportPreviewData;
  warnings?: FreeAuditReportWarning[];
  filename?: string;
  pdfBase64?: string;
  contentType?: string;
  audioBrief?: AuditAudioBrief | null;
  emailHtml?: string;
  reportMode?: "starter_guide" | "brand_diagnosis";
};

type PlainLanguageAudioBrief = {
  client_name?: string;
  brand_name?: string;
  business_type?: string;
  tone?: string;
  reading_level?: string;
  intro?: string;
  big_picture?: string;
  score_read?: string;
  category_breakdowns?: Array<{
    category?: string;
    plain_language_definition?: string;
    finding?: string;
    why_it_matters?: string;
    recommended_move?: string;
  }>;
  hidden_cost?: string;
  first_move?: string;
  recommended_next_steps?: string[];
  closing_summary?: string;
};

type AudioBriefChecks = {
  jargon_translation_check?: { passed?: boolean; found_terms?: string[] };
  business_specific_cta_check?: { passed?: boolean; required_cta_family?: string; detected_ctas?: string[] };
  strategy_session_mismatch_check?: { passed?: boolean; detail?: string };
  parent_sub_brand_check?: { passed?: boolean; detail?: string };
  reads_like_pdf_check?: { passed?: boolean; overlap_ratio?: number };
  approved_for_audio?: boolean;
};

type AudioMode = "private_strategy_brief" | "podcast_deep_dive" | "executive_recap";

type AuditAudioBrief = {
  audioUrl: string;
  url?: string;
  filename?: string;
  script?: string;
  generatedAt?: string;
  generated_at?: string;
  wordCount?: number;
  word_count?: number;
  estimatedMinutes?: number;
  estimated_minutes?: number;
  tone?: string;
  tone_label?: string;
  readingLevel?: string;
  reading_level?: string;
  audioMode?: AudioMode;
  audio_mode?: AudioMode;
  voicePreset?: "signature" | "storyteller" | "grounded";
  voice_preset?: "signature" | "storyteller" | "grounded";
  voicePresetLabel?: string;
  voice_preset_label?: string;
  ttsProviderUsed?: string;
  provider?: string;
  voices?: {
    narrator?: string;
    host_woman?: string;
    host_man?: string;
  } | null;
  approvedForAudio?: boolean;
  approved_for_audio?: boolean;
  plainLanguageAudioBrief?: PlainLanguageAudioBrief | null;
  plain_language_audio_brief?: PlainLanguageAudioBrief | null;
  checks?: AudioBriefChecks | null;
  audio_brief_checks?: AudioBriefChecks | null;
};

const CANONICAL_PRIMARY_CTA = "Join the Waitlist";

type GenerateAudioResponse = {
  ok?: boolean;
  reused?: boolean;
  audioUrl: string;
  filename: string;
  script: string;
  plainLanguageAudioBrief?: PlainLanguageAudioBrief | null;
  checks?: AudioBriefChecks | null;
  approvedForAudio?: boolean;
  tone?: string;
  readingLevel?: string;
  audioMode?: AudioMode;
  voicePreset?: "signature" | "storyteller" | "grounded";
  voicePresetLabel?: string;
  ttsProviderUsed?: string;
  voices?: {
    narrator?: string;
    host_woman?: string;
    host_man?: string;
  } | null;
  generatedAt: string;
  wordCount: number;
  estimatedMinutes: number;
};

type AuditEvidenceReview = {
  evidence: Array<{
    id: string;
    platform: string;
    source_type: string;
    source_url: string;
    source_label: string | null;
    normalized_observation: string;
    evidence_category: string;
    confidence_score: number;
    used_in_report: boolean;
    metadata?: Json;
  }>;
  findings: Array<{
    id: string;
    finding_category: string;
    finding_title: string;
    finding_summary: string;
    severity: string;
    confidence_score: number;
    recommended_action: string;
    report_ready: boolean;
    diagnosis?: string | null;
    evidence_summary?: string | null;
    business_implication?: string | null;
    revenue_implication?: string | null;
    audience_implication?: string | null;
    produced_by_agent?: string | null;
    human_summary?: string | null;
    metadata?: Json;
  }>;
  strategic_profile?: Json | null;
  strategist_summary?: Json | null;
};

function uniqueEvidenceSources(evidence: AuditEvidenceReview["evidence"]) {
  const seen = new Set<string>();
  return evidence.filter((item) => {
    const key = `${item.source_type}:${item.source_url || item.source_label || item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function researchSourceLabel(value: string): string {
  const labels: Record<string, string> = {
    business_discovery: "Online research",
    connected_account: "Connected account",
    manual_admin_note: "Internal signal",
    meta_graph_api: "Meta Graph API",
    public_data_provider: "Public data provider",
    public_profile: "Public profile",
    screenshot: "Screenshot",
    website: "Website",
  };
  return labels[value] ?? statusLabel(value);
}

function cleanAdminCopy(value: string): string {
  return value
    .replace(/^(Online research signal|Intake-based signal|Website signal|Connected Meta signal|Social Signal Research found public content that emphasizes|Engagement quality signal|Evidence Capture signal):\s*/i, "")
    .replace(/^Keyword Investigator selected these connected research terms from owned sources:\s*/i, "Connected keywords: ")
    .trim();
}

function asLooseRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asStringArrayLoose(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => cleanText(item, "")).filter(Boolean) : [];
}

function metricPercent(value: unknown): string {
  return `${Math.round((typeof value === "number" ? value : 0) * 100)}%`;
}

const FOLLOW_UP_STATUSES = [
  "new",
  "reviewed",
  "audit_sent",
  "follow_up_needed",
  "booked_strategy_session",
  "converted",
  "not_ready",
];

const AUDIO_VOICE_PRESETS: Array<{
  id: "signature" | "storyteller" | "grounded";
  label: string;
  detail: string;
}> = [
  { id: "signature", label: "Automatic Single Voice", detail: "Chooses one saved ElevenLabs voice for this audio" },
];
const AUDIO_MODES: Array<{
  id: AudioMode;
  label: string;
  detail: string;
}> = [
  { id: "podcast_deep_dive", label: "Podcast Deep Dive", detail: "Solo podcaster style. Jah walks through the audit with natural questions and answers." },
];
const AUDIO_WORDS_PER_MINUTE = 145;
const MAX_AUDIO_WORDS = 750;

function formatDate(value: string | null): string {
  if (!value) return "Not completed";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusLabel(value: string | null | undefined): string {
  return String(value ?? "unknown").replace(/_/g, " ");
}

function asRecord(value: Json | undefined): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function cleanText(value: unknown, fallback = "Not provided"): string {
  const normalized = String(value ?? "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

function titleCase(value: string): string {
  return value.split(/\s+/).map((word) => word ? `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}` : word).join(" ");
}

function sentence(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function scoreFrom(summary: Record<string, unknown>, key: string, fallback: number): number {
  const value = summary[key];
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function readableAngle(value: string | null | undefined): string {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw || raw === "free_audit" || raw === "free_brand_audit" || raw === "brand_diagnosis") return "Brand Diagnosis";
  if (raw === "positioning_gap") return "Positioning Gap";
  if (raw === "audience_clarity") return "Audience Clarity";
  if (raw === "authority_structure") return "Authority Structure";
  if (raw === "conversion_path") return "Conversion Path";
  return titleCase(cleanText(raw, "Brand Diagnosis"));
}

function scoreSummary(key: string, value: number): string {
  const summaries: Record<string, [string, string, string, string]> = {
    positioning_score: ["Promise needs sharper focus", "Clear idea forming, needs tighter words", "Solid direction with room to sharpen", "Strong promise ready for more proof"],
    audience_score: ["Audience needs clearer definition", "Good starting point, needs buyer detail", "Audience is clear enough to refine", "Strong audience read to build from"],
    authority_score: ["Trust signals need more visibility", "Proof exists, but needs better placement", "Credibility is building well", "Strong trust foundation"],
    messaging_score: ["Message needs a simpler main point", "Good ideas, needs a clearer hook", "Message is close to campaign-ready", "Strong message direction"],
    conversion_score: ["Next step needs to be clearer", "Path to action needs fewer gaps", "Good path with small friction points", "Strong next-step flow"],
  };
  const bucket = value < 45 ? 0 : value < 60 ? 1 : value < 75 ? 2 : 3;
  return (summaries[key] ?? summaries.positioning_score)[bucket];
}

function socialResearchSummary(metadata: Json): {
  status: string;
  evidenceCount: number;
  sources: Array<Record<string, unknown>>;
  providerConfig: Record<string, unknown>;
} {
  const root = asRecord(metadata);
  const socialResearch = asRecord(root.social_research as Json | undefined);
  const totals = asRecord(socialResearch.totals as Json | undefined);
  const evidenceCount = typeof socialResearch.evidence_count === "number"
    ? socialResearch.evidence_count
    : Object.values(totals).reduce((sum, value) => sum + (typeof value === "number" ? value : 0), 0);
  const sources = Array.isArray(socialResearch.normalized_sources)
    ? socialResearch.normalized_sources.filter((source): source is Record<string, unknown> => Boolean(source && typeof source === "object" && !Array.isArray(source)))
    : Array.isArray(root.normalized_social_sources)
      ? root.normalized_social_sources.filter((source): source is Record<string, unknown> => Boolean(source && typeof source === "object" && !Array.isArray(source)))
      : [];
  return {
    status: cleanText(socialResearch.status, "not queued"),
    evidenceCount,
    sources,
    providerConfig: asRecord(socialResearch.provider_config as Json | undefined),
  };
}

function buildLocalAuditReport(audit: AuditRow, signal: AestheticSignal | null): FreeAuditReportPreviewData {
  const summary = asRecord(audit.score_summary);
  const metadata = asRecord(audit.metadata);
  const socialResearchRaw = asRecord(metadata.social_research as Json | undefined);
  const strategicProfile = asRecord(socialResearchRaw.strategic_profile as Json | undefined);
  const conversionProfile = asRecord(strategicProfile.conversion_path as Json | undefined);
  const metadataScan = asRecord(metadata.aesthetic_scan as Json | undefined);
  const businessName = cleanText(audit.business_name || audit.contact_name || audit.lead_email_lower, "Your Brand");
  const contactName = cleanText(audit.contact_name, "there");
  const readiness = cleanText(audit.readiness_level, "WARM").toUpperCase();
  const baseline = readiness === "HOT" ? 62 : readiness === "COLD" ? 44 : 54;
  const growthGoal = cleanText(summary.growth_goal ?? audit.growth_goal, "Clarify what the brand is trying to grow.");
  const currentBlocker = cleanText(summary.primary_gap ?? audit.current_blocker, "The current positioning blocker needs more clarity.");
  const targetAudience = cleanText(summary.audience_pain ?? audit.target_audience_belief, "The target audience needs more definition.");
  const presence = [audit.website_link, audit.instagram, audit.facebook, audit.tiktok, audit.other_socials].filter(Boolean) as string[];
  const auditAngleLabel = readableAngle(audit.audit_angle);
  const industry = titleCase(cleanText(signal?.detected_industry ?? metadata.detected_industry ?? metadataScan.detected_industry ?? summary.industry, "Professional Services"));
  const aesthetic = cleanText(signal?.detected_aesthetic ?? metadata.detected_aesthetic ?? metadataScan.detected_aesthetic, "Strategic editorial");
  const recommendedVibe = cleanText(
    signal?.recommended_vibe ?? metadata.recommended_vibe ?? metadataScan.recommended_vibe,
    "Use a premium editorial strategy direction that makes the offer clearer, more trusted, and easier to act on.",
  );
  const socialSummary = socialResearchSummary(audit.metadata);
  const currentCta = cleanText(conversionProfile.current_cta, "");
  const recommendedPrimaryCta = cleanText(conversionProfile.recommended_primary_cta, CANONICAL_PRIMARY_CTA);
  const secondaryCtas = Array.isArray(conversionProfile.recommended_secondary_ctas)
    ? conversionProfile.recommended_secondary_ctas.map((item) => cleanText(item, "")).filter(Boolean).slice(0, 4)
    : [];
  const socialHighlights = socialSummary.evidenceCount
    ? [`Public Source Intelligence collected ${socialSummary.evidenceCount} evidence item${socialSummary.evidenceCount === 1 ? "" : "s"} for this audit.`]
    : socialSummary.sources.length
      ? [`KORA normalized ${socialSummary.sources.length} public source${socialSummary.sources.length === 1 ? "" : "s"} for Social Signal Research.`]
      : [];
  const scores = [
    { key: "positioning_score", label: "Positioning", value: scoreFrom(summary, "positioning_score", baseline - 8), summary: "" },
    { key: "audience_score", label: "Audience", value: scoreFrom(summary, "audience_score", baseline - 3), summary: "" },
    { key: "authority_score", label: "Authority", value: scoreFrom(summary, "authority_score", baseline + (presence.length ? 4 : -6)), summary: "" },
    { key: "messaging_score", label: "Messaging", value: scoreFrom(summary, "messaging_score", baseline - 2), summary: "" },
    { key: "conversion_score", label: "Conversion", value: scoreFrom(summary, "conversion_score", baseline - 8), summary: "" },
  ].map((score) => ({ ...score, summary: scoreSummary(score.key, score.value) }));
  const scoreByKey = Object.fromEntries(scores.map((score) => [score.key, score.value])) as Record<string, number>;
  const executiveSummary = `${businessName} has enough signal to build from, but the audit points to a sharper need: clarify the promise, tighten the audience, strengthen visible proof, and make the next action unmistakable.`;
  const warnings: FreeAuditReportWarning[] = audit.audit_angle.includes("_")
    ? [{
      severity: "info",
      title: "Audit angle normalized",
      detail: `Client-facing copy uses "${auditAngleLabel}" instead of the raw value "${audit.audit_angle}".`,
    }]
    : [];

  return {
    auditId: audit.id,
    businessName,
    contactName,
    recipient: cleanText(audit.lead_email_lower || audit.lead_key, ""),
    subject: `${businessName} Brand Diagnosis`,
    filename: `${businessName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "brand"}-diagnosis.pdf`,
    generatedAt: new Date().toISOString(),
    readinessLevel: readiness,
    intentLabel: statusLabel(audit.intent),
    auditAngleLabel,
    executiveSummary,
    scores,
    warnings,
    evidence: {
      growthGoal,
      currentBlocker,
      targetAudience,
      presence,
      industry,
      aesthetic,
      recommendedVibe,
      socialHighlights,
      socialEvidenceCount: socialSummary.evidenceCount,
    },
    sections: [
      {
        id: "positioning",
        label: "01",
        title: "Positioning Gap",
        subtitle: "Where the brand promise needs to become easier to understand.",
        scoreLabel: "Positioning",
        score: scoreByKey.positioning_score,
        diagnosis: `${businessName} is trying to grow around this stated goal: ${sentence(growthGoal)} The clearest positioning friction is: ${sentence(currentBlocker)} Before visibility scales, the brand needs a sharper promise that says who it helps, what changes, and why that change matters now.`,
        evidence: [`Growth goal: ${growthGoal}`, `Current blocker: ${currentBlocker}`, socialHighlights[0] ?? `${businessName} is being read through a ${auditAngleLabel.toLowerCase()} lens.`],
        whyItMatters: "A broad or unclear position forces the audience to work too hard, which turns attention into passive interest instead of action.",
        nextMove: "Rewrite the primary brand promise into one sentence that names the audience, the pain, and the outcome. Use that promise as the anchor for the website hero, social bio, pinned content, and next campaign.",
        cta: "Bring the positioning promise into a Strategy Session so it can be converted into a campaign-ready message map.",
      },
      {
        id: "audience",
        label: "02",
        title: "Audience Clarity",
        subtitle: "How clearly the brand understands who it is speaking to.",
        scoreLabel: "Audience",
        score: scoreByKey.audience_score,
        diagnosis: `The current audience description points toward ${targetAudience}. That gives the report a starting point, but the audience still needs stronger buying-context detail: what they already believe, what they are tired of, and what would make them trust the brand faster.`,
        evidence: [`Audience belief: ${targetAudience}`, socialHighlights[0] ?? `Detected industry context: ${industry}`, `Recommended brand vibe: ${recommendedVibe}`],
        whyItMatters: "Audience clarity is what turns general content into content that feels personally relevant.",
        nextMove: "Define the top audience segment as a real decision-maker with a current pain, desired identity, and one objection. Then shape the next three pieces of content around those details.",
        cta: "Use the Strategy Session to turn this audience read into a tighter buyer profile and content angle.",
      },
      {
        id: "authority",
        label: "03",
        title: "Authority Structure",
        subtitle: "How much trust the brand builds before asking for action.",
        scoreLabel: "Authority",
        score: scoreByKey.authority_score,
        diagnosis: presence.length ? `Visible presence reviewed: ${presence.slice(0, 3).join(", ")}. The brand needs visible proof, stronger hierarchy, and clearer credibility cues.` : "No website or social channel was submitted, so the authority read depends heavily on the written answers.",
        evidence: [presence.length ? `Presence reviewed: ${presence.join(", ")}` : "No primary presence submitted.", socialHighlights[0] ?? `Detected aesthetic: ${aesthetic}`, `Readiness level: ${readiness}`],
        whyItMatters: "Authority reduces hesitation. If proof, positioning, and presentation feel scattered, the audience may like the brand but still delay the next step.",
        nextMove: "Add three trust signals to the main conversion path: a clear result, a credibility marker, and a short proof statement.",
        cta: "A Strategy Session can organize the proof stack so the brand feels credible before the offer is explained.",
      },
      {
        id: "messaging",
        label: "04",
        title: "Messaging Angle",
        subtitle: "The clearest idea to test in the next public-facing message.",
        scoreLabel: "Messaging",
        score: scoreByKey.messaging_score,
        diagnosis: `The strongest immediate angle is ${auditAngleLabel.toLowerCase()}. The message should move away from describing activity and toward naming the strategic problem the audience already feels.`,
        evidence: [`Audit angle: ${auditAngleLabel}`, `Current blocker: ${currentBlocker}`, `Growth goal: ${growthGoal}`],
        whyItMatters: "A strong messaging angle creates recognition before the audience evaluates the service or price.",
        nextMove: "Create one hook, one proof point, and one call to action around the core angle. Keep the language plain enough to repeat across the bio, caption, landing page, and email follow-up.",
        cta: "Use the Strategy Session to pressure-test the angle before building a full content or PR push around it.",
      },
      {
        id: "conversion",
        label: "05",
        title: "Conversion Path",
        subtitle: "What needs to happen after attention is earned.",
        scoreLabel: "Conversion",
        score: scoreByKey.conversion_score,
        diagnosis: `${businessName} needs a more obvious next action after someone understands the message. The conversion path should make "${recommendedPrimaryCta}" feel like the natural next step.`,
        evidence: [
          `Lead intent: ${statusLabel(audit.intent)}`,
          currentCta ? `Current CTA: ${currentCta}` : "Current CTA: Not clearly defined",
          `Recommended next action: ${recommendedPrimaryCta}`,
          presence[0] ? `Primary presence: ${presence[0]}` : "No primary conversion URL was submitted.",
        ],
        whyItMatters: "Interest fades when the next step is unclear.",
        nextMove: "Place one direct call to action near the clearest proof point. The CTA should explain what the session solves and who it is for, then remove competing actions around it.",
        cta: secondaryCtas.length
          ? `Primary CTA: ${recommendedPrimaryCta}. Secondary CTAs: ${secondaryCtas.join(", ")}.`
          : `Primary CTA: ${recommendedPrimaryCta}.`,
      },
    ],
  };
}

function JsonBlock({ value }: { value: Json }) {
  return (
    <pre className="max-h-56 overflow-auto rounded-xl bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
      {JSON.stringify(value ?? {}, null, 2)}
    </pre>
  );
}

async function functionErrorMessage(error: Error): Promise<string> {
  let detail = error.message || "Request failed";
  const context = (error as { context?: unknown }).context;
  if (context && typeof context === "object" && "json" in (context as Record<string, unknown>)) {
    try {
      const payload = await (context as { json: () => Promise<unknown> }).json();
      const parsed = payload as { error?: string; message?: string };
      detail = parsed.error || parsed.message || detail;
    } catch {
      // keep default detail
    }
  }
  if (/ElevenLabs|concurrent|rate.?limit|too_many_concurrent_requests|429/i.test(detail)) {
    return "ElevenLabs is processing too many voice requests right now. Please wait a minute, then regenerate the audio brief.";
  }
  return detail;
}

function downloadBase64Pdf(pdfBase64: string, filename: string) {
  const binary = window.atob(pdfBase64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function pdfObjectUrlFromBase64(pdfBase64: string): string {
  const binary = window.atob(pdfBase64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
}

function normalizeAudioBrief(audio: AuditAudioBrief | null | undefined): AuditAudioBrief | null {
  if (!audio) return null;
  const audioUrl = audio.audioUrl || audio.url;
  if (!audioUrl) return null;
  return {
    ...audio,
    audioUrl,
    generatedAt: audio.generatedAt || audio.generated_at,
    wordCount: audio.wordCount || audio.word_count,
    estimatedMinutes: audio.estimatedMinutes || audio.estimated_minutes,
    tone: audio.tone || audio.tone_label,
    readingLevel: audio.readingLevel || audio.reading_level,
    audioMode: audio.audioMode || audio.audio_mode,
    voicePreset: audio.voicePreset || audio.voice_preset,
    voicePresetLabel: audio.voicePresetLabel || audio.voice_preset_label,
    ttsProviderUsed: audio.ttsProviderUsed || audio.provider,
    voices: audio.voices ?? null,
    approvedForAudio: typeof audio.approvedForAudio === "boolean"
      ? audio.approvedForAudio
      : typeof audio.approved_for_audio === "boolean"
        ? audio.approved_for_audio
        : audio.checks?.approved_for_audio,
    plainLanguageAudioBrief: audio.plainLanguageAudioBrief || audio.plain_language_audio_brief,
    checks: audio.checks || audio.audio_brief_checks,
  };
}

function downloadUrl(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.target = "_blank";
  link.rel = "noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function audioBriefFromAudit(audit: AuditRow): AuditAudioBrief | null {
  const metadata = asRecord(audit.metadata);
  const audio = asRecord(metadata.report_audio as Json | undefined);
  return normalizeAudioBrief({
    audioUrl: typeof audio.url === "string" ? audio.url : "",
    filename: typeof audio.filename === "string" ? audio.filename : undefined,
    script: typeof audio.script === "string" ? audio.script : undefined,
    generated_at: typeof audio.generated_at === "string" ? audio.generated_at : undefined,
    word_count: typeof audio.word_count === "number" ? audio.word_count : undefined,
    estimated_minutes: typeof audio.estimated_minutes === "number" ? audio.estimated_minutes : undefined,
    audio_mode: typeof audio.audio_mode === "string" ? audio.audio_mode as AudioMode : undefined,
    tone_label: typeof audio.tone === "string" ? audio.tone : undefined,
    reading_level: typeof audio.reading_level === "string" ? audio.reading_level : undefined,
    voice_preset: (typeof audio.voice_preset === "string" ? audio.voice_preset : undefined) as AuditAudioBrief["voicePreset"],
    voice_preset_label: typeof audio.voice_preset_label === "string" ? audio.voice_preset_label : undefined,
    provider: typeof audio.provider === "string" ? audio.provider : undefined,
    voices: (() => {
      const voices = asRecord(audio.voices as Json | undefined);
      return Object.keys(voices).length
        ? {
            narrator: typeof voices.narrator === "string" ? voices.narrator : undefined,
            host_woman: typeof voices.host_woman === "string" ? voices.host_woman : undefined,
            host_man: typeof voices.host_man === "string" ? voices.host_man : undefined,
          }
        : undefined;
    })(),
    approved_for_audio: typeof audio.approved_for_audio === "boolean" ? audio.approved_for_audio : undefined,
    plain_language_audio_brief: (() => {
      const brief = asRecord(audio.plain_language_audio_brief as Json | undefined);
      return Object.keys(brief).length ? (brief as unknown as PlainLanguageAudioBrief) : undefined;
    })(),
    audio_brief_checks: (() => {
      const checks = asRecord(audio.audio_brief_checks as Json | undefined);
      return Object.keys(checks).length ? (checks as unknown as AudioBriefChecks) : undefined;
    })(),
  });
}

function publicAuditSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 90) || "brand-audit";
}

function publicAuditUrl(report: FreeAuditReportPreviewData): string {
  return `https://www.jahknowspr.com/audit/${publicAuditSlug(report.businessName)}`;
}

function fallbackEmailPreview(report: FreeAuditReportPreviewData, audio: AuditAudioBrief | null): string {
  const audioBlock = audio?.audioUrl
    ? `<div style="margin:20px 0;padding:18px;border:1px solid #E6C769;border-radius:18px;background:#F7F3EA;"><h2 style="font-family:Georgia,serif;margin:0 0 8px;color:#0A1A35;">Audio Strategy Brief</h2><p style="margin:0 0 12px;color:#0A1A35;">A personalized audio strategy brief is included with this diagnosis.</p><a href="${publicAuditUrl(report)}" style="display:inline-block;background:#0A1A35;color:#fff;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:bold;">Listen to Audio Brief</a><p style="font-size:12px;color:#666;margin:14px 0 0;">This audio was created using your audit data plus JahKnowsPR KORA assistants.</p></div>`
    : "";
  return `<body style="margin:0;background:#F7F3EA;font-family:Arial,sans-serif;color:#0A1A35;"><div style="max-width:680px;margin:0 auto;background:#fff;padding:36px;border-radius:24px;"><p style="letter-spacing:.24em;text-transform:uppercase;color:#C59B3C;font-weight:bold;font-size:12px;">JahKnowsPR Firm</p><h1 style="font-family:Georgia,serif;font-size:36px;line-height:1.05;margin:12px 0;">Your Brand Diagnosis is ready</h1><p>Hi ${report.contactName || "there"},</p><p>Your diagnosis for <strong>${report.businessName}</strong> is attached. The report breaks down what is blocking clarity, trust, and conversion.</p><p>${report.executiveSummary}</p>${audioBlock}<a href="https://www.jahknowspr.com/brand-strategy-session" style="display:inline-block;background:#0A1A35;color:#fff;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:bold;">Book Strategy Session</a></div></body>`;
}

export default function Audits() {
  const [search, setSearch] = useState("");
  const [readinessFilter, setReadinessFilter] = useState("all");
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AuditRow | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPayload, setPreviewPayload] = useState<AuditReportFunctionResponse | null>(null);
  const [audioBrief, setAudioBrief] = useState<AuditAudioBrief | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [evidenceReview, setEvidenceReview] = useState<AuditEvidenceReview | null>(null);
  const [autoAudioAttemptedAuditId, setAutoAudioAttemptedAuditId] = useState<string | null>(null);
  const [audioVoicePreset, setAudioVoicePreset] = useState<"signature" | "storyteller" | "grounded">("signature");
  const audioMode: AudioMode = "podcast_deep_dive";
  const [audioScriptDraft, setAudioScriptDraft] = useState("");
  const queryClient = useQueryClient();

  const { data: audits, isLoading } = useQuery({
    queryKey: ["free-audit-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("free_audits")
        .select(
          "id,lead_key,lead_email_lower,contact_name,phone,business_name,website_link,instagram,facebook,tiktok,other_socials,growth_goal,current_blocker,target_audience_belief,intent,readiness_level,follow_up_status,audience_segment,correlation_id,lead_source,audit_angle,completion_status,score_summary,actual_outcome,metadata,created_at,completed_at",
        )
        .order("created_at", { ascending: false })
        .limit(250);
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
  });

  const { data: aestheticSignals } = useQuery({
    queryKey: ["audit-aesthetic-signals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_aesthetic_signals")
        .select("audit_id,detected_industry,detected_aesthetic,recommended_vibe,confidence,signals")
        .order("created_at", { ascending: false })
        .limit(250);
      if (error) throw error;
      return (data ?? []) as AestheticSignal[];
    },
  });

  useEffect(() => {
    if (!previewPayload?.pdfBase64) {
      setPdfPreviewUrl(null);
      return;
    }
    const url = pdfObjectUrlFromBase64(previewPayload.pdfBase64);
    setPdfPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [previewPayload?.pdfBase64]);

  const updateStatus = useMutation({
    mutationFn: async ({ auditId, status }: { auditId: string; status: string }) => {
      const { error } = await supabase
        .from("free_audits")
        .update({ follow_up_status: status })
        .eq("id", auditId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["free-audit-submissions"] });
      toast.success("Audit status updated");
    },
    onError: (error: Error) => toast.error(error.message || "Could not update audit status"),
  });

  const deleteAudit = useMutation({
    mutationFn: async (audit: AuditRow) => {
      const { error } = await supabase
        .from("free_audits")
        .delete()
        .eq("id", audit.id);
      if (error) throw error;
      return audit;
    },
    onSuccess: (audit) => {
      setSelectedAuditId((current) => current === audit.id ? null : current);
      setDeleteTarget(null);
      if (previewPayload?.report?.auditId === audit.id) {
        setPreviewPayload(null);
        setPreviewOpen(false);
        setAudioBrief(null);
      }
      queryClient.invalidateQueries({ queryKey: ["free-audit-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["audit-aesthetic-signals"] });
      toast.success("Audit deleted. That email can submit again.");
    },
    onError: (error: Error) => toast.error(error.message || "Could not delete audit"),
  });

  const previewReport = useMutation({
    mutationFn: async ({ auditId, regenerate = false }: { auditId: string; regenerate?: boolean }) => {
      const { data, error } = await supabase.functions.invoke("send-free-audit-report", {
        body: { auditId, mode: "preview", regenerate },
      });
      if (error) {
        throw new Error(await functionErrorMessage(error));
      }
      return data as AuditReportFunctionResponse;
    },
    onSuccess: (result, variables) => {
      const auditRow = audits?.find((row) => row.id === variables.auditId);
      if (auditRow && isStarterGuideBriefPath(auditRow)) {
        openGuidePreview(auditRow);
        return;
      }
      const isGuide = result.reportMode === "starter_guide";
      if (isGuide) {
        openGuidePreview(auditRow ?? {
          id: variables.auditId,
          lead_email_lower: result.report?.recipient ?? null,
          lead_key: result.report?.recipient ?? variables.auditId,
          contact_name: result.report?.contactName ?? null,
          business_name: result.report?.businessName ?? null,
        } as AuditRow);
        return;
      }
      if (!result.report || !result.pdfBase64) {
        toast.info(
          "Showing the local template preview. Deploy send-free-audit-report to enable the downloadable generated PDF.",
        );
        return;
      }
      setPreviewPayload(result);
      setAudioBrief(normalizeAudioBrief(result.audioBrief));
      setShowPdfPreview(Boolean(result.pdfBase64));
      setPreviewOpen(true);
      toast.success(
        variables.regenerate
          ? `PDF regenerated for ${result.report.recipient}`
          : `Preview generated for ${result.report.recipient}`,
      );
    },
    onError: (error: Error) => toast.error(error.message || "Could not generate audit preview"),
  });

  const sendReport = useMutation({
    mutationFn: async ({ auditId, includeAudio }: { auditId: string; includeAudio: boolean }) => {
      const { data, error } = await supabase.functions.invoke("send-free-audit-report", {
        body: { auditId, mode: "send", includeAudio },
      });
      if (error) {
        throw new Error(await functionErrorMessage(error));
      }
      return data as AuditReportFunctionResponse;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["free-audit-submissions"] });
      if (result.report) {
        setPreviewPayload((current) => current ? { ...current, report: result.report, warnings: result.warnings } : current);
      }
      setPreviewOpen(false);
      const isGuide = result.reportMode === "starter_guide";
      toast.success(
        isGuide
          ? `Guide email sent${result?.to ? ` to ${result.to}` : ""}`
          : `Audit report sent${result?.to ? ` to ${result.to}` : ""}`,
      );
    },
    onError: (error: Error) => toast.error(error.message || "Could not send audit report"),
  });

  const ensureGuideDelivery = useMutation({
    mutationFn: async ({ auditId, force = false }: { auditId: string; force?: boolean }) => {
      const { data, error } = await supabase.functions.invoke("send-guide-delivery", {
        body: { auditIds: [auditId], force },
      });
      if (error) {
        throw new Error(await functionErrorMessage(error));
      }
      const payload = data as {
        ok?: boolean;
        results?: Array<{ sent?: boolean; to?: string; reason?: string; error?: string; ok?: boolean }>;
        error?: string;
      };
      if (payload?.error) {
        throw new Error(payload.error);
      }
      const row = payload?.results?.[0];
      if (!row?.sent) {
        throw new Error(
          row?.reason === "guide_already_sent"
            ? "Guide email was already sent. Use Resend to force another delivery."
            : row?.error ?? row?.reason ?? "Guide email was not sent",
        );
      }
      return { sent: true, to: row.to };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["free-audit-submissions"] });
      toast.success(`Guide email sent${result.to ? ` to ${result.to}` : ""}`);
    },
    onError: (error: Error) => toast.error(error.message || "Could not send guide email"),
  });

  const ensuredGuideDeliveryRef = useRef<Set<string>>(new Set());

  const generateAudioBrief = useMutation({
    mutationFn: async (
      {
        auditId,
        force = false,
        voicePreset = "signature",
        audioMode = "private_strategy_brief",
        scriptOverride,
      }: {
        auditId: string;
        force?: boolean;
        voicePreset?: "signature" | "storyteller" | "grounded";
        audioMode?: AudioMode;
        scriptOverride?: string;
      },
    ) => {
      const { data, error } = await supabase.functions.invoke("generate-audit-audio", {
        body: { auditId, force, voicePreset, audioMode, scriptOverride },
      });
      if (error) {
        throw new Error(await functionErrorMessage(error));
      }
      return data as GenerateAudioResponse;
    },
    onSuccess: (result) => {
      const nextAudio = normalizeAudioBrief({
        audioUrl: result.audioUrl,
        filename: result.filename,
        script: result.script,
        plainLanguageAudioBrief: result.plainLanguageAudioBrief,
        checks: result.checks,
        approvedForAudio: result.approvedForAudio,
        tone: result.tone,
        readingLevel: result.readingLevel,
        audioMode: result.audioMode,
        voicePreset: result.voicePreset,
        voicePresetLabel: result.voicePresetLabel,
        ttsProviderUsed: result.ttsProviderUsed,
        voices: result.voices,
        generatedAt: result.generatedAt,
        wordCount: result.wordCount,
        estimatedMinutes: result.estimatedMinutes,
      });
      setAudioBrief(nextAudio);
      setPreviewPayload((current) => current ? { ...current, audioBrief: nextAudio } : current);
      queryClient.invalidateQueries({ queryKey: ["free-audit-submissions"] });
      toast.success(result.reused ? "Existing audio brief loaded" : "Audio strategy brief ready");
    },
    onError: (error: Error) => toast.error(error.message || "Could not generate audio brief"),
  });

  const saveAudioReview = useMutation({
    mutationFn: async (
      {
        auditId,
        script,
        approvedOverride = false,
      }: {
        auditId: string;
        script: string;
        approvedOverride?: boolean;
      },
    ) => {
      const { data, error: loadError } = await supabase
        .from("free_audits")
        .select("metadata")
        .eq("id", auditId)
        .maybeSingle();
      if (loadError) throw loadError;
      if (!data) throw new Error("Audit not found.");

      const metadata = asRecord(data.metadata as Json | undefined);
      const reportAudio = asRecord(metadata.report_audio as Json | undefined);
      const checks = asRecord(reportAudio.audio_brief_checks as Json | undefined);
      const nextChecks = approvedOverride ? { ...checks, approved_for_audio: true } : checks;
      const nextReportAudio = {
        ...reportAudio,
        script,
        script_edited_at: new Date().toISOString(),
        approved_for_audio: approvedOverride ? true : reportAudio.approved_for_audio,
        audio_brief_checks: Object.keys(nextChecks).length ? nextChecks : reportAudio.audio_brief_checks,
        admin_audio_override: approvedOverride
          ? {
            approved: true,
            approved_at: new Date().toISOString(),
            reason: "Admin liked the generated audio.",
          }
          : reportAudio.admin_audio_override,
      };

      const { error: updateError } = await supabase
        .from("free_audits")
        .update({
          metadata: {
            ...metadata,
            report_audio: nextReportAudio,
          },
        })
        .eq("id", auditId);
      if (updateError) throw updateError;
      return { script, approvedOverride };
    },
    onSuccess: ({ script, approvedOverride }) => {
      const nextChecks = approvedOverride
        ? { ...(audioBrief?.checks ?? {}), approved_for_audio: true }
        : audioBrief?.checks;
      const nextAudio = normalizeAudioBrief({
        ...(audioBrief ?? { audioUrl: "" }),
        script,
        approvedForAudio: approvedOverride ? true : audioBrief?.approvedForAudio,
        checks: nextChecks,
      });
      setAudioBrief(nextAudio);
      setPreviewPayload((current) => current ? { ...current, audioBrief: nextAudio } : current);
      queryClient.invalidateQueries({ queryKey: ["free-audit-submissions"] });
      toast.success(approvedOverride ? "Audio approved by admin override" : "Audio script edits saved");
    },
    onError: (error: Error) => toast.error(error.message || "Could not save audio review"),
  });

  useEffect(() => {
    setAudioScriptDraft(audioBrief?.script ?? "");
  }, [audioBrief?.script, previewPayload?.report?.auditId]);

  useEffect(() => {
    const auditId = previewPayload?.report?.auditId;
    if (!previewOpen || !auditId || audioBrief?.audioUrl || generateAudioBrief.isPending) return;
    if (autoAudioAttemptedAuditId === auditId) return;
    setAutoAudioAttemptedAuditId(auditId);
    generateAudioBrief.mutate({ auditId, voicePreset: audioVoicePreset, audioMode });
  }, [audioBrief?.audioUrl, audioMode, audioVoicePreset, autoAudioAttemptedAuditId, generateAudioBrief, previewOpen, previewPayload?.report?.auditId]);

  const runSocialResearch = useMutation({
    mutationFn: async (auditId: string) => {
      const { data, error } = await supabase.functions.invoke("free-audit-social-research", {
        body: { auditId, action: "research", force: true },
      });
      if (error) {
        throw new Error(await functionErrorMessage(error));
      }
      return data as {
        skipped?: boolean;
        message?: string;
        guideEmail?: { sent?: boolean; to?: string };
        evidenceWritten?: number;
        evidence?: AuditEvidenceReview["evidence"];
        findings?: AuditEvidenceReview["findings"];
        strategic_profile?: Json | null;
        strategist_summary?: Json | null;
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["free-audit-submissions"] });
      if (result.skipped) {
        const guideEmail = result as { guideEmail?: { sent?: boolean; to?: string } };
        if (guideEmail.guideEmail?.sent) {
          toast.success(`Guide email sent${guideEmail.guideEmail.to ? ` to ${guideEmail.guideEmail.to}` : ""}`);
        } else {
          toast.info(result.message || "Full research requires a website and at least one social profile.");
        }
        if (result.evidence && result.findings) {
          setEvidenceReview({
            evidence: result.evidence,
            findings: result.findings,
            strategic_profile: result.strategic_profile ?? null,
            strategist_summary: result.strategist_summary ?? null,
          });
        }
        return;
      }
      if (result.evidence && result.findings) {
        setEvidenceReview({
          evidence: result.evidence,
          findings: result.findings,
          strategic_profile: result.strategic_profile ?? null,
          strategist_summary: result.strategist_summary ?? null,
        });
      }
      toast.success(`Social Signal Research updated${typeof result.evidenceWritten === "number" ? ` (${result.evidenceWritten} items)` : ""}`);
    },
    onError: (error: Error) => toast.error(error.message || "Could not run Social Signal Research"),
  });

  const loadEvidenceReview = useMutation({
    mutationFn: async (auditId: string) => {
      const { data, error } = await supabase.functions.invoke("free-audit-social-research", {
        body: { auditId, action: "review" },
      });
      if (error) {
        throw new Error(await functionErrorMessage(error));
      }
      return data as AuditEvidenceReview;
    },
    onSuccess: (result) => setEvidenceReview(result),
    onError: (error: Error) => toast.error(error.message || "Could not load Evidence Capture review"),
  });

  const approveFindings = useMutation({
    mutationFn: async (auditId: string) => {
      const { data, error } = await supabase.functions.invoke("free-audit-social-research", {
        body: { auditId, action: "approve_findings" },
      });
      if (error) {
        throw new Error(await functionErrorMessage(error));
      }
      return data as AuditEvidenceReview;
    },
    onSuccess: (result) => {
      setEvidenceReview(result);
      queryClient.invalidateQueries({ queryKey: ["free-audit-submissions"] });
      if (previewPayload?.report?.auditId) {
        previewReport.mutate({ auditId: previewPayload.report.auditId, regenerate: true });
      }
      toast.success("Findings approved for report use");
    },
    onError: (error: Error) => toast.error(error.message || "Could not approve findings"),
  });

  const filteredAudits = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (audits ?? []).filter((audit) => {
      const readinessMatch = readinessFilter === "all" || audit.readiness_level === readinessFilter;
      if (!readinessMatch) return false;
      if (!q) return true;
      return [
        audit.contact_name,
        audit.business_name,
        audit.lead_email_lower,
        audit.phone,
        audit.lead_source,
        audit.audit_angle,
        audit.growth_goal,
        audit.current_blocker,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [audits, readinessFilter, search]);

  const selectedAudit = selectedAuditId
    ? filteredAudits.find((audit) => audit.id === selectedAuditId) ?? null
    : null;

  useEffect(() => {
    if (selectedAuditId || filteredAudits.length === 0) return;
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setSelectedAuditId(filteredAudits[0].id);
    }
  }, [filteredAudits, selectedAuditId]);

  useEffect(() => {
    if (!selectedAuditId) return;
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    requestAnimationFrame(() => {
      document.getElementById("audit-detail-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [selectedAuditId]);
  const selectedAestheticSignal = selectedAudit
    ? (aestheticSignals ?? []).find((signal) => signal.audit_id === selectedAudit.id) ?? null
    : null;
  const selectedVisualInput = selectedAudit ? buildAuditVisualInput(selectedAudit) : null;
  const selectedSocialResearch = selectedAudit ? socialResearchSummary(selectedAudit.metadata) : null;
  const strategicReviewProfile = asLooseRecord(evidenceReview?.strategic_profile);
  const strategicSummaryCard = asLooseRecord(
    evidenceReview?.strategist_summary ?? strategicReviewProfile.strategist_summary,
  );
  const brandArchitectureCard = asLooseRecord(strategicReviewProfile.brand_architecture);
  const businessModelCard = asLooseRecord(strategicReviewProfile.business_model);
  const offerLadderCard = asLooseRecord(strategicReviewProfile.offer_ladder);
  const audienceCard = asLooseRecord(strategicReviewProfile.audience);
  const culturalCard = asLooseRecord(strategicReviewProfile.cultural_context);
  const proofCard = asLooseRecord(strategicReviewProfile.proof_inventory);
  const conversionCard = asLooseRecord(strategicReviewProfile.conversion_path);
  const contentRevenueCard = asLooseRecord(strategicReviewProfile.content_to_revenue);
  const audioChecks = audioBrief?.checks ?? null;
  const audioPlainBrief = audioBrief?.plainLanguageAudioBrief ?? null;
  const jargonTermsFound = audioChecks?.jargon_translation_check?.found_terms ?? [];
  const audioApproved = typeof audioBrief?.approvedForAudio === "boolean"
    ? audioBrief.approvedForAudio
    : audioChecks?.approved_for_audio;
  const audioScriptDirty = audioScriptDraft.trim() !== (audioBrief?.script ?? "").trim();
  const audioDraftWordCount = audioScriptDraft.split(/\s+/).filter(Boolean).length;
  const audioDraftEstimatedSeconds = Math.round((audioDraftWordCount / AUDIO_WORDS_PER_MINUTE) * 60);
  const audioDraftTooLong = audioDraftWordCount > MAX_AUDIO_WORDS;
  const stats = useMemo(() => {
    const rows = audits ?? [];
    return {
      total: rows.length,
      hot: rows.filter((row) => row.readiness_level === "HOT").length,
      warm: rows.filter((row) => row.readiness_level === "WARM").length,
      cold: rows.filter((row) => row.readiness_level === "COLD").length,
      needsFollowUp: rows.filter((row) => row.follow_up_status === "follow_up_needed").length,
      fullAuditSent: rows.filter(
        (row) => !isStarterGuideBriefPath(row) && row.follow_up_status === "audit_sent",
      ).length,
      starterGuideBrief: rows.filter((row) => isStarterGuideBriefPath(row)).length,
    };
  }, [audits]);

  const selectedIsGuide = useMemo(
    () => (selectedAudit ? isStarterGuideBriefPath(selectedAudit) : false),
    [selectedAudit],
  );

  const guideEmailWasSent = useMemo(() => {
    if (!selectedAudit?.metadata || typeof selectedAudit.metadata !== "object") return false;
    const guideEmail = (selectedAudit.metadata as Record<string, unknown>).guide_email;
    return Boolean(
      guideEmail &&
        typeof guideEmail === "object" &&
        (guideEmail as Record<string, unknown>).sent_at,
    );
  }, [selectedAudit?.metadata]);

  useEffect(() => {
    if (!selectedAudit?.id || !selectedIsGuide || guideEmailWasSent) return;
    if (ensuredGuideDeliveryRef.current.has(selectedAudit.id)) return;
    if (ensureGuideDelivery.isPending) return;
    ensuredGuideDeliveryRef.current.add(selectedAudit.id);
    ensureGuideDelivery.mutate({ auditId: selectedAudit.id });
  }, [selectedAudit?.id, selectedIsGuide, guideEmailWasSent]);

  const previewIsGuide = previewPayload?.reportMode === "starter_guide";

  const guidePreviewHtml = useMemo(() => {
    if (!previewIsGuide) return "";
    const contactName = selectedAudit?.contact_name ?? previewPayload?.report?.contactName;
    const businessName = selectedAudit?.business_name ?? previewPayload?.report?.businessName;
    return buildGuideDeliveryEmailHtml({ contactName, businessName });
  }, [previewIsGuide, previewPayload?.report, selectedAudit]);

  const selectedIntakeFields = useMemo(
    () => (selectedAudit ? buildAuditIntakeFieldRows(selectedAudit) : []),
    [selectedAudit],
  );

  const intakeGroups = useMemo(() => {
    const groups: string[] = [];
    for (const row of selectedIntakeFields) {
      if (!groups.includes(row.group)) groups.push(row.group);
    }
    return groups;
  }, [selectedIntakeFields]);

  function handleDownloadPreview() {
    if (!previewPayload?.pdfBase64) {
      toast.error("Generate a PDF preview first.");
      return;
    }
    downloadBase64Pdf(previewPayload.pdfBase64, previewPayload.filename || previewPayload.report?.filename || "audit-diagnosis.pdf");
  }

  function handleDownloadAudio() {
    if (!audioBrief?.audioUrl) {
      toast.error("Generate an audio brief first.");
      return;
    }
    downloadUrl(audioBrief.audioUrl, audioBrief.filename || `${previewPayload?.report?.businessName ?? "audit"}-audio-brief.mp3`);
  }

  function handleDeleteAudit(audit: AuditRow, event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    setDeleteTarget(audit);
  }

  function confirmDeleteAudit() {
    if (!deleteTarget) return;
    deleteAudit.mutate(deleteTarget);
  }

  function openLocalPreview(audit: AuditRow) {
    const localAudio = audioBriefFromAudit(audit);
    const localReport = buildLocalAuditReport(audit, selectedAestheticSignal);
    setAudioBrief(localAudio);
    setPreviewPayload({
      ok: true,
      mode: "preview",
      reportMode: "brand_diagnosis",
      report: localReport,
      warnings: localReport.warnings,
      filename: localReport.filename,
      audioBrief: localAudio,
      emailHtml: fallbackEmailPreview(localReport, localAudio),
    });
    setShowPdfPreview(false);
    setPreviewOpen(true);
  }

  function openGuidePreview(audit: AuditRow) {
    const recipient = audit.lead_email_lower || audit.lead_key;
    const emailHtml = buildGuideDeliveryEmailHtml({
      contactName: audit.contact_name,
      businessName: audit.business_name,
    });
    setAudioBrief(null);
    setEvidenceReview(null);
    setPreviewPayload({
      ok: true,
      mode: "preview",
      reportMode: "starter_guide",
      emailHtml,
      report: {
        auditId: audit.id,
        recipient,
        contactName: audit.contact_name || "there",
        businessName: audit.business_name || "Your Brand",
        subject: GUIDE_DELIVERY_EMAIL_SUBJECT,
      } as FreeAuditReportPreviewData,
    });
    setShowPdfPreview(false);
    setPreviewOpen(true);
  }

  function handlePreviewAudit(audit: AuditRow) {
    if (isStarterGuideBriefPath(audit)) {
      openGuidePreview(audit);
      return;
    }
    const localAudio = audioBriefFromAudit(audit);
    openLocalPreview(audit);
    setEvidenceReview(null);
    if (!localAudio?.audioUrl && !generateAudioBrief.isPending) {
      setAutoAudioAttemptedAuditId(audit.id);
      generateAudioBrief.mutate({ auditId: audit.id, voicePreset: audioVoicePreset, audioMode });
    }
    if (!runSocialResearch.isPending) {
      runSocialResearch.mutate(audit.id);
    }
    if (!loadEvidenceReview.isPending) {
      loadEvidenceReview.mutate(audit.id);
    }
    previewReport.mutate({ auditId: audit.id });
  }

  return (
    <div className="min-w-0 space-y-4 md:space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-muted-foreground">Growth</p>
          <h1 className="text-3xl font-bold">Audit Submissions</h1>
          <p className="text-muted-foreground">Review Free Audit submissions, lead readiness, and diagnostic answers.</p>
        </div>
        <Button asChild>
          <Link to="/dashboard/audits/templates">
            <Upload className="mr-2 h-4 w-4" />
            Templates
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {[
          ["Total", stats.total],
          ["Hot", stats.hot],
          ["Warm", stats.warm],
          ["Cold", stats.cold],
          ["Sent", stats.fullAuditSent],
          ["Guide", stats.starterGuideBrief],
          ["Follow-up", stats.needsFollowUp],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)] lg:gap-6 lg:items-start">
        <div className="min-w-0 rounded-2xl border bg-card">
          <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center">
            <Input
              placeholder="Search audits..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="md:max-w-sm"
            />
            <Select value={readinessFilter} onValueChange={setReadinessFilter}>
              <SelectTrigger className="md:w-44">
                <SelectValue placeholder="Readiness" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All readiness</SelectItem>
                <SelectItem value="HOT">Hot</SelectItem>
                <SelectItem value="WARM">Warm</SelectItem>
                <SelectItem value="COLD">Cold</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table className="min-w-[36rem]">
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Readiness</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Source</TableHead>
                <TableHead className="hidden md:table-cell">Submitted</TableHead>
                <TableHead className="w-12 text-right">
                  <span className="sr-only">Delete</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Loading audits...</TableCell>
                </TableRow>
              ) : filteredAudits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No audit submissions found.</TableCell>
                </TableRow>
              ) : (
                filteredAudits.map((audit) => (
                  <TableRow
                    key={audit.id}
                    className={`cursor-pointer ${selectedAuditId === audit.id ? "bg-muted/60" : ""}`}
                    onClick={() => setSelectedAuditId(audit.id)}
                  >
                    <TableCell>
                      <div className="font-medium">{audit.business_name || audit.contact_name || audit.lead_email_lower}</div>
                      <div className="text-xs text-muted-foreground">{audit.lead_email_lower || audit.lead_key}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={audit.readiness_level === "HOT" ? "default" : "secondary"}>
                        {audit.readiness_level ?? "Unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={isStarterGuideBriefPath(audit) ? "outline" : "secondary"}
                        className="font-medium"
                        title={getAuditDeliveryLabel(audit)}
                      >
                        {getAuditDeliveryShortLabel(audit)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="font-normal"
                        title={statusLabel(audit.follow_up_status)}
                      >
                        {followUpShortLabel(audit.follow_up_status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{audit.lead_source ?? "direct"}</TableCell>
                    <TableCell className="hidden md:table-cell whitespace-nowrap">{formatDate(audit.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={deleteAudit.isPending}
                        aria-label={`Delete audit for ${audit.business_name || audit.lead_email_lower || audit.lead_key}`}
                        onClick={(event) => handleDeleteAudit(audit, event)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </div>

        <aside
          id="audit-detail-panel"
          className={`min-w-0 rounded-2xl border bg-card p-4 md:p-5 ${
            selectedAudit ? "" : "hidden lg:block"
          } lg:sticky lg:top-24 lg:max-h-[calc(100svh-7rem)] lg:overflow-y-auto`}
        >
          {selectedAudit ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Selected Audit</p>
                  <h2 className="text-xl font-semibold">{selectedAudit.business_name || selectedAudit.contact_name || "Unnamed lead"}</h2>
                  <p className="text-sm text-muted-foreground">{selectedAudit.lead_email_lower}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge
                      variant={isStarterGuideBriefPath(selectedAudit) ? "outline" : "secondary"}
                      title={getAuditDeliveryLabel(selectedAudit)}
                    >
                      {getAuditDeliveryShortLabel(selectedAudit)}
                    </Badge>
                    <Badge variant="outline" title={statusLabel(selectedAudit.follow_up_status)}>
                      {followUpShortLabel(selectedAudit.follow_up_status)}
                    </Badge>
                  </div>
                </div>
                <SearchCheck className="h-6 w-6 text-gold" />
              </div>

              <Select
                value={selectedAudit.follow_up_status}
                onValueChange={(status) => updateStatus.mutate({ auditId: selectedAudit.id, status })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Follow-up status" />
                </SelectTrigger>
                <SelectContent>
                  {FOLLOW_UP_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>{statusLabel(status)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                className="w-full"
                onClick={() => handlePreviewAudit(selectedAudit)}
                disabled={previewReport.isPending && !selectedIsGuide}
              >
                {previewReport.isPending && !selectedIsGuide ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="mr-2 h-4 w-4" />
                )}
                {previewReport.isPending && !selectedIsGuide
                  ? "Generating Preview..."
                  : selectedIsGuide
                    ? "View guide email"
                    : "Preview / Download PDF"}
              </Button>

              {selectedIsGuide ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    ensureGuideDelivery.mutate({
                      auditId: selectedAudit.id,
                      force: guideEmailWasSent,
                    })}
                  disabled={ensureGuideDelivery.isPending}
                >
                  {ensureGuideDelivery.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {guideEmailWasSent ? "Resend guide email" : "Send guide email now"}
                </Button>
              ) : null}

              <div className="rounded-xl border border-gold/30 bg-gold/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Delivery</p>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Path</p>
                    <p className="text-2xl font-bold tracking-tight">
                      {getAuditDeliveryPathShortLabel(selectedAudit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Send status</p>
                    <p className="text-2xl font-bold tracking-tight">
                      {selectedAudit.follow_up_status === "audit_sent" ? "Sent" : "Queued"}
                    </p>
                    {selectedAudit.follow_up_status !== "audit_sent" && selectedIsGuide ? (
                      <p className="mt-1 text-xs text-muted-foreground leading-snug">Sends automatically</p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-muted/15 p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Form answers (as submitted)
                </p>
                <div className="mt-4 space-y-5">
                  {intakeGroups.map((group) => (
                    <div key={group} className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">{group}</p>
                      {selectedIntakeFields
                        .filter((row) => row.group === group)
                        .map((row) => (
                          <div key={`${group}-${row.label}`}>
                            <p className="text-sm font-medium leading-snug">{row.label}</p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{row.value}</p>
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border bg-muted/20 p-3 text-sm">
                <div className="mb-2 flex items-center gap-2 font-medium">
                  <Palette className="h-4 w-4 text-gold" />
                  Aesthetic Intelligence
                </div>
                {selectedAestheticSignal ? (
                  <div className="space-y-2 text-muted-foreground">
                    <p><span className="font-medium text-foreground">Industry:</span> {statusLabel(selectedAestheticSignal.detected_industry)}</p>
                    <p><span className="font-medium text-foreground">Aesthetic:</span> {selectedAestheticSignal.detected_aesthetic ?? "Unknown"}</p>
                    <p><span className="font-medium text-foreground">Recommended vibe:</span> {selectedAestheticSignal.recommended_vibe ?? "Use JahKnowsPR premium editorial rules"}</p>
                    <p><span className="font-medium text-foreground">Confidence:</span> {Math.round(selectedAestheticSignal.confidence * 100)}%</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No scan captured yet. New submissions will scan automatically when website or social context is available.</p>
                )}
              </div>

              <div className="rounded-xl border bg-muted/20 p-3 text-sm">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-medium">
                    <SearchCheck className="h-4 w-4 text-gold" />
                    Public Source Intelligence
                  </div>
                  <Badge variant="outline">{selectedSocialResearch?.status ?? "not queued"}</Badge>
                </div>
                {selectedSocialResearch ? (
                  <div className="space-y-3 text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Evidence:</span>{" "}
                      {selectedSocialResearch.evidenceCount} item{selectedSocialResearch.evidenceCount === 1 ? "" : "s"} collected
                    </p>
                    <div className="space-y-2">
                      <p className="font-medium text-foreground">Normalized sources</p>
                      {selectedSocialResearch.sources.length ? (
                        selectedSocialResearch.sources.slice(0, 5).map((source) => (
                          <div key={`${source.platform}-${source.canonical_url}`} className="rounded-lg border bg-background/70 p-2">
                            <p className="truncate text-foreground">{cleanText(source.canonical_url, "Unknown source")}</p>
                            <p className="text-xs">
                              {cleanText(source.platform, "unknown")} / confidence{" "}
                              {Math.round((typeof source.confidence === "number" ? source.confidence : 0) * 100)}%
                              {source.was_inferred ? " / inferred URL" : " / user-provided URL"}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p>No social sources normalized yet.</p>
                      )}
                    </div>
                    {Object.keys(selectedSocialResearch.providerConfig).length ? (
                      <p className="text-xs">
                        Providers: {Object.entries(selectedSocialResearch.providerConfig)
                          .map(([key, value]) => `${key} ${value ? "ready" : "missing"}`)
                          .join(", ")}
                      </p>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => runSocialResearch.mutate(selectedAudit.id)}
                      disabled={runSocialResearch.isPending || selectedIsGuide}
                      title={selectedIsGuide ? "Guide leads receive the Brief email automatically." : undefined}
                    >
                      {runSocialResearch.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <SearchCheck className="mr-2 h-4 w-4" />
                      )}
                      {runSocialResearch.isPending ? "Researching..." : "Refresh Signal Research"}
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 font-medium">
                  <FileText className="h-4 w-4" />
                  Diagnostics
                </div>
                <JsonBlock value={selectedAudit.score_summary} />
                <JsonBlock value={selectedAudit.actual_outcome} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select an audit to see diagnostic details.</p>
          )}
        </aside>
      </div>

      {selectedVisualInput && !selectedIsGuide ? (
        <section className="space-y-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-muted-foreground">Visual Intelligence</p>
            <h2 className="text-2xl font-bold">Brand Diagnosis Visual System</h2>
            <p className="text-sm text-muted-foreground">
              Data-to-visual translation engine for premium, client-specific audit artifacts.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <AuditHeroVisual data={selectedVisualInput} />
            <ScoreBreakdownVisual data={selectedVisualInput} />
          </div>
        </section>
      ) : null}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-2rem)] max-w-6xl overflow-y-auto sm:w-full">
          <DialogHeader>
            <DialogTitle>{previewIsGuide ? "Guide email preview" : "Audit PDF Preview"}</DialogTitle>
            <DialogDescription>
              {previewIsGuide
                ? "Guide path only. No audit PDF — client must resubmit with website and at least one social profile for a full diagnosis."
                : "Review the PDF and optional audio brief before sending anything to the client."}
            </DialogDescription>
          </DialogHeader>

          {previewPayload ? (
            previewIsGuide ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This lead cannot receive a full audit from this submission. The Brief guide email is sent automatically.
                They must complete a new application once their website and at least one social profile are live.
              </p>
              <div className="grid gap-3 rounded-2xl border bg-card p-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Recipient</p>
                  <p className="font-medium">{previewPayload.report?.recipient}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Subject</p>
                  <p className="font-medium">{GUIDE_DELIVERY_EMAIL_SUBJECT}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <p className="text-muted-foreground">
                  CTA opens:{" "}
                  <a
                    href={GUIDE_DELIVERY_HUB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-gold underline-offset-2 hover:underline"
                  >
                    {GUIDE_DELIVERY_HUB_URL}
                  </a>
                </p>
                <Button variant="outline" size="sm" asChild>
                  <a href={GUIDE_DELIVERY_HUB_URL} target="_blank" rel="noopener noreferrer">
                    Open guide page
                  </a>
                </Button>
              </div>
              <iframe
                title="Guide email preview"
                srcDoc={guidePreviewHtml}
                className="h-[70vh] w-full rounded-xl border bg-[#F7F3EA]"
              />
            </div>
            ) : (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-2xl border bg-card p-4 text-sm md:grid-cols-3">
                <div>
                  <p className="text-muted-foreground">Delivery path</p>
                  <p className="font-medium">Audit</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Recipient</p>
                  <p className="font-medium">{previewPayload.report?.recipient}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Subject</p>
                  <p className="font-medium">{previewPayload.report?.subject}</p>
                </div>
                <div className="md:col-span-3">
                  <p className="text-muted-foreground">File</p>
                  <p className="font-medium">{previewPayload.filename || previewPayload.report?.filename}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant={showPdfPreview ? "default" : "outline"}
                  onClick={() => setShowPdfPreview(true)}
                  disabled={!previewPayload.pdfBase64}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Preview PDF
                </Button>
                <Button
                  type="button"
                  variant={!showPdfPreview ? "default" : "outline"}
                  onClick={() => setShowPdfPreview(false)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Preview Report Deck
                </Button>
              </div>

              {(previewPayload.warnings ?? previewPayload.report?.warnings ?? []).length ? (
                <div className="space-y-2">
                  {(previewPayload.warnings ?? previewPayload.report?.warnings ?? []).map((warning) => (
                    <div
                      key={`${warning.title}-${warning.detail}`}
                      className={`rounded-xl border p-3 text-sm ${
                        warning.severity === "error"
                          ? "border-destructive/30 bg-destructive/10 text-destructive"
                          : warning.severity === "warning"
                            ? "border-gold/40 bg-gold/10"
                            : "bg-muted/40"
                      }`}
                    >
                      <p className="font-semibold">{warning.title}</p>
                      <p className="mt-1 text-muted-foreground">{warning.detail}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="rounded-2xl border bg-card p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 font-semibold">
                      <SearchCheck className="h-4 w-4 text-gold" />
                      Evidence Capture Review
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => previewPayload.report?.auditId && approveFindings.mutate(previewPayload.report.auditId)}
                    disabled={!previewPayload.report?.auditId || approveFindings.isPending || !evidenceReview?.findings.length}
                  >
                    {approveFindings.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <SearchCheck className="mr-2 h-4 w-4" />
                    )}
                    {approveFindings.isPending ? "Approving..." : "Approve Findings"}
                  </Button>
                </div>

                {evidenceReview ? (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-2 text-sm sm:grid-cols-3">
                      <div className="rounded-xl bg-muted/30 p-3">
                        <p className="text-muted-foreground">Evidence collected</p>
                        <p className="text-xl font-semibold">{evidenceReview.evidence.length}</p>
                      </div>
                      <div className="rounded-xl bg-muted/30 p-3">
                        <p className="text-muted-foreground">Findings generated</p>
                        <p className="text-xl font-semibold">{evidenceReview.findings.length}</p>
                      </div>
                      <div className="rounded-xl bg-muted/30 p-3">
                        <p className="text-muted-foreground">Confidence level</p>
                        <p className="text-xl font-semibold">
                          {Math.round(
                            ((evidenceReview.findings.reduce((sum, finding) => sum + finding.confidence_score, 0) || 0)
                              / Math.max(1, evidenceReview.findings.length)) * 100,
                          )}%
                        </p>
                      </div>
                    </div>

                    {Object.keys(strategicSummaryCard).length ? (
                      <section className="rounded-xl border bg-muted/20 p-3 text-sm">
                        <p className="font-medium">Human Strategist Summary</p>
                        <p className="mt-2 leading-6 text-muted-foreground">
                          {cleanText(strategicSummaryCard.strategist_summary, "No strategist summary generated yet.")}
                        </p>
                        <div className="mt-3 grid gap-2 md:grid-cols-3">
                          <div className="rounded-lg bg-background/70 p-2">
                            <p className="text-xs text-muted-foreground">Top opportunity</p>
                            <p className="text-sm">{cleanText(strategicSummaryCard.top_opportunity, "Not available")}</p>
                          </div>
                          <div className="rounded-lg bg-background/70 p-2">
                            <p className="text-xs text-muted-foreground">Top risk</p>
                            <p className="text-sm">{cleanText(strategicSummaryCard.top_risk, "Not available")}</p>
                          </div>
                          <div className="rounded-lg bg-background/70 p-2">
                            <p className="text-xs text-muted-foreground">Recommended priority</p>
                            <p className="text-sm">{cleanText(strategicSummaryCard.recommended_priority, "Not available")}</p>
                          </div>
                        </div>
                        {asStringArrayLoose(strategicSummaryCard.next_3_moves).length ? (
                          <ol className="mt-3 list-decimal space-y-1 pl-5 text-muted-foreground">
                            {asStringArrayLoose(strategicSummaryCard.next_3_moves).map((step) => (
                              <li key={step}>{step}</li>
                            ))}
                          </ol>
                        ) : null}
                      </section>
                    ) : null}

                    <section className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border bg-background/70 p-3 text-sm">
                        <p className="font-medium">Brand Architecture</p>
                        <p className="mt-2 text-muted-foreground">{cleanText(brandArchitectureCard.brand_architecture_notes, "No brand architecture notes yet.")}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Parent: {cleanText(brandArchitectureCard.parent_brand, "Not detected")} | Public: {cleanText(brandArchitectureCard.public_brand, "Not detected")} | Platform: {cleanText(brandArchitectureCard.platform_brand, "Not detected")}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Naming consistency: {metricPercent(brandArchitectureCard.naming_consistency_score)}
                        </p>
                      </div>
                      <div className="rounded-xl border bg-background/70 p-3 text-sm">
                        <p className="font-medium">Business Model</p>
                        <p className="mt-2 text-muted-foreground">{cleanText(businessModelCard.business_model_summary, "No business model summary yet.")}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Primary revenue model: {cleanText(businessModelCard.primary_revenue_model, "Not detected")}
                        </p>
                        {asStringArrayLoose(businessModelCard.secondary_revenue_models).length ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Secondary: {asStringArrayLoose(businessModelCard.secondary_revenue_models).join(", ")}
                          </p>
                        ) : null}
                      </div>
                      <div className="rounded-xl border bg-background/70 p-3 text-sm">
                        <p className="font-medium">Offer Ladder</p>
                        <p className="mt-2 text-muted-foreground">{cleanText(offerLadderCard.offer_positioning_notes, "No offer ladder notes yet.")}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Entry: {cleanText(offerLadderCard.entry_offer, "Not set")}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Core: {cleanText(offerLadderCard.core_offer, "Not set")}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Premium: {cleanText(offerLadderCard.premium_offer, "Not set")}
                        </p>
                      </div>
                      <div className="rounded-xl border bg-background/70 p-3 text-sm">
                        <p className="font-medium">Audience Segments</p>
                        <p className="mt-2 text-muted-foreground">{cleanText(audienceCard.audience_priority_recommendation, "No audience recommendation yet.")}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Primary buyer: {cleanText(audienceCard.primary_buyer, "Not set")} | Sponsor segment: {cleanText(audienceCard.sponsor_segment, "Not set")}
                        </p>
                      </div>
                      <div className="rounded-xl border bg-background/70 p-3 text-sm">
                        <p className="font-medium">Cultural Context</p>
                        <p className="mt-2 text-muted-foreground">{cleanText(culturalCard.cultural_context_summary, "No cultural context summary yet.")}</p>
                        {asStringArrayLoose(culturalCard.local_identity_signals).length ? (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Signals: {asStringArrayLoose(culturalCard.local_identity_signals).join(", ")}
                          </p>
                        ) : null}
                      </div>
                      <div className="rounded-xl border bg-background/70 p-3 text-sm">
                        <p className="font-medium">Proof Inventory</p>
                        <p className="mt-2 text-muted-foreground">{cleanText(asStringArrayLoose(proofCard.strongest_proof_points)[0], "No proof highlights yet.")}</p>
                        {asStringArrayLoose(proofCard.missing_proof_points).length ? (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Missing proof: {asStringArrayLoose(proofCard.missing_proof_points).join(", ")}
                          </p>
                        ) : null}
                      </div>
                      <div className="rounded-xl border bg-background/70 p-3 text-sm">
                        <p className="font-medium">Conversion Path</p>
                        <p className="mt-2 text-muted-foreground">{cleanText(conversionCard.conversion_path_summary, "No conversion path summary yet.")}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Current CTA: {cleanText(conversionCard.current_cta, "Unknown")}
                          {" -> "}
                          Primary CTA: {cleanText(conversionCard.recommended_primary_cta, "Not set")}
                        </p>
                      </div>
                      <div className="rounded-xl border bg-background/70 p-3 text-sm">
                        <p className="font-medium">Content-to-Revenue Map</p>
                        <p className="mt-2 text-muted-foreground">
                          {cleanText(asStringArrayLoose(contentRevenueCard.recommended_content_sequence).join(" -> "), "No content sequence yet.")}
                        </p>
                        {asStringArrayLoose(contentRevenueCard.best_content_to_monetize).length ? (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Best to monetize: {asStringArrayLoose(contentRevenueCard.best_content_to_monetize).join(", ")}
                          </p>
                        ) : null}
                      </div>
                    </section>

                    <section className="rounded-xl border bg-muted/20 p-3 text-sm">
                      <p className="font-medium">Data sources used</p>
                      {uniqueEvidenceSources(evidenceReview.evidence).length ? (
                        <ol className="mt-3 max-h-64 list-decimal space-y-3 overflow-y-auto pl-5">
                          {uniqueEvidenceSources(evidenceReview.evidence).map((item) => (
                            <li key={`${item.source_type}-${item.source_url}-${item.id}`} className="pl-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-foreground">{item.source_label || statusLabel(item.platform)}</span>
                                <Badge variant="outline">{researchSourceLabel(item.source_type)}</Badge>
                              </div>
                              {item.source_url ? (
                                <p className="mt-1 break-all text-xs text-muted-foreground">{item.source_url}</p>
                              ) : null}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="mt-1 text-muted-foreground">No Evidence Capture records yet</p>
                      )}
                    </section>

                    <section className="space-y-2">
                      <p className="font-medium">Evidence records</p>
                      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                        {evidenceReview.evidence.slice(0, 12).map((item) => (
                          <div key={item.id} className="rounded-xl border bg-background/70 p-3 text-sm">
                            {(() => {
                              const metadata = asLooseRecord(item.metadata);
                              return (
                                <>
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="font-medium">{statusLabel(item.evidence_category)}</p>
                                      <Badge variant="outline">{researchSourceLabel(item.source_type)}</Badge>
                                      <Badge variant="outline">{cleanText(metadata.agent_name, "Research Agent")}</Badge>
                                    </div>
                                    <Badge variant="outline">{Math.round(item.confidence_score * 100)}%</Badge>
                                  </div>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {item.source_label || researchSourceLabel(item.source_type)}
                                  </p>
                                  {item.source_url ? (
                                    <p className="mt-1 break-all text-xs text-muted-foreground">{item.source_url}</p>
                                  ) : null}
                                  <p className="mt-2 text-sm">
                                    <span className="font-medium">Observed signal:</span>{" "}
                                    {cleanAdminCopy(cleanText(metadata.observed_signal, item.normalized_observation))}
                                  </p>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    <span className="font-medium text-foreground">Strategic interpretation:</span>{" "}
                                    {cleanAdminCopy(cleanText(metadata.strategic_interpretation, item.normalized_observation))}
                                  </p>
                                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <span>Suggested category: {cleanText(metadata.suggested_audit_category, item.evidence_category)}</span>
                                    <span>Source conf: {metricPercent(metadata.source_confidence)}</span>
                                    <span>Inference conf: {metricPercent(metadata.inference_confidence)}</span>
                                    <span>Final conf: {metricPercent(metadata.final_confidence)}</span>
                                    <span>Strength: {cleanText(metadata.evidence_strength, "medium")}</span>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="space-y-2">
                      <p className="font-medium">Findings generated</p>
                      <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                        {evidenceReview.findings.map((finding) => (
                          <div key={finding.id} className="rounded-xl border bg-background/70 p-3 text-sm">
                            {(() => {
                              const metadata = asLooseRecord(finding.metadata);
                              return (
                                <>
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                      <p className="font-medium">{finding.finding_title}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Category: {statusLabel(finding.finding_category)} | Severity: {statusLabel(finding.severity)} | Agent: {cleanText(finding.produced_by_agent || metadata.produced_by_agent, "Research Agent")}
                                      </p>
                                    </div>
                                    {finding.report_ready ? <Badge>Approved</Badge> : <Badge variant="outline">Pending review</Badge>}
                                  </div>
                                  <p className="mt-2 leading-6 text-muted-foreground">
                                    {cleanAdminCopy(cleanText(finding.diagnosis || metadata.diagnosis, finding.finding_summary))}
                                  </p>
                                  <p className="mt-2 text-xs text-muted-foreground">
                                    <span className="font-medium text-foreground">Evidence summary:</span>{" "}
                                    {cleanAdminCopy(cleanText(finding.evidence_summary || metadata.evidence_summary, "Not provided"))}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    <span className="font-medium text-foreground">Business implication:</span>{" "}
                                    {cleanText(finding.business_implication || metadata.business_implication, "Not provided")}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    <span className="font-medium text-foreground">Revenue implication:</span>{" "}
                                    {cleanText(finding.revenue_implication || metadata.revenue_implication, "Not provided")}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    <span className="font-medium text-foreground">Audience implication:</span>{" "}
                                    {cleanText(finding.audience_implication || metadata.audience_implication, "Not provided")}
                                  </p>
                                  <p className="mt-2 text-xs font-medium">Next move: {finding.recommended_action}</p>
                                </>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                    {runSocialResearch.isPending
                      ? "Cueing Website, Tavily online research, Meta/Graph API, public data providers, screenshots, and social channels..."
                      : "Run Social Signal Research or open a preview to load Evidence Capture records."}
                  </div>
                )}
              </div>

              {showPdfPreview && pdfPreviewUrl ? (
                <object
                  title={`${previewPayload.report?.businessName ?? "Audit"} PDF preview`}
                  data={pdfPreviewUrl}
                  type="application/pdf"
                  className="h-[64vh] w-full rounded-2xl border bg-muted"
                >
                  <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                    PDF preview could not be embedded. Use Download PDF to open the generated file.
                  </div>
                </object>
              ) : previewPayload.report ? (
                <FreeAuditReportPreview report={previewPayload.report} />
              ) : null}

              {previewPayload.emailHtml || previewPayload.report ? (
                <div className="rounded-2xl border bg-card p-4">
                  <div className="mb-3 flex items-center gap-2 font-semibold">
                    <Send className="h-4 w-4 text-gold" />
                    Next: Email Preview
                  </div>
                  <iframe
                    title="Client email preview"
                    srcDoc={
                      previewPayload.emailHtml ||
                      (previewPayload.report
                        ? fallbackEmailPreview(previewPayload.report, audioBrief)
                        : "")
                    }
                    className="h-96 w-full rounded-xl border bg-white"
                  />
                </div>
              ) : null}

              <div className="rounded-2xl border bg-card p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 font-semibold">
                      <Headphones className="h-4 w-4 text-gold" />
                      Audio Strategy Brief
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Generate a plain-language strategist voice note from the structured report JSON. Review and quality-check it before sending.
                    </p>
                    <div className="mt-3 grid max-w-xl gap-3 sm:grid-cols-2">
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">Audio mode</p>
                        <div className="rounded-md border border-input bg-background px-3 py-2 text-sm">
                          Podcast Deep Dive
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Solo podcaster style. Jah walks through the audit with natural questions and answers.
                        </p>
                      </div>
                      <div>
                      <p className="mb-1 text-xs text-muted-foreground">Voice mode</p>
                      <Select value={audioVoicePreset} onValueChange={(value) => setAudioVoicePreset(value as "signature" | "storyteller" | "grounded")}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Choose voice preset" />
                        </SelectTrigger>
                        <SelectContent>
                          {AUDIO_VOICE_PRESETS.map((preset) => (
                            <SelectItem key={preset.id} value={preset.id}>
                              {preset.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {AUDIO_VOICE_PRESETS.find((preset) => preset.id === audioVoicePreset)?.detail}
                      </p>
                      </div>
                    </div>
                    {audioBrief?.estimatedMinutes ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Estimated length: {audioBrief.estimatedMinutes} minutes. Max allowed: 3 minutes 30 seconds.
                      </p>
                    ) : null}
                    {audioBrief?.voicePresetLabel ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Generated with: {audioBrief.voicePresetLabel}
                      </p>
                    ) : null}
                    {audioBrief?.audioMode ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Audio mode used: {AUDIO_MODES.find((mode) => mode.id === audioBrief.audioMode)?.label ?? cleanText(audioBrief.audioMode)}
                      </p>
                    ) : null}
                    {audioBrief?.ttsProviderUsed ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        TTS provider used: {audioBrief.ttsProviderUsed}
                        {audioBrief.ttsProviderUsed !== "elevenlabs" ? " (not ElevenLabs voices)" : ""}
                      </p>
                    ) : null}
                    {audioBrief?.voices?.narrator || audioBrief?.voices?.host_woman || audioBrief?.voices?.host_man ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Voice ID: {audioBrief.voices?.narrator || audioBrief.voices?.host_woman || audioBrief.voices?.host_man || "n/a"}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => previewPayload.report?.auditId && generateAudioBrief.mutate({
                        auditId: previewPayload.report.auditId,
                        force: true,
                        voicePreset: audioVoicePreset,
                        audioMode,
                      })}
                      disabled={!previewPayload.report?.auditId || generateAudioBrief.isPending}
                    >
                      {generateAudioBrief.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <FileAudio className="mr-2 h-4 w-4" />
                      )}
                      {generateAudioBrief.isPending ? "Generating Audio..." : "Regenerate Audio Brief"}
                    </Button>
                    <Button variant="outline" onClick={handleDownloadAudio} disabled={!audioBrief?.audioUrl}>
                      <Download className="mr-2 h-4 w-4" />
                      Download Audio
                    </Button>
                  </div>
                </div>
                {audioBrief?.audioUrl ? (
                  <div className="mt-4 space-y-3">
                    <audio controls src={audioBrief.audioUrl} className="w-full">
                      <a href={audioBrief.audioUrl}>Play Audio Brief</a>
                    </audio>
                    <div className="rounded-xl border bg-muted/20 p-3 text-sm">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-medium">Audio Brief Preview</p>
                        <Button
                          type="button"
                          size="sm"
                          variant={audioApproved === false ? "default" : "outline"}
                          disabled={!previewPayload.report?.auditId || saveAudioReview.isPending || audioApproved === true}
                          onClick={() => previewPayload.report?.auditId && saveAudioReview.mutate({
                            auditId: previewPayload.report.auditId,
                            script: audioScriptDraft || audioBrief.script || "",
                            approvedOverride: true,
                          })}
                        >
                          {saveAudioReview.isPending ? (
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          ) : null}
                          Override: Approve Audio
                        </Button>
                      </div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-lg bg-background/70 p-2">
                          <p className="text-xs text-muted-foreground">Tone label</p>
                          <p>{cleanText(audioBrief?.tone || audioPlainBrief?.tone, "plain-language strategist voice note")}</p>
                        </div>
                        <div className="rounded-lg bg-background/70 p-2">
                          <p className="text-xs text-muted-foreground">Reading level</p>
                          <p>{cleanText(audioBrief?.readingLevel || audioPlainBrief?.reading_level, "everyday business owner")}</p>
                        </div>
                        <div className="rounded-lg bg-background/70 p-2">
                          <p className="text-xs text-muted-foreground">Business-specific CTA check</p>
                          <p className={audioChecks?.business_specific_cta_check?.passed ? "text-emerald-700" : "text-destructive"}>
                            {audioChecks?.business_specific_cta_check?.passed ? "Pass" : "Needs update"}
                          </p>
                          {audioChecks?.business_specific_cta_check?.required_cta_family ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {audioChecks.business_specific_cta_check.required_cta_family}
                            </p>
                          ) : null}
                        </div>
                        <div className="rounded-lg bg-background/70 p-2">
                          <p className="text-xs text-muted-foreground">Jargon translation check</p>
                          <p className={audioChecks?.jargon_translation_check?.passed ? "text-emerald-700" : "text-destructive"}>
                            {audioChecks?.jargon_translation_check?.passed ? "Pass" : "Jargon found"}
                          </p>
                          {jargonTermsFound.length ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {jargonTermsFound.join(", ")}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-2 rounded-lg bg-background/70 p-2">
                        <p className="text-xs text-muted-foreground">Approved for audio</p>
                        <p className={audioApproved === false ? "text-destructive" : "text-emerald-700"}>
                          {audioApproved === false ? "No" : "Yes"}
                        </p>
                      </div>
                      {audioApproved === false ? (
                        <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                          Audio brief needs updates before send. Check jargon, CTA fit, and parent/platform naming.
                        </div>
                      ) : null}
                    </div>
                    {audioPlainBrief?.recommended_next_steps?.length ? (
                      <div className="rounded-xl border bg-muted/20 p-3 text-sm">
                        <p className="font-medium">Recommended Next Steps</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                          {audioPlainBrief.recommended_next_steps.map((step) => (
                            <li key={step}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <details className="rounded-xl bg-muted/30 p-3 text-sm">
                      <summary className="cursor-pointer font-medium">Review audio script</summary>
                      <Textarea
                        className="mt-3 min-h-[320px] text-sm leading-6"
                        value={audioScriptDraft}
                        onChange={(event) => setAudioScriptDraft(event.target.value)}
                        placeholder="Edit the final audio script here before regenerating audio."
                      />
                      <p className={`mt-2 text-xs ${audioDraftTooLong ? "text-destructive" : "text-muted-foreground"}`}>
                        Audio max: {MAX_AUDIO_WORDS} words. Current estimate: {Math.floor(audioDraftEstimatedSeconds / 60)}:{String(audioDraftEstimatedSeconds % 60).padStart(2, "0")} ({audioDraftWordCount}/{MAX_AUDIO_WORDS} words).
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!previewPayload.report?.auditId || !audioScriptDirty || audioDraftTooLong || saveAudioReview.isPending}
                          onClick={() => previewPayload.report?.auditId && saveAudioReview.mutate({
                            auditId: previewPayload.report.auditId,
                            script: audioScriptDraft,
                          })}
                        >
                          Save Script Edits
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={!previewPayload.report?.auditId || !audioScriptDraft.trim() || audioDraftTooLong || generateAudioBrief.isPending}
                          onClick={() => previewPayload.report?.auditId && generateAudioBrief.mutate({
                            auditId: previewPayload.report.auditId,
                            force: true,
                            voicePreset: audioVoicePreset,
                            audioMode,
                            scriptOverride: audioScriptDraft,
                          })}
                        >
                          {generateAudioBrief.isPending ? (
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          ) : null}
                          Regenerate Audio From Edited Script
                        </Button>
                      </div>
                      {audioScriptDirty ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Script edits are not reflected in the MP3 until you regenerate the audio.
                        </p>
                      ) : null}
                      {audioDraftTooLong ? (
                        <p className="mt-2 text-xs text-destructive">
                          Shorten the script before saving or regenerating. The audio script must stay at or under {MAX_AUDIO_WORDS} words.
                        </p>
                      ) : null}
                    </details>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                    No audio brief has been generated for this preview yet.
                  </div>
                )}
              </div>
            </div>
            )
          ) : (
            <div className="flex min-h-72 items-center justify-center rounded-2xl border bg-muted/20">
              <p className="text-sm text-muted-foreground">Generate a preview from a selected audit.</p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:space-x-0">
            {previewIsGuide ? (
              <>
                <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    const auditId = previewPayload?.report?.auditId ?? selectedAudit?.id;
                    if (!auditId) return;
                    ensureGuideDelivery.mutate({ auditId, force: true });
                  }}
                  disabled={
                    ensureGuideDelivery.isPending ||
                    !(previewPayload?.report?.auditId ?? selectedAudit?.id)
                  }
                >
                  {ensureGuideDelivery.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {ensureGuideDelivery.isPending
                    ? "Sending..."
                    : guideEmailWasSent
                      ? "Resend guide email"
                      : "Send guide email"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() =>
                    previewPayload?.report?.auditId &&
                    previewReport.mutate({ auditId: previewPayload.report.auditId, regenerate: true })}
                  disabled={!previewPayload?.report?.auditId || previewReport.isPending}
                >
                  {previewReport.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="mr-2 h-4 w-4" />
                  )}
                  {previewReport.isPending ? "Regenerating..." : "Regenerate PDF"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadPreview}
                  disabled={!previewPayload?.pdfBase64}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
                <Button
                  onClick={() =>
                    previewPayload?.report?.auditId &&
                    sendReport.mutate({
                      auditId: previewPayload.report.auditId,
                      includeAudio: true,
                    })}
                  disabled={
                    !previewPayload?.report?.auditId ||
                    !audioBrief?.audioUrl ||
                    audioApproved === false ||
                    sendReport.isPending
                  }
                >
                  {sendReport.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {sendReport.isPending ? "Sending..." : "Send PDF + Audio"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm audit deletion</AlertDialogTitle>
            <AlertDialogDescription>
              You are deleting this audit permanently:
              {" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.business_name || deleteTarget?.contact_name || deleteTarget?.lead_email_lower || deleteTarget?.lead_key}
              </span>
              .
              <br />
              <br />
              This cannot be undone. Please confirm to avoid accidental deletion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAudit.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteAudit.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteAudit}
            >
              {deleteAudit.isPending ? "Deleting..." : "Yes, delete audit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
