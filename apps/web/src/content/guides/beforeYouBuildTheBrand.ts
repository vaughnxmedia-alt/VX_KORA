export const GUIDE_TITLE = "Before You Build the Brand";
export const GUIDE_SUBTITLE = "A Starter Guide for New Businesses";
export const GUIDE_HUB_TITLE = "Before You Build the Brand: A Starter Guide for New Businesses";
export const GUIDE_HUB_PATH = "/the-brief/before-you-build-the-brand-starter-guide";
export const GUIDE_SERIES_BASE_PATH = "/the-brief/before-you-build-the-brand";
export const GUIDE_CATEGORY = "Brand Foundation";
export const GUIDE_TAGS = [
  "brand foundation",
  "new business branding",
  "digital presence",
  "brand strategy",
  "website basics",
  "social media strategy",
];

export type BeforeYouBuildArticle = {
  slideNumber: number;
  slideTitle: string;
  blogTitle: string;
  slug: string;
  path: string;
  excerpt: string;
  qrLabel: string;
  slideCta: string;
  primaryCta: string;
  secondaryCta: string;
  bodyCopy: string[];
  whyItMatters: string;
  beginnerExplanation: string;
  commonMistakes: string[];
  whatToDoFirst: string[];
  miniChecklist: string[];
  example: string;
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
};

type ArticleSeed = Omit<
  BeforeYouBuildArticle,
  | "path"
  | "qrLabel"
  | "slideCta"
  | "primaryCta"
  | "secondaryCta"
  | "metaTitle"
  | "metaDescription"
  | "ogTitle"
  | "ogDescription"
>;

const SHARED_MISTAKES = [
  "Starting with visuals before the message is clear.",
  "Using language that sounds polished but does not explain the offer.",
  "Assuming people understand the brand because they saw a post or logo.",
];

