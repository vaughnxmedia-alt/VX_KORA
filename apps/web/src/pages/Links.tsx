import { useEffect } from "react";
import { Logo } from "@/components/Logo";
import { TrackedLinkButton } from "@/components/links/TrackedLinkButton";

const TAGLINE =
  "Brand intelligence, public relations, and strategy for people building with purpose.";

const LINK_ITEMS = [
  {
    linkId: "free-brand-audit",
    label: "Free Brand Audit",
    href: "/free-audit",
    description: "Get a structured diagnosis of your brand presence.",
  },
  {
    linkId: "strategy-session",
    label: "Book a Strategy Session",
    href: "/strategy-session",
    description: "Work through positioning, offers, and next moves with JahKnowsPR.",
  },
  {
    linkId: "the-brief",
    label: "Read The Brief",
    href: "/the-brief",
    description: "Explore strategy, PR, and brand-building insights.",
  },
  {
    linkId: "before-you-build-the-brand",
    label: "Download: Before You Build the Brand",
    href: "/the-brief/before-you-build-the-brand-starter-guide",
    description: "Starter guide for founders building their foundation first.",
  },
  {
    linkId: "contact",
    label: "Contact",
    href: "mailto:welcome@jahknowspr.com",
    description: "welcome@jahknowspr.com",
  },
] as const;

export default function Links() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "JahKnowsPR Links";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-primary/5 via-background to-background px-4 py-10 sm:py-14">
      <div className="mx-auto flex w-full max-w-md flex-col items-center">
        <header className="flex flex-col items-center text-center">
          <Logo className="mb-5" />
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-base">{TAGLINE}</p>
        </header>

        <nav
          className="mt-8 flex w-full flex-col gap-3 sm:mt-10 sm:gap-3.5"
          aria-label="JahKnowsPR links"
        >
          {LINK_ITEMS.map((item) => (
            <TrackedLinkButton
              key={item.linkId}
              linkId={item.linkId}
              label={item.label}
              href={item.href}
              description={"description" in item ? item.description : undefined}
            />
          ))}
        </nav>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          JahKnowsPR · Brand intelligence &amp; public relations
        </p>
      </div>
    </div>
  );
}
