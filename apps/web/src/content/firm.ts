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
    "Jocelyn Vaughn is the Founder and Principal Strategist of JahKnowsPR. She helps businesses, organizations, and personal brands communicate with clarity and intention.",
    "Before founding the firm, she served as a U.S. Army combat veteran in military communications — fiber-optic systems, satellite communications, and the infrastructure that kept people connected. When communication matters, it has to be clear, reliable, and intentional.",
    "That work now shows up as counsel: what to say, how to position, who needs to understand it, and what should happen next. She is building JahKnowsPR so growing businesses, emerging leaders, and nonprofits can get that counsel without an in-house communications department.",
  ],
};

export const aboutPage = {
  firm: {
    eyebrow: "About the Firm",
    title: "Communication Was Never Just About Being Heard.",
    paragraphs: [
      "Communication can shape decisions, build trust, and change where an organization is headed. Somewhere along the way it became synonymous with visibility. More content. More publicity. More noise.",
      "Being seen without being understood can be costly. JahKnowsPR was founded to challenge that.",
      "A message is not enough. It needs a strategy. We help clients decide what to communicate, why it matters, who needs to understand it, and what should happen next.",
    ],
  },
  philosophy: {
    eyebrow: "Our Philosophy",
    title: "A Seat at the Table, Not Just a Line in the Announcement.",
    paragraphs: [
      "Communications is often called in after the decision is made. The launch is set. The issue has escalated. Then someone asks, “How should we communicate this?”",
      "That question belongs earlier. Strategy before execution. Understanding before exposure. Credibility over attention.",
      "Our role isn’t to help clients say more. It’s to help them decide — including when the most strategic choice is not to speak publicly at all.",
    ],
  },
  building: {
    eyebrow: "What We’re Building",
    paragraphs: [
      "We work with in-house teams and with leaders who don’t have one yet. Growing businesses deserve direction. Emerging leaders deserve preparation. Established organizations deserve the same clarity.",
      "Whether the work is one decision or an ongoing partnership, the purpose is the same: communicate with intention, and build something worth believing in.",
      "Communication doesn’t begin when the world starts listening. It begins long before anyone hears a word.",
    ],
    closing: "JahKnowsPR — Strategic thinking. Intentional communication. Lasting credibility.",
  },
} as const;

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
