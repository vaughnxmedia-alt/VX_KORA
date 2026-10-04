export type CiAssessmentWorkflowStatus =
  | "draft_profile"
  | "profile_complete"
  | "assessment_in_progress"
  | "assessment_complete"
  | "ready_for_chatgpt"
  | "recommendations_drafted"
  | "under_review"
  | "approved"
  | "delivered";

export type CiAssessmentStep3Status = "draft" | "under_review" | "approved" | "delivered";

export type CiAssessmentSectionCategory =
  | "messaging"
  | "visibility"
  | "reputation"
  | "media_readiness"
  | "crisis_readiness"
  | "brand_consistency";

export type CiAssessmentSectionStatus =
  | "strong"
  | "needs_attention"
  | "significant_gap"
  | "not_enough_information";

export type CiLookedSource =
  | "website"
  | "social_media"
  | "organization_profile"
  | "owner_conversation"
  | "existing_materials"
  | "other";

export type CiPriorityLevel = "address_now" | "strengthen_next" | "maintain";
export type CiSupportType = "internal" | "strategic_support";
export type CiRecommendedService =
  | "strategic_communications_session"
  | "strategic_communications_pr_project"
  | "ongoing_strategic_communications_counsel";

export const CI_ASSESSMENT_CATEGORIES: CiAssessmentSectionCategory[] = [
  "messaging",
  "visibility",
  "reputation",
  "media_readiness",
  "crisis_readiness",
  "brand_consistency",
];

export const CI_ASSESSMENT_CATEGORY_LABELS: Record<CiAssessmentSectionCategory, string> = {
  messaging: "Messaging",
  visibility: "Visibility",
  reputation: "Reputation",
  media_readiness: "Media Readiness",
  crisis_readiness: "Crisis Readiness",
  brand_consistency: "Brand Consistency",
};

export const CI_ASSESSMENT_SECTION_STATUSES: CiAssessmentSectionStatus[] = [
  "strong",
  "needs_attention",
  "significant_gap",
  "not_enough_information",
];

export const CI_ASSESSMENT_SECTION_STATUS_LABELS: Record<CiAssessmentSectionStatus, string> = {
  strong: "Strong",
  needs_attention: "Needs Attention",
  significant_gap: "Significant Gap",
  not_enough_information: "Not Enough Information",
};

export const CI_LOOKED_SOURCES: CiLookedSource[] = [
  "website",
  "social_media",
  "organization_profile",
  "owner_conversation",
  "existing_materials",
  "other",
];

export const CI_LOOKED_SOURCE_LABELS: Record<CiLookedSource, string> = {
  website: "Website",
  social_media: "Social media",
  organization_profile: "Organization Profile",
  owner_conversation: "Owner/client conversation",
  existing_materials: "Existing materials",
  other: "Other",
};

export const CI_WORKFLOW_STATUSES: CiAssessmentWorkflowStatus[] = [
  "draft_profile",
  "profile_complete",
  "assessment_in_progress",
  "assessment_complete",
  "ready_for_chatgpt",
  "recommendations_drafted",
  "under_review",
  "approved",
  "delivered",
];

export const CI_WORKFLOW_STATUS_LABELS: Record<CiAssessmentWorkflowStatus, string> = {
  draft_profile: "Draft Profile",
  profile_complete: "Profile Complete",
  assessment_in_progress: "Assessment In Progress",
  assessment_complete: "Assessment Complete",
  ready_for_chatgpt: "Ready for ChatGPT",
  recommendations_drafted: "Recommendations Drafted",
  under_review: "Under Review",
  approved: "Approved",
  delivered: "Delivered",
};

export const CI_STEP3_STATUSES: CiAssessmentStep3Status[] = [
  "draft",
  "under_review",
  "approved",
  "delivered",
];

export const CI_STEP3_STATUS_LABELS: Record<CiAssessmentStep3Status, string> = {
  draft: "Draft",
  under_review: "Under Review",
  approved: "Approved",
  delivered: "Delivered",
};

export const CI_PRIORITY_LEVELS: CiPriorityLevel[] = ["address_now", "strengthen_next", "maintain"];

