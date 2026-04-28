import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type SupabaseClientLike = ReturnType<typeof createClient>;

export type PriorityAngle = {
  angle: string;
  weight: number;
};

export type MemoryProjection = {
  priority_angles: PriorityAngle[];
  avoid_patterns: string[];
  prompt_modifiers: string[];
  hard_constraints: string[];
  projection_version: string;
  strategy_id?: string | null;
  proposal_id?: string | null;
  messaging_angle?: string;
  hook?: string;
};

const EMPTY_PROJECTION: MemoryProjection = {
  priority_angles: [],
  avoid_patterns: [],
  prompt_modifiers: [],
  hard_constraints: [],
  projection_version: "lls-projection-v1:empty",
  strategy_id: null,
  proposal_id: null,
  messaging_angle: "unclassified",
  hook: "unclassified",
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function numberFrom(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nestedNumber(value: Record<string, unknown>, keys: string[], fallback: number): number {
  for (const key of keys) {
    const current = value[key];
    if (typeof current === "number" && Number.isFinite(current)) return current;
  }
  const metrics = value.supporting_metrics;
  if (metrics && typeof metrics === "object") {
    for (const key of keys) {
      const current = (metrics as Record<string, unknown>)[key];
      if (typeof current === "number" && Number.isFinite(current)) return current;
    }
  }
  return fallback;
}

function normalizeAngles(value: unknown, freshnessScore: number, successRate: number): PriorityAngle[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === "string" && item.trim()) {
      return [{ angle: item.trim(), weight: Number((0.5 * freshnessScore * successRate).toFixed(4)) }];
    }
    if (!item || typeof item !== "object") return [];
    const angle = (item as Record<string, unknown>).angle;
    const weight = (item as Record<string, unknown>).weight;
    if (typeof angle !== "string" || !angle.trim()) return [];
    const baseWeight = typeof weight === "number" ? clamp01(weight) : 0.5;
    return [{ angle: angle.trim(), weight: Number((baseWeight * freshnessScore * successRate).toFixed(4)) }];
  });
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export async function loadMemoryProjection(
  supabase: SupabaseClientLike,
  tenantId: string | null | undefined,
  options: { freshnessThreshold?: number } = {},
): Promise<MemoryProjection> {
  if (!tenantId) return EMPTY_PROJECTION;
  const freshnessThreshold = options.freshnessThreshold ?? 0.35;
  const confidenceThreshold = 0.55;
  const { data, error } = await supabase
    .from("lls_strategy_memory")
    .select("id,source_proposal_id,key,value,summary,freshness_score,decay_status,insight_status,learning_mode")
    .eq("tenant_id", tenantId)
    .eq("is_current", true)
    .eq("learning_mode", "validated_learning")
    .eq("insight_status", "active")
    .neq("decay_status", "expired")
    .gte("freshness_score", freshnessThreshold)
    .order("freshness_score", { ascending: false })
    .limit(25);

  if (error) {
    console.error("[LLS] memory projection load failed", error);
    return EMPTY_PROJECTION;
  }

  const priorityAngles: PriorityAngle[] = [];
  const avoidPatterns: string[] = [];
  const promptModifiers: string[] = [];
  const hardConstraints: string[] = [];
  let strategyId: string | null = null;
  let proposalId: string | null = null;
  let messagingAngle = "unclassified";
  let hook = "unclassified";

  for (const row of data ?? []) {
    const value = (row.value ?? {}) as Record<string, unknown>;
    const freshnessScore = clamp01(Number(row.freshness_score ?? 1));
    const finalConfidence = nestedNumber(value, ["final_confidence", "average_final_confidence"], 1);
    const successRate = clamp01(nestedNumber(value, ["success_rate"], 1));
    const rowAngle = typeof value.angle === "string"
      ? value.angle
      : typeof value.messaging_angle === "string"
        ? value.messaging_angle
        : typeof value.affected_layer === "string"
          ? value.affected_layer
          : row.key;

    if (successRate < 0.5 || finalConfidence < confidenceThreshold) {
      avoidPatterns.push(rowAngle);
      continue;
    }

    if (!strategyId) strategyId = row.id as string;
    if (!proposalId) proposalId = (row.source_proposal_id as string | null) ?? null;
    if (messagingAngle === "unclassified") messagingAngle = String(rowAngle || "unclassified");
    if (hook === "unclassified") hook = typeof value.hook === "string" ? value.hook : String(row.key || "unclassified");

    priorityAngles.push(...normalizeAngles(value.priority_angles, freshnessScore, successRate));
    if (typeof value.angle === "string") {
      priorityAngles.push({
        angle: value.angle,
        weight: Number((0.5 * freshnessScore * successRate).toFixed(4)),
      });
    }
    avoidPatterns.push(...asStringArray(value.avoid_patterns));
    promptModifiers.push(...asStringArray(value.prompt_modifiers));
    hardConstraints.push(...asStringArray(value.hard_constraints));
    if (typeof row.summary === "string" && row.summary.trim()) {
      promptModifiers.push(`Apply learned strategy: ${row.summary.trim()}`);
    }
  }

  const topAngles = priorityAngles
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10);

  return {
    priority_angles: topAngles,
    avoid_patterns: uniqueStrings(avoidPatterns).slice(0, 15),
    prompt_modifiers: uniqueStrings(promptModifiers).slice(0, 15),
    hard_constraints: uniqueStrings(hardConstraints).slice(0, 15),
    projection_version: `lls-projection-v1:${tenantId}:${strategyId ?? "none"}:${topAngles.map((item) => `${item.angle}:${item.weight}`).join("|")}`,
    strategy_id: strategyId,
    proposal_id: proposalId,
    messaging_angle: topAngles[0]?.angle ?? messagingAngle,
    hook,
  };
}

export function buildMemoryProjectionPrompt(projection: MemoryProjection): string {
  if (
    projection.priority_angles.length === 0 &&
    projection.avoid_patterns.length === 0 &&
    projection.prompt_modifiers.length === 0 &&
    projection.hard_constraints.length === 0
  ) {
    return "";
  }

  return [
    "\n\n## Active LLS Strategy Memory (Behavior Controls)",
    `Projection version: ${projection.projection_version}`,
    "These controls come from approved LLS strategy memory. Apply them as behavior rules, not optional suggestions.",
    projection.priority_angles.length
      ? `Priority angles with weights: ${projection.priority_angles
        .map((item) => `${item.angle} (${item.weight})`)
        .join(", ")}`
      : "",
    projection.avoid_patterns.length ? `Down-rank or avoid patterns: ${projection.avoid_patterns.join("; ")}` : "",
    projection.prompt_modifiers.length ? `Prompt modifiers: ${projection.prompt_modifiers.join("; ")}` : "",
    projection.hard_constraints.length
      ? `Hard constraints that must override generation: ${projection.hard_constraints.join("; ")}`
      : "",
  ].filter(Boolean).join("\n");
}

export function findHardConstraintViolation(text: string, projection: MemoryProjection): string | null {
  const lowerText = text.toLowerCase();
  for (const pattern of projection.avoid_patterns) {
    if (pattern && lowerText.includes(pattern.toLowerCase())) return pattern;
  }
  for (const constraint of projection.hard_constraints) {
    const avoidMatch = constraint.match(/avoid\s+(.+)/i) || constraint.match(/do not use\s+(.+)/i);
    const phrase = avoidMatch?.[1]?.trim();
    if (phrase && lowerText.includes(phrase.toLowerCase())) return constraint;
  }
  return null;
}
