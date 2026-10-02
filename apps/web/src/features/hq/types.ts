/** JahKnowsPR HQ domain types (maps to Supabase hq_* tables + blog_posts extensions). */

export type HqRole = "owner" | "strategist" | "creative" | "intern";

export type ContentType =
  | "the-brief"
  | "spam-report"
  | "pr-court"
  | "case-study"
  | "firm-news";

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  "the-brief": "The Brief",
  "spam-report": "SPAM Report",
  "pr-court": "PR Court",
  "case-study": "Case Study",
  "firm-news": "Firm News",
};

export type LeadStage =
  | "new_lead"
  | "contacted"
  | "conversation"
  | "strategic_session"
  | "proposal"
  | "project"
  | "ongoing_counsel"
  | "closed";

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  new_lead: "New Lead",
  contacted: "Contacted",
  conversation: "Conversation",
  strategic_session: "Strategic Session",
  proposal: "Proposal",
  project: "Project",
  ongoing_counsel: "Ongoing Counsel",
  closed: "Closed",
};

export const LEAD_STAGES: LeadStage[] = [
  "new_lead",
  "contacted",
  "conversation",
  "strategic_session",
  "proposal",
  "project",
  "ongoing_counsel",
  "closed",
];

export type LeadSource =
  | "referral"
  | "website"
  | "social_media"
  | "networking"
  | "media_contact"
  | "existing_client"
  | "other";

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  referral: "Referral",
  website: "Website",
  social_media: "Social Media",
  networking: "Networking",
  media_contact: "Media Contact",
  existing_client: "Existing Client",
  other: "Other",
};

export type InterestedService = "session" | "project" | "counsel" | "other";

export const INTERESTED_SERVICE_LABELS: Record<InterestedService, string> = {
  session: "Strategic Communications Session",
  project: "Strategic Communications + PR Project",
  counsel: "Ongoing Strategic Communications Counsel",
  other: "Other",
};

export type ClientStatus = "active" | "prospect" | "paused" | "completed" | "archived";

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  active: "Active",
  prospect: "Prospect",
  paused: "Paused",
  completed: "Completed",
  archived: "Archived",
};

export type TaskPriority = "low" | "normal" | "high" | "urgent";
export type TaskStatus = "todo" | "in_progress" | "waiting" | "complete";

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  waiting: "Waiting",
  complete: "Complete",
};

export type HqLead = {
  id: string;
  full_name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  lead_source: LeadSource;
  interested_service: InterestedService;
  estimated_value: number | null;
  stage: LeadStage;
  last_contact_date: string | null;
  next_follow_up_date: string | null;
  notes: string | null;
  converted_client_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type HqClient = {
  id: string;
  client_name: string;
  company: string | null;
  primary_contact: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  service: InterestedService | null;
  status: ClientStatus;
  start_date: string | null;
  contract_value: number | null;
  notes: string | null;
  source_lead_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type HqTask = {
  id: string;
  title: string;
  description: string | null;
  client_id: string | null;
  assignee_id: string | null;
  due_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  notes: string | null;
  created_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type HqActivity = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type HqContentPost = {
  id: string;
  title: string;
  slug: string | null;
  content_type: ContentType;
  excerpt: string | null;
  description: string | null;
  content: string | null;
  cover_image_url: string | null;
  author_name: string | null;
  author_id: string | null;
  category: string | null;
  tags: string[] | null;
  seo_title: string | null;
  seo_description: string | null;
  is_featured: boolean | null;
  publication_status: string;
  status: string | null;
  published_date: string | null;
  publish_scheduled_at: string | null;
  hq_client_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

/** Permission matrix for HQ modules */
export function canAccessHqModule(
  role: HqRole | null,
  module:
    | "dashboard"
    | "crm"
    | "clients"
    | "tasks"
    | "content"
    | "intelligence"
    | "team"
    | "settings",
): boolean {
  if (!role) return false;
  if (role === "owner") return true;
  if (role === "strategist") {
    return ["dashboard", "crm", "clients", "tasks", "content", "intelligence"].includes(module);
  }
  if (role === "creative") {
    return ["dashboard", "tasks", "content", "clients", "intelligence"].includes(module);
  }
  if (role === "intern") {
    return ["dashboard", "tasks", "content"].includes(module);
  }
  return false;
}
