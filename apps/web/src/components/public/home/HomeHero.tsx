import type { CSSProperties, MouseEvent } from "react";
import { Button } from "@/components/ui/button";

const HERO_PORTRAIT = "/authors/jocelyn-vaughn-seated.jpg";

function scrollToServices(event: MouseEvent<HTMLAnchorElement>) {
  const target = document.getElementById("services");
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function HomeHero() {
  return (
    <section
      className="spread relative grid min-h-[calc(100svh-5rem)] bg-cream lg:grid-cols-2"
      style={{ "--spread-layer": 1 } as CSSProperties}
    >
      <div className="hero-cross-copy relative z-[1] flex flex-col justify-center bg-primary px-6 py-12 text-primary-foreground sm:px-10 lg:px-14 lg:py-16">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold">JahKnowsPR</p>
        <h1 className="hero-cross-line mt-6 max-w-[9ch] font-serif text-[clamp(2.7rem,5.6vw,5.4rem)] font-medium leading-[0.9] tracking-tight">
          The way you’re seen changes everything.
        </h1>
        <p className="hero-cross-line mt-6 max-w-sm text-base leading-relaxed text-primary-foreground/85 md:text-lg">
          We shape the strategies, messages, and decisions behind how businesses, leaders, and organizations are understood.
        </p>
        <Button asChild size="lg" variant="secondary" className="hero-cross-line mt-8 h-12 w-fit px-7 font-semibold">
          <a href="#services" onClick={scrollToServices}>
            Explore Our Services
          </a>
        </Button>
      </div>
      <div className="hero-cross-figure relative z-[2] flex items-end justify-center px-4 pb-0 pt-2 lg:-ml-[12%] lg:px-0">
        <img
          src={HERO_PORTRAIT}
          alt="Jocelyn Vaughn seated in a studio portrait"
          width={819}
          height={1024}
          className="h-auto w-auto max-h-[46vh] max-w-full lg:max-h-[calc(100svh-5rem)]"
        />
      </div>
    </section>
  );
}
