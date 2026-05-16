import type { FreeAuditReport } from "./free-audit-report.ts";
import type { AuditScriptStylePreset } from "./auditScriptStylePresets.ts";

type PlainLanguageBrief = {
  client_name: string;
  brand_name: string;
  business_type: string;
  tone: string;
  reading_level: string;
  intro: string;
  big_picture: string;
  score_read: string;
  category_breakdowns: Array<{
    category: string;
    plain_language_definition: string;
    finding: string;
    why_it_matters: string;
    recommended_move: string;
  }>;
  hidden_cost: string;
  first_move: string;
  recommended_next_steps: string[];
  closing_summary: string;
};

export type ScriptValidationResult = {
  ok: boolean;
  feedback?: string;
};

type RefineOptions = {
  templateScript: string;
  report: FreeAuditReport;
  plainLanguageBrief: PlainLanguageBrief;
  recommendedNextSteps: string[];
  stylePreset: AuditScriptStylePreset;
  maxWords: number;
  contactFirstName: string;
  validator?: (script: string) => ScriptValidationResult;
};

type RefineResult = {
  script: string;
  model: string | null;
  provider: "openai" | "template";
  usedRetry: boolean;
};

function clean(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function stripSpeakerLabels(script: string): string {
  return script
    .replace(/(^|\n)\s*(co-?host|host|narrator)\s*:\s*/gi, "$1")
    .replace(/\bco-?host\s*:\s*host\s*:\s*/gi, "")
    .trim();
}

function truncateToWords(script: string, maxWords: number): string {
  const words = stripSpeakerLabels(script).split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ").replace(/[,.!?;:]+$/, "")}.`;
}

function compactReport(report: FreeAuditReport): Record<string, unknown> {
  return {
    audit_id: report.auditId,
    business_name: report.businessName,
    contact_name: report.contactName,
    executive_summary: report.executiveSummary,
    scores: report.scores.map((score) => ({ label: score.label, value: score.value, summary: score.summary })),
    sections: report.sections.map((section) => ({
      label: section.label,
      title: section.title,
      diagnosis: section.diagnosis,
      why_it_matters: section.whyItMatters,
      next_move: section.nextMove,
      cta: section.cta,
    })),
    warnings: report.warnings,
    evidence: {
      growth_goal: report.evidence.growthGoal,
      current_blocker: report.evidence.currentBlocker,
      target_audience: report.evidence.targetAudience,
      industry: report.evidence.industry,
      social_highlights: report.evidence.socialHighlights.slice(0, 8),
    },
  };
}

function safeJsonParse(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function buildSystemPrompt(input: {
  stylePreset: AuditScriptStylePreset;
  maxWords: number;
  recommendedNextSteps: string[];
  contactFirstName: string;
  correctiveFeedback?: string;
}): string {
  const firstName = clean(input.contactFirstName);
  const noNameRule = firstName
    ? `The script must NOT start with "${firstName}" or greet "${firstName}" in the opening sentence.`
    : "The script must not open by greeting the contact by first name.";
  const corrective = input.correctiveFeedback
    ? `Correction from previous attempt: ${clean(input.correctiveFeedback)}`
    : "";
  return [
    "You are a senior podcast script writer for strategic brand audio briefings.",
    "Write one plain narrator script, not dialogue, not bullets, and no markdown.",
    "Use rhetorical excellence inspired by timeless speaking craft (cadence, contrast, callbacks, and momentum), without impersonating or naming public figures.",
    `Style preset: ${input.stylePreset.label}. ${input.stylePreset.instructions}`,
    noNameRule,
    `Keep script at or under ${input.maxWords} words.`,
    "Do not invent facts, links, metrics, quotes, or claims not present in the provided data.",
    "Use exactly one primary call-to-action from the allowed CTA list, stated verbatim.",
    "For non-JahKnowsPR contexts, do not use the phrase \"Book a Strategy Session\".",
    "Keep language warm, direct, culturally aware, and easy to understand out loud.",
    `Allowed CTA list: ${input.recommendedNextSteps.join(" | ")}`,
    corrective,
    "Return strict JSON with one key: script",
  ].filter(Boolean).join("\n");
}

function buildUserPrompt(input: {
  templateScript: string;
  report: FreeAuditReport;
  plainLanguageBrief: PlainLanguageBrief;
}): string {
  return [
    "Ground-truth data (JSON):",
    JSON.stringify({
      report: compactReport(input.report),
      plain_language_brief: input.plainLanguageBrief,
    }),
    "",
    "Template script to preserve facts from:",
    input.templateScript,
    "",
    "Task:",
    "- Rewrite for stronger spoken delivery while preserving factual meaning.",
    "- Keep the script as one coherent narrator read.",
    "- Keep the same strategic direction and CTA intent.",
  ].join("\n");
}

export async function refineAuditScriptWithOpenAi(options: RefineOptions): Promise<RefineResult> {
  const apiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
  const model = Deno.env.get("AUDIT_SCRIPT_LLM_MODEL")?.trim() || "gpt-4o-mini";
  if (!apiKey) {
    return {
      script: options.templateScript,
      model: null,
      provider: "template",
      usedRetry: false,
    };
  }

  let feedback = "";
  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const systemPrompt = buildSystemPrompt({
        stylePreset: options.stylePreset,
        maxWords: options.maxWords,
        recommendedNextSteps: options.recommendedNextSteps,
        contactFirstName: options.contactFirstName,
        correctiveFeedback: feedback,
      });
      const userPrompt = buildUserPrompt({
        templateScript: options.templateScript,
        report: options.report,
        plainLanguageBrief: options.plainLanguageBrief,
      });

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.45,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });
      if (!response.ok) {
        throw new Error(`OpenAI script refiner failed (${response.status})`);
      }

      const payload = await response.json() as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const raw = payload.choices?.[0]?.message?.content ?? "";
      const parsed = safeJsonParse(raw);
      const generated = truncateToWords(clean(parsed?.script), options.maxWords);
      if (!generated) {
        throw new Error("OpenAI script refiner returned empty output.");
      }

      if (options.validator) {
        const result = options.validator(generated);
        if (!result.ok && attempt < maxAttempts) {
          feedback = result.feedback || "The previous attempt failed policy checks.";
          continue;
        }
        if (!result.ok) {
          return {
            script: options.templateScript,
            model,
            provider: "template",
            usedRetry: attempt > 1,
          };
        }
      }

      return {
        script: generated,
        model,
        provider: "openai",
        usedRetry: attempt > 1,
      };
    } catch (error) {
      if (attempt === maxAttempts) {
        console.warn("openai script refiner fallback", String(error));
        return {
          script: options.templateScript,
          model,
          provider: "template",
          usedRetry: true,
        };
      }
      feedback = `Previous attempt failed with error: ${String(error)}`;
    }
  }

  return {
    script: options.templateScript,
    model,
    provider: "template",
    usedRetry: true,
  };
}
