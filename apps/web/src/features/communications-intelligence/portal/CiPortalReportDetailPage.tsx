import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { MonthlyReportView } from "../MonthlyReportView";
import { UsefulFeedback } from "../UsefulFeedback";
import { ciApi } from "../api";
import { ciFriendlyError } from "../workspace";

export function CiPortalReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const search = params.toString() ? `?${params.toString()}` : "";

  const { data, isLoading, error } = useQuery({
    queryKey: ["ci", "reports", reportId],
    queryFn: () => ciApi.reports.get(reportId!),
    enabled: Boolean(reportId && user?.id),
  });

  const { data: org } = useQuery({
    queryKey: ["ci", "organizations", data?.organization_id],
    queryFn: () => ciApi.organizations.get(data!.organization_id),
    enabled: Boolean(data?.organization_id),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading this summary…</p>;
  }

  if (error || !data) {
    return (
      <p className="text-sm text-destructive">
        {ciFriendlyError(error) || "This report is not available."}
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <style>{`
        @media print {
          header, nav, footer, .ci-no-print { display: none !important; }
          main { padding: 0 !important; max-width: none !important; }
          body { background: white !important; }
        }
      `}</style>
      <div className="ci-no-print flex flex-wrap items-center justify-between gap-3">
        <Link to={{ pathname: "/portal/reports", search }} className="text-sm text-muted-foreground hover:text-primary">
          Back to summaries
        </Link>
        <Button type="button" variant="outline" onClick={() => window.print()}>
          Print or save PDF
        </Button>
      </div>
      <MonthlyReportView report={data} organizationName={org?.name || "Organization"} />
      <div className="ci-no-print">
        <UsefulFeedback
          organizationId={data.organization_id}
          relatedType="monthly_report"
          relatedId={data.id}
        />
      </div>
    </div>
  );
}

export default CiPortalReportDetailPage;
