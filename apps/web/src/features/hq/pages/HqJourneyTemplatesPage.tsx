import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useHqAuth } from "../HqAuth";
import { journeyApi } from "../journeyApi";
import { INTERESTED_SERVICE_LABELS, type HqJourneyTemplate, type JourneyService } from "../types";

type DraftTask = {
  title: string;
  description: string;
  is_milestone: boolean;
  is_deliverable: boolean;
  requires_approval: boolean;
  relative_due_days: string;
};

type DraftStage = {
  name: string;
  description: string;
  requires_approval: boolean;
  tasks: DraftTask[];
};

const emptyTask = (): DraftTask => ({
  title: "",
  description: "",
  is_milestone: false,
  is_deliverable: false,
  requires_approval: false,
  relative_due_days: "",
});

export default function HqJourneyTemplatesPage() {
  const { hqRole } = useHqAuth();
  const templates = useQuery({
    queryKey: ["hq", "journey-templates"],
    queryFn: () => journeyApi.templates.list(),
  });
  const stages = useQuery({
    queryKey: ["hq", "journey-template-stages"],
    queryFn: () => journeyApi.templates.stages(),
  });
  const tasks = useQuery({
    queryKey: ["hq", "journey-template-tasks"],
    queryFn: () => journeyApi.templates.tasks(),
  });
  const [editing, setEditing] = useState<string | null>(null);

  if (hqRole !== "owner") {
    return <p className="text-sm text-muted-foreground">Template publishing is limited to owners.</p>;
  }

  const active = (templates.data ?? []).filter((template) => template.is_active);

  return (
    <div className="space-y-6 max-w-4xl">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/hq/journeys"><ArrowLeft className="h-4 w-4 mr-1" />Journeys</Link>
      </Button>
      <div>
        <h1 className="font-serif text-3xl font-bold">Journey templates</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Publishing a change creates a new version. Engagements already opened keep the version they were created from.
        </p>
      </div>
      {active.map((template) => (
        <article key={template.id} className="rounded-lg border border-border bg-background p-5 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-gold-dark">
                {INTERESTED_SERVICE_LABELS[template.service_key]} · v{template.version}
              </p>
              <h2 className="font-serif text-2xl font-bold">{template.name}</h2>
              {template.description ? <p className="text-sm text-muted-foreground mt-1">{template.description}</p> : null}
            </div>
            <Button size="sm" variant="outline" onClick={() => setEditing(template.id)}>
              Edit as new version
            </Button>
          </div>
          <ol className="space-y-2 text-sm">
            {(stages.data ?? [])
              .filter((stage) => stage.template_id === template.id)
              .map((stage) => (
                <li key={stage.id}>
                  <span className="font-medium">{stage.position}. {stage.name}</span>
                  {stage.requires_approval ? <span className="text-gold-dark"> · approval required</span> : null}
                  <ul className="mt-1 ml-4 text-muted-foreground">
                    {(tasks.data ?? [])
                      .filter((task) => task.stage_id === stage.id)
                      .map((task) => (
                        <li key={task.id}>{task.title}</li>
                      ))}
                  </ul>
                </li>
              ))}
          </ol>
          {editing === template.id ? (
            <TemplateEditor
              template={template}
              stages={(stages.data ?? []).filter((stage) => stage.template_id === template.id)}
              tasks={tasks.data ?? []}
              onClose={() => setEditing(null)}
            />
          ) : null}
        </article>
      ))}
    </div>
  );
}

