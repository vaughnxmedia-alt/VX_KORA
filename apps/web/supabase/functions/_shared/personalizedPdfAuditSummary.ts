import type { FreeAuditReport } from "./free-audit-report.ts";

type SectionRewrite = {
  id: string;
  diagnosis: string;
  why_it_matters: string;
  next_move: string;
  cta: string;
};

type RewritePayload = {
  executive_summary?: string;
  sections?: SectionRewrite[];
};

function clean(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function safeParseJson(raw: string): RewritePayload | null {
  try {
    const parsed = JSON.parse(raw) as RewritePayload;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function compactResearch(audit: Record<string, unknown>, approvedFindings: Record<string, unknown>[]): Record<string, unknown> {
  const metadata = asObject(audit.metadata);
  const socialResearch = asObject(metadata.social_research);
  const strategicProfile = asObject(socialResearch.strategic_profile);
  return {
    intake: {
      business_name: audit.business_name,
      contact_name: audit.contact_name,
      growth_goal: audit.growth_goal,
      current_blocker: audit.current_blocker,
      target_audience_belief: audit.target_audience_belief,
      website_link: audit.website_link,
      instagram: audit.instagram,
      facebook: audit.facebook,
      tiktok: audit.tiktok,
      other_socials: audit.other_socials,
      intent: audit.intent,
      readiness_level: audit.readiness_level,
      audit_angle: audit.audit_angle,
    },
    strategic_profile: strategicProfile,
    approved_findings: approvedFindings.map((row) => ({
      finding_category: row.finding_category,
      finding_title: row.finding_title,
      finding_summary: row.finding_summary,
      recommended_action: row.recommended_action,
      confidence_score: row.confidence_score,
    })),
  };
}

function basePrompt(report: FreeAuditReport): string {
  return [
    "Rewrite this brand diagnosis so it sounds genuinely personalized to the specific client while staying factual.",
    "Return strict JSON only with keys: executive_summary, sections.",
    "sections must be an array of objects with keys: id, diagnosis, why_it_matters, next_move, cta.",
    "Use section ids exactly as provided: positioning, audience, authority, messaging, conversion.",
    "Do not invent metrics, claims, clients, or channels that are not in source JSON.",
    "Write with strategic personality and varied sentence rhythm; avoid copy-paste generic phrasing.",
    "Conversion rule: for podcast/media/community contexts, do not use 'Request a Proposal' as the primary conversion CTA.",
    "Keep each field concise and usable in a client-facing PDF.",
    `Current report JSON: ${JSON.stringify(report)}`,
  ].join("\n");
}

function applyRewrite(report: FreeAuditReport, rewrite: RewritePayload | null): FreeAuditReport {
  if (!rewrite) return report;
  const sectionById = new Map((rewrite.sections ?? []).map((section) => [clean(section.id), section]));
  const sections = report.sections.map((section) => {
    if (section.id === "conversion") {
      // Keep conversion path copy deterministic and aligned with canonical CTA values.
      return section;
    }
    const next = sectionById.get(section.id);
    if (!next) return section;
    return {
      ...section,
      diagnosis: clean(next.diagnosis) || section.diagnosis,
      whyItMatters: clean(next.why_it_matters) || section.whyItMatters,
      nextMove: clean(next.next_move) || section.nextMove,
      cta: clean(next.cta) || section.cta,
    };
  });
  return {
    ...report,
    executiveSummary: clean(rewrite.executive_summary) || report.executiveSummary,
    sections,
  };
}

async function rewriteWithOpenAi(report: FreeAuditReport, prompt: string): Promise<RewritePayload | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
  if (!apiKey) return null;
  const model = Deno.env.get("AUDIT_PDF_OPENAI_MODEL")?.trim() || "gpt-4o-mini";
  try {
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
          {
            role: "system",
            content:
              "You are a senior conversion strategist writing personalized audit copy. Be specific, factual, and useful.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });
    if (!response.ok) return null;
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content ?? "";
    return safeParseJson(content);
  } catch {
    return null;
  }
}

async function rewriteWithGemini(prompt: string): Promise<RewritePayload | null> {
  const apiKey = Deno.env.get("GEMINI_API_KEY")?.trim();
  if (!apiKey) return null;
  const model = Deno.env.get("AUDIT_PDF_GEMINI_MODEL")?.trim() || "gemini-1.5-flash";
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.35,
          },
        }),
      },
    );
    if (!response.ok) return null;
    const payload = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return safeParseJson(text);
  } catch {
    return null;
  }
}

export async function personalizePdfAuditReport(input: {
  report: FreeAuditReport;
  audit: Record<string, unknown>;
  approvedFindings: Record<string, unknown>[];
}): Promise<FreeAuditReport> {
  const research = compactResearch(input.audit, input.approvedFindings);
  const prompt = [
    basePrompt(input.report),
    `Research JSON: ${JSON.stringify(research)}`,
  ].join("\n\n");

  const openAiRewrite = await rewriteWithOpenAi(input.report, prompt);
  const openAiReport = applyRewrite(input.report, openAiRewrite);
  const geminiPrompt = [
    "Take the rewritten report draft and improve strategic clarity while preserving factual integrity.",
    "Return strict JSON with keys: executive_summary, sections (id, diagnosis, why_it_matters, next_move, cta).",
    "Do not remove section ids. Do not invent claims.",
    `Draft report JSON: ${JSON.stringify(openAiReport)}`,
    `Source research JSON: ${JSON.stringify(research)}`,
  ].join("\n\n");
  const geminiRewrite = await rewriteWithGemini(geminiPrompt);
  return applyRewrite(openAiReport, geminiRewrite);
}
