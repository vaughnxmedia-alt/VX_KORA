import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight, BookOpen, CheckCircle2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StructuredData } from "@/components/StructuredData";
import {
  COMMON_STARTUP_MISTAKES,
  PERFECT_STARTUP_CATEGORY,
  optionalTerritoryGuides,
  perfectStartupStateMap,
  perfectStartupStates,
  type PerfectStartupStateGuide,
} from "@/data/perfectStartupStates";
import { articleSchema, breadcrumbListSchema, faqPageSchema, serviceSchema } from "@/lib/structured-data";

const SITE_ORIGIN = "https://www.jahknowspr.com";

const LANDING_FAQS = [
  {
    question: "What is The Perfect Startup series?",
    answer:
      "The Perfect Startup is JahKnowsPR's plain-language education series for new founders who want to understand business setup basics and brand strategy before launching publicly.",
  },
  {
    question: "Is this legal or tax advice?",
    answer:
      "No. The guides are for general education only. Always verify current requirements with official state, tax, city/county, and licensed professional sources.",
  },
  {
    question: "Why does JahKnowsPR include brand strategy in startup guides?",
    answer:
      "Starting the entity is only one part. Founders also need a clear audience, offer, message, proof, and next step so the business is easier to trust and buy from.",
  },
  {
    question: "Can JahKnowsPR help after I register my business?",
    answer:
      "Yes. JahKnowsPR helps founders turn a business idea into clear strategy, messaging, visibility, and a practical launch direction.",
  },
];

function setMeta(selector: string, attr: "content" | "href", value: string) {
  let element = document.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
  if (!element) {
    if (selector.startsWith("meta[")) {
      element = document.createElement("meta");
      const property = selector.match(/property="([^"]+)"/)?.[1];
      const name = selector.match(/name="([^"]+)"/)?.[1];
      if (property) element.setAttribute("property", property);
      if (name) element.setAttribute("name", name);
    } else if (selector === 'link[rel="canonical"]') {
      element = document.createElement("link");
      element.setAttribute("rel", "canonical");
    }
    if (element) document.head.appendChild(element);
  }
  element?.setAttribute(attr, value);
}

function applyPerfectStartupSeo(state?: PerfectStartupStateGuide) {
  const title = state
    ? `How to Start a Business in ${state.name} | The Perfect Startup | JahKnowsPR`
    : "The Perfect Startup | State-by-State Business Startup Guide | JahKnowsPR";
  const description = state
    ? `Learn the basic steps to start a business in ${state.name}, from choosing a name and business structure to registration, taxes, permits, branding, and launch strategy.`
    : "Learn how to start a business with structure, clarity, and confidence. The Perfect Startup by JahKnowsPR is a state-by-state guide for new founders, creators, and entrepreneurs.";
  const path = state ? `/the-brief/the-perfect-startup/${state.slug}` : "/the-brief/the-perfect-startup";
  const canonical = `${SITE_ORIGIN}${path}`;

  document.title = title;
  setMeta('meta[name="description"]', "content", description);
  setMeta('link[rel="canonical"]', "href", canonical);
  setMeta('meta[property="og:title"]', "content", title);
  setMeta('meta[property="og:description"]', "content", description);
  setMeta('meta[property="og:url"]', "content", canonical);
  setMeta('meta[property="og:type"]', "content", state ? "article" : "website");
  setMeta('meta[name="twitter:title"]', "content", title);
  setMeta('meta[name="twitter:description"]', "content", description);
}

