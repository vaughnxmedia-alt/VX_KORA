import type {
  CiActionItem,
  CiActionWriteInput,
  CiCounselRequestType,
  CiHealthCategory,
  CiHealthCheck,
  CiHealthStatus,
  CiIntelligenceCategory,
  CiIntelligenceItem,
  CiIntelligenceWriteInput,
  CiMessagingEntry,
  CiOpportunity,
  CiOrganizationListItem,
  CiSocialChannels,
  CiSpokesperson,
} from "./types";
import { CI_HEALTH_CATEGORIES, CI_HEALTH_CATEGORY_LABELS, CI_HEALTH_STATUS_LABELS } from "./types";

export type CiWorkspaceContext = { org: CiOrganizationListItem };

export function ciFriendlyError(error: unknown): string {
  const raw =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error ?? "");
  const lower = raw.toLowerCase();
  if (!raw || lower.includes("undefined")) return "Something went wrong. Please try again.";
  if (lower.includes("not authorized") || lower.includes("permission") || lower.includes("row-level security")) {
    return "You do not have permission to do that.";
  }
  if (lower.includes("invitation not found") || lower.includes("no longer valid")) {
    return "This invitation is not valid.";
  }
  if (lower.includes("already been used")) return "This invitation has already been used.";
  if (lower.includes("has expired")) return "This invitation has expired. Ask JahKnowsPR to send a new one.";
  if (lower.includes("invited email")) return "Sign in with the email address this invitation was sent to.";
  if (lower.includes("already has access")) return "That person already has access to this organization.";
  if (lower.includes("valid email")) return "Enter a valid email address.";
  if (lower.includes("sign in to accept")) return "Sign in to accept this invitation.";
  if (lower.includes("jwt") || lower.includes("not signed in")) return "Please sign in again.";
  if (lower.includes("network") || lower.includes("failed to fetch")) {
    return "Could not reach the server. Check your connection and try again.";
  }
  if (lower.includes("schema cache") || lower.includes("does not exist")) {
    return "This part of the portal is not available yet.";
  }
  if (raw.length > 180 || lower.includes("violates") || lower.includes("sql")) {
    return "Something went wrong. Please try again.";
  }
  return raw;
}

export function parseSpokespersons(value: unknown): CiSpokesperson[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return { name: item };
      if (item && typeof item === "object" && "name" in item) {
        return { name: String((item as CiSpokesperson).name || ""), role: (item as CiSpokesperson).role };
      }
      return null;
    })
    .filter((item) => Boolean(item?.name?.trim())) as CiSpokesperson[];
}

export function parseSocialChannels(value: unknown): CiSocialChannels {
  if (!value || typeof value !== "object") return {};
  const row = value as CiSocialChannels;
  return {
    instagram: row.instagram || "",
    facebook: row.facebook || "",
    linkedin: row.linkedin || "",
    tiktok: row.tiktok || "",
    other: row.other || "",
  };
}

export function inviteUrl(token: string) {
  return `${window.location.origin}/join/${token}`;
}

export function formatCiDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    const dateOnly = value.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
      const [year, month, day] = dateOnly.split("-").map(Number);
      return new Date(year, month - 1, day).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfWeek() {
  const d = startOfToday();
  d.setDate(d.getDate() + 7);
  return d;
}

