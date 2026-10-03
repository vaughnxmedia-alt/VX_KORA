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
import { ciFriendlyError, formatCiDate, monthLabel, startOfWeekMonday, toDateInputValue } from "../workspace";
import {
  CI_BRIEF_STATUS_LABELS,
  CI_REPORT_STATUS_LABELS,
  CI_REPORT_STATUSES,
  type CiBriefStatus,
  type CiReportStatus,
} from "../types";
import type { CiWorkspaceContext } from "../workspace";

export function CiOrganizationReportsTab() {
  const { org } = useOutletContext<CiWorkspaceContext>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [status, setStatus] = useState<CiReportStatus>("draft");
  const [executive, setExecutive] = useState("");
  const [attention, setAttention] = useState("");
  const [opportunities, setOpportunities] = useState("");
  const [actions, setActions] = useState("");
  const [health, setHealth] = useState("");
  const [outcomes, setOutcomes] = useState("");
  const [priorities, setPriorities] = useState("");
  const [counsel, setCounsel] = useState("");

  const [weekOf, setWeekOf] = useState(toDateInputValue(startOfWeekMonday().toISOString()));
  const [needs, setNeeds] = useState("");
  const [bestOpp, setBestOpp] = useState("");
  const [important, setImportant] = useState("");
  const [upcoming, setUpcoming] = useState("");
  const [note, setNote] = useState("");

  const { data: reports = [] } = useQuery({
    queryKey: ["ci", "reports", org.id],
    queryFn: () => ciApi.reports.list(org.id),
  });
  const { data: briefs = [] } = useQuery({
    queryKey: ["ci", "briefs", org.id],
    queryFn: () => ciApi.briefs.list(org.id),
  });

  const saveReport = useMutation({
    mutationFn: () =>
      ciApi.reports.upsert({
        organization_id: org.id,
        period_year: year,
        period_month: month,
        status,
        executive_summary: executive,
        needed_attention: attention,
        opportunities,
        actions_taken: actions,
        health,
        outcomes,
        next_priorities: priorities,
        counsel,
        created_by: user?.id,
      }),
    onSuccess: () => {
      toast.success(status === "published" ? "Monthly report published" : "Monthly report saved");
      void qc.invalidateQueries({ queryKey: ["ci", "reports", org.id] });
    },
    onError: (e: Error) => toast.error(ciFriendlyError(e)),
  });

  const saveBrief = useMutation({
    mutationFn: (briefStatus: CiBriefStatus) =>
      ciApi.briefs.upsert({
        organization_id: org.id,
        week_of: weekOf,
        needs_attention: needs,
        best_opportunity: bestOpp,
        important_action: important,
        upcoming_moment: upcoming,
        note,
        status: briefStatus,
        created_by: user?.id,
      }),
    onSuccess: (_row, briefStatus) => {
      toast.success(briefStatus === "published" ? "Weekly brief published" : "Weekly brief saved as draft");
      void qc.invalidateQueries({ queryKey: ["ci", "briefs", org.id] });
    },
    onError: (e: Error) => toast.error(ciFriendlyError(e)),
  });

  return (
    <div className="space-y-10">
      <form
        className="rounded-lg border border-border bg-background p-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          saveReport.mutate();
        }}
      >
        <h2 className="font-serif text-xl font-bold">Monthly communications summary</h2>
        <p className="text-sm text-muted-foreground">
          Review every section before publishing. Clients only see published reports.
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ci-report-month">Month</Label>
            <Input
              id="ci-report-month"
              type="number"
              min={1}
              max={12}
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ci-report-year">Year</Label>
            <Input
              id="ci-report-year"
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ci-report-status">Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as CiReportStatus)}>
              <SelectTrigger id="ci-report-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CI_REPORT_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {CI_REPORT_STATUS_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Field label="Executive summary" value={executive} onChange={setExecutive} />
        <Field label="What needed attention" value={attention} onChange={setAttention} />
        <Field label="Opportunities identified" value={opportunities} onChange={setOpportunities} />
        <Field label="Actions taken" value={actions} onChange={setActions} />
        <Field label="Communications health" value={health} onChange={setHealth} />
        <Field label="Outcomes" value={outcomes} onChange={setOutcomes} />
        <Field label="Priorities for next month" value={priorities} onChange={setPriorities} />
        <Field label="Strategic counsel" value={counsel} onChange={setCounsel} />
        <Button type="submit" disabled={saveReport.isPending}>
          {saveReport.isPending ? "Saving…" : "Save monthly report"}
        </Button>
      </form>

      <section className="space-y-2">
        <h3 className="font-serif text-lg font-bold">Saved monthly reports</h3>
        {reports.length ? (
          <ul className="space-y-2 text-sm">
            {reports.map((item) => (
              <li key={item.id}>
                {monthLabel(item.period_year, item.period_month)} — {CI_REPORT_STATUS_LABELS[item.status]}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No monthly reports yet.</p>
        )}
      </section>

      <form
        className="rounded-lg border border-border bg-background p-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          saveBrief.mutate("draft");
        }}
      >
        <h2 className="font-serif text-xl font-bold">Weekly communications brief</h2>
        <div className="space-y-2">
          <Label htmlFor="ci-brief-week">Week of</Label>
          <Input id="ci-brief-week" type="date" value={weekOf} onChange={(e) => setWeekOf(e.target.value)} />
        </div>
        <Field label="What needs attention" value={needs} onChange={setNeeds} />
        <Field label="Best opportunity" value={bestOpp} onChange={setBestOpp} />
        <Field label="Most important action" value={important} onChange={setImportant} />
        <Field label="Upcoming communications moment" value={upcoming} onChange={setUpcoming} />
        <Field label="Note from JahKnowsPR" value={note} onChange={setNote} />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="outline" disabled={saveBrief.isPending}>
            Save draft
          </Button>
          <Button type="button" disabled={saveBrief.isPending} onClick={() => saveBrief.mutate("published")}>
            Publish to portal
          </Button>
        </div>
      </form>

      <section className="space-y-2">
        <h3 className="font-serif text-lg font-bold">Weekly briefs</h3>
        {briefs.length ? (
          <ul className="space-y-2 text-sm">
            {briefs.map((item) => (
              <li key={item.id}>
                Week of {formatCiDate(item.week_of)} — {CI_BRIEF_STATUS_LABELS[item.status]}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No weekly briefs yet.</p>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export default CiOrganizationReportsTab;
