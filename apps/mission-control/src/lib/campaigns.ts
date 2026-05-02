import type { Client } from "@/hooks/useClients"

export type { Client }

export interface Brand {
  id: string
  clientId: string
  name: string
  brandType: string
  industry: string
  website?: string
  voiceNote: string
}

export type CampaignStatus = "draft" | "planning" | "ready" | "testing" | "live" | "paused" | "complete"

export type CampaignPlatform =
  | "Google Search"
  | "Google Display"
  | "YouTube"
  | "Meta"
  | "TikTok"
  | "LinkedIn"
  | "X"
  | "Email"
  | "Organic"
  | "Multi-platform"

export type CampaignType = "search" | "display" | "video" | "social" | "email" | "organic" | "multi-platform"

export type CampaignObjective =
  | "lead_generation"
  | "booking"
  | "purchase"
  | "newsletter_signup"
  | "content_engagement"
  | "authority_building"

export type ProblemAwarenessLevel =
  | "Unaware"
  | "Problem Aware"
  | "Solution Aware"
  | "Offer Aware"
  | "Ready to Buy"

export interface AudiencePool {
  id: string
  clientId: string
  brandId: string
  name: string
  description: string
  industry: string
  locationFocus: string
  roleTitle: string
  businessStage: string
  problemAwarenessLevel: ProblemAwarenessLevel
  mainPainPoints: string[]
  desiredOutcome: string
  objections: string[]
  searchIntent: string
  keywordsThemes: string[]
  negativeKeywords: string[]
  bestContentAngles: string[]
  bestOfferFit: string
  preferredTone: string
  notes: string
}

export interface AudienceBuildOut extends AudiencePool {
  source: "existing" | "new_build"
}

export interface ClientContent {
  id: string
  clientId: string
  brandId: string
  title: string
  contentType: string
  url: string
  category: string
  funnelFit: string
  audienceFit: string
  relatedOfferId?: string
  cta: string
  seoKeyword?: string
  status: "live" | "draft" | "idea" | "needs_update"
  koraRecommendation: string
}

export interface CampaignContent {
  clientId: string
  campaignId: string
  contentId: string
  role: "warm_up" | "landing_page" | "proof" | "retargeting" | "future_idea"
}

export interface ClientOffer {
  id: string
  clientId: string
  brandId: string
  name: string
  offerType: string
  price?: number
  url: string
  primaryCta: string
  conversionEvent: string
  notes: string
}

export interface CampaignOffer {
  clientId: string
  campaignId: string
  offerId: string
  offerPath: string
}

export interface CampaignFunnel {
  id: string
  clientId: string
  brandId: string
  name: string
  entrySource: string
  entryPage: string
  contentPage: string
  cta: string
  offerPage: string
  formBookingCheckoutStep: string
  thankYouPage: string
  followUpAction: string
}

export interface CampaignFunnelStep {
  id: string
  clientId: string
  funnelId: string
  stepOrder: number
  name: string
  eventName: string
  expectedAction: string
}

export interface Campaign {
  id: string
  clientId: string
  brandId: string
  workspaceId?: string
  organizationId?: string
  name: string
  objective: CampaignObjective
  platform: CampaignPlatform
  campaignType: CampaignType
  status: CampaignStatus
  owner: string
  startDate: string
  endDate?: string
  dailyBudget: number
  totalBudget: number
  notes: string
  audiencePoolId: string
  contentIds: string[]
  offerId: string
  funnelId: string
}

export interface GoogleSearchCampaignSetup {
  id: string
  clientId: string
  campaignId: string
  googleAdsCampaignName: string
  objective: string
  locationTargeting: string
  language: string
  dailyBudget: number
  biddingStrategy: string
  finalUrl: string
  trackingTemplate: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmContent: string
  utmTerm: string
}

export interface GoogleAdGroup {
  id: string
  clientId: string
  campaignId: string
  audiencePoolId: string
  contentId: string
  offerId: string
  name: string
  problemAngle: string
  audienceSegment: string
  keywordList: string[]
  negativeKeywordList: string[]
  landingPage: string
  offerPath: string
  adHeadlines: string[]
  adDescriptions: string[]
  cta: string
  status: CampaignStatus
}

export interface GoogleKeyword {
  id: string
  clientId: string
  campaignId: string
  adGroupId: string
  keyword: string
  matchType: "exact" | "phrase" | "broad"
  intentLevel: "low" | "medium" | "high"
  funnelStage: "awareness" | "consideration" | "conversion"
  notes: string
  status: "active" | "paused" | "negative"
}

export interface GoogleNegativeKeyword {
  id: string
  clientId: string
  campaignId: string
  adGroupId: string
  keyword: string
  notes: string
}

export interface GoogleSearchAd {
  id: string
  clientId: string
  campaignId: string
  adGroupId: string
  audiencePainAngle: string
  brandVoiceNote: string
  headline1: string
  headline2: string
  headline3: string
  description1: string
  description2: string
  finalUrl: string
  displayPath: string
  cta: string
  notes: string
}

export interface CampaignTrackingPlan {
  id: string
  clientId: string
  brandId: string
  campaignId: string
  audiencePoolId?: string
  contentId?: string
  offerId?: string
  funnelId?: string
  trackedEvents: string[]
  analyticsViews: string[]
}

