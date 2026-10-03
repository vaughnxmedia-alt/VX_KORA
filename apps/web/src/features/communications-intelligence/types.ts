/** Communications Intelligence types (ci_* tables). */

export type CiOrgStatus = "active" | "paused" | "archived";

export type CiOrganizationType =
  | "small_business"
  | "nonprofit"
  | "church"
  | "community_organization"
  | "personal_brand"
  | "startup"
  | "other";

export const CI_ORG_STATUS_LABELS: Record<CiOrgStatus, string> = {
  active: "Active",
  paused: "Paused",
  archived: "Archived",
};

export const CI_ORG_TYPE_LABELS: Record<CiOrganizationType, string> = {
  small_business: "Small Business",
  nonprofit: "Nonprofit",
  church: "Church",
  community_organization: "Community Organization",
  personal_brand: "Personal Brand",
  startup: "Startup",
  other: "Other",
};

export const CI_ORG_TYPES: CiOrganizationType[] = [
  "small_business",
  "nonprofit",
  "church",
  "community_organization",
  "personal_brand",
  "startup",
  "other",
];

export type CiOrganization = {
  id: string;
  hq_client_id: string | null;
  name: string;
  industry: string | null;
  organization_type: CiOrganizationType | null;
  description: string | null;
  website: string | null;
  location: string | null;
  primary_audiences: string | null;
  communication_goals: string | null;
  major_challenges: string | null;
  upcoming_events: string | null;
  key_spokespersons: CiSpokesperson[];
  social_channels: CiSocialChannels;
  pr_media_concerns: string | null;
  reputation_concerns: string | null;
  has_approved_messaging: boolean | null;
  onboarding_status: CiOnboardingStatus;
  onboarding_completed_at: string | null;
  onboarding_completed_by: string | null;
  status: CiOrgStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CiOnboardingStatus = "not_started" | "in_progress" | "completed";

export type CiSpokesperson = {
  name: string;
  role?: string;
};

export type CiSocialChannels = {
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  tiktok?: string;
  other?: string;
};

export const CI_ONBOARDING_STATUS_LABELS: Record<CiOnboardingStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Complete",
};

export const CI_MEMBER_ROLES: CiMemberRole[] = ["owner", "admin", "member", "viewer"];

export const CI_MEMBER_ROLE_LABELS: Record<CiMemberRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

export type CiOrganizationInvitation = {
  id: string;
  organization_id: string;
  email: string;
  member_role: CiMemberRole;
  expires_at: string;
  invited_by: string | null;
  accepted_at: string | null;
  accepted_by: string | null;
  revoked_at: string | null;
  last_sent_at: string;
  created_at: string;
  organization_name?: string | null;
};

export type CiInvitePreview = {
  organization_name: string;
  email: string;
  member_role: CiMemberRole;
  expires_at: string;
  already_used: boolean;
  expired: boolean;
  revoked: boolean;
};

export type CiOrgProfileInput = {
  name?: string;
  organization_type?: CiOrganizationType | null;
  industry?: string | null;
  website?: string | null;
  location?: string | null;
  description?: string | null;
  primary_audiences?: string | null;
  communication_goals?: string | null;
  major_challenges?: string | null;
  upcoming_events?: string | null;
  key_spokespersons?: CiSpokesperson[];
  social_channels?: CiSocialChannels;
  pr_media_concerns?: string | null;
  reputation_concerns?: string | null;
  has_approved_messaging?: boolean | null;
  onboarding_status?: CiOnboardingStatus;
};

export type CiOpsSummary = {
  organizations: number;
  needing_attention: number;
  high_intelligence: number;
  overdue_actions: number;
  upcoming_deadlines: number;
  new_counsel: number;
  waiting_response: number;
  attention_orgs: { id: string; name: string; reason: string }[];
  high_items: { id: string; organization_id: string; organization_name: string; title: string; priority: string }[];
  overdue_action_rows: { id: string; organization_id: string; organization_name: string; title: string; due_date: string | null }[];
  upcoming_opportunity_rows: { id: string; organization_id: string; organization_name: string; title: string; deadline: string | null }[];
  counsel_rows: { id: string; organization_id: string; organization_name: string; subject: string; status: string; urgency: string }[];
};