const articleSeeds: ArticleSeed[] = [
  {
    slideNumber: 2,
    slideTitle: "Start Here",
    blogTitle: "Start Here: Why Your Brand Needs a Foundation Before You Build Online",
    slug: "start-here",
    excerpt: "Before you create the logo, launch the website, or start posting, your brand needs a foundation people can understand.",
    bodyCopy: [
      "Starting a business is exciting, but it can also feel overwhelming.",
      "You may feel pressure to create a logo, start posting, build a website, buy business cards, and make the brand look official as fast as possible.",
      "Before you build the outside of the brand, you need to build the inside.",
    ],
    whyItMatters: "A strong beginning keeps the brand from becoming a collection of disconnected decisions. The foundation gives every next step a reason.",
    beginnerExplanation: "Brand foundation is the inside work: what you do, who you help, why it matters, what makes you different, why people should trust you, and what they should do next.",
    commonMistakes: SHARED_MISTAKES,
    whatToDoFirst: ["Write one plain-language sentence that explains what you do.", "Name the person you are trying to help.", "Choose the next action you want that person to take."],
    miniChecklist: ["I can explain the brand in one sentence.", "I know who the brand is for.", "I know the next step I want people to take."],
    example: "Instead of saying, 'We are a lifestyle brand,' say, 'We help first-time founders create clear brand foundations before they launch online.'",
  },
  {
    slideNumber: 3,
    slideTitle: "What Is a Brand Foundation?",
    blogTitle: "What Is a Brand Foundation and Why Does Every New Business Need One?",
    slug: "what-is-a-brand-foundation",
    excerpt: "Your brand foundation is the strategy behind how your business is understood.",
    bodyCopy: ["Your brand foundation is not just your logo, colors, fonts, or graphics.", "It includes your name, mission, vision, values, audience, positioning, messaging, offer clarity, digital presence, trust signals, and conversion path."],
    whyItMatters: "People cannot support what they do not understand. A foundation gives the market something clear to recognize and remember.",
    beginnerExplanation: "Think of the foundation as the operating system for the brand. It decides what the website says, what content should teach, and how people know they are in the right place.",
    commonMistakes: ["Calling a logo the brand.", "Choosing colors before choosing a message.", "Skipping the offer and audience work."],
    whatToDoFirst: ["List the core parts of the brand.", "Mark what is clear and what is still missing.", "Fix the unclear pieces before investing in visuals."],
    miniChecklist: ["Mission is written.", "Audience is specific.", "Offer is easy to understand.", "Next step is clear."],
    example: "A catering business does not only need pretty food photos. It needs to explain who it serves, what events it supports, what makes the service trustworthy, and how to book.",
  },
  {
    slideNumber: 4,
    slideTitle: "Why You Need This Before You Build Online",
    blogTitle: "Why Brand Clarity Matters Before You Build a Website, Social Media Page, or Content Strategy",
    slug: "why-brand-clarity-matters-before-building-online",
    excerpt: "A website, social page, logo, or content plan cannot fix an unclear brand.",
    bodyCopy: ["A website cannot fix unclear messaging.", "A social media page cannot fix unclear positioning.", "A logo cannot fix an unclear offer.", "Content cannot carry a brand that has not been clearly defined."],
    whyItMatters: "Digital tools amplify what is already there. If the brand is unclear, the website and content will usually make that confusion more visible.",
    beginnerExplanation: "Before you publish, decide what the business needs people to understand. Your digital presence should make the brand easier to recognize, trust, and act on.",
    commonMistakes: ["Building pages before writing the message.", "Posting often without a clear content direction.", "Using design to hide confusion."],
    whatToDoFirst: ["Write the homepage headline before designing the homepage.", "Write the social bio before choosing a content calendar.", "Write the offer before building the sales page."],
    miniChecklist: ["Message is clear.", "Audience is clear.", "Offer is clear.", "CTA is clear."],
    example: "If your Instagram bio does not explain what you do, posting three times a day will not fix the first impression.",
  },
  {
    slideNumber: 5,
    slideTitle: "Brand Name Check",
    blogTitle: "The Brand Name Check: What to Know Before You Choose a Business Name",
    slug: "brand-name-check",
    excerpt: "A good brand name should be memorable, searchable, and aligned with where the business is going.",
    bodyCopy: ["Your brand name is one of the first things people will remember, search, repeat, and associate with your business.", "Before you commit, check pronunciation, spelling, domain availability, social handles, conflicts, fit, and long-term flexibility."],
    whyItMatters: "The name affects search, referrals, recognition, and trust. A clever name that people cannot spell or find can create friction before the relationship starts.",
    beginnerExplanation: "A brand name has to work outside your notes app. People need to say it, type it, remember it, and connect it to the right promise.",
    commonMistakes: ["Choosing a name only because it sounds creative.", "Not checking domain and handle availability.", "Using a name too narrow for future growth."],
    whatToDoFirst: ["Say the name out loud.", "Search the web and social platforms.", "Check domain options.", "Ask whether the name still fits in three years."],
    miniChecklist: ["Easy to say.", "Easy to spell.", "Available domain checked.", "Social handles checked.", "Direction still fits."],
    example: "A name like 'Cupcakes by Kay' may work now, but if the business will grow into full-service events, the name may become too small.",
  },
  {
    slideNumber: 6,
    slideTitle: "Mission, Vision, and Values",
    blogTitle: "How to Write a Mission, Vision, and Values Statement for a New Business",
    slug: "mission-vision-values",
    excerpt: "Mission explains why the business exists, vision explains where it is going, and values explain what it stands on.",
    bodyCopy: ["Your mission explains why your business exists.", "Your vision explains where your business is going.", "Your values explain what your business will stand on while it grows."],
    whyItMatters: "These statements help the brand make decisions, communicate consistently, and grow without losing its center.",
    beginnerExplanation: "Keep it simple. A mission can follow this formula: We help [audience] achieve [result] through [method].",
    commonMistakes: ["Writing statements that sound good but do not guide action.", "Choosing too many values.", "Copying corporate language that does not sound like the brand."],
    whatToDoFirst: ["Write the mission formula.", "Choose three to five values.", "Describe what each value looks like in action."],
    miniChecklist: ["Mission is one sentence.", "Vision points forward.", "Values are actionable.", "Team decisions can use them."],
    example: "We help new entrepreneurs build clear, credible brands through strategy, messaging, and digital presence.",
  },
  {
    slideNumber: 7,
    slideTitle: "Know Who You Are Talking To",
    blogTitle: "How to Define Your Target Audience Before You Start Marketing",
    slug: "know-your-target-audience",
    excerpt: "Your target audience is not everybody. A clear audience creates a stronger message.",
    bodyCopy: ["When your audience is too broad, your message usually becomes too general.", "Ask who needs this most, what they want, what they are tired of, what makes them hesitate, and what would make them trust you."],
    whyItMatters: "Audience clarity tells you what to say, where to say it, and what proof people need before they act.",
    beginnerExplanation: "You are not excluding people by being specific. You are making it easier for the right people to recognize themselves in the message.",
    commonMistakes: ["Saying the audience is everyone.", "Only describing demographics.", "Ignoring what the audience is afraid to waste money on."],
    whatToDoFirst: ["Write the audience's current problem.", "Write what they want instead.", "List the questions they ask before buying."],
    miniChecklist: ["Audience stage is clear.", "Main problem is clear.", "Desired result is clear.", "Trust barrier is clear."],
    example: "Instead of 'small businesses,' try 'first-time service founders who need their offer explained clearly before they launch online.'",
  },
  {
    slideNumber: 8,
    slideTitle: "Positioning",
    blogTitle: "Brand Positioning for Beginners: What Do You Want to Be Known For?",
    slug: "brand-positioning",
    excerpt: "Positioning helps your brand stop blending in and start being understood.",
    bodyCopy: ["Positioning answers one major question: what do you want your brand to be known for?", "It explains your category, audience, problem, difference, reason to choose you, and reputation."],
    whyItMatters: "Without positioning, the brand may look active but still feel interchangeable. Positioning creates a place in the audience's mind.",
    beginnerExplanation: "Use this formula: For [audience] who need [solution], [brand] helps them [result] through [unique approach].",
    commonMistakes: ["Trying to be known for too many things.", "Copying competitor language.", "Naming a service but not a clear outcome."],
    whatToDoFirst: ["Choose your category.", "Name your audience.", "Name your specific result.", "Define your approach."],
    miniChecklist: ["Category is clear.", "Difference is clear.", "Outcome is clear.", "Reputation goal is clear."],
    example: "For new business owners who need brand clarity, JahKnowsPR helps turn early ideas into clear brand foundations through strategy, messaging, and digital presence planning.",
  },
  {
    slideNumber: 9,
    slideTitle: "Messaging",
    blogTitle: "Brand Messaging for Beginners: How to Explain What You Do Clearly",
    slug: "brand-messaging",
    excerpt: "Your message should be clear enough for someone to repeat after visiting your page, website, or profile.",
    bodyCopy: ["Messaging is how your brand explains itself.", "Strong messaging answers what you do, who you help, what problem you solve, why it matters, what makes your approach different, and what people should do next."],
    whyItMatters: "People share, refer, book, and buy what they can understand. Confusing messages create quiet exits.",
    beginnerExplanation: "Good messaging sounds like a clear explanation, not a slogan contest. The goal is repeatability.",
    commonMistakes: ["Using clever lines before clear lines.", "Hiding the offer in vague language.", "Making people work to understand the next step."],
    whatToDoFirst: ["Write your one-sentence explanation.", "Write your main problem statement.", "Write your CTA."],
    miniChecklist: ["What we do is clear.", "Who we help is clear.", "Why it matters is clear.", "CTA is visible."],
    example: "Clear: 'We help founders clarify their brand message before they build a website.' Vague: 'We bring visions to life.'",
  },
  {
    slideNumber: 10,
    slideTitle: "Offer Clarity",
    blogTitle: "Offer Clarity: How to Make It Easy for People to Understand What You Sell",
    slug: "offer-clarity",
    excerpt: "Confused people usually do not convert. Clear offers make action easier.",
    bodyCopy: ["Your offer is what people can buy, book, request, join, or sign up for.", "A clear offer explains what it is, who it is for, what problem it solves, what is included, what result it supports, and how to take the next step."],
    whyItMatters: "Your offer is where interest becomes action. If people cannot understand it quickly, they are less likely to inquire.",
    beginnerExplanation: "Offer clarity does not mean over-explaining. It means removing the questions that stop someone from moving forward.",
    commonMistakes: ["Listing features without the outcome.", "Giving people too many options at once.", "Using CTAs that do not match the offer."],
    whatToDoFirst: ["Name the offer.", "Name who it is for.", "Name the result.", "Name the next action."],
    miniChecklist: ["Offer name is clear.", "Audience is clear.", "Outcome is clear.", "CTA is clear."],
    example: "Instead of 'consulting available,' say 'Book a 60-minute brand strategy session to clarify your message, offer, and next-step plan.'",
  },
  {
    slideNumber: 11,
    slideTitle: "What Is Digital Presence?",
    blogTitle: "What Is Digital Presence and Why Does It Matter for a New Business?",
    slug: "digital-presence",
    excerpt: "Your online presence is not just for visibility. It is for clarity, credibility, and conversion.",
    bodyCopy: ["Digital presence is how your brand shows up online.", "It can include your website, social accounts, Google Business Profile, email, booking form, blog, portfolio, testimonials, photos, search results, and reviews."],
    whyItMatters: "Most people meet the brand online before they meet you. Your digital presence shapes whether they understand, trust, or move on.",
    beginnerExplanation: "Digital presence is more than being visible. It is the trail of information that helps someone decide whether the brand is real, relevant, and ready.",
    commonMistakes: ["Treating social media as the whole presence.", "Not connecting profiles to a contact path.", "Letting outdated pages damage trust."],
    whatToDoFirst: ["List every place your brand appears online.", "Check whether each place explains the brand clearly.", "Add a simple contact or booking path."],
    miniChecklist: ["Website or landing page exists.", "Social profiles are clear.", "Contact path works.", "Proof is visible."],
    example: "A founder may not need a full website on day one, but they still need a clear profile, business email, and a place for people to inquire.",
  },
  {
    slideNumber: 12,
    slideTitle: "Website Basics",
    blogTitle: "Website Basics for New Businesses: What Your First Website Actually Needs",
    slug: "website-basics",
    excerpt: "A beginner website does not have to be complicated. It needs to be clear.",
    bodyCopy: ["At minimum, your website should answer who you are, what you offer, who you help, why people should trust you, and how they can contact, book, buy, or inquire.", "Basic pages can include Home, About, Services or Offers, Contact, FAQ, Blog or Resources, and Testimonials or Proof."],
    whyItMatters: "Your first website gives people a home base for trust and action. It should reduce confusion, not create more pages to decode.",
    beginnerExplanation: "Start with the pages and messages that help someone decide. You can add complexity after the foundation is useful.",
    commonMistakes: ["Building a beautiful site with no clear offer.", "Burying contact information.", "Launching before the homepage explains the business."],
    whatToDoFirst: ["Write the homepage headline.", "Write your offer section.", "Add a simple CTA.", "Add a contact path."],
    miniChecklist: ["Headline says what you do.", "Offer is visible.", "Trust signal is visible.", "CTA works."],
    example: "A one-page site with a clear headline, offer, proof, and booking link can outperform a five-page site that never gets to the point.",
  },
  {
    slideNumber: 13,
    slideTitle: "Homepage Checklist",
    blogTitle: "Homepage Checklist: What Your Website Should Say in the First 10 Seconds",
    slug: "homepage-checklist",
    excerpt: "Your homepage should guide people, not make them search for the point.",
    bodyCopy: ["Your homepage should include a clear headline, a short explanation, who you help, your main offer, why your work matters, proof, and a clear call to action."],
    whyItMatters: "The homepage is often the first test of clarity. People should not have to scroll forever to understand whether they are in the right place.",
    beginnerExplanation: "Think of the first screen as an introduction. It should say what the brand does, who it helps, and what someone can do next.",
    commonMistakes: ["Opening with a vague slogan.", "Making the CTA hard to find.", "Using visuals that do not support the message."],
    whatToDoFirst: ["Write a clear headline.", "Add one short support sentence.", "Choose one primary CTA.", "Add proof near the top."],
    miniChecklist: ["Headline is clear.", "Audience is named.", "Offer is named.", "CTA is visible.", "Proof appears."],
    example: "Headline: 'Brand strategy for founders building from the beginning.' CTA: 'Start the Free Brand Audit.'",
  },
  {
    slideNumber: 14,
    slideTitle: "Social Media Basics",
    blogTitle: "Social Media Basics for New Businesses: How to Set Up a Clear Profile",
    slug: "social-media-basics",
    excerpt: "Posting more will not fix a profile people do not understand.",
    bodyCopy: ["Before posting consistently, your social media page should be clear.", "Your profile should include a searchable name, clear username, profile photo or logo, bio, location if relevant, contact information, website or link, pinned posts, and consistent content direction."],
    whyItMatters: "A profile is often a mini homepage. It should quickly show who you are, what you do, and why someone should keep paying attention.",
    beginnerExplanation: "Activity is not the same as clarity. Set up the profile so a first-time visitor understands the brand before they scroll.",
    commonMistakes: ["Using a bio that only lists interests.", "Not adding a contact link.", "Posting without pinned context."],
    whatToDoFirst: ["Update the searchable name.", "Rewrite the bio.", "Add the best contact link.", "Plan three pinned posts."],
    miniChecklist: ["Name is searchable.", "Bio explains the offer.", "Link works.", "Pinned posts are planned."],
    example: "A clear profile can say: 'Brand strategy for new founders. Build the message before the website. Start with the free audit.'",
  },
  {
    slideNumber: 15,
    slideTitle: "Social Media Bio Formula",
    blogTitle: "How to Write a Social Media Bio That Clearly Explains Your Brand",
    slug: "social-media-bio-formula",
    excerpt: "Your bio is not just a description. It is a direction.",
    bodyCopy: ["Use this formula: I help [audience] achieve [result] through [method]. [Proof, personality, or brand belief.] [Call to action.]", "Your bio should help people quickly understand what you do and what action they should take next."],
    whyItMatters: "The bio is one of the fastest clarity checkpoints. If it is vague, the visitor may never reach the content.",
    beginnerExplanation: "A strong bio names the audience, the result, the method, and the next step in plain language.",
    commonMistakes: ["Stuffing the bio with titles.", "Using insider language.", "Leaving out the CTA."],
    whatToDoFirst: ["Write the audience.", "Write the result.", "Write the method.", "Add a CTA."],
    miniChecklist: ["Audience included.", "Result included.", "Method included.", "CTA included."],
    example: "Helping new entrepreneurs build clear, credible brands through strategy, messaging, and digital presence. Start with the free brand audit.",
  },
  {
    slideNumber: 16,
    slideTitle: "Your First 3 Pinned Posts",
    blogTitle: "The First 3 Pinned Posts Every New Business Should Create",
    slug: "first-three-pinned-posts",
    excerpt: "Pinned posts act like a mini website for your social media page.",
    bodyCopy: ["Pinned Post 1: who you are and who you help.", "Pinned Post 2: the problem you solve.", "Pinned Post 3: how to work with you or take the next step.", "Do not make people scroll forever to understand the brand."],
    whyItMatters: "Pinned posts give new visitors context quickly. They turn a social profile into a guided introduction.",
    beginnerExplanation: "Instead of pinning random high-performing posts, pin the information a new visitor needs to understand and act.",
    commonMistakes: ["Pinning only trendy content.", "Not explaining the offer.", "Making the next step unclear."],
    whatToDoFirst: ["Draft an intro post.", "Draft a problem/solution post.", "Draft a next-step post."],
    miniChecklist: ["Intro post pinned.", "Problem post pinned.", "CTA post pinned."],
    example: "A brand strategist might pin: who I help, why early brands struggle with clarity, and how to start the free audit.",
  },
  {
    slideNumber: 17,
    slideTitle: "If You Do Not Have a Website Yet",
    blogTitle: "No Website Yet? Start Here Before You Build One",
    slug: "no-website-yet",
    excerpt: "You do not need a perfect website to start. You need a clear place to send people.",
    bodyCopy: ["Start simple: choose your name, check the domain, buy the domain, set up a business email, write your mission and offer, create a simple landing page, add contact or booking options, add social links, and connect basic analytics."],
    whyItMatters: "A website should support trust and action. Starting simple keeps you from spending heavily before the message is ready.",
    beginnerExplanation: "A clear landing page can be enough while the brand grows. The priority is giving interested people a reliable next step.",
    commonMistakes: ["Waiting for a perfect full site.", "Buying tools before writing the offer.", "Using only social media with no owned destination."],
    whatToDoFirst: ["Buy the domain.", "Set up business email.", "Write one landing page.", "Add a contact form."],
    miniChecklist: ["Domain secured.", "Email secured.", "Landing page drafted.", "Contact path active."],
    example: "A simple page with the brand promise, offer, proof, and inquiry form can hold attention while the full website is built.",
  },
  {
    slideNumber: 18,
    slideTitle: "If You Do Not Have Social Media Yet",
    blogTitle: "No Social Media Yet? How to Set Up Your Brand the Right Way",
    slug: "no-social-media-yet",
    excerpt: "You do not need to be everywhere. You need to be clear where you show up.",
    bodyCopy: ["Start with the platforms that make sense for your audience.", "Secure usernames, create your profile image or logo, write your bio, add your contact link, create your first nine posts, pin your three foundation posts, post consistently, and track what people respond to."],
    whyItMatters: "A clear social setup helps people recognize the brand and understand whether to follow, inquire, or share.",
    beginnerExplanation: "Choose the platform based on audience behavior, not pressure. Then set the profile up like a clear introduction.",
    commonMistakes: ["Opening every platform at once.", "Posting before the bio is clear.", "Not preparing foundation content."],
    whatToDoFirst: ["Choose one or two platforms.", "Secure usernames.", "Write the bio.", "Plan nine starter posts."],
    miniChecklist: ["Platform chosen.", "Username secured.", "Bio written.", "Pinned posts planned."],
    example: "A new consultant may start with LinkedIn and Instagram, then build content around credibility, education, and clear offers.",
  },
  {
    slideNumber: 19,
    slideTitle: "Trust Signals",
    blogTitle: "Trust Signals: How New Businesses Can Build Credibility Before They Have Big Results",
    slug: "trust-signals",
    excerpt: "Trust is built through clarity, consistency, and proof.",
    bodyCopy: ["Trust signals can include testimonials, reviews, client results, portfolio examples, photos, videos, media mentions, certifications, experience, community involvement, a clear process, professional email, and consistent messaging.", "For new brands, trust can come from your story, process, values, and clarity."],
    whyItMatters: "People need reasons to believe before they act. Trust signals lower hesitation.",
    beginnerExplanation: "Proof does not always mean big results. Early proof can come from preparation, process, experience, transparency, and consistency.",
    commonMistakes: ["Waiting until the brand has major results to show proof.", "Hiding experience because it came from another role.", "Using testimonials without context."],
    whatToDoFirst: ["List your existing experience.", "Document your process.", "Collect early feedback.", "Show professional contact details."],
    miniChecklist: ["Process visible.", "Experience visible.", "Contact professional.", "Early proof collected."],
    example: "A new business can show credibility through a clear process page, founder experience, community work, and early client feedback.",
  },
  {
    slideNumber: 20,
    slideTitle: "Common Mistakes to Avoid",
    blogTitle: "Common Brand Mistakes New Businesses Should Avoid",
    slug: "common-brand-mistakes",
    excerpt: "Pretty branding can get attention. Clear branding creates understanding.",
    bodyCopy: ["Avoid building your brand around only a logo, color palette, cute feed, random posting, trendy content, vague bio, website with no CTA, hard-to-search name, or unclear offer.", "Pretty without clarity does not convert."],
    whyItMatters: "Mistakes become expensive when they are built into websites, visuals, and content systems.",
    beginnerExplanation: "The issue is not beauty. The issue is beauty without direction. Design should support the message.",
    commonMistakes: ["Prioritizing aesthetics over strategy.", "Copying trends that do not fit the audience.", "Publishing without a conversion path."],
    whatToDoFirst: ["Audit your current brand touchpoints.", "Mark every unclear message.", "Fix the CTA path.", "Rewrite vague copy."],
    miniChecklist: ["Name is searchable.", "Bio is clear.", "Offer is clear.", "Website has CTA."],
    example: "A beautiful homepage that never says what the business sells will lose people who were ready to understand more.",
  },
  {
    slideNumber: 21,
    slideTitle: "Brand Foundation Checklist",
    blogTitle: "The Brand Foundation Checklist Every New Business Should Complete",
    slug: "brand-foundation-checklist",
    excerpt: "Use this checklist before investing heavily into visuals, content, ads, or a full website.",
    bodyCopy: ["Before you build or relaunch, make sure you can answer what the brand name is, what it does, who it helps, what problem it solves, why it matters, what the values are, what the main offer is, what people should do next, what platforms are needed, and what proof the brand can show."],
    whyItMatters: "A checklist turns brand clarity into something you can review before spending more time and money.",
    beginnerExplanation: "This is the pre-build checkpoint. If too many answers are missing, pause and clarify before you launch.",
    commonMistakes: ["Treating the checklist as busy work.", "Skipping unclear answers.", "Investing heavily before the basics are defined."],
    whatToDoFirst: ["Answer every checklist question.", "Circle weak answers.", "Fix the message, offer, and CTA first."],
    miniChecklist: ["Brand name.", "Audience.", "Problem.", "Offer.", "CTA.", "Platforms.", "Proof."],
    example: "If the offer and CTA are missing, the brand is not ready for a homepage redesign yet.",
  },
  {
    slideNumber: 22,
    slideTitle: "Your Next Step",
    blogTitle: "Your Next Step: How to Move From Brand Clarity to Brand Action",
    slug: "your-next-step",
    excerpt: "Your brand is not just what people see. It is what they understand.",
    bodyCopy: ["Now that you understand the basics of brand foundation, the next step is to get specific about your business.", "Ask whether your message is clear, your audience is specific, your offer is easy to understand, your website or social page guides action, and your digital presence matches your current stage."],
    whyItMatters: "Clarity only becomes useful when it turns into action: pages, profiles, content, offers, and next steps people can follow.",
    beginnerExplanation: "Move from notes to decisions. Choose what needs to be written, built, updated, or simplified first.",
    commonMistakes: ["Learning the concepts but not applying them.", "Trying to fix everything at once.", "Avoiding the audit because the brand feels unfinished."],
    whatToDoFirst: ["Review the checklist.", "Choose the weakest area.", "Start the free brand audit.", "Book a strategy session if you need guided direction."],
    miniChecklist: ["Weakest area identified.", "Next action chosen.", "Audit started.", "Strategy support considered."],
    example: "If your offer is unclear, your next action is not more content. It is rewriting the offer and CTA so people know how to move.",
  },
];

