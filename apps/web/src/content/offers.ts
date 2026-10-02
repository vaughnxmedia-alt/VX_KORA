import type { CoreOffer } from "./types";

export const SESSION_LANDING_PATH = "/brand-strategy-session";
export const BOOKING_PATH = "/strategy-session";

export const coreOffers: CoreOffer[] = [
  {
    id: "session",
    title: "Strategic Communications Session",
    summary:
      "Focused advisory for leaders who need clarity before an important communications decision.",
    description:
      "A structured session to evaluate positioning, messaging, media opportunities, launches, announcements, campaign direction, reputation issues, or broader communications strategy—before anything goes public.",
    bullets: [
      "Brand positioning and narrative clarity",
      "Messaging for launches, events, or announcements",
      "Media opportunity evaluation",
      "Campaign or reputation decision support",
      "A realistic next-step recommendation",
    ],
    ctaLabel: "Book a Strategic Communications Session",
    ctaHref: SESSION_LANDING_PATH,
  },
  {
    id: "project",
    title: "Strategic Communications + PR Project",
    summary:
      "Defined engagement when strategy and execution must align around a specific communications objective.",
    description:
      "For organizations and individuals with a clear outcome in mind: communications strategy, messaging development, media strategy, PR campaigns, launch communications, event communications, reputation strategy, or campaign activations. Creative production may support the strategy when appropriate—it does not lead it.",
    bullets: [
      "Communications and messaging strategy",
      "Media relations and pitch strategy",
      "Launch, event, or campaign communications",
      "Reputation and narrative recovery planning",
      "Execution oversight aligned to strategy",
    ],
    ctaLabel: "Discuss a Project",
    ctaHref: "/contact?intent=project",
    secondaryNote:
      "Supporting capabilities such as content, creative, or production are scoped within the project when they serve the strategy.",
  },
  {
    id: "counsel",
    title: "Ongoing Strategic Communications Counsel",
    summary:
      "An advisory relationship for leaders who need consistent communications judgment.",
    description:
      "Regular counsel for executives, founders, and organizations navigating visibility, reputation, and high-stakes communication over time—not a volume-based content retainer.",
    bullets: [
      "Standing strategic counsel and advisory meetings",
      "Reputation guidance and opportunity evaluation",
      "Messaging review before public moments",
      "Campaign oversight and communications planning",
      "Priority access for emerging issues",
    ],
    ctaLabel: "Request Ongoing Counsel",
    ctaHref: "/contact?intent=counsel",
  },
];

export function getOfferById(id: CoreOffer["id"]): CoreOffer | undefined {
  return coreOffers.find((o) => o.id === id);
}
