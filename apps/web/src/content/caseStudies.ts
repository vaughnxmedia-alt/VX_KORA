import type { CaseStudy } from "./types";

/**
 * Phase One: curated case narratives. Full stories may live on The Brief (`briefPostSlug`).
 * JahKnowsPR HQ can replace this module with API/Supabase data using the same shape.
 */
export const caseStudies: CaseStudy[] = [
  {
    id: "lifeline-earth-month",
    slug: "lifeline-earth-month-lamar",
    title: "Positioning a local plant-based brand for institutional visibility",
    client: "Lifeline Healthy Eats",
    category: "events",
    excerpt:
      "Earth Month partnership with Lamar University—300+ served—used as a proof point for community positioning, not just catering volume.",
    situation:
      "A Beaumont-based plant-based catering business had strong product quality but limited institutional visibility and narrative clarity in a market that still equated “healthy food” with niche appeal.",
    challenge:
      "Convert a single campus opportunity into a credible public story: why the partnership mattered, who it reached, and what it signaled about the brand’s role in the community.",
    thinking:
      "The communication goal was not “we catered an event.” It was to establish Lifeline as a movement-aligned partner for schools and organizations planning wellness and sustainability programming.",
    strategy:
      "Frame the Lamar University Earth Month activation as evidence of institutional trust, community health impact, and scalable partnership potential—anchored in specifics (300+ served, campus audience, sustainability alignment).",
    execution:
      "Strategic narrative development and publication through The Brief as a case-style analysis, connecting local media angles and future partnership outreach.",
    result:
      "A documented proof point for campus and institutional conversations, with a public record that supports follow-on partnership and media discussions.",
    briefPostSlug:
      "plant-based-catering-beaumont-texas-lifeline-healthy-eats-lamar-university",
    featured: true,
  },
  {
    id: "terry-bennett-hickey",
    slug: "terry-bennett-hickey-media-journey",
    title: "Clarifying a personal brand pivot into media and storytelling",
    client: "Terry Bennett-Hickey",
    category: "positioning",
    excerpt:
      "A career transition story positioned around calling and credibility—not generic “personal branding.”",
    situation:
      "A professional moving from nursing into media and storytelling needed public language that reflected purpose and authority, not a shallow influencer repositioning.",
    challenge:
      "Make the pivot legible to media partners and audiences without reducing a multi-decade career to a trend-driven “rebrand.”",
    thinking:
      "Personal brand work here is reputation architecture: what the audience should believe about her judgment, experience, and point of view before they see the next post or segment.",
    strategy:
      "Lead with the through-line (service, trust, communication) and publish long-form analysis that treats the journey as a communications case, not a highlight reel.",
    execution:
      "Editorial case narrative on The Brief connecting her story to broader lessons on authority, media readiness, and intentional visibility.",
    result:
      "A referenceable narrative asset for introductions, media conversations, and future platform development.",
    briefPostSlug: "terry-bennett-hickey-media-journey",
    featured: true,
  },
  {
    id: "409-media-mixer",
    slug: "409-media-mixer-attention-vs-clients",
    title: "When attention does not convert to trust",
    client: "Regional brand ecosystem (409 Media Mixer)",
    category: "reputation",
    excerpt:
      "Analysis of visibility without positioning—why engagement metrics failed to produce client confidence.",
    situation:
      "Local brands and creators were generating activity and event attendance but struggling to translate visibility into trusted buyer relationships.",
    challenge:
      "Diagnose the gap between attention and authority without defaulting to “post more content” advice.",
    thinking:
      "If the public cannot articulate what you stand for and why it matters, reach becomes noise. Strategy must precede volume.",
    strategy:
      "Use the mixer and surrounding market behavior as a teaching case: define what was missing in messaging, proof, and follow-through.",
    execution:
      "Published strategic analysis on The Brief for founders evaluating event-led growth vs. communications discipline.",
    result:
      "A thought-leadership anchor that reframes JahKnowsPR’s counsel toward strategy-first communications.",
    briefPostSlug: "likes-dont-pay-bills-409-media-mixer",
    featured: false,
  },
];

export function getFeaturedCaseStudies(limit = 3): CaseStudy[] {
  return caseStudies.filter((c) => c.featured).slice(0, limit);
}

export function getCaseStudiesByCategory(category: CaseStudy["category"]): CaseStudy[] {
  return caseStudies.filter((c) => c.category === category);
}

export function getCaseStudyBySlug(slug: string): CaseStudy | undefined {
  return caseStudies.find((c) => c.slug === slug);
}
