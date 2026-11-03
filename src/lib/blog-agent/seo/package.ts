import { contentStats } from "@/lib/blog/text";
import { articleJsonLd, postCanonical } from "@/lib/blog/seo";
import type { BlogAuthor, BlogPost } from "@/lib/blog/types";
import { bodyText, headings, parseMarkdown } from "../markdown";
import type { s7SeoSchema } from "../schemas/stages";
import { containsKeyword, fleschReadingEase, keywordDensity, LIMITS } from "./metrics";
import type { z } from "zod";

export type Issue = { path: string; message: string };

export type SeoPackageInput = {
  title: string;
  markdown: string;
  primaryKeyword: string;
  seo: z.output<typeof s7SeoSchema>;
  slug: string;
  author: BlogAuthor | null;
  includeFaq: boolean;
};

export type SeoPackage = ReturnType<typeof buildSeoPackage>;

/** Deterministic SEO package: canonical, JSON-LD and metrics computed in code from the final (linked) article. */
export function buildSeoPackage(input: SeoPackageInput) {
  const { seo } = input;
  const tree = parseMarkdown(input.markdown);
  const text = bodyText(tree);
  const { wordCount, readingMinutes } = contentStats(input.markdown, "markdown");
  const h2s = headings(tree).filter((h) => h.depth === 2).map((h) => h.text);
  const first100 = text.split(/\s+/).slice(0, 100).join(" ");
  const density = keywordDensity(text, input.primaryKeyword);
  const flesch = fleschReadingEase(text);
  const now = new Date();

  // Draft dates; the public page renders JSON-LD from the stored article, so publish dates are set then.
  const asPost: BlogPost = {
    id: "draft",
    slug: input.slug,
    title: input.title,
    summary: seo.meta_description,
    content: input.markdown,
    contentFormat: "markdown",
    category: seo.category,
    tags: seo.tags,
    featuredImage: null,
    featuredImageAlt: seo.image_alt,
    metaTitle: seo.meta_title,
    metaDescription: seo.meta_description,
    ogTitle: seo.og_title ?? null,
    ogDescription: seo.og_description ?? null,
    canonicalOverride: null,
    faq: seo.faq,
    wordCount,
    readingMinutes,
    publishedAt: now,
    updatedAt: now,
    author: input.author,
  };

  const keyword = {
    occurrences: density.occurrences,
    density_percent: density.densityPercent,
    in_title: containsKeyword(input.title, input.primaryKeyword),
    in_meta_title: containsKeyword(seo.meta_title, input.primaryKeyword),
    in_meta_description: containsKeyword(seo.meta_description, input.primaryKeyword),
    in_slug: containsKeyword(input.slug.replace(/-/g, " "), input.primaryKeyword),
    in_first_100_words: containsKeyword(first100, input.primaryKeyword),
    in_an_h2: h2s.some((h) => containsKeyword(h, input.primaryKeyword)),
  };

  const warnings: Issue[] = [];
  if (!keyword.in_title && !keyword.in_meta_title) warnings.push({ path: "meta_title", message: "Primary keyword is in neither the title nor the meta title" });
  if (!keyword.in_first_100_words) warnings.push({ path: "markdown", message: "Primary keyword does not appear in the first 100 words" });
  if (density.densityPercent < LIMITS.keywordDensity.warnBelow) warnings.push({ path: "markdown", message: `Keyword density ${density.densityPercent}% is low` });
  if (density.densityPercent > LIMITS.keywordDensity.warnAbove) warnings.push({ path: "markdown", message: `Keyword density ${density.densityPercent}% looks stuffed; write more naturally` });
  if (flesch < LIMITS.fleschWarnBelow) warnings.push({ path: "markdown", message: `Flesch reading ease ${flesch} is hard going; shorten sentences` });

  return {
    slug: input.slug,
    canonical: postCanonical({ slug: input.slug, canonicalOverride: null }),
    title: input.title,
    meta_title: seo.meta_title,
    meta_description: seo.meta_description,
    og_title: seo.og_title ?? seo.meta_title,
    og_description: seo.og_description ?? seo.meta_description,
    category: seo.category,
    tags: seo.tags,
    image_prompt: seo.image_prompt,
    image_alt: seo.image_alt,
    faq: seo.faq,
    schema_jsonld: articleJsonLd(asPost, { includeFaq: input.includeFaq }),
    metrics: { word_count: wordCount, reading_minutes: readingMinutes, flesch_reading_ease: flesch, h2_count: h2s.length, keyword },
    warnings,
  };
}
