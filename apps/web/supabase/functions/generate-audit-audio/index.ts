import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod/mod.ts";
import { buildAuditAudioScript, type AudioMode } from "../_shared/auditAudioScriptBuilder.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { buildFreeAuditReport } from "../_shared/free-audit-report.ts";

const bodySchema = z.object({
  auditId: z.string().uuid(),
  force: z.boolean().default(false),
  voicePreset: z.enum(["signature", "storyteller", "grounded"]).default("signature"),
  audioMode: z.enum(["private_strategy_brief", "podcast_deep_dive", "executive_recap"]).default("podcast_deep_dive"),
  scriptOverride: z.string().max(12000).optional(),
});

const AUDIO_BUCKET = "free-audit-audio";
const AUDIO_SCRIPT_VERSION = "notebooklm-style-solo-audio-modes-v13-faster-pace";
const DEFAULT_ELEVENLABS_VOICE_WOMAN = "VlUmeC1Uzj3NnwiVR9K9";
const DEFAULT_ELEVENLABS_VOICE_MAN = "AIFDUhRnM6s61433WMNu";
const DEFAULT_ELEVENLABS_VOICE_FEMININE_IDS = [
  "VlUmeC1Uzj3NnwiVR9K9",
  "TJz0pp7opUc4JvMXMXob",
  "vzb1D7zjti0h5u8StSra",
];
const DEFAULT_ELEVENLABS_VOICE_MASCULINE_IDS = [
  "AIFDUhRnM6s61433WMNu",
  "bzC1wbZuXc4kn5vmuQgN",
];
const DEFAULT_ELEVENLABS_VOICE_IDS = [
  "VlUmeC1Uzj3NnwiVR9K9",
  "AIFDUhRnM6s61433WMNu",
  "TJz0pp7opUc4JvMXMXob",
  "bzC1wbZuXc4kn5vmuQgN",
  "vzb1D7zjti0h5u8StSra",
];
const AUDIO_WORDS_PER_MINUTE = 145;
const MAX_AUDIO_SECONDS = 210;
const MAX_AUDIO_WORDS = Math.floor((MAX_AUDIO_SECONDS / 60) * AUDIO_WORDS_PER_MINUTE);
type VoicePreset = "signature" | "storyteller" | "grounded";
type VoiceProfile = "feminine" | "masculine" | "neutral";

function jsonResponse(body: Record<string, unknown>, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
  }
  return btoa(binary);
}

function fileSafe(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 80) || "brand";
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

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function resolveElevenLabsPreset(voicePreset: VoicePreset): {
  key: VoicePreset;
  label: string;
  voicePool: string[];
} {
  const primaryWoman = Deno.env.get("ELEVENLABS_VOICE_WOMAN")?.trim() || DEFAULT_ELEVENLABS_VOICE_WOMAN;
  const primaryMan = Deno.env.get("ELEVENLABS_VOICE_MAN")?.trim() || DEFAULT_ELEVENLABS_VOICE_MAN;
  const alt1 = Deno.env.get("ELEVENLABS_VOICE_ALT_1")?.trim() || primaryWoman;
  const alt2 = Deno.env.get("ELEVENLABS_VOICE_ALT_2")?.trim() || primaryMan;
  const alt3 = Deno.env.get("ELEVENLABS_VOICE_ALT_3")?.trim() || primaryWoman;
  const voicePool = Array.from(new Set([
    primaryWoman,
    primaryMan,
    alt1,
    alt2,
    alt3,
    ...DEFAULT_ELEVENLABS_VOICE_IDS,
  ].filter(Boolean)));
  return {
    key: voicePreset,
    label: "Automatic Single Voice",
    voicePool,
  };
}

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function parseVoicePool(envName: string, fallback: string[]): string[] {
  const configured = Deno.env.get(envName)?.split(",").map((voice) => voice.trim()).filter(Boolean) ?? [];
  return Array.from(new Set((configured.length ? configured : fallback).filter(Boolean)));
}

