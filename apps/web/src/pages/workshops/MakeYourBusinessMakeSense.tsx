import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CreditCard, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import {
  describeSquareClientMisconfiguration,
  getSquareClientIds,
  isSquareClientConfigured,
  loadSquarePaymentsSdk,
} from "@/lib/squarePaymentsSdk";
import {
  fetchPublicWorkshop,
  messageFromCheckoutError,
  WORKSHOP_PATH,
  WORKSHOP_SLUG,
  type PublicWorkshop,
} from "@/features/workshops/api";

const OUTCOMES = [
  "A clearer priority customer profile",
  "A stronger business introduction",
  "Three messages to use in their communications",
  "A seven-day communications action plan",
];

const AGENDA = [
  "How the two hours will run",
  "Name the priority customer",
  "Rewrite the business introduction so a stranger understands it",
  "Draft three messages you can use this week",
  "Build a seven-day communications plan",
  "Live message reviews for three volunteers",
];

function money(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function whenLabel(startsAt?: string | null, timezone?: string | null): string | null {
  if (!startsAt || !timezone) return null;
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date(startsAt));
  } catch {
    return null;
  }
}

export default function MakeYourBusinessMakeSensePage() {
  const navigate = useNavigate();
  const [event, setEvent] = useState<PublicWorkshop | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [misunderstanding, setMisunderstanding] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [paying, setPaying] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const cardRef = useRef<{ destroy(): Promise<void>; tokenize(): Promise<{ status: string; token?: string }> } | null>(null);
  const squareConfigured = isSquareClientConfigured();
  const { applicationId, locationId } = getSquareClientIds();

  useEffect(() => {
    document.title = "Make Your Business Make Sense | JahKnowsPR";
    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute(
      "content",
      "A two-hour live workshop for service business owners. Leave with a clearer customer, a stronger introduction, three messages, and a seven-day plan.",
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchPublicWorkshop()
      .then((data) => {
        if (!cancelled) setEvent(data);
      })
      .catch(() => {
        if (!cancelled) setEvent({ ok: false, code: "unavailable" });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const purchasable = Boolean(event?.purchasable && event.price_cents);
  const mountCard = useCallback(async () => {
    if (!window.Square) throw new Error("Square payment script did not load.");
    const payments = await window.Square.payments(applicationId, locationId);
    const card = await payments.card();
    await card.attach("#workshop-card");
    cardRef.current = card;
  }, [applicationId, locationId]);

  useEffect(() => {
    if (!purchasable || !squareConfigured) return;
    let cancelled = false;
    setSdkReady(false);
    (async () => {
      try {
        await loadSquarePaymentsSdk();
        if (cancelled) return;
        await mountCard();
        if (!cancelled) setSdkReady(true);
      } catch (error) {
        if (!cancelled) setSdkError(error instanceof Error ? error.message : "Could not load the card form.");
      }
    })();
    return () => {
      cancelled = true;
      cardRef.current?.destroy().catch(() => {});
      cardRef.current = null;
    };
  }, [mountCard, purchasable, squareConfigured]);

  const scheduled = whenLabel(event?.starts_at, event?.timezone);
  const duration = event?.duration_minutes === 120 ? "Two hours" : event?.duration_minutes ? `${event.duration_minutes} minutes` : "Two hours";
  const closedReason = !event?.configured
    ? "Paid registration opens after the date, time zone, cancellation terms, and Zoom access are set. No date is on sale yet."
    : !event.registration_open
      ? "Registration is closed."
      : event.seats_remaining === 0
        ? "No seats are open right now."
        : null;

  const pay = async () => {
    if (!purchasable || !event?.price_cents || !cardRef.current) return;
    if (!acceptedTerms) {
      toast.error("Acknowledge the cancellation terms to register.");
      return;
    }
    setPaying(true);
    try {
      const tokenized = await cardRef.current.tokenize();
      if (tokenized.status !== "OK" || !tokenized.token) {
        toast.error("Check the card details and try again.");
        return;
      }
      const storedToken = window.sessionStorage.getItem("workshop-hold-token") || undefined;
      const { data, error } = await supabase.functions.invoke("workshop-checkout", {
        body: {
          slug: WORKSHOP_SLUG,
          sourceId: tokenized.token,
          fullName,
          email,
          businessName,
          businessType,
          misunderstanding,
          marketingConsent,
          cancellationAcknowledged: true,
          confirmationToken: storedToken,
          applicationId,
        },
      });
      if (error) {
        toast.error(await messageFromCheckoutError(error));
        return;
      }
      const result = data as { confirmationToken?: string; status?: string };
      if (!result.confirmationToken) {
        toast.error("Payment could not be confirmed.");
        return;
      }
      window.sessionStorage.setItem("workshop-hold-token", result.confirmationToken);
      navigate(`${WORKSHOP_PATH}/confirmation?token=${encodeURIComponent(result.confirmationToken)}`);
    } catch (error) {
      toast.error(await messageFromCheckoutError(error));
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="bg-background text-foreground">
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">JahKnowsPR workshop</p>
          <h1 className="mt-4 font-serif text-4xl font-bold tracking-tight sm:text-5xl">Make Your Business Make Sense.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-primary-foreground/85">
            A live, interactive workshop for service business owners. In two hours you will name the customer you are actually for, say what the business is in plain language, and leave with messages you can use.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button variant="outline" className="min-h-12 border-2 border-gold bg-transparent text-primary-foreground hover:bg-gold/15 hover:text-primary-foreground" asChild>
              <a href="#register">{purchasable && event?.price_cents ? `Register · ${money(event.price_cents)}` : "Registration"}</a>
            </Button>
            <p className="text-sm text-primary-foreground/70">Live on Zoom. No recording or replay.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-3xl gap-10 px-4 py-14 sm:px-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          {[
            ["Date and time", scheduled || "Not scheduled yet"],
            ["Duration", duration],
            ["Price", event?.configured && event.price_cents ? money(event.price_cents) : "Not on sale"],
            ["Format", event?.format_label || "Live, interactive workshop on Zoom"],
            ["Who it's for", event?.audience_label || "Service business owners"],
            ["Host", event?.host_name || "JahKnowsPR"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border bg-card p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
              <dd className="mt-1 font-medium">{value}</dd>
            </div>
          ))}
        </dl>

        <div>
          <h2 className="font-serif text-3xl font-bold text-primary">What you leave with</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-base leading-relaxed">
            {OUTCOMES.map((item) => <li key={item}>{item}</li>)}
          </ol>
        </div>

        <div>
          <h2 className="font-serif text-3xl font-bold text-primary">Agenda</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 leading-relaxed">
            {AGENDA.map((item) => <li key={item}>{item}</li>)}
          </ol>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Three volunteers will be invited to have a message reviewed live. Volunteering is optional.
          </p>
        </div>

        <div>
          <h2 className="font-serif text-3xl font-bold text-primary">Questions</h2>
          <Accordion type="single" collapsible className="mt-2">
            <AccordionItem value="zoom">
              <AccordionTrigger>How do I get the Zoom link?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                After payment is confirmed, the Zoom link is sent only in your confirmation email. It is not posted on this page. Forwarding that email shares the link, so treat it as private.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="prepare">
              <AccordionTrigger>How should I prepare?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {event?.preparation_notes || "Plan to stay for the full two hours, bring a notebook, and be ready to write about your customer, your introduction, and your messages."}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="cancel">
              <AccordionTrigger>What is the cancellation policy?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {event?.cancellation_terms || "Cancellation terms will be published before registration opens. Paid registration stays closed until those terms are set."}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="recording">
              <AccordionTrigger>Will there be a recording?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                No. This workshop is live. Registration does not include a recording or replay.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      <section id="register" className="border-t border-border bg-cream/40">
        <div className="mx-auto max-w-xl px-4 py-14 sm:px-6">
          <h2 className="font-serif text-3xl font-bold text-primary">Register</h2>
          {loading ? <p className="mt-4 text-sm text-muted-foreground">Loading registration…</p> : null}
          {!loading && closedReason ? (
            <p className="mt-4 rounded-lg border border-border bg-background p-4 text-sm leading-relaxed">{closedReason}</p>
          ) : null}
          {purchasable && event?.price_cents ? (
            <form
              className="mt-6 space-y-4"
              onSubmit={(formEvent) => {
                formEvent.preventDefault();
                void pay();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="workshop-name">Full name</Label>
                <Input id="workshop-name" value={fullName} onChange={(input) => setFullName(input.target.value)} required autoComplete="name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workshop-email">Email</Label>
                <Input id="workshop-email" type="email" value={email} onChange={(input) => setEmail(input.target.value)} required autoComplete="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workshop-business">Business name</Label>
                <Input id="workshop-business" value={businessName} onChange={(input) => setBusinessName(input.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workshop-type">Business type</Label>
                <Input id="workshop-type" value={businessType} onChange={(input) => setBusinessType(input.target.value)} placeholder="Consulting, salon, clinic, agency" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workshop-misunderstanding">What do people misunderstand about your business?</Label>
                <Textarea id="workshop-misunderstanding" value={misunderstanding} onChange={(input) => setMisunderstanding(input.target.value)} required minLength={2} maxLength={1000} />
              </div>
              <label className="flex items-start gap-3 text-sm leading-relaxed">
                <Checkbox checked={acceptedTerms} onCheckedChange={(checked) => setAcceptedTerms(checked === true)} className="mt-1" />
                <span>I understand the cancellation terms{event.cancellation_terms ? `: ${event.cancellation_terms}` : "."}</span>
              </label>
              <label className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
                <Checkbox checked={marketingConsent} onCheckedChange={(checked) => setMarketingConsent(checked === true)} className="mt-1" />
                <span>Send me occasional notes from JahKnowsPR. This is optional and is not required to attend.</span>
              </label>
              {squareConfigured ? (
                <div className="space-y-3 rounded-lg border border-border bg-background p-4">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Lock className="h-3.5 w-3.5" />
                    Card
                  </div>
                  <div id="workshop-card" className="min-h-[140px]" />
                  {sdkError ? <p className="text-sm text-destructive">{sdkError}</p> : null}
                  <Button type="submit" variant="hero" className="min-h-12 w-full" disabled={!sdkReady || paying || !acceptedTerms}>
                    {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                    Pay {money(event.price_cents)} and register
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">Square processes the payment. A seat is confirmed only after the payment succeeds.</p>
                </div>
              ) : (
                <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
                  {describeSquareClientMisconfiguration() || "Card payment is not configured yet."}
                </p>
              )}
            </form>
          ) : null}
          <p className="mt-6 text-sm text-muted-foreground">
            <Link to="/contact" className="underline underline-offset-2">Contact JahKnowsPR</Link> if you need help with a payment you already made.
          </p>
        </div>
      </section>
    </div>
  );
}
