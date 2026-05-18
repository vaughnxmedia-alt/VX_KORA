import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { trackLinkClick } from "@/lib/trackLinkClick";

export type TrackedLinkButtonProps = {
  linkId: string;
  label: string;
  href: string;
  description?: string;
  sourcePage?: string;
  className?: string;
};

function isInternalPath(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

export function TrackedLinkButton({
  linkId,
  label,
  href,
  description,
  sourcePage = "/links",
  className,
}: TrackedLinkButtonProps) {
  const handleClick = () => {
    trackLinkClick({ linkId, label, href, sourcePage });
  };

  const content = (
    <span className="flex w-full flex-col items-center text-center">
      <span className="text-base font-semibold leading-snug">{label}</span>
      {description ? (
        <span className="mt-1 text-sm font-normal leading-snug text-primary/70">{description}</span>
      ) : null}
    </span>
  );

  const buttonClass = cn(
    "flex w-full items-center justify-center rounded-2xl border border-gold/40 bg-card px-5 py-4",
    "text-primary shadow-sm transition-colors",
    "hover:border-gold hover:bg-gold/10 active:scale-[0.99]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2",
    className,
  );

  if (isInternalPath(href)) {
    return (
      <Link to={href} onClick={handleClick} className={buttonClass}>
        {content}
      </Link>
    );
  }

  return (
    <a href={href} onClick={handleClick} className={buttonClass}>
      {content}
    </a>
  );
}
