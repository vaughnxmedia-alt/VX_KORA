import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CityAnswerBlock } from "@/components/ai-search/AnswerBlocks";
import { locationPageMap, locationPages, type LocationPage } from "@/data/locationPages";
import { trackCtaClick } from "@/lib/kora-analytics";

const SITE_ORIGIN = "https://www.jahknowspr.com";

const topicLinks: Record<string, string> = {
  "Why Polished Visuals Cannot Save Weak Messaging": "/the-brief/why-polished-visuals-cannot-save-weak-messaging",
};

function setMeta(selector: string, attr: string, value: string) {
  let el = document.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
  if (!el) {
    if (selector.startsWith("meta[")) {
      el = document.createElement("meta");
      const property = selector.match(/property="([^"]+)"/)?.[1];
      const name = selector.match(/name="([^"]+)"/)?.[1];
      if (property) el.setAttribute("property", property);
      if (name) el.setAttribute("name", name);
    } else if (selector === 'link[rel="canonical"]') {
      el = document.createElement("link");
      el.setAttribute("rel", "canonical");
    }
    if (el) document.head.appendChild(el);
  }
  el?.setAttribute(attr, value);
}

function applyLocationSeo(page: LocationPage) {
  const canonicalUrl = `${SITE_ORIGIN}/locations/${page.slug}`;
  document.title = page.seoTitle;
  setMeta('meta[name="description"]', "content", page.seoDescription);
  setMeta('link[rel="canonical"]', "href", canonicalUrl);
  setMeta('meta[property="og:title"]', "content", page.seoTitle);
  setMeta('meta[property="og:description"]', "content", page.seoDescription);
  setMeta('meta[property="og:url"]', "content", canonicalUrl);
  setMeta('meta[property="og:type"]', "content", "website");
  setMeta('meta[name="twitter:title"]', "content", page.seoTitle);
  setMeta('meta[name="twitter:description"]', "content", page.seoDescription);

  document.querySelectorAll('script[data-seo="location-page"]').forEach((tag) => tag.remove());
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.dataset.seo = "location-page";
  script.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfessionalService",
        name: "JahKnowsPR",
        url: canonicalUrl,
        areaServed: page.cityName === "Texas" ? "Texas" : `${page.cityName}, Texas`,
        description: page.seoDescription,
        serviceType: page.serviceFocus,
        address: {
          "@type": "PostalAddress",
          addressRegion: "TX",
          addressCountry: "US",
        },
        sameAs: ["https://www.jahknowspr.com/the-brief", "https://www.jahknowspr.com/brand-strategy-session"],
      },
      {
        "@type": "FAQPage",
        mainEntity: page.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_ORIGIN },
          { "@type": "ListItem", position: 2, name: "Locations", item: `${SITE_ORIGIN}/locations` },
          { "@type": "ListItem", position: 3, name: page.cityName, item: canonicalUrl },
        ],
      },
    ],
  });
  document.head.appendChild(script);
}

function trackLocationCta(page: LocationPage, ctaId: string, ctaLabel: string) {
  trackCtaClick({
    page_path: `/locations/${page.slug}`,
    content_id: page.slug,
    content_type: "location_page",
    cta_id: ctaId,
    cta_label: ctaLabel,
    metadata: {
      city_slug: page.slug,
      city_name: page.cityName,
      region: page.region,
    },
  });
}

