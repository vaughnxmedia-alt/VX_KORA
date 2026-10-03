import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ciApi } from "../api";
import {
  classifyDue,
  formatCiDate,
  groupActionsByDue,
  toDateInputValue,
  type CiDueBucket,
  type CiWorkspaceContext,
} from "../workspace";
import {
  CI_ACTION_STATUS_LABELS,
  CI_ACTION_STATUSES,
  CI_PRIORITY_LABELS,
  CI_PRIORITIES,
  type CiActionItem,
  type CiActionStatus,
  type CiActionWriteInput,
  type CiPriority,
} from "../types";

const NONE = "__none__";

function emptyAction(organizationId: string): CiActionWriteInput {
  return {
    organization_id: organizationId,
    title: "",
    description: "",
    reason: "",
    priority: "medium",
    due_date: null,
    status: "not_started",
    assigned_to: null,
    intelligence_item_id: null,
    opportunity_id: null,
  };
}

function toForm(item: CiActionItem): CiActionWriteInput {
  return {
    organization_id: item.organization_id,
    title: item.title,
    description: item.description ?? "",
    reason: item.reason ?? "",
    priority: item.priority,
    due_date: item.due_date,
    status: item.status,
    assigned_to: item.assigned_to,
    intelligence_item_id: item.intelligence_item_id,
    opportunity_id: item.opportunity_id,
  };
}

function ActionCard({
  item,
  onEdit,
}: {
  item: CiActionItem;
  onEdit: () => void;
}) {
  return (
    <article className="rounded-lg border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            className="text-left font-serif text-lg font-bold leading-snug text-primary hover:underline"
            onClick={onEdit}
          >
            {item.title}
          </button>
          <p className="mt-1 text-xs text-muted-foreground">
            {CI_PRIORITY_LABELS[item.priority]} · {CI_ACTION_STATUS_LABELS[item.status]}
            {item.due_date ? ` · Due ${formatCiDate(item.due_date)}` : ""}
            {item.assignee_name ? ` · ${item.assignee_name}` : ""}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
          Edit
        </Button>
      </div>
      {item.reason ? <p className="mt-3 text-sm leading-relaxed">{item.reason}</p> : null}
      {item.opportunity_title || item.intelligence_title ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {item.opportunity_title ? `From opportunity: ${item.opportunity_title}` : null}
          {item.opportunity_title && item.intelligence_title ? " · " : null}
          {item.intelligence_title ? `From intelligence: ${item.intelligence_title}` : null}
        </p>
      ) : null}
    </article>
  );
}

function Section({
  title,
  empty,
  items,
  onEdit,
}: {
  title: string;
  empty: string;
  items: CiActionItem[];
  onEdit: (item: CiActionItem) => void;
}) {
  return (
    <section className="space-y-3">
      <h3 className="font-serif text-lg font-bold">
        {title}
        <span className="ml-2 text-sm font-normal text-muted-foreground">{items.length}</span>
      </h3>
      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <ActionCard key={item.id} item={item} onEdit={() => onEdit(item)} />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border bg-background/70 px-4 py-6 text-sm text-muted-foreground">
          {empty}
        </p>
      )}
    </section>
  );
}

