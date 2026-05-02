export type AnswerFaq = {
  question: string;
  answer: string;
};

export type AnswerPage = {
  slug: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  directQuestion: string;
  directAnswer: string;
  deeperExplanation: string[];
  appliesTo: string[];
  commonMistake: string;
  jahKnowsPerspective: string;
  serviceDefinition?: {
    service: string;
    definition: string;
    outcomes: string[];
  };
  relatedLinks: { label: string; href: string }[];
  faqs: AnswerFaq[];
};

export const answerPages: AnswerPage[] = [
  {
    slug: "pr-vs-marketing",
    title: "PR vs. Marketing",
    seoTitle: "PR vs. Marketing: What Business Owners Need to Know | JahKnowsPR",
    seoDescription:
      "A clear explanation of PR vs. marketing, when each matters, and how JahKnowsPR helps brands build authority before promotion.",
    directQuestion: "What is the difference between PR and marketing?",
    directAnswer:
      "PR shapes how people understand and trust your brand. Marketing promotes offers and moves people toward action. Most growing brands need PR-level clarity before marketing can convert consistently.",
    deeperExplanation: [
      "Marketing often asks, 'How do we get this offer in front of more people?' PR asks, 'What should people believe, remember, and repeat about this brand?' Both matter, but they solve different problems.",
      "If people are seeing your content but still do not understand why they should trust you, buy from you, invite you, or cover your story, the issue is usually positioning before promotion.",
    ],
    appliesTo: ["Founders with offers that are not converting", "Creators building authority", "Service providers with unclear messaging", "Local brands preparing for more visibility"],
    commonMistake:
      "The common mistake is buying more visibility before the message is clear. More attention can expose weak positioning faster.",
    jahKnowsPerspective:
      "JahKnowsPR treats PR and marketing as connected, but sequenced. First clarify the story, proof, audience, and offer. Then promote with discipline.",
    serviceDefinition: {
      service: "Public Relations Strategy",
      definition:
        "PR strategy defines the public story, credibility signals, audience beliefs, and media or community angles that make a brand easier to understand and trust.",
      outcomes: ["A clearer public narrative", "Stronger authority signals", "Better campaign angles", "More useful content direction"],
    },
    relatedLinks: [
      { label: "Book an Authority Strategy Session", href: "/brand-strategy-session" },
      { label: "Start a Free Brand Diagnosis", href: "/free-audit" },
      { label: "Read The Brief", href: "/the-brief" },
    ],
    faqs: [
      {
        question: "Do I need PR or marketing first?",
        answer:
          "If your audience does not clearly understand your value, start with PR and positioning. If the message is clear and the offer already converts, marketing can help scale it.",
      },
      {
        question: "Can JahKnowsPR help with both?",
        answer:
          "Yes. JahKnowsPR helps clarify positioning, messaging, content direction, PR angles, and campaign strategy so marketing has a stronger foundation.",
      },
    ],
  },
  {
    slug: "what-is-brand-strategy",
    title: "What Is Brand Strategy?",
    seoTitle: "What Is Brand Strategy? A Clear Definition | JahKnowsPR",
    seoDescription:
      "Brand strategy explained in plain language for entrepreneurs, creators, and businesses that need clearer positioning and messaging.",
    directQuestion: "What is brand strategy?",
    directAnswer:
      "Brand strategy is the system that defines who your brand serves, what it should be known for, why people should trust it, and how its message should lead people toward action.",
    deeperExplanation: [
      "A brand is not only a logo, color palette, or content style. Those things help recognition, but strategy gives the brand meaning.",
      "Good brand strategy makes decisions easier. It clarifies the audience, the promise, the offer, the voice, the proof, and the public point of view.",
    ],
    appliesTo: ["New businesses building a foundation", "Existing brands that feel scattered", "Creators turning attention into offers", "Service providers refining their market position"],
    commonMistake:
      "The mistake is treating brand strategy like decoration. Visual polish helps, but it cannot fix a message people do not understand.",
    jahKnowsPerspective:
      "JahKnowsPR builds brand strategy around authority: what the audience needs to believe, what proof supports that belief, and what action should come next.",
    serviceDefinition: {
      service: "Brand Strategy",
      definition:
        "Brand strategy turns audience, offer, messaging, proof, and positioning into a practical direction for public communication.",
      outcomes: ["Clearer positioning", "More consistent messaging", "Better content decisions", "A stronger offer path"],
    },
    relatedLinks: [
      { label: "How we work with you", href: "/work-with-me" },
      { label: "Free Brand Diagnosis", href: "/free-audit" },
      { label: "Texas PR and brand strategy", href: "/locations/texas" },
    ],
    faqs: [
      {
        question: "Is brand strategy the same as branding?",
        answer:
          "No. Branding often refers to the visual and identity system. Brand strategy defines the direction behind that identity: audience, message, promise, proof, and positioning.",
      },
      {
        question: "When should I work on brand strategy?",
        answer:
          "Work on brand strategy before a major launch, rebrand, campaign, website rebuild, content push, or ad spend.",
      },
    ],
  },
  {
    slug: "what-does-a-publicist-do",
    title: "What Does a Publicist Do?",
    seoTitle: "What Does a Publicist Do? Publicist Role Explained | JahKnowsPR",
    seoDescription:
      "A clear explanation of what publicists do, how PR support works, and when a brand is ready for public-facing visibility.",
    directQuestion: "What does a publicist do?",
    directAnswer:
      "A publicist helps shape and share a public story. That can include media angles, credibility building, press outreach, launch visibility, event PR, and messaging support.",
    deeperExplanation: [
      "The best publicist does not simply chase attention. They help make sure the story is clear enough to be covered, shared, and remembered.",
      "For many brands, publicist support works best after the positioning, proof, and offer path are clear.",
    ],
    appliesTo: ["Founders preparing for visibility", "Event brands", "Artists and public figures", "Service businesses with a story worth clarifying"],
    commonMistake:
      "The mistake is expecting press to fix a weak message. Media attention can help, but it needs a clear reason to care.",
    jahKnowsPerspective:
      "JahKnowsPR approaches publicity through strategy first: story, audience, timing, proof, and the action the visibility should support.",
    relatedLinks: [
      { label: "Book a Strategy Session", href: "/brand-strategy-session" },
      { label: "Read The Brief", href: "/the-brief" },
      { label: "Houston strategy page", href: "/locations/houston-tx" },
    ],
    faqs: [
      {
        question: "Can a publicist guarantee media coverage?",
        answer:
          "No ethical publicist should guarantee earned media coverage. They can strengthen the story, outreach, timing, and materials that make coverage more likely.",
      },
      {
        question: "Do I need a publicist or a strategist?",
        answer:
          "If your message and offer are unclear, start with strategy. If the story is clear and you need visibility support, publicist-style PR support may be the next step.",
      },
    ],
  },
  {
    slug: "why-content-gets-attention-but-not-clients",
    title: "Why Content Gets Attention But Not Clients",
    seoTitle: "Why Your Content Gets Attention But Not Clients | JahKnowsPR",
    seoDescription:
      "Why content can get views, likes, or comments without creating clients, bookings, or revenue, and what to fix first.",
    directQuestion: "Why does my content get attention but not clients?",
    directAnswer:
      "Content often gets attention but not clients because it entertains or informs without clearly positioning the offer, building trust, naming the problem, or telling people what to do next.",
    deeperExplanation: [
      "Attention is not the same as demand. People may like a post because it is relatable, beautiful, or timely, but still have no idea what you sell or why you are the right choice.",
      "Conversion-focused content does not have to sound pushy. It needs context, proof, offer clarity, and a natural next step.",
    ],
    appliesTo: ["Creators with engagement but low bookings", "Service providers posting consistently", "Brands running boosted posts", "Businesses with strong visuals but weak CTAs"],
    commonMistake:
      "The mistake is posting more of the same content instead of diagnosing where the message breaks between attention and action.",
    jahKnowsPerspective:
      "JahKnowsPR looks at content as part of an authority system. The question is not only what performs. It is whether the content teaches people how to trust and choose you.",
    relatedLinks: [
      { label: "Start a Free Brand Diagnosis", href: "/free-audit" },
      { label: "What is brand strategy?", href: "/answers/what-is-brand-strategy" },
      { label: "Brand Strategy Session", href: "/brand-strategy-session" },
    ],
    faqs: [
      {
        question: "Should I post more often?",
        answer:
          "Not always. If the message is unclear, more posting can multiply confusion. First clarify the audience, offer, proof, and CTA.",
      },
      {
        question: "Can a free brand diagnosis help?",
        answer:
          "Yes. The Free Brand Diagnosis is designed to spot positioning and conversion gaps before you keep investing in content.",
      },
    ],
  },
  {
    slug: "how-to-get-media-coverage-in-texas",
    title: "How to Get Media Coverage in Texas",
    seoTitle: "How to Get Media Coverage in Texas | JahKnowsPR",
    seoDescription:
      "A practical explanation of what Texas brands need before seeking local, regional, or statewide media coverage.",
    directQuestion: "How do I get media coverage in Texas?",
    directAnswer:
      "To get media coverage in Texas, start with a clear story, local relevance, credible proof, timely angle, and a reason the audience should care now.",
    deeperExplanation: [
      "Texas is not one audience. A Beaumont story, Houston story, Dallas story, and statewide story may need different context even when the brand is the same.",
      "Before pitching, clarify what is newsworthy, who it affects, why it matters, and what proof supports it.",
    ],
    appliesTo: ["Texas entrepreneurs", "Local businesses", "Event organizers", "Community leaders", "Creators with a public story"],
    commonMistake:
      "The mistake is pitching a business announcement as news without explaining why it matters to the publication's audience.",
    jahKnowsPerspective:
      "JahKnowsPR helps Texas brands build the strategic language and public angle before seeking coverage, so the story is easier to understand and cite.",
    relatedLinks: [
      { label: "Texas location page", href: "/locations/texas" },
      { label: "Beaumont strategy page", href: "/locations/beaumont-tx" },
      { label: "Book an Authority Strategy Session", href: "/brand-strategy-session" },
    ],
    faqs: [
      {
        question: "Does JahKnowsPR work with Texas businesses?",
        answer:
          "Yes. JahKnowsPR works with Texas entrepreneurs, creators, local businesses, service providers, and community-centered brands.",
      },
      {
        question: "Do I need a press release?",
        answer:
          "Sometimes, but not always. Many brands need the story angle and media strategy before they need a press release.",
      },
    ],
  },
  {
    slug: "do-i-need-pr-or-marketing-first",
    title: "Do I Need PR or Marketing First?",
    seoTitle: "Do I Need PR or Marketing First? | JahKnowsPR",
    seoDescription:
      "A direct answer for business owners deciding whether to invest in PR, marketing, content, advertising, or brand strategy first.",
    directQuestion: "Do I need PR or marketing first?",
    directAnswer:
      "You need PR first if people do not understand, trust, or remember your brand. You need marketing first if the message and offer already convert and you are ready to scale visibility.",
    deeperExplanation: [
      "PR builds the trust and meaning around the brand. Marketing moves that meaning through campaigns, content, ads, and offers.",
      "Many brands think they have a traffic problem when they really have a clarity problem.",
    ],
    appliesTo: ["Business owners before ad spend", "Creators launching offers", "Service providers with inconsistent leads", "Brands preparing for a campaign"],
    commonMistake:
      "The mistake is choosing tactics before diagnosing the actual problem. A funnel, campaign, or ad will not fix unclear positioning.",
    jahKnowsPerspective:
      "JahKnowsPR helps clients identify the order of operations: clarify, position, prove, then promote.",
    relatedLinks: [
      { label: "PR vs. Marketing", href: "/answers/pr-vs-marketing" },
      { label: "Free Brand Diagnosis", href: "/free-audit" },
      { label: "How we work with you", href: "/work-with-me" },
    ],
    faqs: [
      {
        question: "What should I do before running ads?",
        answer:
          "Clarify the audience, message, offer, proof, and CTA. Ads work better when people immediately understand why the offer matters.",
      },
      {
        question: "Can JahKnowsPR help me decide?",
        answer:
          "Yes. The Free Brand Diagnosis and Authority Strategy Session are designed to identify what should happen first.",
      },
    ],
  },
  {
    slug: "what-is-authority-strategy",
    title: "What Is Authority Strategy?",
    seoTitle: "What Is Authority Strategy? | JahKnowsPR",
    seoDescription:
      "Authority strategy explained for founders, creators, and service providers who want to become trusted and chosen.",
    directQuestion: "What is authority strategy?",
    directAnswer:
      "Authority strategy is the plan for becoming understood, trusted, and chosen by the right audience through clear positioning, proof, content, PR, and offer direction.",
    deeperExplanation: [
      "Authority is not only popularity. It is the audience's belief that you understand the problem, can lead the solution, and are worth trusting.",
      "An authority strategy connects what you say, where you show up, what proof you use, and what action you invite people to take.",
    ],
    appliesTo: ["Experts and consultants", "Creators with a point of view", "Local service providers", "Brands entering a more public season"],
    commonMistake:
      "The mistake is trying to look authoritative without saying anything clear enough to be remembered.",
    jahKnowsPerspective:
      "JahKnowsPR builds authority from the inside out: message first, then content, PR, campaigns, and visibility.",
    serviceDefinition: {
      service: "Authority Strategy",
      definition:
        "Authority strategy clarifies the message, proof, content themes, PR angles, and offer path that help a brand become trusted in public.",
      outcomes: ["A sharper public point of view", "Clearer proof points", "Better content themes", "A more confident offer path"],
    },
    relatedLinks: [
      { label: "Authority Strategy Session", href: "/brand-strategy-session" },
      { label: "Build local brand authority", href: "/answers/how-to-build-local-brand-authority" },
      { label: "Locations", href: "/locations" },
    ],
    faqs: [
      {
        question: "Is authority strategy only for personal brands?",
        answer:
          "No. It can support businesses, service providers, creators, founders, local brands, and organizations that need more trust and clarity.",
      },
      {
        question: "How does an Authority Strategy Session help?",
        answer:
          "It gives you focused diagnosis and direction on what needs to change in your positioning, message, offer, or visibility plan.",
      },
    ],
  },
  {
    slug: "how-to-build-local-brand-authority",
    title: "How to Build Local Brand Authority",
    seoTitle: "How to Build Local Brand Authority | JahKnowsPR",
    seoDescription:
      "How local businesses and creators can build authority in their city through messaging, proof, content, PR, and community relevance.",
    directQuestion: "How do I build local brand authority?",
    directAnswer:
      "Build local brand authority by making your message easy to understand, showing proof consistently, connecting your work to local context, and giving people a clear next step.",
    deeperExplanation: [
      "Local authority grows when people can explain what you do and why it matters without needing a long introduction.",
      "The strongest local brands combine community trust with clear positioning. They do not rely only on being known; they make the value repeatable.",
    ],
    appliesTo: ["Local businesses", "Community brands", "Service providers", "Event leaders", "Creators in Texas markets"],
    commonMistake:
      "The mistake is assuming local recognition is the same as authority. People can know your name and still not understand your offer.",
    jahKnowsPerspective:
      "JahKnowsPR helps local brands turn reputation into language, content, proof, and offers that can travel beyond word of mouth.",
    relatedLinks: [
      { label: "Texas location page", href: "/locations/texas" },
      { label: "Port Arthur strategy page", href: "/locations/port-arthur-tx" },
      { label: "Orange strategy page", href: "/locations/orange-tx" },
    ],
    faqs: [
      {
        question: "Does local authority require media coverage?",
        answer:
          "Media coverage can help, but local authority can also grow through clear messaging, community proof, useful content, strong offers, and consistent public presence.",
      },
      {
        question: "Can JahKnowsPR help with city-specific positioning?",
        answer:
          "Yes. JahKnowsPR builds city-specific strategy pages and messaging for Texas brands without relying on thin duplicate content.",
      },
    ],
  },
];

export const answerPageMap = new Map(answerPages.map((page) => [page.slug, page]));
