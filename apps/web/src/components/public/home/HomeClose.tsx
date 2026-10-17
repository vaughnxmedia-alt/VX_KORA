import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SESSION_CTA_LABEL, SESSION_CTA_PATH } from "@/content/firm";
import { Spread } from "./Spread";

export function HomeClose() {
  return (
    <Spread folio="07" kicker="An Invitation" paper="navy" layer={7}>
      <div className="grid items-end gap-10 lg:grid-cols-12">
        <h2 className="font-serif text-[clamp(3rem,7vw,6rem)] font-medium leading-[0.9] tracking-tight lg:col-span-8">
          Ready for strategic clarity?
        </h2>
        <div className="flex flex-col items-start gap-6 lg:col-span-4 lg:pb-2">
          <p className="max-w-sm text-lg leading-relaxed text-primary-foreground/85">
            Start with a Strategic Communications Session before your next public move.
          </p>
          <Button asChild size="lg" variant="secondary" className="h-12 px-7 font-semibold">
            <Link to={SESSION_CTA_PATH}>Book a Strategic Communications Session</Link>
          </Button>
          <p className="text-[11px] uppercase tracking-[0.2em] text-primary-foreground/60">
            {SESSION_CTA_LABEL} · JahKnowsPR
          </p>
        </div>
      </div>
    </Spread>
  );
}
