import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/config/site";
import { buildJsonLdGraph, getBreadcrumbSchema } from "@/lib/seo";
import type { BlogPost } from "./types";

export const BLOG_PATH = "/blog";
export const BLOG_TITLE = "Blog | Johnnybits Technology";
export const BLOG_DESCRIPTION =
  "Practical articles from our designers, developers and marketers — tips, guides and ideas for growing online in Nigeria.";
const DEFAULT_OG_IMAGE = "/assets/johnnybits-logo.png";

export function absoluteUrl(pathOrUrl: string): string {
  return new URL(pathOrUrl, SITE_URL).toString();
}

export function postPath(slug: string): string {
  return `${BLOG_PATH}/${slug}`;
}

export function postCanonical(post: Pick<BlogPost, "slug" | "canonicalOverride">): string {
  return post.canonicalOverride ?? absoluteUrl(postPath(post.slug));
}

export function blogIndexMetadata(): Metadata {
  const url = absoluteUrl(BLOG_PATH);
  return {
    title: { absolute: BLOG_TITLE },
    description: BLOG_DESCRIPTION,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName: SITE_NAME,
      title: BLOG_TITLE,
      description: BLOG_DESCRIPTION,
      locale: "en_US",
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: `${SITE_NAME} blog` }],
    },
    twitter: { card: "summary_large_image", title: BLOG_TITLE, description: BLOG_DESCRIPTION, images: [DEFAULT_OG_IMAGE] },
  };
}

export function postMetadata(post: BlogPost): Metadata {
  const canonical = postCanonical(post);
  const title = post.metaTitle || `${post.title} | ${SITE_NAME}`;
  const description = post.metaDescription || post.summary || undefined;
  const ogTitle = post.ogTitle || title;
  const ogDescription = post.ogDescription || description;
  const image = post.featuredImage ?? DEFAULT_OG_IMAGE;
  const imageAlt = post.featuredImageAlt || post.title;

  return {
    // Meta titles are stored complete (already branded), so bypass the root title template.
    title: { absolute: title },
    description,
    keywords: post.tags.length ? post.tags : undefined,
    authors: post.author ? [{ name: post.author.name, url: post.author.url ?? undefined }] : [{ name: SITE_NAME }],
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      siteName: SITE_NAME,
      title: ogTitle,
      description: ogDescription,
      locale: "en_US",
      publishedTime: post.publishedAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: post.author ? [post.author.name] : undefined,
      section: post.category ?? undefined,
      tags: post.tags.length ? post.tags : undefined,
      images: [{ url: image, width: 1200, height: 630, alt: imageAlt }],
    },
    twitter: { card: "summary_large_image", title: ogTitle, description: ogDescription, images: [image] },
  };
}

export function blogIndexJsonLd() {
  const url = absoluteUrl(BLOG_PATH);
  return buildJsonLdGraph(
    {
      "@type": "Blog",
      "@id": `${url}#blog`,
      name: `${SITE_NAME} Blog`,
      description: BLOG_DESCRIPTION,
      url,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en",
    },
    getBreadcrumbSchema([
      { name: "Home", url: absoluteUrl("/") },
      { name: "Blog", url },
    ]),
  );
}

export type ArticleJsonLdOptions = { includeFaq?: boolean };

/**
 * One deterministic JSON-LD graph per article. Used by the public page and (Phase 3) by
 * build_seo_package, so what the agent validates is exactly what gets rendered.
 */
export function articleJsonLd(post: BlogPost, options: ArticleJsonLdOptions = {}) {
  const url = postCanonical(post);
  const image = post.featuredImage ? absoluteUrl(post.featuredImage) : absoluteUrl(DEFAULT_OG_IMAGE);
  const organizationRef = { "@id": `${SITE_URL}/#organization` };

  const author = post.author
    ? {
        "@type": "Person",
        "@id": `${SITE_URL}/#author-${post.author.slug}`,
        name: post.author.name,
        ...(post.author.jobTitle && { jobTitle: post.author.jobTitle }),
        ...(post.author.url && { url: post.author.url }),
        ...(post.author.sameAs.length > 0 && { sameAs: post.author.sameAs }),
        worksFor: organizationRef,
      }
    : organizationRef;

  const schemas: Record<string, unknown>[] = [
    {
      "@type": "BlogPosting",
      "@id": `${url}#article`,
      headline: post.title.slice(0, 110),
      description: post.metaDescription || post.summary || undefined,
      image: [image],
      datePublished: post.publishedAt.toISOString(),
      dateModified: post.updatedAt.toISOString(),
      author,
      publisher: organizationRef,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      url,
      wordCount: post.wordCount,
      ...(post.category && { articleSection: post.category }),
      ...(post.tags.length > 0 && { keywords: post.tags.join(", ") }),
      inLanguage: "en",
      isPartOf: { "@id": `${absoluteUrl(BLOG_PATH)}#blog` },
    },
    getBreadcrumbSchema([
      { name: "Home", url: absoluteUrl("/") },
      { name: "Blog", url: absoluteUrl(BLOG_PATH) },
      { name: post.title, url },
    ]),
  ];

  if (options.includeFaq && post.faq && post.faq.length > 0) {
    schemas.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: post.faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    });
  }

  return buildJsonLdGraph(...schemas);
}

/** JSON for <script type="application/ld+json">, with "<" escaped so content cannot close the tag. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
