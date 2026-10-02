import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { AskCounselLink } from "../AskCounselLink";
import { ciApi } from "../api";
import { ciFriendlyError, copyCiText, counselDraftFromMessaging } from "../workspace";
import {
  CI_MESSAGING_ENTRY_TYPES,
  CI_MESSAGING_PORTAL_SECTION_LABELS,
} from "../types";

export function CiPortalMessagingPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const orgId = params.get("org") || undefined;

  const { data, isLoading, error } = useQuery({
    queryKey: ["ci", "portal", "messaging", user?.id, orgId],
    queryFn: () => ciApi.portal.loadMessaging(user!.id, orgId),
    enabled: Boolean(user?.id),
  });

  const copy = async (text: string) => {
    try {
      await copyCiText(text);
      toast.success("Copied — you can paste this as written");
    } catch {
      toast.error("Could not copy that text");
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading your approved messaging…</p>;
  }

  if (error || !data) {
    return (
      <p className="text-sm text-destructive">
        {ciFriendlyError(error) || "Unable to load this organization."}
      </p>
    );
  }

  const hasAny = data.entries.length > 0;

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
          {data.organization.name}
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold leading-tight">
          Language you can use with confidence.
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
          Use these words as written. If a situation is not covered here, ask JahKnowsPR before you improvise.
        </p>
        <AskCounselLink
          prefill={{ request_type: "messaging_question", subject: "Counsel on approved messaging" }}
          search={params.toString() ? `?${params.toString()}` : ""}
        >
          Ask JahKnowsPR about messaging
        </AskCounselLink>
      </header>

      {!hasAny ? (
        <p className="rounded-lg border border-dashed border-border bg-background/70 px-4 py-8 text-sm text-muted-foreground">
          No approved messaging has been added yet.
        </p>
      ) : (
        <div className="space-y-10">
          {CI_MESSAGING_ENTRY_TYPES.map((type) => {
            const group = data.entries.filter((entry) => entry.entry_type === type);
            if (!group.length) return null;
            return (
              <section key={type} className="space-y-3">
                <h2 className="font-serif text-xl font-bold">{CI_MESSAGING_PORTAL_SECTION_LABELS[type]}</h2>
                {group.map((entry) => (
                  <article key={entry.id} className="rounded-lg border border-border bg-background p-5">
                    <div className="flex items-start justify-between gap-3">
                      {entry.title ? (
                        <h3 className="font-serif text-lg font-bold">{entry.title}</h3>
                      ) : (
                        <span />
                      )}
                      <Button type="button" variant="outline" size="sm" onClick={() => void copy(entry.body)}>
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap">{entry.body}</p>
                    {entry.entry_type === "crisis_holding_statement" ? (
                      <div className="mt-4">
                        <AskCounselLink
                          prefill={counselDraftFromMessaging(entry)}
                          search={params.toString() ? `?${params.toString()}` : ""}
                        >
                          Ask JahKnowsPR
                        </AskCounselLink>
                      </div>
                    ) : null}
                  </article>
                ))}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CiPortalMessagingPage;
