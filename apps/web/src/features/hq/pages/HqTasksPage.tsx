import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { hqApi, logHqActivity } from "../api";
import { journeyApi } from "../journeyApi";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type HqTask,
  type TaskPriority,
  type TaskStatus,
} from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { addDays, endOfDay, format, isSameDay, isWithinInterval, parseISO, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";

type ViewFilter = "my" | "today" | "week" | "completed" | "all";

export default function HqTasksPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const preClient = params.get("client");
  const qc = useQueryClient();
  const [view, setView] = useState<ViewFilter>("all");
  const [open, setOpen] = useState(Boolean(preClient));
  const [editing, setEditing] = useState<Partial<HqTask> | null>(
    preClient ? { title: "", client_id: preClient, status: "todo", priority: "normal" } : null,
  );

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["hq", "tasks"],
    queryFn: () => hqApi.tasks.list(),
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["hq", "clients"],
    queryFn: () => hqApi.clients.list(),
  });
  const journeyWork = useQuery({
    queryKey: ["hq", "my-journey-work"],
    queryFn: () => journeyApi.myWork(),
    retry: 0,
  });

  const filtered = useMemo(() => {
    const today = new Date();
    return tasks.filter((t) => {
      if (view === "my") return t.assignee_id === user?.id;
      if (view === "today")
        return t.status !== "complete" && t.due_date && isSameDay(parseISO(t.due_date), today);
      if (view === "week")
        return (
          t.status !== "complete" &&
          t.due_date &&
          isWithinInterval(parseISO(t.due_date), {
            start: startOfDay(today),
            end: endOfDay(addDays(today, 7)),
          })
        );
      if (view === "completed") return t.status === "complete";
      return true;
    });
  }, [tasks, view, user?.id]);

  const save = useMutation({
    mutationFn: async (row: Partial<HqTask> & { title: string }) => {
      const wasComplete = row.id
        ? tasks.find((t) => t.id === row.id)?.status === "complete"
        : false;
      const payload = {
        ...row,
        completed_at:
          row.status === "complete"
            ? row.completed_at ?? new Date().toISOString()
            : null,
        created_by: row.id ? row.created_by : user?.id ?? null,
        assignee_id: row.assignee_id ?? user?.id ?? null,
      };
      const saved = await hqApi.tasks.upsert(payload as Partial<HqTask> & { title: string });
      if (saved.status === "complete" && !wasComplete) {
        await logHqActivity({
          action: "task_completed",
          entity_type: "task",
          entity_id: saved.id,
          summary: `Task completed: ${saved.title}`,
        });
      }
      return saved;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["hq", "tasks"] });
      void qc.invalidateQueries({ queryKey: ["hq", "activity"] });
      toast.success("Task saved");
      setOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const views: { id: ViewFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "my", label: "My Tasks" },
    { id: "today", label: "Due Today" },
    { id: "week", label: "Due This Week" },
    { id: "completed", label: "Completed" },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Journey work assigned to you, plus the shorter ops list.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing({
              title: "",
              status: "todo",
              priority: "normal",
              client_id: preClient,
              assignee_id: user?.id ?? null,
            });
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          New task
        </Button>
      </div>

      <section className="rounded-lg border border-border bg-background p-5">
        <h2 className="font-serif text-xl font-bold">My work</h2>
        <p className="mt-1 text-sm text-muted-foreground">Open journey tasks assigned to you, with the client and stage.</p>
        {journeyWork.isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {(journeyWork.data ?? []).map((task) => (
              <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                <div>
                  <Link to={`/hq/journeys/${task.engagement_id}`} className="font-medium text-primary hover:underline">
                    {task.title}
                  </Link>
                  <p className="text-muted-foreground">
                    {task.client_name || "Client"}
                    {task.stage_name ? ` · ${task.stage_name}` : ""}
                    {task.engagement_title ? ` · ${task.engagement_title}` : ""}
                  </p>
                </div>
                <span className="text-muted-foreground">
                  {task.due_date ? format(parseISO(task.due_date), "MMM d") : "No due date"}
                </span>
              </li>
            ))}
            {!journeyWork.data?.length ? (
              <li className="text-muted-foreground">No open journey tasks assigned to you.</li>
            ) : null}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        {views.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              view === v.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Task</th>
                <th className="px-3 py-2 font-medium">Client</th>
                <th className="px-3 py-2 font-medium">Due</th>
                <th className="px-3 py-2 font-medium">Priority</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr
                  key={t.id}
                  className="border-t border-border hover:bg-muted/20 cursor-pointer"
                  onClick={() => {
                    setEditing(t);
                    setOpen(true);
                  }}
                >
                  <td className="px-3 py-2 font-medium">{t.title}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {clients.find((c) => c.id === t.client_id)?.client_name || "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{t.due_date || "—"}</td>
                  <td className="px-3 py-2">{TASK_PRIORITY_LABELS[t.priority]}</td>
                  <td className="px-3 py-2">{TASK_STATUS_LABELS[t.status]}</td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                    No tasks in this view.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit task" : "New task"}</DialogTitle>
          </DialogHeader>
          {editing ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Task name</Label>
                <Input
                  value={editing.title ?? ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Select
                    value={editing.client_id ?? "none"}
                    onValueChange={(v) =>
                      setEditing({ ...editing, client_id: v === "none" ? null : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Standalone</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.client_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due date</Label>
                  <Input
                    type="date"
                    value={editing.due_date ?? ""}
                    onChange={(e) => setEditing({ ...editing, due_date: e.target.value || null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={editing.priority ?? "normal"}
                    onValueChange={(v) => setEditing({ ...editing, priority: v as TaskPriority })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TASK_PRIORITY_LABELS).map(([k, label]) => (
                        <SelectItem key={k} value={k}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editing.status ?? "todo"}
                    onValueChange={(v) => setEditing({ ...editing, status: v as TaskStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TASK_STATUS_LABELS).map(([k, label]) => (
                        <SelectItem key={k} value={k}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  rows={2}
                  value={editing.notes ?? ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              onClick={() => {
                if (!editing?.title?.trim()) {
                  toast.error("Task name required");
                  return;
                }
                save.mutate(editing as Partial<HqTask> & { title: string });
              }}
              disabled={save.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
