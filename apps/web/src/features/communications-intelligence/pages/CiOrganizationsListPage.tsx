import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
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
import { hqApi } from "@/features/hq/api";
import { ciApi } from "../api";
import {
  CI_ORG_STATUS_LABELS,
  CI_ORG_TYPE_LABELS,
  CI_ORG_TYPES,
  type CiOrgCreateInput,
  type CiOrgStatus,
  type CiOrganizationType,
} from "../types";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

const emptyCreate = (): CiOrgCreateInput => ({
  name: "",
  organization_type: "small_business",
  industry: "",
  website: "",
  location: "",
  description: "",
  status: "active",
  hq_client_id: null,
});

export function CiOrganizationsListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CiOrgStatus | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CiOrgCreateInput>(emptyCreate());

  const { data: orgs = [], isLoading, error } = useQuery({
    queryKey: ["ci", "organizations", status, search],
    queryFn: () => ciApi.organizations.list({ status, search }),
  });

  const { data: hqClients = [] } = useQuery({
    queryKey: ["hq", "clients"],
    queryFn: () => hqApi.clients.list(),
    enabled: createOpen,
  });

  const linkedClientIds = useMemo(
    () => new Set(orgs.map((o) => o.hq_client_id).filter(Boolean) as string[]),
    [orgs],
  );

  const create = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Organization name is required");
      return ciApi.organizations.create({
        ...form,
        created_by: user?.id ?? null,
        hq_client_id: form.hq_client_id || null,
      });
    },
    onSuccess: (org) => {
      void qc.invalidateQueries({ queryKey: ["ci", "organizations"] });
      toast.success("Organization created");
      setCreateOpen(false);
      setForm(emptyCreate());
      navigate(`/hq/intelligence/organizations/${org.id}`);
    },
    onError: (e: Error) => toast.error(e.message || "Could not create organization"),
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-dark mb-1">
            Communications Intelligence
          </p>
          <h1 className="font-serif text-3xl font-bold">Organizations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Concierge intelligence tenants linked to JahKnowsPR HQ clients when useful.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New organization
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, industry, location…"
            className="pl-9 bg-background"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as CiOrgStatus | "all")}>
          <SelectTrigger className="w-full sm:w-44 bg-background">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(CI_ORG_STATUS_LABELS).map(([k, label]) => (
              <SelectItem key={k} value={k}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-background p-4 text-sm text-destructive">
          {(error as Error).message.includes("ci_organizations") ||
          (error as Error).message.includes("schema cache")
            ? "Communications Intelligence tables are not available yet. Apply the CI V1 migration in Supabase."
            : (error as Error).message}
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Organization</th>
                <th className="px-3 py-2 font-medium">HQ client</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Primary contact</th>
                <th className="px-3 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => (
                <tr key={org.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <Link
                      to={`/hq/intelligence/organizations/${org.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {org.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {org.hq_client ? (
                      <Link
                        to={`/hq/clients/${org.hq_client.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {org.hq_client.client_name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {org.organization_type
                      ? CI_ORG_TYPE_LABELS[org.organization_type]
                      : "—"}
                  </td>
                  <td className="px-3 py-2">{CI_ORG_STATUS_LABELS[org.status]}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {org.hq_client?.primary_contact || org.hq_client?.email || "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{formatDate(org.created_at)}</td>
                </tr>
              ))}
              {!orgs.length ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                    No Communications Intelligence organizations yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">New organization</DialogTitle>
            <DialogDescription>
              Creates a CI tenant only. Link an existing HQ client if one already exists — this will not create a
              duplicate HQ client.
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>Organization name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Organization type</Label>
                <Select
                  value={form.organization_type ?? "other"}
                  onValueChange={(v) =>
                    setForm({ ...form, organization_type: v as CiOrganizationType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CI_ORG_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {CI_ORG_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status ?? "active"}
                  onValueChange={(v) => setForm({ ...form, status: v as CiOrgStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CI_ORG_STATUS_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Industry</Label>
              <Input
                value={form.industry ?? ""}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  value={form.website ?? ""}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https://"
                />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={form.location ?? ""}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Short description</Label>
              <Textarea
                rows={3}
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Link existing HQ client</Label>
              <Select
                value={form.hq_client_id ?? "none"}
                onValueChange={(v) =>
                  setForm({ ...form, hq_client_id: v === "none" ? null : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No HQ client link</SelectItem>
                  {hqClients.map((c) => (
                    <SelectItem
                      key={c.id}
                      value={c.id}
                      disabled={linkedClientIds.has(c.id) && form.hq_client_id !== c.id}
                    >
                      {c.client_name}
                      {linkedClientIds.has(c.id) ? " (already linked)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Optional. Does not create a new HQ client record.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Creating…" : "Create organization"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
