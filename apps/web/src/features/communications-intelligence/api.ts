import { supabase } from "@/integrations/supabase/client";
import type {
  CiAdminNote,
  CiAdminNoteWithAuthor,
  CiOrgCreateInput,
  CiOrgStatus,
  CiOrgWorkspaceCounts,
  CiOrganization,
  CiOrganizationListItem,
} from "./types";

/** Untyped until generated types include ci_* tables. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function emptyStringToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
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

      const { data, error } = await db.from("ci_organizations").insert(payload).select("*").single();
      if (error) throw error;
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
          .in("status", ["new", "reviewing", "pursuing"]),
        db
          .from("ci_action_items")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .in("status", ["not_started", "in_progress"]),
        db
          .from("ci_counsel_requests")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .in("status", ["submitted", "reviewing", "response_ready"]),
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
        .select("id, email, full_name")
        .in("id", authorIds);

      const byId = new Map<string, { email?: string | null; full_name?: string | null }>();
      for (const p of (profiles ?? []) as { id: string; email?: string | null; full_name?: string | null }[]) {
        byId.set(p.id, p);
      }

      return notes.map((n) => {
        const author = n.created_by ? byId.get(n.created_by) : undefined;
        return {
          ...n,
          author_email: author?.email ?? null,
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
};
