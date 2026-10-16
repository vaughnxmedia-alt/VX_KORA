import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowUp, Plus } from "lucide-react";
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
import { toast } from "sonner";
import { useHqAuth } from "../HqAuth";
import { journeyApi } from "../journeyApi";
import { migrationHint } from "../journeyUi";
import {
  ASSIGNMENT_RULE_LABELS,
  COMPLETION_RULE_LABELS,
  DUE_RULE_LABELS,
  TASK_TYPE_LABELS,
  type AssignmentRule,
  type CompletionRule,
  type DueRuleKind,
  type HqTemplateStage,
  type HqTemplateTask,
  type TaskType,
} from "../types";

const COMPLETION_RULES = Object.keys(COMPLETION_RULE_LABELS) as CompletionRule[];
const TASK_TYPES = Object.keys(TASK_TYPE_LABELS) as TaskType[];
const ASSIGNMENT_RULES = Object.keys(ASSIGNMENT_RULE_LABELS) as AssignmentRule[];
const DUE_KINDS = Object.keys(DUE_RULE_LABELS) as DueRuleKind[];

export default function HqJourneyTemplatesPage() {
  const { hqRole } = useHqAuth();
  const canEdit = hqRole === "owner";
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("template");
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(false);

  const templates = useQuery({ queryKey: ["hq", "journey-templates"], queryFn: () => journeyApi.templates.list() });
  const services = useQuery({ queryKey: ["hq", "services"], queryFn: () => journeyApi.services(), retry: 0 });
  const stages = useQuery({ queryKey: ["hq", "journey-template-stages"], queryFn: () => journeyApi.templates.stages() });
  const tasks = useQuery({ queryKey: ["hq", "journey-template-tasks"], queryFn: () => journeyApi.templates.tasks() });
  const deliverables = useQuery({
    queryKey: ["hq", "journey-template-deliverables"],
    queryFn: () => journeyApi.templates.deliverables(),
  });
  const staff = useQuery({ queryKey: ["hq", "staff"], queryFn: () => journeyApi.staff() });

  const refresh = async (templateId?: string) => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["hq", "journey-templates"] }),
      qc.invalidateQueries({ queryKey: ["hq", "journey-template-stages"] }),
      qc.invalidateQueries({ queryKey: ["hq", "journey-template-tasks"] }),
      qc.invalidateQueries({ queryKey: ["hq", "journey-template-deliverables"] }),
      qc.invalidateQueries({ queryKey: ["hq", "services"] }),
    ]);
    if (templateId) setParams({ template: templateId });
  };

  const serviceChoices = (services.data ?? []).filter((service) => service.is_active);
  const visible = (templates.data ?? []).filter((template) => showArchived || template.status !== "archived");
  const selected = visible.find((template) => template.id === selectedId) ?? visible.find((template) => template.is_active) ?? visible[0];
  const stageList = (stages.data ?? [])
    .filter((stage) => stage.template_id === selected?.id && !stage.archived_at)
    .sort((a, b) => a.position - b.position);
  const serviceName = (key: string) => services.data?.find((service) => service.service_key === key)?.name ?? key;

  return (
    <div className="space-y-6 max-w-6xl">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/hq/settings"><ArrowLeft className="h-4 w-4 mr-1" />Settings</Link>
      </Button>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-dark">Services</p>
          <h1 className="font-serif text-3xl font-bold">Journey templates</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Define the stages a client moves through for each service. An engagement keeps the version it was opened from.
          </p>
        </div>
        {canEdit ? (
          <Button onClick={() => setCreating((open) => !open)}>
            <Plus className="h-4 w-4 mr-1" /> New template
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Preview only. Template changes are limited to owners.</p>
        )}
      </div>

      {templates.isError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {migrationHint(templates.error)}
        </div>
      ) : null}

      {creating && canEdit ? (
        <CreateTemplate
          services={serviceChoices}
          onCreated={async (id) => {
            setCreating(false);
            await refresh(id);
          }}
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-lg border border-border bg-background p-3 space-y-2">
          <label className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Show archived
          </label>
          {visible.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => setParams({ template: template.id })}
              className={`w-full rounded-md px-3 py-2 text-left ${selected?.id === template.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              <span className="block text-sm font-medium">{template.name}</span>
              <span className={`block text-[11px] ${selected?.id === template.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {serviceName(template.service_key)} · v{template.version} · {template.status ?? (template.is_active ? "active" : "inactive")}
              </span>
            </button>
          ))}
        </aside>

        {selected ? (
          <TemplateBuilder
            template={selected}
            stages={stageList}
            tasks={tasks.data ?? []}
            deliverables={deliverables.data ?? []}
            staff={staff.data ?? []}
            services={serviceChoices}
            canEdit={canEdit}
            onChanged={refresh}
          />
        ) : (
          <p className="text-sm text-muted-foreground">No templates yet.</p>
        )}
      </div>
    </div>
  );
}

