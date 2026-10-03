import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ciApi } from "../api";
import { CI_ORG_STATUS_LABELS, CI_ORG_TYPE_LABELS, type CiOrgStatus } from "../types";
import { CiAddClientDialog } from "./CiAddClientDialog";
import { CiDeleteClientDialog } from "./CiDeleteClientDialog";

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

export function CiOrganizationsListPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CiOrgStatus | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);

  const { data: orgs = [], isLoading, error } = useQuery({
    queryKey: ["ci", "organizations", status, search],
    queryFn: () => ciApi.organizations.list({ status, search }),
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-dark mb-1">
            Communications
          </p>
          <h1 className="font-serif text-3xl font-bold">All clients</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Search the full list. For daily work, start from Today.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Client
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
          {(error as Error).message}
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Client</th>
                <th className="px-3 py-2 font-medium">HQ record</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Primary contact</th>
                <th className="px-3 py-2 font-medium">Created</th>
                <th className="px-3 py-2 font-medium text-right"> </th>
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
                    {org.organization_type ? CI_ORG_TYPE_LABELS[org.organization_type] : "—"}
                  </td>
                  <td className="px-3 py-2">{CI_ORG_STATUS_LABELS[org.status]}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {org.hq_client?.primary_contact || org.hq_client?.email || "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{formatDate(org.created_at)}</td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleting({ id: org.id, name: org.name })}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
              {!orgs.length ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">
                    No clients yet. Add a client to start the guided workspace.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      <CiAddClientDialog open={createOpen} onOpenChange={setCreateOpen} />
      {deleting ? (
        <CiDeleteClientDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleting(null);
          }}
          organizationId={deleting.id}
          organizationName={deleting.name}
        />
      ) : null}
    </div>
  );
}
