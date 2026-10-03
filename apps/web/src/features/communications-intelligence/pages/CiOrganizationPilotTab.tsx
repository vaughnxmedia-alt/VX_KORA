import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { ciFriendlyError, formatCiDateTime, toDateInputValue } from "../workspace";
import {
  CI_PILOT_STATUS_LABELS,
  CI_PILOT_STATUSES,
  type CiPilotStatus,
  type CiPilotWriteInput,
} from "../types";
import type { CiWorkspaceContext } from "../workspace";

export function CiOrganizationPilotTab() {
  const { org } = useOutletContext<CiWorkspaceContext>();
  const qc = useQueryClient();
  const { data: enrollment } = useQuery({
    queryKey: ["ci", "pilot", org.id],
    queryFn: () => ciApi.pilots.getForOrganization(org.id),
  });
  const { data: activity } = useQuery({
    queryKey: ["ci", "activity", org.id],
    queryFn: () => ciApi.activity.summary(org.id),
  });
  const { data: recFeedback = [] } = useQuery({
    queryKey: ["ci", "feedback", "rec", org.id],
    queryFn: () => ciApi.feedback.listRecommendations(org.id),
  });
  const { data: pilotFeedback = [] } = useQuery({
    queryKey: ["ci", "feedback", "pilot", org.id],
    queryFn: () => ciApi.feedback.listPilot(org.id),
  });

  const [status, setStatus] = useState<CiPilotStatus>(enrollment?.status ?? "invited");
  const [startDate, setStartDate] = useState(toDateInputValue(enrollment?.start_date));
  const [endDate, setEndDate] = useState(toDateInputValue(enrollment?.end_date));
  const [cohort, setCohort] = useState(enrollment?.cohort ?? "");
  const [notes, setNotes] = useState(enrollment?.internal_notes ?? "");
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (!enrollment || hydrated) return;
    setStatus(enrollment.status);
    setStartDate(toDateInputValue(enrollment.start_date));
    setEndDate(toDateInputValue(enrollment.end_date));
    setCohort(enrollment.cohort ?? "");
    setNotes(enrollment.internal_notes ?? "");
    setHydrated(true);
  }, [enrollment, hydrated]);

  const save = useMutation({
    mutationFn: async (input: CiPilotWriteInput) => ciApi.pilots.upsert(input),
    onSuccess: () => {
      toast.success("Pilot record saved");
      void qc.invalidateQueries({ queryKey: ["ci", "pilot"] });
    },
    onError: (e: Error) => toast.error(ciFriendlyError(e)),
  });

  const mark = (field: keyof CiPilotWriteInput) => {
    save.mutate({
      organization_id: org.id,
      status,
      start_date: startDate || null,
      end_date: endDate || null,
      cohort,
      internal_notes: notes,
      onboarding_complete_at: enrollment?.onboarding_complete_at,
      initial_health_complete_at: enrollment?.initial_health_complete_at,
      first_intelligence_at: enrollment?.first_intelligence_at,
      first_client_login_at: enrollment?.first_client_login_at,
      first_action_completed_at: enrollment?.first_action_completed_at,
      first_counsel_request_at: enrollment?.first_counsel_request_at,
      final_review_at: enrollment?.final_review_at,
      [field]: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-border bg-background p-5 space-y-4">
        <h2 className="font-serif text-xl font-bold">Pilot enrollment</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ci-pilot-status">Pilot status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as CiPilotStatus)}>
              <SelectTrigger id="ci-pilot-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CI_PILOT_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {CI_PILOT_STATUS_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ci-pilot-cohort">Cohort</Label>
            <Input id="ci-pilot-cohort" value={cohort} onChange={(e) => setCohort(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ci-pilot-start">Start date</Label>
            <Input id="ci-pilot-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ci-pilot-end">End date</Label>
            <Input id="ci-pilot-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ci-pilot-notes">Internal notes</Label>
          <Textarea id="ci-pilot-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <p className="text-xs text-muted-foreground">Clients never see these notes.</p>
        </div>
        <Button
          type="button"
          disabled={save.isPending}
          onClick={() =>
            save.mutate({
              organization_id: org.id,
              status,
              start_date: startDate || null,
              end_date: endDate || null,
              cohort,
              internal_notes: notes,
              onboarding_complete_at: enrollment?.onboarding_complete_at,
              initial_health_complete_at: enrollment?.initial_health_complete_at,
              first_intelligence_at: enrollment?.first_intelligence_at,
              first_client_login_at: enrollment?.first_client_login_at,
              first_action_completed_at: enrollment?.first_action_completed_at,
              first_counsel_request_at: enrollment?.first_counsel_request_at,
              final_review_at: enrollment?.final_review_at,
            })
          }
        >
          {save.isPending ? "Saving…" : enrollment ? "Save pilot record" : "Enroll in pilot"}
        </Button>
      </section>

      <section className="rounded-lg border border-border bg-background p-5 space-y-3">
        <h2 className="font-serif text-xl font-bold">Milestones</h2>
        <Milestone
          label="Onboarding complete"
          value={enrollment?.onboarding_complete_at}
          onMark={() => mark("onboarding_complete_at")}
        />
        <Milestone
          label="Initial health check complete"
          value={enrollment?.initial_health_complete_at}
          onMark={() => mark("initial_health_complete_at")}
        />
        <Milestone
          label="First intelligence delivered"
          value={enrollment?.first_intelligence_at}
          onMark={() => mark("first_intelligence_at")}
        />
        <Milestone label="First client login" value={enrollment?.first_client_login_at} />
        <Milestone label="First action completed" value={enrollment?.first_action_completed_at} />
        <Milestone label="First counsel request" value={enrollment?.first_counsel_request_at} />
        <Milestone
          label="Final pilot review complete"
          value={enrollment?.final_review_at}
          onMark={() => mark("final_review_at")}
        />
      </section>

      <section className="rounded-lg border border-border bg-background p-5 space-y-2">
        <h2 className="font-serif text-xl font-bold">Activity summary</h2>
        <p className="text-sm">Last client activity: {formatCiDateTime(activity?.last_client_activity)}</p>
        <p className="text-sm">Last portal login: {formatCiDateTime(activity?.last_portal_login)}</p>
        <p className="text-sm">Actions completed this month: {activity?.actions_completed_this_month ?? 0}</p>
        <p className="text-sm">Opportunities reviewed: {activity?.opportunities_reviewed ?? 0}</p>
        <p className="text-sm">Counsel requests submitted: {activity?.counsel_requests_submitted ?? 0}</p>
      </section>

      <section className="rounded-lg border border-border bg-background p-5 space-y-3">
        <h2 className="font-serif text-xl font-bold">Client feedback</h2>
        {recFeedback.length ? (
          <ul className="space-y-2 text-sm">
            {recFeedback.slice(0, 8).map((item) => (
              <li key={item.id}>
                {item.related_type}: {item.useful}
                {item.why ? ` — ${item.why}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No recommendation feedback yet.</p>
        )}
        {pilotFeedback.length ? (
          <ul className="space-y-3 text-sm">
            {pilotFeedback.map((item) => (
              <li key={item.id} className="rounded-md border border-border p-3">
                {item.most_useful ? <p>Most useful: {item.most_useful}</p> : null}
                {item.confusing ? <p>Confusing: {item.confusing}</p> : null}
                {item.wish ? <p>Wish: {item.wish}</p> : null}
                {item.helped_decision ? <p>Helped a decision: {item.helped_decision}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No pilot form responses yet.</p>
        )}
      </section>
    </div>
  );
}

function Milestone({
  label,
  value,
  onMark,
}: {
  label: string;
  value?: string | null;
  onMark?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <p>
        {label}: <span className="text-muted-foreground">{value ? formatCiDateTime(value) : "Not yet"}</span>
      </p>
      {onMark && !value ? (
        <Button type="button" size="sm" variant="outline" onClick={onMark}>
          Mark complete
        </Button>
      ) : null}
    </div>
  );
}

export default CiOrganizationPilotTab;
