import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ciApi } from "./api";
import { ciFriendlyError } from "./workspace";
import { CI_USEFUL_LABELS, CI_USEFUL_RATINGS, type CiRecommendationFeedback, type CiUsefulRating } from "./types";

export function UsefulFeedback({
  organizationId,
  relatedType,
  relatedId,
}: {
  organizationId: string;
  relatedType: CiRecommendationFeedback["related_type"];
  relatedId?: string | null;
}) {
  const { user } = useAuth();
  const [useful, setUseful] = useState<CiUsefulRating | null>(null);
  const [why, setWhy] = useState("");
  const [sent, setSent] = useState(false);

  const submit = useMutation({
    mutationFn: async (rating: CiUsefulRating) => {
      if (!user?.id) throw new Error("Please sign in again.");
      await ciApi.feedback.submitRecommendation({
        organization_id: organizationId,
        related_type: relatedType,
        related_id: relatedId,
        useful: rating,
        why,
        created_by: user.id,
      });
    },
    onSuccess: () => {
      setSent(true);
      toast.success("Thank you. That helps us brief you better.");
    },
    onError: (e: Error) => toast.error(ciFriendlyError(e)),
  });

  if (sent) {
    return <p className="text-xs text-muted-foreground">Thank you for the note.</p>;
  }

  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs font-medium">Was this recommendation useful?</p>
      <div className="flex flex-wrap gap-2">
        {CI_USEFUL_RATINGS.map((rating) => (
          <Button
            key={rating}
            type="button"
            size="sm"
            variant={useful === rating ? "default" : "outline"}
            disabled={submit.isPending}
            onClick={() => {
              setUseful(rating);
              if (rating === "yes") submit.mutate(rating);
            }}
          >
            {CI_USEFUL_LABELS[rating]}
          </Button>
        ))}
      </div>
      {useful && useful !== "yes" ? (
        <div className="space-y-2">
          <label className="sr-only" htmlFor={`ci-why-${relatedId || relatedType}`}>
            Tell us why
          </label>
          <Textarea
            id={`ci-why-${relatedId || relatedType}`}
            rows={2}
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            placeholder="Optional: tell us why"
          />
          <Button type="button" size="sm" disabled={submit.isPending} onClick={() => submit.mutate(useful)}>
            {submit.isPending ? "Sending…" : "Send"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
