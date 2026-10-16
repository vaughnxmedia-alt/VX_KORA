import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useHqAuth } from "../HqAuth";
import { journeyApi } from "../journeyApi";
import { JourneyStatusBadge } from "../journeyUi";
import {
  COMM_CHANNEL_LABELS,
  INTERESTED_SERVICE_LABELS,
  JOURNEY_STATUSES,
  JOURNEY_STATUS_LABELS,
  NOTE_KIND_LABELS,
  type CommChannel,
  type JourneyStatus,
  type NoteKind,
} from "../types";

export default function HqEngagementPage() {
  const { engagementId = "" } = useParams();
  const { user } = useAuth();
  const { hqRole } = useHqAuth();
  const canManage = hqRole === "owner" || hqRole === "strategist";
  const canApprove = hqRole === "owner";
  const qc = useQueryClient();
  const [stageId, setStageId] = useState<string | null>(null);

  const engagement = useQuery({
    queryKey: ["hq", "engagement", engagementId],
    queryFn: () => journeyApi.engagements.get(engagementId),
    enabled: Boolean(engagementId),
  });
  const stages = useQuery({
    queryKey: ["hq", "engagement-stages", engagementId],
    queryFn: () => journeyApi.stages(engagementId),
    enabled: Boolean(engagementId),
  });
  const tasks = useQuery({
    queryKey: ["hq", "engagement-tasks", engagementId],
    queryFn: () => journeyApi.tasks(engagementId),
    enabled: Boolean(engagementId),
  });
  const notes = useQuery({
    queryKey: ["hq", "engagement-notes", engagementId],
    queryFn: () => journeyApi.notes(engagementId),
    enabled: Boolean(engagementId),
  });
  const communications = useQuery({
    queryKey: ["hq", "engagement-comms", engagementId],
    queryFn: () => journeyApi.communications(engagementId),
    enabled: Boolean(engagementId),
  });
  const documents = useQuery({
    queryKey: ["hq", "engagement-docs", engagementId],
    queryFn: () => journeyApi.documents(engagementId),
    enabled: Boolean(engagementId),
  });
  const timeline = useQuery({
    queryKey: ["hq", "engagement-activity", engagementId],
    queryFn: () => journeyApi.timeline(engagementId),
    enabled: Boolean(engagementId),
  });
  const staff = useQuery({
    queryKey: ["hq", "staff"],
    queryFn: () => journeyApi.staff(),
  });

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["hq", "engagement", engagementId] }),
      qc.invalidateQueries({ queryKey: ["hq", "engagement-stages", engagementId] }),
      qc.invalidateQueries({ queryKey: ["hq", "engagement-tasks", engagementId] }),
      qc.invalidateQueries({ queryKey: ["hq", "engagement-notes", engagementId] }),
      qc.invalidateQueries({ queryKey: ["hq", "engagement-comms", engagementId] }),
      qc.invalidateQueries({ queryKey: ["hq", "engagement-docs", engagementId] }),
      qc.invalidateQueries({ queryKey: ["hq", "engagement-activity", engagementId] }),
      qc.invalidateQueries({ queryKey: ["hq", "engagements"] }),
      qc.invalidateQueries({ queryKey: ["hq", "engagement-tasks", "open"] }),
    ]);
  };

  const run = useMutation({
    mutationFn: (work: () => Promise<unknown>) => work(),
    onSuccess: () => void refresh(),
    onError: (error: Error) => toast.error(error.message),
  });

  if (engagement.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!engagement.data) {
    return <p className="text-sm text-muted-foreground">This engagement is not available.</p>;
  }

  const row = engagement.data;
  const stageList = stages.data ?? [];
  const selected = stageList.find((stage) => stage.id === (stageId ?? row.current_stage_id)) ?? stageList[0];
  const stageTasks = (tasks.data ?? []).filter((task) => task.stage_id === selected?.id);
  const staffName = (id: string | null) => staff.data?.find((person) => person.id === id)?.full_name || "Staff";
  const isLead = row.owner_id === user?.id;
  const canAdvance = canManage || isLead;

  return (
    <div className="space-y-6 max-w-5xl">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/hq/journeys"><ArrowLeft className="h-4 w-4 mr-1" />Journeys</Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-dark">
            {INTERESTED_SERVICE_LABELS[row.service_key]}
          </p>
          <h1 className="font-serif text-3xl font-bold mt-1">{row.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            <Link to={`/hq/clients/${row.client_id}`} className="text-primary hover:underline">
              {row.client?.client_name || "Client"}
            </Link>
            {row.client?.company ? ` · ${row.client.company}` : ""}
          </p>
        </div>
        <JourneyStatusBadge status={row.status} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 rounded-lg border border-border bg-background p-4">
        <Meta label="Owner" value={staffName(row.owner_id)} />
        <Meta label="Start" value={row.start_date ? format(parseISO(row.start_date), "MMM d, yyyy") : "—"} />
        <Meta label="Target end" value={row.target_end_date ? format(parseISO(row.target_end_date), "MMM d, yyyy") : "—"} />
        <Meta label="Follow-up" value={row.follow_up_date ? format(parseISO(row.follow_up_date), "MMM d, yyyy") : "—"} />
      </div>

      {canManage ? (
        <div className="flex flex-wrap gap-3">
          <Select
            value={row.status}
            onValueChange={(value) => run.mutate(() => journeyApi.engagements.setStatus(row.id, value as JourneyStatus))}
          >
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {JOURNEY_STATUSES.map((key) => (
                <SelectItem key={key} value={key}>{JOURNEY_STATUS_LABELS[key]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={row.owner_id ?? ""}
            onValueChange={(value) => run.mutate(() => journeyApi.engagements.reassign(row.id, value))}
          >
            <SelectTrigger className="w-56"><SelectValue placeholder="Reassign" /></SelectTrigger>
            <SelectContent>
              {(staff.data ?? []).map((person) => (
                <SelectItem key={person.id} value={person.id}>{person.full_name || "Staff"}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <ol className="flex gap-2 overflow-x-auto pb-1">
        {stageList.map((stage, index) => (
          <li key={stage.id}>
            <button
              type="button"
              onClick={() => setStageId(stage.id)}
              className={cn(
                "min-w-[150px] rounded-md border px-3 py-2 text-left",
                selected?.id === stage.id ? "border-primary bg-background" : "border-border bg-background/60",
                stage.status === "completed" && "bg-emerald-50",
              )}
            >
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Stage {index + 1}</span>
              <span className="block text-sm font-medium">{stage.name}</span>
              <span className="mt-1 block"><JourneyStatusBadge status={stage.status} /></span>
            </button>
          </li>
        ))}
      </ol>

      {selected ? (
        <section className="rounded-lg border border-border bg-background p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl font-bold">{selected.name}</h2>
              {selected.description ? <p className="text-sm text-muted-foreground mt-1">{selected.description}</p> : null}
              {selected.requires_approval ? (
                <p className="text-xs mt-2 text-gold-dark">
                  {selected.approved_at ? "Approved" : "Owner approval is required before this stage can advance."}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {canApprove && selected.requires_approval && !selected.approved_at && selected.id === row.current_stage_id ? (
                <Button size="sm" variant="outline" onClick={() => run.mutate(() => journeyApi.approveStage(selected.id))}>
                  Approve stage
                </Button>
              ) : null}
              {canAdvance && selected.id === row.current_stage_id && selected.status !== "completed" ? (
                <Button
                  size="sm"
                  disabled={selected.requires_approval && !selected.approved_at}
                  onClick={() => run.mutate(() => journeyApi.advanceStage(selected.id))}
                >
                  {selected.requires_approval && !selected.approved_at ? "Approval required" : "Advance stage"}
                </Button>
              ) : null}
            </div>
          </div>

          <ul className="space-y-3">
            {stageTasks.map((task) => (
              <li key={task.id} className="rounded-md border border-border p-3 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {task.is_milestone ? "Milestone · " : ""}
                      {task.is_deliverable ? "Deliverable · " : ""}
                      {task.due_date ? `Due ${format(parseISO(task.due_date), "MMM d")}` : "No due date"}
                      {" · "}
                      {staffName(task.assignee_id)}
                    </p>
                  </div>
                  <JourneyStatusBadge status={task.status} />
                </div>
                {task.description ? <p className="text-sm text-muted-foreground">{task.description}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={task.status}
                    onValueChange={(value) => run.mutate(() => journeyApi.setTaskStatus(task.id, value as JourneyStatus))}
                  >
                    <SelectTrigger className="w-44 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {JOURNEY_STATUSES.map((key) => (
                        <SelectItem key={key} value={key}>{JOURNEY_STATUS_LABELS[key]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {task.requires_approval && task.approval_status !== "approved" ? (
                    <Button size="sm" variant="outline" onClick={() => run.mutate(() => journeyApi.submitTask(task.id))}>
                      Submit for approval
                    </Button>
                  ) : null}
                  {canApprove && task.approval_status === "pending" ? (
                    <>
                      <Button size="sm" onClick={() => run.mutate(() => journeyApi.reviewTask(task.id, "approved"))}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => run.mutate(() => journeyApi.reviewTask(task.id, "changes_requested"))}>
                        Request changes
                      </Button>
                    </>
                  ) : null}
                </div>
                {canManage ? (
                  <TaskAssign
                    key={`${task.id}-${task.assignee_id ?? ""}-${task.due_date ?? ""}`}
                    assigneeId={task.assignee_id}
                    dueDate={task.due_date}
                    staff={staff.data ?? []}
                    onSave={(assigneeId, dueDate) => run.mutate(() => journeyApi.assignTask(task.id, assigneeId, dueDate))}
                  />
                ) : null}
                <DocumentButton
                  label="Attach to task"
                  onFile={(file) => run.mutate(() => journeyApi.uploadDocument(row.id, task.id, file))}
                />
              </li>
            ))}
            {!stageTasks.length ? <li className="text-sm text-muted-foreground">No tasks in this stage.</li> : null}
          </ul>

          {canManage ? (
            <AddTaskForm onAdd={(input) => run.mutate(() => journeyApi.addTask({ ...input, stage_id: selected.id }))} />
          ) : null}
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <NoteForm
          notes={notes.data ?? []}
          staffName={staffName}
          onAdd={(kind, body) => run.mutate(() => journeyApi.addNote(row.id, null, kind, body))}
        />
        <CommForm
          items={communications.data ?? []}
          onAdd={(input) => run.mutate(() => journeyApi.addCommunication({ engagement_id: row.id, ...input }))}
        />
      </div>

      <section className="rounded-lg border border-border bg-background p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-xl font-bold">Documents</h2>
          <DocumentButton label="Upload" onFile={(file) => run.mutate(() => journeyApi.uploadDocument(row.id, null, file))} />
        </div>
        <ul className="text-sm space-y-2">
          {(documents.data ?? []).map((doc) => (
            <li key={doc.id}>
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => {
                  void journeyApi.documentUrl(doc.storage_path).then((url) => window.open(url, "_blank", "noopener")).catch((error: Error) => toast.error(error.message));
                }}
              >
                {doc.file_name}
              </button>
              <span className="text-muted-foreground"> · {format(parseISO(doc.created_at), "MMM d")}</span>
            </li>
          ))}
          {!documents.data?.length ? <li className="text-muted-foreground">No documents yet.</li> : null}
        </ul>
      </section>

      <section className="rounded-lg border border-border bg-background p-5">
        <h2 className="font-serif text-xl font-bold">Activity</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(timeline.data ?? []).map((item) => (
            <li key={item.id} className="border-b border-border pb-2">
              <p>{item.summary}</p>
              <p className="text-xs text-muted-foreground">
                {staffName(item.actor_id)} · {format(parseISO(item.created_at), "MMM d, yyyy h:mm a")}
              </p>
            </li>
          ))}
          {!timeline.data?.length ? <li className="text-muted-foreground">No activity yet.</li> : null}
        </ul>
      </section>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-1">{value}</p>
    </div>
  );
}

function TaskAssign({
  assigneeId,
  dueDate,
  staff,
  onSave,
}: {
  assigneeId: string | null;
  dueDate: string | null;
  staff: { id: string; full_name: string | null }[];
  onSave: (assigneeId: string | null, dueDate: string | null) => void;
}) {
  const [assignee, setAssignee] = useState(assigneeId ?? "none");
  const [due, setDue] = useState(dueDate ?? "");
  return (
    <div className="flex flex-wrap gap-2">
      <Select value={assignee} onValueChange={setAssignee}>
        <SelectTrigger className="w-44 h-8"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Unassigned</SelectItem>
          {staff.map((person) => (
            <SelectItem key={person.id} value={person.id}>{person.full_name || "Staff"}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input className="w-40 h-8" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => onSave(assignee === "none" ? null : assignee, due || null)}
      >
        Save assignment
      </Button>
    </div>
  );
}

function AddTaskForm({
  onAdd,
}: {
  onAdd: (input: {
    title: string;
    description: string;
    due_date: string | null;
    is_milestone: boolean;
    is_deliverable: boolean;
    requires_approval: boolean;
  }) => void;
}) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [approval, setApproval] = useState(false);
  return (
    <form
      className="flex flex-wrap gap-2 items-end border-t border-border pt-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onAdd({
          title,
          description: "",
          due_date: due || null,
          is_milestone: false,
          is_deliverable: approval,
          requires_approval: approval,
        });
        setTitle("");
        setDue("");
        setApproval(false);
      }}
    >
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task to this stage" className="max-w-sm" />
      <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-40" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={approval} onChange={(e) => setApproval(e.target.checked)} />
        Needs approval
      </label>
      <Button type="submit" size="sm" variant="outline">Add task</Button>
    </form>
  );
}

function NoteForm({
  notes,
  staffName,
  onAdd,
}: {
  notes: { id: string; kind: NoteKind; body: string; author_id: string | null; created_at: string }[];
  staffName: (id: string | null) => string;
  onAdd: (kind: NoteKind, body: string) => void;
}) {
  const [kind, setKind] = useState<NoteKind>("meeting");
  const [body, setBody] = useState("");
  return (
    <section className="rounded-lg border border-border bg-background p-5 space-y-3">
      <h2 className="font-serif text-xl font-bold">Notes</h2>
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!body.trim()) return;
          onAdd(kind, body);
          setBody("");
        }}
      >
        <Select value={kind} onValueChange={(value) => setKind(value as NoteKind)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(NOTE_KIND_LABELS) as NoteKind[]).map((key) => (
              <SelectItem key={key} value={key}>{NOTE_KIND_LABELS[key]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Meeting summary, decision, or next step" />
        <Button type="submit" size="sm">Save note</Button>
      </form>
      <ul className="space-y-2 text-sm">
        {notes.map((note) => (
          <li key={note.id} className="border-t border-border pt-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{NOTE_KIND_LABELS[note.kind]}</p>
            <p className="whitespace-pre-wrap">{note.body}</p>
            <p className="text-xs text-muted-foreground">{staffName(note.author_id)} · {format(parseISO(note.created_at), "MMM d")}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CommForm({
  items,
  onAdd,
}: {
  items: { id: string; channel: CommChannel; subject: string | null; body: string; occurred_on: string }[];
  onAdd: (input: { channel: CommChannel; subject: string; body: string; occurred_on: string | null }) => void;
}) {
  const [channel, setChannel] = useState<CommChannel>("call");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [occurred, setOccurred] = useState("");
  return (
    <section className="rounded-lg border border-border bg-background p-5 space-y-3">
      <h2 className="font-serif text-xl font-bold">Communications</h2>
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!body.trim()) return;
          onAdd({ channel, subject, body, occurred_on: occurred || null });
          setSubject("");
          setBody("");
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          <Select value={channel} onValueChange={(value) => setChannel(value as CommChannel)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(COMM_CHANNEL_LABELS) as CommChannel[]).map((key) => (
                <SelectItem key={key} value={key}>{COMM_CHANNEL_LABELS[key]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={occurred} onChange={(e) => setOccurred(e.target.value)} />
        </div>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="What was said or sent" />
        <Button type="submit" size="sm">Log communication</Button>
      </form>
      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.id} className="border-t border-border pt-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {COMM_CHANNEL_LABELS[item.channel]} · {format(parseISO(item.occurred_on), "MMM d")}
            </p>
            {item.subject ? <p className="font-medium">{item.subject}</p> : null}
            <p className="whitespace-pre-wrap">{item.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DocumentButton({ label, onFile }: { label: string; onFile: (file: File) => void }) {
  return (
    <Label className="inline-flex">
      <span className="inline-flex h-8 cursor-pointer items-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-muted">
        {label}
      </span>
      <input
        type="file"
        className="sr-only"
        accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </Label>
  );
}
