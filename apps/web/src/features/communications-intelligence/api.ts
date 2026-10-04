import { supabase } from "@/integrations/supabase/client";
import type {
  CiActionItem,
  CiActionStatus,
  CiActionWriteInput,
  CiAdminNote,
  CiAdminNoteWithAuthor,
  CiHealthBoard,
  CiHealthCheck,
  CiHealthWriteInput,
  CiIntelligenceItem,
  CiIntelligenceWriteInput,
  CiIntelligenceCategory,
  CiIntelligencePriority,
  CiIntelligenceStatus,
  CiMemberRole,
  CiMessagingEntry,
  CiMessagingLibrary,
  CiMessagingWriteInput,
  CiOpportunity,
  CiOpportunityStatus,
  CiOpportunityType,
  CiOpportunityWriteInput,
  CiOrgCreateInput,
  CiOrgStatus,
  CiOrgWorkspaceCounts,
  CiOrganization,
  CiOrganizationListItem,
  CiOrganizationMember,
  CiCounselInboxSummary,
  CiCounselRequest,
  CiCounselRequestType,
  CiCounselStatus,
  CiCounselUrgency,
  CiCounselWriteInput,
  CiInvitePreview,
  CiMemberStatus,
  CiOpsSummary,
  CiOrganizationInvitation,
  CiOrgProfileInput,
  CiOutcome,
  CiOutcomeWriteInput,
  CiMonthlyReport,
  CiMonthlyReportWriteInput,
  CiPilotDashboard,
  CiPilotEnrollment,
  CiPilotFeedback,
  CiPilotWriteInput,
  CiPortalActions,
  CiPortalCounsel,
  CiPortalDashboard,
  CiPortalOpportunities,
  CiPortalProgress,
  CiPriority,
  CiRecommendationFeedback,
  CiUsefulRating,
  CiWeeklyBrief,
  CiWeeklyBriefWriteInput,
  CiActivityEventType,
  CiLearningSummary,
  CiOrgActivitySummary,
  CiReportStatus,
} from "./types";
import { ciFriendlyError, isHealthAssessed, workflowFromCounts } from "./workspace";
import {
  CI_ACTIVE_INTELLIGENCE_STATUSES,
  CI_ACTIVE_OPPORTUNITY_STATUSES,
  CI_OPEN_ACTION_STATUSES,
  CI_OPEN_COUNSEL_STATUSES,
} from "./types";

const COUNSEL_REQUEST_COLUMNS =
  "id, organization_id, subject, request_type, description, urgency, link_url, attachment_path, status, submitted_by, created_at, updated_at, intelligence_item_id, opportunity_id, action_item_id";