export interface CampaignAnalyticsSnapshot {
  id: string
  clientId: string
  brandId: string
  campaignId: string
  dateRange: string
  impressions: number
  clicks: number
  conversions: number
  spend: number
  revenue: number
  ctaClicks: number
  contentViews: number
  recommendationCount: number
}

export interface KoraCampaignRecommendation {
  id: string
  clientId: string
  campaignId?: string
  findingType: "opportunity" | "warning" | "trend" | "content" | "offer" | "audience" | "cross_client_pattern"
  title: string
  summary: string
  evidence: string
  recommendation: string
  priority: "low" | "medium" | "high" | "urgent"
  status: "new" | "reviewed" | "in_progress" | "resolved" | "dismissed"
  dateRange: string
}

export const campaignPlatforms: CampaignPlatform[] = [
  "Google Search",
  "Google Display",
  "YouTube",
  "Meta",
  "TikTok",
  "LinkedIn",
  "X",
  "Email",
  "Organic",
  "Multi-platform",
]

export const channelLabels: Record<string, CampaignPlatform | "All Campaigns"> = {
  google: "Google Search",
  display: "Google Display",
  youtube: "YouTube",
  facebook: "Meta",
  instagram: "Meta",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  x: "X",
  email: "Email",
  organic: "Organic",
}

export const brands: Brand[] = [
  {
    id: "brand-jahknowspr",
    clientId: "jahknowspr",
    name: "JahKnowsPR",
    brandType: "Strategy and PR firm",
    industry: "Brand strategy, PR, content intelligence",
    website: "https://jahknowspr.com",
    voiceNote: "Direct strategy language with practical next steps.",
  },
  {
    id: "brand-mont-city-network",
    clientId: "mont-city-network",
    name: "Mont City Network",
    brandType: "Media network",
    industry: "Local culture, sports, documentary media",
    website: "https://montcitynetwork.com",
    voiceNote: "Media and storytelling language rooted in community pride.",
  },
  {
    id: "brand-arobias",
    clientId: "arobias-unique-boutique",
    name: "Arobia's Unique Boutique",
    brandType: "Service business",
    industry: "Luxury wig services",
    website: "https://arobiasuniqueboutique.com",
    voiceNote: "Polished, reassuring, service-led luxury voice.",
  },
  {
    id: "brand-eb-digital-magazine",
    clientId: "eb-digital-magazine",
    name: "EB Digital Magazine",
    brandType: "Digital publication",
    industry: "Lifestyle, luxury, and creative culture",
    website: "https://ebdigitalmagazine.com",
    voiceNote: "Editorial, refined, culture-forward language.",
  },
]