export function CiOrganizationActionsTab() {
  const { org } = useOutletContext<CiWorkspaceContext>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [status, setStatus] = useState<CiActionStatus | "all">("all");
  const [priority, setPriority] = useState<CiPriority | "all">("all");
  const [dueFilter, setDueFilter] = useState<CiDueBucket | "all">("all");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingMeta, setEditingMeta] = useState<CiActionItem | null>(null);
  const [form, setForm] = useState<CiActionWriteInput>(emptyAction(org.id));

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["ci", "actions", org.id, status, priority],
    queryFn: () => ciApi.actions.list(org.id, { status, priority }),
  });
  const { data: members = [] } = useQuery({
    queryKey: ["ci", "members", org.id],
    queryFn: () => ciApi.members.listForOrganization(org.id),
  });
  const { data: opportunities = [] } = useQuery({
    queryKey: ["ci", "opportunities", org.id, "all", "all", "all"],
    queryFn: () => ciApi.opportunities.list(org.id),
  });
  const { data: intelligenceItems = [] } = useQuery({
    queryKey: ["ci", "intelligence", org.id, "all", "all", "all"],
    queryFn: () => ciApi.intelligence.list(org.id),
  });

  const filtered = useMemo(() => {
    if (dueFilter === "all") return items;
    return items.filter((item) => {
      const bucket = classifyDue(item.due_date);
      if (dueFilter === "upcoming") return bucket === "upcoming" || bucket === "none";
      return bucket === dueFilter;
    });
  }, [items, dueFilter]);

  const grouped = useMemo(() => groupActionsByDue(filtered), [filtered]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["ci", "actions", org.id] });
    void qc.invalidateQueries({ queryKey: ["ci", "organizations", org.id, "counts"] });
    void qc.invalidateQueries({ queryKey: ["ci", "workflow", org.id] });
    void qc.invalidateQueries({ queryKey: ["ci", "ops"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Title is required");
      if (editingId) return ciApi.actions.update(editingId, form);
      return ciApi.actions.create({
        ...form,
        organization_id: org.id,
        created_by: user?.id ?? null,
      });
    },
    onSuccess: () => {
      toast.success(editingId ? "Action updated" : "Action created");
      setOpen(false);
      setEditingId(null);
      setEditingMeta(null);
      setForm(emptyAction(org.id));
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditingId(null);
    setEditingMeta(null);
    setForm(emptyAction(org.id));
    setOpen(true);
  };

  const openEdit = (item: CiActionItem) => {
    setEditingId(item.id);
    setEditingMeta(item);
    setForm(toForm(item));
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-xl font-bold">Action plan</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Turn recommendations and opportunities into a short list of next steps the client can
            complete.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Build Action Plan
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Select value={status} onValueChange={(v) => setStatus(v as CiActionStatus | "all")}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {CI_ACTION_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {CI_ACTION_STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={(v) => setPriority(v as CiPriority | "all")}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {CI_PRIORITIES.map((value) => (
              <SelectItem key={value} value={value}>
                {CI_PRIORITY_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dueFilter} onValueChange={(v) => setDueFilter(v as CiDueBucket | "all")}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Due date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All due dates</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="this_week">Due this week</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? <p className="text-sm text-destructive">{(error as Error).message}</p> : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-8">
          <Section
            title="Overdue"
            empty="No overdue communications work."
            items={grouped.overdue}
            onEdit={openEdit}
          />
          <Section
            title="Due This Week"
            empty="No deadlines are approaching this week."
            items={grouped.thisWeek}
            onEdit={openEdit}
          />
          <Section
            title="Upcoming"
            empty="No next actions yet. Add the first one so the client knows what to do."
            items={grouped.upcoming}
            onEdit={openEdit}
          />
          <Section
            title="Completed"
            empty="No completed or cancelled actions yet."
            items={grouped.completed}
            onEdit={openEdit}
          />
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              {editingId ? "Edit action" : "New action"}
            </DialogTitle>
            <DialogDescription>
              A specific next step. Clients can update status, not strategy or ownership.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={form.priority ?? "medium"}
                  onValueChange={(v) => setForm({ ...form, priority: v as CiPriority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CI_PRIORITIES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {CI_PRIORITY_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status ?? "not_started"}
                  onValueChange={(v) => setForm({ ...form, status: v as CiActionStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CI_ACTION_STATUSES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {CI_ACTION_STATUS_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={toDateInputValue(form.due_date)}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value || null })}
                />
              </div>
              <div className="space-y-2">
                <Label>Assigned to</Label>
                <Select
                  value={form.assigned_to || NONE}
                  onValueChange={(v) => setForm({ ...form, assigned_to: v === NONE ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Unassigned</SelectItem>
                    {members
                      .filter((m) => m.status === "active")
                      .map((m) => (
                        <SelectItem key={m.user_id} value={m.user_id}>
                          {m.full_name || m.email || "Member"}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Why it matters</Label>
              <Textarea
                rows={3}
                value={form.reason ?? ""}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Related opportunity</Label>
                <Select
                  value={form.opportunity_id || NONE}
                  onValueChange={(v) => setForm({ ...form, opportunity_id: v === NONE ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {opportunities.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Related intelligence</Label>
                <Select
                  value={form.intelligence_item_id || NONE}
                  onValueChange={(v) =>
                    setForm({ ...form, intelligence_item_id: v === NONE ? null : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {intelligenceItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {editingMeta ? (
              <p className="text-xs text-muted-foreground">
                Created {formatCiDate(editingMeta.created_at)}
                {" · "}
                Updated {formatCiDate(editingMeta.updated_at)}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : editingId ? "Save changes" : "Create action"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
