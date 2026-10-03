import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { ciApi } from "../api";
import { ciFriendlyError, formatCiDate } from "../workspace";
import {
  CI_OUTCOME_TYPE_LABELS,
  CI_OUTCOME_TYPES,
  type CiOutcomeType,
} from "../types";
import type { CiWorkspaceContext } from "../workspace";

export function CiOrganizationOutcomesTab() {
  const { org } = useOutletContext<CiWorkspaceContext>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [type, setType] = useState<CiOutcomeType>("media_coverage");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [opportunityId, setOpportunityId] = useState("");
  const [actionId, setActionId] = useState("");
  const [intelligenceId, setIntelligenceId] = useState("");

  const { data = [], isLoading, error } = useQuery({
    queryKey: ["ci", "outcomes", org.id],
    queryFn: () => ciApi.outcomes.list(org.id),
  });
  const { data: opportunities = [] } = useQuery({
    queryKey: ["ci", "opportunities", org.id],
    queryFn: () => ciApi.opportunities.list(org.id),
  });
  const { data: actions = [] } = useQuery({
    queryKey: ["ci", "actions", org.id],
    queryFn: () => ciApi.actions.list(org.id),
  });
  const { data: intelligence = [] } = useQuery({
    queryKey: ["ci", "intelligence", org.id, "all", "all", "all"],
    queryFn: () => ciApi.intelligence.list(org.id),
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Add a short title.");
      return ciApi.outcomes.create({
        organization_id: org.id,
        outcome_type: type,
        title,
        description,
        occurred_on: date || null,
        url,
        opportunity_id: opportunityId || null,
        action_item_id: actionId || null,
        intelligence_item_id: intelligenceId || null,
        admin_notes: notes,
        created_by: user?.id,
      });
    },
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setNotes("");
      setUrl("");
      setOpportunityId("");
      setActionId("");
      setIntelligenceId("");
      toast.success("Outcome recorded");
      void qc.invalidateQueries({ queryKey: ["ci", "outcomes", org.id] });
    },
    onError: (e: Error) => toast.error(ciFriendlyError(e)),
  });

  return (
    <div className="space-y-8">
      <form
        className="rounded-lg border border-border bg-background p-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <h2 className="font-serif text-xl font-bold">Record a communications outcome</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ci-outcome-type">Outcome type</Label>
            <Select value={type} onValueChange={(value) => setType(value as CiOutcomeType)}>
              <SelectTrigger id="ci-outcome-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CI_OUTCOME_TYPES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {CI_OUTCOME_TYPE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ci-outcome-date">Date</Label>
            <Input id="ci-outcome-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ci-outcome-title">Title</Label>
          <Input id="ci-outcome-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ci-outcome-desc">Description</Label>
          <Textarea id="ci-outcome-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <RelatedSelect
            id="ci-outcome-opp"
            label="Related opportunity"
            value={opportunityId}
            onChange={setOpportunityId}
            options={opportunities.map((item) => ({ id: item.id, title: item.title }))}
          />
          <RelatedSelect
            id="ci-outcome-action"
            label="Related action"
            value={actionId}
            onChange={setActionId}
            options={actions.map((item) => ({ id: item.id, title: item.title }))}
          />
          <RelatedSelect
            id="ci-outcome-intel"
            label="Related intelligence"
            value={intelligenceId}
            onChange={setIntelligenceId}
            options={intelligence.map((item) => ({ id: item.id, title: item.title }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ci-outcome-url">Optional URL</Label>
          <Input id="ci-outcome-url" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ci-outcome-notes">Internal notes</Label>
          <Textarea id="ci-outcome-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Saving…" : "Save outcome"}
        </Button>
      </form>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading outcomes…</p> : null}
      {error ? <p className="text-sm text-destructive">{ciFriendlyError(error)}</p> : null}
      <section className="space-y-3">
        <h2 className="font-serif text-xl font-bold">Recorded outcomes</h2>
        {data.length ? (
          data.map((item) => (
            <article key={item.id} className="rounded-lg border border-border bg-background p-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                {CI_OUTCOME_TYPE_LABELS[item.outcome_type]}
                {item.occurred_on ? ` · ${formatCiDate(item.occurred_on)}` : ""}
              </p>
              <h3 className="font-serif text-lg font-bold">{item.title}</h3>
              {item.description ? <p className="mt-2 text-sm">{item.description}</p> : null}
              {item.admin_notes ? (
                <p className="mt-2 text-xs text-muted-foreground">Internal: {item.admin_notes}</p>
              ) : null}
            </article>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No communications outcomes have been recorded yet.</p>
        )}
      </section>
    </div>
  );
}

function RelatedSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; title: string }[];
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value || "none"} onValueChange={(next) => onChange(next === "none" ? "" : next)}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="None" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          {options.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default CiOrganizationOutcomesTab;