export const audiencePools: AudiencePool[] = [
  {
    id: "aud-jkp-content-no-conversions",
    clientId: "jahknowspr",
    brandId: "brand-jahknowspr",
    name: "Entrepreneurs with content but no conversions",
    description: "Business owners publishing consistently without turning attention into leads.",
    industry: "Professional services and creator businesses",
    locationFocus: "United States",
    roleTitle: "Founder, creator, consultant",
    businessStage: "Active audience, unclear funnel",
    problemAwarenessLevel: "Problem Aware",
    mainPainPoints: ["Content gets views but no inquiries", "No clear offer path", "Weak CTA structure"],
    desiredOutcome: "Turn existing attention into audit requests or strategy calls.",
    objections: ["I already post content", "I do not want another generic funnel"],
    searchIntent: "Looking for why content marketing is not converting.",
    keywordsThemes: ["content not converting", "brand audit", "marketing funnel help"],
    negativeKeywords: ["free templates", "jobs", "internship"],
    bestContentAngles: ["Diagnose the conversion gap", "Show how CTA paths work"],
    bestOfferFit: "Free Audit Diagnosis",
    preferredTone: "Direct and diagnostic",
    notes: "Strong fit for Google Search and blog retargeting.",
  },
  {
    id: "aud-jkp-authority-brands",
    clientId: "jahknowspr",
    brandId: "brand-jahknowspr",
    name: "Personal brands needing authority",
    description: "Experts who need stronger authority positioning and proof.",
    industry: "Coaches, consultants, experts",
    locationFocus: "United States",
    roleTitle: "Founder, expert, speaker",
    businessStage: "Revenue active, authority underbuilt",
    problemAwarenessLevel: "Solution Aware",
    mainPainPoints: ["Expertise is not packaged", "Content lacks authority", "No PR narrative"],
    desiredOutcome: "Be seen as the obvious expert.",
    objections: ["PR feels expensive", "I do not know what to say"],
    searchIntent: "Looking for brand positioning and authority building.",
    keywordsThemes: ["personal brand strategy", "authority building", "brand positioning"],
    negativeKeywords: ["celebrity gossip", "free logo"],
    bestContentAngles: ["Authority audit", "Message clarity"],
    bestOfferFit: "Strategy Session",
    preferredTone: "Clear and advisory",
    notes: "Best warmed by The Brief posts and strategy pages.",
  },
  {
    id: "aud-jkp-unclear-messaging",
    clientId: "jahknowspr",
    brandId: "brand-jahknowspr",
    name: "Small business owners with unclear messaging",
    description: "Owners who have offers but cannot explain why buyers should care.",
    industry: "Small business services",
    locationFocus: "United States",
    roleTitle: "Owner, operator",
    businessStage: "Offer exists, messaging unclear",
    problemAwarenessLevel: "Problem Aware",
    mainPainPoints: ["Website is vague", "CTA feels weak", "Offer is hard to explain"],
    desiredOutcome: "A clear message and offer path.",
    objections: ["I need leads, not branding"],
    searchIntent: "Looking for message clarity and marketing help.",
    keywordsThemes: ["clear brand message", "website messaging audit"],
    negativeKeywords: ["cheap logo", "name generator"],
    bestContentAngles: ["Before/after messaging examples", "CTA clarity"],
    bestOfferFit: "Brand Blueprint",
    preferredTone: "Plainspoken and useful",
    notes: "Good fit for audit to blueprint funnel.",
  },
  {
    id: "aud-jkp-attention-no-inquiries",
    clientId: "jahknowspr",
    brandId: "brand-jahknowspr",
    name: "Creators who get attention but no inquiries",
    description: "Creators with reach but no structured buyer journey.",
    industry: "Creators and personal brands",
    locationFocus: "United States",
    roleTitle: "Creator, educator, consultant",
    businessStage: "Audience active, monetization inconsistent",
    problemAwarenessLevel: "Offer Aware",
    mainPainPoints: ["Audience likes posts but does not buy", "Offer is buried", "No lead capture"],
    desiredOutcome: "Build an inquiry path from content.",
    objections: ["I do not want to sound salesy"],
    searchIntent: "Looking for content monetization support.",
    keywordsThemes: ["turn followers into clients", "content funnel"],
    negativeKeywords: ["influencer agency jobs"],
    bestContentAngles: ["Soft CTA systems", "Offer path from content"],
    bestOfferFit: "Free Audit Diagnosis",
    preferredTone: "Strategic but simple",
    notes: "Good remarketing audience later.",
  },
  {
    id: "aud-mcn-culture-readers",
    clientId: "mont-city-network",
    brandId: "brand-mont-city-network",
    name: "Local culture readers",
    description: "Readers who follow Beaumont stories, events, and creators.",
    industry: "Local media",
    locationFocus: "Beaumont and Southeast Texas",
    roleTitle: "Reader, community follower",
    businessStage: "Community audience",
    problemAwarenessLevel: "Unaware",
    mainPainPoints: ["Hard to find local stories", "Events are scattered"],
    desiredOutcome: "Stay connected to local culture.",
    objections: ["I do not want another newsletter"],
    searchIntent: "Searching for local events and community stories.",
    keywordsThemes: ["Beaumont events", "Beaumont culture", "local stories"],
    negativeKeywords: ["jobs", "weather"],
    bestContentAngles: ["Community pride", "Local voices"],
    bestOfferFit: "Join Newsletter",
    preferredTone: "Community-rooted and story-first",
    notes: "Organic and search blend.",
  },
  {
    id: "aud-mcn-sports-fans",
    clientId: "mont-city-network",
    brandId: "brand-mont-city-network",
    name: "Beaumont sports fans",
    description: "Local sports fans interested in teams, history, and community impact.",
    industry: "Sports media",
    locationFocus: "Beaumont and Southeast Texas",
    roleTitle: "Fan, parent, alumni",
    businessStage: "Audience development",
    problemAwarenessLevel: "Unaware",
    mainPainPoints: ["Local sports stories are undercovered"],
    desiredOutcome: "Watch meaningful local sports storytelling.",
    objections: ["I can watch clips on social"],
    searchIntent: "Looking for local sports stories and documentaries.",
    keywordsThemes: ["Beaumont sports documentary", "local sports stories"],
    negativeKeywords: ["betting", "fantasy"],
    bestContentAngles: ["Legacy", "Community pride", "Behind the scenes"],
    bestOfferFit: "Watch Trailer",
    preferredTone: "Energetic and cinematic",
    notes: "Best path is trailer to film page.",
  },
  {
    id: "aud-mcn-film-doc",
    clientId: "mont-city-network",
    brandId: "brand-mont-city-network",
    name: "Black film and documentary audiences",
    description: "Viewers who watch culture, community, and independent documentary stories.",
    industry: "Film and documentary",
    locationFocus: "Texas and national niche audience",
    roleTitle: "Viewer, supporter, film fan",
    businessStage: "Audience expansion",
    problemAwarenessLevel: "Solution Aware",
    mainPainPoints: ["Hard to find authentic local documentaries"],
    desiredOutcome: "Discover and support meaningful films.",
    objections: ["I need to know if the story is worth my time"],
    searchIntent: "Searching for Black documentaries and local film stories.",
    keywordsThemes: ["Black documentary", "independent documentary", "Texas film"],
    negativeKeywords: ["free download"],
    bestContentAngles: ["Story impact", "Trailer proof"],
    bestOfferFit: "Watch Trailer",
    preferredTone: "Cinematic and editorial",
    notes: "Video intent with search support.",
  },
  {
    id: "aud-mcn-events",
    clientId: "mont-city-network",
    brandId: "brand-mont-city-network",
    name: "Community event followers",
    description: "People who want local event coverage, RSVPs, and community updates.",
    industry: "Events and local media",
    locationFocus: "Beaumont and Southeast Texas",
    roleTitle: "Community follower",
    businessStage: "Subscriber growth",
    problemAwarenessLevel: "Problem Aware",
    mainPainPoints: ["Missed local events", "No trusted event source"],
    desiredOutcome: "Find what is happening locally.",
    objections: ["Social already has events"],
    searchIntent: "Searching local events and RSVPs.",
    keywordsThemes: ["Beaumont events this weekend", "community events Beaumont"],
    negativeKeywords: ["crime", "weather"],
    bestContentAngles: ["Do not miss this", "Community calendar"],
    bestOfferFit: "Ticket or RSVP",
    preferredTone: "Clear and local",
    notes: "Useful for event story to RSVP funnel.",
  },
  {
    id: "aud-arobia-professional-women",
    clientId: "arobias-unique-boutique",
    brandId: "brand-arobias",
    name: "Professional women seeking luxury wig services",
    description: "Women who need polished hair services that fit work and lifestyle.",
    industry: "Beauty services",
    locationFocus: "Local service area",
    roleTitle: "Professional woman",
    businessStage: "Booking ready",
    problemAwarenessLevel: "Offer Aware",
    mainPainPoints: ["Need a polished look", "Do not want unreliable installs"],
    desiredOutcome: "Look confident without maintenance stress.",
    objections: ["Will it look natural?", "How long will it last?"],
    searchIntent: "Searching for luxury wig installation and consultation.",
    keywordsThemes: ["luxury wig services", "wig consultation", "professional hair maintenance"],
    negativeKeywords: ["cheap wigs", "synthetic wholesale"],
    bestContentAngles: ["Polished work-ready looks", "Luxury maintenance"],
    bestOfferFit: "Book Consultation",
    preferredTone: "Elegant, confident, service-led",
    notes: "High-intent local search.",
  },
  {
    id: "aud-arobia-healthcare-admin",
    clientId: "arobias-unique-boutique",
    brandId: "brand-arobias",
    name: "Nurses and administrators needing polished hair maintenance",
    description: "Healthcare professionals who need a refined style with low upkeep.",
    industry: "Beauty services",
    locationFocus: "Local service area",
    roleTitle: "Nurse, administrator, professional",
    businessStage: "Service-aware",
    problemAwarenessLevel: "Solution Aware",
    mainPainPoints: ["Long shifts", "Need low-maintenance polish"],
    desiredOutcome: "Reliable, professional hair that lasts.",
    objections: ["My schedule is tight"],
    searchIntent: "Looking for reliable hair maintenance services.",
    keywordsThemes: ["low maintenance wig install", "professional wig service"],
    negativeKeywords: ["cosmetology school"],
    bestContentAngles: ["Long-shift beauty", "Maintenance plan"],
    bestOfferFit: "Book Consultation",
    preferredTone: "Warm and professional",
    notes: "Could pair search with retargeting.",
  },
  {
    id: "aud-arobia-events",
    clientId: "arobias-unique-boutique",
    brandId: "brand-arobias",
    name: "Women preparing for events and lifestyle moments",
    description: "Women planning birthdays, travel, weddings, or major personal moments.",
    industry: "Beauty services",
    locationFocus: "Local and regional",
    roleTitle: "Event guest, bride, traveler",
    businessStage: "Booking ready",
    problemAwarenessLevel: "Ready to Buy",
    mainPainPoints: ["Need the look done right", "Timing matters"],
    desiredOutcome: "Arrive prepared and photo-ready.",
    objections: ["Will I get an appointment in time?"],
    searchIntent: "Searching for event hair and wig consultation.",
    keywordsThemes: ["event wig install", "luxury hair appointment"],
    negativeKeywords: ["costume wig"],
    bestContentAngles: ["Event-ready confidence", "Photo-ready styling"],
    bestOfferFit: "Book Consultation",
    preferredTone: "Aspirational and precise",
    notes: "Strong conversion audience.",
  },
  {
    id: "aud-eb-luxury-culture",
    clientId: "eb-digital-magazine",
    brandId: "brand-eb-digital-magazine",
    name: "Emerging luxury and creative culture readers",
    description: "Readers who follow independent culture, luxury lifestyle, and emerging creatives.",
    industry: "Publishing",
    locationFocus: "National",
    roleTitle: "Reader, creator, tastemaker",
    businessStage: "Audience growth",
    problemAwarenessLevel: "Solution Aware",
    mainPainPoints: ["Generic lifestyle content", "Hard to find fresh voices"],
    desiredOutcome: "Discover sharper features and culture stories.",
    objections: ["I already follow magazines on social"],
    searchIntent: "Searching for lifestyle features and creative culture.",
    keywordsThemes: ["digital lifestyle magazine", "creative culture magazine", "luxury features"],
    negativeKeywords: ["pdf download"],
    bestContentAngles: ["Fresh editorial voice", "Emerging luxury stories"],
    bestOfferFit: "Subscribe or Read Feature",
    preferredTone: "Editorial and polished",
    notes: "Organic and search-friendly.",
  },
]

