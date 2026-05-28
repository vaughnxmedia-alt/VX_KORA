import { Link, Navigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, Globe2, Share2 } from "lucide-react";
import { GUIDE_HUB_PATH, GUIDE_SERIES_BASE_PATH } from "@/content/guides/beforeYouBuildTheBrand";

type LocationState = {
  businessName?: string;
  auditId?: string;
};

const RELATED_BRIEF_POSTS = [
  {
    title: "Before You Build the Brand",
    description: "Start with the foundation before the logo, website, content, or launch.",
    href: GUIDE_HUB_PATH,
  },
  {
    title: "Website Basics for New Businesses",
    description: "What your first website needs to communicate before it becomes complicated.",
    href: `${GUIDE_SERIES_BASE_PATH}/website-basics`,
  },
  {
    title: "Social Media Foundation for New Businesses",
    description: "How to set up clear profiles, bios, pinned posts, and content direction.",
    href: `${GUIDE_SERIES_BASE_PATH}/social-media-basics`,
  },
  {
    title: "Trust Signals Before You Market",
    description: "What new brands can use as proof before they have a long client history.",
    href: `${GUIDE_SERIES_BASE_PATH}/trust-signals`,
  },
];

export default function BrandFoundationStarterGuide() {
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;

  if (state.auditId) {
    return <Navigate to="/free-audit/starter-guide-thank-you" replace state={state} />;
  }
  const businessName = state.businessName?.trim() || "your new business";
  const guideHref = state.auditId ? `${GUIDE_HUB_PATH}?auditId=${encodeURIComponent(state.auditId)}` : GUIDE_HUB_PATH;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        <article className="mx-auto max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gold">Brand Foundation</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
            Start here before building the website or social accounts.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">
            You finished the questionnaire, but {businessName} is not ready for a full public-facing audit yet.
            A full audit needs either a website or a complete core social setup with Instagram, Facebook, and TikTok
            so there is enough digital presence to review. We sent the Brand Foundation Starter Guide PDF to your email
            so you can build the foundation first, then come back for the audit when those assets are live.
          </p>

          <h2 className="mt-8 text-2xl font-semibold">Why you are seeing this post</h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
            A full audit needs public-facing material to evaluate. Right now, the business is still in an early setup stage,
            so this page is your strategic foundation post: what to build first, what to clarify next, and how to avoid
            scaling confusion. Once the website or core social channels are live, reapply for the full audit.
          </p>

          <div className="mt-8">
            <Button asChild size="lg" className="rounded-full">
              <Link to={guideHref} state={state}>
                <BookOpen className="mr-2 h-4 w-4" />
                Continue to The Making of a Brand
              </Link>
            </Button>
          </div>
        </article>

        <section className="mt-10 rounded-[2rem] border bg-card p-6 md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gold">Read Next</p>
          <h2 className="mt-3 text-3xl font-bold">The Making of a Brand</h2>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            These Brief articles walk you through the work to complete before applying for the audit again.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {RELATED_BRIEF_POSTS.map((post) => (
              <Link
                key={post.href}
                to={post.href === GUIDE_HUB_PATH ? guideHref : post.href}
                state={state}
                className="rounded-2xl border bg-background p-5 transition hover:-translate-y-1 hover:border-gold/50 hover:shadow-lg"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">The Brief</p>
                <h3 className="mt-3 text-xl font-semibold">{post.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{post.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl border bg-card p-6">
            <Globe2 className="mb-4 h-7 w-7 text-gold" />
            <h2 className="text-2xl font-semibold">Build the website foundation</h2>
            <p className="mt-3 text-muted-foreground">
              Start with your brand name, domain, business email, mission, offer, homepage message, and one clear call to action.
            </p>
          </div>
          <div className="rounded-3xl border bg-card p-6">
            <Share2 className="mb-4 h-7 w-7 text-gold" />
            <h2 className="text-2xl font-semibold">Build the social foundation</h2>
            <p className="mt-3 text-muted-foreground">
              Secure your usernames, write a clear bio, create your first foundation posts, and pin the posts that explain the brand fast.
            </p>
          </div>
        </div>

        <section className="mt-10 rounded-[2rem] border border-gold/20 bg-gold/5 p-6 md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gold">Blog Series Prompt</p>
          <h2 className="mt-3 text-3xl font-bold">Building a Digital Presence</h2>
          <p className="mt-3 max-w-3xl font-medium text-foreground">
            Check your email for your Brand Foundation Starter Guide PDF.
          </p>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Your next content direction is a simple education series about building a digital presence:
            website basics, social media account setup, homepage clarity, profile bio clarity, pinned posts, and trust signals.
          </p>
          <p className="mt-4 max-w-3xl font-medium text-foreground">
            Once your website or social profiles are complete, apply for the Free Brand Audit again so JahKnowsPR can review
            the actual public presence and produce a full diagnosis.
          </p>
        </section>
      </section>
    </main>
  );
}
