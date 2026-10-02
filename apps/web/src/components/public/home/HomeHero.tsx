import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SESSION_CTA_PATH } from "@/content/firm";
import { firmProfile } from "@/content/firm";

export function HomeHero() {
  return (
    <section className="relative pt-28 pb-20 md:pt-36 md:pb-28 px-4 sm:px-6 border-b border-border bg-background">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="max-w-4xl mx-auto relative z-10 space-y-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-dark">
          {firmProfile.tagline}
        </p>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground leading-[1.05] tracking-tight text-balance">
          Communication should be strategic before it becomes public.
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl">
          JahKnowsPR is a strategic communications and public relations consultancy helping brands,
          leaders, and organizations make smarter decisions about what they say, how they are positioned,
          and how they are perceived.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button asChild size="lg" variant="default" className="h-12 px-8 font-semibold">
            <Link to={SESSION_CTA_PATH}>Book a Strategic Communications Session</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 px-8 font-semibold group">
            <Link to="/work">
              See Our Work
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