export const clientContent: ClientContent[] = [
  {
    id: "content-jkp-brief-conversions",
    clientId: "jahknowspr",
    brandId: "brand-jahknowspr",
    title: "Why Your Content Is Not Converting",
    contentType: "blog",
    url: "https://jahknowspr.com/brief/content-not-converting",
    category: "The Brief",
    funnelFit: "Warm problem-aware buyers",
    audienceFit: "Content but no conversions",
    relatedOfferId: "offer-jkp-free-audit",
    cta: "Get a Free Audit Diagnosis",
    seoKeyword: "content not converting",
    status: "live",
    koraRecommendation: "Add stronger audit CTA above the fold and after the first proof section.",
  },
  {
    id: "content-jkp-free-audit",
    clientId: "jahknowspr",
    brandId: "brand-jahknowspr",
    title: "Free Audit Diagnosis",
    contentType: "audit page",
    url: "https://jahknowspr.com/free-audit",
    category: "Offer page",
    funnelFit: "Conversion",
    audienceFit: "Problem-aware and offer-aware audiences",
    relatedOfferId: "offer-jkp-free-audit",
    cta: "Start Diagnosis",
    seoKeyword: "brand audit",
    status: "live",
    koraRecommendation: "Use as the primary final URL for high-intent search.",
  },
  {
    id: "content-mcn-trailer",
    clientId: "mont-city-network",
    brandId: "brand-mont-city-network",
    title: "4 The City Documentary Trailer",
    contentType: "trailer",
    url: "https://montcitynetwork.com/4-the-city",
    category: "Documentary",
    funnelFit: "Warm up and conversion",
    audienceFit: "Sports, film, and local culture audiences",
    relatedOfferId: "offer-mcn-watch-trailer",
    cta: "Watch Trailer",
    seoKeyword: "Beaumont sports documentary",
    status: "live",
    koraRecommendation: "Pair trailer viewers with newsletter follow-up.",
  },
  {
    id: "content-arobia-consultation",
    clientId: "arobias-unique-boutique",
    brandId: "brand-arobias",
    title: "Luxury Wig Consultation Page",
    contentType: "landing page",
    url: "https://arobiasuniqueboutique.com/consultation",
    category: "Offer page",
    funnelFit: "Conversion",
    audienceFit: "Professional women and event-ready buyers",
    relatedOfferId: "offer-arobia-consultation",
    cta: "Book Consultation",
    seoKeyword: "luxury wig services",
    status: "live",
    koraRecommendation: "Show consultation outcomes and natural-look proof near the CTA.",
  },
  {
    id: "content-eb-feature",
    clientId: "eb-digital-magazine",
    brandId: "brand-eb-digital-magazine",
    title: "Emerging Luxury Culture Feature",
    contentType: "feature article",
    url: "https://ebdigitalmagazine.com/features/emerging-luxury-culture",
    category: "Feature",
    funnelFit: "Warm up",
    audienceFit: "Luxury and creative culture readers",
    relatedOfferId: "offer-eb-subscribe",
    cta: "Subscribe",
    seoKeyword: "digital lifestyle magazine",
    status: "live",
    koraRecommendation: "Add related feature links to increase content depth before subscription CTA.",
  },
]

