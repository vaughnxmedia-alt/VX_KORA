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

export type InterestedService = "session" | "project" | "counsel" | "speaking" | "other";

export const INTERESTED_SERVICE_LABELS: Record<InterestedService, string> = {
  session: "Strategic Communications Session",
  project: "Strategic Communications + PR Project",
  counsel: "Ongoing Strategic Communications Counsel",
  speaking: "Speaking",
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

export type JourneyStatus =
  | "not_started"
  | "in_progress"
  | "awaiting_client"
  | "internal_review"
  | "blocked"
  | "completed"
  | "on_hold"
  | "cancelled";

export const JOURNEY_STATUSES: JourneyStatus[] = [
  "not_started",
  "in_progress",
  "awaiting_client",
  "internal_review",
  "blocked",
  "completed",
  "on_hold",
  "cancelled",
];

export const JOURNEY_STATUS_LABELS: Record<JourneyStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  awaiting_client: "Awaiting Client",
  internal_review: "Internal Review",
  blocked: "Blocked",
  completed: "Completed",
  on_hold: "On Hold",
  cancelled: "Cancelled",
};

export type JourneyService = Exclude<InterestedService, "other" | "speaking">;

export type NoteKind = "meeting" | "decision" | "next_step" | "note";
export type CommChannel = "email" | "call" | "meeting" | "message";

export const NOTE_KIND_LABELS: Record<NoteKind, string> = {
  meeting: "Meeting",
  decision: "Decision",
  next_step: "Next step",
  note: "Note",
};

export const COMM_CHANNEL_LABELS: Record<CommChannel, string> = {
  email: "Email",
  call: "Call",
  meeting: "Meeting",
  message: "Message",
};

export type HqStaff = {
  id: string;
  full_name: string | null;
  hq_role: string | null;
};

export type AssignmentRule = "account_lead" | "strategist" | "management" | "specific" | "unassigned";
export type TaskType = "internal" | "client" | "meeting" | "deliverable" | "approval" | "follow_up";
export type DueRuleKind =
  | "none"
  | "same_day"
  | "days_after_stage"
  | "days_before_appointment"
  | "hours_after_meeting"
  | "custom";
export type CompletionRule =
  | "all_required_tasks"
  | "required_document"
  | "deliverable_approved"
  | "management_approval"
  | "client_response"
  | "meeting_completed";
export type DeliverableStatus = "draft" | "internal_review" | "approved" | "client_review" | "final";

export const ASSIGNMENT_RULE_LABELS: Record<AssignmentRule, string> = {
  account_lead: "Account lead",
  strategist: "Strategist",
  management: "Management",
  specific: "Specific employee",
  unassigned: "Unassigned until the engagement begins",
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  internal: "Internal",
  client: "Client",
  meeting: "Meeting",
  deliverable: "Deliverable",
  approval: "Approval",
  follow_up: "Follow-Up",
};

export const DUE_RULE_LABELS: Record<DueRuleKind, string> = {
  none: "No deadline",
  same_day: "Same day",
  days_after_stage: "Days after the stage begins",
  days_before_appointment: "Days before the appointment",
  hours_after_meeting: "Hours after the meeting",
  custom: "Custom",
};

export const COMPLETION_RULE_LABELS: Record<CompletionRule, string> = {
  all_required_tasks: "All required tasks completed",
  required_document: "Required document uploaded",
  deliverable_approved: "Deliverable approved",
  management_approval: "Management approval",
  client_response: "Client response received",
  meeting_completed: "Meeting completed",
};

export const DELIVERABLE_STATUS_LABELS: Record<DeliverableStatus, string> = {
  draft: "Draft",
  internal_review: "Internal Review",
  approved: "Approved",
  client_review: "Client Review",
  final: "Final",
};