function inferVoiceProfile(contactName: unknown, businessName: string): VoiceProfile {
  const firstName = String(contactName ?? "").trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  const context = `${String(contactName ?? "")} ${businessName}`.toLowerCase();
  const feminineNames = new Set([
    "aaliyah", "abigail", "alexandra", "alyssa", "amanda", "amber", "angela", "anna", "ashley", "brittany",
    "brianna", "candace", "cassandra", "chelsea", "christina", "courtney", "danielle", "destiny", "ebony",
    "erica", "gabrielle", "jasmine", "jessica", "karen", "kayla", "keisha", "kimberly", "latoya",
    "lauren", "madison", "mia", "michelle", "monica", "nikki", "rachel", "samantha", "sarah", "shannon",
    "shelby", "tiffany", "victoria", "whitney",
  ]);
  const masculineNames = new Set([
    "aaron", "adam", "andrew", "anthony", "brandon", "brian", "caleb", "cameron", "chris",
    "christopher", "daniel", "david", "derrick", "devin", "eric", "isaiah", "jacob", "james", "jason",
    "jeremy", "john", "joshua", "justin", "kevin", "marcus", "michael", "nicholas", "patrick",
    "robert", "ryan", "steven", "terrence", "thomas", "tyler", "william", "zachary",
  ]);
  if (/\b(ms|mrs|miss|madam|ma'am)\b/.test(context)) return "feminine";
  if (/\b(mr|sir)\b/.test(context)) return "masculine";
  if (/\b(woman|women|female|girl|girls|lady|ladies|queen|her|hers)\b/.test(context)) return "feminine";
  if (/\b(man|men|male|boy|boys|gentleman|gentlemen|king|his)\b/.test(context)) return "masculine";
  if (feminineNames.has(firstName)) return "feminine";
  if (masculineNames.has(firstName)) return "masculine";
  return "neutral";
}

function selectElevenLabsVoice(contactName: unknown, businessName: string, fallbackPool: string[]): string {
  const femininePool = parseVoicePool("ELEVENLABS_VOICE_FEMININE_POOL", DEFAULT_ELEVENLABS_VOICE_FEMININE_IDS);
  const masculinePool = parseVoicePool("ELEVENLABS_VOICE_MASCULINE_POOL", DEFAULT_ELEVENLABS_VOICE_MASCULINE_IDS);
  const neutralPool = parseVoicePool("ELEVENLABS_VOICE_NEUTRAL_POOL", fallbackPool);
  const profile = inferVoiceProfile(contactName, businessName);
  if (profile === "feminine" && femininePool.length) return randomItem(femininePool);
  if (profile === "masculine" && masculinePool.length) return randomItem(masculinePool);
  return randomItem(neutralPool.length ? neutralPool : fallbackPool);
}

async function ensureAudioBucket(supabase: ReturnType<typeof createClient>) {
  const { error } = await supabase.storage.createBucket(AUDIO_BUCKET, {
    public: true,
    fileSizeLimit: 25 * 1024 * 1024,
    allowedMimeTypes: ["audio/mpeg", "audio/mp3"],
  });
  if (error && !/already exists|duplicate/i.test(error.message)) {
    console.warn("Could not ensure audio bucket", error.message);
  }
}

function scriptStats(script: string): { wordCount: number; estimatedMinutes: number } {
  const wordCount = script.split(/\s+/).filter(Boolean).length;
  return {
    wordCount,
    estimatedMinutes: Number((wordCount / AUDIO_WORDS_PER_MINUTE).toFixed(1)),
  };
}

function stripSpeakerLabels(script: string): string {
  return script
    .replace(/(^|\n)\s*(co-?host|host)\s*:\s*/gi, "$1")
    .replace(/\bco-?host\s*:\s*host\s*:\s*/gi, "")
    .trim();
}

function segmentsFromScript(script: string, _audioMode: AudioMode): Array<{ speaker: "host_woman" | "host_man"; line: string }> {
  const cleanScript = stripSpeakerLabels(script);
  const blocks = cleanScript.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  if (!blocks.length) return [{ speaker: "host_woman", line: cleanScript.trim() }];
  return blocks.map((block) => ({ speaker: "host_woman", line: block }));
}

async function requestSpeech(script: string, voice: string, instructions: string) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_TTS_MODEL")?.trim() || "gpt-4o-mini-tts",
      voice,
      input: script,
      instructions,
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI TTS failed (${response.status}): ${await response.text()}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error ?? "Unknown error");
}

class TtsProviderError extends Error {
  provider: string;
  status: number;
  retryable: boolean;
  rawDetail: string;

