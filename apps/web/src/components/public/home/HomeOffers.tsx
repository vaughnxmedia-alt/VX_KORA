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

      <div className="mt-12 grid gap-10 lg:mt-16 lg:grid-cols-12 lg:gap-16">
        <div role="tablist" aria-label="Ways to work together" className="lg:col-span-5">
          {coreOffers.map((item, index) => {
            const selected = item.id === offer.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveId(item.id)}
                onMouseEnter={() => setActiveId(item.id)}
                onFocus={() => setActiveId(item.id)}
                className={cn(
                  "flex w-full items-baseline gap-4 border-b border-foreground/10 py-4 text-left transition-colors",
                  selected ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="font-sans text-xs tracking-[0.2em] text-gold-dark">0{index + 1}</span>
                <span className="font-serif text-2xl leading-tight md:text-[1.7rem]">{item.title}</span>
              </button>
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

        <div role="tabpanel" className="flex flex-col justify-end gap-8 lg:col-span-6 lg:col-start-7">
          <div key={offer.id} className="spread-panel space-y-6">
            <p className="font-serif text-2xl leading-snug md:text-3xl">{offer.summary}</p>
            <Button asChild size="lg" className="h-12 w-fit px-7 font-semibold">
              <Link to={offer.ctaHref}>{offer.ctaLabel}</Link>
            </Button>
          </div>
        </div>
      </div>
    </Spread>
  );
}