export const CI_PRIORITY_LEVEL_LABELS: Record<CiPriorityLevel, string> = {
  address_now: "Address Now",
  strengthen_next: "Strengthen Next",
  maintain: "Maintain",
};

export const CI_SUPPORT_TYPES: CiSupportType[] = ["internal", "strategic_support"];

export const CI_SUPPORT_TYPE_LABELS: Record<CiSupportType, string> = {
  internal: "Can Be Addressed Internally",
  strategic_support: "Strategic Support Recommended",
};

export const CI_RECOMMENDED_SERVICES: CiRecommendedService[] = [
  "strategic_communications_session",
  "strategic_communications_pr_project",
  "ongoing_strategic_communications_counsel",
];

export const CI_RECOMMENDED_SERVICE_LABELS: Record<CiRecommendedService, string> = {
  strategic_communications_session: "Strategic Communications Session",
  strategic_communications_pr_project: "Strategic Communications + PR Project",
  ongoing_strategic_communications_counsel: "Ongoing Strategic Communications Counsel",
};

export type CiAssessmentProfileSnapshot = {
  name?: string | null;
  organization_type?: string | null;
  website?: string | null;
  primary_contact?: string | null;
  description?: string | null;
  primary_audiences?: string | null;
  communication_goals?: string | null;
  major_challenges?: string | null;
  pr_media_concerns?: string | null;
  reputation_concerns?: string | null;
  upcoming_events?: string | null;
  current_services?: string | null;
  assessment_notes?: string | null;
  social_channels?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    linkedin?: string;
    other?: string;
  };
};

export type CiCommunicationAssessment = {
  id: string;
  organization_id: string;
  title: string | null;
  workflow_status: CiAssessmentWorkflowStatus;
  step3_status: CiAssessmentStep3Status;
  assigned_to: string | null;
  created_by: string | null;
  reviewed_by: string | null;
  approved_by: string | null;
  profile_snapshot: CiAssessmentProfileSnapshot;
  findings_report: string | null;
  findings_generated_at: string | null;
  findings_generated_by: string | null;
  recommended_order: string | null;
  overall_direction: string | null;
  started_at: string;
  approved_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  organization_name?: string | null;
  assigned_name?: string | null;
};

export type CiAssessmentSection = {
  id: string;
  assessment_id: string;
  category: CiAssessmentSectionCategory;
  where_looked: CiLookedSource[];
  what_observed: string | null;
  status_label: CiAssessmentSectionStatus;
  short_assessment: string | null;
  why_could_matter: string | null;
  potential_next_step: string | null;
  internal_score: number | null;
  assessed_by: string | null;
  assessed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CiAssessmentSectionWrite = {
  assessment_id: string;
  category: CiAssessmentSectionCategory;
  where_looked?: CiLookedSource[];
  what_observed?: string | null;
  status_label?: CiAssessmentSectionStatus;
  short_assessment?: string | null;
  why_could_matter?: string | null;
  potential_next_step?: string | null;
  internal_score?: number | null;
  assessed_by?: string | null;
  assessed_at?: string | null;
};

export type CiCommunicationPriority = {
  id: string;
  assessment_id: string;
  sort_order: number;
  title: string;
  priority_level: CiPriorityLevel;
  what_we_noticed: string | null;
  why_it_matters: string | null;
  recommendation: string | null;
  next_practical_step: string | null;
  support_type: CiSupportType;
  recommended_service: CiRecommendedService | null;
  created_at: string;
  updated_at: string;
};

export type CiCommunicationPriorityWrite = {
  assessment_id: string;
  sort_order: number;
  title: string;
  priority_level: CiPriorityLevel;
  what_we_noticed?: string | null;
  why_it_matters?: string | null;
  recommendation?: string | null;
  next_practical_step?: string | null;
  support_type: CiSupportType;
  recommended_service?: CiRecommendedService | null;
};

export type CiAssessmentVersion = {
  id: string;
  assessment_id: string;
  version_number: number;
  snapshot: Record<string, unknown>;
  note: string | null;
  created_by: string | null;
  created_at: string;
};
