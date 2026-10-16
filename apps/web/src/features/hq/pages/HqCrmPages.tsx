import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { hqApi, logHqActivity } from "../api";
import { ClientHomeTabs } from "./HqClientsPages";
import {
  LEAD_STAGE_LABELS,
  LEAD_STAGES,
  LEAD_SOURCE_LABELS,
  INTERESTED_SERVICE_LABELS,
  type HqLead,
  type LeadSource,
  type LeadStage,
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

const emptyLead = (): Partial<HqLead> & { full_name: string } => ({
  full_name: "",
  company: "",
  email: "",
  phone: "",
  lead_source: "website",
  interested_service: "session",
  estimated_value: null,
  stage: "new_lead",
  last_contact_date: null,
  next_follow_up_date: null,
  notes: "",
});

function LeadForm({
  initial,
  onSave,
  saving,
}: {
  initial: Partial<HqLead> & { full_name: string };
  onSave: (row: Partial<HqLead> & { full_name: string }) => void;
  saving?: boolean;
}) {
  const [form, setForm] = useState(initial);
  return (
    <form
      className="space-y-4 max-w-2xl"
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.full_name.trim()) {
          toast.error("Name is required");
          return;
        }
        onSave(form);
      }}
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Company / Organization</Label>
          <Input value={form.company ?? ""} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            type="email"
            value={form.email ?? ""}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Lead source</Label>
          <Select
            value={form.lead_source}
            onValueChange={(v) => setForm({ ...form, lead_source: v as LeadSource })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LEAD_SOURCE_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Interested service</Label>
          <Select
            value={form.interested_service}
            onValueChange={(v) => setForm({ ...form, interested_service: v as InterestedService })}
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
          <Label>Estimated value</Label>
          <Input
            type="number"
            value={form.estimated_value ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                estimated_value: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Stage</Label>
          <Select
            value={form.stage}
            onValueChange={(v) => setForm({ ...form, stage: v as LeadStage })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAD_STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {LEAD_STAGE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Last contact</Label>
          <Input
            type="date"
            value={form.last_contact_date ?? ""}
            onChange={(e) => setForm({ ...form, last_contact_date: e.target.value || null })}
          />
        </div>
        <div className="space-y-2">
          <Label>Next follow-up</Label>
          <Input
            type="date"
            value={form.next_follow_up_date ?? ""}
            onChange={(e) => setForm({ ...form, next_follow_up_date: e.target.value || null })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          rows={4}
          value={form.notes ?? ""}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save lead"}
      </Button>
    </form>
  );
}

export function HqCrmListPage() {
  const navigate = useNavigate();
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["hq", "leads"],
    queryFn: () => hqApi.leads.list(),
  });
  const [view, setView] = useState<"table" | "pipeline">("table");

  const byStage = useMemo(() => {
    const map: Record<LeadStage, HqLead[]> = {
      new_lead: [],
      contacted: [],
      conversation: [],
      strategic_session: [],
      proposal: [],
      project: [],
      ongoing_counsel: [],
      closed: [],
    };
    for (const l of leads) map[l.stage]?.push(l);
    return map;
  }, [leads]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold">Inquiries</h1>
          <p className="text-muted-foreground text-sm mt-1">Pipeline for strategic communications opportunities</p>
        </div>
        <div className="flex gap-2">
          <Button variant={view === "table" ? "default" : "outline"} size="sm" onClick={() => setView("table")}>
            Table
          </Button>
          <Button
            variant={view === "pipeline" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("pipeline")}
          >
            Pipeline
          </Button>
          <Button onClick={() => navigate("/hq/crm/new")}>
            <Plus className="h-4 w-4 mr-1" />
            New lead
          </Button>
        </div>
      </div>
      <ClientHomeTabs current="inquiries" />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : view === "table" ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Company</th>
                <th className="px-3 py-2 font-medium">Stage</th>
                <th className="px-3 py-2 font-medium">Service</th>
                <th className="px-3 py-2 font-medium">Follow-up</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <Link to={`/hq/crm/${l.id}`} className="text-primary font-medium hover:underline">
                      {l.full_name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{l.company || "—"}</td>
                  <td className="px-3 py-2">{LEAD_STAGE_LABELS[l.stage]}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {INTERESTED_SERVICE_LABELS[l.interested_service]}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{l.next_follow_up_date || "—"}</td>
                </tr>
              ))}
              {!leads.length ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                    No leads yet. Create your first opportunity.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {LEAD_STAGES.map((stage) => (
            <div
              key={stage}
              className="min-w-[200px] w-[200px] rounded-lg border border-border bg-background p-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                {LEAD_STAGE_LABELS[stage]} ({byStage[stage].length})
              </p>
              <ul className="space-y-2">
                {byStage[stage].map((l) => (
                  <li key={l.id}>
                    <Link
                      to={`/hq/crm/${l.id}`}
                      className={cn(
                        "block rounded-md border border-border px-2.5 py-2 text-sm hover:border-primary/40",
                      )}
                    >
                      <p className="font-medium">{l.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{l.company}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function HqCrmEditorPage() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data: lead, isLoading } = useQuery({
    queryKey: ["hq", "leads", id],
    queryFn: () => hqApi.leads.get(id!),
    enabled: !isNew && Boolean(id),
  });

  const save = useMutation({
    mutationFn: async (row: Partial<HqLead> & { full_name: string }) => {
      const payload = {
        ...row,
        id: isNew ? undefined : id,
        created_by: isNew ? user?.id ?? null : row.created_by,
      };
      const saved = await hqApi.leads.upsert(payload as Partial<HqLead> & { full_name: string });
      await logHqActivity({
        action: isNew ? "lead_created" : "lead_updated",
        entity_type: "lead",
        entity_id: saved.id,
        summary: isNew
          ? `Lead created: ${saved.full_name}`
          : `Lead updated: ${saved.full_name} (${LEAD_STAGE_LABELS[saved.stage]})`,
      });
      return saved;
    },
    onSuccess: (saved) => {
      void qc.invalidateQueries({ queryKey: ["hq", "leads"] });
      void qc.invalidateQueries({ queryKey: ["hq", "activity"] });
      toast.success("Lead saved");
      navigate(`/hq/crm/${saved.id}`);
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save"),
  });

  const convert = useMutation({
    mutationFn: async () => {
      if (!lead) throw new Error("No lead");
      const client = await hqApi.clients.upsert({
        client_name: lead.full_name,
        company: lead.company,
        primary_contact: lead.full_name,
        email: lead.email,
        phone: lead.phone,
        service: lead.interested_service,
        status: "prospect",
        source_lead_id: lead.id,
        notes: lead.notes,
        created_by: user?.id ?? null,
      });
      await hqApi.leads.upsert({
        ...lead,
        converted_client_id: client.id,
        stage: "project",
      });
      await logHqActivity({
        action: "lead_converted",
        entity_type: "client",
        entity_id: client.id,
        summary: `Lead converted to client: ${client.client_name}`,
      });
      return client;
    },
    onSuccess: (client) => {
      void qc.invalidateQueries({ queryKey: ["hq"] });
      toast.success("Converted to client");
      const service = lead?.interested_service;
      const offer = service && service !== "other" ? `?journey=${service}` : "";
      navigate(`/hq/clients/${client.id}${offer}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isNew && isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <Button variant="ghost" size="sm" onClick={() => navigate("/hq/crm")}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to CRM
      </Button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-serif text-3xl font-bold">{isNew ? "New lead" : lead?.full_name}</h1>
        {!isNew && lead && !lead.converted_client_id ? (
          <Button variant="outline" onClick={() => convert.mutate()} disabled={convert.isPending}>
            Convert to client
          </Button>
        ) : null}
        {lead?.converted_client_id ? (
          <Link to={`/hq/clients/${lead.converted_client_id}`} className="text-sm text-primary underline">
            View client
          </Link>
        ) : null}
      </div>
      <LeadForm
        key={lead?.id ?? "new"}
        initial={lead ?? emptyLead()}
        onSave={(row) => save.mutate(row)}
        saving={save.isPending}
      />
    </div>
  );
}
