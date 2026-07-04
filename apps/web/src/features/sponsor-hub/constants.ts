export type SponsorRequestStatus = "pending_review" | "approved" | "rejected" | "archived";

export type SponsorRequestTypeKey =
  | "community_events"
  | "nonprofits"
  | "youth_programs"
  | "business_conferences"
  | "awards_shows"
  | "arts_culture"
  | "education"
  | "other";

export type SponsorHubBestFitKey =
  | "events"
  | "nonprofits"
  | "community_programs"
  | "youth_programs"
  | "arts_culture"
  | "business_events"
  | "other";

export const SPONSOR_REQUEST_DISCLAIMER =
  "Submitting this form does not guarantee sponsorship opportunities. Businesses accepted into the JahKnowsPR Firm Strategic Sponsor Hub may be considered when sponsorship opportunities align with their interests.";

export const SPONSORSHIP_TYPE_OPTIONS: { value: SponsorRequestTypeKey; label: string }[] = [
  { value: "community_events", label: "Community Events" },
  { value: "nonprofits", label: "Nonprofits" },
  { value: "youth_programs", label: "Youth Programs" },
  { value: "business_conferences", label: "Business Conferences" },
  { value: "awards_shows", label: "Awards Shows" },
  { value: "arts_culture", label: "Arts & Culture" },
  { value: "education", label: "Education" },
  { value: "other", label: "Other" },
];

export const SPONSOR_REQUEST_STATUS_OPTIONS: { value: SponsorRequestStatus; label: string }[] = [
  { value: "pending_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "archived", label: "Archived" },
];

export const REQUEST_TYPE_TO_BEST_FIT: Record<SponsorRequestTypeKey, SponsorHubBestFitKey> = {
  community_events: "events",
  nonprofits: "nonprofits",
  youth_programs: "youth_programs",
  business_conferences: "business_events",
  awards_shows: "events",
  arts_culture: "arts_culture",
  education: "community_programs",
  other: "other",
};

export function sponsorRequestTypeLabel(value: string) {
  return SPONSORSHIP_TYPE_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

export function sponsorRequestStatusLabel(value: SponsorRequestStatus) {
  return SPONSOR_REQUEST_STATUS_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

export function mapRequestTypesToBestFit(types: string[]): SponsorHubBestFitKey[] {
  return Array.from(
    new Set(
      types
        .map((type) => REQUEST_TYPE_TO_BEST_FIT[type as SponsorRequestTypeKey])
        .filter(Boolean),
    ),
  );
}

export function buildSponsorNotesFromRequest(request: {
  job_title?: string | null;
  company_description?: string | null;
  community_initiatives?: string | null;
  geographic_areas_served?: string | null;
  annual_sponsorship_budget?: string | null;
  preferred_opportunities?: string | null;
  linkedin?: string | null;
  additional_comments?: string | null;
  sponsorship_types?: string[] | null;
  created_at?: string | null;
}) {
  const parts = [
    request.job_title ? `Job title: ${request.job_title}` : null,
    request.company_description ? `Company description: ${request.company_description}` : null,
    request.community_initiatives ? `Community initiatives: ${request.community_initiatives}` : null,
    request.geographic_areas_served ? `Geographic areas served: ${request.geographic_areas_served}` : null,
    request.annual_sponsorship_budget ? `Annual sponsorship budget: ${request.annual_sponsorship_budget}` : null,
    request.preferred_opportunities ? `Preferred opportunities: ${request.preferred_opportunities}` : null,
    request.linkedin ? `LinkedIn: ${request.linkedin}` : null,
    request.sponsorship_types?.length
      ? `Sponsorship interests: ${request.sponsorship_types.map(sponsorRequestTypeLabel).join(", ")}`
      : null,
    request.additional_comments ? `Additional comments: ${request.additional_comments}` : null,
    request.created_at ? `Original request submitted: ${request.created_at}` : null,
  ].filter(Boolean);

  return parts.join("\n\n");
}
