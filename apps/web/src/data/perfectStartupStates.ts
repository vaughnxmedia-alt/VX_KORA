export type StartupFaq = {
  question: string;
  answer: string;
};

export type PerfectStartupStateGuide = {
  name: string;
  slug: string;
  abbreviation: string;
  filingOfficeName: string;
  filingOfficeUrl: string;
  taxOfficeName: string;
  taxOfficeUrl: string;
  commonStructures: string[];
  startupSteps: string[];
  stateSpecificNotes: string[];
  localPermitReminder: string;
  faqs: StartupFaq[];
  lastReviewed: string;
  needsReview: boolean;
  bestFor: string[];
  disclaimer: string;
  isSeededGuide?: boolean;
};

export const PERFECT_STARTUP_DISCLAIMER =
  "This guide is for general education only and is not legal, tax, or financial advice. Business requirements can change, so always confirm details with your Secretary of State, tax office, local city/county office, and a licensed professional when needed.";

export const STARTUP_STEPS = [
  "Choose your business idea and audience",
  "Choose a business name",
  "Check name availability",
  "Choose a business structure",
  "Register with the state",
  "Get an EIN",
  "Get a D-U-N-S Number if you plan to build business credit, seek contracts, or work with larger organizations",
  "Register for state taxes if needed",
  "Open a business bank account",
  "Check city/county permits",
  "Set up bookkeeping",
  "Create brand basics",
  "Build your first offer",
  "Set up your online presence",
  "Start marketing with a simple launch plan",
];

export const STARTUP_CHECKLIST = [
  "Business name selected",
  "Name availability checked",
  "Business structure chosen",
  "State registration completed",
  "EIN received",
  "Bank account opened",
  "Basic bookkeeping system selected",
  "Local permits reviewed",
  "Offer clearly defined",
  "Target audience identified",
  "Brand message drafted",
  "Website or landing page planned",
  "Social media handles secured",
  "First marketing plan created",
];

export const COMMON_STARTUP_MISTAKES = [
  "Starting with a logo before the offer is clear",
  "Picking a name without checking availability",
  "Mixing personal and business money",
  "Posting online without a clear audience",
  "Not understanding local permit requirements",
  "Selling services without a simple intake or payment process",
  "Building a brand without a clear next step",
];

export const PERFECT_STARTUP_CATEGORY = "The Perfect Startup";

const COMMON_STRUCTURES = ["Sole Proprietorship", "LLC", "Corporation", "Nonprofit"];

