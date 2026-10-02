import { supabase } from "@/integrations/supabase/client";
import type {
  HqActivity,
  HqClient,
  HqLead,
  HqTask,
  HqContentPost,
} from "./types";

/** Untyped table access until types.ts is regenerated from migrations. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function logHqActivity(input: {
  action: string;
  entity_type: string;
  entity_id?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await db.rpc("hq_log_activity", {
    p_action: input.action,
    p_entity_type: input.entity_type,
    p_entity_id: input.entity_id ?? null,
    p_summary: input.summary,
    p_metadata: input.metadata ?? {},
  });
  if (error) {
    // Fallback direct insert if RPC unavailable pre-migration
    await db.from("hq_activity_log").insert({
      action: input.action,
      entity_type: input.entity_type,
      entity_id: input.entity_id ?? null,
      summary: input.summary,
      metadata: input.metadata ?? {},
      actor_id: (await supabase.auth.getUser()).data.user?.id ?? null,
    });
  }
}

export const hqApi = {
  leads: {
    list: async (): Promise<HqLead[]> => {
      const { data, error } = await db
        .from("hq_leads")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as HqLead[];
    },
    get: async (id: string): Promise<HqLead | null> => {
      const { data, error } = await db.from("hq_leads").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as HqLead | null;
    },
    upsert: async (row: Partial<HqLead> & { full_name: string }) => {
      const { data, error } = await db.from("hq_leads").upsert(row).select("*").single();
      if (error) throw error;
      return data as HqLead;
    },
    remove: async (id: string) => {
      const { error } = await db.from("hq_leads").delete().eq("id", id);
      if (error) throw error;
    },
  },
  clients: {
    list: async (): Promise<HqClient[]> => {
      const { data, error } = await db
        .from("hq_clients")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as HqClient[];
    },
    get: async (id: string): Promise<HqClient | null> => {
      const { data, error } = await db.from("hq_clients").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as HqClient | null;
    },
    upsert: async (row: Partial<HqClient> & { client_name: string }) => {
      const { data, error } = await db.from("hq_clients").upsert(row).select("*").single();
      if (error) throw error;
      return data as HqClient;
    },
    remove: async (id: string) => {
      const { error } = await db.from("hq_clients").delete().eq("id", id);
      if (error) throw error;
    },
  },
  tasks: {
    list: async (): Promise<HqTask[]> => {
      const { data, error } = await db
        .from("hq_tasks")
        .select("*")
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as HqTask[];
    },
    upsert: async (row: Partial<HqTask> & { title: string }) => {
      const { data, error } = await db.from("hq_tasks").upsert(row).select("*").single();
      if (error) throw error;
      return data as HqTask;
    },
    remove: async (id: string) => {
      const { error } = await db.from("hq_tasks").delete().eq("id", id);
      if (error) throw error;
    },
  },
  activity: {
    recent: async (limit = 20): Promise<HqActivity[]> => {
      const { data, error } = await db
        .from("hq_activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as HqActivity[];
    },
  },
  content: {
    list: async (contentType?: string): Promise<HqContentPost[]> => {
      let q = db
        .from("blog_posts")
        .select(
          "id,title,slug,content_type,excerpt,description,content,cover_image_url,author_name,author_id,category,tags,seo_title,seo_description,is_featured,publication_status,status,published_date,publish_scheduled_at,hq_client_id,created_at,updated_at",
        )
        .order("updated_at", { ascending: false });
      if (contentType) q = q.eq("content_type", contentType);
      const { data, error } = await q;
      if (error) {
        // Pre-migration fallback: list without content_type
        const fallback = await db
          .from("blog_posts")
          .select(
            "id,title,slug,excerpt,description,content,cover_image_url,author_name,author_id,category,tags,is_featured,publication_status,status,published_date,publish_scheduled_at,created_at,updated_at",
          )
          .order("updated_at", { ascending: false });
        if (fallback.error) throw fallback.error;
        return ((fallback.data ?? []) as Record<string, unknown>[]).map((row) => ({
          ...row,
          content_type: "the-brief",
          seo_title: null,
          seo_description: null,
          hq_client_id: null,
        })) as HqContentPost[];
      }
      return (data ?? []) as HqContentPost[];
    },
    get: async (id: string): Promise<HqContentPost | null> => {
      const { data, error } = await db.from("blog_posts").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        content_type: data.content_type ?? "the-brief",
        seo_title: data.seo_title ?? null,
        seo_description: data.seo_description ?? null,
        hq_client_id: data.hq_client_id ?? null,
      } as HqContentPost;
    },
    upsert: async (row: Partial<HqContentPost> & { title: string }) => {
      const { data, error } = await db.from("blog_posts").upsert(row).select("*").single();
      if (error) throw error;
      return data as HqContentPost;
    },
    remove: async (id: string) => {
      const { error } = await db.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
  },
  search: async (q: string) => {
    const term = q.trim();
    if (!term) return { leads: [], clients: [], content: [] };
    const like = `%${term}%`;
    const [leads, clients, content] = await Promise.all([
      db.from("hq_leads").select("id,full_name,company,email,stage").or(`full_name.ilike.${like},company.ilike.${like},email.ilike.${like}`).limit(8),
      db.from("hq_clients").select("id,client_name,company,email,status").or(`client_name.ilike.${like},company.ilike.${like},email.ilike.${like}`).limit(8),
      db.from("blog_posts").select("id,title,slug,content_type,publication_status").ilike("title", like).limit(8),
    ]);
    return {
      leads: leads.data ?? [],
      clients: clients.data ?? [],
      content: content.data ?? [],
    };
  },
};