/** List row with optional HQ client join fields */
export type CiOrganizationListItem = CiOrganization & {
  hq_client?: {
    id: string;
    client_name: string;
    primary_contact: string | null;
    email: string | null;
  } | null;
  member_count?: number;
};

export type CiAdminNote = {
  id: string;
  organization_id: string;
  entity_type:
    | "organization"
    | "intelligence_item"
    | "health_check"
    | "messaging_entry"
    | "opportunity"
    | "action_item"
    | "counsel_request"
    | "outcome"
    | "monthly_report"
    | "weekly_brief"
    | "pilot"
    | "general";
  entity_id: string | null;
  body: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CiAdminNoteWithAuthor = CiAdminNote & {
  author_email?: string | null;
  author_name?: string | null;
};

export type CiOrgWorkspaceCounts = {
  intelligence_open: number;
  opportunities_active: number;
  actions_open: number;
  counsel_open: number;
  members: number;
};

export type CiOrgCreateInput = {
  name: string;
  organization_type?: CiOrganizationType | null;
  industry?: string | null;
  website?: string | null;
  location?: string | null;
  description?: string | null;
  status?: CiOrgStatus;
  hq_client_id?: string | null;
  created_by?: string | null;
};

export type CiIntelligenceCategory =
  | "opportunity"
  | "needs_attention"
  | "upcoming"
  | "recommendation"
  | "reputation"
  | "messaging"
  | "media"
  | "crisis_readiness"
  | "visibility";

export type CiIntelligencePriority = "low" | "medium" | "high" | "urgent";
export type CiIntelligenceStatus = "new" | "reviewed" | "in_progress" | "completed" | "dismissed";

export const CI_INTELLIGENCE_CATEGORY_LABELS: Record<CiIntelligenceCategory, string> = {
  opportunity: "Opportunity",
  needs_attention: "Needs Attention",
  upcoming: "Upcoming",
  recommendation: "Recommendation",
  reputation: "Reputation",
  messaging: "Messaging",
  media: "Media",
  crisis_readiness: "Crisis Readiness",
  visibility: "Visibility",
};

export const CI_INTELLIGENCE_PRIORITY_LABELS: Record<CiIntelligencePriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const CI_INTELLIGENCE_STATUS_LABELS: Record<CiIntelligenceStatus, string> = {
  new: "New",
  reviewed: "Reviewed",
  in_progress: "In Progress",
  completed: "Completed",
  dismissed: "Dismissed",
};

export const CI_INTELLIGENCE_CATEGORIES: CiIntelligenceCategory[] = [
  "opportunity",
  "needs_attention",
  "upcoming",
  "recommendation",
  "reputation",
  "messaging",
  "media",
  "crisis_readiness",
  "visibility",
];

export const CI_INTELLIGENCE_PRIORITIES: CiIntelligencePriority[] = [
  "low",
  "medium",
  "high",
  "urgent",
];

export const CI_INTELLIGENCE_STATUSES: CiIntelligenceStatus[] = [
  "new",
  "reviewed",
  "in_progress",
  "completed",
  "dismissed",
];

export const CI_INTELLIGENCE_PRIORITY_RANK: Record<CiIntelligencePriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const CI_ACTIVE_INTELLIGENCE_STATUSES: CiIntelligenceStatus[] = [
  "new",
  "reviewed",
  "in_progress",
];

export type CiIntelligenceItem = {
  id: string;
  organization_id: string;
  title: string;
  category: CiIntelligenceCategory;
  description: string | null;
  why_it_matters: string | null;
  recommended_action: string | null;
  priority: CiIntelligencePriority;
  status: CiIntelligenceStatus;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CiIntelligenceWriteInput = {
  organization_id: string;
  title: string;
  category: CiIntelligenceCategory;
  description?: string | null;
  why_it_matters?: string | null;
  recommended_action?: string | null;
  priority?: CiIntelligencePriority;
  status?: CiIntelligenceStatus;
  due_date?: string | null;
  created_by?: string | null;
};

export type CiMemberRole = "owner" | "admin" | "member" | "viewer";
export type CiMemberStatus = "invited" | "active" | "revoked";

export type CiOrganizationMember = {
  id: string;
  organization_id: string;
  user_id: string;
  member_role: CiMemberRole;
  status: CiMemberStatus;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
  email?: string | null;
  full_name?: string | null;
};

export type CiHealthCategory =
  | "messaging"
  | "visibility"
  | "reputation"
  | "media_readiness"
  | "crisis_readiness"
  | "brand_consistency";

export type CiHealthStatus =
  | "strong"
  | "stable"
  | "needs_attention"
  | "high_priority"
  | "not_assessed";

export const CI_HEALTH_CATEGORIES: CiHealthCategory[] = [
  "messaging",
  "visibility",
  "reputation",
  "media_readiness",
  "crisis_readiness",
  "brand_consistency",
];

export const CI_HEALTH_CATEGORY_LABELS: Record<CiHealthCategory, string> = {
  messaging: "Messaging",
  visibility: "Visibility",
  reputation: "Reputation",
  media_readiness: "Media Readiness",
  crisis_readiness: "Crisis Readiness",
  brand_consistency: "Brand Consistency",
};

export const CI_HEALTH_STATUSES: CiHealthStatus[] = [
  "strong",
  "stable",
  "needs_attention",
  "high_priority",
  "not_assessed",
];

export const CI_HEALTH_STATUS_LABELS: Record<CiHealthStatus, string> = {
  strong: "Strong",
  stable: "Stable",
  needs_attention: "Needs Attention",
  high_priority: "High Priority",
  not_assessed: "Not Assessed",
};

export type CiHealthCheck = {
  id: string;
  organization_id: string;
  category: CiHealthCategory;
  score: number | null;
  status_label: CiHealthStatus | null;
  explanation: string | null;
  why_it_matters: string | null;
  recommended_improvement: string | null;
  assessed_by: string | null;
  assessed_at: string | null;
  created_at: string;
  updated_at: string;
  reviewer_name?: string | null;
};

export type CiHealthWriteInput = {
  organization_id: string;
  category: CiHealthCategory;
  status_label?: CiHealthStatus | null;
  score?: number | null;
  explanation?: string | null;
  why_it_matters?: string | null;
  recommended_improvement?: string | null;
  assessed_by?: string | null;
  assessed_at?: string | null;
};

export type CiHealthBoard = {
  organization: CiOrganization;
  checks: CiHealthCheck[];
};

export type CiPriority = CiIntelligencePriority;
export const CI_PRIORITIES = CI_INTELLIGENCE_PRIORITIES;
export const CI_PRIORITY_LABELS = CI_INTELLIGENCE_PRIORITY_LABELS;
export const CI_PRIORITY_RANK = CI_INTELLIGENCE_PRIORITY_RANK;

export type CiOpportunityType =
  | "media"
  | "speaking"
  | "partnership"
  | "sponsorship"
  | "award"
  | "community_event"
  | "announcement"
  | "storytelling"
  | "thought_leadership"
  | "networking"
  | "other";

export type CiOpportunityStatus =
  | "new"
  | "reviewing"
  | "interested"
  | "pursuing"
  | "completed"
  | "passed"
  | "expired";

export const CI_OPPORTUNITY_TYPES: CiOpportunityType[] = [
  "media",
  "speaking",
  "partnership",
  "sponsorship",
  "award",
  "community_event",
  "announcement",
  "storytelling",
  "thought_leadership",
  "networking",
  "other",
];

export const CI_OPPORTUNITY_TYPE_LABELS: Record<CiOpportunityType, string> = {
  media: "Media",
  speaking: "Speaking",
  partnership: "Partnership",
  sponsorship: "Sponsorship",
  award: "Award",
  community_event: "Community Event",
  announcement: "Announcement",
  storytelling: "Storytelling",
  thought_leadership: "Thought Leadership",
  networking: "Networking",
  other: "Other",
};

export const CI_OPPORTUNITY_STATUSES: CiOpportunityStatus[] = [
  "new",
  "reviewing",
  "interested",
  "pursuing",
  "completed",
  "passed",
  "expired",
];

export const CI_OPPORTUNITY_STATUS_LABELS: Record<CiOpportunityStatus, string> = {
  new: "New",
  reviewing: "Reviewing",
  interested: "Interested",
  pursuing: "Pursuing",
  completed: "Completed",
  passed: "Passed",
  expired: "Expired",
};

export const CI_ACTIVE_OPPORTUNITY_STATUSES: CiOpportunityStatus[] = [
  "new",
  "reviewing",
  "interested",
  "pursuing",
];

export const CI_CLIENT_OPPORTUNITY_STATUSES: Array<Extract<CiOpportunityStatus, "interested" | "passed">> = [
  "interested",
  "passed",
];

export type CiOpportunity = {
  id: string;
  organization_id: string;
  title: string;
  opportunity_type: CiOpportunityType;
  description: string | null;
  why_it_matters: string | null;
  recommended_action: string | null;
  source: string | null;
  source_url: string | null;
  deadline: string | null;
  priority: CiPriority;
  status: CiOpportunityStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CiOpportunityWriteInput = {
  organization_id: string;
  title: string;
  opportunity_type: CiOpportunityType;
  description?: string | null;
  why_it_matters?: string | null;
  recommended_action?: string | null;
  source?: string | null;
  source_url?: string | null;
  deadline?: string | null;
  priority?: CiPriority;
  status?: CiOpportunityStatus;
  created_by?: string | null;
};

export type CiActionStatus = "not_started" | "in_progress" | "completed" | "cancelled";

export const CI_ACTION_STATUSES: CiActionStatus[] = [
  "not_started",
  "in_progress",
  "completed",
  "cancelled",
];

export const CI_ACTION_STATUS_LABELS: Record<CiActionStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const CI_OPEN_ACTION_STATUSES: CiActionStatus[] = ["not_started", "in_progress"];
export const CI_CLIENT_ACTION_STATUSES: Array<
  Extract<CiActionStatus, "not_started" | "in_progress" | "completed">
> = ["not_started", "in_progress", "completed"];

export type CiActionItem = {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  reason: string | null;
  priority: CiPriority;
  due_date: string | null;
  status: CiActionStatus;
  assigned_to: string | null;
  intelligence_item_id: string | null;
  opportunity_id: string | null;
  created_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  assignee_name?: string | null;
  opportunity_title?: string | null;
  intelligence_title?: string | null;
};

export type CiActionWriteInput = {
  organization_id: string;
  title: string;
  description?: string | null;
  reason?: string | null;
  priority?: CiPriority;
  due_date?: string | null;
  status?: CiActionStatus;
  assigned_to?: string | null;
  intelligence_item_id?: string | null;
  opportunity_id?: string | null;
  created_by?: string | null;
};

export type CiPortalOpportunities = {
  organization: CiOrganization;
  opportunities: CiOpportunity[];
};

export type CiPortalActions = {
  organization: CiOrganization;
  actions: CiActionItem[];
};

export type CiMessagingEntryType =
  | "organization_description"
  | "boilerplate"
  | "founder_executive_bio"
  | "key_messages"
  | "talking_points"
  | "faq_responses"
  | "approved_statements"
  | "media_bio"
  | "crisis_holding_statement"
  | "custom";

export type CiMessagingStatus = "draft" | "approved" | "archived";

export const CI_MESSAGING_ENTRY_TYPES: CiMessagingEntryType[] = [
  "organization_description",
  "boilerplate",
  "founder_executive_bio",
  "key_messages",
  "talking_points",
  "faq_responses",
  "approved_statements",
  "media_bio",
  "crisis_holding_statement",
  "custom",
];

export const CI_MESSAGING_ENTRY_LABELS: Record<CiMessagingEntryType, string> = {
  organization_description: "Organization Description",
  boilerplate: "Boilerplate",
  founder_executive_bio: "Founder / Executive Bio",
  key_messages: "Key Message",
  talking_points: "Talking Point",
  faq_responses: "FAQ Response",
  approved_statements: "Approved Statement",
  media_bio: "Media Bio",
  crisis_holding_statement: "Crisis Holding Statement",
  custom: "Custom",
};

export const CI_MESSAGING_PORTAL_SECTION_LABELS: Record<CiMessagingEntryType, string> = {
  organization_description: "About Our Organization",
  boilerplate: "Media Boilerplate",
  founder_executive_bio: "Founder / Executive Bio",
  key_messages: "Key Messages",
  talking_points: "Talking Points",
  faq_responses: "FAQ Responses",
  approved_statements: "Approved Statements",
  media_bio: "Media Bio",
  crisis_holding_statement: "If Something Goes Wrong",
  custom: "Other Approved Language",
};

export const CI_MESSAGING_STATUSES: CiMessagingStatus[] = ["draft", "approved", "archived"];

export const CI_MESSAGING_STATUS_LABELS: Record<CiMessagingStatus, string> = {
  draft: "Draft",
  approved: "Approved",
  archived: "Archived",
};

export type CiMessagingEntry = {
  id: string;
  organization_id: string;
  entry_type: CiMessagingEntryType;
  title: string | null;
  body: string;
  sort_order: number;
  status: CiMessagingStatus;
  is_published: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  admin_notes?: string | null;
  admin_note_id?: string | null;
};

export type CiMessagingWriteInput = {
  organization_id: string;
  entry_type: CiMessagingEntryType;
  title?: string | null;
  body: string;
  sort_order?: number;
  status?: CiMessagingStatus;
  admin_notes?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
};

export type CiMessagingLibrary = {
  organization: CiOrganization;
  entries: CiMessagingEntry[];
};

export type CiCounselRequestType =
  | "media_request"
  | "reputation_issue"
  | "messaging_question"
  | "crisis_sensitive"
  | "event_opportunity"
  | "partnership_sponsorship"
  | "announcement"
  | "public_statement"
  | "general_strategic_counsel"
  | "other";

export type CiCounselUrgency = "normal" | "time_sensitive" | "urgent";
export type CiCounselStatus = "submitted" | "reviewing" | "response_ready" | "closed";

export const CI_COUNSEL_REQUEST_TYPES: CiCounselRequestType[] = [
  "media_request",
  "reputation_issue",
  "messaging_question",
  "crisis_sensitive",
  "event_opportunity",
  "partnership_sponsorship",
  "announcement",
  "public_statement",
  "general_strategic_counsel",
  "other",
];

export const CI_COUNSEL_REQUEST_TYPE_LABELS: Record<CiCounselRequestType, string> = {
  media_request: "Media Request",
  reputation_issue: "Reputation Issue",
  messaging_question: "Messaging Question",
  crisis_sensitive: "Crisis / Sensitive Situation",
  event_opportunity: "Event / Opportunity",
  partnership_sponsorship: "Partnership / Sponsorship",
  announcement: "Announcement",
  public_statement: "Public Statement",
  general_strategic_counsel: "General Strategic Counsel",
  other: "Other",
};

export const CI_COUNSEL_URGENCIES: CiCounselUrgency[] = ["normal", "time_sensitive", "urgent"];

export const CI_COUNSEL_URGENCY_LABELS: Record<CiCounselUrgency, string> = {
  normal: "Normal",
  time_sensitive: "Time Sensitive",
  urgent: "Urgent",
};

export const CI_COUNSEL_URGENCY_RANK: Record<CiCounselUrgency, number> = {
  urgent: 0,
  time_sensitive: 1,
  normal: 2,
};

export const CI_COUNSEL_STATUSES: CiCounselStatus[] = [
  "submitted",
  "reviewing",
  "response_ready",
  "closed",
];

export const CI_COUNSEL_STATUS_LABELS: Record<CiCounselStatus, string> = {
  submitted: "Submitted",
  reviewing: "Reviewing",
  response_ready: "Response Ready",
  closed: "Closed",
};

export const CI_OPEN_COUNSEL_STATUSES: CiCounselStatus[] = ["submitted", "reviewing"];

export type CiCounselRequest = {
  id: string;
  organization_id: string;
  subject: string;
  request_type: CiCounselRequestType;
  description: string;
  urgency: CiCounselUrgency;
  link_url: string | null;
  attachment_path: string | null;
  status: CiCounselStatus;
  submitted_by: string;
  created_at: string;
  updated_at: string;
  intelligence_item_id: string | null;
  opportunity_id: string | null;
  action_item_id: string | null;
  organization_name?: string | null;
  submitter_name?: string | null;
  intelligence_title?: string | null;
  opportunity_title?: string | null;
  action_title?: string | null;
  response?: string | null;
  response_updated_at?: string | null;
  internal_notes?: CiAdminNoteWithAuthor[];
};

export type CiCounselWriteInput = {
  organization_id: string;
  subject: string;
  request_type: CiCounselRequestType;
  description: string;
  urgency?: CiCounselUrgency;
  link_url?: string | null;
  attachment_path?: string | null;
  intelligence_item_id?: string | null;
  opportunity_id?: string | null;
  action_item_id?: string | null;
  submitted_by: string;
};

export type CiCounselInboxSummary = {
  submitted: number;
  urgent: number;
  waiting_response: number;
  aging: number;
};

export type CiPortalCounsel = {
  organization: CiOrganization;
  requests: CiCounselRequest[];
};

export type CiPortalDashboard = {
  organization: CiOrganization;
  items: CiIntelligenceItem[];
  checks: CiHealthCheck[];
  opportunities: CiOpportunity[];
  actions: CiActionItem[];
  counsel: CiCounselRequest[];
  weeklyBrief?: CiWeeklyBrief | null;
};

export type CiPilotStatus =
  | "invited"
  | "onboarding"
  | "active"
  | "needs_attention"
  | "completed"
  | "paused";

export const CI_PILOT_STATUSES: CiPilotStatus[] = [
  "invited",
  "onboarding",
  "active",
  "needs_attention",
  "completed",
  "paused",
];

export const CI_PILOT_STATUS_LABELS: Record<CiPilotStatus, string> = {
  invited: "Invited",
  onboarding: "Onboarding",
  active: "Active",
  needs_attention: "Needs Attention",
  completed: "Completed",
  paused: "Paused",
};

export type CiPilotEnrollment = {
  id: string;
  organization_id: string;
  organization_name?: string;
  status: CiPilotStatus;
  start_date: string | null;
  end_date: string | null;
  cohort: string | null;
  onboarding_complete_at: string | null;
  initial_health_complete_at: string | null;
  first_intelligence_at: string | null;
  first_client_login_at: string | null;
  first_action_completed_at: string | null;
  first_counsel_request_at: string | null;
  final_review_at: string | null;
  internal_notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CiPilotWriteInput = {
  organization_id: string;
  status?: CiPilotStatus;
  start_date?: string | null;
  end_date?: string | null;
  cohort?: string | null;
  onboarding_complete_at?: string | null;
  initial_health_complete_at?: string | null;
  first_intelligence_at?: string | null;
  first_intelligence_delivered?: boolean;
  first_client_login_at?: string | null;
  first_action_completed_at?: string | null;
  first_counsel_request_at?: string | null;
  final_review_at?: string | null;
  internal_notes?: string | null;
};

export type CiActivityEventType =
  | "onboarding_completed"
  | "portal_login"
  | "intelligence_viewed"
  | "opportunity_viewed"
  | "action_status_changed"
  | "messaging_copied"
  | "health_viewed"
  | "counsel_submitted"
  | "counsel_response_viewed";

export type CiActivityEvent = {
  id: string;
  organization_id: string;
  actor_user_id: string | null;
  event_type: CiActivityEventType;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
};

export type CiOrgActivitySummary = {
  last_client_activity: string | null;
  last_portal_login: string | null;
  actions_completed_this_month: number;
  opportunities_reviewed: number;
  counsel_requests_submitted: number;
};

export type CiOutcomeType =
  | "media_coverage"
  | "speaking_secured"
  | "partnership_secured"
  | "event_participation"
  | "messaging_updated"
  | "website_messaging_corrected"
  | "crisis_plan_created"
  | "public_statement_prepared"
  | "interview_completed"
  | "award_application"
  | "reputation_issue_addressed"
  | "process_created"
  | "other";

export const CI_OUTCOME_TYPES: CiOutcomeType[] = [
  "media_coverage",
  "speaking_secured",
  "partnership_secured",
  "event_participation",
  "messaging_updated",
  "website_messaging_corrected",
  "crisis_plan_created",
  "public_statement_prepared",
  "interview_completed",
  "award_application",
  "reputation_issue_addressed",
  "process_created",
  "other",
];

export const CI_OUTCOME_TYPE_LABELS: Record<CiOutcomeType, string> = {
  media_coverage: "Media coverage secured",
  speaking_secured: "Speaking opportunity secured",
  partnership_secured: "Partnership secured",
  event_participation: "Event participation",
  messaging_updated: "Messaging updated",
  website_messaging_corrected: "Website messaging corrected",
  crisis_plan_created: "Crisis plan created",
  public_statement_prepared: "Public statement prepared",
  interview_completed: "Interview completed",
  award_application: "Award application submitted",
  reputation_issue_addressed: "Reputation issue addressed",
  process_created: "Communications process created",
  other: "Other",
};

export type CiOutcome = {
  id: string;
  organization_id: string;
  outcome_type: CiOutcomeType;
  title: string;
  description: string | null;
  occurred_on: string | null;
  opportunity_id: string | null;
  action_item_id: string | null;
  intelligence_item_id: string | null;
  url: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  admin_notes?: string | null;
  admin_note_id?: string | null;
};

export type CiOutcomeWriteInput = {
  organization_id: string;
  outcome_type: CiOutcomeType;
  title: string;
  description?: string | null;
  occurred_on?: string | null;
  opportunity_id?: string | null;
  action_item_id?: string | null;
  intelligence_item_id?: string | null;
  url?: string | null;
  admin_notes?: string | null;
  created_by?: string | null;
};

export type CiReportStatus = "draft" | "ready_for_review" | "published" | "archived";

export const CI_REPORT_STATUSES: CiReportStatus[] = [
  "draft",
  "ready_for_review",
  "published",
  "archived",
];

export const CI_REPORT_STATUS_LABELS: Record<CiReportStatus, string> = {
  draft: "Draft",
  ready_for_review: "Ready for Review",
  published: "Published",
  archived: "Archived",
};

export type CiMonthlyReport = {
  id: string;
  organization_id: string;
  period_year: number;
  period_month: number;
  status: CiReportStatus;
  executive_summary: string | null;
  needed_attention: string | null;
  opportunities: string | null;
  actions_taken: string | null;
  health: string | null;
  outcomes: string | null;
  next_priorities: string | null;
  counsel: string | null;
  published_at: string | null;
  published_by: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CiMonthlyReportWriteInput = {
  organization_id: string;
  period_year: number;
  period_month: number;
  status?: CiReportStatus;
  executive_summary?: string | null;
  needed_attention?: string | null;
  opportunities?: string | null;
  actions_taken?: string | null;
  health?: string | null;
  outcomes?: string | null;
  next_priorities?: string | null;
  counsel?: string | null;
  created_by?: string | null;
};

export type CiBriefStatus = "draft" | "published" | "archived";

export const CI_BRIEF_STATUSES: CiBriefStatus[] = ["draft", "published", "archived"];

export const CI_BRIEF_STATUS_LABELS: Record<CiBriefStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

export type CiWeeklyBrief = {
  id: string;
  organization_id: string;
  week_of: string;
  needs_attention: string | null;
  best_opportunity: string | null;
  important_action: string | null;
  upcoming_moment: string | null;
  note: string | null;
  status: CiBriefStatus;
  published_at: string | null;
  published_by: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CiWeeklyBriefWriteInput = {
  organization_id: string;
  week_of: string;
  needs_attention?: string | null;
  best_opportunity?: string | null;
  important_action?: string | null;
  upcoming_moment?: string | null;
  note?: string | null;
  status?: CiBriefStatus;
  created_by?: string | null;
};

export type CiUsefulRating = "yes" | "somewhat" | "no";

export const CI_USEFUL_RATINGS: CiUsefulRating[] = ["yes", "somewhat", "no"];

export const CI_USEFUL_LABELS: Record<CiUsefulRating, string> = {
  yes: "Yes",
  somewhat: "Somewhat",
  no: "No",
};

export type CiRecommendationFeedback = {
  id: string;
  organization_id: string;
  related_type: "intelligence" | "opportunity" | "action" | "health" | "messaging" | "weekly_brief" | "monthly_report";
  related_id: string | null;
  useful: CiUsefulRating;
  why: string | null;
  created_by: string | null;
  created_at: string;
};

export type CiPilotFeedback = {
  id: string;
  organization_id: string;
  most_useful: string | null;
  confusing: string | null;
  wish: string | null;
  helped_decision: CiUsefulRating | null;
  created_by: string | null;
  created_at: string;
};

export type CiPortalProgress = {
  organization: CiOrganization;
  recommended_actions: number;
  completed_actions: number;
  opportunities_identified: number;
  issues_resolved: number;
  counsel_completed: number;
  outcomes: CiOutcome[];
};

export type CiPilotDashboard = {
  active_pilots: number;
  onboarding_complete: number;
  no_recent_activity: { id: string; name: string; days: number; overdue_actions: number; high_items: number }[];
  needing_attention: { id: string; name: string; reason: string }[];
  actions_completed: number;
  opportunities_identified: number;
  outcomes_recorded: number;
  counsel_requests: number;
  feedback_count: number;
  enrollments: CiPilotEnrollment[];
};

export type CiLearningSummary = {
  intelligence_categories: { key: string; count: number }[];
  health_needs_attention: { key: string; count: number }[];
  opportunity_types: { key: string; count: number }[];
  avg_actions_completed: number;
  counsel_requests: number;
  messaging_categories: { key: string; count: number }[];
  usefulness: { key: CiUsefulRating; count: number }[];
};

/** Workspace tabs — all CI modules through counsel */
export const CI_WORKSPACE_TABS = [
  { id: "overview", label: "Overview", enabled: true },
  { id: "intelligence", label: "Intelligence", enabled: true },
  { id: "health", label: "Health Check", enabled: true },
  { id: "messaging", label: "Messaging", enabled: true },
  { id: "opportunities", label: "Opportunities", enabled: true },
  { id: "actions", label: "Actions", enabled: true },
  { id: "counsel", label: "Counsel", enabled: true },
  { id: "outcomes", label: "Outcomes", enabled: true },
  { id: "reports", label: "Reports", enabled: true },
  { id: "pilot", label: "Pilot", enabled: true },
  { id: "notes", label: "Notes", enabled: true },
] as const;

export type CiWorkspaceTabId = (typeof CI_WORKSPACE_TABS)[number]["id"];
