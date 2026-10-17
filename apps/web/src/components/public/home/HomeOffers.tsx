import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { coreOffers } from "@/content/offers";
import { cn } from "@/lib/utils";
import { Spread } from "./Spread";

export function HomeOffers() {
  const [activeId, setActiveId] = useState(coreOffers[0].id);
  const offer = coreOffers.find((item) => item.id === activeId) ?? coreOffers[0];

  return (
    <Spread folio="03" kicker="Services" layer={3} id="services">
      <div className="flex items-end justify-between gap-6">
        <h2 className="max-w-[14ch] font-serif text-[clamp(2.5rem,5vw,4.4rem)] font-medium leading-[0.92] tracking-tight">
          Counsel first. Execution when it serves the strategy.
        </h2>
        <Link
          to="/work-with-us"
          className="hidden shrink-0 text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground sm:inline-flex sm:items-center sm:gap-3"
        >
          All offers
          <span className="h-px w-8 bg-gold-dark" />
        </Link>
      </div>

      <div role="tablist" aria-label="Ways to work together" className="mt-12 lg:mt-16">
        {coreOffers.map((item, index) => {
          const selected = item.id === offer.id;
          return (
            <div
              key={item.id}
              className="grid items-start gap-4 border-b border-foreground/10 py-4 lg:grid-cols-12 lg:gap-16"
            >
              <button
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveId(item.id)}
                onMouseEnter={() => setActiveId(item.id)}
                onFocus={() => setActiveId(item.id)}
                className={cn(
                  "flex w-full items-baseline gap-4 py-1 text-left transition-colors lg:col-span-5",
                  selected ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="font-sans text-xs tracking-[0.2em] text-gold-dark">0{index + 1}</span>
                <span className="font-serif text-2xl leading-tight md:text-[1.7rem]">{item.title}</span>
              </button>
              <div className="lg:col-span-6 lg:col-start-7" role={selected ? "tabpanel" : undefined}>
                {selected ? (
                  <div key={item.id} className="spread-panel space-y-6 pt-1">
                    <p className="font-serif text-2xl leading-snug text-gold-dark [text-shadow:0_0_1px_hsl(40_70%_42%),0_0_14px_hsl(43_92%_52%/0.95),0_0_32px_hsl(45_95%_58%/0.75)] md:text-3xl">
                      {item.summary}
                    </p>
                    <Button asChild size="lg" className="h-12 w-fit px-7 font-semibold">
                      <Link to={item.ctaHref}>{item.ctaLabel}</Link>
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
        <Link
          to="/work-with-us"
          className="mt-6 inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground sm:hidden"
        >
          All offers
          <span className="h-px w-8 bg-gold-dark" />
        </Link>
      </div>
    </Spread>
  );
}