export const clientOffers: ClientOffer[] = [
  {
    id: "offer-jkp-free-audit",
    clientId: "jahknowspr",
    brandId: "brand-jahknowspr",
    name: "Free Audit Diagnosis",
    offerType: "Lead magnet",
    price: 0,
    url: "https://jahknowspr.com/free-audit",
    primaryCta: "Start Diagnosis",
    conversionEvent: "audit_request_submit",
    notes: "Primary proof-of-concept offer for JahKnowsPR.",
  },
  {
    id: "offer-mcn-watch-trailer",
    clientId: "mont-city-network",
    brandId: "brand-mont-city-network",
    name: "Watch Trailer or Join Newsletter",
    offerType: "Media engagement",
    price: 0,
    url: "https://montcitynetwork.com/4-the-city",
    primaryCta: "Watch Trailer",
    conversionEvent: "video_play",
    notes: "Secondary CTA should capture newsletter signups.",
  },
  {
    id: "offer-arobia-consultation",
    clientId: "arobias-unique-boutique",
    brandId: "brand-arobias",
    name: "Book Consultation",
    offerType: "Service booking",
    url: "https://arobiasuniqueboutique.com/consultation",
    primaryCta: "Book Consultation",
    conversionEvent: "booking_click",
    notes: "High-intent local search offer.",
  },
  {
    id: "offer-eb-subscribe",
    clientId: "eb-digital-magazine",
    brandId: "brand-eb-digital-magazine",
    name: "Subscribe or Read Feature",
    offerType: "Subscription/content",
    price: 0,
    url: "https://ebdigitalmagazine.com/subscribe",
    primaryCta: "Subscribe",
    conversionEvent: "newsletter_signup",
    notes: "Use feature content before subscription asks.",
  },
]

export const campaignFunnels: CampaignFunnel[] = [
  {
    id: "funnel-jkp-blog-to-audit",
    clientId: "jahknowspr",
    brandId: "brand-jahknowspr",
    name: "Blog to Free Audit",
    entrySource: "Google Search",
    entryPage: "Search ad",
    contentPage: "Why Your Content Is Not Converting",
    cta: "Get a Free Audit Diagnosis",
    offerPage: "Free Audit Diagnosis",
    formBookingCheckoutStep: "Audit request form",
    thankYouPage: "Audit confirmation",
    followUpAction: "KORA finding and owner review",
  },
  {
    id: "funnel-mcn-story-to-newsletter",
    clientId: "mont-city-network",
    brandId: "brand-mont-city-network",
    name: "Story to Newsletter Signup",
    entrySource: "Google Search",
    entryPage: "Search ad",
    contentPage: "4 The City Trailer",
    cta: "Watch Trailer",
    offerPage: "Film page",
    formBookingCheckoutStep: "Newsletter signup",
    thankYouPage: "Subscription confirmation",
    followUpAction: "Send film updates",
  },
  {
    id: "funnel-arobia-booking",
    clientId: "arobias-unique-boutique",
    brandId: "brand-arobias",
    name: "Landing Page to Booking",
    entrySource: "Google Search",
    entryPage: "Search ad",
    contentPage: "Luxury Wig Consultation Page",
    cta: "Book Consultation",
    offerPage: "Consultation page",
    formBookingCheckoutStep: "Booking form",
    thankYouPage: "Booking confirmation",
    followUpAction: "Consultation prep message",
  },
  {
    id: "funnel-eb-feature-subscribe",
    clientId: "eb-digital-magazine",
    brandId: "brand-eb-digital-magazine",
    name: "Feature to Newsletter Signup",
    entrySource: "Organic/Search",
    entryPage: "Search ad or feature share",
    contentPage: "Emerging Luxury Culture Feature",
    cta: "Subscribe",
    offerPage: "Subscribe page",
    formBookingCheckoutStep: "Newsletter signup",
    thankYouPage: "Welcome page",
    followUpAction: "Send editorial welcome sequence",
  },
]

