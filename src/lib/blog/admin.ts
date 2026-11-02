import { z } from "zod";
import type { Article } from "@/db/schema";
import { contentStats } from "./text";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

/** Body accepted by the existing /admin/blog editor (legacy field names kept for the UI). */
export const legacyPostInput = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(120)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug may only contain lowercase letters, numbers and single hyphens"),
  excerpt: optionalText(1000),
  content: z.string().max(500_000).nullish().transform((v) => v ?? ""),
  tag: optionalText(100),
  published: z.boolean().default(false),
  featured_image: optionalText(2048).refine((v) => !v || v.startsWith("/") || /^https:\/\//.test(v), {
    message: "Featured image must be a site path (/assets/...) or an https URL",
  }),
  meta_title: optionalText(300),
  meta_description: optionalText(500),
});

export type LegacyPostInput = z.infer<typeof legacyPostInput>;

export const articleIdParam = z.string().uuid();

/** Maps the legacy editor's fields onto article columns (HTML content from the Quill editor). */
export function legacyInputToArticle(input: LegacyPostInput) {
  const { wordCount, readingMinutes } = contentStats(input.content, "html");
  return {
    title: input.title,
    slug: input.slug,
    summary: input.excerpt,
    content: input.content,
    contentFormat: "html" as const,
    category: input.tag,
    featuredImage: input.featured_image,
    metaTitle: input.meta_title,
    metaDescription: input.meta_description,
    wordCount,
    readingMinutes,
  };
}

/** Shape the existing admin pages expect (id is now a uuid string). */
export function articleToLegacyPost(a: Article) {
  return {
    id: a.id,
    title: a.title,
    slug: a.slug,
    excerpt: a.summary,
    content: a.content,
    content_format: a.contentFormat,
    tag: a.category,
    status: a.status,
    published: a.status === "published",
    featured_image: a.featuredImage,
    meta_title: a.metaTitle,
    meta_description: a.metaDescription,
    created_at: a.createdAt,
    updated_at: a.updatedAt,
  };
}

/** True when the error is a Postgres unique violation (Neon and PGlite surface it differently). */
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 4; depth++) {
    if (typeof current === "object" && "code" in current && (current as { code?: unknown }).code === "23505") return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