const OFFICIAL_FILING_OFFICES: Record<string, { name: string; url: string }> = {
  alabama: { name: "Alabama Secretary of State", url: "https://www.sos.alabama.gov/business-services" },
  alaska: { name: "Alaska Division of Corporations, Business and Professional Licensing", url: "https://www.commerce.alaska.gov/web/cbpl/Corporations.aspx" },
  arizona: { name: "Arizona Corporation Commission", url: "https://www.azcc.gov/corporations" },
  arkansas: { name: "Arkansas Secretary of State", url: "https://www.sos.arkansas.gov/business-commercial-services-bcs" },
  california: { name: "California Secretary of State", url: "https://bizfileonline.sos.ca.gov/" },
  colorado: { name: "Colorado Secretary of State", url: "https://www.sos.state.co.us/pubs/business/businessHome.html" },
  connecticut: { name: "Connecticut Secretary of the State", url: "https://portal.ct.gov/sots/business-services" },
  delaware: { name: "Delaware Division of Corporations", url: "https://corp.delaware.gov/" },
  florida: { name: "Florida Division of Corporations / Sunbiz", url: "https://dos.fl.gov/sunbiz/" },
  georgia: { name: "Georgia Secretary of State", url: "https://sos.ga.gov/" },
  hawaii: { name: "Hawaii Business Registration Division", url: "https://cca.hawaii.gov/breg/" },
  idaho: { name: "Idaho Secretary of State", url: "https://sosbiz.idaho.gov/" },
  illinois: { name: "Illinois Secretary of State Business Services", url: "https://www.ilsos.gov/departments/business_services/home.html" },
  indiana: { name: "Indiana INBiz", url: "https://inbiz.in.gov/" },
  iowa: { name: "Iowa Secretary of State", url: "https://sos.iowa.gov/business/" },
  kansas: { name: "Kansas Secretary of State", url: "https://sos.ks.gov/business/business.html" },
  kentucky: { name: "Kentucky Secretary of State", url: "https://www.sos.ky.gov/bus/Pages/default.aspx" },
  louisiana: { name: "Louisiana Secretary of State", url: "https://www.sos.la.gov/BusinessServices/" },
  maine: { name: "Maine Bureau of Corporations, Elections and Commissions", url: "https://www.maine.gov/sos/cec/corp/" },
  maryland: { name: "Maryland Business Express", url: "https://businessexpress.maryland.gov/" },
  massachusetts: { name: "Massachusetts Secretary of the Commonwealth Corporations Division", url: "https://www.sec.state.ma.us/divisions/corporations/corporations.htm" },
  michigan: { name: "Michigan Corporations Division", url: "https://www.michigan.gov/lara/bureau-list/cscl" },
  minnesota: { name: "Minnesota Secretary of State", url: "https://www.sos.state.mn.us/business-liens/" },
  mississippi: { name: "Mississippi Secretary of State", url: "https://www.sos.ms.gov/business-services" },
  missouri: { name: "Missouri Secretary of State", url: "https://www.sos.mo.gov/business/corporations" },
  montana: { name: "Montana Secretary of State", url: "https://biz.sosmt.gov/" },
  nebraska: { name: "Nebraska Secretary of State", url: "https://sos.nebraska.gov/business-services" },
  nevada: { name: "Nevada Secretary of State", url: "https://www.nvsos.gov/sos/businesses" },
  "new-hampshire": { name: "New Hampshire Secretary of State", url: "https://www.sos.nh.gov/corporation-ucc-securities/corporation" },
  "new-jersey": { name: "New Jersey Division of Revenue and Enterprise Services", url: "https://www.njportal.com/DOR/BusinessFormation/Home/Welcome" },
  "new-mexico": { name: "New Mexico Secretary of State", url: "https://www.sos.nm.gov/business-services/" },
  "new-york": { name: "New York Department of State, Division of Corporations", url: "https://dos.ny.gov/division-corporations" },
  "north-carolina": { name: "North Carolina Secretary of State", url: "https://www.sosnc.gov/divisions/business_registration" },
  "north-dakota": { name: "North Dakota Secretary of State", url: "https://sos.nd.gov/business/business-services" },
  ohio: { name: "Ohio Secretary of State", url: "https://www.ohiosos.gov/businesses/" },
  oklahoma: { name: "Oklahoma Secretary of State", url: "https://www.sos.ok.gov/business/default.aspx" },
  oregon: { name: "Oregon Secretary of State", url: "https://sos.oregon.gov/business/Pages/default.aspx" },
  pennsylvania: { name: "Pennsylvania Department of State", url: "https://www.dos.pa.gov/BusinessCharities/Business/Pages/default.aspx" },
  "rhode-island": { name: "Rhode Island Secretary of State", url: "https://www.sos.ri.gov/divisions/business-services" },
  "south-carolina": { name: "South Carolina Secretary of State", url: "https://sos.sc.gov/online-filings/business-entities" },
  "south-dakota": { name: "South Dakota Secretary of State", url: "https://sdsos.gov/business-services/" },
  tennessee: { name: "Tennessee Secretary of State", url: "https://sos.tn.gov/businesses" },
  texas: { name: "Texas Secretary of State", url: "https://www.sos.state.tx.us" },
  utah: { name: "Utah Division of Corporations and Commercial Code", url: "https://corporations.utah.gov/" },
  vermont: { name: "Vermont Secretary of State", url: "https://sos.vermont.gov/corporations/" },
  virginia: { name: "Virginia State Corporation Commission", url: "https://www.scc.virginia.gov/pages/Business-Home" },
  washington: { name: "Washington Secretary of State", url: "https://www.sos.wa.gov/corporations-charities" },
  "west-virginia": { name: "West Virginia Secretary of State", url: "https://sos.wv.gov/business/Pages/default.aspx" },
  wisconsin: { name: "Wisconsin Department of Financial Institutions", url: "https://dfi.wi.gov/Pages/BusinessServices/default.aspx" },
  wyoming: { name: "Wyoming Secretary of State", url: "https://sos.wyo.gov/Business/Default.aspx" },
};

const GENERIC_FAQS = (stateName: string): StartupFaq[] => [
  {
    question: `Do I need an LLC to start a business in ${stateName}?`,
    answer:
      "Not always. Some founders begin as sole proprietors, but an LLC or corporation may help separate the business from the person. Confirm what makes sense with a licensed legal or tax professional.",
  },
  {
    question: "How do I get an EIN?",
    answer:
      "You can apply for an EIN through the IRS. An EIN is often used for banking, hiring, tax accounts, and separating business activity from personal activity.",
  },
  {
    question: "Do I need a business bank account?",
    answer:
      "A separate business bank account is strongly recommended once you start taking money through the business. It helps with bookkeeping, taxes, and trust.",
  },
  {
    question: `Do I need a business license in ${stateName}?`,
    answer:
      "State registration and local licensing are different. Your city, county, industry, or physical location may require permits or licenses. Check official state and local sources before operating.",
  },
  {
    question: "What comes first: LLC, logo, website, or offer?",
    answer:
      "Start with the foundation: business name, structure, offer, audience, and basic registration needs. A logo and website work better once the business is clear.",
  },
  {
    question: "How can JahKnowsPR help me after I start?",
    answer:
      "JahKnowsPR helps founders clarify the audience, offer, message, proof, and next step so the business is easier to understand, trust, and buy from.",
  },
];

