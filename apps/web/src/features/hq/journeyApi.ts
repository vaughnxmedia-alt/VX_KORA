import { supabase } from "@/integrations/supabase/client";
import type {
  HqActivity,
  HqEngagement,
  HqEngagementCommunication,
  HqEngagementDocument,
  HqEngagementNote,
  HqEngagementStage,
  HqEngagementTask,
  HqJourneyTemplate,
  HqStaff,
  HqTemplateStage,
  HqTemplateTask,
  JourneyStatus,
  NoteKind,
  CommChannel,
} from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function unwrap<T>(error: { message: string } | null, data: T): T {
  if (error) throw new Error(error.message);
  return data;
}

export const journeyApi = {
  staff: async (): Promise<HqStaff[]> => {
    const { data, error } = await db.rpc("hq_list_staff");
    return unwrap(error, (data ?? []) as HqStaff[]);
  },

  templates: {
    list: async (): Promise<HqJourneyTemplate[]> => {
      const { data, error } = await db
        .from("hq_journey_templates")
        .select("id,service_key,version,name,description,is_active,created_at")
        .order("service_key")
        .order("version", { ascending: false });
      return unwrap(error, (data ?? []) as HqJourneyTemplate[]);
    },
    stages: async (): Promise<HqTemplateStage[]> => {
      const { data, error } = await db
        .from("hq_journey_template_stages")
        .select("id,template_id,position,name,description,requires_approval")
        .order("position");
      return unwrap(error, (data ?? []) as HqTemplateStage[]);
    },
    tasks: async (): Promise<HqTemplateTask[]> => {
      const { data, error } = await db
        .from("hq_journey_template_tasks")
        .select(
          "id,stage_id,position,title,description,is_milestone,is_deliverable,requires_approval,relative_due_days",
        )
        .order("position");
      return unwrap(error, (data ?? []) as HqTemplateTask[]);
    },
    publish: async (input: {
      service_key: string;
      name: string;
      description: string;
      stages: unknown[];
    }) => {
      const { data, error } = await db.rpc("hq_save_template_version", {
        p_service_key: input.service_key,
        p_name: input.name,
        p_description: input.description,
        p_stages: input.stages,
      });
      return unwrap(error, data as string);
    },
  },

  engagements: {
    list: async (): Promise<HqEngagement[]> => {
      const { data, error } = await db
        .from("hq_engagements")
        .select(
          "*, client:hq_clients(id, client_name, company), current_stage:hq_engagement_stages!hq_engagements_current_stage_id_fkey(id, name, position, status)",
        )
        .order("updated_at", { ascending: false });
      return unwrap(error, (data ?? []) as HqEngagement[]);
    },
    get: async (id: string): Promise<HqEngagement | null> => {
      const { data, error } = await db
        .from("hq_engagements")
        .select(
          "*, client:hq_clients(id, client_name, company), current_stage:hq_engagement_stages!hq_engagements_current_stage_id_fkey(id, name, position, status)",
        )
        .eq("id", id)
        .maybeSingle();
      return unwrap(error, (data ?? null) as HqEngagement | null);
    },
    open: async (input: {
      client_id: string;
      template_id: string;
      owner_id: string;
      title: string;
      start_date: string | null;
      target_end_date: string | null;
      follow_up_date: string | null;
    }) => {
      const { data, error } = await db.rpc("hq_open_engagement", {
        p_client_id: input.client_id,
        p_template_id: input.template_id,
        p_owner_id: input.owner_id,
        p_title: input.title,
        p_start_date: input.start_date,
        p_target_end_date: input.target_end_date,
        p_follow_up_date: input.follow_up_date,
      });
      return unwrap(error, data as string);
    },
    setStatus: async (id: string, status: JourneyStatus) => {
      const { error } = await db.rpc("hq_set_engagement_status", {
        p_engagement_id: id,
        p_status: status,
      });
      unwrap(error, null);
    },
    reassign: async (id: string, ownerId: string) => {
      const { error } = await db.rpc("hq_reassign_engagement", {
        p_engagement_id: id,
        p_owner_id: ownerId,
      });
      unwrap(error, null);
    },
  },

  stages: async (engagementId: string): Promise<HqEngagementStage[]> => {
    const { data, error } = await db
      .from("hq_engagement_stages")
      .select(
        "id,engagement_id,position,name,description,requires_approval,status,approved_by,approved_at",
      )
      .eq("engagement_id", engagementId)
      .order("position");
    return unwrap(error, (data ?? []) as HqEngagementStage[]);
  },

  tasks: async (engagementId: string): Promise<HqEngagementTask[]> => {
    const { data, error } = await db
      .from("hq_engagement_tasks")
      .select(
        "id,engagement_id,stage_id,position,title,description,status,assignee_id,due_date,is_milestone,is_deliverable,requires_approval,approval_status,approved_at,completed_at",
      )
      .eq("engagement_id", engagementId)
      .order("position");
    return unwrap(error, (data ?? []) as HqEngagementTask[]);
  },

  openTasks: async (): Promise<HqEngagementTask[]> => {
    const { data, error } = await db
      .from("hq_engagement_tasks")
      .select(
        "id,engagement_id,stage_id,position,title,description,status,assignee_id,due_date,is_milestone,is_deliverable,requires_approval,approval_status,approved_at,completed_at",
      )
      .not("status", "in", "(completed,cancelled)");
    return unwrap(error, (data ?? []) as HqEngagementTask[]);
  },

  setTaskStatus: async (taskId: string, status: JourneyStatus) => {
    const { error } = await db.rpc("hq_set_task_status", { p_task_id: taskId, p_status: status });
    unwrap(error, null);
  },
  submitTask: async (taskId: string) => {
    const { error } = await db.rpc("hq_submit_task", { p_task_id: taskId });
    unwrap(error, null);
  },
  reviewTask: async (taskId: string, decision: "approved" | "changes_requested") => {
    const { error } = await db.rpc("hq_review_task", { p_task_id: taskId, p_decision: decision });
    unwrap(error, null);
  },
  approveStage: async (stageId: string) => {
    const { error } = await db.rpc("hq_approve_stage", { p_stage_id: stageId });
    unwrap(error, null);
  },
  advanceStage: async (stageId: string) => {
    const { error } = await db.rpc("hq_advance_stage", { p_stage_id: stageId });
    unwrap(error, null);
  },
  addTask: async (input: {
    stage_id: string;
    title: string;
    description: string;
    due_date: string | null;
    is_milestone: boolean;
    is_deliverable: boolean;
    requires_approval: boolean;
  }) => {
    const { data, error } = await db.rpc("hq_add_engagement_task", {
      p_stage_id: input.stage_id,
      p_title: input.title,
      p_description: input.description,
      p_due_date: input.due_date,
      p_is_milestone: input.is_milestone,
      p_is_deliverable: input.is_deliverable,
      p_requires_approval: input.requires_approval,
    });
    return unwrap(error, data as string);
  },
  assignTask: async (taskId: string, assigneeId: string | null, dueDate: string | null) => {
    const { error } = await db.rpc("hq_assign_task", {
      p_task_id: taskId,
      p_assignee_id: assigneeId,
      p_due_date: dueDate,
    });
    unwrap(error, null);
  },

  notes: async (engagementId: string): Promise<HqEngagementNote[]> => {
    const { data, error } = await db
      .from("hq_engagement_notes")
      .select("id,engagement_id,task_id,author_id,kind,body,created_at")
      .eq("engagement_id", engagementId)
      .order("created_at", { ascending: false });
    return unwrap(error, (data ?? []) as HqEngagementNote[]);
  },
  addNote: async (engagementId: string, taskId: string | null, kind: NoteKind, body: string) => {
    const { error } = await db.rpc("hq_add_note", {
      p_engagement_id: engagementId,
      p_task_id: taskId,
      p_kind: kind,
      p_body: body,
    });
    unwrap(error, null);
  },

  communications: async (engagementId: string): Promise<HqEngagementCommunication[]> => {
    const { data, error } = await db
      .from("hq_engagement_communications")
      .select("id,client_id,engagement_id,author_id,channel,subject,body,occurred_on,created_at")
      .eq("engagement_id", engagementId)
      .order("occurred_on", { ascending: false });
    return unwrap(error, (data ?? []) as HqEngagementCommunication[]);
  },
  addCommunication: async (input: {
    engagement_id: string;
    channel: CommChannel;
    subject: string;
    body: string;
    occurred_on: string | null;
  }) => {
    const { error } = await db.rpc("hq_add_communication", {
      p_engagement_id: input.engagement_id,
      p_channel: input.channel,
      p_subject: input.subject,
      p_body: input.body,
      p_occurred_on: input.occurred_on,
    });
    unwrap(error, null);
  },

  documents: async (engagementId: string): Promise<HqEngagementDocument[]> => {
    const { data, error } = await db
      .from("hq_engagement_documents")
      .select("id,engagement_id,task_id,uploaded_by,file_name,storage_path,mime_type,created_at")
      .eq("engagement_id", engagementId)
      .order("created_at", { ascending: false });
    return unwrap(error, (data ?? []) as HqEngagementDocument[]);
  },
  uploadDocument: async (engagementId: string, taskId: string | null, file: File) => {
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${engagementId}/${crypto.randomUUID()}-${safe}`;
    const uploaded = await supabase.storage.from("hq-engagement-docs").upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });
    if (uploaded.error) throw new Error(uploaded.error.message);
    const { error } = await db.rpc("hq_register_document", {
      p_engagement_id: engagementId,
      p_task_id: taskId,
      p_file_name: file.name,
      p_storage_path: path,
      p_mime_type: file.type || null,
    });
    if (error) throw new Error(error.message);
  },
  documentUrl: async (path: string) => {
    const { data, error } = await supabase.storage.from("hq-engagement-docs").createSignedUrl(path, 120);
    if (error) throw new Error(error.message);
    return data.signedUrl;
  },

  timeline: async (engagementId: string): Promise<HqActivity[]> => {
    const { data, error } = await db.rpc("hq_engagement_timeline", { p_engagement_id: engagementId });
    return unwrap(error, (data ?? []) as HqActivity[]);
  },
};
