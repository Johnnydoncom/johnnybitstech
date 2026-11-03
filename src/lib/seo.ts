import { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/config/site";

interface SEOProps {
  title: string;
  description: string;
  image?: string;
  noIndex?: boolean;
  absoluteTitle?: boolean;
  keywords?: string[];
  canonicalUrl?: string;
}

export function constructMetadata({
  title,
  description,
  image = "/assets/johnnybits-logo.png",
  noIndex = false,
  absoluteTitle = false,
  keywords,
  canonicalUrl,
}: SEOProps): Metadata {
  return {
    metadataBase: new URL(SITE_URL),
    title: absoluteTitle ? { absolute: title } : title,
    description,
    keywords,
    ...(canonicalUrl && {
      alternates: {
        canonical: canonicalUrl,
      },
    }),
    openGraph: {
      title,
      description,
      // og:url must match the page's canonical; omit it rather than point every page at the homepage.
      ...(canonicalUrl && { url: canonicalUrl }),
      siteName: SITE_NAME,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} - ${title}`,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  };
}

// ---------------------------------------------------------------------------
//  Structured Data Helpers (JSON-LD)
//
//  These return plain objects that should be passed to <JsonLd /> in your
//  layout or page component. They are NOT part of Next.js `metadata`.
// ---------------------------------------------------------------------------

/** Site-wide Organization schema — render once in the root layout. */
export function getOrganizationSchema() {
  return {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    alternateName: "Johnnybits",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/assets/johnnybits-logo.png`,
    },
    sameAs: [
      "https://facebook.com/johnnybitstech",
      "https://instagram.com/johnnybitstech",
    ],
    telephone: ["+2348031304346", "+2348038712683"],
    email: "info@johnnybits.com",
    areaServed: "Nigeria",
    description:
      "Premium digital agency specializing in web design, development, and digital marketing solutions.",
  };
}

/** Site-wide WebSite schema — render once in the root layout. */
export function getWebsiteSchema() {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/?s={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

/** Per-page Service schema. */
export function getServiceSchema(data: {
  name: string;
  description: string;
  url: string;
}) {
  return {
    "@type": "Service",
    "@id": `${data.url}#service`,
    name: data.name,
    description: data.description,
    url: data.url,
    provider: { "@id": `${SITE_URL}/#organization` },
  };
}

/** Per-page WebPage schema. */
export function getWebPageSchema(data: {
  name: string;
  description: string;
  url: string;
}) {
  return {
    "@type": "WebPage",
    "@id": `${data.url}#webpage`,
    url: data.url,
    name: data.name,
    description: data.description,
    isPartOf: { "@id": `${SITE_URL}/#website` },
  };
}

/** Per-page BreadcrumbList schema. */
export function getBreadcrumbSchema(
  items: { name: string; url: string }[]
) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** Article / TechArticle schema for blog posts. */
export function getArticleSchema(data: {
  url: string;
  title: string;
  publishedAt: string;
  updatedAt: string;
  author?: string;
}) {
  return {
    "@type": "TechArticle",
    "@id": `${data.url}#article`,
    headline: data.title,
    datePublished: data.publishedAt,
    dateModified: data.updatedAt,
    author: {
      "@type": "Person",
      name: data.author || "webmaster",
    },
    mainEntityOfPage: { "@id": data.url },
  };
}

/**
 * Build a complete `@graph` payload ready for <JsonLd />.
 * Automatically includes the global Organization and WebSite schemas, 
 * plus any number of additional page-specific schemas wrapped under a single context.
 */
export function buildJsonLdGraph(...schemas: Record<string, unknown>[]) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      getOrganizationSchema(),
      getWebsiteSchema(),
      ...schemas,
    ],
  };
}