export type HqService = {
  id: string;
  service_key: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

export type DueRule = { kind: DueRuleKind; amount?: number | null; label?: string | null };

export type HqJourneyTemplate = {
  id: string;
  service_key: string;
  version: number;
  name: string;
  description: string | null;
  is_active: boolean;
  status?: "active" | "inactive" | "archived";
  created_at: string;
};

export type HqTemplateStage = {
  id: string;
  template_id: string;
  position: number;
  name: string;
  description: string | null;
  requires_approval: boolean;
  completion_rules?: CompletionRule[];
  assignment_rule?: AssignmentRule;
  specific_user_id?: string | null;
  archived_at?: string | null;
};

export type HqTemplateTask = {
  id: string;
  stage_id: string;
  position: number;
  title: string;
  description: string | null;
  instructions?: string | null;
  is_milestone: boolean;
  is_deliverable: boolean;
  requires_approval: boolean;
  relative_due_days: number | null;
  task_type?: TaskType;
  assignment_rule?: AssignmentRule;
  specific_user_id?: string | null;
  is_required?: boolean;
  due_rule?: DueRule | null;
  archived_at?: string | null;
};

export type HqTemplateDeliverable = {
  id: string;
  stage_id: string;
  position: number;
  name: string;
  description: string | null;
  is_required: boolean;
  archived_at?: string | null;
};

export type HqEngagementDeliverable = {
  id: string;
  engagement_id: string;
  stage_id: string;
  name: string;
  description: string | null;
  is_required: boolean;
  status: DeliverableStatus;
};

export type HqEngagement = {
  id: string;
  client_id: string;
  template_id: string | null;
  service_key: JourneyService;
  title: string;
  status: JourneyStatus;
  owner_id: string | null;
  start_date: string | null;
  target_end_date: string | null;
  follow_up_date: string | null;
  current_stage_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  client?: { id: string; client_name: string; company: string | null } | null;
  current_stage?: { id: string; name: string; position: number; status: JourneyStatus } | null;
};

export type HqEngagementStage = {
  id: string;
  engagement_id: string;
  position: number;
  name: string;
  description: string | null;
  requires_approval: boolean;
  status: JourneyStatus;
  approved_by: string | null;
  approved_at: string | null;
  completion_rules?: CompletionRule[];
  client_response_at?: string | null;
};

export type HqEngagementTask = {
  id: string;
  engagement_id: string;
  stage_id: string;
  position: number;
  title: string;
  description: string | null;
  status: JourneyStatus;
  assignee_id: string | null;
  due_date: string | null;
  is_milestone: boolean;
  is_deliverable: boolean;
  requires_approval: boolean;
  approval_status: "not_required" | "pending" | "approved" | "changes_requested";
  approved_at: string | null;
  completed_at: string | null;
};

export type HqEngagementNote = {
  id: string;
  engagement_id: string;
  task_id: string | null;
  author_id: string | null;
  kind: NoteKind;
  body: string;
  created_at: string;
};

export type HqEngagementCommunication = {
  id: string;
  client_id: string;
  engagement_id: string | null;
  author_id: string | null;
  channel: CommChannel;
  subject: string | null;
  body: string;
  occurred_on: string;
  created_at: string;
};

export type HqEngagementDocument = {
  id: string;
  engagement_id: string;
  task_id: string | null;
  uploaded_by: string | null;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  created_at: string;
};

export type HqEngagementAssignment = {
  id: string;
  engagement_id: string;
  user_id: string;
  assignment_role: "lead" | "contributor";
  assigned_at: string;
};

export type CaseApprovalStatus = "not_requested" | "requested" | "approved" | "declined";
export type CasePublicationStatus = "internal" | "copied";

export const CASE_APPROVAL_LABELS: Record<CaseApprovalStatus, string> = {
  not_requested: "Not requested",
  requested: "Requested",
  approved: "Approved",
  declined: "Declined",
};

export type HqCaseStudy = {
  id: string;
  engagement_id: string;
  client_id: string;
  title: string;
  objectives: string;
  work_performed: string;
  outcomes: string;
  evidence: string;
  approval_status: CaseApprovalStatus;
  publication_status: CasePublicationStatus;
  blog_post_id: string | null;
  created_at: string;
  updated_at: string;
  client?: { client_name: string } | null;
  engagement?: { title: string; service_key: JourneyService; status: JourneyStatus } | null;
};

export type MyJourneyWork = {
  id: string;
  title: string;
  status: JourneyStatus;
  due_date: string | null;
  engagement_id: string;
  stage_name: string | null;
  client_name: string | null;
  engagement_title: string | null;
  service_key: JourneyService;
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
    | "journeys"
    | "team"
    | "settings",
): boolean {
  if (!role) return false;
  if (role === "owner") return true;
  if (role === "strategist") {
    return ["dashboard", "crm", "clients", "tasks", "content", "intelligence", "journeys"].includes(module);
  }
  if (role === "creative") {
    return ["dashboard", "tasks", "content", "clients", "intelligence", "journeys"].includes(module);
  }
  if (role === "intern") {
    return ["dashboard", "tasks", "content", "journeys"].includes(module);
  }
  return false;
}
