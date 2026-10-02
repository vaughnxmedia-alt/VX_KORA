import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { toDateInputValue } from "../workspace";
import {
  CI_ACTION_STATUS_LABELS,
  CI_ACTION_STATUSES,
  CI_PRIORITY_LABELS,
  CI_PRIORITIES,
  type CiActionItem,
  type CiActionStatus,
  type CiActionWriteInput,
  type CiIntelligenceItem,
  type CiOpportunity,
  type CiOrganizationMember,
  type CiPriority,
} from "../types";

const NONE = "__none__";

export function CiActionDraftDialog({
  open,
  onOpenChange,
  organizationId,
  initial,
  members = [],
  opportunities = [],
  intelligenceItems = [],
  sourceLabel,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  initial: CiActionWriteInput;
  members?: CiOrganizationMember[];
  opportunities?: CiOpportunity[];
  intelligenceItems?: CiIntelligenceItem[];
  sourceLabel?: string | null;
  onSaved: (action: CiActionItem) => void;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState<CiActionWriteInput>(initial);

  useEffect(() => {
    if (open) setForm(initial);
  }, [open, initial]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Title is required");
      return ciApi.actions.create({
        ...form,
        organization_id: organizationId,
        created_by: user?.id ?? null,
      });
    },
    onSuccess: (action) => {
      toast.success("Action created");
      onOpenChange(false);
      onSaved(action);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Review action</DialogTitle>
          <DialogDescription>
            {sourceLabel
              ? `Drafted from ${sourceLabel}. Review this before it becomes a trackable action.`
              : "Create a specific communications task. Nothing is saved until you confirm."}
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
                  {CI_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {CI_PRIORITY_LABELS[p]}
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
                  {CI_ACTION_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {CI_ACTION_STATUS_LABELS[s]}
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save action"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
