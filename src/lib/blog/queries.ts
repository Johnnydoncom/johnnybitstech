import "server-only";
import { cache } from "react";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { articles, authors } from "@/db/schema";
import type { BlogListItem, BlogPost } from "./types";

const published = eq(articles.status, "published");

/** Published posts for /blog, newest first. */
export const listPublishedPosts = cache(async (): Promise<BlogListItem[]> => {
  const rows = await getDb()
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      summary: articles.summary,
      category: articles.category,
      featuredImage: articles.featuredImage,
      featuredImageAlt: articles.featuredImageAlt,
      readingMinutes: articles.readingMinutes,
      publishedAt: articles.publishedAt,
    })
    .from(articles)
    .where(published)
    .orderBy(desc(articles.publishedAt));

  // published_at is guaranteed by the articles_published_has_date constraint.
  return rows.map((r) => ({ ...r, publishedAt: r.publishedAt ?? new Date(0) }));
});

/** One published post by slug, or null. Deduplicated per request (metadata + page share it). */
export const getPublishedPost = cache(async (slug: string): Promise<BlogPost | null> => {
  const [row] = await getDb()
    .select({ article: articles, author: authors })
    .from(articles)
    .leftJoin(authors, eq(authors.id, articles.authorId))
    .where(and(published, eq(articles.slug, slug)))
    .limit(1);

  if (!row) return null;
  const { article: a, author } = row;
  return {
    id: a.id,
    slug: a.slug,
    title: a.title,
    summary: a.summary,
    content: a.content,
    contentFormat: a.contentFormat,
    category: a.category,
    tags: a.tags,
    featuredImage: a.featuredImage,
    featuredImageAlt: a.featuredImageAlt,
    metaTitle: a.metaTitle,
    metaDescription: a.metaDescription,
    ogTitle: a.ogTitle,
    ogDescription: a.ogDescription,
    canonicalOverride: a.canonicalOverride,
    faq: a.faq,
    wordCount: a.wordCount,
    readingMinutes: a.readingMinutes,
    publishedAt: a.publishedAt ?? a.createdAt,
    updatedAt: a.updatedAt,
    author: author
      ? { name: author.name, slug: author.slug, jobTitle: author.jobTitle, url: author.url, sameAs: author.sameAs }
      : null,
  };
});

/** Slugs + last-modified dates for the sitemap and generateStaticParams. */
export async function listPublishedSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  return getDb()
    .select({ slug: articles.slug, updatedAt: articles.updatedAt })
    .from(articles)
    .where(published)
    .orderBy(desc(articles.publishedAt));
}
