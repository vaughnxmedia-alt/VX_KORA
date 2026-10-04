import {
  CI_ASSESSMENT_CATEGORIES,
  CI_ASSESSMENT_CATEGORY_LABELS,
  CI_ASSESSMENT_SECTION_STATUS_LABELS,
  CI_LOOKED_SOURCE_LABELS,
  type CiAssessmentProfileSnapshot,
  type CiAssessmentSection,
  type CiAssessmentSectionCategory,
  type CiAssessmentWorkflowStatus,
  type CiCommunicationAssessment,
  type CiLookedSource,
} from "./assessmentTypes";
import type { CiOrganization } from "./types";
import { parseSocialChannels } from "./workspace";

export function profileSnapshotFromOrg(org: CiOrganization): CiAssessmentProfileSnapshot {
  const social = parseSocialChannels(org.social_channels);
  return {
    name: org.name,
    organization_type: org.organization_type,
    website: org.website,
    primary_contact: org.primary_contact,
    description: org.description,
    primary_audiences: org.primary_audiences,
    communication_goals: org.communication_goals,
    major_challenges: org.major_challenges,
    pr_media_concerns: org.pr_media_concerns,
    reputation_concerns: org.reputation_concerns,
    upcoming_events: org.upcoming_events,
    current_services: org.current_services,
    assessment_notes: org.assessment_notes,
    social_channels: {
      instagram: social.instagram,
      facebook: social.facebook,
      tiktok: social.tiktok,
      linkedin: social.linkedin,
      other: social.other,
    },
  };
}

function line(label: string, value: string | null | undefined) {
  const text = value?.trim() || "—";
  return `${label} ${text}`;
}

function channelsLine(snapshot: CiAssessmentProfileSnapshot) {
  const social = snapshot.social_channels ?? {};
  const parts = [
    social.instagram ? `Instagram: ${social.instagram}` : null,
    social.facebook ? `Facebook: ${social.facebook}` : null,
    social.tiktok ? `TikTok: ${social.tiktok}` : null,
    social.linkedin ? `LinkedIn: ${social.linkedin}` : null,
    social.other ? `Other: ${social.other}` : null,
    snapshot.website ? `Website: ${snapshot.website}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

function lookedLine(values: CiLookedSource[] | undefined) {
  if (!values?.length) return "—";
  return values.map((v) => CI_LOOKED_SOURCE_LABELS[v] || v).join(", ");
}

export function buildInternalFindingsReport(
  snapshot: CiAssessmentProfileSnapshot,
  sections: CiAssessmentSection[],
): string {
  const byCategory = new Map(sections.map((s) => [s.category, s]));
  const profile = [
    "ORGANIZATION PROFILE",
    "",
    line("Organization:", snapshot.name),
    line("What They Do:", snapshot.description),
    line("Who They Serve:", snapshot.primary_audiences),
    line("Communications Goals:", snapshot.communication_goals),
    line("Current Needs:", snapshot.major_challenges),
    line("Visibility Concerns:", snapshot.pr_media_concerns),
    line("Reputation Concerns:", snapshot.reputation_concerns),
    line("Upcoming Dates:", snapshot.upcoming_events),
    line("Current Channels:", channelsLine(snapshot)),
    line("Current Services/Programs/Products:", snapshot.current_services),
    line("Additional Notes:", snapshot.assessment_notes),
    "",
    "INTERNAL COMMUNICATIONS ASSESSMENT",
  ];

  for (const category of CI_ASSESSMENT_CATEGORIES) {
    const row = byCategory.get(category);
    profile.push(
      "",
      CI_ASSESSMENT_CATEGORY_LABELS[category],
      "",
      line("Where We Looked:", lookedLine(row?.where_looked)),
      line("What We Observed:", row?.what_observed),
      line(
        "Status:",
        row ? CI_ASSESSMENT_SECTION_STATUS_LABELS[row.status_label] : "Not Enough Information",
      ),
      line("Short Assessment:", row?.short_assessment),
      line("Why It Could Matter:", row?.why_could_matter),
      line("Potential Next Step:", row?.potential_next_step),
      line("Internal Score:", row?.internal_score != null ? String(row.internal_score) : "—"),
    );
  }

  return profile.join("\n");
}

export function sectionIsFilled(section: CiAssessmentSection | null | undefined) {
  if (!section) return false;
  return Boolean(
    section.what_observed?.trim() ||
      section.short_assessment?.trim() ||
      (section.where_looked?.length ?? 0) > 0 ||
      section.status_label !== "not_enough_information",
  );
}

export function countFilledSections(sections: CiAssessmentSection[]) {
  return CI_ASSESSMENT_CATEGORIES.filter((category) =>
    sectionIsFilled(sections.find((s) => s.category === category)),
  ).length;
}

export function deriveWorkflowStatus(input: {
  profileComplete: boolean;
  filledSections: number;
  hasFindings: boolean;
  priorityCount: number;
  step3Status: CiCommunicationAssessment["step3_status"];
}): CiAssessmentWorkflowStatus {
  if (input.step3Status === "delivered") return "delivered";
  if (input.step3Status === "approved") return "approved";
  if (input.step3Status === "under_review") return "under_review";
  if (input.priorityCount > 0) return "recommendations_drafted";
  if (input.hasFindings && input.filledSections >= CI_ASSESSMENT_CATEGORIES.length) {
    return "ready_for_chatgpt";
  }
  if (input.filledSections >= CI_ASSESSMENT_CATEGORIES.length) return "assessment_complete";
  if (input.filledSections > 0) return "assessment_in_progress";
  if (input.profileComplete) return "profile_complete";
  return "draft_profile";
}

export function assessmentStepState(
  assessment: CiCommunicationAssessment | null | undefined,
  filledSections: number,
): {
  profile: "complete" | "in_progress" | "not_started";
  assessment: "complete" | "in_progress" | "not_started";
  priorities: "complete" | "in_progress" | "not_started";
} {
  if (!assessment) {
    return { profile: "not_started", assessment: "not_started", priorities: "not_started" };
  }
  const status = assessment.workflow_status;
  const profile =
    status === "draft_profile" ? "in_progress" : "complete";
  const assessmentStep =
    filledSections >= CI_ASSESSMENT_CATEGORIES.length
      ? "complete"
      : filledSections > 0 ||
          ["assessment_in_progress", "profile_complete"].includes(status)
        ? filledSections > 0
          ? "in_progress"
          : status === "profile_complete"
            ? "not_started"
            : "in_progress"
        : status === "draft_profile"
          ? "not_started"
          : "in_progress";
  const priorities =
    assessment.step3_status === "approved" || assessment.step3_status === "delivered"
      ? "complete"
      : assessment.step3_status === "under_review" ||
          status === "recommendations_drafted" ||
          status === "ready_for_chatgpt"
        ? "in_progress"
        : "not_started";

  return {
    profile: profile as "complete" | "in_progress" | "not_started",
    assessment:
      filledSections >= 6
        ? "complete"
        : filledSections > 0
          ? "in_progress"
          : assessmentStep === "not_started"
            ? "not_started"
            : "not_started",
    priorities,
  };
}

export function emptySection(
  assessmentId: string,
  category: CiAssessmentSectionCategory,
): Omit<CiAssessmentSection, "id" | "created_at" | "updated_at"> {
  return {
    assessment_id: assessmentId,
    category,
    where_looked: [],
    what_observed: null,
    status_label: "not_enough_information",
    short_assessment: null,
    why_could_matter: null,
    potential_next_step: null,
    internal_score: null,
    assessed_by: null,
    assessed_at: null,
  };
}