  constructor(provider: string, status: number, message: string, rawDetail: string, retryable = false) {
    super(message);
    this.name = "TtsProviderError";
    this.provider = provider;
    this.status = status;
    this.retryable = retryable;
    this.rawDetail = rawDetail;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanTtsError(error: unknown): string {
  if (error instanceof TtsProviderError && error.provider === "ElevenLabs") {
    if (error.status === 429) {
      return "ElevenLabs is processing too many voice requests right now. Please wait a minute, then regenerate the audio brief.";
    }
    return "ElevenLabs voice generation failed. Please check the voice settings and try again.";
  }
  const message = errorMessage(error);
  if (/concurrent|rate.?limit|too many/i.test(message)) {
    return "The audio provider is processing too many requests right now. Please wait a minute, then regenerate the audio brief.";
  }
  return message;
}

async function requestSpeechWithElevenLabs(script: string, voiceId: string): Promise<Uint8Array> {
  const apiKey = Deno.env.get("ELEVENLABS_API_KEY")?.trim();
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not configured.");
  const modelId = Deno.env.get("ELEVENLABS_MODEL_ID")?.trim() || "eleven_flash_v2_5";
  const outputFormat = Deno.env.get("ELEVENLABS_OUTPUT_FORMAT")?.trim() || "mp3_44100_128";
  const stability = Number(Deno.env.get("ELEVENLABS_STABILITY") ?? "0.45");
  const similarityBoost = Number(Deno.env.get("ELEVENLABS_SIMILARITY_BOOST") ?? "0.75");
  const style = Number(Deno.env.get("ELEVENLABS_STYLE") ?? "0.2");
  const speed = Number(Deno.env.get("ELEVENLABS_SPEED") ?? "1.12");
  const useSpeakerBoost = String(Deno.env.get("ELEVENLABS_SPEAKER_BOOST") ?? "true") !== "false";

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${encodeURIComponent(outputFormat)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: script,
        model_id: modelId,
        voice_settings: {
          stability: Number.isFinite(stability) ? stability : 0.45,
          similarity_boost: Number.isFinite(similarityBoost) ? similarityBoost : 0.75,
          style: Number.isFinite(style) ? style : 0.2,
          speed: Number.isFinite(speed) ? speed : 1.12,
          use_speaker_boost: useSpeakerBoost,
        },
      }),
    },
  );
  if (!response.ok) {
    const rawDetail = await response.text();
    throw new TtsProviderError(
      "ElevenLabs",
      response.status,
      cleanTtsError(new TtsProviderError("ElevenLabs", response.status, "", rawDetail, response.status === 429)),
      rawDetail,
      response.status === 429 || response.status >= 500,
    );
  }
  return new Uint8Array(await response.arrayBuffer());
}

