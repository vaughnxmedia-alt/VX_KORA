import type { FirmProfile } from "./types";

export const firmProfile: FirmProfile = {
  name: "JahKnowsPR",
  tagline: "Strategic communications and public relations consultancy",
  mission:
    "JahKnowsPR helps brands, leaders, personal brands, nonprofits, businesses, executives, and organizations make better communication decisions—before those decisions become public.",
  approachIntro:
    "We sell thinking, judgment, strategy, positioning, and communications expertise first. Execution may support a strategy; it does not define the firm.",
  values: [
    {
      title: "Strategy before volume",
      description:
        "Every public-facing choice sends a message. We help you decide what should be communicated and why—before you publish, pitch, or perform.",
    },
    {
      title: "Clarity over noise",
      description:
        "Attention without positioning creates activity, not authority. We prioritize narrative discipline and credible proof.",
    },
    {
      title: "Judgment under pressure",
      description:
        "Launches, media moments, and reputation issues require counsel—not generic playbooks or trend-chasing.",
    },
    {
      title: "Long-term credibility",
      description:
        "We work with leaders who think in years, not viral cycles—building trust that compounds.",
    },
  ],
  founderName: "Jah (Justice Vaughn)",
  founderBio:
    "Founder of JahKnowsPR, focused on strategic communications counsel, public relations strategy, and helping leaders control narrative with intention. The firm’s editorial work—The Brief and related analysis—reflects how we think before we execute.",
};

export const publicNavLinks = [
  { label: "Home", href: "/" },
  { label: "Work With Us", href: "/work-with-us" },
  { label: "Our Work", href: "/work" },
  { label: "Insights", href: "/insights" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

export const SESSION_CTA_LABEL = "Book a Session";
export const SESSION_CTA_PATH = "/brand-strategy-session";