function FAQBlock({ faqs }: { faqs: { question: string; answer: string }[] }) {
  return (
    <section className="rounded-3xl border bg-white p-8 text-center shadow-sm md:p-10">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-gold-dark">FAQ</p>
      <h2 className="mt-3 text-4xl font-bold tracking-tight text-primary md:text-5xl">Common questions</h2>
      <div className="mx-auto mt-8 max-w-2xl divide-y text-left">
        {faqs.map((faq) => (
          <details key={faq.question} className="group py-4">
            <summary className="cursor-pointer list-none font-semibold text-foreground marker:hidden">
              {faq.question}
            </summary>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function PerfectStartupLandingPage() {
  const [query, setQuery] = useState("");

  useEffect(() => {
    applyPerfectStartupSeo();
  }, []);

  const filteredStates = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return perfectStartupStates;
    return perfectStartupStates.filter((state) =>
      [state.name, state.abbreviation, state.slug].join(" ").toLowerCase().includes(normalized)
    );
  }, [query]);

  const texas = perfectStartupStateMap.get("texas");

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        id="perfect-startup-landing"
        data={[
          serviceSchema({
            name: "The Perfect Startup",
            description:
              "A state-by-state educational startup guide for founders learning business setup basics and brand strategy.",
            url: "/the-brief/the-perfect-startup",
            serviceType: "Business startup education",
            areaServed: "United States",
          }),
          faqPageSchema(LANDING_FAQS),
          breadcrumbListSchema([
            { name: "Home", url: "/" },
            { name: "The Brief", url: "/the-brief" },
            { name: "The Perfect Startup", url: "/the-brief/the-perfect-startup" },
          ]),
        ]}
      />

      <section className="relative overflow-hidden bg-primary px-4 py-20 text-primary-foreground md:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.28),transparent_34rem)]" />
        <div className="relative mx-auto max-w-6xl">
          <Badge className="border border-white/20 bg-white/10 text-white hover:bg-white/15">{PERFECT_STARTUP_CATEGORY}</Badge>
          <h1 className="mt-6 max-w-4xl text-4xl font-bold tracking-tight md:text-7xl">The Perfect Startup</h1>
          <p className="mt-5 max-w-3xl text-2xl font-semibold text-amber-200 md:text-3xl">
            Before you launch the brand, build the foundation.
          </p>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-white/85 md:text-xl">
            A state-by-state guide to help new founders understand what it takes to start a business with structure,
            clarity, and confidence.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <a href="#state-guides">Find Your State Guide</a>
            </Button>
            <Button size="lg" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" asChild>
              <Link to="/brand-strategy-session">Book a Strategy Session</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-gold-dark">What this helps with</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-primary">Start clean before you promote.</h2>
            <div className="mt-6 space-y-4 text-muted-foreground">
              {[
                "Understand the basic setup path in your state without getting buried in legal language.",
                "Learn what to verify before filing, banking, building a website, or marketing online.",
                "Build the strategy layer too: audience, offer, message, trust, next step, and launch plan.",
              ].map((item) => (
                <div key={item} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </div>

          {texas ? (
            <Link
              to={`/the-brief/the-perfect-startup/${texas.slug}`}
              className="group rounded-3xl border bg-[#F7F3EA] p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-gold/60 hover:shadow-xl md:p-8"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-gold-dark">Featured guide</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-primary">How to Start a Business in Texas</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                A stronger starter guide for Texas founders because JahKnowsPR is based in Texas. Exact filing and tax
                details still require official source verification before publication.
              </p>
              <span className="mt-6 inline-flex items-center gap-2 font-semibold text-primary">
                Read the Texas guide <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ) : null}
        </div>
      </section>

      <section id="state-guides" className="border-y bg-muted/20 px-4 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-gold-dark">Browse the collection</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-primary">50 States + D.C. and U.S. Territories</h2>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                Start with your state. Guides with exact legal/tax details should be verified from official sources before final publishing.
              </p>
            </div>
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by state or abbreviation"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {filteredStates.map((state) => (
              <Link
                key={state.slug}
                to={`/the-brief/the-perfect-startup/${state.slug}`}
                className="rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{state.name}</p>
                    <p className="text-sm text-muted-foreground">{state.abbreviation}</p>
                  </div>
                  {state.isSeededGuide ? <Badge variant="secondary">Seeded</Badge> : <Badge variant="outline">Draft</Badge>}
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-10 rounded-3xl border bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold text-primary">Optional future guides: D.C. and U.S. Territories</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {optionalTerritoryGuides.map((item) => (
                <Badge key={item.slug} variant="outline" className="rounded-full px-3 py-1">
                  {item.name} / {item.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <FAQBlock faqs={LANDING_FAQS} />
          <div className="rounded-3xl bg-primary p-6 text-primary-foreground md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-200">Next step</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Start with structure, then build the brand.</h2>
            <p className="mt-4 leading-relaxed text-white/85">
              Starting the business is one part. Making people understand it, trust it, and buy from it is the next.
              JahKnowsPR helps founders turn business ideas into clear brands with strategy, messaging, and visibility.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link to="/brand-strategy-session">Book a Strategy Session</Link>
              </Button>
              <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" asChild>
                <Link to="/brand-blueprint">Request a Brand Blueprint</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export function PerfectStartupStatePage() {
  const { stateSlug } = useParams<{ stateSlug: string }>();
  const state = stateSlug ? perfectStartupStateMap.get(stateSlug) : null;

  useEffect(() => {
    if (state) applyPerfectStartupSeo(state);
  }, [state]);

  if (!state) return <Navigate to="/the-brief/the-perfect-startup" replace />;

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        id={`perfect-startup-${state.slug}`}
        data={[
          articleSchema({
            headline: `How to Start a Business in ${state.name}`,
            description: `Learn the basic steps to start a business in ${state.name}, from choosing a name and business structure to registration, taxes, permits, branding, and launch strategy.`,
            url: `/the-brief/the-perfect-startup/${state.slug}`,
            datePublished: state.lastReviewed,
            dateModified: state.lastReviewed,
            keywords: [PERFECT_STARTUP_CATEGORY, state.name, "business startup", "brand strategy", "JahKnowsPR"],
          }),
          faqPageSchema(state.faqs),
          breadcrumbListSchema([
            { name: "Home", url: "/" },
            { name: "The Brief", url: "/the-brief" },
            { name: "The Perfect Startup", url: "/the-brief/the-perfect-startup" },
            { name: state.name, url: `/the-brief/the-perfect-startup/${state.slug}` },
          ]),
        ]}
      />

      <article>
        <section className="bg-primary px-4 py-20 text-primary-foreground md:py-28">
          <div className="mx-auto max-w-5xl">
            <Link to="/the-brief/the-perfect-startup" className="text-sm font-semibold text-white/75 underline-offset-4 hover:text-white hover:underline">
              The Perfect Startup
            </Link>
            <Badge className="ml-3 border border-white/20 bg-white/10 text-white hover:bg-white/15">The Brief</Badge>
            <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-6xl">How to Start a Business in {state.name}</h1>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-white/85 md:text-xl">
              A plain-language startup guide for founders who want to build with structure, clarity, and confidence.
            </p>
          </div>
        </section>

        <section className="px-4 py-14">
          <div className="mx-auto max-w-6xl space-y-10">
            <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-gold-dark">Step-by-step guide</p>
              <ol className="mt-6 grid gap-3 md:grid-cols-2">
                {state.startupSteps.map((step, index) => (
                  <li key={step} className="flex gap-3 rounded-2xl bg-muted/30 p-4">
                    <span className="font-serif text-2xl font-bold text-gold-dark">{String(index + 1).padStart(2, "0")}</span>
                    <span className="pt-1 text-sm font-medium">{step}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="mx-auto max-w-3xl rounded-3xl bg-primary p-6 text-center text-primary-foreground shadow-sm md:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-200">JahKnowsPR Strategic Notes</p>
              <p className="mt-4 text-xl leading-relaxed">
                Most founders rush to the logo, website, and social media before the foundation is clear. Before you
                promote the business, make sure you can explain who you help, what problem you solve, why people
                should trust you, and what action they should take next.
              </p>
            </section>

            <section className="rounded-3xl border bg-white p-8 shadow-sm md:p-10">
              <p className="text-center text-sm font-semibold uppercase tracking-[0.22em] text-gold-dark">Quick Summary</p>
              <dl className="mt-8 grid gap-4 text-sm md:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl bg-muted/30 p-4">
                  <dt className="font-semibold">State</dt>
                  <dd className="mt-1 text-muted-foreground">{state.name} ({state.abbreviation})</dd>
                </div>
                <div className="rounded-2xl bg-muted/30 p-4">
                  <dt className="font-semibold">Business filing office</dt>
                  <dd className="mt-1">
                    {state.filingOfficeUrl ? (
                      <a
                        href={state.filingOfficeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {state.filingOfficeName}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">{state.filingOfficeName}</span>
                    )}
                  </dd>
                </div>
                <div className="rounded-2xl bg-muted/30 p-4">
                  <dt className="font-semibold">Common structures</dt>
                  <dd className="mt-1 text-muted-foreground">{state.commonStructures.join(", ")}</dd>
                </div>
                <div className="rounded-2xl bg-muted/30 p-4">
                  <dt className="font-semibold">Tax registration notes</dt>
                  <dd className="mt-1 text-muted-foreground">Confirm with {state.taxOfficeName} before opening accounts or collecting sales-related taxes.</dd>
                </div>
                <div className="rounded-2xl bg-muted/30 p-4">
                  <dt className="font-semibold">Local permit reminder</dt>
                  <dd className="mt-1 text-muted-foreground">{state.localPermitReminder}</dd>
                </div>
                <div className="rounded-2xl bg-muted/30 p-4">
                  <dt className="font-semibold">Best for</dt>
                  <dd className="mt-1 text-muted-foreground">{state.bestFor.join(", ")}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-3xl border bg-white p-8 text-center shadow-sm md:p-10">
              <h2 className="text-4xl font-bold tracking-tight text-primary md:text-5xl">Common Mistakes</h2>
              <ul className="mx-auto mt-8 grid max-w-5xl gap-4 md:grid-cols-2">
                {COMMON_STARTUP_MISTAKES.map((mistake) => (
                  <li key={mistake} className="rounded-2xl bg-muted/30 p-5 text-base leading-relaxed text-muted-foreground">
                    <span>{mistake}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-3xl border bg-[#F7F3EA] p-8 text-center shadow-sm md:p-10">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-gold-dark">State-specific notes</p>
              <ul className="mx-auto mt-6 max-w-4xl space-y-4">
                {state.stateSpecificNotes.map((note) => (
                  <li key={note} className="text-lg leading-relaxed text-muted-foreground">{note}</li>
                ))}
              </ul>
            </section>

            <FAQBlock faqs={state.faqs} />

            <section className="rounded-3xl bg-primary p-8 text-center text-primary-foreground md:p-10">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-200">After setup</p>
              <h2 className="mx-auto mt-3 max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">Make the business easier to understand and trust.</h2>
              <p className="mx-auto mt-5 max-w-3xl text-lg leading-relaxed text-white/85">
                Starting the business is one part. Making people understand it, trust it, and buy from it is the next.
                JahKnowsPR helps founders turn business ideas into clear brands with strategy, messaging, and visibility.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild>
                  <Link to="/brand-strategy-session">Book a Strategy Session</Link>
                </Button>
                <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" asChild>
                  <Link to="/free-audit">Request a Free Audit</Link>
                </Button>
              </div>
            </section>

            <p className="rounded-2xl border bg-muted/20 p-5 text-center text-sm leading-relaxed text-muted-foreground">
              {state.disclaimer}
            </p>
          </div>
        </section>
      </article>
    </main>
  );
}

