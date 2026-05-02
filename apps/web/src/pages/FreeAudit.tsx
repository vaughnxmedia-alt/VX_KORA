import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { collectFreeAuditAttribution, type FreeAuditAttribution } from "@/lib/freeAuditAttribution";
import { trackAuditPageView, trackAuditRequestSubmit, trackFormStart } from "@/lib/kora-analytics";
import { StructuredData } from "@/components/StructuredData";
import { breadcrumbListSchema, serviceSchema } from "@/lib/structured-data";

type Intent = "ready_now" | "open_if_it_makes_sense" | "just_looking";
type Readiness = "HOT" | "WARM" | "COLD";

type FormState = {
  email: string;
  phone: string;
  name: string;
  businessName: string;
  websiteLink: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  otherSocials: string;
  growthGoal: string;
  currentBlocker: string;
  targetAudienceBelief: string;
  intent: Intent;
};

const INITIAL_FORM: FormState = {
  email: "",
  phone: "",
  name: "",
  businessName: "",
  websiteLink: "",
  instagram: "",
  facebook: "",
  tiktok: "",
  otherSocials: "",
  growthGoal: "",
  currentBlocker: "",
  targetAudienceBelief: "",
  intent: "open_if_it_makes_sense",
};

type Question = {
  key: keyof FormState;
  eyebrow: string;
  title: string;
  description?: string;
  required?: boolean;
  input: "text" | "email" | "tel" | "url" | "textarea" | "intent";
  placeholder?: string;
};

const QUESTIONS: Question[] = [
  {
    key: "email",
    eyebrow: "Contact",
    title: "Where should we send your audit notes?",
    required: true,
    input: "email",
    placeholder: "you@example.com",
  },
  {
    key: "name",
    eyebrow: "Contact",
    title: "What is your name?",
    input: "text",
    placeholder: "Your name",
  },
  {
    key: "phone",
    eyebrow: "Contact",
    title: "What phone number should we use if follow-up is needed?",
    input: "tel",
    placeholder: "(555) 555-5555",
  },
  {
    key: "businessName",
    eyebrow: "Brand",
    title: "What is your business or brand name?",
    input: "text",
    placeholder: "Business name",
  },
  {
    key: "websiteLink",
    eyebrow: "Presence",
    title: "Do you have a website?",
    input: "url",
    placeholder: "https://...",
  },
  {
    key: "instagram",
    eyebrow: "Presence",
    title: "What is your Instagram?",
    input: "text",
    placeholder: "@yourbrand",
  },
  {
    key: "facebook",
    eyebrow: "Presence",
    title: "What is your Facebook?",
    input: "text",
    placeholder: "Facebook page or profile link",
  },
  {
    key: "tiktok",
    eyebrow: "Presence",
    title: "What is your TikTok?",
    input: "text",
    placeholder: "@yourbrand",
  },
  {
    key: "otherSocials",
    eyebrow: "Presence",
    title: "Any other socials we should review?",
    input: "textarea",
    placeholder: "LinkedIn, YouTube, podcast, newsletter, etc.",
  },
  {
    key: "growthGoal",
    eyebrow: "Diagnosis",
    title: "What are you currently trying to grow?",
    required: true,
    input: "textarea",
    placeholder: "Audience, sales, bookings, credibility, visibility...",
  },
  {
    key: "currentBlocker",
    eyebrow: "Diagnosis",
    title: "What's NOT working right now?",
    required: true,
    input: "textarea",
    placeholder: "Tell us where the brand feels stuck.",
  },
  {
    key: "targetAudienceBelief",
    eyebrow: "Diagnosis",
    title: "Who do you believe your target audience is?",
    required: true,
    input: "textarea",
    placeholder: "Describe who you think you are trying to reach.",
  },
  {
    key: "intent",
    eyebrow: "Intent",
    title: "How ready are you to fix the positioning gap?",
    required: true,
    input: "intent",
  },
];

function setMeta(selector: string, attr: "content" | "href", value: string) {
  const node = document.querySelector(selector);
  if (node) node.setAttribute(attr, value);
}

function readinessFromIntent(intent: Intent): Readiness {
  if (intent === "ready_now") return "HOT";
  if (intent === "open_if_it_makes_sense") return "WARM";
  return "COLD";
}

