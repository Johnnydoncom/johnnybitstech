import type { ContentFormat } from "@/db/schema";

export type BlogAuthor = {
  name: string;
  slug: string;
  jobTitle: string | null;
  url: string | null;
  sameAs: string[];
};

/** Fields the public blog renders. Mapped from `articles` (+ author). */
export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  content: string;
  contentFormat: ContentFormat;
  category: string | null;
  tags: string[];
  featuredImage: string | null;
  featuredImageAlt: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  canonicalOverride: string | null;
  faq: { question: string; answer: string }[] | null;
  wordCount: number;
  readingMinutes: number;
  publishedAt: Date;
  updatedAt: Date;
  author: BlogAuthor | null;
};

export type BlogListItem = Pick<
  BlogPost,
  "id" | "slug" | "title" | "summary" | "category" | "featuredImage" | "featuredImageAlt" | "readingMinutes" | "publishedAt"
>;
