import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  BookOpen,
  CalendarRange,
  CheckCircle,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  Palette,
  Sparkles,
  Star,
  Target,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

function WhoItBelongsTo({ children }: { children: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/25 px-4 py-4 md:px-5 md:py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">
        Who it belongs to
      </p>
      <p className="text-sm md:text-base text-foreground leading-relaxed">{children}</p>
    </div>
  );
}

/** Same destination as each section’s primary CTA; shared affordance for title + button. */
const sectionHeadingLinkClass =
  "text-foreground hover:text-primary underline-offset-4 hover:underline transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/**
 * Services (/work-with-me) — JahKnowsPR / KORA offer ladder.
 */
const WorkWithMe = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <div className="fixed top-24 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>

      <section className="bg-gradient-to-r from-primary to-primary/90 text-white py-14 md:py-20 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 text-white/90 text-sm uppercase tracking-widest">
            <Sparkles className="w-4 h-4" aria-hidden />
            JahKnowsPR · KORA
          </div>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight">How we work with you</h1>
          <p className="text-lg text-white/90 leading-relaxed max-w-2xl mx-auto">
            A clear ladder: free perspective, a lightweight add-on, your first paid strategy conversation, production
            when you are ready to execute, ongoing campaigns when you need momentum held, and full platform access when
            it is earned. Scroll to where you actually belong — then take one step.
          </p>
        </div>
      </section>

      {/* 01 · PAID SESSION — Strategy Session */}
      <section id="strategy-session" className="scroll-mt-28 py-20 md:py-28 px-4 border-b border-border/40">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-3 text-primary">
            <Target className="h-8 w-8 shrink-0" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">01 · Paid session</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              <Link to="/brand-strategy-session" className={sectionHeadingLinkClass}>
                Strategy Session
              </Link>
            </h2>
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300"
              title="Bestseller"
            >
              <Star
                className="h-4 w-4 shrink-0 fill-amber-500 text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]"
                aria-hidden
              />
              Bestseller
            </span>
          </div>
          <p className="text-lg text-muted-foreground">
            <span className="font-semibold text-primary text-2xl md:text-3xl tabular-nums">$150</span>
            <span className="mx-2">·</span>
            60 minutes · Zoom or in person
          </p>
          <div className="space-y-4 text-base md:text-lg text-foreground/90 leading-relaxed">
            <p>
              The Strategy Session is the first paid step for people who want direct clarity before moving into deeper
              work. We use it to understand your business, identify what is actually blocking growth, and map the
              smartest next move.
            </p>
            <p>
              This is a standalone service for founders, creators, and businesses who need focused strategy around
              positioning, visibility, brand direction, rollout planning, or decision-making. It also helps us determine
              fit before any backend access, advanced support, or platform invitation.
            </p>
            <div className="pt-2">
              <p className="text-sm font-semibold text-foreground mb-3">What you can expect</p>
              <ul className="space-y-3">
                {[
                  "A structured intake so we come in prepared",
                  "Clear feedback on your business, brand, and next priorities",
                  "Direction on what to fix, refine, or build next",
                  "A realistic fit check before deeper services or system access",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <WhoItBelongsTo>
            Founders, creators, and businesses who need strategic clarity before investing in deeper services, software
            access, or long-term support.
          </WhoItBelongsTo>
          <Button variant="hero" size="lg" className="mt-2 w-full sm:w-auto" asChild>
            <Link to="/brand-strategy-session">Book a Strategy Session</Link>
          </Button>
        </div>
      </section>

      {/* 02 · FREE — The Brief */}
      <section id="the-brief" className="scroll-mt-28 py-20 md:py-28 px-4 bg-muted/20 border-b border-border/40">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-3 text-primary">
            <BookOpen className="h-8 w-8 shrink-0" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">02 · Free</p>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            <Link to="/the-brief" className={sectionHeadingLinkClass}>
              The Brief
            </Link>
          </h2>
          <div className="space-y-4 text-base md:text-lg text-foreground/90 leading-relaxed">
            <p>
              The Brief is our free perspective layer for founders, creatives, and operators who want sharper thinking
              before they spend money. It gives you strategic insight, clear angles, and real commentary so you can move
              with more intention.
            </p>
            <p>
              Start here if you are still exploring, learning how we think, or trying to understand what kind of support
              you actually need. It is free, useful, and built to help you make better decisions before committing to a
              session, service, or system.
            </p>
          </div>
          <WhoItBelongsTo>
            Founders, creatives, and operators who are still exploring, learning, and watching before making a paid
            commitment.
          </WhoItBelongsTo>
          <Button variant="hero" size="lg" className="mt-2 w-full sm:w-auto" asChild>
            <Link to="/the-brief">Go to The Brief</Link>
          </Button>
        </div>
      </section>

      {/* 03 · PRODUCTION */}
      <section id="creative-consultation" className="scroll-mt-28 py-20 md:py-28 px-4 border-b border-border/40">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-3 text-primary">
            <Palette className="h-8 w-8 shrink-0" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">03 · Production</p>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            <Link to="/consultation/creative-production" className={sectionHeadingLinkClass}>
              Creative Work &amp; Production
            </Link>
          </h2>
          <div className="space-y-4 text-base md:text-lg text-foreground/90 leading-relaxed">
            <p>
              When you need execution, this is where creative work lives. That includes videography, photography,
              branding, website work, and other visual or campaign support tied to what you are building.
            </p>
            <p>
              Production is scoped separately based on the project, timeline, and deliverables. This is for clients who
              already know they need assets, creative direction, or hands-on execution and want a real conversation about
              what it will take.
            </p>
          </div>
          <WhoItBelongsTo>
            Clients who need creative execution, brand assets, content production, or hands-on project delivery.
          </WhoItBelongsTo>
          <Button variant="hero" size="lg" className="mt-2 w-full sm:w-auto" asChild>
            <Link to="/consultation/creative-production">Book a Creative Consultation</Link>
          </Button>
        </div>
      </section>

      {/* 04 · ADD-ON — Telegram */}
      <section id="telegram" className="scroll-mt-28 py-20 md:py-28 px-4 bg-muted/20 border-b border-border/40">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-3 text-primary">
            <MessageCircle className="h-8 w-8 shrink-0" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">04 · Add-on</p>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            <Link to="/kora/telegram-subscription" className={sectionHeadingLinkClass}>
              Join KORA on Telegram
            </Link>
          </h2>
          <div className="space-y-4 text-base md:text-lg text-foreground/90 leading-relaxed">
            <p>
              KORA on Telegram gives you light, ongoing support in a faster format. It is designed for people who want
              ideas, prompts, and useful back-and-forth without logging into a full platform.
            </p>
            <p>
              This is not full system access. It is a simple way to stay connected to KORA in your daily workflow while
              getting small strategic nudges that keep you moving.
            </p>
          </div>
          <WhoItBelongsTo>
            People who live in chat, want lightweight support, and want KORA in a simpler day-to-day format.
          </WhoItBelongsTo>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
            <Button variant="hero" size="lg" className="w-full sm:w-auto" asChild>
              <Link to="/kora/telegram-subscription">Meet KORA in Telegram</Link>
            </Button>
            <span className="text-base font-semibold text-muted-foreground tabular-nums">$15/mo</span>
          </div>
        </div>
      </section>

      {/* 05 · ONGOING — Campaigns & Retainers */}
      <section id="campaigns-retainers" className="scroll-mt-28 py-20 md:py-28 px-4 border-b border-border/40">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-3 text-primary">
            <Megaphone className="h-8 w-8 shrink-0" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">05 · Ongoing</p>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            <Link to="/consultation/campaign-retainer" className={sectionHeadingLinkClass}>
              Campaigns &amp; Retainers
            </Link>
          </h2>
          <div className="space-y-4 text-base md:text-lg text-foreground/90 leading-relaxed">
            <p>
              Our retainers are for brands that need ongoing strategy, campaign leadership, and consistent movement over
              time. This is not a one-time call and it is not a one-off deliverable. It is for people who want a
              strategic partner involved month to month.
            </p>
            <p>
              We use retainers to support launches, visibility campaigns, messaging discipline, planning cadence, and
              cross-channel coordination so your momentum does not disappear after one good week.
            </p>
          </div>
          <WhoItBelongsTo>
            Brands, businesses, and teams that need sustained campaign support and ongoing strategic leadership.
          </WhoItBelongsTo>
          <Button variant="hero" size="lg" className="mt-2 w-full sm:w-auto" asChild>
            <Link to="/consultation/campaign-retainer">Discuss a Campaign Retainer</Link>
          </Button>
        </div>
      </section>

    </div>
  );
};

export default WorkWithMe;
