import { useEffect } from "react";
import { TrackedLinkButton } from "@/components/links/TrackedLinkButton";

const LINK_ITEMS = [
  {
    linkId: "strategy-session",
    label: "Book a Strategic Communications Session",
    href: "/brand-strategy-session",
    description: "Focused counsel before an important communications decision.",
  },
  {
    linkId: "work-with-us",
    label: "Work With Us",
    href: "/work-with-us",
    description: "Session, project, and ongoing counsel engagements.",
  },
  {
    linkId: "the-brief",
    label: "The Brief",
    href: "/insights/the-brief",
    description: "Strategic communications and PR analysis.",
  },
  {
    linkId: "free-brand-audit",
    label: "Free Brand Audit (legacy)",
    href: "/free-audit",
    description: "Previous free diagnosis funnel—still available.",
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
    href: "/contact",
    description: "Project, counsel, and general inquiries.",
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
    <div className="min-h-[calc(100vh-4rem)] bg-primary px-4 py-10 sm:py-14">
      <div className="mx-auto flex w-full max-w-md flex-col items-center">
        <nav className="flex w-full flex-col gap-4 py-2 sm:gap-5" aria-label="JahKnowsPR links">
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

        <p className="mt-10 text-center text-xs text-primary-foreground/70">
          JahKnowsPR · Brand intelligence &amp; public relations
        </p>
      </div>
    </div>
  );
}