export function LocationsIndexPage() {
  useEffect(() => {
    const page = locationPageMap.get("texas");
    if (page) applyLocationSeo({
      ...page,
      seoTitle: "Texas Location Pages | JahKnowsPR",
      seoDescription: "Explore JahKnowsPR PR and brand strategy location pages for Texas, Beaumont, Houston, Dallas, Austin, San Antonio, Port Arthur, and Orange.",
    });
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.22),transparent_32rem)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28">
          <div className="max-w-3xl space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em]">
              <MapPin className="h-4 w-4 text-amber-300" />
              Texas PR & Brand Strategy
            </div>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">JahKnowsPR location pages across Texas.</h1>
            <p className="text-lg leading-relaxed text-white/85 md:text-xl">
              One domain, one strategy system, city-specific pages for entrepreneurs, creators, small businesses, event brands, and service providers building authority across Texas.
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Choose your market</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Find the city strategy page that fits your audience.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {locationPages.map((page) => (
              <Link
                key={page.slug}
                to={`/locations/${page.slug}`}
                className="group rounded-2xl border border-border/70 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/60 hover:shadow-xl hover:shadow-primary/10"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{page.region}</p>
                    <h3 className="mt-2 text-xl font-semibold text-primary">{page.cityName}</h3>
                  </div>
                  <span className="rounded-full bg-primary/10 p-2 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-white">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{page.positioningAngle}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export function CityLandingPage() {
  const { citySlug } = useParams<{ citySlug: string }>();
  const page = citySlug ? locationPageMap.get(citySlug) : null;

  useEffect(() => {
    if (page) applyLocationSeo(page);
  }, [page]);

  if (!page) return <Navigate to="/locations/texas" replace />;

  const siblingCities = locationPages.filter((item) => item.slug !== page.slug);

  return (
    <main className="min-h-screen bg-background">
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.09),transparent_45%),radial-gradient(circle_at_20%_20%,rgba(212,175,55,0.22),transparent_26rem)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-20 md:grid-cols-[1.05fr_0.95fr] md:py-28">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em]">
              <Sparkles className="h-4 w-4 text-amber-300" />
              {page.heroEyebrow}
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-6xl">{page.heroHeadline}</h1>
            <p className="max-w-2xl text-lg leading-relaxed text-white/85 md:text-xl">{page.heroSubheadline}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="secondary" size="lg" asChild>
                <Link
                  to="/brand-strategy-session"
                  onClick={() => trackLocationCta(page, "book-authority-strategy-session", page.primaryCTA)}
                >
                  {page.primaryCTA}
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-white/40 bg-white/10 text-white hover:bg-white hover:text-primary"
                asChild
              >
                <Link to="/free-audit" onClick={() => trackLocationCta(page, "start-free-brand-diagnosis", page.secondaryCTA)}>
                  {page.secondaryCTA}
                </Link>
              </Button>
            </div>
          </div>
          <div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur">
            <p className="text-sm uppercase tracking-[0.2em] text-amber-200">Positioning angle</p>
            <p className="mt-4 text-2xl font-semibold leading-relaxed">{page.positioningAngle}</p>
            <div className="mt-6 grid gap-3 text-sm text-white/85">
              {page.proofPoints.map((point) => (
                <div key={point} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Local market context</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Why {page.cityName} brands need authority-building communication.</h2>
          </div>
          <p className="text-lg leading-relaxed text-muted-foreground">{page.localContext}</p>
        </div>
      </section>

      <section className="px-4 pb-16 md:pb-24">
        <div className="mx-auto max-w-6xl">
          <CityAnswerBlock
            cityName={page.cityName}
            href="/answers/how-to-build-local-brand-authority"
            linkLabel="Read how to build local brand authority"
            answer={`Yes. JahKnowsPR works with ${page.cityName} entrepreneurs, creators, service providers, and local brands that need clearer positioning, stronger messaging, and authority-building communication.`}
          />
        </div>
      </section>

      <section className="bg-muted/25 px-4 py-16 md:py-24">
        <div className="mx-auto max-w-6xl space-y-10">
          <SectionHeading eyebrow="Who we help" title={`Built for ${page.cityName} founders, creators, and local leaders.`} />
          <PillGrid items={page.audienceTypes} />
        </div>
      </section>

      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
          <ContentCard title="Common problems we help clarify" items={page.localPainPoints} />
          <ContentCard title="Services that support the strategy" items={page.serviceFocus} />
        </div>
      </section>

      <section className="bg-primary px-4 py-16 text-primary-foreground md:py-24">
        <div className="mx-auto max-w-5xl space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">City-specific strategy</p>
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl">A clear angle for {page.cityName}, not a copied city page.</h2>
          <p className="text-lg leading-relaxed text-white/85">{page.positioningAngle}</p>
          <div className="flex flex-wrap gap-2">
            {page.industries.map((industry) => (
              <span key={industry} className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm">
                {industry}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto max-w-6xl space-y-10">
          <SectionHeading eyebrow="Related content" title="Read The Brief and Answers before you spend more on content, ads, or visuals." />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link
              to="/answers/how-to-build-local-brand-authority"
              onClick={() => trackLocationCta(page, "related-answer-link", "How to build local brand authority")}
              className="group rounded-2xl border bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/60 hover:shadow-xl"
            >
              <p className="text-sm font-semibold text-primary">How to Build Local Brand Authority</p>
              <div className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors group-hover:text-primary">
                Read the answer <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
            {page.relatedBlogTopics.map((topic) => {
              const href = topicLinks[topic] || "/the-brief";
              return (
                <Link
                  key={topic}
                  to={href}
                  onClick={() => trackLocationCta(page, "related-blog-link", topic)}
                  className="group rounded-2xl border bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/60 hover:shadow-xl"
                >
                  <p className="text-sm font-semibold text-primary">{topic}</p>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors group-hover:text-primary">
                    Read related thinking <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-muted/25 px-4 py-16 md:py-24">
        <div className="mx-auto max-w-4xl space-y-8">
          <SectionHeading eyebrow="FAQ" title={`${page.cityName} PR and brand strategy questions`} />
          <div className="space-y-3">
            {page.faqs.map((faq) => (
              <details key={faq.question} className="group rounded-2xl border bg-white p-5">
                <summary className="cursor-pointer list-none font-semibold text-primary">{faq.question}</summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto max-w-5xl rounded-3xl bg-primary p-8 text-center text-primary-foreground md:p-12">
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
            Before you spend more on content, ads, or visuals, make sure your message is clear.
          </h2>
          <Button className="mt-8" variant="secondary" size="lg" asChild>
            <Link
              to="/brand-strategy-session"
              onClick={() => trackLocationCta(page, "final-book-authority-strategy-session", "Book an Authority Strategy Session")}
            >
              Book an Authority Strategy Session
            </Link>
          </Button>
        </div>
      </section>

      <section className="border-t px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-xl font-semibold text-primary">Explore other Texas location pages</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {siblingCities.map((city) => (
              <Link
                key={city.slug}
                to={`/locations/${city.slug}`}
                className="rounded-full border px-4 py-2 text-sm text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-white"
              >
                {city.cityName}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="max-w-3xl">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>
    </div>
  );
}

function PillGrid({ items }: { items: string[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item} className="rounded-2xl border bg-white px-5 py-4 text-sm font-medium shadow-sm">
          {item}
        </div>
      ))}
    </div>
  );
}

function ContentCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-3xl border bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-primary">{title}</h2>
      <ul className="mt-5 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
