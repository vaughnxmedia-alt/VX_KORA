import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
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
import { ciFriendlyError } from "../workspace";
import { CI_USEFUL_LABELS, CI_USEFUL_RATINGS, type CiUsefulRating } from "../types";

export function CiPortalFeedbackPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const orgId = params.get("org") || undefined;
  const [mostUseful, setMostUseful] = useState("");
  const [confusing, setConfusing] = useState("");
  const [wish, setWish] = useState("");
  const [helped, setHelped] = useState<CiUsefulRating | "">("");
  const [sent, setSent] = useState(false);

  const { data } = useQuery({
    queryKey: ["ci", "portal", "dashboard", user?.id, orgId],
    queryFn: () => ciApi.portal.loadDashboard(user!.id, orgId),
    enabled: Boolean(user?.id),
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user?.id || !data?.organization.id) throw new Error("Please sign in again.");
      await ciApi.feedback.submitPilot({
        organization_id: data.organization.id,
        most_useful: mostUseful,
        confusing,
        wish,
        helped_decision: helped || null,
        created_by: user.id,
      });
    },
    onSuccess: () => {
      setSent(true);
      toast.success("Thank you. JahKnowsPR will read this.");
    },
    onError: (e: Error) => toast.error(ciFriendlyError(e)),
  });

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
          {data?.organization.name || "Your organization"}
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold leading-tight">
          A few questions about the pilot
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
          Short answers only. This helps JahKnowsPR learn whether Communications Intelligence is useful.
        </p>
      </header>

      {sent ? (
        <p className="rounded-lg border border-border bg-background p-5 text-sm">
          Thank you. Your note is with JahKnowsPR.
        </p>
      ) : (
        <form
          className="rounded-lg border border-border bg-background p-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate();
          }}
        >
          <Field
            id="ci-fb-useful"
            label="What has been most useful?"
            value={mostUseful}
            onChange={setMostUseful}
          />
          <Field
            id="ci-fb-confusing"
            label="What has been confusing or unnecessary?"
            value={confusing}
            onChange={setConfusing}
          />
          <Field
            id="ci-fb-wish"
            label="What do you wish the platform did?"
            value={wish}
            onChange={setWish}
          />
          <div className="space-y-2">
            <Label htmlFor="ci-fb-helped">
              Has Communications Intelligence helped you make a communications decision?
            </Label>
            <Select value={helped} onValueChange={(value) => setHelped(value as CiUsefulRating)}>
              <SelectTrigger id="ci-fb-helped">
                <SelectValue placeholder="Choose one" />
              </SelectTrigger>
              <SelectContent>
                {CI_USEFUL_RATINGS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {CI_USEFUL_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={submit.isPending || !data?.organization.id}>
            {submit.isPending ? "Sending…" : "Send feedback"}
          </Button>
        </form>
      )}
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export default CiPortalFeedbackPage;
