import { ExternalLink } from "lucide-react";
import type { MediaPlacement } from "@/content/types";
import { Link } from "react-router-dom";

type MediaPlacementCardProps = {
  placement: MediaPlacement;
};

export function MediaPlacementCard({ placement }: MediaPlacementCardProps) {
  const isInternal = placement.articleUrl.startsWith("/");

  return (
    <article className="rounded-lg border border-border bg-cream/40 p-6 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-primary">{placement.client}</p>
        <p className="text-xs text-muted-foreground">{placement.publicationDate}</p>
      </div>
      <p className="text-xs uppercase tracking-wide text-gold-dark">{placement.outlet}</p>
      <h3 className="text-lg font-serif font-semibold leading-snug">{placement.headline}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{placement.whyItMattered}</p>
      {isInternal ? (
        <Link
          to={placement.articleUrl}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          View placement
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      ) : (
        <a
          href={placement.articleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          View article
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </article>
  );
}
