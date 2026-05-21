import { FormEvent, lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Download, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  beforeYouBuildTheBrandArticles,
  getBeforeYouBuildArticle,
  getGuideArticleNeighbors,
  GUIDE_CATEGORY,
  GUIDE_HUB_PATH,
  GUIDE_HUB_TITLE,
  GUIDE_SUBTITLE,
  GUIDE_TAGS,
  GUIDE_TITLE,
} from "@/content/guides/beforeYouBuildTheBrand";
import {
  getDefaultOgImageAbsoluteUrl,
  getGuideHubOgImageAbsoluteUrl,
  getPublicSiteOrigin,
} from "@/lib/blog-share";
import { supabase } from "@/integrations/supabase/client";

const GuideQRCode = lazy(() =>
  import("@/components/guides/GuideQRCode").then((module) => ({ default: module.GuideQRCode })),
);

const siteUrl = () =>
  ((import.meta.env.VITE_SITE_URL as string | undefined)?.trim() || getPublicSiteOrigin()).replace(/\/$/, "");

function setGuideSeo({
  title,
  description,
  path,
  ogImage,
}: {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
}) {
  document.title = title;
  const canonicalUrl = `${siteUrl()}${path}`;
  const shareImage =
    ogImage ??
    (path === GUIDE_HUB_PATH
      ? getGuideHubOgImageAbsoluteUrl()
      : `${getDefaultOgImageAbsoluteUrl()}?guide=${encodeURIComponent(path.split("/").pop() || "guide")}`);
  const head = document.head;
  document
    .querySelectorAll('meta[property^="og:"], meta[name^="twitter:"], link[rel="canonical"], script[data-seo="before-build-brand"]')
    .forEach((tag) => tag.remove());

  const ensureMeta = (selector: string, attr: "name" | "property", key: string, content: string) => {
    let meta = document.querySelector(selector) as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute(attr, key);
      head.appendChild(meta);
    }
    meta.setAttribute("content", content);
  };

  ensureMeta('meta[name="description"]', "name", "description", description);
  ensureMeta('meta[name="robots"]', "name", "robots", "index,follow,max-image-preview:large");

  const canonical = document.createElement("link");
  canonical.rel = "canonical";
  canonical.href = canonicalUrl;
  head.appendChild(canonical);

  [
    ["og:title", title],
    ["og:description", description],
    ["og:type", "article"],
    ["og:url", canonicalUrl],
    ["og:site_name", "JahKnowsPR"],
    ["og:image", shareImage],
    ["og:updated_time", new Date().toISOString()],
    ["article:section", GUIDE_CATEGORY],
    ["article:tag", GUIDE_TAGS.join(", ")],
  ].forEach(([property, content]) => {
    const meta = document.createElement("meta");
    meta.setAttribute("property", property);
    meta.setAttribute("content", content);
    head.appendChild(meta);
  });

  [
    ["twitter:card", "summary_large_image"],
    ["twitter:title", title],
    ["twitter:description", description],
    ["twitter:image", shareImage],
  ].forEach(([name, content]) => {
    const meta = document.createElement("meta");
    meta.setAttribute("name", name);
    meta.setAttribute("content", content);
    head.appendChild(meta);
  });

  const structuredData = document.createElement("script");
  structuredData.type = "application/ld+json";
  structuredData.dataset.seo = "before-build-brand";
  structuredData.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    articleSection: GUIDE_CATEGORY,
    keywords: GUIDE_TAGS.join(", "),
    url: canonicalUrl,
    publisher: {
      "@type": "Organization",
      name: "JahKnowsPR Firm",
      url: siteUrl(),
    },
  });
  head.appendChild(structuredData);
}

