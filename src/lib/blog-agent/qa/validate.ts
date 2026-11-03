import { contentStats } from "@/lib/blog/text";
import type { BrandContext } from "../brand/schema";
import { linkCountRange, isInternalUrl } from "../linking/insert";
import { bodyText, headings, parseMarkdown, textOf, walk, type MdNode } from "../markdown";
import type { s4ResearchSchema, s7SeoSchema } from "../schemas/stages";
import { keywordDensity, LIMITS, sentences } from "../seo/metrics";
import { extractFaq } from "./faq";
import type { SeoPackage } from "../seo/package";
import type { z } from "zod";

export type Issue = { path: string; message: string };

/** Allowed word count relative to the brief's target: short is worse than long. */
export const WORD_COUNT_TOLERANCE = { under: 0.15, over: 0.25 } as const;

/**
 * A "figure" that needs a citation: a percentage, a currency amount, a number with a scale word,
 * or any number of two or more digits that is not a year. Hyphenated durations ("30-minute call") are exempt.
 */
const FIGURE = /(\d[\d,.]*\s*(%|per\s?cent\b|percent\b))|([₦$£€]\s?\d)|(\b\d[\d,.]*\s*(million|billion|thousand|bn)\b)|(\b(?!(19|20)\d{2}\b)\d{2,}(?:[,.]\d+)*\b(?!-(minute|hour|day|week|month|year|page|step)))/i;

export type ValidationInput = {
  title: string;
  markdown: string;
  wordCountTarget: number;
  primaryKeyword: string;
  research: z.output<typeof s4ResearchSchema>["items"];
  seo: z.output<typeof s7SeoSchema>;
  pkg: SeoPackage;
  siteOrigin: string;
  /** Internal URLs (site paths) that exist and are linkable. */
  existingPaths: ReadonlySet<string>;
  bannedClaims: BrandContext["bannedClaims"];
};

export type ValidationReport = {
  passed: boolean;
  errors: Issue[];
  warnings: Issue[];
  metrics: { word_count: number; word_count_target: number; internal_links: number; citations: number; figures_checked: number };
};

const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const sitePath = (url: string) => (url.startsWith("/") ? url : new URL(url).pathname);

/** Paragraph text with footnote references kept as "[^id]" markers, so citations stay attached to sentences. */
function paragraphWithRefs(node: MdNode): string {
  return (node.children ?? [])
    .map((c) => (c.type === "footnoteReference" ? `[^${c.identifier}]` : c.type === "text" || c.type === "inlineCode" ? c.value ?? "" : paragraphWithRefs(c) || textOf(c)))
    .join("");
}

