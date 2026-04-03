import { isCompleteTableIdeaBlock } from "./parseKoraIdea";

const NUMBERED_LINE = /^\s*\d+[.)]\s+/;

/** Line starts with Hook: (optional markdown bold). */
export function isHookStartLine(line: string): boolean {
  const t = line.trim();
  return /^\*{0,2}hook\*{0,2}\s*:/i.test(t);
}

export function firstNonEmptyLine(body: string): string {
  for (const line of body.split("\n")) {
    const t = line.trim();
    if (t) return t;
  }
  return "";
}

function hasHookLine(body: string): boolean {
  return /(^|\n)\s*\*{0,2}hook\*{0,2}\s*:/i.test(body);
}

function hasFormatLine(body: string): boolean {
  return /(^|\n)\s*\*{0,2}format\*{0,2}\s*:/i.test(body);
}

function hasPlatformLine(body: string): boolean {
  return /(^|\n)\s*\*{0,2}platform\*{0,2}\s*:/i.test(body);
}

function hasPillarLine(body: string): boolean {
  return /(^|\n)\s*\*{0,2}pillar\*{0,2}\s*:/i.test(body);
}

function hasContentIdeaLine(body: string): boolean {
  return /(^|\n)\s*\*{0,2}content idea\*{0,2}\s*:/i.test(body);
}

function hasAngleLine(body: string): boolean {
  return /(^|\n)\s*\*{0,2}angle\*{0,2}\s*:/i.test(body);
}

/**
 * True when this chunk is a real idea (structured card + Add to table), not a numbered intro paragraph.
 * Numbered lines alone are NOT enough — need Hook and/or table-ready labels.
 */