export const campaigns: Campaign[] = [
  {
    id: "camp-jkp-content-not-converting",
    clientId: "jahknowspr",
    brandId: "brand-jahknowspr",
    workspaceId: "workspace-kora",
    name: "Content Not Converting Search Campaign",
    objective: "lead_generation",
    platform: "Google Search",
    campaignType: "search",
    status: "testing",
    owner: "KORA",
    startDate: "2026-05-01",
    dailyBudget: 45,
    totalBudget: 1200,
    notes: "Proof campaign for Free Audit Diagnosis demand capture.",
    audiencePoolId: "aud-jkp-content-no-conversions",
    contentIds: ["content-jkp-brief-conversions", "content-jkp-free-audit"],
    offerId: "offer-jkp-free-audit",
    funnelId: "funnel-jkp-blog-to-audit",
  },
  {
    id: "camp-mcn-4-the-city",
    clientId: "mont-city-network",
    brandId: "brand-mont-city-network",
    workspaceId: "workspace-kora",
    name: "4 The City Documentary Search Campaign",
    objective: "content_engagement",
    platform: "Google Search",
    campaignType: "search",
    status: "ready",
    owner: "KORA",
    startDate: "2026-05-06",
    dailyBudget: 35,
    totalBudget: 900,
    notes: "Search demand capture for trailer views and newsletter joins.",
    audiencePoolId: "aud-mcn-sports-fans",
    contentIds: ["content-mcn-trailer"],
    offerId: "offer-mcn-watch-trailer",
    funnelId: "funnel-mcn-story-to-newsletter",
  },
  {
    id: "camp-arobia-luxury-wigs",
    clientId: "arobias-unique-boutique",
    brandId: "brand-arobias",
    workspaceId: "workspace-kora",
    name: "Luxury Wig Services Search Campaign",
    objective: "booking",
    platform: "Google Search",
    campaignType: "search",
    status: "planning",
    owner: "KORA",
    startDate: "2026-05-10",
    dailyBudget: 30,
    totalBudget: 750,
    notes: "High-intent service campaign for consultation bookings.",
    audiencePoolId: "aud-arobia-professional-women",
    contentIds: ["content-arobia-consultation"],
    offerId: "offer-arobia-consultation",
    funnelId: "funnel-arobia-booking",
  },
  {
    id: "camp-eb-lifestyle-authority",
    clientId: "eb-digital-magazine",
    brandId: "brand-eb-digital-magazine",
    workspaceId: "workspace-kora",
    name: "Lifestyle Authority Content Campaign",
    objective: "newsletter_signup",
    platform: "Organic",
    campaignType: "organic",
    status: "draft",
    owner: "KORA",
    startDate: "2026-05-12",
    dailyBudget: 0,
    totalBudget: 0,
    notes: "Editorial authority campaign that can expand to paid search later.",
    audiencePoolId: "aud-eb-luxury-culture",
    contentIds: ["content-eb-feature"],
    offerId: "offer-eb-subscribe",
    funnelId: "funnel-eb-feature-subscribe",
  },
]

export const googleSearchSetups: GoogleSearchCampaignSetup[] = campaigns
  .filter((campaign) => campaign.platform === "Google Search")
  .map((campaign) => {
    const slug = campaign.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
    const clientSlug = campaign.clientId.replace(/[^a-z0-9]+/g, "_")
    const offer = clientOffers.find((item) => item.id === campaign.offerId)
    return {
      id: `setup-${campaign.id}`,
      clientId: campaign.clientId,
      campaignId: campaign.id,
      googleAdsCampaignName: campaign.name,
      objective: campaign.objective,
      locationTargeting: campaign.clientId === "mont-city-network" ? "Beaumont, TX and Southeast Texas" : "United States",
      language: "English",
      dailyBudget: campaign.dailyBudget,
      biddingStrategy: "Maximize conversions",
      finalUrl: offer?.url || "",
      trackingTemplate: "{lpurl}?utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_content={creative}&utm_term={keyword}",
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: `${clientSlug}_${slug}`,
      utmContent: "{ad_group_slug}",
      utmTerm: "{keyword}",
    }
  })

