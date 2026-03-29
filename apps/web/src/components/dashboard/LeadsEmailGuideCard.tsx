import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Mail, Send, UserCircle } from "lucide-react";
import {
  GUEST_EMAIL_INCLUDES,
  OPS_EMAIL_INCLUDES,
  STRATEGY_SESSION_EMAIL_DEFAULTS,
  STRATEGY_SESSION_EMAIL_FLOW,
} from "@/features/leads/strategySessionEmailPlaybook";

export function LeadsEmailGuideCard() {
  const from = `${STRATEGY_SESSION_EMAIL_DEFAULTS.fromDisplayName} <${STRATEGY_SESSION_EMAIL_DEFAULTS.fromEmail}>`;

  return (
    <Card className="border-primary/20 bg-muted/30">
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-primary/10 p-2">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-lg">Leads first — then confirmation emails</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              Strategy Session bookings start on the public flow. This board is where you confirm the time and
              trigger the emails your leads receive. Below: who they come from, what they look like, and who else
              gets copied.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
          {STRATEGY_SESSION_EMAIL_FLOW.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-card p-3 text-sm">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Send className="h-4 w-4 text-primary" />
              From (Resend)
            </div>
            <p className="mt-2 font-mono text-xs break-all">{from}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Override <code className="rounded bg-muted px-1">from</code> with Edge secret{" "}
              <code className="rounded bg-muted px-1">STRATEGY_SESSION_FROM_EMAIL</code> if needed.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-sm">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <UserCircle className="h-4 w-4 text-primary" />
              Internal copy
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Ops / team inbox (default):
            </p>
            <p className="mt-1 font-mono text-xs break-all">{STRATEGY_SESSION_EMAIL_DEFAULTS.opsEmail}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Override with <code className="rounded bg-muted px-1">STRATEGY_SESSION_OPS_EMAIL</code>.
            </p>
          </div>
        </div>

        <Accordion type="single" collapsible className="w-full border rounded-md px-3">
          <AccordionItem value="guest">
            <AccordionTrigger className="text-sm font-medium">
              Guest email — {STRATEGY_SESSION_EMAIL_DEFAULTS.guestSubject}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2 pb-3">
              <p>{STRATEGY_SESSION_EMAIL_DEFAULTS.guestFormat}</p>
              <ul className="list-disc list-inside space-y-1">
                {GUEST_EMAIL_INCLUDES.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="ops">
            <AccordionTrigger className="text-sm font-medium">
              Team email — {STRATEGY_SESSION_EMAIL_DEFAULTS.opsSubjectPrefix}
              {"{business}"}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2 pb-3">
              <p>{STRATEGY_SESSION_EMAIL_DEFAULTS.opsFormat}</p>
              <ul className="list-disc list-inside space-y-1">
                {OPS_EMAIL_INCLUDES.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <p className="text-xs text-muted-foreground">
          HTML bodies are built in{" "}
          <code className="rounded bg-muted px-1">supabase/functions/_shared/strategy-session-confirmation-email.ts</code>{" "}
          and{" "}
          <code className="rounded bg-muted px-1">strategy-session-internal-notification-email.ts</code> — edit there
          to change wording; redeploy <code className="rounded bg-muted px-1">strategy-session-admin-confirm</code>.
        </p>
      </CardContent>
    </Card>
  );
}
