export type LocationFaq = {
  question: string;
  answer: string;
};

export type LocationPage = {
  slug: string;
  cityName: string;
  region: string;
  seoTitle: string;
  seoDescription: string;
  heroEyebrow: string;
  heroHeadline: string;
  heroSubheadline: string;
  primaryCTA: string;
  secondaryCTA: string;
  audienceTypes: string[];
  localPainPoints: string[];
  serviceFocus: string[];
  industries: string[];
  positioningAngle: string;
  localContext: string;
  proofPoints: string[];
  relatedBlogTopics: string[];
  faqs: LocationFaq[];
};

const commonAudienceTypes = [
  "Entrepreneurs",
  "Creators",
  "Service providers",
  "Small business owners",
  "Event brands",
  "Wellness brands",
  "Consultants",
  "Community-driven brands",
  "Local professionals",
];

const commonPainPoints = [
  "People know you, but they cannot clearly explain what you do.",
  "You are posting consistently, but not converting attention into action.",
  "Your brand looks active, but not positioned.",
  "Your offer is good, but the message is too broad.",
  "You are visible locally, but not building authority.",
];

const commonServices = [
  "PR strategy",
  "Brand positioning",
  "Brand messaging",
  "Media strategy",
  "Content direction",
  "Event PR",
  "Authority strategy",
  "Campaign strategy",
  "Crisis communication support",
];

const commonBlogTopics = [
  "PR vs Marketing: What Business Owners Need to Understand",
  "Why Your Content Gets Attention But Not Clients",
  "How to Build Authority Before Running Ads",
  "What a Brand Strategy Session Actually Fixes",
  "Why Polished Visuals Cannot Save Weak Messaging",
];

function faqs(cityName: string): LocationFaq[] {
  return [
    {
      question: `Does JahKnowsPR work with businesses in ${cityName}?`,
      answer: `Yes. JahKnowsPR works with ${cityName} entrepreneurs, creators, service providers, and growing brands through strategy sessions, messaging support, PR direction, and campaign planning.`,
    },
    {
      question: "Do I need PR or marketing first?",
      answer:
        "Most brands need message clarity and positioning before heavy promotion. PR, marketing, content, and ads work better when people can understand what you do, why it matters, and what action to take.",
    },
    {
      question: "Can I book a strategy session before committing to a full campaign?",
      answer:
        "Yes. The Authority Strategy Session is designed as the first paid step before a deeper campaign, production plan, or retainer.",
    },
    {
      question: "Do you help with content strategy?",
      answer:
        "Yes. JahKnowsPR helps shape content direction, campaign themes, authority angles, calls to action, and how content should support offers and visibility goals.",
    },
    {
      question: "Do you help with local media or event visibility?",
      answer:
        "Yes. We can help clarify the story, audience, media angle, local relevance, and campaign strategy around launches, events, community work, and public-facing moments.",
    },
    {
      question: "Can you work with my business remotely?",
      answer:
        "Yes. Strategy sessions and planning can happen remotely. In-person support depends on the project, city, schedule, and production needs.",
    },
  ];
}