export const googleAdGroups: GoogleAdGroup[] = campaigns
  .filter((campaign) => campaign.platform === "Google Search")
  .map((campaign) => {
    const audience = audiencePools.find((pool) => pool.id === campaign.audiencePoolId)
    const content = clientContent.find((item) => item.id === campaign.contentIds[0])
    const offer = clientOffers.find((item) => item.id === campaign.offerId)
    return {
      id: `adgroup-${campaign.id}`,
      clientId: campaign.clientId,
      campaignId: campaign.id,
      audiencePoolId: campaign.audiencePoolId,
      contentId: content?.id || "",
      offerId: campaign.offerId,
      name: `${audience?.name || "Audience"} - Search Intent`,
      problemAngle: audience?.mainPainPoints[0] || "Need clearer conversion path",
      audienceSegment: audience?.name || "Client audience",
      keywordList: audience?.keywordsThemes || [],
      negativeKeywordList: audience?.negativeKeywords || [],
      landingPage: content?.url || offer?.url || "",
      offerPath: offer?.url || "",
      adHeadlines: [offer?.primaryCta || "Learn More", campaign.name, audience?.desiredOutcome || "Get clarity"],
      adDescriptions: [
        audience?.desiredOutcome || "Find the right next step.",
        offer ? `${offer.name} helps move the right audience toward action.` : "Move the right audience toward action.",
      ],
      cta: offer?.primaryCta || "Learn More",
      status: campaign.status,
    }
  })

export const googleKeywords: GoogleKeyword[] = googleAdGroups.flatMap((adGroup) =>
  adGroup.keywordList.slice(0, 4).map((keyword, index) => ({
    id: `kw-${adGroup.id}-${index}`,
    clientId: adGroup.clientId,
    campaignId: adGroup.campaignId,
    adGroupId: adGroup.id,
    keyword,
    matchType: index === 0 ? "exact" : "phrase",
    intentLevel: index < 2 ? "high" : "medium",
    funnelStage: index < 2 ? "conversion" : "consideration",
    notes: "Seed keyword from client-specific audience pool.",
    status: "active",
  })),
)

export const googleNegativeKeywords: GoogleNegativeKeyword[] = googleAdGroups.flatMap((adGroup) =>
  adGroup.negativeKeywordList.map((keyword, index) => ({
    id: `neg-${adGroup.id}-${index}`,
    clientId: adGroup.clientId,
    campaignId: adGroup.campaignId,
    adGroupId: adGroup.id,
    keyword,
    notes: "Exclude low-fit traffic for this client's offer.",
  })),
)

export const googleSearchAds: GoogleSearchAd[] = googleAdGroups.map((adGroup) => {
  const brand = brands.find((item) => item.clientId === adGroup.clientId)
  return {
    id: `ad-${adGroup.id}`,
    clientId: adGroup.clientId,
    campaignId: adGroup.campaignId,
    adGroupId: adGroup.id,
    audiencePainAngle: adGroup.problemAngle,
    brandVoiceNote: brand?.voiceNote || "Adapt copy to selected client voice.",
    headline1: adGroup.adHeadlines[0],
    headline2: adGroup.adHeadlines[1],
    headline3: adGroup.adHeadlines[2],
    description1: adGroup.adDescriptions[0],
    description2: adGroup.adDescriptions[1],
    finalUrl: adGroup.landingPage,
    displayPath: adGroup.clientId.replace(/-/g, "/"),
    cta: adGroup.cta,
    notes: "Generated from client audience, offer, and brand context.",
  }
})

export const campaignTrackingPlans: CampaignTrackingPlan[] = campaigns.map((campaign) => ({
  id: `tracking-${campaign.id}`,
  clientId: campaign.clientId,
  brandId: campaign.brandId,
  campaignId: campaign.id,
  audiencePoolId: campaign.audiencePoolId,
  contentId: campaign.contentIds[0],
  offerId: campaign.offerId,
  funnelId: campaign.funnelId,
  trackedEvents: [
    "ad_click",
    "page_view",
    "content_view",
    "blog_view",
    "story_view",
    "cta_click",
    "offer_page_view",
    "form_start",
    "form_submit",
    "booking_click",
    "checkout_start",
    "purchase_complete",
    "newsletter_signup",
    "video_play",
    "report_download",
  ],
  analyticsViews: ["Client Campaign Analytics", "Campaign Detail Analytics", "Global Mission Control Analytics"],
}))

export const campaignAnalyticsSnapshots: CampaignAnalyticsSnapshot[] = [
  {
    id: "snap-jkp-content",
    clientId: "jahknowspr",
    brandId: "brand-jahknowspr",
    campaignId: "camp-jkp-content-not-converting",
    dateRange: "Last 14 days",
    impressions: 4200,
    clicks: 312,
    conversions: 18,
    spend: 486,
    revenue: 0,
    ctaClicks: 64,
    contentViews: 580,
    recommendationCount: 2,
  },
  {
    id: "snap-mcn-doc",
    clientId: "mont-city-network",
    brandId: "brand-mont-city-network",
    campaignId: "camp-mcn-4-the-city",
    dateRange: "Projected first 14 days",
    impressions: 2800,
    clicks: 210,
    conversions: 42,
    spend: 0,
    revenue: 0,
    ctaClicks: 58,
    contentViews: 390,
    recommendationCount: 1,
  },
  {
    id: "snap-arobia-luxury",
    clientId: "arobias-unique-boutique",
    brandId: "brand-arobias",
    campaignId: "camp-arobia-luxury-wigs",
    dateRange: "Projected first 14 days",
    impressions: 1600,
    clicks: 120,
    conversions: 14,
    spend: 0,
    revenue: 0,
    ctaClicks: 31,
    contentViews: 180,
    recommendationCount: 1,
  },
  {
    id: "snap-eb-authority",
    clientId: "eb-digital-magazine",
    brandId: "brand-eb-digital-magazine",
    campaignId: "camp-eb-lifestyle-authority",
    dateRange: "Projected first 14 days",
    impressions: 2200,
    clicks: 170,
    conversions: 28,
    spend: 0,
    revenue: 0,
    ctaClicks: 44,
    contentViews: 310,
    recommendationCount: 1,
  },
]