export function toDateInputValue(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

export function dateInputToIso(value: string | null | undefined) {
  if (!value) return null;
  return `${value}T12:00:00`;
}

export function normalizeHealthStatus(value: string | null | undefined): CiHealthStatus {
  if (value === "needs_work") return "needs_attention";
  if (value === "critical") return "high_priority";
  if (value === "unknown") return "not_assessed";
  if (
    value === "strong" ||
    value === "stable" ||
    value === "needs_attention" ||
    value === "high_priority" ||
    value === "not_assessed"
  ) {
    return value;
  }
  return "not_assessed";
}

export function healthRowsByCategory(rows: CiHealthCheck[]) {
  const map = new Map<CiHealthCategory, CiHealthCheck>();
  for (const row of rows) map.set(row.category, row);
  return CI_HEALTH_CATEGORIES.map((category) => ({
    category,
    row: map.get(category) ?? null,
    status: normalizeHealthStatus(map.get(category)?.status_label),
  }));
}

export function healthSummaryPhrases(rows: CiHealthCheck[]) {
  const counts: Record<CiHealthStatus, number> = {
    strong: 0,
    stable: 0,
    needs_attention: 0,
    high_priority: 0,
    not_assessed: 0,
  };
  for (const item of healthRowsByCategory(rows)) {
    counts[item.status] += 1;
  }
  const phrases: string[] = [];
  if (counts.strong) phrases.push(`${counts.strong} ${counts.strong === 1 ? "area" : "areas"} strong`);
  if (counts.stable) phrases.push(`${counts.stable} ${counts.stable === 1 ? "area" : "areas"} stable`);
  if (counts.needs_attention) {
    phrases.push(
      `${counts.needs_attention} ${counts.needs_attention === 1 ? "area needs" : "areas need"} attention`,
    );
  }
  if (counts.high_priority) {
    phrases.push(
      `${counts.high_priority} ${counts.high_priority === 1 ? "area is" : "areas are"} high priority`,
    );
  }
  if (counts.not_assessed) {
    phrases.push(
      `${counts.not_assessed} ${counts.not_assessed === 1 ? "area is" : "areas are"} not assessed`,
    );
  }
  return phrases;
}

export const CI_HEALTH_TO_INTELLIGENCE: Record<CiHealthCategory, CiIntelligenceCategory> = {
  messaging: "messaging",
  visibility: "visibility",
  reputation: "reputation",
  media_readiness: "media",
  crisis_readiness: "crisis_readiness",
  brand_consistency: "recommendation",
};

export function intelligenceDraftFromHealth(
  organizationId: string,
  category: CiHealthCategory,
  row: CiHealthCheck | null,
  status: CiHealthStatus,
): CiIntelligenceWriteInput {
  const label = CI_HEALTH_CATEGORY_LABELS[category];
  const statusLabel = CI_HEALTH_STATUS_LABELS[status];
  return {
    organization_id: organizationId,
    title: `${label} — ${statusLabel}`,
    category: CI_HEALTH_TO_INTELLIGENCE[category],
    description: row?.explanation ?? "",
    why_it_matters: row?.why_it_matters ?? "",
    recommended_action: row?.recommended_improvement ?? "",
    priority: status === "high_priority" ? "urgent" : "high",
    status: "new",
    due_date: null,
  };
}

export async function copyCiText(value: string) {
  await navigator.clipboard.writeText(value);
}

export function formatCiDateTime(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export type CiCounselPrefill = {
  subject?: string;
  request_type?: CiCounselRequestType;
  description?: string;
  opportunity_id?: string;
  intelligence_item_id?: string;
  action_item_id?: string;
};

export function askCounselPath(prefill: CiCounselPrefill = {}, search = "") {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  if (prefill.subject) params.set("subject", prefill.subject);
  if (prefill.request_type) params.set("type", prefill.request_type);
  if (prefill.description) params.set("description", prefill.description);
  if (prefill.opportunity_id) params.set("opportunity", prefill.opportunity_id);
  if (prefill.intelligence_item_id) params.set("intelligence", prefill.intelligence_item_id);
  if (prefill.action_item_id) params.set("action", prefill.action_item_id);
  const qs = params.toString();
  return { pathname: "/portal/counsel/new", search: qs ? `?${qs}` : "" };
}

export function counselDraftFromOpportunity(item: CiOpportunity): CiCounselPrefill {
  return {
    subject: `Counsel on: ${item.title}`,
    request_type:
      item.opportunity_type === "media"
        ? "media_request"
        : item.opportunity_type === "partnership" || item.opportunity_type === "sponsorship"
          ? "partnership_sponsorship"
          : "event_opportunity",
    description: [
      item.description,
      item.why_it_matters ? `Why this may matter: ${item.why_it_matters}` : "",
      item.recommended_action ? `Suggested next step: ${item.recommended_action}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    opportunity_id: item.id,
  };
}

export function counselDraftFromIntelligence(item: CiIntelligenceItem): CiCounselPrefill {
  return {
    subject: `Counsel on: ${item.title}`,
    request_type:
      item.category === "media"
        ? "media_request"
        : item.category === "reputation" || item.category === "crisis_readiness"
          ? "reputation_issue"
          : item.category === "messaging"
            ? "messaging_question"
            : "general_strategic_counsel",
    description: [
      item.description,
      item.why_it_matters ? `Why this may matter: ${item.why_it_matters}` : "",
      item.recommended_action ? `Suggested next step: ${item.recommended_action}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    intelligence_item_id: item.id,
  };
}

export function counselDraftFromHealth(
  category: CiHealthCategory,
  row?: CiHealthCheck | null,
): CiCounselPrefill {
  const label = CI_HEALTH_CATEGORY_LABELS[category];
  return {
    subject: `Counsel on ${label}`,
    request_type:
      category === "media_readiness"
        ? "media_request"
        : category === "reputation"
          ? "reputation_issue"
          : category === "crisis_readiness"
            ? "crisis_sensitive"
            : category === "messaging"
              ? "messaging_question"
              : "general_strategic_counsel",
    description: [
      row?.explanation,
      row?.why_it_matters ? `Why this may matter: ${row.why_it_matters}` : "",
      row?.recommended_improvement ? `Recommended improvement: ${row.recommended_improvement}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
}

export function counselDraftFromMessaging(entry: CiMessagingEntry): CiCounselPrefill {
  return {
    subject: `Counsel on messaging: ${entry.title || "approved language"}`,
    request_type: entry.entry_type === "crisis_holding_statement" ? "crisis_sensitive" : "messaging_question",
    description: entry.body,
  };
}

export type CiDueBucket = "overdue" | "this_week" | "upcoming" | "none";

export function parseCiDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const dateOnly = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  const [year, month, day] = dateOnly.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function classifyDue(value: string | null | undefined): CiDueBucket {
  const d = parseCiDateOnly(value);
  if (!d) return "none";
  const today = startOfToday();
  if (d < today) return "overdue";
  if (d <= endOfWeek()) return "this_week";
  return "upcoming";
}

export function emptyActionDraft(organizationId: string): CiActionWriteInput {
  return {
    organization_id: organizationId,
    title: "",
    description: "",
    reason: "",
    priority: "medium",
    due_date: null,
    status: "not_started",
    assigned_to: null,
    intelligence_item_id: null,
    opportunity_id: null,
  };
}

export function actionDraftFromOpportunity(
  organizationId: string,
  opportunity: CiOpportunity,
): CiActionWriteInput {
  const recommended = opportunity.recommended_action?.trim();
  return {
    organization_id: organizationId,
    title: recommended || `Prepare for ${opportunity.title}`,
    description: opportunity.description ?? "",
    reason: opportunity.why_it_matters ?? "",
    priority: opportunity.priority,
    due_date: opportunity.deadline,
    status: "not_started",
    assigned_to: null,
    intelligence_item_id: null,
    opportunity_id: opportunity.id,
  };
}

export function actionDraftFromIntelligence(
  organizationId: string,
  item: CiIntelligenceItem,
): CiActionWriteInput {
  const recommended = item.recommended_action?.trim();
  return {
    organization_id: organizationId,
    title: recommended || item.title,
    description: item.description ?? "",
    reason: item.why_it_matters ?? "",
    priority: item.priority,
    due_date: item.due_date,
    status: "not_started",
    assigned_to: null,
    intelligence_item_id: item.id,
    opportunity_id: null,
  };
}

export function groupActionsByDue(actions: CiActionItem[]) {
  const overdue: CiActionItem[] = [];
  const thisWeek: CiActionItem[] = [];
  const upcoming: CiActionItem[] = [];
  const completed: CiActionItem[] = [];

  for (const action of actions) {
    if (action.status === "completed" || action.status === "cancelled") {
      completed.push(action);
      continue;
    }
    const bucket = classifyDue(action.due_date);
    if (bucket === "overdue") overdue.push(action);
    else if (bucket === "this_week") thisWeek.push(action);
    else upcoming.push(action);
  }

  const byDate = (a: CiActionItem, b: CiActionItem) =>
    (a.due_date || "9999").localeCompare(b.due_date || "9999");
  overdue.sort(byDate);
  thisWeek.sort(byDate);
  upcoming.sort(byDate);
  completed.sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));

  return { overdue, thisWeek, upcoming, completed };
}