function CreateTemplate({
  services,
  onCreated,
}: {
  services: { service_key: string; name: string }[];
  onCreated: (id: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [serviceKey, setServiceKey] = useState(services[0]?.service_key ?? "");
  const [newService, setNewService] = useState("");
  const save = useMutation({
    mutationFn: async () => {
      const key = newService.trim() || serviceKey;
      if (newService.trim()) {
        await journeyApi.templates.saveService(newService.trim(), newService.trim(), "");
      }
      return journeyApi.templates.create(key, name, description);
    },
    onSuccess: (id) => {
      toast.success("Template created");
      void onCreated(id);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <form
      className="rounded-lg border border-border bg-background p-4 grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <div className="space-y-2">
        <Label>Template name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Existing service</Label>
        <Select value={serviceKey || undefined} onValueChange={setServiceKey}>
          <SelectTrigger><SelectValue placeholder="Select a service" /></SelectTrigger>
          <SelectContent>
            {services.map((service) => (
              <SelectItem key={service.service_key} value={service.service_key}>{service.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Or a new service name</Label>
        <Input value={newService} onChange={(e) => setNewService(e.target.value)} placeholder="Leave blank to use the service above" />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </div>
      <Button type="submit" disabled={save.isPending}>{save.isPending ? "Creating…" : "Create template"}</Button>
    </form>
  );
}

function TemplateBuilder({
  template,
  stages,
  tasks,
  deliverables,
  staff,
  services,
  canEdit,
  onChanged,
}: {
  template: { id: string; name: string; description: string | null; service_key: string; status?: string; is_active: boolean };
  stages: HqTemplateStage[];
  tasks: HqTemplateTask[];
  deliverables: { id: string; stage_id: string; name: string; description: string | null; is_required: boolean; archived_at?: string | null }[];
  staff: { id: string; full_name: string | null }[];
  services: { service_key: string; name: string }[];
  canEdit: boolean;
  onChanged: (templateId?: string) => Promise<void>;
}) {
  const [stageId, setStageId] = useState<string | null>(stages[0]?.id ?? null);
  useEffect(() => {
    setStageId(stages[0]?.id ?? null);
  }, [template.id]);
  const selected = stages.find((stage) => stage.id === stageId) ?? stages[0];
  const run = useMutation({
    mutationFn: (work: () => Promise<string | void>) => work(),
    onSuccess: (id) => void onChanged(typeof id === "string" ? id : template.id),
    onError: (error: Error) => toast.error(error.message),
  });

  const move = (index: number, direction: -1 | 1) => {
    const next = stages.slice();
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    run.mutate(() => journeyApi.templates.reorder(template.id, next.map((stage) => stage.id)));
  };

  return (
    <div className="space-y-4">
      <TemplateMeta key={template.id} template={template} services={services} canEdit={canEdit} onChanged={onChanged} />
      <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
        <div className="space-y-2">
          {stages.map((stage, index) => (
            <div key={stage.id} className="space-y-2">
            <div className="flex items-stretch gap-1">
              <button
                type="button"
                onClick={() => setStageId(stage.id)}
                className={`flex-1 rounded-md border px-3 py-3 text-left ${selected?.id === stage.id ? "border-primary bg-background" : "border-border bg-background/70"}`}
              >
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Stage {index + 1}</span>
                <span className="block font-medium">{stage.name}</span>
              </button>
              {canEdit ? (
                <div className="flex flex-col">
                  <Button type="button" size="icon" variant="ghost" aria-label="Move stage up" onClick={() => move(index, -1)}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" aria-label="Move stage down" onClick={() => move(index, 1)}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
            </div>
            {index < stages.length - 1 ? <p className="text-center text-muted-foreground leading-none">↓</p> : null}
            </div>
          ))}
          {canEdit ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() =>
                run.mutate(async () => {
                  const saved = await journeyApi.templates.saveStage({
                    template_id: template.id,
                    stage_id: null,
                    name: "New stage",
                    description: "",
                    completion_rules: ["all_required_tasks"],
                    assignment_rule: "unassigned",
                    specific_user_id: null,
                  });
                  setStageId(saved.stage_id);
                  return saved.template_id;
                })
              }
            >
              <Plus className="h-4 w-4 mr-1" /> Add stage
            </Button>
          ) : null}
        </div>
        {selected ? (
          <StageEditor
            key={selected.id}
            templateId={template.id}
            stage={selected}
            tasks={tasks.filter((task) => task.stage_id === selected.id && !task.archived_at)}
            deliverables={deliverables.filter((item) => item.stage_id === selected.id && !item.archived_at)}
            staff={staff}
            canEdit={canEdit}
            onChanged={onChanged}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Add a stage to start this journey.</p>
        )}
      </div>
    </div>
  );
}

function TemplateMeta({
  template,
  services,
  canEdit,
  onChanged,
}: {
  template: { id: string; name: string; description: string | null; service_key: string; status?: string; is_active: boolean };
  services: { service_key: string; name: string }[];
  canEdit: boolean;
  onChanged: (templateId?: string) => Promise<void>;
}) {
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description ?? "");
  const [serviceKey, setServiceKey] = useState(template.service_key);
  const save = useMutation({
    mutationFn: () => journeyApi.templates.update(template.id, name, description, serviceKey),
    onSuccess: (id) => {
      toast.success("Template saved");
      void onChanged(id);
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const status = useMutation({
    mutationFn: (next: "active" | "inactive" | "archived") => journeyApi.templates.setStatus(template.id, next),
    onSuccess: () => void onChanged(template.id),
    onError: (error: Error) => toast.error(error.message),
  });
  const duplicate = useMutation({
    mutationFn: () => journeyApi.templates.duplicate(template.id),
    onSuccess: (id) => {
      toast.success("Template duplicated");
      void onChanged(id);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="rounded-lg border border-border bg-background p-4 space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
        </div>
        <div className="space-y-2">
          <Label>Service</Label>
          <Select value={serviceKey} onValueChange={setServiceKey} disabled={!canEdit}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {services.map((service) => (
                <SelectItem key={service.service_key} value={service.service_key}>{service.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} disabled={!canEdit} />
        </div>
      </div>
      {canEdit ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => save.mutate()} disabled={save.isPending}>Save template</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => duplicate.mutate()}>Duplicate</Button>
          {template.is_active ? (
            <Button type="button" size="sm" variant="outline" onClick={() => status.mutate("inactive")}>Deactivate</Button>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={() => status.mutate("active")}>Activate</Button>
          )}
          <Button type="button" size="sm" variant="ghost" onClick={() => status.mutate("archived")}>Archive</Button>
        </div>
      ) : null}
    </div>
  );
}

function StageEditor({
  templateId,
  stage,
  tasks,
  deliverables,
  staff,
  canEdit,
  onChanged,
}: {
  templateId: string;
  stage: HqTemplateStage;
  tasks: HqTemplateTask[];
  deliverables: { id: string; name: string; description: string | null; is_required: boolean }[];
  staff: { id: string; full_name: string | null }[];
  canEdit: boolean;
  onChanged: (templateId?: string) => Promise<void>;
}) {
  const [name, setName] = useState(stage.name);
  const [description, setDescription] = useState(stage.description ?? "");
  const [rules, setRules] = useState<CompletionRule[]>(stage.completion_rules ?? []);
  const [assignment, setAssignment] = useState<AssignmentRule>(stage.assignment_rule ?? "unassigned");
  const [specificUser, setSpecificUser] = useState(stage.specific_user_id ?? "");
  const [taskTitle, setTaskTitle] = useState("");
  const [deliverableName, setDeliverableName] = useState("");

  const save = useMutation({
    mutationFn: () =>
      journeyApi.templates.saveStage({
        template_id: templateId,
        stage_id: stage.id,
        name,
        description,
        completion_rules: rules,
        assignment_rule: assignment,
        specific_user_id: specificUser || null,
      }),
    onSuccess: (saved) => {
      toast.success("Stage saved");
      void onChanged(saved.template_id);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleRule = (rule: CompletionRule) => {
    setRules((current) => (current.includes(rule) ? current.filter((item) => item !== rule) : [...current, rule]));
  };

  return (
    <div className="rounded-lg border border-border bg-background p-4 space-y-4">
      <div className="space-y-2">
        <Label>Stage name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
      </div>
      <div className="space-y-2">
        <Label>Stage purpose</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} disabled={!canEdit} />
      </div>
      <div className="space-y-2">
        <Label>Completion requirements</Label>
        <div className="grid sm:grid-cols-2 gap-2 text-sm">
          {COMPLETION_RULES.map((rule) => (
            <label key={rule} className="flex items-center gap-2">
              <input type="checkbox" checked={rules.includes(rule)} disabled={!canEdit} onChange={() => toggleRule(rule)} />
              {COMPLETION_RULE_LABELS[rule]}
            </label>
          ))}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Stage owner rule</Label>
          <Select value={assignment} onValueChange={(value) => setAssignment(value as AssignmentRule)} disabled={!canEdit}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ASSIGNMENT_RULES.map((rule) => (
                <SelectItem key={rule} value={rule}>{ASSIGNMENT_RULE_LABELS[rule]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {assignment === "specific" ? (
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select value={specificUser || undefined} onValueChange={setSpecificUser} disabled={!canEdit}>
              <SelectTrigger><SelectValue placeholder="Select an employee" /></SelectTrigger>
              <SelectContent>
                {staff.map((person) => (
                  <SelectItem key={person.id} value={person.id}>{person.full_name || "Staff"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
      {canEdit ? (
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={() => save.mutate()} disabled={save.isPending}>Save stage</Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() =>
              journeyApi.templates.archiveStage(templateId, stage.id).then((id) => {
                toast.success("Stage archived");
                return onChanged(id);
              }).catch((error: Error) => toast.error(error.message))
            }
          >
            Archive stage
          </Button>
        </div>
      ) : null}

      <div className="border-t border-border pt-4 space-y-3">
        <h3 className="font-serif text-xl font-bold">Tasks</h3>
        {tasks.map((task) => (
          <TaskRow key={task.id} templateId={templateId} stageId={stage.id} task={task} staff={staff} canEdit={canEdit} onChanged={onChanged} />
        ))}
        {canEdit ? (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!taskTitle.trim()) return;
              void journeyApi.templates.saveTask({
                template_id: templateId,
                stage_id: stage.id,
                task_id: null,
                title: taskTitle,
                description: "",
                instructions: "",
                task_type: "internal",
                assignment_rule: "unassigned",
                specific_user_id: null,
                is_required: true,
                due_rule: { kind: "none" },
              }).then((saved) => {
                setTaskTitle("");
                return onChanged(saved.template_id);
              }).catch((error: Error) => toast.error(error.message));
            }}
          >
            <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Add a task" />
            <Button type="submit" size="sm" variant="outline">Add</Button>
          </form>
        ) : null}
      </div>

      <div className="border-t border-border pt-4 space-y-3">
        <h3 className="font-serif text-xl font-bold">Deliverables</h3>
        <p className="text-xs text-muted-foreground">On an engagement these can move from Draft to Internal Review, Approved, Client Review, and Final.</p>
        {deliverables.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-2 text-sm border border-border rounded-md px-3 py-2">
            <span>{item.name}{item.is_required ? "" : " · optional"}</span>
            {canEdit ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  journeyApi.templates.archiveDeliverable(templateId, stage.id, item.id).then(onChanged).catch((error: Error) => toast.error(error.message))
                }
              >
                Archive
              </Button>
            ) : null}
          </div>
        ))}
        {canEdit ? (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!deliverableName.trim()) return;
              void journeyApi.templates.saveDeliverable({
                template_id: templateId,
                stage_id: stage.id,
                deliverable_id: null,
                name: deliverableName,
                description: "",
                is_required: true,
              }).then((saved) => {
                setDeliverableName("");
                return onChanged(saved.template_id);
              }).catch((error: Error) => toast.error(error.message));
            }}
          >
            <Input value={deliverableName} onChange={(e) => setDeliverableName(e.target.value)} placeholder="Add a deliverable" />
            <Button type="submit" size="sm" variant="outline">Add</Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function TaskRow({
  templateId,
  stageId,
  task,
  staff,
  canEdit,
  onChanged,
}: {
  templateId: string;
  stageId: string;
  task: HqTemplateTask;
  staff: { id: string; full_name: string | null }[];
  canEdit: boolean;
  onChanged: (templateId?: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [instructions, setInstructions] = useState(task.instructions ?? "");
  const [taskType, setTaskType] = useState<TaskType>(task.task_type ?? "internal");
  const [required, setRequired] = useState(task.is_required !== false);
  const [assignment, setAssignment] = useState<AssignmentRule>(task.assignment_rule ?? "unassigned");
  const [specificUser, setSpecificUser] = useState(task.specific_user_id ?? "");
  const [dueKind, setDueKind] = useState<DueRuleKind>(task.due_rule?.kind ?? "none");
  const [amount, setAmount] = useState(task.due_rule?.amount?.toString() ?? "");
  const dueLabel = useMemo(() => DUE_RULE_LABELS[task.due_rule?.kind ?? "none"], [task.due_rule?.kind]);

  return (
    <div className="rounded-md border border-border p-3 space-y-2">
      <button type="button" className="w-full text-left" onClick={() => setOpen((value) => !value)}>
        <span className="font-medium">{task.title}</span>
        <span className="block text-xs text-muted-foreground">
          {TASK_TYPE_LABELS[task.task_type ?? "internal"]} · {task.is_required === false ? "Optional" : "Required"} · {dueLabel}
        </span>
      </button>
      {open ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit} />
          <Select value={taskType} onValueChange={(value) => setTaskType(value as TaskType)} disabled={!canEdit}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TASK_TYPES.map((type) => (
                <SelectItem key={type} value={type}>{TASK_TYPE_LABELS[type]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea className="sm:col-span-2" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" disabled={!canEdit} />
          <Textarea className="sm:col-span-2" rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Notes / instructions" disabled={!canEdit} />
          <Select value={assignment} onValueChange={(value) => setAssignment(value as AssignmentRule)} disabled={!canEdit}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ASSIGNMENT_RULES.map((rule) => (
                <SelectItem key={rule} value={rule}>{ASSIGNMENT_RULE_LABELS[rule]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dueKind} onValueChange={(value) => setDueKind(value as DueRuleKind)} disabled={!canEdit}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DUE_KINDS.map((kind) => (
                <SelectItem key={kind} value={kind}>{DUE_RULE_LABELS[kind]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {dueKind !== "none" && dueKind !== "same_day" ? (
            <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" disabled={!canEdit} />
          ) : null}
          {assignment === "specific" ? (
            <Select value={specificUser || undefined} onValueChange={setSpecificUser} disabled={!canEdit}>
              <SelectTrigger><SelectValue placeholder="Employee" /></SelectTrigger>
              <SelectContent>
                {staff.map((person) => (
                  <SelectItem key={person.id} value={person.id}>{person.full_name || "Staff"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={required} disabled={!canEdit} onChange={(e) => setRequired(e.target.checked)} />
            Required
          </label>
          {canEdit ? (
            <div className="flex gap-2 sm:col-span-2">
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  journeyApi.templates.saveTask({
                    template_id: templateId,
                    stage_id: stageId,
                    task_id: task.id,
                    title,
                    description,
                    instructions,
                    task_type: taskType,
                    assignment_rule: assignment,
                    specific_user_id: specificUser || null,
                    is_required: required,
                    due_rule: { kind: dueKind, amount: amount ? Number(amount) : null },
                  }).then((saved) => onChanged(saved.template_id)).catch((error: Error) => toast.error(error.message))
                }
              >
                Save task
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  journeyApi.templates.archiveTask(templateId, stageId, task.id).then(onChanged).catch((error: Error) => toast.error(error.message))
                }
              >
                Archive task
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