function GuideCtaBlock({
  onDownload,
  isDownloading,
}: {
  onDownload: () => void;
  isDownloading: boolean;
}) {
  return (
    <Card id="download-guide" className="border-gold/40 bg-primary-foreground/10 text-primary-foreground shadow-xl">
      <CardContent className="p-6 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Free Guide</p>
            <h2 className="mt-2 text-2xl font-bold">Download the full starter guide.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-primary-foreground/80">
              Use the PDF as your foundation checklist, then scan each slide QR code when you want the deeper article.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
            <Button onClick={onDownload} disabled={isDownloading} className="bg-gold text-primary hover:bg-gold/90">
                <Download className="mr-2 h-4 w-4" />
                {isDownloading ? "Sending Guide..." : "Download the Full Guide"}
            </Button>
            <Button asChild variant="secondary">
              <Link to="/brand-strategy-session">Book a Brand Strategy Session</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ArticleCtas({ guideQuery }: { guideQuery: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Button asChild className="h-auto justify-start rounded-2xl p-5 text-left">
        <Link to={`${GUIDE_HUB_PATH}${guideQuery}#download-guide`}>
          <Download className="mr-3 h-5 w-5" />
          Download the Full Guide
        </Link>
      </Button>
      <Button asChild variant="outline" className="h-auto justify-start rounded-2xl p-5 text-left">
        <Link to="/free-audit">Start the Free Brand Audit</Link>
      </Button>
      <Button asChild variant="outline" className="h-auto justify-start rounded-2xl p-5 text-left">
        <Link to="/brand-strategy-session">Book a Brand Strategy Session</Link>
      </Button>
    </div>
  );
}

function HubPage() {
  const location = useLocation();
  const { toast } = useToast();
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [leadForm, setLeadForm] = useState({
    name: "",
    email: "",
    phone: "",
    subscribe: true,
  });

  const guideContext = useMemo(() => {
    const state = (location.state ?? {}) as { auditId?: string; businessName?: string };
    const queryAuditId = new URLSearchParams(location.search).get("auditId")?.trim() || "";
    const auditId = state.auditId?.trim() || queryAuditId || "";
    const query = auditId ? `?auditId=${encodeURIComponent(auditId)}` : "";
    return { auditId, query };
  }, [location.search, location.state]);

  useEffect(() => {
    setGuideSeo({
      title: `${GUIDE_HUB_TITLE} | JahKnowsPR`,
      description: "Download the free JahKnowsPR starter guide and learn the brand foundation steps to complete before your website, social media, content, or visuals.",
      path: GUIDE_HUB_PATH,
    });
  }, []);

  const requestGuideEmailFromAudit = async (auditId: string) => {
    const { error } = await supabase.functions.invoke("starter-guide-download", {
      body: {
        auditId,
        subscribe: false,
        sourcePath: location.pathname,
      },
    });
    if (error) throw new Error(error.message || "Could not send guide email.");
  };

  const requestGuideEmailFromPopup = async () => {
    const { error } = await supabase.functions.invoke("starter-guide-download", {
      body: {
        name: leadForm.name.trim(),
        email: leadForm.email.trim(),
        phone: leadForm.phone.trim(),
        subscribe: leadForm.subscribe,
        sourcePath: location.pathname,
      },
    });
    if (error) throw new Error(error.message || "Could not send guide email.");
  };

  const handleDownloadGuide = async () => {
    if (isDownloading) return;
    if (!guideContext.auditId) {
      setDownloadDialogOpen(true);
      return;
    }
    try {
      setIsDownloading(true);
      await requestGuideEmailFromAudit(guideContext.auditId);
      toast({
        title: "Guide sent",
        description: "We emailed your starter guide to the same address used on your audit request.",
      });
    } catch (error) {
      toast({
        title: "Could not send guide",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleLeadSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!leadForm.name.trim() || !leadForm.email.trim() || !leadForm.phone.trim()) {
      toast({
        title: "Missing details",
        description: "Please enter your name, email, and phone number.",
        variant: "destructive",
      });
      return;
    }
    try {
      setIsDownloading(true);
      await requestGuideEmailFromPopup();
      toast({
        title: "Guide sent",
        description: "Check your inbox for the 22-page starter guide PDF.",
      });
      setDownloadDialogOpen(false);
      setLeadForm({ name: "", email: "", phone: "", subscribe: true });
    } catch (error) {
      toast({
        title: "Could not send guide",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <main className="min-h-screen bg-primary text-primary-foreground">
      <section className="border-b border-gold/40 px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="inline-flex items-center rounded-full border border-primary/25 bg-gold px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary shadow-sm">
            The Making of a Brand
          </div>
        </div>
      </section>

      <section className="border-b border-gold/20 px-4 py-16 sm:px-6 md:py-24">
        <div className="mx-auto max-w-5xl">
          <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl">{GUIDE_HUB_TITLE}</h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-primary-foreground/80">
            Starting a business is exciting, but before you create the logo, launch the website, post the content, or announce the brand, you need a foundation that people can understand.
          </p>
          <div className="mt-8">
            <Button onClick={handleDownloadGuide} disabled={isDownloading} className="bg-gold text-primary hover:bg-gold/90">
              {isDownloading ? "Sending Guide..." : "Download the Full Guide"}
            </Button>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-primary-foreground/80">
              Use this starter guide to complete your foundation steps before moving into audit and execution.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl space-y-12 px-4 py-12 sm:px-6 md:py-16">
        <article className="prose prose-invert max-w-none prose-headings:text-primary-foreground prose-p:text-primary-foreground/90 prose-strong:text-primary-foreground prose-blockquote:border-gold prose-blockquote:text-primary-foreground/90">
          <h2>What this guide is</h2>
          <p>
            <strong>{GUIDE_TITLE}</strong> is a beginner-friendly brand foundation guide for new business owners, founders, creators, and professionals who are building from the beginning.
          </p>
          <p>
            It is not a custom audit report. It is an educational starting point that helps you make better decisions before you spend money on websites, logos, content strategies, social media pages, or ads.
          </p>
          <h2>Who this guide is for</h2>
          <p>
            This guide is for anyone with an idea, new business, early brand, service, product, personal brand, creative practice, or professional offer that needs more clarity before going public.
          </p>
          <h2>Why brand foundation matters</h2>
          <p>
            A brand does not become clear because it looks good. It becomes clear because the message is built right. Your foundation helps people understand what you do, who you help, why it matters, what makes you different, why they should trust you, and what step they should take next.
          </p>
          <blockquote>
            Before people support the brand, they have to understand the brand.
          </blockquote>
          <h2>How to use the PDF and QR codes</h2>
          <p>
            Each PDF slide gives you the simple version. Scan the QR code or click the read-more link on that slide to open the deeper article for that topic.
          </p>
        </article>

        <GuideCtaBlock onDownload={handleDownloadGuide} isDownloading={isDownloading} />

        <section>
          <div className="mb-6 flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-gold" />
            <h2 className="text-2xl font-bold text-primary-foreground">Full Table of Contents</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {beforeYouBuildTheBrandArticles.map((article) => (
              <Link
                key={article.slug}
                to={`${article.path}${guideContext.query}`}
                className="group rounded-2xl border border-gold/30 bg-primary-foreground/5 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-gold/50 hover:bg-primary-foreground/10 hover:shadow-md"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
                  Slide {article.slideNumber}
                </p>
                <h3 className="mt-2 font-bold leading-snug text-primary-foreground group-hover:text-gold">{article.blogTitle}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-primary-foreground/75">{article.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>

        <section id="audit-cta" className="rounded-3xl border border-gold/30 bg-primary-foreground/10 p-6 text-primary-foreground shadow-sm md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Next Step</p>
          <h2 className="mt-3 text-2xl font-bold md:text-3xl">Ready to submit your Free Brand Audit?</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-primary-foreground/80">
            Complete the steps listed in this brief first, then submit your audit request so JahKnowsPR can evaluate a prepared, public-facing foundation.
          </p>
          <div className="mt-5">
            <Button asChild className="bg-gold text-primary hover:bg-gold/90">
              <Link to="/free-audit">Start with the Free Brand Audit</Link>
            </Button>
          </div>
        </section>
      </section>

      <Dialog open={downloadDialogOpen} onOpenChange={setDownloadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Get the Starter Guide by Email</DialogTitle>
            <DialogDescription>
              Enter your details and we will send the 22-page JahKnowsPR guide to your inbox.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={handleLeadSubmit}>
            <Input
              value={leadForm.name}
              onChange={(event) => setLeadForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Full name"
              autoComplete="name"
            />
            <Input
              value={leadForm.email}
              onChange={(event) => setLeadForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="Email address"
              autoComplete="email"
              type="email"
            />
            <Input
              value={leadForm.phone}
              onChange={(event) => setLeadForm((prev) => ({ ...prev, phone: event.target.value }))}
              placeholder="Phone number"
              autoComplete="tel"
            />
            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={leadForm.subscribe}
                onChange={(event) => setLeadForm((prev) => ({ ...prev, subscribe: event.target.checked }))}
                className="mt-1"
              />
              <span>Subscribe me to JahKnowsPR updates and The Brief.</span>
            </label>
            <DialogFooter>
              <Button type="submit" className="bg-gold text-primary hover:bg-gold/90" disabled={isDownloading}>
                {isDownloading ? "Sending Guide..." : "Email My Guide"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function GuideArticlePage({ slug }: { slug: string }) {
  const location = useLocation();
  const article = getBeforeYouBuildArticle(slug);
  const origin = siteUrl();
  const guideQuery = location.search || "";

  useEffect(() => {
    if (!article) return;
    setGuideSeo({
      title: article.metaTitle,
      description: article.metaDescription,
      path: article.path,
    });
  }, [article]);

  if (!article) return <Navigate to={GUIDE_HUB_PATH} replace />;

  const { previous, next } = getGuideArticleNeighbors(article.slug);

  return (
    <main className="min-h-screen bg-primary text-primary-foreground">
      <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6 md:py-16">
        <Link
          to={GUIDE_HUB_PATH}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gold hover:text-gold/80"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Guide Hub
        </Link>

        <header className="mt-8 border-b border-gold/30 pb-8">
          <Badge variant="outline" className="border-gold/50 text-gold">{GUIDE_CATEGORY}</Badge>
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.25em] text-primary-foreground/70">
            {GUIDE_TITLE} / Slide {article.slideNumber}
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">{article.blogTitle}</h1>
          <p className="mt-5 text-lg leading-relaxed text-primary-foreground/80">{article.excerpt}</p>
          <div className="mt-6">
            <Suspense fallback={<div className="text-xs text-muted-foreground">Loading QR...</div>}>
              <GuideQRCode url={`${origin}${article.path}`} label={article.qrLabel} size={104} showText />
            </Suspense>
          </div>
        </header>

        <div className="prose prose-invert mt-10 max-w-none prose-headings:text-primary-foreground prose-p:text-primary-foreground/90 prose-strong:text-primary-foreground prose-li:text-primary-foreground/90">
          <p>
            This article expands on the <strong>{article.slideTitle}</strong> slide from <em>{GUIDE_SUBTITLE}</em>. Use it when you want the deeper teaching behind the PDF.
          </p>
          {article.bodyCopy.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}

          <h2>Why this topic matters</h2>
          <p>{article.whyItMatters}</p>

          <h2>Beginner-friendly explanation</h2>
          <p>{article.beginnerExplanation}</p>

          <h2>Common mistakes</h2>
          <ul>
            {article.commonMistakes.map((mistake) => (
              <li key={mistake}>{mistake}</li>
            ))}
          </ul>

          <h2>What to do first</h2>
          <ul>
            {article.whatToDoFirst.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>

          <h2>Mini checklist</h2>
          <ul>
            {article.miniChecklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <h2>Example</h2>
          <p>{article.example}</p>
        </div>

        <section className="mt-10 rounded-3xl border bg-muted/30 p-6 md:p-8">
          <div className="mb-5 flex items-center gap-3">
            <FileText className="h-5 w-5 text-gold" />
            <h2 className="text-2xl font-bold text-primary">Keep building with clarity</h2>
          </div>
          <ArticleCtas guideQuery={guideQuery} />
        </section>

        <nav className="mt-10 grid gap-4 border-t pt-8 md:grid-cols-2">
          {previous ? (
            <Link to={`${previous.path}${guideQuery}`} className="rounded-2xl border p-5 transition hover:border-gold/50 hover:bg-gold/5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Previous article</p>
              <p className="mt-2 font-semibold text-primary">{previous.blogTitle}</p>
            </Link>
          ) : (
            <Link to={`${GUIDE_HUB_PATH}${guideQuery}`} className="rounded-2xl border p-5 transition hover:border-gold/50 hover:bg-gold/5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Back to</p>
              <p className="mt-2 font-semibold text-primary">Guide Hub</p>
            </Link>
          )}
          {next ? (
            <Link to={`${next.path}${guideQuery}`} className="rounded-2xl border p-5 text-right transition hover:border-gold/50 hover:bg-gold/5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Next article</p>
              <p className="mt-2 font-semibold text-primary">{next.blogTitle}</p>
            </Link>
          ) : (
            <Link to="/free-audit" className="rounded-2xl border p-5 text-right transition hover:border-gold/50 hover:bg-gold/5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Final step</p>
              <p className="mt-2 inline-flex items-center justify-end gap-2 font-semibold text-primary">
                Start the Free Brand Audit <ArrowRight className="h-4 w-4" />
              </p>
            </Link>
          )}
        </nav>
      </article>
    </main>
  );
}

export default function BeforeYouBuildBrandGuide() {
  const { guideSlug } = useParams<{ guideSlug?: string }>();
  if (!guideSlug) return <HubPage />;
  return <GuideArticlePage slug={guideSlug} />;
}
