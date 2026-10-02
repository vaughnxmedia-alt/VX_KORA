import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SESSION_CTA_LABEL, SESSION_CTA_PATH } from "@/content/firm";

type CTASectionProps = {
  title?: string;
  description?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
};

export function CTASection({
  title = "Ready for strategic clarity?",
  description = "Start with a Strategic Communications Session before your next public move.",
  primaryLabel = "Book a Strategic Communications Session",
  primaryHref = SESSION_CTA_PATH,
  secondaryLabel,
  secondaryHref,
}: CTASectionProps) {
  return (
    <section className="border-y border-border bg-primary text-primary-foreground py-16 md:py-20 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <h2 className="text-3xl md:text-4xl font-serif font-bold tracking-tight">{title}</h2>
        <p className="text-lg text-primary-foreground/85 leading-relaxed">{description}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button asChild size="lg" variant="secondary" className="font-semibold">
            <Link to={primaryHref}>{primaryLabel}</Link>
          </Button>
          {secondaryLabel && secondaryHref ? (
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link to={secondaryHref}>{secondaryLabel}</Link>
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-primary-foreground/60 pt-2">{SESSION_CTA_LABEL} · JahKnowsPR</p>
      </div>
    </section>
  );
}
