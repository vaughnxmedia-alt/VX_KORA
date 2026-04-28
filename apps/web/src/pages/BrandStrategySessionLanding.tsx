import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

const strategySessionBookPath = "/strategy-session";

/**
 * Production: put the mp4 in AWS S3 under prefix `site/videos/` (same bucket as content calendar; see `S3_VIDEO_FOLDERS` in `s3Upload.ts`)
 * and set `VITE_PR_VS_MARKETING_VIDEO_URL` on Vercel. Local: optional `public/videos/pr-vs-marketing.mp4` (gitignored).
 */
function prVsMarketingVideoSrc(): string {
  const raw = (import.meta.env.VITE_PR_VS_MARKETING_VIDEO_URL as string | undefined)?.trim();
  const url = raw?.replace(/^['"]|['"]$/g, "");
  if (url) return url;
  return "/videos/pr-vs-marketing.mp4";
}

const sectionClass =
  "border-b border-border/60 last:border-b-0";
const containerClass = "mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24";
const h2Class =
  "font-serif text-2xl sm:text-3xl font-bold tracking-tight text-primary mb-8 text-balance";
const bodyClass = "text-base sm:text-lg text-foreground/85 leading-relaxed space-y-4";
const listClass = "list-disc pl-5 space-y-2 text-base sm:text-lg text-foreground/85 leading-relaxed";
const ctaBlockClass = "mt-10 flex flex-col items-start gap-2";

const bookSessionLabel = "BOOK A SESSION";

const bookSessionBoldClass =
  "min-h-14 px-10 text-lg font-black uppercase tracking-[0.14em] shadow-lg";

function BookSessionButton() {
  return (
    <Button variant="hero" size="lg" className={cn(bookSessionBoldClass)} asChild>
      <Link to={strategySessionBookPath}>{bookSessionLabel}</Link>
    </Button>
  );
}

export default function BrandStrategySessionLanding() {
  useEffect(() => {
    document.title = "Brand Strategy Session | JahKnowsPR";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        "content",
        "The $150 Brand Strategy Session is a 60-minute diagnosis for creators, entrepreneurs, and business owners who are tired of posting without traction."
      );
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* 1. Hero Section */}
      <section
        className={`${sectionClass} bg-primary text-primary-foreground`}
        aria-labelledby="hero-heading"
      >
        <div className={`${containerClass} max-w-4xl text-center sm:text-left`}>
          <h1
            id="hero-heading"
            className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-[2.75rem] font-bold leading-[1.15] tracking-tight mb-10 text-balance"
          >
            You&apos;re Not Struggling to Post. You&apos;re Struggling to Position.
          </h1>
          <div className={ctaBlockClass}>
            <Button
              size="lg"
              variant="outline"
              className={cn(
                bookSessionBoldClass,
                "border-2 border-gold bg-transparent text-primary-foreground shadow-lg hover:bg-gold/15 hover:text-primary-foreground",
              )}
              asChild
            >
              <Link to={strategySessionBookPath}>{bookSessionLabel}</Link>
            </Button>
            <p className="text-sm text-primary-foreground/70">Limited sessions available.</p>
          </div>
          <p
            className={cn(
              "mt-12 text-base sm:text-lg md:text-xl text-gold font-medium tracking-wide",
              "[paint-order:stroke_fill] [-webkit-text-stroke:0.55px_rgb(255_255_255)]",
            )}
          >
            For the ones who are done{" "}
            <span className="text-primary-foreground [-webkit-text-stroke:0]">guessing.</span>
          </p>
        </div>
      </section>

      {/* 2. PR vs. marketing — video */}
      <section className={`${sectionClass} bg-background`} aria-labelledby="pr-vs-marketing-heading">
        <div className={`${containerClass} max-w-4xl`}>
          <h2 id="pr-vs-marketing-heading" className={h2Class}>
            PR or Marketing? Get the right answer.
          </h2>
          <figure className="mt-2 mb-0">
            <div className="rounded-xl overflow-hidden border border-border/60 bg-black/90 shadow-md ring-1 ring-border/40">
              <video
                className="w-full aspect-video object-contain bg-black"
                controls
                playsInline
                preload="metadata"
                title="PR or Marketing? Get the right answer."
                aria-label="PR or Marketing? Get the right answer. Perception, trust, and when to invest in each."
              >
                <source src={prVsMarketingVideoSrc()} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </figure>
          <div className={`${ctaBlockClass} mt-10`}>
            <BookSessionButton />
            <p className="text-sm text-muted-foreground">Limited sessions available.</p>
          </div>
        </div>
      </section>

      {/* 3. Who It's For / Not For */}
      <section className={`${sectionClass} bg-background`} aria-labelledby="who-heading">
        <div className={containerClass}>
          <h2 id="who-heading" className={h2Class}>
            {"WHO IT'S FOR / NOT FOR"}
          </h2>
          <p className="font-semibold text-primary mb-4">This is for you if:</p>
          <ul className={`${listClass} mb-10`}>
            <li>You are a content creator trying to turn attention into real opportunities</li>
            <li>You are an entrepreneur with offers that are not converting the way they should</li>
            <li>You are a personal brand that needs stronger messaging and market clarity</li>
            <li>You are a business owner who knows your brand is not being understood correctly</li>
            <li>You are tired of posting without a real return</li>
            <li>You are ready to hear what needs to change</li>
          </ul>
          <p className="font-semibold text-primary mb-4">This is not for you if:</p>
          <ul className={`${listClass} mb-10`}>
            <li>You want someone to tell you what you want to hear</li>
            <li>You are looking for cheap validation instead of real strategy</li>
            <li>You are not ready to fix your messaging</li>
            <li>You keep changing direction every week</li>
            <li>You want results without making adjustments</li>
            <li>You are not serious about growth</li>
          </ul>
          <p className="text-base sm:text-lg text-foreground/85 leading-relaxed">
            This session is for people who are ready to tighten the brand and move with intention.
          </p>
        </div>
      </section>

      {/* 4. Strategy meeting roadmap (graphic) */}
      <section className={`${sectionClass} bg-muted/25`} aria-labelledby="roadmap-heading">
        <div className={`${containerClass} max-w-6xl`}>
          <h2 id="roadmap-heading" className="sr-only">
            Strategy meeting roadmap
          </h2>
          <figure className="mx-auto max-w-5xl">
            <img
              src="/images/strategy-meeting-roadmap.png"
              alt="Strategy meeting roadmap: assess your current strategy, define your goals, create a custom strategy, then action plan and next steps—with a prompt to book your strategy session."
              className="w-full rounded-xl border border-border/60 bg-background shadow-md ring-1 ring-border/40"
              loading="lazy"
              decoding="async"
            />
          </figure>
          <div className="mt-10 flex flex-col items-center gap-2 text-center">
            <BookSessionButton />
            <p className="text-sm text-muted-foreground">Limited sessions available.</p>
          </div>
        </div>
      </section>

      {/* 5. Urgency + booking (final section; id kept for legacy #booking links) */}
      <section
        id="booking"
        className={`${sectionClass} scroll-mt-24 bg-background`}
        aria-labelledby="urgency-heading"
      >
        <div className={containerClass}>
          <h2 id="urgency-heading" className={h2Class}>
            Limited spots — on purpose
          </h2>
          <div className={bodyClass}>
            <p className="font-semibold text-primary text-xl">Sessions stay small so each one stays sharp.</p>
            <p>
              JahKnowsPR caps booking so you get a real diagnosis—not a rushed, generic call.
            </p>
            <p className="font-medium text-foreground">
              If you have been circling the same issue or waiting for clarity to appear on its own, that delay has a
              cost.
            </p>
            <p className="font-medium">Every unclear week tends to mean:</p>
            <ul className="list-none space-y-2 pl-0 text-base sm:text-lg text-foreground/85 leading-relaxed">
              <li className="flex gap-2.5">
                <span className="shrink-0 font-bold text-primary select-none" aria-hidden>
                  ★
                </span>
                <span className="font-bold">missed inquiries</span>
              </li>
              <li className="flex gap-2.5">
                <span className="shrink-0 font-bold text-primary select-none" aria-hidden>
                  ★
                </span>
                <span className="font-bold">weak conversions</span>
              </li>
              <li className="flex gap-2.5">
                <span className="shrink-0 font-bold text-primary select-none" aria-hidden>
                  ★
                </span>
                <span className="font-bold">forgettable messaging</span>
              </li>
              <li className="flex gap-2.5">
                <span className="shrink-0 font-bold text-primary select-none" aria-hidden>
                  ★
                </span>
                <span className="font-bold">content that works harder than it should</span>
              </li>
            </ul>
          </div>

          <div className="mt-12 rounded-2xl border border-border bg-primary px-6 py-8 text-primary-foreground shadow-lg sm:px-10 sm:py-10">
            <p className="font-serif text-2xl font-bold sm:text-3xl">Brand Strategy Session</p>
            <p className="mt-2 text-lg text-primary-foreground/90">
              <span className="font-semibold">60 minutes</span>
              <span className="mx-2 text-primary-foreground/50">·</span>
              <span className="font-semibold">$150</span>
              <span className="mx-2 text-primary-foreground/50">·</span>
              <span>Clear direction</span>
            </p>
            <p className="mt-6 font-medium text-primary-foreground/95">You leave knowing how to:</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-primary-foreground/90">
              <li>name the gap</li>
              <li>tighten the message</li>
              <li>strengthen how you show up</li>
              <li>move with a plan—not guesses</li>
            </ul>
            <div className="mt-8">
              <Button
                variant="outline"
                size="lg"
                className={cn(
                  bookSessionBoldClass,
                  "border-2 border-gold bg-primary-foreground text-primary hover:bg-gold/15 hover:text-primary",
                )}
                asChild
              >
                <Link to={strategySessionBookPath}>{bookSessionLabel}</Link>
              </Button>
            </div>
            <p className="mt-6 text-sm text-primary-foreground/70">Direct. Strategic. No fluff.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
