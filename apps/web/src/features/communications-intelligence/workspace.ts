import type { HqClient } from "@/features/hq/types";
import { INTERESTED_SERVICE_LABELS } from "@/features/hq/types";
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
  CiOrgCreateInput,
  CiOrgProfileInput,
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

export function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function startOfWeekMonday(value = new Date()) {
  const d = new Date(value);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
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

export function isHealthAssessed(row: {
  status_label?: string | null;
  explanation?: string | null;
  why_it_matters?: string | null;
  recommended_improvement?: string | null;
} | null | undefined): boolean {
  if (!row) return false;
  if (normalizeHealthStatus(row.status_label) !== "not_assessed") return true;
  return Boolean(
    row.explanation?.trim() ||
      row.why_it_matters?.trim() ||
      row.recommended_improvement?.trim(),
  );
}

export function healthRowsByCategory(rows: CiHealthCheck[]) {
  const map = new Map<CiHealthCategory, CiHealthCheck>();
  for (const row of rows) map.set(row.category, row);
  return CI_HEALTH_CATEGORIES.map((category) => {
    const row = map.get(category) ?? null;
    return {
      category,
      row,
      status: normalizeHealthStatus(row?.status_label),
      assessed: isHealthAssessed(row),
    };
  });
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
    if (item.status === "not_assessed" && item.assessed) continue;
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

export const CI_HEALTH_GUIDE: Record<
  CiHealthCategory,
  { ask: string; look: string[]; write: string; example: string }
> = {
  messaging: {
    ask: "Can a stranger tell what they do and why it matters?",
    look: [
      "Their website homepage and About page",
      "Instagram, Facebook, or LinkedIn bio and recent posts",
      "The organization profile — What they do and Who they speak to",
      "How the owner describes the work out loud",
    ],
    write: "Write what their words currently say, not what they wish they said.",
    example: "The site sounds like a spa, a gym, and a cafe at once. A first-time visitor cannot tell what to book.",
  },
  visibility: {
    ask: "Can people find them when they look?",
    look: [
      "Google their name and what they do",
      "Their Google Business profile, if they have one",
      "Social profiles and how often they actually post",
      "The website location and contact information",
    ],
    write: "Note whether a new customer could find them in a few minutes.",
    example: "They are hard to find unless someone already knows the name.",
  },
  reputation: {
    ask: "What do people already say about them?",
    look: [
      "Google and Yelp reviews",
      "Comments on social posts",
      "The organization profile — Reputation concerns",
      "Anything the owner mentioned in conversation",
    ],
    write: "Summarize the public story, good or thin. You do not need a full audit.",
    example: "Reviews are warm but few, and they talk about the space more than results.",
  },
  media_readiness: {
    ask: "If someone asked for a quote tomorrow, could they answer?",
    look: [
      "The website for a short bio and a usable photo",
      "The organization profile — People who speak for them",
      "Any past press or interviews they mentioned",
      "Whether they have one clear talking point",
    ],
    write: "Say if they are ready for a simple local story, not a national tour.",
    example: "There is no short bio, photo, or talking point ready if a reporter called.",
  },
  crisis_readiness: {
    ask: "If something went wrong in public, who would speak and what would they say?",
    look: [
      "The organization profile — What needs care and Media concerns",
      "A conversation with the owner about past complaints or surprises",
      "Whether anyone besides the owner can answer the phone",
    ],
    write: "You are not writing a crisis plan. Just note if they have a first response.",
    example: "No crisis is active, and there is also no simple plan for a public complaint.",
  },
  brand_consistency: {
    ask: "Do they look and sound like the same organization everywhere?",
    look: [
      "Website, social profiles, and the physical storefront if you can see photos",
      "Logo, colors, and the way they describe themselves",
      "The organization profile — What they do",
    ],
    write: "Call out mismatches. One sentence and one photo style is enough to start.",
    example: "The logo, colors, and voice change between the site, Instagram, and the door.",
  },
};

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

export type CiWorkflowCounts = {
  assessedCategories: number;
  recommendationCount: number;
  opportunityCount: number;
  actionCount: number;
  approvedMessagingCount: number;
};

export function formatRelativeActivity(value: string | null | undefined) {
  if (!value) return "No recent activity";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No recent activity";
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days} ${days === 1 ? "day" : "days"} ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function greetingForHour(hour = new Date().getHours()) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function firstNameFromProfile(
  profile: { full_name?: string | null; display_name?: string | null } | null | undefined,
  user: { email?: string | null; user_metadata?: { full_name?: string; name?: string } } | null | undefined,
) {
  const raw =
    profile?.full_name ||
    profile?.display_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "there";
  return raw.trim().split(/\s+/)[0] || "there";
}

export function ciDraftFromHqClient(client: HqClient): {
  create: CiOrgCreateInput;
  profile: CiOrgProfileInput;
} {
  const create: CiOrgCreateInput = {
    name: (client.company?.trim() || client.client_name).trim(),
    organization_type: "small_business",
    industry: client.industry ?? "",
    website: client.website ?? "",
    location: "",
    description: "",
    status: client.status === "paused" || client.status === "archived" ? client.status : "active",
    hq_client_id: client.id,
  };

  return {
    create,
    profile: {
      name: create.name,
      industry: create.industry,
      website: create.website,
      description: create.description,
      communication_goals: client.service ? INTERESTED_SERVICE_LABELS[client.service] : null,
      key_spokespersons: client.primary_contact?.trim()
        ? [{ name: client.primary_contact.trim() }]
        : [],
    },
  };
}

export function hasOrgProfile(org: {
  name?: string | null;
  description?: string | null;
  industry?: string | null;
  website?: string | null;
  location?: string | null;
  onboarding_status?: string | null;
}) {
  return Boolean(
    org.onboarding_status === "completed" ||
      (org.description && org.description.trim()) ||
      (org.industry && org.industry.trim()) ||
      (org.website && org.website.trim()) ||
      (org.location && org.location.trim()),
  );
}

export function workflowFromCounts(org: {
  id: string;
  name?: string | null;
  description?: string | null;
  industry?: string | null;
  website?: string | null;
  location?: string | null;
  onboarding_status?: string | null;
}, counts: CiWorkflowCounts) {
  const profileDone = hasOrgProfile(org);
  const assessmentDone = counts.assessedCategories >= CI_HEALTH_CATEGORIES.length;
  const recommendationsDone = counts.recommendationCount > 0;
  const opportunitiesDone = counts.opportunityCount > 0;
  const actionsDone = counts.actionCount > 0;
  const clientReady =
    profileDone && assessmentDone && recommendationsDone && opportunitiesDone && actionsDone;

  const steps = [
    {
      id: 1,
      title: "Organization profile",
      summary: "Understand who they are, who they serve, and what they already have in place.",
      done: profileDone,
      cta: "Review Organization",
      href: `/hq/intelligence/organizations/${org.id}/overview`,
    },
    {
      id: 2,
      title: "Communications assessment",
      summary:
        "Look at their website, socials, and organization profile. Write what you see — the client does not fill this out.",
      done: assessmentDone,
      cta: "Complete Assessment",
      href: `/hq/intelligence/organizations/${org.id}/health`,
    },
    {
      id: 3,
      title: "What needs attention",
      summary: "Turn findings into clear recommendations the client can understand.",
      done: recommendationsDone,
      cta: "Add Recommendation",
      href: `/hq/intelligence/organizations/${org.id}/intelligence`,
    },
    {
      id: 4,
      title: "Opportunities",
      summary: "Add media, visibility, partnership, speaking, community, or storytelling opportunities.",
      done: opportunitiesDone,
      cta: "Add Opportunity",
      href: `/hq/intelligence/organizations/${org.id}/opportunities`,
    },
    {
      id: 5,
      title: "Action plan",
      summary: "Convert recommendations and opportunities into specific next actions.",
      done: actionsDone,
      cta: "Build Action Plan",
      href: `/hq/intelligence/organizations/${org.id}/actions`,
    },
    {
      id: 6,
      title: "Client ready",
      summary: "Preview what the client will see before you share it.",
      done: clientReady,
      cta: "Preview Client Portal",
      href: `/hq/intelligence/organizations/${org.id}/preview`,
    },
  ] as const;

  const next = steps.find((step) => !step.done) ?? steps[5];
  const doneCount = steps.filter((step) => step.done).length;
  const stage = clientReady
    ? "Ready to share"
    : next.id === 1
      ? "Getting started"
      : next.id === 2
        ? "Needs assessment"
        : next.id === 3
          ? "Needs recommendations"
          : next.id === 4
            ? "Needs opportunities"
            : next.id === 5
              ? "Needs action plan"
              : "Review before sharing";

  return { steps, next, doneCount, total: steps.length, stage, clientReady };
}