const SOURCE_NOTE = "Needs verification from official filing, tax, and local permit sources before publishing exact requirements.";

const seedGuide = (guide: Partial<PerfectStartupStateGuide> & Pick<PerfectStartupStateGuide, "name" | "slug" | "abbreviation">): PerfectStartupStateGuide => ({
  filingOfficeName: OFFICIAL_FILING_OFFICES[guide.slug]?.name ?? `${guide.name} Secretary of State`,
  filingOfficeUrl: OFFICIAL_FILING_OFFICES[guide.slug]?.url ?? "",
  taxOfficeName: `${guide.name} tax or revenue department`,
  taxOfficeUrl: "",
  commonStructures: COMMON_STRUCTURES,
  startupSteps: STARTUP_STEPS,
  stateSpecificNotes: [
    SOURCE_NOTE,
    "Exact filing fees, forms, tax accounts, and permit language should be verified before final publication.",
  ],
  localPermitReminder:
    "Check your city and county for local permits, assumed name rules, home-based business rules, signage rules, sales activity, and industry-specific requirements.",
  faqs: GENERIC_FAQS(guide.name),
  lastReviewed: "2026-05-15",
  needsReview: true,
  bestFor: ["LLCs", "creators", "service businesses", "online businesses", "community-centered brands"],
  disclaimer: PERFECT_STARTUP_DISCLAIMER,
  isSeededGuide: false,
  ...guide,
});

const seededGuides: Record<string, Partial<PerfectStartupStateGuide>> = {
  texas: {
    filingOfficeName: "Texas Secretary of State",
    filingOfficeUrl: "https://www.sos.state.tx.us",
    taxOfficeName: "Texas Comptroller of Public Accounts",
    taxOfficeUrl: "https://comptroller.texas.gov/",
    stateSpecificNotes: [
      "Texas founders should verify entity filing steps with the Texas Secretary of State and tax registration needs with the Texas Comptroller.",
      "Texas does not use one statewide general business license for every business, but local and industry rules may still apply. Verify before operating.",
      "Exact filing fees, forms, assumed name rules, sales tax requirements, and local permit language need official review before publishing final details.",
    ],
    localPermitReminder:
      "Texas businesses should check the city and county where they operate for local permits, assumed name filings, signage rules, health permits, home-based business rules, and industry-specific requirements.",
    bestFor: ["Texas LLCs", "creators", "service businesses", "online businesses", "media brands", "local event businesses"],
    isSeededGuide: true,
  },
  louisiana: {
    filingOfficeName: "Louisiana Secretary of State",
    filingOfficeUrl: "https://www.sos.la.gov/BusinessServices/",
    taxOfficeName: "Louisiana Department of Revenue",
    taxOfficeUrl: "https://revenue.louisiana.gov/",
    stateSpecificNotes: [
      "Verify entity registration with the Louisiana Secretary of State and tax registration needs with the Louisiana Department of Revenue.",
      SOURCE_NOTE,
    ],
    isSeededGuide: true,
  },
  georgia: {
    filingOfficeName: "Georgia Secretary of State",
    filingOfficeUrl: "https://sos.ga.gov/",
    taxOfficeName: "Georgia Department of Revenue",
    taxOfficeUrl: "https://dor.georgia.gov/",
    stateSpecificNotes: [
      "Verify formation and annual registration details with the Georgia Secretary of State.",
      "Verify state tax account needs with the Georgia Department of Revenue.",
      SOURCE_NOTE,
    ],
    isSeededGuide: true,
  },
  florida: {
    filingOfficeName: "Florida Division of Corporations / Sunbiz",
    filingOfficeUrl: "https://dos.fl.gov/sunbiz/",
    taxOfficeName: "Florida Department of Revenue",
    taxOfficeUrl: "https://floridarevenue.com/",
    stateSpecificNotes: [
      "Verify entity registration and name search steps through Sunbiz.",
      "Verify state tax registration needs with the Florida Department of Revenue.",
      SOURCE_NOTE,
    ],
    isSeededGuide: true,
  },
  california: {
    filingOfficeName: "California Secretary of State",
    filingOfficeUrl: "https://bizfileonline.sos.ca.gov/",
    taxOfficeName: "California Department of Tax and Fee Administration / Franchise Tax Board",
    taxOfficeUrl: "https://www.cdtfa.ca.gov/",
    stateSpecificNotes: [
      "Verify entity filings through California's Secretary of State business filing system.",
      "California tax and fee obligations can involve multiple agencies; verify exact requirements with official state sources.",
      SOURCE_NOTE,
    ],
    isSeededGuide: true,
  },
  "new-york": {
    filingOfficeName: "New York Department of State, Division of Corporations",
    filingOfficeUrl: "https://dos.ny.gov/division-corporations",
    taxOfficeName: "New York State Department of Taxation and Finance",
    taxOfficeUrl: "https://www.tax.ny.gov/",
    stateSpecificNotes: [
      "Verify business entity filing requirements with the New York Department of State.",
      "Verify tax registration and account requirements with the New York State Department of Taxation and Finance.",
      SOURCE_NOTE,
    ],
    isSeededGuide: true,
  },
};

