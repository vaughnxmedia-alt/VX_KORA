const SITE_ORIGIN = "https://www.jahknowspr.com";

type Faq = {
  question: string;
  answer: string;
};

type BreadcrumbItem = {
  name: string;
  url: string;
};

export function absoluteUrl(pathname: string): string {
  if (pathname.startsWith("http")) return pathname;
  return `${SITE_ORIGIN}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_ORIGIN}/#organization`,
    name: "JahKnowsPR",
    url: SITE_ORIGIN,
    email: "welcome@jahknowspr.com",
    description:
      "JahKnowsPR is a Texas-based public relations and brand strategy firm helping entrepreneurs, creators, service providers, and growing businesses build clarity, authority, and trust.",
    areaServed: ["Texas", "Beaumont, Texas", "Port Arthur, Texas", "Orange, Texas", "Houston, Texas", "Dallas, Texas", "San Antonio, Texas", "Austin, Texas"],
    sameAs: [
      absoluteUrl("/the-brief"),
      absoluteUrl("/locations/texas"),
      absoluteUrl("/brand-strategy-session"),
      absoluteUrl("/free-audit"),
    ],
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_ORIGIN}/#website`,
    name: "JahKnowsPR",
    url: SITE_ORIGIN,
    publisher: { "@id": `${SITE_ORIGIN}/#organization` },
    inLanguage: "en-US",
  };
}

export function professionalServiceSchema(options: {
  url: string;
  name?: string;
  description: string;
  areaServed?: string | string[];
  serviceType?: string | string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${absoluteUrl(options.url)}#professional-service`,
    name: options.name || "JahKnowsPR",
    url: absoluteUrl(options.url),
    email: "welcome@jahknowspr.com",
    description: options.description,
    areaServed: options.areaServed || "Texas",
    serviceType: options.serviceType || ["Public relations strategy", "Brand positioning", "Brand messaging", "Media strategy"],
    address: {
      "@type": "PostalAddress",
      addressRegion: "TX",
      addressCountry: "US",
    },
  };
}

export function serviceSchema(options: {
  name: string;
  description: string;
  url: string;
  serviceType?: string;
  areaServed?: string | string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${absoluteUrl(options.url)}#service`,
    name: options.name,
    url: absoluteUrl(options.url),
    description: options.description,
    serviceType: options.serviceType || options.name,
    areaServed: options.areaServed || "Texas",
    provider: { "@id": `${SITE_ORIGIN}/#organization` },
  };
}

export function faqPageSchema(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function breadcrumbListSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  };
}

export function articleSchema(options: {
  headline: string;
  description: string;
  url: string;
  datePublished?: string;
  dateModified?: string;
  keywords?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: options.headline,
    description: options.description,
    url: absoluteUrl(options.url),
    mainEntityOfPage: absoluteUrl(options.url),
    author: { "@id": `${SITE_ORIGIN}/#organization` },
    publisher: { "@id": `${SITE_ORIGIN}/#organization` },
    datePublished: options.datePublished,
    dateModified: options.dateModified || options.datePublished,
    keywords: options.keywords?.join(", "),
  };
}

export function personSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${SITE_ORIGIN}/about#founder`,
    name: "Jocelyn Vaughn",
    url: absoluteUrl("/about"),
    jobTitle: "Founder & Principal Strategist",
    worksFor: { "@id": `${SITE_ORIGIN}/#organization` },
    description:
      "Jocelyn Vaughn is the Founder and Principal Strategist of JahKnowsPR, a strategic communications firm helping businesses, organizations, and personal brands communicate with greater clarity, intention, and impact.",
  };
}