const locationPageRecords: LocationPage[] = [
  {
    slug: "texas",
    cityName: "Texas",
    region: "Statewide",
    seoTitle: "Texas PR & Brand Strategy Firm | JahKnowsPR",
    seoDescription:
      "JahKnowsPR is a Texas-based PR and brand strategy firm helping entrepreneurs, creators, small businesses, and service providers build authority.",
    heroEyebrow: "Texas PR & Brand Strategy",
    heroHeadline: "PR and brand strategy for Texas businesses ready to build authority.",
    heroSubheadline:
      "JahKnowsPR helps Texas entrepreneurs, creators, small businesses, and service providers turn visibility into clear positioning, stronger messaging, and authority-driven growth.",
    primaryCTA: "Book an Authority Strategy Session",
    secondaryCTA: "Start With a Free Brand Diagnosis",
    audienceTypes: commonAudienceTypes,
    localPainPoints: commonPainPoints,
    serviceFocus: commonServices,
    industries: ["Professional services", "Creative brands", "Wellness", "Events", "Local businesses", "Consultants"],
    positioningAngle:
      "Across Texas, attention is not enough. Brands need a message that travels from local recognition to statewide authority, with a clear offer path and a point of view people can repeat.",
    localContext:
      "Texas markets move fast and vary by region. A brand in Houston may need competitive differentiation, while a Beaumont business may need to translate local trust into broader authority. JahKnowsPR builds the strategic language and campaign direction that helps visibility become credibility.",
    proofPoints: ["Texas-based strategy", "Authority-first positioning", "Content and PR direction", "Funnel-aware messaging"],
    relatedBlogTopics: commonBlogTopics,
    faqs: faqs("Texas"),
  },
  {
    slug: "beaumont-tx",
    cityName: "Beaumont",
    region: "Southeast Texas",
    seoTitle: "Beaumont TX PR & Brand Strategy | JahKnowsPR",
    seoDescription:
      "PR and brand strategy for Beaumont entrepreneurs, community brands, event brands, service providers, and small businesses ready to build authority.",
    heroEyebrow: "Texas PR & Brand Strategy",
    heroHeadline: "Beaumont PR and brand strategy for brands ready to move beyond local visibility.",
    heroSubheadline:
      "For Southeast Texas businesses, community brands, event leaders, creators, and service providers who need clearer messaging and regional authority.",
    primaryCTA: "Book an Authority Strategy Session",
    secondaryCTA: "Start With a Free Brand Diagnosis",
    audienceTypes: commonAudienceTypes,
    localPainPoints: commonPainPoints,
    serviceFocus: commonServices,
    industries: ["Service providers", "Community brands", "Events", "Creators", "Local professionals", "Small businesses"],
    positioningAngle:
      "Beaumont brands often have trust, relationships, and community recognition already. The opportunity is turning that word-of-mouth visibility into a message, offer, and authority position that can travel across Southeast Texas.",
    localContext:
      "In Beaumont, people may know your name before they understand your offer. That creates a strategy gap. JahKnowsPR helps local businesses clarify what they do, explain why it matters, and build public-facing communication that supports events, services, content, and campaigns.",
    proofPoints: ["Southeast Texas market understanding", "Local-to-regional positioning", "Event and community visibility strategy", "Message clarity for service brands"],
    relatedBlogTopics: commonBlogTopics,
    faqs: faqs("Beaumont"),
  },
  {
    slug: "houston-tx",
    cityName: "Houston",
    region: "Greater Houston",
    seoTitle: "Houston PR & Brand Strategy for Entrepreneurs | JahKnowsPR",
    seoDescription:
      "Houston PR and brand strategy for entrepreneurs, founders, wellness brands, event brands, consultants, and service businesses in a competitive market.",
    heroEyebrow: "Texas PR & Brand Strategy",
    heroHeadline: "Houston PR and brand strategy for brands competing in a crowded market.",
    heroSubheadline:
      "JahKnowsPR helps Houston entrepreneurs, founders, event brands, wellness brands, creatives, and consultants sharpen their authority before spending more on visibility.",
    primaryCTA: "Book an Authority Strategy Session",
    secondaryCTA: "Start With a Free Brand Diagnosis",
    audienceTypes: commonAudienceTypes,
    localPainPoints: commonPainPoints,
    serviceFocus: commonServices,
    industries: ["Founders", "Wellness", "Events", "Creative professionals", "Consultants", "Service businesses"],
    positioningAngle:
      "Houston is full of active brands. The challenge is not showing up. It is becoming specific enough to be remembered, trusted, and chosen by the right audience.",
    localContext:
      "In a city with constant events, services, creators, and business launches, generic messaging disappears quickly. Houston brands need sharper positioning, clearer offers, and campaign language that separates them from the noise without sounding forced.",
    proofPoints: ["Competitive positioning", "Authority language for crowded markets", "Offer and CTA clarity", "Event and campaign strategy"],
    relatedBlogTopics: commonBlogTopics,
    faqs: faqs("Houston"),
  },
  {
    slug: "dallas-tx",
    cityName: "Dallas",
    region: "North Texas",
    seoTitle: "Dallas PR & Brand Strategy | JahKnowsPR",
    seoDescription:
      "Dallas PR and brand strategy for professional service providers, lifestyle brands, consultants, entrepreneurs, and growing businesses.",
    heroEyebrow: "Texas PR & Brand Strategy",
    heroHeadline: "Dallas brand strategy for businesses that need sharper authority positioning.",
    heroSubheadline:
      "For Dallas service providers, lifestyle brands, consultants, entrepreneurs, and growing companies that need clearer messaging and a stronger public presence.",
    primaryCTA: "Book an Authority Strategy Session",
    secondaryCTA: "Start With a Free Brand Diagnosis",
    audienceTypes: commonAudienceTypes,
    localPainPoints: commonPainPoints,
    serviceFocus: commonServices,
    industries: ["Professional services", "Lifestyle brands", "Consultants", "Small businesses", "Personal brands"],
    positioningAngle:
      "Dallas rewards polish, but polish without positioning still leaves people unsure why they should choose you. Authority has to be built through message discipline, proof, and strategic visibility.",
    localContext:
      "Dallas brands often have strong visuals and ambition, but their public-facing message may still feel broad. JahKnowsPR helps refine the language, content direction, and PR angle so the brand looks credible and communicates with precision.",
    proofPoints: ["Professional authority positioning", "Premium message clarity", "Lifestyle and service brand strategy", "Campaign-ready content direction"],
    relatedBlogTopics: commonBlogTopics,
    faqs: faqs("Dallas"),
  },
  {
    slug: "austin-tx",
    cityName: "Austin",
    region: "Central Texas",
    seoTitle: "Austin PR & Brand Strategy for Creators & Startups | JahKnowsPR",
    seoDescription:
      "Austin PR and brand strategy for creators, startups, tech-adjacent brands, wellness brands, thought leaders, and modern service businesses.",
    heroEyebrow: "Texas PR & Brand Strategy",
    heroHeadline: "Austin PR and authority strategy for modern brands with something to say.",
    heroSubheadline:
      "JahKnowsPR helps Austin creators, founders, wellness brands, thought leaders, and service businesses turn ideas, content, and visibility into clearer authority.",
    primaryCTA: "Book an Authority Strategy Session",
    secondaryCTA: "Start With a Free Brand Diagnosis",
    audienceTypes: commonAudienceTypes,
    localPainPoints: commonPainPoints,
    serviceFocus: commonServices,
    industries: ["Creators", "Startups", "Tech-adjacent brands", "Wellness", "Thought leaders", "Modern services"],
    positioningAngle:
      "Austin brands often have ideas, community, and visibility before they have a message architecture. The right strategy turns that energy into a sharper public point of view.",
    localContext:
      "Austin audiences are used to new concepts, creators, and startups. That makes clarity essential. JahKnowsPR helps modern brands explain what they are building, why it matters, and how their audience should move from interest to action.",
    proofPoints: ["Thought leadership strategy", "Creator and founder positioning", "Content-to-offer direction", "Modern service brand messaging"],
    relatedBlogTopics: commonBlogTopics,
    faqs: faqs("Austin"),
  },
  {
    slug: "san-antonio-tx",
    cityName: "San Antonio",
    region: "South Central Texas",
    seoTitle: "San Antonio PR & Brand Strategy | JahKnowsPR",
    seoDescription:
      "San Antonio PR and brand strategy for community-centered brands, family-owned businesses, local professionals, and service providers.",
    heroEyebrow: "Texas PR & Brand Strategy",
    heroHeadline: "San Antonio PR and brand strategy for community-centered businesses.",
    heroSubheadline:
      "For San Antonio small businesses, local professionals, family-owned brands, and service providers that need clearer public-facing messaging.",
    primaryCTA: "Book an Authority Strategy Session",
    secondaryCTA: "Start With a Free Brand Diagnosis",
    audienceTypes: commonAudienceTypes,
    localPainPoints: commonPainPoints,
    serviceFocus: commonServices,
    industries: ["Family-owned businesses", "Local professionals", "Service providers", "Community brands", "Events"],
    positioningAngle:
      "San Antonio brands often grow through trust and community connection. The next step is turning that trust into language, content, and authority that can support growth without losing the local heartbeat.",
    localContext:
      "For community-centered businesses, the message has to feel real and still be clear enough to sell. JahKnowsPR helps San Antonio brands refine their positioning, public story, service language, and visibility strategy.",
    proofPoints: ["Community-centered messaging", "Local professional positioning", "Trust-based brand strategy", "Event and public story support"],
    relatedBlogTopics: commonBlogTopics,
    faqs: faqs("San Antonio"),
  },
  {
    slug: "port-arthur-tx",
    cityName: "Port Arthur",
    region: "Southeast Texas",
    seoTitle: "Port Arthur TX PR & Brand Strategy | JahKnowsPR",
    seoDescription:
      "Port Arthur PR and brand strategy for local businesses, community leaders, creators, and service brands ready to grow beyond word-of-mouth.",
    heroEyebrow: "Texas PR & Brand Strategy",
    heroHeadline: "Port Arthur brand strategy for businesses ready to grow beyond word-of-mouth.",
    heroSubheadline:
      "JahKnowsPR helps Port Arthur local businesses, creators, service brands, and community leaders clarify their message and build visibility that leads somewhere.",
    primaryCTA: "Book an Authority Strategy Session",
    secondaryCTA: "Start With a Free Brand Diagnosis",
    audienceTypes: commonAudienceTypes,
    localPainPoints: commonPainPoints,
    serviceFocus: commonServices,
    industries: ["Local businesses", "Community leaders", "Creators", "Service brands", "Events"],
    positioningAngle:
      "Port Arthur brands can have deep community connection but still lack a clear public message. Strategy helps turn reputation into repeatable authority.",
    localContext:
      "Word-of-mouth is powerful, but it is hard to scale if people cannot explain the offer clearly. JahKnowsPR helps Port Arthur brands build messaging, content direction, and PR angles that support stronger visibility and action.",
    proofPoints: ["Word-of-mouth to authority strategy", "Community leader positioning", "Service brand message clarity", "Local visibility planning"],
    relatedBlogTopics: commonBlogTopics,
    faqs: faqs("Port Arthur"),
  },
  {
    slug: "orange-tx",
    cityName: "Orange",
    region: "Southeast Texas",
    seoTitle: "Orange TX PR & Brand Strategy | JahKnowsPR",
    seoDescription:
      "Orange TX PR and brand strategy for small businesses, service providers, local entrepreneurs, and community brands that need clarity and visibility.",
    heroEyebrow: "Texas PR & Brand Strategy",
    heroHeadline: "Orange, TX brand strategy for small businesses that need clearer visibility.",
    heroSubheadline:
      "For Orange entrepreneurs, service providers, small businesses, and community brands that need stronger messaging before spending more on content or ads.",
    primaryCTA: "Book an Authority Strategy Session",
    secondaryCTA: "Start With a Free Brand Diagnosis",
    audienceTypes: commonAudienceTypes,
    localPainPoints: commonPainPoints,
    serviceFocus: commonServices,
    industries: ["Small businesses", "Service providers", "Local entrepreneurs", "Community brands", "Local professionals"],
    positioningAngle:
      "Orange businesses do not need generic visibility. They need a clear reason for people to understand, trust, and choose them in a local market where reputation matters.",
    localContext:
      "For smaller markets, unclear messaging can make a good business look harder to buy from than it really is. JahKnowsPR helps Orange brands simplify the message, sharpen the offer, and build a visibility plan with purpose.",
    proofPoints: ["Small-market clarity", "Service provider messaging", "Offer and CTA refinement", "Local visibility strategy"],
    relatedBlogTopics: commonBlogTopics,
    faqs: faqs("Orange"),
  },
];

const locationDisplayOrder = [
  "texas",
  "beaumont-tx",
  "port-arthur-tx",
  "orange-tx",
  "houston-tx",
  "dallas-tx",
  "san-antonio-tx",
  "austin-tx",
];

const locationRecordsBySlug = new Map(locationPageRecords.map((page) => [page.slug, page]));

export const locationPages: LocationPage[] = locationDisplayOrder
  .map((slug) => locationRecordsBySlug.get(slug))
  .filter((page): page is LocationPage => Boolean(page));

export const locationPageMap = new Map(locationPages.map((page) => [page.slug, page]));
