/** Parse plain text from a K.O.R.A list item / block for `content_plan_items` insert and UI cards. */

const FIELD_RE =
  /^\*{0,2}(Content idea|Hook|Format|Platform|Pillar|Angle)\*{0,2}\s*:\s*(.*)$/i;

export type KoraIdeaFields = {
  contentIdea: string;
  hook: string | null;
  format: string | null;
  platform: string | null;
  pillar: string | null;
  angle: string | null;
};

function stripInlineBold(s: string): string {
  return s.replace(/\*\*/g, "").trim();
}

/**
 * Extract labeled fields plus a best-effort content idea (title line or explicit Content idea:).
 */
export function parseKoraIdeaFields(raw: string): KoraIdeaFields {
  const cleaned = raw.replace(/\r\n/g, "\n").trim();
  if (!cleaned) {
    return {
      contentIdea: "",
      hook: null,
      format: null,
      platform: null,
      pillar: null,
      angle: null,
    };
  }

  const lines = cleaned.split("\n");
  let hook: string | null = null;
  let format: string | null = null;
  let platform: string | null = null;
  let pillar: string | null = null;
  let angle: string | null = null;
  let contentIdeaExplicit: string | null = null;

  let firstFieldIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i]?.trim() ?? "";
    if (!t) continue;
    const m = t.match(FIELD_RE);
    if (m) {
      firstFieldIndex = firstFieldIndex === -1 ? i : firstFieldIndex;
      const key = m[1].toLowerCase();
      const val = stripInlineBold(m[2] ?? "");
      if (key === "content idea") contentIdeaExplicit = val || null;
      else if (key === "hook") hook = val || null;
      else if (key === "format") format = val || null;
      else if (key === "platform") platform = val || null;
      else if (key === "pillar") pillar = val || null;
      else if (key === "angle") angle = val || null;
    }
  }

  let contentIdea = contentIdeaExplicit ?? "";
  if (!contentIdea && firstFieldIndex > 0) {
    const leading = lines
      .slice(0, firstFieldIndex)
      .map((l) => l.trim())
      .filter(Boolean)
      .join("\n")
      .trim();
    const heading = leading.match(/^#{1,4}\s+(.+)$/m);
    if (heading) {
      contentIdea = stripInlineBold(heading[1] ?? "");
    } else {
      contentIdea = stripInlineBold(
        leading
          .split("\n")
          .map((l) => l.replace(/^(\d+[.)]\s*|[-*•]\s*)/, "").trim())
          .filter(Boolean)
          .join(" "),
      );
    }
  }

  if (!contentIdea) {
    const hm = cleaned.match(/^#{1,4}\s+(.+)$/m);
    if (hm) contentIdea = stripInlineBold(hm[1] ?? "");
  }

  if (!contentIdea) {
    for (const line of lines) {
      const t = line.trim();
      if (!t || FIELD_RE.test(t)) continue;
      contentIdea = stripInlineBold(t.replace(/^(\d+[.)]\s*|[-*•]\s*)/, ""));
      break;
    }
  }

  return {
    contentIdea,
    hook,
    format,
    platform,
    pillar,
    angle,
  };
}

/** True only when all six Ideas-table fields are present (add-to-table / card layout). */
export function isCompleteTableIdeaBlock(body: string): boolean {
  const f = parseKoraIdeaFields(body);
  return [f.pillar, f.contentIdea, f.hook, f.format, f.platform, f.angle].every(
    (v) => v != null && String(v).trim().length > 0,
  );
}

export function parseKoraIdeaText(raw: string) {
  const cleaned = raw.replace(/\r\n/g, "\n").trim();
  const f = parseKoraIdeaFields(raw);

  let title = f.contentIdea || "Content idea";
  title = title.replace(/^(\d+[.)]\s*|[-*•]\s*)/, "").trim();
  if (title.length > 200) title = `${title.slice(0, 197)}…`;

  return {
    title,
    hook: f.hook,
    format: f.format,
    platform: f.platform,
    pillar: f.pillar,
    angle: f.angle,
    notes: cleaned,
  };
}
