import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { hqApi, logHqActivity } from "../api";
import { journeyApi } from "../journeyApi";
import { JourneyStatusBadge, migrationHint } from "../journeyUi";
import { JOURNEY_STATUS_LABELS } from "../types";
import {
  CLIENT_STATUS_LABELS,
  INTERESTED_SERVICE_LABELS,
  type ClientStatus,
  type HqClient,
  type InterestedService,
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
import { toast } from "sonner";
import { Plus, ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { cn } from "@/lib/utils";

const emptyClient = (): Partial<HqClient> & { client_name: string } => ({
  client_name: "",
  company: "",
  primary_contact: "",
  email: "",
  phone: "",
  website: "",
  industry: "",
  service: "project",
  status: "prospect",
  start_date: null,
  contract_value: null,
  notes: "",
});

function ClientForm({
  initial,
  onSave,
  saving,
}: {
  initial: Partial<HqClient> & { client_name: string };
  onSave: (row: Partial<HqClient> & { client_name: string }) => void;
  saving?: boolean;
}) {
  const [form, setForm] = useState(initial);
  return (
    <form
      className="space-y-4 max-w-2xl"
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.client_name.trim()) {
          toast.error("Client name is required");
          return;
        }
        onSave(form);
      }}
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Client name *</Label>
          <Input
            value={form.client_name}
            onChange={(e) => setForm({ ...form, client_name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Company / Organization</Label>
          <Input value={form.company ?? ""} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Primary contact</Label>
          <Input
            value={form.primary_contact ?? ""}
            onChange={(e) => setForm({ ...form, primary_contact: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Website</Label>
          <Input value={form.website ?? ""} onChange={(e) => setForm({ ...form, website: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Industry</Label>
          <Input value={form.industry ?? ""} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Service</Label>
          <Select
            value={form.service ?? "other"}
            onValueChange={(v) => setForm({ ...form, service: v as InterestedService })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(INTERESTED_SERVICE_LABELS).map(([k, label]) => (
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
            value={form.status}
            onValueChange={(v) => setForm({ ...form, status: v as ClientStatus })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CLIENT_STATUS_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Start date</Label>
          <Input
            type="date"
            value={form.start_date ?? ""}
            onChange={(e) => setForm({ ...form, start_date: e.target.value || null })}
          />
        </div>
        <div className="space-y-2">
          <Label>Contract value</Label>
          <Input
            type="number"
            value={form.contract_value ?? ""}
            onChange={(e) =>
              setForm({ ...form, contract_value: e.target.value ? Number(e.target.value) : null })
            }
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea rows={4} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save client"}
      </Button>
    </form>
  );
}

export function HqClientsListPage() {
  const navigate = useNavigate();
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["hq", "clients"],
    queryFn: () => hqApi.clients.list(),
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">Active and prospect relationships</p>
        </div>
        <Button onClick={() => navigate("/hq/clients/new")}>
          <Plus className="h-4 w-4 mr-1" />
          New client
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Client</th>
                <th className="px-3 py-2 font-medium">Company</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Service</th>
                <th className="px-3 py-2 font-medium">Email</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <Link to={`/hq/clients/${c.id}`} className="text-primary font-medium hover:underline">
                      {c.client_name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{c.company || "—"}</td>
                  <td className="px-3 py-2">{CLIENT_STATUS_LABELS[c.status]}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {c.service ? INTERESTED_SERVICE_LABELS[c.service] : "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{c.email || "—"}</td>
                </tr>
              ))}
              {!clients.length ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                    No clients yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function HqClientDetailPage() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [tab, setTab] = useState<"overview" | "notes" | "tasks" | "journeys" | "content" | "future">("overview");

  const { data: client, isLoading } = useQuery({
    queryKey: ["hq", "clients", id],
    queryFn: () => hqApi.clients.get(id!),
    enabled: !isNew && Boolean(id),
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ["hq", "tasks"],
    queryFn: () => hqApi.tasks.list(),
    enabled: !isNew,
  });
  const { data: content = [] } = useQuery({
    queryKey: ["hq", "content"],
    queryFn: () => hqApi.content.list(),
    enabled: !isNew,
  });
  const journeys = useQuery({
    queryKey: ["hq", "engagements"],
    queryFn: () => journeyApi.engagements.list(),
    enabled: !isNew && tab === "journeys",
    retry: 0,
  });

  const save = useMutation({
    mutationFn: async (row: Partial<HqClient> & { client_name: string }) => {
      const saved = await hqApi.clients.upsert({
        ...row,
        id: isNew ? undefined : id,
        created_by: isNew ? user?.id ?? null : row.created_by,
      });
      await logHqActivity({
        action: isNew ? "client_created" : "client_updated",
        entity_type: "client",
        entity_id: saved.id,
        summary: isNew ? `Client added: ${saved.client_name}` : `Client updated: ${saved.client_name}`,
      });
      return saved;
    },
    onSuccess: (saved) => {
      void qc.invalidateQueries({ queryKey: ["hq", "clients"] });
      void qc.invalidateQueries({ queryKey: ["hq", "activity"] });
      toast.success("Client saved");
      navigate(`/hq/clients/${saved.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isNew && isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const clientTasks = tasks.filter((t) => t.client_id === id);
  const clientContent = content.filter((c) => c.hq_client_id === id);

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "notes" as const, label: "Notes" },
    { id: "tasks" as const, label: "Tasks" },
    { id: "journeys" as const, label: "Journeys" },
    { id: "content" as const, label: "Content / Case Studies" },
    { id: "future" as const, label: "Coming soon" },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <Button variant="ghost" size="sm" onClick={() => navigate("/hq/clients")}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to clients
      </Button>
      <h1 className="font-serif text-3xl font-bold">{isNew ? "New client" : client?.client_name}</h1>

      {!isNew ? (
        <div className="flex flex-wrap gap-2 border-b border-border pb-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : null}

      {(isNew || tab === "overview") && (
        <ClientForm
          key={client?.id ?? "new"}
          initial={client ?? emptyClient()}
          onSave={(row) => save.mutate(row)}
          saving={save.isPending}
        />
      )}

      {!isNew && tab === "notes" ? (
        <div className="rounded-lg border border-border bg-background p-5 text-sm whitespace-pre-wrap">
          {client?.notes || "No notes yet. Edit Overview to add notes."}
        </div>
      ) : null}

      {!isNew && tab === "tasks" ? (
        <div className="space-y-2">
          <Button size="sm" asChild>
            <Link to={`/hq/tasks?client=${id}`}>Add task</Link>
          </Button>
          <ul className="text-sm space-y-1">
            {clientTasks.map((t) => (
              <li key={t.id} className="border border-border rounded-md px-3 py-2">
                {t.title} · {t.status}
              </li>
            ))}
            {!clientTasks.length ? <li className="text-muted-foreground">No linked tasks</li> : null}
          </ul>
        </div>
      ) : null}

      {!isNew && tab === "journeys" ? (
        <div className="space-y-3">
          <Button size="sm" asChild>
            <Link to={`/hq/journeys?new=1&client=${id}`}>Open engagement</Link>
          </Button>
          {journeys.isError ? (
            <p className="text-sm text-amber-900">{migrationHint(journeys.error)}</p>
          ) : (
            <ul className="text-sm space-y-2">
              {(journeys.data ?? [])
                .filter((row) => row.client_id === id)
                .map((row) => (
                  <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                    <Link to={`/hq/journeys/${row.id}`} className="font-medium text-primary hover:underline">
                      {row.title}
                    </Link>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      {row.current_stage?.name || JOURNEY_STATUS_LABELS[row.status]}
                      <JourneyStatusBadge status={row.status} />
                    </span>
                  </li>
                ))}
              {!(journeys.data ?? []).some((row) => row.client_id === id) && !journeys.isLoading ? (
                <li className="text-muted-foreground">No engagements yet. The client record stays here across every service.</li>
              ) : null}
            </ul>
          )}
        </div>
      ) : null}

      {!isNew && tab === "content" ? (
        <ul className="text-sm space-y-1">
          {clientContent.map((c) => (
            <li key={c.id}>
              <Link to={`/hq/content/${c.id}`} className="text-primary hover:underline">
                {c.title}
              </Link>
            </li>
          ))}
          {!clientContent.length ? (
            <li className="text-muted-foreground">No linked content yet. Link via Content editor.</li>
          ) : null}
        </ul>
      ) : null}

      {!isNew && tab === "future" ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground space-y-2">
          <p>Placeholders for Version 2+</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Media</li>
            <li>Documents</li>
            <li>Revenue</li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