export function ideaBlockShowAdd(body: string): boolean {
  const first = firstNonEmptyLine(body);
  const hook = hasHookLine(body);
  const fmt = hasFormatLine(body);
  const plat = hasPlatformLine(body);
  const pillar = hasPillarLine(body);
  const contentIdea = hasContentIdeaLine(body);
  const angle = hasAngleLine(body);
  const anyStrategic = pillar || contentIdea || angle;

  if (isHookStartLine(first)) return true;
  if (hook && (fmt || plat)) return true;
  if (hook && anyStrategic) return true;
  if (/^#{1,4}\s+\S/.test(first) && hook) return true;
  if (/^\s*\*\*/.test(first) && hook) return true;
  if (NUMBERED_LINE.test(first) && hook) return true;
  if (NUMBERED_LINE.test(first) && fmt && plat) return true;
  return false;
}

function looksLikeTitleOnly(body: string): boolean {
  const trimmed = body.trim();
  if (!trimmed) return false;
  if (isHookStartLine(firstNonEmptyLine(trimmed))) return false;
  const lines = trimmed
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return false;
  if (lines.length > 2) return false;
  const first = lines[0];
  if (/^#{1,4}\s+\S/.test(first)) return true;
  if (/^\*\*.+\*\*$/.test(first)) return true;
  if (lines.length === 1 && first.length <= 280 && !NUMBERED_LINE.test(first)) return true;
  return false;
}

/** Split when a new markdown heading starts a section (common K.O.R.A pattern). */
function splitOnMarkdownIdeaHeadings(segment: string): string[] {
  const lines = segment.split("\n");
  const out: string[] = [];
  let buf: string[] = [];
  const isHeading = (line: string) => /^\s{0,3}#{1,4}\s+\S/.test(line);

  for (const line of lines) {
    if (isHeading(line) && buf.length > 0) {
      const joined = buf.join("\n").trimEnd();
      if (joined) out.push(joined);
      buf = [line];
    } else {
      buf.push(line);
    }
  }
  if (buf.length) {
    const joined = buf.join("\n").trimEnd();
    if (joined) out.push(joined);
  }
  return out.length >= 2 ? out : [segment];
}

/** Split when a line is only `**Title**` (paired title cards from K.O.R.A). */
function splitOnBoldTitleLines(segment: string): string[] {
  const lines = segment.split("\n");
  const out: string[] = [];
  let buf: string[] = [];
  const isBoldTitle = (l: string) => /^\s*\*\*[^*]+\*\*\s*$/.test(l);

  for (const line of lines) {
    if (isBoldTitle(line) && buf.length > 0) {
      const joined = buf.join("\n").trimEnd();
      if (joined) out.push(joined);
      buf = [line];
    } else {
      buf.push(line);
    }
  }
  if (buf.length) {
    const joined = buf.join("\n").trimEnd();
    if (joined) out.push(joined);
  }
  return out.length >= 2 ? out : [segment];
}

/**
 * When the model stacks several Hook:/Format: ideas without numbers, split into one block per *additional*
 * Hook line after the first Hook in a segment. Must NOT split a title/preamble from its first Hook.
 */
function expandSegmentsWithMultipleHooks(segment: string): string[] {
  const lines = segment.split("\n");
  const out: string[] = [];
  let buf: string[] = [];
  let bufHasHook = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const isHook = isHookStartLine(line);
    if (isHook && buf.length > 0 && bufHasHook) {
      const joined = buf.join("\n").trimEnd();
      if (joined) out.push(joined);
      buf = [line];
      bufHasHook = true;
    } else {
      buf.push(line);
      if (isHook) bufHasHook = true;
    }
  }
  if (buf.length) {
    const joined = buf.join("\n").trimEnd();
    if (joined) out.push(joined);
  }
  return out.length >= 2 ? out : [segment];
}

/** Merge a title-only card with the following Hook:/Format: card (paired layout). */
function mergeTitleHookPairs(bodies: string[]): string[] {
  const merged: string[] = [];
  let i = 0;
  while (i < bodies.length) {
    const cur = bodies[i];
    const nxt = bodies[i + 1];
    if (nxt && looksLikeTitleOnly(cur) && isHookStartLine(firstNonEmptyLine(nxt))) {
      merged.push(`${cur.trim()}\n\n${nxt.trim()}`);
      i += 2;
    } else {
      merged.push(cur);
      i += 1;
    }
  }
  return merged;
}

function blockHasLineStartHook(body: string): boolean {
  return /(^|\n)\s*\*{0,2}hook\*{0,2}\s*:/i.test(body);
}

/** Short preamble with no Hook (e.g. plain title line split from the next block). */
function isProbablyOrphanTitlePreamble(body: string): boolean {
  const t = body.trim();
  if (!t || blockHasLineStartHook(t)) return false;
  if (t.length > 240) return false;
  if (/\b(here are|below you|following ideas?|i['’]?ve (put|listed)|a few ideas|some ideas)\b/i.test(t)) {
    return false;
  }
  const lines = t
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.length <= 4;
}

/** Merge a title-only chunk that lost its Hook to the following Hook-bearing block. */
function mergeOrphanTitleBeforeHookIdea(bodies: string[]): string[] {
  const merged: string[] = [];
  let i = 0;
  while (i < bodies.length) {
    const cur = bodies[i];
    const nxt = bodies[i + 1];
    if (
      nxt &&
      isProbablyOrphanTitlePreamble(cur) &&
      blockHasLineStartHook(nxt) &&
      ideaBlockShowAdd(nxt)
    ) {
      merged.push(`${cur.trim()}\n\n${nxt.trim()}`);
      i += 2;
    } else {
      merged.push(cur);
      i += 1;
    }
  }
  return merged;
}

const MAX_IDEAS_PER_REPLY = 5;

/**
 * Split assistant markdown into idea cards: numbered lines, headings, multiple Hooks,
 * then merge title + following Hook blocks.
 */
export function splitNumberedIdeaBlocks(md: string): { body: string; showAdd: boolean }[] {
  const text = md.replace(/\r\n/g, "\n").trimEnd();
  if (!text) return [];

  const lines = text.split("\n");
  const segments: string[] = [];
  let buf: string[] = [];

  const flush = () => {
    const joined = buf.join("\n").trimEnd();
    if (joined) segments.push(joined);
    buf = [];
  };

  for (const line of lines) {
    if (NUMBERED_LINE.test(line) && buf.length > 0) {
      const first = buf[0] ?? "";
      if (NUMBERED_LINE.test(first)) {
        flush();
        buf.push(line);
      } else {
        flush();
        buf.push(line);
      }
    } else {
      buf.push(line);
    }
  }
  flush();

  if (segments.length === 0) return [];

  const flattened = segments
    .flatMap((s) => splitOnMarkdownIdeaHeadings(s))
    .flatMap((s) => splitOnBoldTitleLines(s))
    .flatMap((s) => expandSegmentsWithMultipleHooks(s));

  const mergedBodies = mergeOrphanTitleBeforeHookIdea(mergeTitleHookPairs(flattened));

  const cappedBodies: string[] = [];
  let ideaCount = 0;
  for (const body of mergedBodies) {
    if (ideaBlockShowAdd(body)) {
      if (ideaCount >= MAX_IDEAS_PER_REPLY) continue;
      ideaCount += 1;
    }
    cappedBodies.push(body);
  }

  return cappedBodies.map((body) => ({
    body,
    /** True only for a full six-field idea row (Ideas table / Add to table). */
    showAdd: isCompleteTableIdeaBlock(body),
  }));
}

/** Whether to use split layout (prose preambles + idea cards) instead of a single markdown column. */
export function shouldUseIdeaCardLayout(content: string, blocks: { body: string; showAdd: boolean }[]): boolean {
  if (blocks.some((b) => b.showAdd)) return true;
  if (blocks.length > 1) return true;
  if (content.length > 200 && /(^|\n)\s*\*{0,2}hook\*{0,2}\s*:/i.test(content)) return true;
  return false;
}