function TemplateEditor({
  template,
  stages,
  tasks,
  onClose,
}: {
  template: HqJourneyTemplate;
  stages: { id: string; name: string; description: string | null; requires_approval: boolean }[];
  tasks: { stage_id: string; title: string; description: string | null; is_milestone: boolean; is_deliverable: boolean; requires_approval: boolean; relative_due_days: number | null }[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const initial = useMemo<DraftStage[]>(
    () =>
      stages.map((stage) => ({
        name: stage.name,
        description: stage.description ?? "",
        requires_approval: stage.requires_approval,
        tasks: tasks
          .filter((task) => task.stage_id === stage.id)
          .map((task) => ({
            title: task.title,
            description: task.description ?? "",
            is_milestone: task.is_milestone,
            is_deliverable: task.is_deliverable,
            requires_approval: task.requires_approval,
            relative_due_days: task.relative_due_days?.toString() ?? "",
          })),
      })),
    [stages, tasks],
  );
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description ?? "");
  const [draft, setDraft] = useState<DraftStage[]>(initial);

  const save = useMutation({
    mutationFn: () =>
      journeyApi.templates.publish({
        service_key: template.service_key as JourneyService,
        name,
        description,
        stages: draft.map((stage) => ({
          name: stage.name,
          description: stage.description,
          requires_approval: stage.requires_approval,
          tasks: stage.tasks.map((task) => ({
            title: task.title,
            description: task.description,
            is_milestone: task.is_milestone,
            is_deliverable: task.is_deliverable,
            requires_approval: task.requires_approval,
            relative_due_days: task.relative_due_days ? Number(task.relative_due_days) : null,
          })),
        })),
      }),
    onSuccess: async () => {
      toast.success("Published a new template version");
      await qc.invalidateQueries({ queryKey: ["hq", "journey-templates"] });
      await qc.invalidateQueries({ queryKey: ["hq", "journey-template-stages"] });
      await qc.invalidateQueries({ queryKey: ["hq", "journey-template-tasks"] });
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateStage = (index: number, patch: Partial<DraftStage>) => {
    setDraft((current) => current.map((stage, i) => (i === index ? { ...stage, ...patch } : stage)));
  };

  return (
    <form
      className="space-y-4 border-t border-border pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <div className="space-y-2">
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </div>
      {draft.map((stage, index) => (
        <fieldset key={`${template.id}-${index}`} className="rounded-md border border-border p-3 space-y-3">
          <div className="flex gap-2">
            <Input
              value={stage.name}
              onChange={(e) => updateStage(index, { name: e.target.value })}
              placeholder="Stage name"
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setDraft((current) => current.filter((_, i) => i !== index))}
              aria-label="Remove stage"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={stage.requires_approval}
              onChange={(e) => updateStage(index, { requires_approval: e.target.checked })}
            />
            Stage requires owner approval
          </label>
          {stage.tasks.map((task, taskIndex) => (
            <div key={taskIndex} className="grid sm:grid-cols-[1fr_90px_auto] gap-2">
              <Input
                value={task.title}
                placeholder="Task"
                onChange={(e) => {
                  const next = stage.tasks.map((item, i) => (i === taskIndex ? { ...item, title: e.target.value } : item));
                  updateStage(index, { tasks: next });
                }}
              />
              <Input
                type="number"
                min={0}
                value={task.relative_due_days}
                placeholder="Days"
                onChange={(e) => {
                  const next = stage.tasks.map((item, i) =>
                    i === taskIndex ? { ...item, relative_due_days: e.target.value } : item,
                  );
                  updateStage(index, { tasks: next });
                }}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Remove task"
                onClick={() => updateStage(index, { tasks: stage.tasks.filter((_, i) => i !== taskIndex) })}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" size="sm" variant="ghost" onClick={() => updateStage(index, { tasks: [...stage.tasks, emptyTask()] })}>
            <Plus className="h-4 w-4 mr-1" /> Task
          </Button>
        </fieldset>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => setDraft((current) => [...current, { name: "", description: "", requires_approval: false, tasks: [emptyTask()] }])}
      >
        <Plus className="h-4 w-4 mr-1" /> Stage
      </Button>
      <div className="flex gap-2">
        <Button type="submit" disabled={save.isPending}>{save.isPending ? "Publishing…" : "Publish version"}</Button>
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
}
