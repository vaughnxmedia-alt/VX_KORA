import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight, BookOpen, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DirectAnswerBlock, FAQSection, ServiceDefinitionBlock } from "@/components/ai-search/AnswerBlocks";
import { StructuredData } from "@/components/StructuredData";
import { answerPageMap, answerPages, type AnswerPage } from "@/data/answerPages";
import { articleSchema, breadcrumbListSchema, faqPageSchema, serviceSchema } from "@/lib/structured-data";
import { trackAIAnswerView, trackCtaClick } from "@/lib/kora-analytics";

const SITE_ORIGIN = "https://www.jahknowspr.com";

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

function applyAnswerSeo(page?: AnswerPage) {
  const title = page?.seoTitle || "Answers Hub | JahKnowsPR";
  const description =
    page?.seoDescription ||
    "Clear answers about PR, marketing, brand strategy, media coverage, content conversion, and local brand authority from JahKnowsPR.";
  const canonical = `${SITE_ORIGIN}${page ? `/answers/${page.slug}` : "/answers"}`;

  document.title = title;
  setMeta('meta[name="description"]', "content", description);
  setMeta('link[rel="canonical"]', "href", canonical);
  setMeta('meta[property="og:title"]', "content", title);
  setMeta('meta[property="og:description"]', "content", description);
  setMeta('meta[property="og:url"]', "content", canonical);
  setMeta('meta[property="og:type"]', "content", page ? "article" : "website");
  setMeta('meta[name="twitter:title"]', "content", title);
  setMeta('meta[name="twitter:description"]', "content", description);
}

function trackAnswerCta(page: AnswerPage, ctaId: string, label: string, href: string) {
  trackCtaClick({
    page_path: `/answers/${page.slug}`,
    content_id: page.slug,
    content_type: "ai_answer",
    cta_id: ctaId,
    cta_label: label,
    button_text: label,
    funnel_id: href.includes("free-audit") ? "free_audit" : href.includes("strategy") ? "strategy_session" : "content_engagement",
    metadata: { answer_slug: page.slug, destination: href },
  });
}

export function AnswersHub() {
  useEffect(() => {
    applyAnswerSeo();
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        id="answers-hub"
        data={[
          breadcrumbListSchema([
            { name: "Home", url: "/" },
            { name: "Answers", url: "/answers" },
          ]),
          serviceSchema({
            name: "PR and Brand Strategy Answers",
            description:
              "Clear educational answers about PR, marketing, brand strategy, media coverage, and authority building from JahKnowsPR.",
            url: "/answers",
            serviceType: "Brand education and PR strategy guidance",
          }),
        ]}
      />
      <section className="relative overflow-hidden bg-primary px-4 py-20 text-primary-foreground md:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.24),transparent_32rem)]" />
        <div className="relative mx-auto max-w-5xl space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em]">
            <BookOpen className="h-4 w-4 text-amber-300" />
            JahKnowsPR Answers
          </div>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">Clear answers for brands trying to build authority.</h1>
          <p className="max-w-3xl text-lg leading-relaxed text-white/85 md:text-xl">
            Short, useful explanations for business owners, creators, and service providers asking whether they need PR,
            marketing, brand strategy, media coverage, or clearer positioning first.
          </p>
        </div>
      </section>

      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2">
          {answerPages.map((page) => (
            <Link
              key={page.slug}
              to={`/answers/${page.slug}`}
              className="group rounded-3xl border bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Answer</p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight">{page.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{page.directAnswer}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                Read answer <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

export function AnswerPageDetail() {
  const { answerSlug } = useParams<{ answerSlug: string }>();
  const page = answerSlug ? answerPageMap.get(answerSlug) : null;

  useEffect(() => {
    if (!page) return;
    applyAnswerSeo(page);
    trackAIAnswerView({
      page_path: `/answers/${page.slug}`,
      content_id: page.slug,
      content_type: "ai_answer",
      content_category: "answers",
      metadata: { answer_slug: page.slug, question: page.directQuestion },
    });
  }, [page]);

  if (!page) return <Navigate to="/answers" replace />;

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        id={`answer-${page.slug}`}
        data={[
          articleSchema({
            headline: page.title,
            description: page.seoDescription,
            url: `/answers/${page.slug}`,
            keywords: ["PR", "brand strategy", "JahKnowsPR", "authority strategy", "Texas"],
          }),
          faqPageSchema(page.faqs),
          breadcrumbListSchema([
            { name: "Home", url: "/" },
            { name: "Answers", url: "/answers" },
            { name: page.title, url: `/answers/${page.slug}` },
          ]),
        ]}
      />

      <section className="bg-primary px-4 py-20 text-primary-foreground md:py-28">
        <div className="mx-auto max-w-4xl">
          <Link to="/answers" className="text-sm font-semibold text-white/75 underline-offset-4 hover:text-white hover:underline">
            Answers hub
          </Link>
          <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-6xl">{page.title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-white/85">{page.seoDescription}</p>
        </div>
      </section>

      <article className="px-4 py-16 md:py-24">
        <div className="mx-auto max-w-4xl space-y-12">
          <DirectAnswerBlock question={page.directQuestion} answer={page.directAnswer} />

          <section className="space-y-5">
            <h2 className="text-3xl font-bold tracking-tight">Deeper explanation</h2>
            <div className="space-y-4 text-lg leading-relaxed text-foreground/85">
              {page.deeperExplanation.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold tracking-tight">Who this applies to</h2>
              <ul className="mt-5 space-y-3">
                {page.appliesTo.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold tracking-tight">Common mistake</h2>
              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{page.commonMistake}</p>
            </div>
          </section>

          {page.serviceDefinition && <ServiceDefinitionBlock {...page.serviceDefinition} />}

          <section className="rounded-3xl bg-primary p-6 text-primary-foreground md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">JahKnowsPR perspective</p>
            <p className="mt-4 text-xl leading-relaxed">{page.jahKnowsPerspective}</p>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <Button variant="hero" size="lg" asChild>
              <Link
                to="/free-audit"
                onClick={() => trackAnswerCta(page, "answer_free_brand_diagnosis", "Start Free Brand Diagnosis", "/free-audit")}
              >
                Start Free Brand Diagnosis
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link
                to="/brand-strategy-session"
                onClick={() =>
                  trackAnswerCta(page, "answer_authority_strategy_session", "Book Authority Strategy Session", "/brand-strategy-session")
                }
              >
                Book Authority Strategy Session
              </Link>
            </Button>
          </section>

          <section className="rounded-3xl border bg-muted/20 p-6 md:p-8">
            <h2 className="text-2xl font-bold tracking-tight">Related internal links</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {page.relatedLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => trackAnswerCta(page, "answer_related_link", link.label, link.href)}
                  className="rounded-full border bg-white px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-primary hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </section>

          <FAQSection faqs={page.faqs} />
        </div>
      </article>
    </main>
  );
}
