import { useState } from "react";
import { positioningPillars } from "@/content/process";
import { cn } from "@/lib/utils";
import { Spread } from "./Spread";

export function HomePositioning() {
  const [active, setActive] = useState(0);
  const pillar = positioningPillars[active];

  return (
    <Spread folio="02" kicker="Positioning" paper="cream" layer={2} id="positioning">
      <div className="grid items-end gap-12 lg:grid-cols-12">
        <h2 className="font-serif text-[clamp(2.7rem,5.6vw,4.8rem)] font-medium leading-[0.92] tracking-tight text-foreground lg:col-span-7">
          We don’t start with content.
          <span className="mt-3 block text-gold-dark">We start with strategy.</span>
        </h2>
        <p className="max-w-sm font-serif text-xl leading-snug text-foreground lg:col-span-4 lg:col-start-9 lg:pb-2">
          Every public-facing decision sends a message.
        </p>
      </div>

      <div className="mt-12 grid gap-8 border-t border-foreground/15 pt-8 lg:mt-16 lg:grid-cols-12 lg:gap-12">
        <div role="tablist" aria-label="What the strategy decides" className="flex flex-col lg:col-span-5">
          {positioningPillars.map((item, index) => {
            const selected = index === active;
            return (
              <button
                key={item.title}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActive(index)}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                className={cn(
                  "border-b border-foreground/10 py-3 text-left font-serif text-3xl transition-colors md:text-4xl",
                  selected ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="mr-4 font-sans text-xs tracking-[0.2em] text-gold-dark">0{index + 1}</span>
                {item.title}
              </button>
            );
          })}
        </div>
        <div role="tabpanel" className="flex items-end lg:col-span-6 lg:col-start-7">
          <p key={pillar.title} className="spread-panel max-w-md font-serif text-2xl leading-snug text-foreground md:text-3xl">
            {pillar.description}
          </p>
        </div>
      </div>
    </Spread>
  );
}