export function validateArticle(input: ValidationInput): ValidationReport {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const tree = parseMarkdown(input.markdown);
  const sources = new Map(input.research.map((r) => [r.id, r.source_url]));
  const sourceUrls = new Set(input.research.map((r) => r.source_url));

  // Headings
  const hs = headings(tree);
  if (hs.some((h) => h.depth === 1)) errors.push({ path: "markdown", message: "Remove the H1; the title is rendered separately" });
  if (hs[0] && hs[0].depth !== 2) errors.push({ path: "markdown", message: "The first heading must be an H2" });
  hs.forEach((h, i) => {
    if (i > 0 && h.depth > hs[i - 1].depth + 1) errors.push({ path: "markdown", message: `Heading "${h.text}" skips a level (H${hs[i - 1].depth} → H${h.depth})` });
  });
  const seen = new Set<string>();
  for (const h of hs) {
    const key = h.text.toLowerCase();
    if (seen.has(key)) errors.push({ path: "markdown", message: `Duplicate heading "${h.text}"` });
    seen.add(key);
  }
  if (hs.filter((h) => h.depth === 2).length < 3) errors.push({ path: "markdown", message: "Needs at least three H2 sections" });

  // Length vs brief
  const { wordCount } = contentStats(input.markdown, "markdown");
  const low = Math.round(input.wordCountTarget * (1 - WORD_COUNT_TOLERANCE.under));
  const high = Math.round(input.wordCountTarget * (1 + WORD_COUNT_TOLERANCE.over));
  if (wordCount < low || wordCount > high) errors.push({ path: "markdown", message: `Word count ${wordCount} is outside ${low}–${high} for a ${input.wordCountTarget}-word brief` });

  // Unresolved markers
  const markers = (input.markdown.match(/\[\[NEEDS_SOURCE\]\]/g) ?? []).length;
  if (markers) errors.push({ path: "markdown", message: `${markers} unresolved [[NEEDS_SOURCE]] marker(s)` });

  // Citations and links
  const refs = new Set<string>();
  const defs = new Map<string, MdNode>();
  let internalLinks = 0;
  let figuresChecked = 0;
  walk(tree, (n, anc) => {
    const inFootnote = anc.some((a) => a.type === "footnoteDefinition");
    if (n.type === "footnoteReference" && n.identifier) refs.add(n.identifier);
    if (n.type === "footnoteDefinition" && n.identifier) defs.set(n.identifier, n);
    if (n.type === "text" && n.value) {
      for (const m of n.value.matchAll(/\[\^([^\]\s]+)\]/g)) errors.push({ path: "markdown", message: `Citation [^${m[1]}] has no footnote definition` });
    }
    if (n.type === "link" && n.url) {
      if (isInternalUrl(n.url, input.siteOrigin)) {
        if (inFootnote) return;
        internalLinks++;
        const path = sitePath(n.url);
        if (!input.existingPaths.has(path)) errors.push({ path: "markdown", message: `Internal link ${n.url} is not a published page` });
      } else if (!sourceUrls.has(n.url)) {
        errors.push({ path: "markdown", message: `External link ${n.url} is not one of the saved research sources` });
      }
    }
    if ((n.type === "paragraph" || n.type === "listItem") && !inFootnote && !anc.some((a) => a.type === "table" || a.type === "heading")) {
      if (n.type === "listItem") return; // list items are checked through their paragraphs
      for (const sentence of sentences(paragraphWithRefs(n))) {
        if (!FIGURE.test(sentence.replace(/\[\^[^\]]+\]/g, ""))) continue;
        figuresChecked++;
        if (!/\[\^[^\]]+\]/.test(sentence)) {
          errors.push({ path: "markdown", message: `Figure without a citation: "${norm(sentence).slice(0, 140)}"` });
        }
      }
    }
  });
  for (const id of refs) {
    if (!sources.has(id)) errors.push({ path: "markdown", message: `Citation [^${id}] is not a saved research item` });
    else if (!defs.has(id)) errors.push({ path: "markdown", message: `Citation [^${id}] has no footnote definition` });
  }
  for (const [id, def] of defs) {
    if (!refs.has(id)) warnings.push({ path: "markdown", message: `Footnote [^${id}] is never cited` });
    const urls: string[] = [];
    walk(def, (n) => n.type === "link" && n.url && urls.push(n.url));
    const expected = sources.get(id);
    if (expected && !urls.includes(expected)) errors.push({ path: "markdown", message: `Footnote [^${id}] must link to ${expected}` });
  }
  const { min, max } = linkCountRange(wordCount);
  if (internalLinks < min || internalLinks > max) errors.push({ path: "markdown", message: `${internalLinks} internal links; ${min}–${max} required for ${wordCount} words` });

  // Banned claims (title, body and SEO text)
  const haystack = [input.title, bodyText(tree), input.seo.meta_title, input.seo.meta_description, ...input.seo.faq.flatMap((f) => [f.question, f.answer])].join("\n");
  for (const claim of input.bannedClaims) {
    if (new RegExp(claim.regex, "iu").test(haystack)) errors.push({ path: "markdown", message: `Banned claim found (${claim.pattern}): ${claim.reason}` });
  }

  // Keyword stuffing
  const density = keywordDensity(bodyText(tree), input.primaryKeyword).densityPercent;
  if (density > LIMITS.keywordDensity.failAbove) errors.push({ path: "markdown", message: `Keyword density ${density}% is keyword stuffing (max ${LIMITS.keywordDensity.failAbove}%)` });

  // FAQ: the structured data must match the visible FAQ exactly
  const faqStart = tree.children?.findIndex((c) => c.type === "heading" && c.depth === 2 && /faq|frequently asked/i.test(textOf(c))) ?? -1;
  if (faqStart < 0) {
    errors.push({ path: "markdown", message: "Missing an H2 FAQ section" });
  } else {
    const visible = new Map(extractFaq(input.markdown).map((f) => [f.question, f.answer]));
    input.seo.faq.forEach((f, i) => {
      const answer = visible.get(norm(f.question));
      if (answer === undefined) errors.push({ path: `faq.${i}.question`, message: `FAQ question "${f.question}" is not an H3 in the article's FAQ section` });
      else if (answer !== norm(f.answer)) errors.push({ path: `faq.${i}.answer`, message: `FAQ answer for "${f.question}" differs from the article text` });
    });
    if (visible.size !== input.seo.faq.length) warnings.push({ path: "faq", message: `The article has ${visible.size} FAQ questions; the SEO fields list ${input.seo.faq.length}` });
  }

  // SEO fields and schema/content consistency
  const { metaTitle, metaDescription } = LIMITS;
  if (input.seo.meta_title.length < metaTitle.min || input.seo.meta_title.length > metaTitle.max) errors.push({ path: "meta_title", message: `Meta title must be ${metaTitle.min}–${metaTitle.max} characters` });
  if (input.seo.meta_description.length < metaDescription.min || input.seo.meta_description.length > metaDescription.max) errors.push({ path: "meta_description", message: `Meta description must be ${metaDescription.min}–${metaDescription.max} characters` });
  const graph = (input.pkg.schema_jsonld["@graph"] ?? []) as Record<string, unknown>[];
  const posting = graph.find((n) => n["@type"] === "BlogPosting");
  if (!posting || posting.headline !== input.title.slice(0, 110) || posting.url !== input.pkg.canonical) {
    errors.push({ path: "schema_jsonld", message: "BlogPosting JSON-LD does not match the article title and canonical URL" });
  }
  const faqPage = graph.find((n) => n["@type"] === "FAQPage") as { mainEntity?: { name: string }[] } | undefined;
  if (faqPage && JSON.stringify(faqPage.mainEntity?.map((q) => q.name)) !== JSON.stringify(input.seo.faq.map((f) => f.question))) {
    errors.push({ path: "schema_jsonld", message: "FAQPage JSON-LD does not match the FAQ" });
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    metrics: { word_count: wordCount, word_count_target: input.wordCountTarget, internal_links: internalLinks, citations: refs.size, figures_checked: figuresChecked },
  };
}
