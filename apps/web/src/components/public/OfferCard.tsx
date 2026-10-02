import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CoreOffer } from "@/content/types";

type OfferCardProps = {
  offer: CoreOffer;
  variant?: "default" | "compact";
};

export function OfferCard({ offer, variant = "default" }: OfferCardProps) {
  const isExternal = offer.ctaHref.startsWith("http");

  return (
    <article className="flex flex-col h-full rounded-lg border border-border bg-card p-6 md:p-8 shadow-sm">
      <div className="space-y-3 flex-1">
        <h3 className="text-xl md:text-2xl font-serif font-semibold text-foreground">
          {offer.title}
        </h3>
        <p className="text-muted-foreground leading-relaxed">{offer.summary}</p>
        {variant === "default" ? (
          <>
            <p className="text-sm text-foreground/90 leading-relaxed">{offer.description}</p>
            <ul className="space-y-2 pt-2">
              {offer.bullets.map((item) => (
                <li key={item} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-gold-dark mt-0.5">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            {offer.secondaryNote ? (
              <p className="text-xs text-muted-foreground border-t border-border pt-4 italic">
                {offer.secondaryNote}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
      <div className="pt-6 mt-auto">
        {isExternal ? (
          <Button asChild variant="default" className="w-full sm:w-auto">
            <a href={offer.ctaHref}>{offer.ctaLabel}</a>
          </Button>
        ) : (
          <Button asChild variant="default" className="w-full sm:w-auto group">
            <Link to={offer.ctaHref}>
              {offer.ctaLabel}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        )}
      </div>
    </article>
  );
}
