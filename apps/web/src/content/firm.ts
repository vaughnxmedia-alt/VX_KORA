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
  founderName: "Jocelyn Vaughn",
  founderTitle: "Founder & Principal Strategist",
  founderPhoto: "/authors/jocelyn-vaughn.jpg",
  founderBio: [
    "Jocelyn Vaughn is the Founder and Principal Strategist of JahKnowsPR, a strategic communications firm helping businesses, organizations, and personal brands communicate with greater clarity, intention, and impact.",
    "Before founding JahKnowsPR, Jocelyn served as a U.S. Army combat veteran, working in military communications with fiber-optic systems, satellite communications, and communications infrastructure. Her military experience gave her an early understanding of something that continues to shape her work today: when communication matters, the systems behind it have to be clear, reliable, and intentional.",
    "She carried that foundation into public relations and strategic communications, where her work now focuses on helping clients determine what they need to say, how they should position themselves, who they need to reach, and how communication can support their larger goals.",
    "Through strategic communications counsel, PR and media strategy, positioning and messaging, and reputation preparedness, Jocelyn helps turn ideas, challenges, and opportunities into clear communication strategies and actionable next steps.",
    "As a veteran and entrepreneur, Jocelyn brings a disciplined, people-centered perspective to her work. She is particularly passionate about making strategic communications accessible to growing businesses, emerging leaders, nonprofits, and organizations that may not have an internal communications department but still need experienced strategic guidance.",
    "Under her leadership, JahKnowsPR is being built as more than a traditional PR firm. It is a strategic communications partner designed to help clients communicate intentionally, strengthen their positioning, navigate opportunities and challenges, and build reputations that support where they are going next.",
  ],
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
