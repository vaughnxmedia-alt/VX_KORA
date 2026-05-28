import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, Mail } from "lucide-react";
import { GUIDE_HUB_PATH } from "@/content/guides/beforeYouBuildTheBrand";

type LocationState = {
  businessName?: string;
  auditId?: string;
  readiness?: string;
};

export default function FreeAuditStarterGuideThankYou() {
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;
  const businessName = state.businessName?.trim() || "your brand";
  const guideHref = state.auditId
    ? `${GUIDE_HUB_PATH}?auditId=${encodeURIComponent(state.auditId)}`
    : GUIDE_HUB_PATH;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex max-w-3xl flex-col items-center gap-7 px-6 py-20 text-center md:py-28">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gold">Questionnaire complete</p>
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">
            You are not receiving a full audit yet — here is your next step.
          </h1>
          <p className="text-lg text-muted-foreground md:text-xl">
            We reviewed your answers for <strong className="text-foreground">{businessName}</strong>. A full JahKnowsPR
            audit requires a live website or a complete core social setup (Instagram, Facebook, and TikTok) so we have
            enough public presence to research and diagnose.
          </p>
        </div>

        <div className="grid w-full gap-4 text-left md:grid-cols-2">
          <div className="rounded-2xl border bg-card p-5">
            <Mail className="mb-3 h-6 w-6 text-gold" />
            <h2 className="font-semibold">Check your inbox</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We emailed the Brand Foundation Starter Guide PDF. Use it to build clarity before you invest in a website,
              content system, or ads.
            </p>
          </div>
          <div className="rounded-2xl border bg-card p-5">
            <BookOpen className="mb-3 h-6 w-6 text-gold" />
            <h2 className="font-semibold">Continue on The Brief</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The Making of a Brand hub walks through foundation, website basics, social setup, and trust signals — the
              same path we use before a full audit.
            </p>
          </div>
        </div>

        <p className="max-w-2xl text-sm text-muted-foreground">
          When your website or core social channels are live, apply again at{" "}
          <Link to="/free-audit" className="font-medium text-primary underline-offset-4 hover:underline">
            Free Brand Audit
          </Link>{" "}
          and we will run the full public-facing diagnosis.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="rounded-full">
            <Link to={guideHref} state={state}>
              <BookOpen className="mr-2 h-4 w-4" />
              Go to Before You Build the Brand
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link to="/the-brief">Explore The Brief</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