/** Untyped until generated types include ci_* tables. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function emptyStringToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

async function attachReviewerNames(rows: CiHealthCheck[]): Promise<CiHealthCheck[]> {
  const ids = [...new Set(rows.map((r) => r.assessed_by).filter(Boolean))] as string[];
  if (!ids.length) return rows;
  const { data: profiles } = await db.from("profiles").select("id, full_name").in("id", ids);
  const byId = new Map<string, { full_name?: string | null }>();
  for (const p of (profiles ?? []) as { id: string; full_name?: string | null }[]) {
    byId.set(p.id, p);
  }
  return rows.map((row) => ({
    ...row,
    reviewer_name: row.assessed_by ? byId.get(row.assessed_by)?.full_name ?? null : null,
  }));
}

async function attachMessagingAdminNotes(
  organizationId: string,
  rows: CiMessagingEntry[],
): Promise<CiMessagingEntry[]> {
  if (!rows.length) return rows;
  const { data } = await db
    .from("ci_admin_notes")
    .select("id, entity_id, body, updated_at")
    .eq("organization_id", organizationId)
    .eq("entity_type", "messaging_entry");
  const latest = new Map<string, { id: string; body: string; updated_at: string }>();
  for (const note of (data ?? []) as { id: string; entity_id: string | null; body: string; updated_at: string }[]) {
    if (!note.entity_id) continue;
    const existing = latest.get(note.entity_id);
    if (!existing || note.updated_at > existing.updated_at) latest.set(note.entity_id, note);
  }
  return rows.map((row) => {
    const note = latest.get(row.id);
    return {
      ...row,
      admin_notes: note?.body ?? null,
      admin_note_id: note?.id ?? null,
    };
  });
}

async function upsertMessagingAdminNote(input: {
  organizationId: string;
  entryId: string;
  body: string;
  createdBy: string | null;
}) {
  const trimmed = input.body.trim();
  const { data: existing } = await db
    .from("ci_admin_notes")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("entity_type", "messaging_entry")
    .eq("entity_id", input.entryId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!trimmed) {
    if (existing?.id) await db.from("ci_admin_notes").delete().eq("id", existing.id);
    return;
  }

  if (existing?.id) {
    await db.from("ci_admin_notes").update({ body: trimmed }).eq("id", existing.id);
    return;
  }

  if (!input.createdBy) return;
  await db.from("ci_admin_notes").insert({
    organization_id: input.organizationId,
    entity_type: "messaging_entry",
    entity_id: input.entryId,
    body: trimmed,
    created_by: input.createdBy,
  });
}

async function attachActionRelations(rows: CiActionItem[]): Promise<CiActionItem[]> {
  if (!rows.length) return rows;
  const assigneeIds = [...new Set(rows.map((r) => r.assigned_to).filter(Boolean))] as string[];
  const opportunityIds = [...new Set(rows.map((r) => r.opportunity_id).filter(Boolean))] as string[];
  const intelligenceIds = [...new Set(rows.map((r) => r.intelligence_item_id).filter(Boolean))] as string[];

  const [profilesRes, opportunitiesRes, intelligenceRes] = await Promise.all([
    assigneeIds.length
      ? db.from("profiles").select("id, full_name").in("id", assigneeIds)
      : Promise.resolve({ data: [] }),
    opportunityIds.length
      ? db.from("ci_opportunities").select("id, title").in("id", opportunityIds)
      : Promise.resolve({ data: [] }),
    intelligenceIds.length
      ? db.from("ci_intelligence_items").select("id, title").in("id", intelligenceIds)
      : Promise.resolve({ data: [] }),
  ]);

  const names = new Map<string, string | null>();
  for (const p of (profilesRes.data ?? []) as { id: string; full_name?: string | null }[]) {
    names.set(p.id, p.full_name ?? null);
  }
  const opportunities = new Map<string, string>();
  for (const row of (opportunitiesRes.data ?? []) as { id: string; title: string }[]) {
    opportunities.set(row.id, row.title);
  }
  const intelligence = new Map<string, string>();
  for (const row of (intelligenceRes.data ?? []) as { id: string; title: string }[]) {
    intelligence.set(row.id, row.title);
  }

  return rows.map((row) => ({
    ...row,
    assignee_name: row.assigned_to ? names.get(row.assigned_to) ?? null : null,
    opportunity_title: row.opportunity_id ? opportunities.get(row.opportunity_id) ?? null : null,
    intelligence_title: row.intelligence_item_id ? intelligence.get(row.intelligence_item_id) ?? null : null,
  }));
}

async function attachCounselRelations(
  rows: CiCounselRequest[],
  options?: { includeNotes?: boolean },
): Promise<CiCounselRequest[]> {
  if (!rows.length) return rows;
  const orgIds = [...new Set(rows.map((r) => r.organization_id))];
  const submitterIds = [...new Set(rows.map((r) => r.submitted_by).filter(Boolean))];
  const opportunityIds = [...new Set(rows.map((r) => r.opportunity_id).filter(Boolean))] as string[];
  const intelligenceIds = [...new Set(rows.map((r) => r.intelligence_item_id).filter(Boolean))] as string[];
  const actionIds = [...new Set(rows.map((r) => r.action_item_id).filter(Boolean))] as string[];
  const requestIds = rows.map((r) => r.id);

  const [orgsRes, profilesRes, opportunitiesRes, intelligenceRes, actionsRes, responsesRes, notesRes] =
    await Promise.all([
      orgIds.length
        ? db.from("ci_organizations").select("id, name").in("id", orgIds)
        : Promise.resolve({ data: [] }),
      submitterIds.length
        ? db.from("profiles").select("id, full_name").in("id", submitterIds)
        : Promise.resolve({ data: [] }),
      opportunityIds.length
        ? db.from("ci_opportunities").select("id, title").in("id", opportunityIds)
        : Promise.resolve({ data: [] }),
      intelligenceIds.length
        ? db.from("ci_intelligence_items").select("id, title").in("id", intelligenceIds)
        : Promise.resolve({ data: [] }),
      actionIds.length
        ? db.from("ci_action_items").select("id, title").in("id", actionIds)
        : Promise.resolve({ data: [] }),
      requestIds.length
        ? db
            .from("ci_counsel_responses")
            .select("request_id, body, updated_at")
            .in("request_id", requestIds)
        : Promise.resolve({ data: [] }),
      options?.includeNotes && requestIds.length
        ? db
            .from("ci_admin_notes")
            .select("*")
            .eq("entity_type", "counsel_request")
            .in("entity_id", requestIds)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);

  const orgNames = new Map<string, string>();
  for (const row of (orgsRes.data ?? []) as { id: string; name: string }[]) orgNames.set(row.id, row.name);
  const names = new Map<string, string | null>();
  for (const p of (profilesRes.data ?? []) as { id: string; full_name?: string | null }[]) {
    names.set(p.id, p.full_name ?? null);
  }
  const opportunities = new Map<string, string>();
  for (const row of (opportunitiesRes.data ?? []) as { id: string; title: string }[]) {
    opportunities.set(row.id, row.title);
  }
  const intelligence = new Map<string, string>();
  for (const row of (intelligenceRes.data ?? []) as { id: string; title: string }[]) {
    intelligence.set(row.id, row.title);
  }
  const actions = new Map<string, string>();
  for (const row of (actionsRes.data ?? []) as { id: string; title: string }[]) {
    actions.set(row.id, row.title);
  }
  const responses = new Map<string, { body: string; updated_at: string }>();
  for (const row of (responsesRes.data ?? []) as { request_id: string; body: string; updated_at: string }[]) {
    responses.set(row.request_id, row);
  }
  const notesByRequest = new Map<string, CiAdminNoteWithAuthor[]>();
  const noteRows = (notesRes.data ?? []) as CiAdminNote[];
  const noteAuthors = [...new Set(noteRows.map((n) => n.created_by).filter(Boolean))] as string[];
  const noteProfiles = noteAuthors.length
    ? ((await db.from("profiles").select("id, full_name").in("id", noteAuthors)).data ?? [])
    : [];
  const noteNames = new Map<string, string | null>();
  for (const p of noteProfiles as { id: string; full_name?: string | null }[]) {
    noteNames.set(p.id, p.full_name ?? null);
  }
  for (const note of noteRows) {
    const list = notesByRequest.get(note.entity_id || "") ?? [];
    list.push({
      ...note,
      author_name: note.created_by ? noteNames.get(note.created_by) ?? null : null,
    });
    if (note.entity_id) notesByRequest.set(note.entity_id, list);
  }

  return rows.map((row) => {
    const response = responses.get(row.id);
    return {
      ...row,
      organization_name: orgNames.get(row.organization_id) ?? null,
      submitter_name: names.get(row.submitted_by) ?? null,
      opportunity_title: row.opportunity_id ? opportunities.get(row.opportunity_id) ?? null : null,
      intelligence_title: row.intelligence_item_id
        ? intelligence.get(row.intelligence_item_id) ?? null
        : null,
      action_title: row.action_item_id ? actions.get(row.action_item_id) ?? null : null,
      response: response?.body ?? null,
      response_updated_at: response?.updated_at ?? null,
      internal_notes: options?.includeNotes ? notesByRequest.get(row.id) ?? [] : undefined,
    };
  });
}

async function resolvePortalOrganization(userId: string, organizationId?: string) {
  const memberships = await ciApi.portal.listMemberships(userId);
  if (!memberships.length) return null;
  const selectedId =
    organizationId && memberships.some((m) => m.organization_id === organizationId)
      ? organizationId
      : memberships[0].organization_id;
  const organization = await ciApi.organizations.get(selectedId);
  if (!organization) return null;
  return { organization, organizationId: selectedId };
}

export const ciApi = {
  organizations: {
    list: async (filters?: {
      status?: CiOrgStatus | "all";
      search?: string;
    }): Promise<CiOrganizationListItem[]> => {
      let q = db
        .from("ci_organizations")
        .select(
          `
          *,
          hq_client:hq_clients (
            id,
            client_name,
            primary_contact,
            email
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "all") {
        q = q.eq("status", filters.status);
      }

      const search = filters?.search?.trim();
      if (search) {
        q = q.or(
          `name.ilike.%${search}%,industry.ilike.%${search}%,location.ilike.%${search}%,website.ilike.%${search}%`,
        );
      }

      const { data, error } = await q;
      if (error) throw error;

      const rows = (data ?? []) as CiOrganizationListItem[];
      if (!rows.length) return [];

      const ids = rows.map((r) => r.id);
      const { data: members, error: memberError } = await db
        .from("ci_organization_members")
        .select("organization_id")
        .in("organization_id", ids)
        .eq("status", "active");

      if (memberError) {
        // Membership counts are secondary; don't fail the list if the table is empty/unavailable.
        return rows.map((r) => ({ ...r, member_count: 0 }));
      }

      const counts = new Map<string, number>();
      for (const m of (members ?? []) as { organization_id: string }[]) {
        counts.set(m.organization_id, (counts.get(m.organization_id) ?? 0) + 1);
      }

      return rows.map((r) => ({
        ...r,
        member_count: counts.get(r.id) ?? 0,
      }));
    },

    get: async (id: string): Promise<CiOrganizationListItem | null> => {
      const { data, error } = await db
        .from("ci_organizations")
        .select(
          `
          *,
          hq_client:hq_clients (
            id,
            client_name,
            primary_contact,
            email
          )
        `,
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return data as CiOrganizationListItem;
    },

    create: async (input: CiOrgCreateInput): Promise<CiOrganization> => {
      const payload = {
        name: input.name.trim(),
        organization_type: input.organization_type ?? null,
        industry: emptyStringToNull(input.industry),
        website: emptyStringToNull(input.website),
        location: emptyStringToNull(input.location),
        description: emptyStringToNull(input.description),
        status: input.status ?? "active",
        hq_client_id: input.hq_client_id || null,
        created_by: input.created_by ?? null,
      };

      const { data, error } = await db
        .from("ci_organizations")
        .insert({ ...payload, onboarding_status: "not_started" })
        .select("*")
        .single();
      if (error) throw new Error(ciFriendlyError(error));
      return data as CiOrganization;
    },

    saveProfile: async (id: string, input: CiOrgProfileInput): Promise<CiOrganization> => {
      const payload: Record<string, unknown> = {};
      if (input.name !== undefined) payload.name = input.name.trim();
      if (input.organization_type !== undefined) payload.organization_type = input.organization_type;
      if (input.industry !== undefined) payload.industry = emptyStringToNull(input.industry);
      if (input.website !== undefined) payload.website = emptyStringToNull(input.website);
      if (input.location !== undefined) payload.location = emptyStringToNull(input.location);
      if (input.description !== undefined) payload.description = emptyStringToNull(input.description);
      if (input.primary_audiences !== undefined) {
        payload.primary_audiences = emptyStringToNull(input.primary_audiences);
      }
      if (input.communication_goals !== undefined) {
        payload.communication_goals = emptyStringToNull(input.communication_goals);
      }
      if (input.major_challenges !== undefined) payload.major_challenges = emptyStringToNull(input.major_challenges);
      if (input.upcoming_events !== undefined) payload.upcoming_events = emptyStringToNull(input.upcoming_events);
      if (input.key_spokespersons !== undefined) payload.key_spokespersons = input.key_spokespersons;
      if (input.social_channels !== undefined) payload.social_channels = input.social_channels;
      if (input.pr_media_concerns !== undefined) {
        payload.pr_media_concerns = emptyStringToNull(input.pr_media_concerns);
      }
      if (input.reputation_concerns !== undefined) {
        payload.reputation_concerns = emptyStringToNull(input.reputation_concerns);
      }
      if (input.has_approved_messaging !== undefined) {
        payload.has_approved_messaging = input.has_approved_messaging;
      }
      if (input.onboarding_status !== undefined) payload.onboarding_status = input.onboarding_status;
      if (input.onboarding_status === "completed") {
        payload.onboarding_completed_at = new Date().toISOString();
      } else if (input.onboarding_status === "in_progress" || input.onboarding_status === "not_started") {
        payload.onboarding_completed_at = null;
      }
      const { data, error } = await db.from("ci_organizations").update(payload).eq("id", id).select("*").single();
      if (error) throw new Error(ciFriendlyError(error));
      return data as CiOrganization;
    },

    update: async (
      id: string,
      input: Partial<CiOrgCreateInput>,
    ): Promise<CiOrganization> => {
      const payload: Record<string, unknown> = {};
      if (input.name !== undefined) payload.name = input.name.trim();
      if (input.organization_type !== undefined) payload.organization_type = input.organization_type;
      if (input.industry !== undefined) payload.industry = emptyStringToNull(input.industry);
      if (input.website !== undefined) payload.website = emptyStringToNull(input.website);
      if (input.location !== undefined) payload.location = emptyStringToNull(input.location);
      if (input.description !== undefined) payload.description = emptyStringToNull(input.description);
      if (input.status !== undefined) payload.status = input.status;
      if (input.hq_client_id !== undefined) payload.hq_client_id = input.hq_client_id || null;

      const { data, error } = await db
        .from("ci_organizations")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data as CiOrganization;
    },

    remove: async (id: string): Promise<void> => {
      const { data, error } = await db.from("ci_organizations").delete().eq("id", id).select("id");
      if (error) throw new Error(ciFriendlyError(error));
      if (!data?.length) throw new Error("This client could not be deleted.");
    },
  },

  workspace: {
    counts: async (organizationId: string): Promise<CiOrgWorkspaceCounts> => {
      const [members, intelligence, opportunities, actions, counsel] = await Promise.all([
        db
          .from("ci_organization_members")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .eq("status", "active"),
        db
          .from("ci_intelligence_items")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .in("status", ["new", "reviewed", "in_progress"]),
        db
          .from("ci_opportunities")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .in("status", CI_ACTIVE_OPPORTUNITY_STATUSES),
        db
          .from("ci_action_items")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .in("status", CI_OPEN_ACTION_STATUSES),
        db
          .from("ci_counsel_requests")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .in("status", ["submitted", "reviewing", "response_ready"] as CiCounselStatus[]),
      ]);

      return {
        members: members.count ?? 0,
        intelligence_open: intelligence.count ?? 0,
        opportunities_active: opportunities.count ?? 0,
        actions_open: actions.count ?? 0,
        counsel_open: counsel.count ?? 0,
      };
    },
  },

  notes: {
    listForOrganization: async (organizationId: string): Promise<CiAdminNoteWithAuthor[]> => {
      const { data, error } = await db
        .from("ci_admin_notes")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const notes = (data ?? []) as CiAdminNote[];
      const authorIds = [...new Set(notes.map((n) => n.created_by).filter(Boolean))] as string[];
      if (!authorIds.length) return notes;

      const { data: profiles } = await db
        .from("profiles")
        .select("id, full_name")
        .in("id", authorIds);

      const byId = new Map<string, { full_name?: string | null }>();
      for (const p of (profiles ?? []) as { id: string; full_name?: string | null }[]) {
        byId.set(p.id, p);
      }

      return notes.map((n) => {
        const author = n.created_by ? byId.get(n.created_by) : undefined;
        return {
          ...n,
          author_name: author?.full_name ?? null,
        };
      });
    },

    create: async (input: {
      organization_id: string;
      body: string;
      created_by: string;
      entity_type?: CiAdminNote["entity_type"];
      entity_id?: string | null;
    }): Promise<CiAdminNote> => {
      const { data, error } = await db
        .from("ci_admin_notes")
        .insert({
          organization_id: input.organization_id,
          body: input.body.trim(),
          created_by: input.created_by,
          entity_type: input.entity_type ?? "organization",
          entity_id: input.entity_id ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as CiAdminNote;
    },

    update: async (id: string, body: string): Promise<CiAdminNote> => {
      const { data, error } = await db
        .from("ci_admin_notes")
        .update({ body: body.trim() })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data as CiAdminNote;
    },

    remove: async (id: string): Promise<void> => {
      const { error } = await db.from("ci_admin_notes").delete().eq("id", id);
      if (error) throw error;
    },
  },

  health: {
    listForOrganization: async (organizationId: string): Promise<CiHealthCheck[]> => {
      const { data, error } = await db
        .from("ci_health_checks")
        .select("*")
        .eq("organization_id", organizationId);
      if (error) throw error;
      return attachReviewerNames((data ?? []) as CiHealthCheck[]);
    },

    upsert: async (input: CiHealthWriteInput): Promise<CiHealthCheck> => {
      const payload = {
        organization_id: input.organization_id,
        category: input.category,
        status_label: input.status_label ?? "not_assessed",
        score: input.score == null || Number.isNaN(input.score) ? null : input.score,
        explanation: emptyStringToNull(input.explanation),
        why_it_matters: emptyStringToNull(input.why_it_matters),
        recommended_improvement: emptyStringToNull(input.recommended_improvement),
        assessed_by: input.assessed_by ?? null,
        assessed_at: input.assessed_at || null,
      };
      const { data, error } = await db
        .from("ci_health_checks")
        .upsert(payload, { onConflict: "organization_id,category" })
        .select("*")
        .single();
      if (error) throw error;
      const [withName] = await attachReviewerNames([data as CiHealthCheck]);
      return withName;
    },
  },

  messaging: {
    listForOrganization: async (
      organizationId: string,
      options?: { approvedOnly?: boolean; publishedOnly?: boolean },
    ): Promise<CiMessagingEntry[]> => {
      let q = db
        .from("ci_messaging_entries")
        .select("id, organization_id, entry_type, title, body, sort_order, status, is_published, created_by, updated_by, created_at, updated_at")
        .eq("organization_id", organizationId)
        .order("sort_order", { ascending: true })
        .order("updated_at", { ascending: false });
      if (options?.approvedOnly || options?.publishedOnly) {
        q = q.eq("status", "approved").eq("is_published", true);
      }
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as CiMessagingEntry[];
      if (options?.approvedOnly || options?.publishedOnly) return rows;
      return attachMessagingAdminNotes(organizationId, rows);
    },

    create: async (input: CiMessagingWriteInput): Promise<CiMessagingEntry> => {
      const status = input.status ?? "draft";
      const payload = {
        organization_id: input.organization_id,
        entry_type: input.entry_type,
        title: emptyStringToNull(input.title),
        body: input.body.trim(),
        sort_order: input.sort_order ?? 0,
        status,
        is_published: status === "approved",
        created_by: input.created_by ?? null,
        updated_by: input.updated_by ?? input.created_by ?? null,
      };
      const { data, error } = await db
        .from("ci_messaging_entries")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      const entry = data as CiMessagingEntry;
      if (input.admin_notes?.trim()) {
        await upsertMessagingAdminNote({
          organizationId: input.organization_id,
          entryId: entry.id,
          body: input.admin_notes,
          createdBy: input.created_by ?? input.updated_by ?? null,
        });
      }
      return { ...entry, admin_notes: input.admin_notes?.trim() || null };
    },

    update: async (
      id: string,
      input: Partial<CiMessagingWriteInput>,
    ): Promise<CiMessagingEntry> => {
      const payload: Record<string, unknown> = {};
      if (input.entry_type !== undefined) payload.entry_type = input.entry_type;
      if (input.title !== undefined) payload.title = emptyStringToNull(input.title);
      if (input.body !== undefined) payload.body = input.body.trim();
      if (input.sort_order !== undefined) payload.sort_order = input.sort_order;
      if (input.status !== undefined) {
        payload.status = input.status;
        payload.is_published = input.status === "approved";
      }
      if (input.updated_by !== undefined) payload.updated_by = input.updated_by ?? null;
      const { data, error } = await db
        .from("ci_messaging_entries")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      const entry = data as CiMessagingEntry;
      if (input.admin_notes !== undefined) {
        await upsertMessagingAdminNote({
          organizationId: entry.organization_id,
          entryId: entry.id,
          body: input.admin_notes ?? "",
          createdBy: input.updated_by ?? null,
        });
      }
      return { ...entry, admin_notes: input.admin_notes ?? null };
    },

    remove: async (id: string): Promise<void> => {
      const { error } = await db.from("ci_messaging_entries").delete().eq("id", id);
      if (error) throw error;
    },
  },

  intelligence: {
    list: async (
      organizationId: string,
      filters?: {
        category?: CiIntelligenceCategory | "all";
        priority?: CiIntelligencePriority | "all";
        status?: CiIntelligenceStatus | "all";
      },
    ): Promise<CiIntelligenceItem[]> => {
      let q = db
        .from("ci_intelligence_items")
        .select("*")
        .eq("organization_id", organizationId)
        .order("updated_at", { ascending: false });

      if (filters?.category && filters.category !== "all") q = q.eq("category", filters.category);
      if (filters?.priority && filters.priority !== "all") q = q.eq("priority", filters.priority);
      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CiIntelligenceItem[];
    },

    create: async (input: CiIntelligenceWriteInput): Promise<CiIntelligenceItem> => {
      const payload = {
        organization_id: input.organization_id,
        title: input.title.trim(),
        category: input.category,
        description: emptyStringToNull(input.description),
        why_it_matters: emptyStringToNull(input.why_it_matters),
        recommended_action: emptyStringToNull(input.recommended_action),
        priority: input.priority ?? "medium",
        status: input.status ?? "new",
        due_date: input.due_date || null,
        created_by: input.created_by ?? null,
      };
      const { data, error } = await db
        .from("ci_intelligence_items")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data as CiIntelligenceItem;
    },

    update: async (
      id: string,
      input: Partial<CiIntelligenceWriteInput>,
    ): Promise<CiIntelligenceItem> => {
      const payload: Record<string, unknown> = {};
      if (input.title !== undefined) payload.title = input.title.trim();
      if (input.category !== undefined) payload.category = input.category;
      if (input.description !== undefined) payload.description = emptyStringToNull(input.description);
      if (input.why_it_matters !== undefined) payload.why_it_matters = emptyStringToNull(input.why_it_matters);
      if (input.recommended_action !== undefined) {
        payload.recommended_action = emptyStringToNull(input.recommended_action);
      }
      if (input.priority !== undefined) payload.priority = input.priority;
      if (input.status !== undefined) payload.status = input.status;
      if (input.due_date !== undefined) payload.due_date = input.due_date || null;

      const { data, error } = await db
        .from("ci_intelligence_items")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data as CiIntelligenceItem;
    },
  },

  members: {
    listForOrganization: async (organizationId: string): Promise<CiOrganizationMember[]> => {
      const { data, error } = await db
        .from("ci_organization_members")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const rows = (data ?? []) as CiOrganizationMember[];
      const userIds = [...new Set(rows.map((r) => r.user_id))];
      if (!userIds.length) return rows;

      const { data: profiles } = await db
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const byId = new Map<string, { full_name?: string | null }>();
      for (const p of (profiles ?? []) as { id: string; full_name?: string | null }[]) {
        byId.set(p.id, p);
      }

      return rows.map((r) => ({
        ...r,
        full_name: byId.get(r.user_id)?.full_name ?? null,
      }));
    },

    inviteByEmail: async (input: {
      organization_id: string;
      email: string;
      invited_by: string;
      member_role?: CiMemberRole;
    }): Promise<CiOrganizationMember> => {
      const email = input.email.trim().toLowerCase();
      if (!email) throw new Error("Email is required");

      const { data: userId, error: lookupError } = await db.rpc("ci_lookup_user_id_by_email", {
        p_email: email,
      });
      if (lookupError) throw lookupError;
      if (!userId) {
        throw new Error("No existing account found for that email. The person must sign up first.");
      }

      const now = new Date().toISOString();
      const { data, error } = await db
        .from("ci_organization_members")
        .upsert(
          {
            organization_id: input.organization_id,
            user_id: userId,
            member_role: input.member_role ?? "member",
            status: "active",
            invited_by: input.invited_by,
            invited_at: now,
            accepted_at: now,
          },
          { onConflict: "organization_id,user_id" },
        )
        .select("*")
        .single();
      if (error) throw new Error(ciFriendlyError(error));
      return {
        ...(data as CiOrganizationMember),
        email,
      };
    },

    revoke: async (memberId: string): Promise<void> => {
      const { error } = await db
        .from("ci_organization_members")
        .update({ status: "revoked" as CiMemberStatus, accepted_at: null })
        .eq("id", memberId);
      if (error) throw new Error(ciFriendlyError(error));
    },
  },

  invitations: {
    list: async (organizationId: string): Promise<CiOrganizationInvitation[]> => {
      const { data, error } = await db
        .from("ci_organization_invitations")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(ciFriendlyError(error));
      return (data ?? []) as CiOrganizationInvitation[];
    },

    create: async (input: {
      organization_id: string;
      email: string;
      member_role?: CiMemberRole;
    }): Promise<{ invite_id: string; token: string; expires_at: string }> => {
      const { data, error } = await db.rpc("ci_create_organization_invite", {
        p_organization_id: input.organization_id,
        p_email: input.email,
        p_member_role: input.member_role ?? "owner",
      });
      if (error) throw new Error(ciFriendlyError(error));
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error("Could not create the invitation.");
      return row as { invite_id: string; token: string; expires_at: string };
    },

    revoke: async (inviteId: string): Promise<void> => {
      const { error } = await db.rpc("ci_revoke_organization_invite", { p_invite_id: inviteId });
      if (error) throw new Error(ciFriendlyError(error));
    },

    preview: async (token: string): Promise<CiInvitePreview> => {
      const { data, error } = await db.rpc("ci_preview_organization_invite", { p_token: token });
      if (error) throw new Error(ciFriendlyError(error));
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error("Invitation not found.");
      return row as CiInvitePreview;
    },

    accept: async (token: string): Promise<string> => {
      const { data, error } = await db.rpc("ci_accept_organization_invite", { p_token: token });
      if (error) throw new Error(ciFriendlyError(error));
      return data as string;
    },
  },

  opportunities: {
    list: async (
      organizationId: string,
      filters?: {
        type?: CiOpportunityType | "all";
        status?: CiOpportunityStatus | "all";
        priority?: CiPriority | "all";
      },
    ): Promise<CiOpportunity[]> => {
      let q = db
        .from("ci_opportunities")
        .select("*")
        .eq("organization_id", organizationId)
        .order("updated_at", { ascending: false });
      if (filters?.type && filters.type !== "all") q = q.eq("opportunity_type", filters.type);
      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters?.priority && filters.priority !== "all") q = q.eq("priority", filters.priority);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CiOpportunity[];
    },

    create: async (input: CiOpportunityWriteInput): Promise<CiOpportunity> => {
      const payload = {
        organization_id: input.organization_id,
        title: input.title.trim(),
        opportunity_type: input.opportunity_type,
        description: emptyStringToNull(input.description),
        why_it_matters: emptyStringToNull(input.why_it_matters),
        recommended_action: emptyStringToNull(input.recommended_action),
        source: emptyStringToNull(input.source),
        source_url: emptyStringToNull(input.source_url),
        deadline: input.deadline || null,
        priority: input.priority ?? "medium",
        status: input.status ?? "new",
        created_by: input.created_by ?? null,
      };
      const { data, error } = await db.from("ci_opportunities").insert(payload).select("*").single();
      if (error) throw error;
      return data as CiOpportunity;
    },

    update: async (
      id: string,
      input: Partial<CiOpportunityWriteInput>,
    ): Promise<CiOpportunity> => {
      const payload: Record<string, unknown> = {};
      if (input.title !== undefined) payload.title = input.title.trim();
      if (input.opportunity_type !== undefined) payload.opportunity_type = input.opportunity_type;
      if (input.description !== undefined) payload.description = emptyStringToNull(input.description);
      if (input.why_it_matters !== undefined) payload.why_it_matters = emptyStringToNull(input.why_it_matters);
      if (input.recommended_action !== undefined) {
        payload.recommended_action = emptyStringToNull(input.recommended_action);
      }
      if (input.source !== undefined) payload.source = emptyStringToNull(input.source);
      if (input.source_url !== undefined) payload.source_url = emptyStringToNull(input.source_url);
      if (input.deadline !== undefined) payload.deadline = input.deadline || null;
      if (input.priority !== undefined) payload.priority = input.priority;
      if (input.status !== undefined) payload.status = input.status;
      const { data, error } = await db
        .from("ci_opportunities")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data as CiOpportunity;
    },
  },

  actions: {
    list: async (
      organizationId: string,
      filters?: {
        status?: CiActionStatus | "all";
        priority?: CiPriority | "all";
      },
    ): Promise<CiActionItem[]> => {
      let q = db
        .from("ci_action_items")
        .select("*")
        .eq("organization_id", organizationId)
        .order("updated_at", { ascending: false });
      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters?.priority && filters.priority !== "all") q = q.eq("priority", filters.priority);
      const { data, error } = await q;
      if (error) throw error;
      return attachActionRelations((data ?? []) as CiActionItem[]);
    },

    create: async (input: CiActionWriteInput): Promise<CiActionItem> => {
      const payload = {
        organization_id: input.organization_id,
        title: input.title.trim(),
        description: emptyStringToNull(input.description),
        reason: emptyStringToNull(input.reason),
        priority: input.priority ?? "medium",
        due_date: input.due_date || null,
        status: input.status ?? "not_started",
        assigned_to: input.assigned_to || null,
        intelligence_item_id: input.intelligence_item_id || null,
        opportunity_id: input.opportunity_id || null,
        created_by: input.created_by ?? null,
      };
      const { data, error } = await db.from("ci_action_items").insert(payload).select("*").single();
      if (error) throw error;
      const [withRelations] = await attachActionRelations([data as CiActionItem]);
      return withRelations;
    },

    update: async (id: string, input: Partial<CiActionWriteInput>): Promise<CiActionItem> => {
      const payload: Record<string, unknown> = {};
      if (input.title !== undefined) payload.title = input.title.trim();
      if (input.description !== undefined) payload.description = emptyStringToNull(input.description);
      if (input.reason !== undefined) payload.reason = emptyStringToNull(input.reason);
      if (input.priority !== undefined) payload.priority = input.priority;
      if (input.due_date !== undefined) payload.due_date = input.due_date || null;
      if (input.status !== undefined) payload.status = input.status;
      if (input.assigned_to !== undefined) payload.assigned_to = input.assigned_to || null;
      if (input.intelligence_item_id !== undefined) {
        payload.intelligence_item_id = input.intelligence_item_id || null;
      }
      if (input.opportunity_id !== undefined) payload.opportunity_id = input.opportunity_id || null;
      const { data, error } = await db
        .from("ci_action_items")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      const [withRelations] = await attachActionRelations([data as CiActionItem]);
      return withRelations;
    },
  },

  counsel: {
    list: async (filters?: {
      organizationId?: string;
      status?: CiCounselStatus | "all";
      urgency?: CiCounselUrgency | "all";
      type?: CiCounselRequestType | "all";
    }): Promise<CiCounselRequest[]> => {
      let q = db
        .from("ci_counsel_requests")
        .select(COUNSEL_REQUEST_COLUMNS)
        .order("created_at", { ascending: true });
      if (filters?.organizationId) q = q.eq("organization_id", filters.organizationId);
      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters?.urgency && filters.urgency !== "all") q = q.eq("urgency", filters.urgency);
      if (filters?.type && filters.type !== "all") q = q.eq("request_type", filters.type);
      const { data, error } = await q;
      if (error) throw new Error(ciFriendlyError(error));
      return attachCounselRelations((data ?? []) as CiCounselRequest[]);
    },

    get: async (
      id: string,
      options?: { includeNotes?: boolean },
    ): Promise<CiCounselRequest | null> => {
      const { data, error } = await db
        .from("ci_counsel_requests")
        .select(COUNSEL_REQUEST_COLUMNS)
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(ciFriendlyError(error));
      if (!data) return null;
      const [row] = await attachCounselRelations([data as CiCounselRequest], {
        includeNotes: options?.includeNotes,
      });
      return row;
    },

    create: async (input: CiCounselWriteInput): Promise<CiCounselRequest> => {
      const payload = {
        organization_id: input.organization_id,
        subject: input.subject.trim(),
        request_type: input.request_type,
        description: input.description.trim(),
        urgency: input.urgency ?? "normal",
        link_url: emptyStringToNull(input.link_url),
        attachment_path: emptyStringToNull(input.attachment_path),
        status: "submitted",
        submitted_by: input.submitted_by,
        intelligence_item_id: input.intelligence_item_id || null,
        opportunity_id: input.opportunity_id || null,
        action_item_id: input.action_item_id || null,
      };
      const { data, error } = await db
        .from("ci_counsel_requests")
        .insert(payload)
        .select(COUNSEL_REQUEST_COLUMNS)
        .single();
      if (error) throw new Error(ciFriendlyError(error));
      const [row] = await attachCounselRelations([data as CiCounselRequest]);
      return row;
    },

    updateStatus: async (id: string, status: CiCounselStatus): Promise<CiCounselRequest> => {
      const { data, error } = await db
        .from("ci_counsel_requests")
        .update({ status })
        .eq("id", id)
        .select(COUNSEL_REQUEST_COLUMNS)
        .single();
      if (error) throw error;
      const [row] = await attachCounselRelations([data as CiCounselRequest], { includeNotes: true });
      return row;
    },

    saveResponse: async (input: {
      requestId: string;
      organizationId: string;
      body: string;
      userId: string;
    }): Promise<void> => {
      const payload = {
        request_id: input.requestId,
        organization_id: input.organizationId,
        body: input.body.trim(),
        created_by: input.userId,
        updated_by: input.userId,
      };
      const { error } = await db
        .from("ci_counsel_responses")
        .upsert(payload, { onConflict: "request_id" });
      if (error) throw error;
    },

    inboxSummary: async (): Promise<CiCounselInboxSummary> => {
      const { data, error } = await db
        .from("ci_counsel_requests")
        .select("id, status, urgency, created_at")
        .in("status", CI_OPEN_COUNSEL_STATUSES);
      if (error) throw error;
      const rows = (data ?? []) as { status: CiCounselStatus; urgency: CiCounselUrgency; created_at: string }[];
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return {
        submitted: rows.filter((r) => r.status === "submitted").length,
        urgent: rows.filter((r) => r.urgency === "urgent").length,
        waiting_response: rows.filter((r) => r.status === "reviewing").length,
        aging: rows.filter((r) => new Date(r.created_at).getTime() < weekAgo).length,
      };
    },

    uploadAttachment: async (organizationId: string, file: File): Promise<string> => {
      const uploadId = crypto.randomUUID();
      const safeName = file.name.replace(/[^\w.-]+/g, "_").slice(0, 80) || "attachment";
      const path = `${organizationId}/${uploadId}/${safeName}`;
      const { error } = await supabase.storage.from("ci-counsel-attachments").upload(path, file, {
        upsert: false,
      });
      if (error) throw new Error(ciFriendlyError(error));
      return path;
    },

    signedAttachmentUrl: async (path: string): Promise<string | null> => {
      const { data, error } = await supabase.storage
        .from("ci-counsel-attachments")
        .createSignedUrl(path, 60 * 10);
      if (error) return null;
      return data.signedUrl;
    },
  },

  portal: {
    listMemberships: async (userId: string): Promise<CiOrganizationMember[]> => {
      const { data, error } = await db
        .from("ci_organization_members")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw new Error(ciFriendlyError(error));
      return (data ?? []) as CiOrganizationMember[];
    },

    loadDashboard: async (userId: string, organizationId?: string): Promise<CiPortalDashboard | null> => {
      const resolved = await resolvePortalOrganization(userId, organizationId);
      if (!resolved) return null;

      const { data, error } = await db
        .from("ci_intelligence_items")
        .select("*")
        .eq("organization_id", resolved.organizationId)
        .in("status", CI_ACTIVE_INTELLIGENCE_STATUSES)
        .order("updated_at", { ascending: false });
      if (error) throw new Error(ciFriendlyError(error));

      const [checks, opportunities, actions, counsel, weeklyBrief] = await Promise.all([
        ciApi.health.listForOrganization(resolved.organizationId),
        ciApi.opportunities.list(resolved.organizationId),
        ciApi.actions.list(resolved.organizationId),
        ciApi.counsel.list({ organizationId: resolved.organizationId }),
        ciApi.briefs.latestPublished(resolved.organizationId),
      ]);

      return {
        organization: resolved.organization,
        items: (data ?? []) as CiIntelligenceItem[],
        checks,
        opportunities,
        actions,
        counsel,
        weeklyBrief,
      };
    },

    loadCounsel: async (userId: string, organizationId?: string): Promise<CiPortalCounsel | null> => {
      const resolved = await resolvePortalOrganization(userId, organizationId);
      if (!resolved) return null;
      const requests = await ciApi.counsel.list({ organizationId: resolved.organizationId });
      return { organization: resolved.organization, requests };
    },

    loadOpportunities: async (
      userId: string,
      organizationId?: string,
    ): Promise<CiPortalOpportunities | null> => {
      const resolved = await resolvePortalOrganization(userId, organizationId);
      if (!resolved) return null;
      const opportunities = await ciApi.opportunities.list(resolved.organizationId);
      return { organization: resolved.organization, opportunities };
    },

    loadActions: async (userId: string, organizationId?: string): Promise<CiPortalActions | null> => {
      const resolved = await resolvePortalOrganization(userId, organizationId);
      if (!resolved) return null;
      const actions = await ciApi.actions.list(resolved.organizationId);
      return { organization: resolved.organization, actions };
    },

    updateOpportunityStatus: async (
      id: string,
      status: Extract<CiOpportunityStatus, "interested" | "passed">,
    ): Promise<CiOpportunity> => {
      const { data, error } = await db
        .from("ci_opportunities")
        .update({ status })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(ciFriendlyError(error));
      return data as CiOpportunity;
    },

    updateActionStatus: async (
      id: string,
      status: Extract<CiActionStatus, "not_started" | "in_progress" | "completed">,
    ): Promise<CiActionItem> => {
      const { data, error } = await db
        .from("ci_action_items")
        .update({ status })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(ciFriendlyError(error));
      const [withRelations] = await attachActionRelations([data as CiActionItem]);
      return withRelations;
    },

    loadHealth: async (userId: string, organizationId?: string): Promise<CiHealthBoard | null> => {
      const resolved = await resolvePortalOrganization(userId, organizationId);
      if (!resolved) return null;
      const checks = await ciApi.health.listForOrganization(resolved.organizationId);
      return { organization: resolved.organization, checks };
    },

    loadMessaging: async (userId: string, organizationId?: string): Promise<CiMessagingLibrary | null> => {
      const resolved = await resolvePortalOrganization(userId, organizationId);
      if (!resolved) return null;
      const entries = await ciApi.messaging.listForOrganization(resolved.organizationId, {
        approvedOnly: true,
      });
      return { organization: resolved.organization, entries };
    },

    loadProgress: async (userId: string, organizationId?: string): Promise<CiPortalProgress | null> => {
      const resolved = await resolvePortalOrganization(userId, organizationId);
      if (!resolved) return null;
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const [actions, opportunities, counsel, outcomes] = await Promise.all([
        ciApi.actions.list(resolved.organizationId),
        ciApi.opportunities.list(resolved.organizationId),
        ciApi.counsel.list({ organizationId: resolved.organizationId }),
        ciApi.outcomes.list(resolved.organizationId),
      ]);
      const monthActions = actions.filter((item) => new Date(item.updated_at) >= monthStart);
      const monthOpps = opportunities.filter((item) => new Date(item.created_at) >= monthStart);
      const monthCounsel = counsel.filter((item) => new Date(item.created_at) >= monthStart);
      const monthOutcomes = outcomes.filter(
        (item) => item.occurred_on && new Date(`${item.occurred_on}T00:00:00`) >= monthStart,
      );
      return {
        organization: resolved.organization,
        recommended_actions: monthActions.filter((item) => item.status !== "cancelled").length,
        completed_actions: monthActions.filter((item) => item.status === "completed").length,
        opportunities_identified: monthOpps.length,
        issues_resolved: monthOutcomes.length,
        counsel_completed: monthCounsel.filter(
          (item) => item.status === "response_ready" || item.status === "closed",
        ).length,
        outcomes,
      };
    },
  },

  ops: {
    summary: async (): Promise<CiOpsSummary> => {
      const today = new Date().toISOString().slice(0, 10);
      const week = new Date();
      week.setDate(week.getDate() + 14);
      const weekIso = week.toISOString().slice(0, 10);

      const [orgs, intel, allIntel, actions, allActions, opportunities, allOpps, counsel, health, reports, activity] =
        await Promise.all([
          ciApi.organizations.list({ status: "all" }),
          db
            .from("ci_intelligence_items")
            .select("id, organization_id, title, priority, status")
            .in("priority", ["high", "urgent"])
            .in("status", CI_ACTIVE_INTELLIGENCE_STATUSES)
            .order("updated_at", { ascending: false })
            .limit(20),
          db.from("ci_intelligence_items").select("organization_id, status"),
          db
            .from("ci_action_items")
            .select("id, organization_id, title, due_date, status")
            .in("status", ["not_started", "in_progress"])
            .lt("due_date", `${today}T23:59:59`)
            .order("due_date", { ascending: true })
            .limit(20),
          db.from("ci_action_items").select("organization_id, status"),
          db
            .from("ci_opportunities")
            .select("id, organization_id, title, deadline, status")
            .in("status", CI_ACTIVE_OPPORTUNITY_STATUSES)
            .gte("deadline", today)
            .lte("deadline", weekIso)
            .order("deadline", { ascending: true })
            .limit(20),
          db.from("ci_opportunities").select("organization_id, status"),
          db
            .from("ci_counsel_requests")
            .select("id, organization_id, subject, status, urgency")
            .in("status", ["submitted", "reviewing"])
            .order("created_at", { ascending: true })
            .limit(20),
          db
            .from("ci_health_checks")
            .select("organization_id, category, status_label, explanation, why_it_matters, recommended_improvement"),
          db
            .from("ci_monthly_reports")
            .select("id, organization_id, status, period_month, period_year")
            .in("status", ["draft", "ready_for_review"])
            .order("updated_at", { ascending: false })
            .limit(20),
          db
            .from("ci_activity_events")
            .select("organization_id, created_at")
            .order("created_at", { ascending: false })
            .limit(200),
        ]);

      if (intel.error) throw new Error(ciFriendlyError(intel.error));
      if (allIntel.error) throw new Error(ciFriendlyError(allIntel.error));
      if (actions.error) throw new Error(ciFriendlyError(actions.error));
      if (allActions.error) throw new Error(ciFriendlyError(allActions.error));
      if (opportunities.error) throw new Error(ciFriendlyError(opportunities.error));
      if (allOpps.error) throw new Error(ciFriendlyError(allOpps.error));
      if (counsel.error) throw new Error(ciFriendlyError(counsel.error));
      if (health.error) throw new Error(ciFriendlyError(health.error));
      if (reports.error) throw new Error(ciFriendlyError(reports.error));
      const activityRows = activity.error
        ? []
        : ((activity.data ?? []) as { organization_id: string; created_at: string }[]);

      const names = new Map(orgs.map((org) => [org.id, org.name]));
      const intelRows = (intel.data ?? []) as {
        id: string;
        organization_id: string;
        title: string;
        priority: string;
      }[];
      const actionRows = (actions.data ?? []) as {
        id: string;
        organization_id: string;
        title: string;
        due_date: string | null;
      }[];
      const oppRows = (opportunities.data ?? []) as {
        id: string;
        organization_id: string;
        title: string;
        deadline: string | null;
      }[];
      const counselRows = (counsel.data ?? []) as {
        id: string;
        organization_id: string;
        subject: string;
        status: string;
        urgency: string;
      }[];
      const reportRows = (reports.data ?? []) as {
        id: string;
        organization_id: string;
        status: string;
      }[];
      const healthRows = (health.data ?? []) as {
        organization_id: string;
        category: string;
        status_label: string | null;
        explanation: string | null;
        why_it_matters: string | null;
        recommended_improvement: string | null;
      }[];
      const intelAll = (allIntel.data ?? []) as { organization_id: string; status: string }[];
      const actionAll = (allActions.data ?? []) as { organization_id: string; status: string }[];
      const oppAll = (allOpps.data ?? []) as { organization_id: string; status: string }[];
      const lastActivity = new Map<string, string>();
      for (const row of activityRows) {
        if (!lastActivity.has(row.organization_id)) lastActivity.set(row.organization_id, row.created_at);
      }

      const assessedByOrg = new Map<string, Set<string>>();
      for (const row of healthRows) {
        if (!isHealthAssessed(row)) continue;
        const set = assessedByOrg.get(row.organization_id) ?? new Set<string>();
        set.add(row.category);
        assessedByOrg.set(row.organization_id, set);
      }

      const countBy = (rows: { organization_id: string; status: string }[], active: string[]) => {
        const map = new Map<string, number>();
        for (const row of rows) {
          if (!active.includes(row.status)) continue;
          map.set(row.organization_id, (map.get(row.organization_id) ?? 0) + 1);
        }
        return map;
      };
      const recCounts = countBy(intelAll, CI_ACTIVE_INTELLIGENCE_STATUSES);
      const oppCounts = countBy(oppAll, CI_ACTIVE_OPPORTUNITY_STATUSES);
      const actionCounts = countBy(actionAll, [...CI_OPEN_ACTION_STATUSES, "completed"]);

      const today_items: CiOpsSummary["today_items"] = [];
      for (const row of actionRows) {
        today_items.push({
          id: `action-${row.id}`,
          organization_id: row.organization_id,
          organization_name: names.get(row.organization_id) || "Client",
          reason: `${row.title} is overdue.`,
          cta: "Review",
          href: `/hq/intelligence/organizations/${row.organization_id}/actions`,
        });
      }
      for (const row of oppRows) {
        today_items.push({
          id: `opp-${row.id}`,
          organization_id: row.organization_id,
          organization_name: names.get(row.organization_id) || "Client",
          reason: `${row.title} has a deadline approaching.`,
          cta: "Review",
          href: `/hq/intelligence/organizations/${row.organization_id}/opportunities`,
        });
      }
      for (const row of counselRows) {
        today_items.push({
          id: `counsel-${row.id}`,
          organization_id: row.organization_id,
          organization_name: names.get(row.organization_id) || "Client",
          reason:
            row.status === "submitted"
              ? `New question: ${row.subject}`
              : `Waiting on a response: ${row.subject}`,
          cta: "Respond",
          href: `/hq/intelligence/organizations/${row.organization_id}/counsel/${row.id}`,
        });
      }
      for (const row of reportRows) {
        today_items.push({
          id: `report-${row.id}`,
          organization_id: row.organization_id,
          organization_name: names.get(row.organization_id) || "Client",
          reason:
            row.status === "ready_for_review"
              ? "A client update is ready for review."
              : "A client update is still in draft.",
          cta: "Prepare Client Update",
          href: `/hq/intelligence/organizations/${row.organization_id}/reports`,
        });
      }

      const seen = new Set<string>();
      const uniqueToday = today_items.filter((item) => {
        const key = `${item.organization_id}:${item.cta}:${item.reason}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const attentionIds = new Set(uniqueToday.map((item) => item.organization_id));
      const clients: CiOpsSummary["clients"] = orgs
        .filter((org) => org.status !== "archived")
        .map((org) => {
          const flow = workflowFromCounts(org, {
            assessedCategories: assessedByOrg.get(org.id)?.size ?? 0,
            recommendationCount: recCounts.get(org.id) ?? 0,
            opportunityCount: oppCounts.get(org.id) ?? 0,
            actionCount: actionCounts.get(org.id) ?? 0,
            approvedMessagingCount: 0,
          });
          const orgItems = uniqueToday.filter((item) => item.organization_id === org.id);
          return {
            id: org.id,
            name: org.name,
            stage: flow.stage,
            attention: orgItems[0]?.reason || (flow.clientReady ? "Nothing waiting on you." : flow.next.title),
            last_activity: lastActivity.get(org.id) || org.updated_at || org.created_at,
            cta: flow.next.cta,
            href: `/hq/intelligence/organizations/${org.id}`,
          };
        });

      return {
        organizations: orgs.filter((org) => org.status !== "archived").length,
        needing_attention: attentionIds.size,
        high_intelligence: intelRows.length,
        overdue_actions: actionRows.length,
        upcoming_deadlines: oppRows.length,
        new_counsel: counselRows.filter((item) => item.status === "submitted").length,
        waiting_response: counselRows.filter((item) => item.status === "reviewing").length,
        attention_orgs: uniqueToday.slice(0, 8).map((item) => ({
          id: item.organization_id,
          name: item.organization_name,
          reason: item.reason,
        })),
        high_items: intelRows.map((row) => ({
          ...row,
          organization_name: names.get(row.organization_id) || "Client",
        })),
        overdue_action_rows: actionRows.map((row) => ({
          ...row,
          organization_name: names.get(row.organization_id) || "Client",
        })),
        upcoming_opportunity_rows: oppRows.map((row) => ({
          ...row,
          organization_name: names.get(row.organization_id) || "Client",
        })),
        counsel_rows: counselRows.map((row) => ({
          ...row,
          organization_name: names.get(row.organization_id) || "Client",
        })),
        today_items: uniqueToday.slice(0, 12),
        clients,
      };
    },
  },

  activity: {
    record: async (input: {
      organization_id: string;
      event_type: CiActivityEventType;
      entity_type?: string | null;
      entity_id?: string | null;
    }): Promise<void> => {
      const { error } = await db.rpc("ci_record_activity", {
        p_organization_id: input.organization_id,
        p_event_type: input.event_type,
        p_entity_type: input.entity_type ?? null,
        p_entity_id: input.entity_id ?? null,
      });
      if (error) throw new Error(ciFriendlyError(error));
    },

    summary: async (organizationId: string): Promise<CiOrgActivitySummary> => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const [events, actions] = await Promise.all([
        db
          .from("ci_activity_events")
          .select("event_type, created_at")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(200),
        db
          .from("ci_action_items")
          .select("id, status, updated_at")
          .eq("organization_id", organizationId)
          .eq("status", "completed"),
      ]);
      if (events.error) throw new Error(ciFriendlyError(events.error));
      const rows = (events.data ?? []) as { event_type: string; created_at: string }[];
      const completed = (actions.data ?? []) as { updated_at: string }[];
      return {
        last_client_activity: rows[0]?.created_at ?? null,
        last_portal_login: rows.find((row) => row.event_type === "portal_login")?.created_at ?? null,
        actions_completed_this_month: completed.filter(
          (row) => new Date(row.updated_at) >= monthStart,
        ).length,
        opportunities_reviewed: rows.filter((row) => row.event_type === "opportunity_viewed").length,
        counsel_requests_submitted: rows.filter((row) => row.event_type === "counsel_submitted").length,
      };
    },
  },

  pilots: {
    list: async (): Promise<CiPilotEnrollment[]> => {
      const { data, error } = await db
        .from("ci_pilot_enrollments")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw new Error(ciFriendlyError(error));
      const rows = (data ?? []) as CiPilotEnrollment[];
      if (!rows.length) return rows;
      const orgs = await ciApi.organizations.list();
      const names = new Map(orgs.map((org) => [org.id, org.name]));
      return rows.map((row) => ({ ...row, organization_name: names.get(row.organization_id) }));
    },

    getForOrganization: async (organizationId: string): Promise<CiPilotEnrollment | null> => {
      const { data, error } = await db
        .from("ci_pilot_enrollments")
        .select("*")
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (error) throw new Error(ciFriendlyError(error));
      return (data as CiPilotEnrollment | null) ?? null;
    },

    upsert: async (input: CiPilotWriteInput): Promise<CiPilotEnrollment> => {
      const payload = {
        organization_id: input.organization_id,
        status: input.status ?? "invited",
        start_date: input.start_date || null,
        end_date: input.end_date || null,
        cohort: emptyStringToNull(input.cohort),
        onboarding_complete_at: input.onboarding_complete_at || null,
        initial_health_complete_at: input.initial_health_complete_at || null,
        first_intelligence_at: input.first_intelligence_at || null,
        first_client_login_at: input.first_client_login_at || null,
        first_action_completed_at: input.first_action_completed_at || null,
        first_counsel_request_at: input.first_counsel_request_at || null,
        final_review_at: input.final_review_at || null,
        internal_notes: emptyStringToNull(input.internal_notes),
      };
      const { data, error } = await db
        .from("ci_pilot_enrollments")
        .upsert(payload, { onConflict: "organization_id" })
        .select("*")
        .single();
      if (error) throw new Error(ciFriendlyError(error));
      return data as CiPilotEnrollment;
    },
  },

  outcomes: {
    list: async (organizationId: string): Promise<CiOutcome[]> => {
      const { data, error } = await db
        .from("ci_outcomes")
        .select("*")
        .eq("organization_id", organizationId)
        .order("occurred_on", { ascending: false, nullsFirst: false });
      if (error) throw new Error(ciFriendlyError(error));
      const rows = (data ?? []) as CiOutcome[];
      const { data: notes } = await db
        .from("ci_admin_notes")
        .select("id, entity_id, body, updated_at")
        .eq("organization_id", organizationId)
        .eq("entity_type", "outcome");
      const latest = new Map<string, { id: string; body: string; updated_at: string }>();
      for (const note of (notes ?? []) as { id: string; entity_id: string | null; body: string; updated_at: string }[]) {
        if (!note.entity_id) continue;
        const existing = latest.get(note.entity_id);
        if (!existing || note.updated_at > existing.updated_at) latest.set(note.entity_id, note);
      }
      return rows.map((row) => {
        const note = latest.get(row.id);
        return { ...row, admin_notes: note?.body ?? null, admin_note_id: note?.id ?? null };
      });
    },

    create: async (input: CiOutcomeWriteInput): Promise<CiOutcome> => {
      const { data, error } = await db
        .from("ci_outcomes")
        .insert({
          organization_id: input.organization_id,
          outcome_type: input.outcome_type,
          title: input.title.trim(),
          description: emptyStringToNull(input.description),
          occurred_on: input.occurred_on || null,
          opportunity_id: input.opportunity_id || null,
          action_item_id: input.action_item_id || null,
          intelligence_item_id: input.intelligence_item_id || null,
          url: emptyStringToNull(input.url),
          created_by: input.created_by ?? null,
        })
        .select("*")
        .single();
      if (error) throw new Error(ciFriendlyError(error));
      const row = data as CiOutcome;
      if (input.admin_notes?.trim() && input.created_by) {
        await db.from("ci_admin_notes").insert({
          organization_id: input.organization_id,
          entity_type: "outcome",
          entity_id: row.id,
          body: input.admin_notes.trim(),
          created_by: input.created_by,
        });
      }
      return { ...row, admin_notes: input.admin_notes ?? null };
    },

    update: async (id: string, input: Partial<CiOutcomeWriteInput>): Promise<CiOutcome> => {
      const payload: Record<string, unknown> = {};
      if (input.outcome_type !== undefined) payload.outcome_type = input.outcome_type;
      if (input.title !== undefined) payload.title = input.title.trim();
      if (input.description !== undefined) payload.description = emptyStringToNull(input.description);
      if (input.occurred_on !== undefined) payload.occurred_on = input.occurred_on || null;
      if (input.opportunity_id !== undefined) payload.opportunity_id = input.opportunity_id || null;
      if (input.action_item_id !== undefined) payload.action_item_id = input.action_item_id || null;
      if (input.intelligence_item_id !== undefined) {
        payload.intelligence_item_id = input.intelligence_item_id || null;
      }
      if (input.url !== undefined) payload.url = emptyStringToNull(input.url);
      const { data, error } = await db.from("ci_outcomes").update(payload).eq("id", id).select("*").single();
      if (error) throw new Error(ciFriendlyError(error));
      return data as CiOutcome;
    },
  },

  reports: {
    list: async (organizationId: string, options?: { publishedOnly?: boolean }): Promise<CiMonthlyReport[]> => {
      let q = db
        .from("ci_monthly_reports")
        .select("*")
        .eq("organization_id", organizationId)
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false });
      if (options?.publishedOnly) q = q.eq("status", "published");
      const { data, error } = await q;
      if (error) throw new Error(ciFriendlyError(error));
      return (data ?? []) as CiMonthlyReport[];
    },

    get: async (id: string): Promise<CiMonthlyReport | null> => {
      const { data, error } = await db.from("ci_monthly_reports").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(ciFriendlyError(error));
      return (data as CiMonthlyReport | null) ?? null;
    },

    upsert: async (input: CiMonthlyReportWriteInput): Promise<CiMonthlyReport> => {
      const payload = {
        organization_id: input.organization_id,
        period_year: input.period_year,
        period_month: input.period_month,
        status: input.status ?? "draft",
        executive_summary: emptyStringToNull(input.executive_summary),
        needed_attention: emptyStringToNull(input.needed_attention),
        opportunities: emptyStringToNull(input.opportunities),
        actions_taken: emptyStringToNull(input.actions_taken),
        health: emptyStringToNull(input.health),
        outcomes: emptyStringToNull(input.outcomes),
        next_priorities: emptyStringToNull(input.next_priorities),
        counsel: emptyStringToNull(input.counsel),
        created_by: input.created_by ?? null,
        published_at: input.status === "published" ? new Date().toISOString() : null,
        published_by: input.status === "published" ? input.created_by ?? null : null,
      };
      const { data, error } = await db
        .from("ci_monthly_reports")
        .upsert(payload, { onConflict: "organization_id,period_year,period_month" })
        .select("*")
        .single();
      if (error) throw new Error(ciFriendlyError(error));
      return data as CiMonthlyReport;
    },

    setStatus: async (
      id: string,
      status: CiReportStatus,
      userId?: string | null,
    ): Promise<CiMonthlyReport> => {
      const payload: Record<string, unknown> = { status };
      if (status === "published") {
        payload.published_at = new Date().toISOString();
        payload.published_by = userId ?? null;
      }
      const { data, error } = await db
        .from("ci_monthly_reports")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(ciFriendlyError(error));
      return data as CiMonthlyReport;
    },
  },

  briefs: {
    list: async (organizationId: string): Promise<CiWeeklyBrief[]> => {
      const { data, error } = await db
        .from("ci_weekly_briefs")
        .select("*")
        .eq("organization_id", organizationId)
        .order("week_of", { ascending: false });
      if (error) throw new Error(ciFriendlyError(error));
      return (data ?? []) as CiWeeklyBrief[];
    },

    latestPublished: async (organizationId: string): Promise<CiWeeklyBrief | null> => {
      const { data, error } = await db
        .from("ci_weekly_briefs")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("status", "published")
        .order("week_of", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(ciFriendlyError(error));
      return (data as CiWeeklyBrief | null) ?? null;
    },

    upsert: async (input: CiWeeklyBriefWriteInput): Promise<CiWeeklyBrief> => {
      const payload = {
        organization_id: input.organization_id,
        week_of: input.week_of,
        needs_attention: emptyStringToNull(input.needs_attention),
        best_opportunity: emptyStringToNull(input.best_opportunity),
        important_action: emptyStringToNull(input.important_action),
        upcoming_moment: emptyStringToNull(input.upcoming_moment),
        note: emptyStringToNull(input.note),
        status: input.status ?? "draft",
        created_by: input.created_by ?? null,
        published_at: input.status === "published" ? new Date().toISOString() : null,
        published_by: input.status === "published" ? input.created_by ?? null : null,
      };
      const { data, error } = await db.from("ci_weekly_briefs").insert(payload).select("*").single();
      if (error) throw new Error(ciFriendlyError(error));
      return data as CiWeeklyBrief;
    },

    update: async (id: string, input: Partial<CiWeeklyBriefWriteInput>): Promise<CiWeeklyBrief> => {
      const payload: Record<string, unknown> = {};
      if (input.week_of !== undefined) payload.week_of = input.week_of;
      if (input.needs_attention !== undefined) payload.needs_attention = emptyStringToNull(input.needs_attention);
      if (input.best_opportunity !== undefined) payload.best_opportunity = emptyStringToNull(input.best_opportunity);
      if (input.important_action !== undefined) payload.important_action = emptyStringToNull(input.important_action);
      if (input.upcoming_moment !== undefined) payload.upcoming_moment = emptyStringToNull(input.upcoming_moment);
      if (input.note !== undefined) payload.note = emptyStringToNull(input.note);
      if (input.status !== undefined) {
        payload.status = input.status;
        if (input.status === "published") {
          payload.published_at = new Date().toISOString();
          payload.published_by = input.created_by ?? null;
        }
      }
      const { data, error } = await db.from("ci_weekly_briefs").update(payload).eq("id", id).select("*").single();
      if (error) throw new Error(ciFriendlyError(error));
      return data as CiWeeklyBrief;
    },
  },

  feedback: {
    listRecommendations: async (organizationId?: string): Promise<CiRecommendationFeedback[]> => {
      let q = db.from("ci_recommendation_feedback").select("*").order("created_at", { ascending: false });
      if (organizationId) q = q.eq("organization_id", organizationId);
      const { data, error } = await q;
      if (error) throw new Error(ciFriendlyError(error));
      return (data ?? []) as CiRecommendationFeedback[];
    },

    submitRecommendation: async (input: {
      organization_id: string;
      related_type: CiRecommendationFeedback["related_type"];
      related_id?: string | null;
      useful: CiUsefulRating;
      why?: string | null;
      created_by: string;
    }): Promise<void> => {
      const { error } = await db.from("ci_recommendation_feedback").insert({
        organization_id: input.organization_id,
        related_type: input.related_type,
        related_id: input.related_id || null,
        useful: input.useful,
        why: emptyStringToNull(input.why),
        created_by: input.created_by,
      });
      if (error) throw new Error(ciFriendlyError(error));
    },

    listPilot: async (organizationId?: string): Promise<CiPilotFeedback[]> => {
      let q = db.from("ci_pilot_feedback").select("*").order("created_at", { ascending: false });
      if (organizationId) q = q.eq("organization_id", organizationId);
      const { data, error } = await q;
      if (error) throw new Error(ciFriendlyError(error));
      return (data ?? []) as CiPilotFeedback[];
    },

    submitPilot: async (input: {
      organization_id: string;
      most_useful?: string | null;
      confusing?: string | null;
      wish?: string | null;
      helped_decision?: CiUsefulRating | null;
      created_by: string;
    }): Promise<void> => {
      const { error } = await db.from("ci_pilot_feedback").insert({
        organization_id: input.organization_id,
        most_useful: emptyStringToNull(input.most_useful),
        confusing: emptyStringToNull(input.confusing),
        wish: emptyStringToNull(input.wish),
        helped_decision: input.helped_decision ?? null,
        created_by: input.created_by,
      });
      if (error) throw new Error(ciFriendlyError(error));
    },
  },

  learning: {
    summary: async (): Promise<CiLearningSummary> => {
      const [intel, health, opps, actions, counsel, messaging, feedback] = await Promise.all([
        db.from("ci_intelligence_items").select("category"),
        db.from("ci_health_checks").select("category, status_label"),
        db.from("ci_opportunities").select("opportunity_type"),
        db.from("ci_action_items").select("organization_id, status"),
        db.from("ci_counsel_requests").select("id"),
        db.from("ci_messaging_entries").select("entry_type").eq("status", "approved"),
        db.from("ci_recommendation_feedback").select("useful"),
      ]);
      const countBy = (rows: { key?: string }[], pick: (row: Record<string, string>) => string) => {
        const map = new Map<string, number>();
        for (const row of rows as Record<string, string>[]) {
          const key = pick(row);
          if (!key) continue;
          map.set(key, (map.get(key) ?? 0) + 1);
        }
        return [...map.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
      };
      const actionRows = (actions.data ?? []) as { organization_id: string; status: string }[];
      const completedByOrg = new Map<string, number>();
      for (const row of actionRows.filter((item) => item.status === "completed")) {
        completedByOrg.set(row.organization_id, (completedByOrg.get(row.organization_id) ?? 0) + 1);
      }
      const orgCount = completedByOrg.size || 1;
      const totalCompleted = [...completedByOrg.values()].reduce((sum, n) => sum + n, 0);
      return {
        intelligence_categories: countBy(intel.data ?? [], (row) => row.category),
        health_needs_attention: countBy(
          (health.data ?? []).filter(
            (row: { status_label?: string }) =>
              row.status_label === "needs_attention" || row.status_label === "high_priority",
          ),
          (row) => row.category,
        ),
        opportunity_types: countBy(opps.data ?? [], (row) => row.opportunity_type),
        avg_actions_completed: Math.round((totalCompleted / orgCount) * 10) / 10,
        counsel_requests: (counsel.data ?? []).length,
        messaging_categories: countBy(messaging.data ?? [], (row) => row.entry_type),
        usefulness: countBy(feedback.data ?? [], (row) => row.useful) as CiLearningSummary["usefulness"],
      };
    },

    dashboard: async (): Promise<CiPilotDashboard> => {
      const enrollments = await ciApi.pilots.list();
      const orgs = await ciApi.organizations.list();
      const names = new Map(orgs.map((org) => [org.id, org.name]));
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      const today = new Date().toISOString().slice(0, 10);
      const [events, overdue, high, actions, opps, outcomes, counsel, recFeedback, pilotFeedback] = await Promise.all([
        db.from("ci_activity_events").select("organization_id, created_at").order("created_at", { ascending: false }),
        db
          .from("ci_action_items")
          .select("organization_id")
          .in("status", ["not_started", "in_progress"])
          .lt("due_date", today),
        db
          .from("ci_intelligence_items")
          .select("organization_id")
          .in("priority", ["high", "urgent"])
          .in("status", CI_ACTIVE_INTELLIGENCE_STATUSES),
        db.from("ci_action_items").select("id").eq("status", "completed"),
        db.from("ci_opportunities").select("id"),
        db.from("ci_outcomes").select("id"),
        db.from("ci_counsel_requests").select("id"),
        db.from("ci_recommendation_feedback").select("id"),
        db.from("ci_pilot_feedback").select("id"),
      ]);
      const lastActivity = new Map<string, string>();
      for (const row of (events.data ?? []) as { organization_id: string; created_at: string }[]) {
        if (!lastActivity.has(row.organization_id)) lastActivity.set(row.organization_id, row.created_at);
      }
      const overdueCount = new Map<string, number>();
      for (const row of (overdue.data ?? []) as { organization_id: string }[]) {
        overdueCount.set(row.organization_id, (overdueCount.get(row.organization_id) ?? 0) + 1);
      }
      const highCount = new Map<string, number>();
      for (const row of (high.data ?? []) as { organization_id: string }[]) {
        highCount.set(row.organization_id, (highCount.get(row.organization_id) ?? 0) + 1);
      }
      const noRecent = enrollments
        .filter((row) => row.status === "active" || row.status === "needs_attention" || row.status === "onboarding")
        .map((row) => {
          const last = lastActivity.get(row.organization_id);
          const days = last
            ? Math.floor((Date.now() - new Date(last).getTime()) / 86400000)
            : 99;
          return {
            id: row.organization_id,
            name: names.get(row.organization_id) || row.organization_name || "Organization",
            days,
            overdue_actions: overdueCount.get(row.organization_id) ?? 0,
            high_items: highCount.get(row.organization_id) ?? 0,
          };
        })
        .filter((row) => row.days >= 10 || row.overdue_actions > 0 || row.high_items > 0);
      return {
        active_pilots: enrollments.filter((row) => row.status === "active").length,
        onboarding_complete: enrollments.filter((row) => Boolean(row.onboarding_complete_at)).length,
        no_recent_activity: noRecent,
        needing_attention: enrollments
          .filter((row) => row.status === "needs_attention")
          .map((row) => ({
            id: row.organization_id,
            name: names.get(row.organization_id) || row.organization_name || "Organization",
            reason: "Marked as needing attention",
          })),
        actions_completed: (actions.data ?? []).length,
        opportunities_identified: (opps.data ?? []).length,
        outcomes_recorded: (outcomes.data ?? []).length,
        counsel_requests: (counsel.data ?? []).length,
        feedback_count: (recFeedback.data ?? []).length + (pilotFeedback.data ?? []).length,
        enrollments,
      };
    },
  },
};

