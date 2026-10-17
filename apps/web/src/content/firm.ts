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

export const aboutPage = {
  firm: {
    eyebrow: "About the Firm",
    title: "Communication Was Never Just About Being Heard.",
    paragraphs: [
      "Before JahKnowsPR became a firm, there was a belief: communication has the power to shape decisions, influence perception, build trust, and change the direction of an organization.",
      "But somewhere along the way, communication became synonymous with visibility. More content. More publicity. More attention. More noise.",
      "And while being seen has its place, being seen without being understood can be costly.",
      "JahKnowsPR was founded to challenge that approach.",
      "Founded by U.S. Army combat veteran Jocelyn Vaughn, JahKnowsPR brings a different perspective to the communications industry.",
      "Jocelyn’s foundation in communications began in the military, where she worked with fiber-optic systems, satellite communications, and the infrastructure responsible for keeping people connected. In that environment, communication wasn’t simply about delivering information. It required precision, preparation, reliability, and an understanding of what could happen when communication failed.",
      "That experience helped shape a philosophy that would later become central to JahKnowsPR: effective communication requires more than a message. It requires a strategy behind it.",
      "Today, JahKnowsPR operates as a strategic communications firm serving businesses, organizations, nonprofits, executives, and personal brands navigating growth, change, opportunity, and public perception.",
      "We work with clients to think beyond what they want to announce and consider what they need to communicate, why it matters, who needs to understand it, and what should happen next.",
      "Because the right message delivered without the right strategy can still miss its purpose.",
    ],
  },
  philosophy: {
    eyebrow: "Our Philosophy",
    title: "We Believe Communication Should Have a Seat at the Table, Not Just a Place in the Announcement.",
    paragraphs: [
      "Too often, communications professionals are brought into the conversation after the important decisions have already been made.",
      "The launch is planned. The partnership is finalized. The issue has escalated. The public is asking questions.",
      "And only then does someone ask, “How should we communicate this?”",
      "We believe that question deserves to be asked much earlier.",
      "At JahKnowsPR, strategy comes before execution. We prioritize understanding before exposure, positioning before publicity, and long-term credibility over short-term attention.",
      "Our role isn’t simply to help clients say more.",
      "It’s to help them make better communication decisions.",
      "That may mean refining a message, challenging an assumption, identifying a reputational risk, preparing for an opportunity, or recognizing when the most strategic decision is not to communicate publicly at all.",
      "We don’t measure our value by how much noise we create.",
      "We measure it by the quality of the thinking, judgment, and direction we bring to the table.",
    ],
  },
  building: {
    eyebrow: "What We’re Building",
    paragraphs: [
      "JahKnowsPR is being built on the belief that access to thoughtful communications counsel shouldn’t be reserved for organizations with large budgets or in-house communications departments.",
      "Growing businesses deserve direction. Emerging leaders deserve preparation. Established organizations deserve counsel that challenges them to think beyond their next announcement.",
      "Whether we’re guiding a single strategic decision, developing a communications project, or serving as an ongoing strategic partner, our purpose remains the same:",
      "To help our clients communicate with intention, make informed decisions, and build something worth believing in.",
      "Because communication doesn’t begin when the world starts listening.",
      "It begins with the decisions made long before anyone hears a word.",
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
