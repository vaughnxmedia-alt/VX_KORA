/** Shared content shapes for public marketing (HQ-ready). */

export type CoreOfferId = "session" | "project" | "counsel";

export type WorkCategory =
  | "strategic-counsel"
  | "media-relations"
  | "campaigns"
  | "positioning"
  | "events"
  | "reputation"
  | "community-nonprofit";

export type CoreOffer = {
  id: CoreOfferId;
  title: string;
  summary: string;
  description: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
  secondaryNote?: string;
};

export type CaseStudy = {
  id: string;
  slug: string;
  title: string;
  /** Short line for the homepage portfolio. The full title stays on the case study itself. */
  homeHeadline?: string;
  client: string;
  category: WorkCategory;
  excerpt: string;
  situation: string;
  challenge: string;
  thinking: string;
  strategy: string;
  execution: string;
  result: string;
  /** Link to full Brief post when applicable */
  briefPostSlug?: string;
  featured?: boolean;
};

export type MediaPlacement = {
  id: string;
  client: string;
  outlet: string;
  headline: string;
  publicationDate: string;
  imageUrl?: string;
  articleUrl: string;
  whyItMattered: string;
};

export type InsightSeriesId = "the-brief" | "spam-report" | "pr-court";

export type InsightSeries = {
  id: InsightSeriesId;
  name: string;
  tagline: string;
  description: string;
  href: string;
  /** Hidden series stay reachable by URL and are omitted from public listings. */
  listed?: boolean;
};

export type ProcessStep = {
  order: number;
  title: string;
  description: string;
};

export type PositioningPillar = {
  title: string;
  description: string;
};

export type FirmProfile = {
  name: string;
  tagline: string;
  mission: string;
  approachIntro: string;
  values: { title: string; description: string }[];
  founderName: string;
  founderTitle: string;
  /** Public path. Add the portrait at apps/web/public/authors/jocelyn-vaughn.jpg */
  founderPhoto: string;
  founderBio: string[];
};

export const WORK_CATEGORY_LABELS: Record<WorkCategory, string> = {
  "strategic-counsel": "Strategic Counsel",
  "media-relations": "Media Relations",
  campaigns: "Campaigns",
  positioning: "Positioning",
  events: "Events",
  reputation: "Reputation",
  "community-nonprofit": "Community / Nonprofit",
};
