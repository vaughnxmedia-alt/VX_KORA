import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

type SpreadProps = {
  folio: string;
  kicker: string;
  paper?: "white" | "cream" | "navy";
  layer: number;
  children: ReactNode;
  id?: string;
};

const paperClass = {
  white: "bg-background text-foreground",
  cream: "bg-cream text-foreground",
  navy: "bg-primary text-primary-foreground",
} as const;

export function Spread({ folio, kicker, paper = "white", layer, children, id }: SpreadProps) {
  const navy = paper === "navy";

  return (
    <section
      id={id}
      style={{ "--spread-layer": layer } as CSSProperties}
      className={cn(
        "spread relative flex min-h-[calc(100svh-5rem)] flex-col px-5 py-8 sm:px-8 lg:px-14",
        paperClass[paper],
      )}
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex items-baseline justify-between gap-4 pb-3 text-[10px] uppercase tracking-[0.28em] sm:text-[11px]">
          <span className={navy ? "text-gold" : "text-gold-dark"}>{folio}</span>
          <span className={navy ? "text-primary-foreground/70" : "text-muted-foreground"}>{kicker}</span>
          <span>JahKnowsPR</span>
        </div>
        <div className={cn("spread-rule h-px w-full", navy ? "bg-primary-foreground/30" : "bg-foreground/15")} />
      </div>
      <div className="spread-rise mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center py-10 md:py-14">
        {children}
      </div>
    </section>
  );
}
