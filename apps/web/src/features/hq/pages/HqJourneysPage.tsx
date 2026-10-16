import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, startOfDay } from "date-fns";
import { Plus } from "lucide-react";
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
import { toast } from "sonner";
import { hqApi } from "../api";
import { useHqAuth } from "../HqAuth";
import { journeyApi } from "../journeyApi";
import { JourneyStatusBadge, migrationHint } from "../journeyUi";
import {
  INTERESTED_SERVICE_LABELS,
  JOURNEY_STATUSES,
  JOURNEY_STATUS_LABELS,
  type JourneyService,
  type JourneyStatus,
} from "../types";

const SERVICES: JourneyService[] = ["session", "project", "counsel"];

function isOpen(status: JourneyStatus) {
  return status !== "completed" && status !== "cancelled";
}

export default function HqJourneysPage() {
  const { user } = useAuth();
  const { hqRole } = useHqAuth();
  const canManage = hqRole === "owner" || hqRole === "strategist";
  const canApprove = hqRole === "owner";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const showNew = params.get("new") === "1";
  const presetClient = params.get("client") ?? "";

  const [service, setService] = useState<string>("all");
  const [status, setStatus] = useState<string>("open");
  const [owner, setOwner] = useState<string>("all");
  const [stage, setStage] = useState("");
  const [attention, setAttention] = useState<string>("all");

  const engagements = useQuery({
    queryKey: ["hq", "engagements"],
    queryFn: () => journeyApi.engagements.list(),
    retry: 1,
  });
  const tasks = useQuery({
    queryKey: ["hq", "engagement-tasks", "open"],
    queryFn: () => journeyApi.openTasks(),
    enabled: !engagements.isError,
    retry: 1,
  });
  const staff = useQuery({
    queryKey: ["hq", "staff"],
    queryFn: () => journeyApi.staff(),
    retry: 1,
  });
  const clients = useQuery({
    queryKey: ["hq", "clients"],
    queryFn: () => hqApi.clients.list(),
    enabled: canManage,
  });
  const templates = useQuery({
    queryKey: ["hq", "journey-templates"],
    queryFn: () => journeyApi.templates.list(),
    enabled: canManage && showNew,
  });

  const staffName = (id: string | null) => {
    if (!id) return "Unassigned";
    return staff.data?.find((s) => s.id === id)?.full_name || "Staff";
  };

  const today = startOfDay(new Date());
  const overdueIds = useMemo(() => {
    const ids = new Set<string>();
    for (const task of tasks.data ?? []) {
      if (task.is_milestone && task.due_date && parseISO(task.due_date) < today) ids.add(task.engagement_id);
    }
    return ids;
  }, [tasks.data, today]);
  const pendingIds = useMemo(() => {
    const ids = new Set<string>();
    for (const task of tasks.data ?? []) {
      if (task.approval_status === "pending") ids.add(task.engagement_id);
    }
    return ids;
  }, [tasks.data]);

  const rows = (engagements.data ?? []).filter((row) => {
    if (service !== "all" && row.service_key !== service) return false;
    if (status === "open" && !isOpen(row.status)) return false;
    if (status !== "all" && status !== "open" && row.status !== status) return false;
    if (owner !== "all" && row.owner_id !== owner) return false;
    if (stage && !(row.current_stage?.name ?? "").toLowerCase().includes(stage.toLowerCase())) return false;
    if (attention === "overdue" && !overdueIds.has(row.id)) return false;
    if (attention === "approval" && !pendingIds.has(row.id)) return false;
    if (attention === "follow_up") {
      if (!row.follow_up_date || row.status === "cancelled") return false;
      if (parseISO(row.follow_up_date) > today) return false;
    }
    return true;
  });

  const myTasks = (tasks.data ?? []).filter(
    (task) => task.assignee_id === user?.id && isOpen(task.status),
  );

  const followUps = (engagements.data ?? []).filter(
    (row) =>
      row.status !== "cancelled" &&
      row.follow_up_date &&
      parseISO(row.follow_up_date) <= today,
  );

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold">Client journeys</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Engagements from inquiry through completion and follow-up.
          </p>
        </div>
        <div className="flex gap-2">
          {canApprove ? (
            <Button variant="outline" asChild>
              <Link to="/hq/journeys/templates">Templates</Link>
            </Button>
          ) : null}
          {canManage ? (
            <Button
              onClick={() => {
                const next = new URLSearchParams(params);
                next.set("new", "1");
                setParams(next);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Open engagement
            </Button>
          ) : null}
        </div>
      </div>

      {engagements.isError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {migrationHint(engagements.error)}
        </div>
      ) : null}

      {!engagements.isError ? <div className="grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setAttention(attention === "overdue" ? "all" : "overdue")}
          className="rounded-lg border border-border bg-background p-4 text-left"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Overdue milestones</p>
          <p className="mt-1 font-serif text-2xl font-bold text-primary">{overdueIds.size}</p>
        </button>
        <button
          type="button"
          onClick={() => setAttention(attention === "approval" ? "all" : "approval")}
          className="rounded-lg border border-border bg-background p-4 text-left"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Awaiting approval</p>
          <p className="mt-1 font-serif text-2xl font-bold text-primary">{pendingIds.size}</p>
        </button>
        <button
          type="button"
          onClick={() => setAttention(attention === "follow_up" ? "all" : "follow_up")}
          className="rounded-lg border border-border bg-background p-4 text-left"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Follow-up due</p>
          <p className="mt-1 font-serif text-2xl font-bold text-primary">{followUps.length}</p>
        </button>
      </div> : null}

      {!canManage ? (
        <section className="rounded-lg border border-border bg-background p-5">
          <h2 className="font-serif text-xl font-bold">Your work</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {myTasks.map((task) => (
              <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                <Link to={`/hq/journeys/${task.engagement_id}`} className="font-medium text-primary hover:underline">
                  {task.title}
                </Link>
                <span className="text-muted-foreground">
                  {task.due_date ? format(parseISO(task.due_date), "MMM d") : "No due date"}
                </span>
              </li>
            ))}
            {!myTasks.length ? <li className="text-muted-foreground">No open tasks assigned to you.</li> : null}
          </ul>
        </section>
      ) : null}

      {showNew && canManage ? (
        <OpenEngagementForm
          clients={clients.data ?? []}
          templates={(templates.data ?? []).filter((t) => t.is_active)}
          staff={staff.data ?? []}
          presetClient={presetClient}
          defaultOwner={user?.id ?? ""}
          onCancel={() => {
            const next = new URLSearchParams(params);
            next.delete("new");
            setParams(next);
          }}
          onCreated={(id) => {
            void qc.invalidateQueries({ queryKey: ["hq", "engagements"] });
            navigate(`/hq/journeys/${id}`);
          }}
        />
      ) : null}

      <div className="grid gap-3 md:grid-cols-4">
        <Select value={service} onValueChange={setService}>
          <SelectTrigger><SelectValue placeholder="Service" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All services</SelectItem>
            {SERVICES.map((key) => (
              <SelectItem key={key} value={key}>{INTERESTED_SERVICE_LABELS[key]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="all">All statuses</SelectItem>
            {JOURNEY_STATUSES.map((key) => (
              <SelectItem key={key} value={key}>{JOURNEY_STATUS_LABELS[key]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={owner} onValueChange={setOwner}>
          <SelectTrigger><SelectValue placeholder="Employee" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All employees</SelectItem>
            {(staff.data ?? []).map((person) => (
              <SelectItem key={person.id} value={person.id}>{person.full_name || "Staff"}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input value={stage} onChange={(e) => setStage(e.target.value)} placeholder="Filter by stage" />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Client</th>
              <th className="px-3 py-2 font-medium">Engagement</th>
              <th className="px-3 py-2 font-medium">Service</th>
              <th className="px-3 py-2 font-medium">Stage</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Owner</th>
              <th className="px-3 py-2 font-medium">Follow-up</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border hover:bg-muted/20">
                <td className="px-3 py-2">
                  <Link to={`/hq/clients/${row.client_id}`} className="hover:underline">
                    {row.client?.client_name || "Client"}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <Link to={`/hq/journeys/${row.id}`} className="font-medium text-primary hover:underline">
                    {row.title}
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{INTERESTED_SERVICE_LABELS[row.service_key]}</td>
                <td className="px-3 py-2">{row.current_stage?.name || "—"}</td>
                <td className="px-3 py-2"><JourneyStatusBadge status={row.status} /></td>
                <td className="px-3 py-2 text-muted-foreground">{staffName(row.owner_id)}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {row.follow_up_date ? format(parseISO(row.follow_up_date), "MMM d, yyyy") : "—"}
                </td>
              </tr>
            ))}
            {!engagements.isLoading && !rows.length ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  No engagements match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OpenEngagementForm({
  clients,
  templates,
  staff,
  presetClient,
  defaultOwner,
  onCancel,
  onCreated,
}: {
  clients: { id: string; client_name: string }[];
  templates: { id: string; name: string; service_key: string }[];
  staff: { id: string; full_name: string | null }[];
  presetClient: string;
  defaultOwner: string;
  onCancel: () => void;
  onCreated: (id: string) => void;
}) {
  const [clientId, setClientId] = useState(presetClient);
  const [templateId, setTemplateId] = useState("");
  const [ownerId, setOwnerId] = useState(defaultOwner);
  const selectedTemplate = templateId || templates[0]?.id || "";
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [followUp, setFollowUp] = useState("");

  const save = useMutation({
    mutationFn: () =>
      journeyApi.engagements.open({
        client_id: clientId,
        template_id: selectedTemplate,
        owner_id: ownerId,
        title,
        start_date: startDate || null,
        target_end_date: endDate || null,
        follow_up_date: followUp || null,
      }),
    onSuccess: (id) => {
      toast.success("Engagement opened");
      onCreated(id);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <form
      className="rounded-lg border border-border bg-background p-5 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!clientId || !selectedTemplate || !ownerId) {
          toast.error("Client, service, and owner are required");
          return;
        }
        save.mutate();
      }}
    >
      <h2 className="font-serif text-xl font-bold">Open an engagement</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Client</Label>
          <Select value={clientId || undefined} onValueChange={setClientId}>
            <SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>{client.client_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Service template</Label>
          <Select value={selectedTemplate || undefined} onValueChange={setTemplateId}>
            <SelectTrigger><SelectValue placeholder="Select a service" /></SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Responsible employee</Label>
          <Select value={ownerId || undefined} onValueChange={setOwnerId}>
            <SelectTrigger><SelectValue placeholder="Assign" /></SelectTrigger>
            <SelectContent>
              {staff.map((person) => (
                <SelectItem key={person.id} value={person.id}>{person.full_name || "Staff"}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Defaults to the service name" />
        </div>
        <div className="space-y-2">
          <Label>Start</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Target end</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Follow-up</Label>
          <Input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={save.isPending}>{save.isPending ? "Opening…" : "Create journey"}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