async function requestSpeechWithElevenLabsRetry(script: string, voiceId: string): Promise<Uint8Array> {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await requestSpeechWithElevenLabs(script, voiceId);
    } catch (error) {
      const retryable = error instanceof TtsProviderError && error.retryable;
      if (!retryable || attempt === maxAttempts) throw error;
      await sleep(1200 * attempt);
    }
  }
  throw new Error("ElevenLabs voice generation failed.");
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Server configuration incomplete" }, 500, corsHeaders);
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return jsonResponse({ error: "Invalid payload", details: parsed.error.flatten() }, 400, corsHeaders);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData.user) {
      return jsonResponse({ error: "Invalid session" }, 401, corsHeaders);
    }

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const allowed = (roleRows ?? []).some((row: { role: string }) =>
      ["admin", "author", "intern", "3pv"].includes(row.role),
    );
    if (!allowed) {
      return jsonResponse({ error: "Forbidden" }, 403, corsHeaders);
    }

    const { data: audit, error: auditError } = await supabase
      .from("free_audits")
      .select("*")
      .eq("id", parsed.data.auditId)
      .maybeSingle();
    if (auditError) throw auditError;
    if (!audit) return jsonResponse({ error: "Audit not found" }, 404, corsHeaders);

    const existingMetadata = asObject(audit.metadata);
    const existingAudio = asObject(existingMetadata.report_audio);
    const selectedVoicePreset = parsed.data.voicePreset;
    const selectedAudioMode = parsed.data.audioMode;
    const existingPreset = String(existingAudio.voice_preset ?? "signature");
    const existingAudioMode = String(existingAudio.audio_mode ?? "private_strategy_brief");
    if (
      !parsed.data.force &&
      existingAudio.script_version === AUDIO_SCRIPT_VERSION &&
      typeof existingAudio.url === "string" &&
      typeof existingAudio.script === "string" &&
      existingPreset === selectedVoicePreset &&
      existingAudioMode === selectedAudioMode
    ) {
      return jsonResponse({
        ok: true,
        reused: true,
        audioUrl: existingAudio.url,
        storagePath: existingAudio.storage_path,
        script: existingAudio.script,
        plainLanguageAudioBrief: existingAudio.plain_language_audio_brief,
        checks: existingAudio.audio_brief_checks,
        approvedForAudio: existingAudio.approved_for_audio,
        tone: existingAudio.tone,
        readingLevel: existingAudio.reading_level,
        voicePreset: existingAudio.voice_preset,
        voicePresetLabel: existingAudio.voice_preset_label,
        audioMode: existingAudio.audio_mode,
        ttsProviderUsed: existingAudio.provider ?? "unknown",
        voices: existingAudio.voices ?? null,
        generatedAt: existingAudio.generated_at,
        wordCount: existingAudio.word_count,
        estimatedMinutes: existingAudio.estimated_minutes,
      }, 200, corsHeaders);
    }

    const { data: aestheticSignal } = await supabase
      .from("audit_aesthetic_signals")
      .select("*")
      .eq("audit_id", audit.id)
      .maybeSingle();
    const { data: approvedFindings } = await supabase
      .from("audit_findings")
      .select("finding_category,finding_title,finding_summary,recommended_action,confidence_score,report_ready")
      .eq("audit_id", audit.id)
      .eq("report_ready", true)
      .order("confidence_score", { ascending: false })
      .limit(40);
    const report = buildFreeAuditReport(audit, aestheticSignal ?? null, approvedFindings ?? []);
    let audioScript = buildAuditAudioScript(report, selectedAudioMode);
    const scriptOverride = parsed.data.scriptOverride ? stripSpeakerLabels(parsed.data.scriptOverride) : undefined;
    if (scriptOverride) {
      const stats = scriptStats(scriptOverride);
      if (stats.wordCount > MAX_AUDIO_WORDS) {
        return jsonResponse({
          error: "Edited audio script is too long. Keep it at or under 3 minutes and 30 seconds before regenerating.",
          wordCount: stats.wordCount,
          maxWordCount: MAX_AUDIO_WORDS,
          estimatedMinutes: stats.estimatedMinutes,
          maxSeconds: MAX_AUDIO_SECONDS,
        }, 400, corsHeaders);
      }
      audioScript = {
        ...audioScript,
        script: scriptOverride,
        segments: segmentsFromScript(scriptOverride, selectedAudioMode),
        wordCount: stats.wordCount,
        estimatedMinutes: stats.estimatedMinutes,
      };
    }
    const ttsProvider = Deno.env.get("AUDIO_TTS_PROVIDER")?.trim().toLowerCase() ||
      (Deno.env.get("ELEVENLABS_API_KEY")?.trim() ? "elevenlabs" : "openai");
    const defaultVoice = Deno.env.get("OPENAI_TTS_VOICE")?.trim() || "nova";
    const preset = resolveElevenLabsPreset(selectedVoicePreset);
    const selectedElevenLabsVoice = selectElevenLabsVoice(audit.contact_name, report.businessName, preset.voicePool);
    const fallbackInstructions =
      "Sound like a private Jah Knows PR strategic voice note. Be warm, direct, plain-spoken, confident, and natural. Keep a steady, slightly upbeat pace. Do not drag. Use short pauses only where they help meaning. Do not sound robotic, corporate, academic, or like you are reading a PDF.";
    const allowOpenAiFallback = Deno.env.get("AUDIO_TTS_ALLOW_OPENAI_FALLBACK")?.trim() === "true";

    let audioBytes: Uint8Array;
    let providerUsed = ttsProvider;
    let voicesUsed: { narrator: string; host_woman: string; host_man: string } = {
      narrator: ttsProvider === "elevenlabs" ? selectedElevenLabsVoice : defaultVoice,
      host_woman: ttsProvider === "elevenlabs" ? selectedElevenLabsVoice : defaultVoice,
      host_man: ttsProvider === "elevenlabs" ? selectedElevenLabsVoice : defaultVoice,
    };
    if (ttsProvider === "elevenlabs") {
      try {
        audioBytes = await requestSpeechWithElevenLabsRetry(audioScript.script, selectedElevenLabsVoice);
      } catch (singleVoiceError) {
        if (!allowOpenAiFallback) {
          console.warn("elevenlabs audio generation failed", {
            singleVoiceError: errorMessage(singleVoiceError),
            selectedElevenLabsVoice,
          });
          throw new Error(cleanTtsError(singleVoiceError));
        }
        providerUsed = "openai_fallback";
        audioBytes = await requestSpeech(audioScript.script, defaultVoice, fallbackInstructions);
        voicesUsed = {
          narrator: defaultVoice,
          host_woman: defaultVoice,
          host_man: defaultVoice,
        };
      }
    } else {
      audioBytes = await requestSpeech(audioScript.script, defaultVoice, fallbackInstructions);
      voicesUsed = {
        narrator: defaultVoice,
        host_woman: defaultVoice,
        host_man: defaultVoice,
      };
    }

    await ensureAudioBucket(supabase);
    const filename = `${fileSafe(report.businessName)}-audio-strategy-brief.mp3`;
    const storagePath = `audio-briefs/${audit.id}/${Date.now()}-${filename}`;
    const { error: uploadError } = await supabase.storage
      .from(AUDIO_BUCKET)
      .upload(storagePath, audioBytes, {
        contentType: "audio/mpeg",
        upsert: true,
        cacheControl: "3600",
      });
    if (uploadError) throw uploadError;

    const { data: publicData } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(storagePath);
    const audioUrl = publicData.publicUrl;
    const generatedAt = new Date().toISOString();
    const reportAudio = {
      url: audioUrl,
      storage_bucket: AUDIO_BUCKET,
      storage_path: storagePath,
      filename,
      script: audioScript.script,
      title: audioScript.title,
      word_count: audioScript.wordCount,
      estimated_minutes: audioScript.estimatedMinutes,
      plain_language_audio_brief: audioScript.plain_language_audio_brief,
      audio_brief_checks: audioScript.checks,
      approved_for_audio: audioScript.checks.approved_for_audio,
      tone: audioScript.plain_language_audio_brief.tone,
      reading_level: audioScript.plain_language_audio_brief.reading_level,
      generated_at: generatedAt,
      generated_by: userData.user.id,
      provider: providerUsed,
      model: providerUsed === "elevenlabs"
        ? (Deno.env.get("ELEVENLABS_MODEL_ID")?.trim() || "eleven_flash_v2_5")
        : (Deno.env.get("OPENAI_TTS_MODEL")?.trim() || "gpt-4o-mini-tts"),
      tts_speed: Deno.env.get("ELEVENLABS_SPEED")?.trim() || "1.12",
      voice: providerUsed === "elevenlabs" ? selectedElevenLabsVoice : defaultVoice,
      voices: voicesUsed,
      audio_mode: audioScript.mode,
      public_slug: publicAuditSlug(report.businessName),
      voice_preset: preset.key,
      voice_preset_label: preset.label,
      disclosure: "AI-generated and personalized from audit data.",
      script_version: AUDIO_SCRIPT_VERSION,
    };

    const { error: updateError } = await supabase
      .from("free_audits")
      .update({
        metadata: {
          ...existingMetadata,
          report_audio: reportAudio,
        },
      })
      .eq("id", audit.id);
    if (updateError) throw updateError;

    return jsonResponse({
      ok: true,
      reused: false,
      audioUrl,
      storageBucket: AUDIO_BUCKET,
      storagePath,
      filename,
      script: audioScript.script,
      plainLanguageAudioBrief: audioScript.plain_language_audio_brief,
      checks: audioScript.checks,
      approvedForAudio: audioScript.checks.approved_for_audio,
      tone: audioScript.plain_language_audio_brief.tone,
      readingLevel: audioScript.plain_language_audio_brief.reading_level,
      voicePreset: preset.key,
      voicePresetLabel: preset.label,
      audioMode: audioScript.mode,
      ttsProviderUsed: providerUsed,
      voices: voicesUsed,
      generatedAt,
      wordCount: audioScript.wordCount,
      estimatedMinutes: audioScript.estimatedMinutes,
      audioBase64: bytesToBase64(audioBytes),
      report,
    }, 200, corsHeaders);
  } catch (error) {
    console.error("generate-audit-audio error", error);
    return jsonResponse({ error: cleanTtsError(error) }, 500, corsHeaders);
  }
});