export const koraCampaignRecommendations: KoraCampaignRecommendation[] = [
  {
    id: "rec-jkp-cta",
    clientId: "jahknowspr",
    campaignId: "camp-jkp-content-not-converting",
    findingType: "content",
    title: "Free Audit CTA is the strongest path for this audience",
    summary: "Problem-aware entrepreneurs respond best when the ad and blog both lead to diagnosis language.",
    evidence: "64 CTA clicks and 18 audit submits are concentrated around content-not-converting intent.",
    recommendation: "Keep the final URL on the audit path and test a second ad group around brand audit terms.",
    priority: "high",
    status: "new",
    dateRange: "Last 14 days",
  },
  {
    id: "rec-mcn-trailer",
    clientId: "mont-city-network",
    campaignId: "camp-mcn-4-the-city",
    findingType: "audience",
    title: "Sports and culture audiences need different trailer hooks",
    summary: "The documentary can use separate ad groups for local sports legacy and community story impact.",
    evidence: "Sports keywords and culture keywords imply different motivation paths.",
    recommendation: "Split the campaign into Sports Legacy and Community Story ad groups before launch.",
    priority: "medium",
    status: "new",
    dateRange: "Planning",
  },
  {
    id: "rec-arobia-proof",
    clientId: "arobias-unique-boutique",
    campaignId: "camp-arobia-luxury-wigs",
    findingType: "offer",
    title: "Consultation page needs trust proof before the booking CTA",
    summary: "The audience is ready to buy but wants reassurance that the look will be natural and reliable.",
    evidence: "Top objections are natural look, appointment timing, and maintenance confidence.",
    recommendation: "Add proof photos, maintenance expectations, and booking availability near the first CTA.",
    priority: "high",
    status: "new",
    dateRange: "Planning",
  },
  {
    id: "rec-eb-links",
    clientId: "eb-digital-magazine",
    campaignId: "camp-eb-lifestyle-authority",
    findingType: "content",
    title: "Feature content should deepen before asking for subscription",
    summary: "Lifestyle readers need more editorial proof before the signup ask.",
    evidence: "Audience objections show they already follow magazine content on social.",
    recommendation: "Add two related feature links and a stronger editorial promise before the subscribe CTA.",
    priority: "medium",
    status: "new",
    dateRange: "Planning",
  },
  {
    id: "rec-cross-client-search",
    clientId: "global",
    findingType: "cross_client_pattern",
    title: "High-intent search works best when offer and content match the same pain",
    summary: "Across clients, campaigns are strongest when the ad group, warm-up content, and offer CTA all speak to one specific problem.",
    evidence: "JahKnowsPR, Arobia, and Mont City mock plans each improve when audience pain maps directly to one offer path.",
    recommendation: "Require every new campaign to select one audience pain angle before ad copy generation.",
    priority: "medium",
    status: "new",
    dateRange: "Cross-client planning",
  },
]

export function getClientBrand(clientId: string): Brand | undefined {
  return brands.find((brand) => brand.clientId === clientId)
}

export function getClientCampaignData(clientId: string) {
  return {
    brand: getClientBrand(clientId),
    campaigns: campaigns.filter((campaign) => campaign.clientId === clientId),
    audiencePools: audiencePools.filter((pool) => pool.clientId === clientId),
    content: clientContent.filter((content) => content.clientId === clientId),
    offers: clientOffers.filter((offer) => offer.clientId === clientId),
    funnels: campaignFunnels.filter((funnel) => funnel.clientId === clientId),
    recommendations: koraCampaignRecommendations.filter((recommendation) => recommendation.clientId === clientId),
  }
}

export function getCampaignContext(campaignId: string) {
  const campaign = campaigns.find((item) => item.id === campaignId)
  if (!campaign) return null
  return {
    campaign,
    brand: brands.find((item) => item.id === campaign.brandId),
    audiencePool: audiencePools.find((item) => item.id === campaign.audiencePoolId),
    content: clientContent.filter((item) => campaign.contentIds.includes(item.id)),
    offer: clientOffers.find((item) => item.id === campaign.offerId),
    funnel: campaignFunnels.find((item) => item.id === campaign.funnelId),
    googleSetup: googleSearchSetups.find((item) => item.campaignId === campaign.id),
    adGroups: googleAdGroups.filter((item) => item.campaignId === campaign.id),
    ads: googleSearchAds.filter((item) => item.campaignId === campaign.id),
    trackingPlan: campaignTrackingPlans.find((item) => item.campaignId === campaign.id),
    analytics: campaignAnalyticsSnapshots.find((item) => item.campaignId === campaign.id),
    recommendations: koraCampaignRecommendations.filter((item) => item.campaignId === campaign.id),
  }
}