const states = [
  ["Alabama", "alabama", "AL"],
  ["Alaska", "alaska", "AK"],
  ["Arizona", "arizona", "AZ"],
  ["Arkansas", "arkansas", "AR"],
  ["California", "california", "CA"],
  ["Colorado", "colorado", "CO"],
  ["Connecticut", "connecticut", "CT"],
  ["Delaware", "delaware", "DE"],
  ["Florida", "florida", "FL"],
  ["Georgia", "georgia", "GA"],
  ["Hawaii", "hawaii", "HI"],
  ["Idaho", "idaho", "ID"],
  ["Illinois", "illinois", "IL"],
  ["Indiana", "indiana", "IN"],
  ["Iowa", "iowa", "IA"],
  ["Kansas", "kansas", "KS"],
  ["Kentucky", "kentucky", "KY"],
  ["Louisiana", "louisiana", "LA"],
  ["Maine", "maine", "ME"],
  ["Maryland", "maryland", "MD"],
  ["Massachusetts", "massachusetts", "MA"],
  ["Michigan", "michigan", "MI"],
  ["Minnesota", "minnesota", "MN"],
  ["Mississippi", "mississippi", "MS"],
  ["Missouri", "missouri", "MO"],
  ["Montana", "montana", "MT"],
  ["Nebraska", "nebraska", "NE"],
  ["Nevada", "nevada", "NV"],
  ["New Hampshire", "new-hampshire", "NH"],
  ["New Jersey", "new-jersey", "NJ"],
  ["New Mexico", "new-mexico", "NM"],
  ["New York", "new-york", "NY"],
  ["North Carolina", "north-carolina", "NC"],
  ["North Dakota", "north-dakota", "ND"],
  ["Ohio", "ohio", "OH"],
  ["Oklahoma", "oklahoma", "OK"],
  ["Oregon", "oregon", "OR"],
  ["Pennsylvania", "pennsylvania", "PA"],
  ["Rhode Island", "rhode-island", "RI"],
  ["South Carolina", "south-carolina", "SC"],
  ["South Dakota", "south-dakota", "SD"],
  ["Tennessee", "tennessee", "TN"],
  ["Texas", "texas", "TX"],
  ["Utah", "utah", "UT"],
  ["Vermont", "vermont", "VT"],
  ["Virginia", "virginia", "VA"],
  ["Washington", "washington", "WA"],
  ["West Virginia", "west-virginia", "WV"],
  ["Wisconsin", "wisconsin", "WI"],
  ["Wyoming", "wyoming", "WY"],
] as const;

export const perfectStartupStates: PerfectStartupStateGuide[] = states.map(([name, slug, abbreviation]) =>
  seedGuide({
    name,
    slug,
    abbreviation,
    ...(seededGuides[slug] ?? {}),
  }),
);

export const optionalTerritoryGuides = [
  { name: "Washington, D.C.", slug: "washington-dc", label: "District of Columbia" },
  { name: "Puerto Rico", slug: "puerto-rico", label: "U.S. Territory" },
  { name: "Guam", slug: "guam", label: "U.S. Territory" },
  { name: "U.S. Virgin Islands", slug: "us-virgin-islands", label: "U.S. Territory" },
  { name: "American Samoa", slug: "american-samoa", label: "U.S. Territory" },
  { name: "Northern Mariana Islands", slug: "northern-mariana-islands", label: "U.S. Territory" },
];

export const perfectStartupStateMap = new Map(perfectStartupStates.map((state) => [state.slug, state]));

