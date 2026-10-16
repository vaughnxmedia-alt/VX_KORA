import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { journeyApi } from "../journeyApi";
import { migrationHint } from "../journeyUi";
import { CASE_APPROVAL_LABELS, INTERESTED_SERVICE_LABELS } from "../types";

export default function HqCaseStudiesPage() {
  const records = useQuery({
    queryKey: ["hq", "case-studies"],
    queryFn: () => journeyApi.caseStudies.list(),
    retry: 0,
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="font-serif text-3xl font-bold">Case studies</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Internal drafts created with each engagement. Nothing here is published to /work.
        </p>
      </div>

      {records.isError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {migrationHint(records.error)}
        </div>
      ) : null}

      {records.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Client</th>
                <th className="px-3 py-2 font-medium">Engagement</th>
                <th className="px-3 py-2 font-medium">Service</th>
                <th className="px-3 py-2 font-medium">Approval</th>
                <th className="px-3 py-2 font-medium">Publication</th>
              </tr>
            </thead>
            <tbody>
              {(records.data ?? []).map((row) => (
                <tr key={row.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <Link to={`/hq/clients/${row.client_id}`} className="hover:underline">
                      {row.client?.client_name || "Client"}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link to={`/hq/journeys/${row.engagement_id}`} className="font-medium text-primary hover:underline">
                      {row.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.engagement ? INTERESTED_SERVICE_LABELS[row.engagement.service_key] : "—"}
                  </td>
                  <td className="px-3 py-2">{CASE_APPROVAL_LABELS[row.approval_status]}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.publication_status === "copied" ? "Unpublished Brief draft" : "Internal"}
                  </td>
                </tr>
              ))}
              {!records.isLoading && !records.data?.length ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                    No internal drafts yet. Opening an engagement creates one.
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