// To add a future slide: add one ArticleSeed above, choose a unique slug, and the route,
// QR destination, previous/next navigation, hub table of contents, and PDF link metadata update automatically.
export const beforeYouBuildTheBrandArticles: BeforeYouBuildArticle[] = articleSeeds.map((article) => ({
  ...article,
  path: `${GUIDE_SERIES_BASE_PATH}/${article.slug}`,
  qrLabel: "Read the full breakdown",
  slideCta: "Scan to read more about this step.",
  primaryCta: "Download the Full Guide",
  secondaryCta: "Start the Free Brand Audit",
  metaTitle: `${article.blogTitle} | JahKnowsPR`,
  metaDescription: article.excerpt,
  ogTitle: article.blogTitle,
  ogDescription: article.excerpt,
}));

export function getBeforeYouBuildArticle(slug: string | undefined) {
  return beforeYouBuildTheBrandArticles.find((article) => article.slug === slug);
}

export function getGuideArticleNeighbors(slug: string) {
  const index = beforeYouBuildTheBrandArticles.findIndex((article) => article.slug === slug);
  return {
    previous: index > 0 ? beforeYouBuildTheBrandArticles[index - 1] : null,
    next: index >= 0 && index < beforeYouBuildTheBrandArticles.length - 1
      ? beforeYouBuildTheBrandArticles[index + 1]
      : null,
  };
}

export const beforeYouBuildTheBrandCoverSlide = {
  slideNumber: 1,
  slideTitle: "Cover",
  path: GUIDE_HUB_PATH,
  title: GUIDE_TITLE,
  subtitle: GUIDE_SUBTITLE,
  body: "Before you create the logo, launch the website, post the content, or announce the business, make sure your brand foundation is clear enough to support the attention.",
};

export const beforeYouBuildTheBrandFinalSlide = {
  slideTitle: "Ready to Build With More Clarity?",
  path: "/free-audit",
  body: "Start with the Free Brand Audit from JahKnowsPR before you post more, build more, or spend more.",
};
