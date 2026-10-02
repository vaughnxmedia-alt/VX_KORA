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
  key_spokespersons: unknown;
  social_channels: unknown;
  status: CiOrgStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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

/** Workspace tabs — Overview + Notes live now; others are placeholders for later phases */
export const CI_WORKSPACE_TABS = [
  { id: "overview", label: "Overview", enabled: true },
  { id: "notes", label: "Notes", enabled: true },
  { id: "intelligence", label: "Intelligence", enabled: false },
  { id: "health", label: "Health Check", enabled: false },
  { id: "messaging", label: "Messaging", enabled: false },
  { id: "opportunities", label: "Opportunities", enabled: false },
  { id: "actions", label: "Actions", enabled: false },
  { id: "counsel", label: "Counsel Requests", enabled: false },
] as const;

export type CiWorkspaceTabId = (typeof CI_WORKSPACE_TABS)[number]["id"];