export default function FreeAudit() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [attribution, setAttribution] = useState<FreeAuditAttribution | null>(null);
  const [started, setStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const readiness = useMemo(() => readinessFromIntent(form.intent), [form.intent]);
  const currentQuestion = QUESTIONS[currentStep];
  const progress = Math.round(((currentStep + 1) / QUESTIONS.length) * 100);
  const currentValue = currentQuestion ? form[currentQuestion.key] : "";
  const currentRequiredMissing = Boolean(
    currentQuestion?.required && typeof currentValue === "string" && currentValue.trim().length === 0,
  );

  useEffect(() => {
    document.title = "Free Brand Audit | JahKnowsPR";
    setMeta('meta[name="description"]', "content", "Start a free JahKnowsPR brand audit to identify what is blocking your brand from converting.");
    setMeta('link[rel="canonical"]', "href", "https://www.jahknowspr.com/free-audit");
    setMeta('meta[property="og:title"]', "content", "Free Brand Audit | JahKnowsPR");
    setMeta('meta[property="og:description"]', "content", "Identify what is blocking your brand from converting and move into a Strategy Session when ready.");
    setMeta('meta[property="og:url"]', "content", "https://www.jahknowspr.com/free-audit");
    setAttribution(collectFreeAuditAttribution());
    trackAuditPageView({
      page_path: "/free-audit",
      funnel_id: "free_audit",
      funnel_step: "landing",
      offer_id: "free_audit",
    });
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function goNext() {
    if (currentRequiredMissing) return;
    trackFormStart({
      page_path: "/free-audit",
      form_id: "free-audit-form",
      form_name: "Free Audit Diagnosis",
      funnel_id: "free_audit",
      funnel_step: `question_${currentStep + 1}`,
    });
    setCurrentStep((step) => Math.min(QUESTIONS.length - 1, step + 1));
  }

  function goBack() {
    setCurrentStep((step) => Math.max(0, step - 1));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (currentRequiredMissing) return;
    setSubmitting(true);
    const nextAttribution = collectFreeAuditAttribution({
      messaging_angle: attribution?.messaging_angle ?? "positioning_gap",
      hook: attribution?.hook ?? "free_brand_audit",
    });
    try {
      const submit = await supabase.functions.invoke("free-audit-submit", {
        body: {
          ...form,
          readinessLevel: readiness,
          auditAngle: nextAttribution.messaging_angle,
          intendedCta: "book_strategy_session",
          predictedConversionProbability: readiness === "HOT" ? 0.42 : readiness === "WARM" ? 0.22 : 0.08,
          expectedBaseline: 0.12,
          attribution: nextAttribution,
          leadSource: nextAttribution,
          metadata: {
            readiness_level: readiness,
            source_page: "free_audit",
          },
        },
      });
      if (submit.error || !submit.data?.auditId) {
        throw new Error(submit.error?.message ?? "Could not submit audit.");
      }

      await supabase.functions.invoke("free-audit-complete", {
        body: {
          auditId: submit.data.auditId,
          completionStatus: "completed",
          scoreSummary: {
            readiness_level: readiness,
            intent: form.intent,
          },
          actualOutcome: {
            lead_segmented: true,
            readiness_level: readiness,
          },
          ctaClicked: false,
          metadata: {
            attribution: nextAttribution,
            readiness_level: readiness,
          },
        },
      });

      trackAuditRequestSubmit({
        page_path: "/free-audit",
        form_id: "free-audit-form",
        form_name: "Free Audit Diagnosis",
        funnel_id: "free_audit",
        funnel_step: "submit",
        offer_id: "free_audit",
        metadata: { readiness_level: readiness },
      });

      navigate("/free-audit/thank-you", {
        replace: true,
        state: { readiness },
      });
    } catch (error) {
      console.error("free audit submit failed", error);
      alert(error instanceof Error ? error.message : "Could not submit audit.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <StructuredData
        id="free-brand-diagnosis"
        data={[
          serviceSchema({
            name: "Free Brand Diagnosis",
            description:
              "A free diagnostic review that helps entrepreneurs and businesses identify positioning, presence, audience clarity, and conversion blockers.",
            url: "/free-audit",
            serviceType: "Brand diagnosis",
            areaServed: "Texas",
          }),
          breadcrumbListSchema([
            { name: "Home", url: "/" },
            { name: "Free Brand Diagnosis", url: "/free-audit" },
          ]),
        ]}
      />
      {!started ? (
        <section className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 sm:px-6 md:py-16">
          <div className="space-y-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gold">Free Brand Audit</p>
            <h1 className="text-4xl font-bold leading-tight md:text-6xl">
              You&rsquo;re Not Struggling to Post. You&rsquo;re Struggling to Position.
            </h1>
          </div>

          <div className="aspect-video bg-gradient-to-br from-gold/20 via-gold/10 to-gold/5 rounded-2xl border border-gold/40 shadow-lg overflow-hidden flex items-center justify-center">
            <div className="text-center px-6">
              <p className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-gold via-gold-dark to-gold bg-clip-text text-transparent">
                Audit Diagnosis Video
              </p>
              <p className="text-sm md:text-base mt-3 text-gold-dark/70">
                Video placement coming soon
              </p>
            </div>
          </div>

          <div className="mx-auto max-w-3xl space-y-5 text-center">
            <p className="text-lg text-muted-foreground md:text-xl">
              The Audit Diagnosis reviews your presence, positioning, audience clarity, and conversion gaps so
              JahKnowsPR can identify what is blocking the brand from turning attention into booked action.
            </p>
            <Button
              size="lg"
              className="h-16 rounded-full px-12 text-lg font-bold shadow-xl shadow-primary/20"
              onClick={() => setStarted(true)}
            >
              Begin
            </Button>
          </div>
        </section>
      ) : (
        <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-4xl flex-col px-4 py-8 sm:px-6">
          <div className="sticky top-0 z-20 -mx-4 mb-8 bg-background/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <span>Audit Diagnosis</span>
              <span>{progress}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold via-primary to-gold transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <form id="free-audit-form" onSubmit={handleSubmit} className="flex flex-1 flex-col justify-center">
            <div className="rounded-3xl border border-gold/20 bg-card p-6 shadow-xl shadow-primary/5 md:p-10">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-gold">
                {currentQuestion.eyebrow}
              </p>
              <h2 className="text-3xl font-serif font-bold leading-tight md:text-5xl">{currentQuestion.title}</h2>
              {currentQuestion.description ? (
                <p className="mt-3 text-muted-foreground">{currentQuestion.description}</p>
              ) : null}

              <div className="mt-8">
                {currentQuestion.input === "textarea" ? (
                  <Textarea
                    autoFocus
                    className="min-h-40 text-lg"
                    required={currentQuestion.required}
                    placeholder={currentQuestion.placeholder}
                    value={String(form[currentQuestion.key])}
                    onChange={(event) => update(currentQuestion.key, event.target.value as never)}
                  />
                ) : currentQuestion.input === "intent" ? (
                  <div className="grid gap-3">
                    {[
                      ["ready_now", "Yes, I'm ready now", "I know this needs to be fixed and I want the next step."],
                      ["open_if_it_makes_sense", "I'm open if it makes sense", "I need the diagnosis to show me where the gap is."],
                      ["just_looking", "Just looking for feedback", "I want clarity first, then I may follow up later."],
                    ].map(([value, label, description]) => (
                      <button
                        key={value}
                        type="button"
                        className={`rounded-2xl border p-4 text-left transition ${
                          form.intent === value
                            ? "border-gold bg-gold/10 shadow-lg shadow-gold/10"
                            : "border-border bg-background hover:border-gold/50"
                        }`}
                        onClick={() => update("intent", value as Intent)}
                      >
                        <span className="block font-semibold">{label}</span>
                        <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <Input
                    autoFocus
                    className="h-14 text-lg"
                    required={currentQuestion.required}
                    type={currentQuestion.input}
                    placeholder={currentQuestion.placeholder}
                    value={String(form[currentQuestion.key])}
                    onChange={(event) => update(currentQuestion.key, event.target.value as never)}
                  />
                )}
              </div>

              <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button type="button" variant="outline" className="rounded-full" onClick={goBack} disabled={currentStep === 0}>
                  Back
                </Button>
                {currentStep === QUESTIONS.length - 1 ? (
                  <Button type="submit" size="lg" className="rounded-full px-10" disabled={submitting || currentRequiredMissing}>
                    {submitting ? "Submitting..." : "Submit Audit"}
                  </Button>
                ) : (
                  <Button type="button" size="lg" className="rounded-full px-10" onClick={goNext} disabled={currentRequiredMissing}>
                    Continue
                  </Button>
                )}
              </div>
            </div>
          </form>
        </section>
      )}
    </main>
  );
}
