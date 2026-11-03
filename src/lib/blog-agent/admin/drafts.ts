import { sql } from "drizzle-orm";
import { z } from "zod";
import { rowsOf } from "@/db/rows";
import type { Db } from "@/db/types";
import type { Article } from "@/db/schema";
import { contentStats } from "@/lib/blog/text";
import { getBrandContext } from "../brand/johnnybits";
import type { EmbeddingsProvider } from "../embeddings/types";
import { contentHash } from "../hash";
import { buildChunks } from "../indexing/chunks";
import { writeChunks } from "../indexing/backfill";
import { isInternalUrl } from "../linking/insert";
import { parseMarkdown, textOf, walk } from "../markdown";
import { extractFaq } from "../qa/faq";
import { validateArticle } from "../qa/validate";
import type { s4ResearchSchema } from "../schemas/stages";
import { buildSeoPackage } from "../seo/package";
import { existingSitePaths } from "../tools/stage-checks";

export type Issue = { path: string; message: string };

export class AdminError extends Error {
  constructor(message: string, readonly issues: Issue[] = []) {
    super(message);
    this.name = "AdminError";
  }
}

const SITE_ORIGIN = () => process.env.NEXT_PUBLIC_SITE_URL ?? "https://johnnybits.com";

type ArticleRow = Record<string, unknown> & {
  id: string; title: string; slug: string; status: Article["status"]; content: string; content_format: "html" | "markdown";
  meta_title: string | null; meta_description: string | null; og_title: string | null; og_description: string | null;
  category: string | null; tags: string[]; featured_image: string | null; featured_image_alt: string | null; image_prompt: string | null;
  faq: { question: string; answer: string }[] | null; primary_keyword: string | null; run_id: string | null; author_id: string | null;
  summary: string | null; rejection_reason: string | null; published_at: string | Date | null;
};

export async function getArticle(db: Db, id: string): Promise<ArticleRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = rowsOf<ArticleRow>(await db.execute(sql`SELECT * FROM articles WHERE id = ${id}`));
  return row ?? null;
}

async function requireAgentArticle(db: Db, id: string, allowed: Article["status"][]): Promise<ArticleRow> {
  const a = await getArticle(db, id);
  if (!a) throw new AdminError("Article not found");
  if (a.content_format !== "markdown") throw new AdminError("This article is edited in Admin → Blog");
  if (!allowed.includes(a.status)) throw new AdminError(`Not possible while the article is ${a.status.replace("_", " ")}`);
  return a;
}

// ---------------------------------------------------------------------------
// Editing
// ---------------------------------------------------------------------------

const optional = (max: number) => z.string().trim().max(max).transform((v) => v || null);

export const draftEditSchema = z.object({
  title: z.string().trim().min(5).max(120),
  slug: z.string().trim().toLowerCase().max(80).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug may only contain lowercase letters, numbers and single hyphens"),
  meta_title: z.string().trim().min(20, "Meta title: at least 20 characters").max(60, "Meta title: at most 60 characters"),
  meta_description: z.string().trim().min(120, "Meta description: at least 120 characters").max(160, "Meta description: at most 160 characters"),
  og_title: optional(90),
  og_description: optional(200),
  category: z.string().trim().min(1).max(40),
  tags: z.string().max(400).transform((v) => [...new Set(v.split(",").map((t) => t.trim()).filter(Boolean))].slice(0, 8)),
  featured_image_alt: optional(125),
  content: z.string().min(200).max(80_000),
});

export type DraftEdit = z.input<typeof draftEditSchema>;

async function saveContent(db: Db, id: string, title: string, markdown: string) {
  const { wordCount, readingMinutes } = contentStats(markdown, "markdown");
  await db.execute(sql`
    UPDATE articles SET content = ${markdown}, content_hash = ${contentHash(title, markdown)}, word_count = ${wordCount}::int,
           reading_minutes = ${readingMinutes}::int, faq = ${JSON.stringify(extractFaq(markdown))}::jsonb
    WHERE id = ${id}
  `);
}

/** Saves editor changes. The FAQ structured data is re-extracted from the article so it can never drift. */
export async function updateDraft(db: Db, id: string, input: DraftEdit, provider: EmbeddingsProvider | null = null) {
  const a = await requireAgentArticle(db, id, ["pending_review", "rejected", "published"]);
  const parsed = draftEditSchema.safeParse(input);
  if (!parsed.success) throw new AdminError("Please fix the highlighted fields", parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
  const d = parsed.data;
  if ((a.status === "published" || a.published_at) && d.slug !== a.slug) {
    throw new AdminError("The slug of an article that has been live cannot change (its URL would break)");
  }
  if (d.slug !== a.slug) {
    const [taken] = rowsOf(await db.execute(sql`SELECT 1 FROM articles WHERE slug = ${d.slug} AND id <> ${id}`));
    if (taken) throw new AdminError(`The slug "${d.slug}" is already used`);
  }
  await db.execute(sql`
    UPDATE articles SET title = ${d.title}, slug = ${d.slug}, summary = ${d.meta_description}, meta_title = ${d.meta_title},
           meta_description = ${d.meta_description}, og_title = ${d.og_title}, og_description = ${d.og_description},
           category = ${d.category}, tags = ${JSON.stringify(d.tags)}::jsonb, featured_image_alt = ${d.featured_image_alt}
    WHERE id = ${id}
  `);
  await saveContent(db, id, d.title, d.content);
  if (a.status === "published") await reindex(db, id, provider, true);
  return { slug: d.slug, status: a.status };
}

export function listInternalLinks(markdown: string): { anchor: string; url: string }[] {
  const links: { anchor: string; url: string }[] = [];
  walk(parseMarkdown(markdown), (n, anc) => {
    if (n.type === "link" && n.url && isInternalUrl(n.url, SITE_ORIGIN()) && !anc.some((a) => a.type === "footnoteDefinition")) links.push({ anchor: textOf(n), url: n.url });
  });
  return links;
}

/** Removes or retargets one internal link (exact "[anchor](url)" match). A new URL must be a published page. */
export async function editInternalLink(db: Db, id: string, link: { anchor: string; url: string }, newUrl: string | null) {
  const a = await requireAgentArticle(db, id, ["pending_review", "rejected", "published"]);
  const markup = `[${link.anchor}](${link.url})`;
  if (!a.content.includes(markup)) throw new AdminError("That link is no longer in the article");
  if (newUrl !== null) {
    const path = newUrl.trim();
    if (!(await existingSitePaths(db, [path])).has(path)) throw new AdminError(`${path} is not a published page`);
    await saveContent(db, id, a.title, a.content.replace(markup, `[${link.anchor}](${path})`));
  } else {
    await saveContent(db, id, a.title, a.content.replace(markup, link.anchor));
  }
}

export async function setFeaturedImage(db: Db, id: string, url: string) {
  await requireAgentArticle(db, id, ["pending_review", "rejected", "published"]);
  if (!url.startsWith("/") && !/^https:\/\/[a-z0-9.-]+\.public\.blob\.vercel-storage\.com\//i.test(url)) {
    throw new AdminError("Featured image must be a site path (/assets/…) or a Vercel Blob URL");
  }
  await db.execute(sql`UPDATE articles SET featured_image = ${url} WHERE id = ${id}`);
}

/** Sets the featured image's alt text (e.g. from a chosen stock photo's description). */
export async function setFeaturedImageAlt(db: Db, id: string, alt: string) {
  await requireAgentArticle(db, id, ["pending_review", "rejected", "published"]);
  const text = alt.replace(/\s+/g, " ").trim();
  if (text.length < 5 || text.length > 125) throw new AdminError("Alt text must be 5–125 characters");
  await db.execute(sql`UPDATE articles SET featured_image_alt = ${text} WHERE id = ${id}`);
}

/** Saves an edited image prompt (used when the admin regenerates the featured image). */
export async function setImagePrompt(db: Db, id: string, prompt: string) {
  await requireAgentArticle(db, id, ["pending_review", "rejected", "published"]);
  const text = prompt.trim().replace(/\s+/g, " ");
  if (text.length < 10 || text.length > 1500) throw new AdminError("The image prompt must be 10–1,500 characters");
  await db.execute(sql`UPDATE articles SET image_prompt = ${text} WHERE id = ${id}`);
}

// ---------------------------------------------------------------------------
// Pre-publish check and publishing
// ---------------------------------------------------------------------------

/** Validation messages a human may accept at publish time (they do not affect correctness or SEO safety). */
const SOFT = [/^Word count \d+ is outside/, /internal links; \d+–\d+ required/, /^Needs at least three H2 sections/];

export type PublishCheck = { blockers: Issue[]; warnings: Issue[]; metrics: Record<string, unknown> };

/**
 * Re-runs the article validator on the current (possibly edited) text against the run's research,
 * plus publish-only requirements (featured image and alt text).
 */
export async function prePublishCheck(db: Db, id: string): Promise<PublishCheck> {
  const a = await getArticle(db, id);
  if (!a) throw new AdminError("Article not found");
  const blockers: Issue[] = [];
  const warnings: Issue[] = [];
  if (!a.featured_image) blockers.push({ path: "featured_image", message: "Upload a featured image" });
  if (!a.featured_image_alt) blockers.push({ path: "featured_image_alt", message: "Add alt text for the featured image" });

  const stage = async (name: string) =>
    rowsOf<{ output: unknown }>(
      await db.execute(sql`SELECT output FROM pipeline_stage_outputs WHERE run_id = ${a.run_id}::uuid AND stage = ${name}::pipeline_stage ORDER BY version DESC LIMIT 1`),
    )[0]?.output;
  const research = (a.run_id ? ((await stage("s4_research")) as z.output<typeof s4ResearchSchema> | undefined)?.items : undefined) ?? [];
  const target = a.run_id ? ((await stage("s3_brief")) as { word_count_target?: number } | undefined)?.word_count_target : undefined;

  const seo = {
    meta_title: a.meta_title ?? "",
    meta_description: a.meta_description ?? "",
    og_title: a.og_title ?? undefined,
    og_description: a.og_description ?? undefined,
    slug_suggestion: a.slug,
    category: a.category ?? "",
    tags: a.tags ?? [],
    image_prompt: a.image_prompt ?? "",
    image_alt: a.featured_image_alt ?? "",
    faq: a.faq ?? [],
  };
  const pkg = buildSeoPackage({ title: a.title, markdown: a.content, primaryKeyword: a.primary_keyword ?? a.title, seo, slug: a.slug, author: null, includeFaq: true });
  const internal = listInternalLinks(a.content).map((l) => (l.url.startsWith("/") ? l.url : new URL(l.url).pathname));
  const report = validateArticle({
    title: a.title,
    markdown: a.content,
    wordCountTarget: target ?? pkg.metrics.word_count,
    primaryKeyword: a.primary_keyword ?? a.title,
    research,
    seo,
    pkg,
    siteOrigin: SITE_ORIGIN(),
    existingPaths: await existingSitePaths(db, internal),
    bannedClaims: getBrandContext().bannedClaims,
  });
  for (const e of report.errors) (SOFT.some((r) => r.test(e.message)) ? warnings : blockers).push(e);
  warnings.push(...report.warnings, ...pkg.warnings);
  return { blockers, warnings, metrics: { ...report.metrics, ...pkg.metrics } };
}

async function reindex(db: Db, id: string, provider: EmbeddingsProvider | null, searchable: boolean) {
  const a = (await getArticle(db, id))!;
  const chunks = buildChunks({ title: a.title, content: a.content, format: a.content_format, metaTitle: a.meta_title, metaDescription: a.meta_description, faq: a.faq });
  await writeChunks(db, id, chunks, provider, searchable);
}

/**
 * Publishes a reviewed draft: re-checks it, rebuilds its index from the current text, then in one statement sets
 * status published, published_at, the article's own canonical, and makes its index entries searchable.
 */
export async function publishArticle(db: Db, id: string, provider: EmbeddingsProvider | null = null): Promise<{ slug: string }> {
  await requireAgentArticle(db, id, ["pending_review"]);
  const check = await prePublishCheck(db, id);
  if (check.blockers.length) throw new AdminError("Fix these before publishing", check.blockers);
  await reindex(db, id, provider, false);
  const [row] = rowsOf<{ slug: string }>(
    await db.execute(sql`
      WITH pub AS (
        UPDATE articles SET status = 'published', published_at = coalesce(published_at, now()), canonical_override = NULL, rejection_reason = NULL
        WHERE id = ${id} AND status = 'pending_review'
        RETURNING id, slug
      ), idx AS (
        UPDATE article_chunks SET searchable = true WHERE article_id IN (SELECT id FROM pub)
      )
      SELECT slug FROM pub
    `),
  );
  if (!row) throw new AdminError("The article was changed by someone else; reload and try again");
  return row;
}

/**
 * Takes a published article offline: back to pending_review, removed from site search, original publish date kept
 * (re-publishing restores it unchanged). Returns the other published articles that still link to it.
 */
export async function unpublishArticle(db: Db, id: string): Promise<{ slug: string; linkedFrom: string[] }> {
  const a = await requireAgentArticle(db, id, ["published"]);
  const [row] = rowsOf<{ slug: string }>(
    await db.execute(sql`
      WITH off AS (
        UPDATE articles SET status = 'pending_review' WHERE id = ${id} AND status = 'published' RETURNING id, slug
      ), idx AS (
        UPDATE article_chunks SET searchable = false WHERE article_id IN (SELECT id FROM off)
      )
      SELECT slug FROM off
    `),
  );
  if (!row) throw new AdminError("The article was changed by someone else; reload and try again");
  return { slug: row.slug, linkedFrom: await publishedLinkersOf(db, id, a.slug) };
}

/** Slugs of other published articles whose content links to /blog/<slug>. */
async function publishedLinkersOf(db: Db, id: string, slug: string): Promise<string[]> {
  // Slugs are [a-z0-9-] only, so they are safe inside the pattern.
  return rowsOf<{ slug: string }>(
    await db.execute(sql`
      SELECT slug FROM articles
      WHERE status = 'published' AND id <> ${id} AND content ~ ${`/blog/${slug}([)"'#?/[:space:]]|$)`}
      ORDER BY slug
    `),
  ).map((r) => r.slug);
}

export async function rejectArticle(db: Db, id: string, reason: string, requeueKeyword: boolean) {
  const a = await requireAgentArticle(db, id, ["pending_review"]);
  const text = reason.trim();
  if (text.length < 5) throw new AdminError("Give a reason (at least 5 characters)");
  await db.execute(sql`UPDATE articles SET status = 'rejected', rejection_reason = ${text.slice(0, 2000)} WHERE id = ${id}`);
  if (requeueKeyword && a.run_id) {
    await db.execute(sql`
      UPDATE keyword_queue SET status = 'queued', claimed_at = NULL, claimed_by_run = NULL,
             notes = left(coalesce(notes || E'\n', '') || ${`Draft rejected: ${text}`}, 4000)
      WHERE id = (SELECT keyword_id FROM pipeline_runs WHERE id = ${a.run_id}::uuid)
    `);
  }
}

export async function restoreToReview(db: Db, id: string) {
  await requireAgentArticle(db, id, ["rejected"]);
  await db.execute(sql`UPDATE articles SET status = 'pending_review' WHERE id = ${id}`);
}

/** Only rejected articles can be deleted. Index entries cascade; runs keep their history (article_id set null). */
const BLOB_URL = /^https:\/\/[a-z0-9.-]+\.public\.blob\.vercel-storage\.com\//i;

/** Image URLs in Markdown content, in order (for listing and clean-up). */
export function listContentImages(markdown: string): { url: string; alt: string }[] {
  const images: { url: string; alt: string }[] = [];
  walk(parseMarkdown(markdown), (n) => {
    if (n.type === "image" && n.url) images.push({ url: n.url, alt: (n as { alt?: string }).alt ?? "" });
  });
  return images;
}

/**
 * Permanently deletes an agent article in any state. Index entries cascade; runs keep their history (article_id set
 * null). Returns what the caller must clean up: whether the live page must be revalidated, the published articles
 * that still link to it, and the Blob images it used (featured and in-content).
 */
export async function deleteArticle(db: Db, id: string): Promise<{ slug: string; wasPublished: boolean; linkedFrom: string[]; blobUrls: string[] }> {
  const a = await requireAgentArticle(db, id, ["draft", "pending_review", "rejected", "published", "archived"]);
  const linkedFrom = a.status === "published" ? await publishedLinkersOf(db, id, a.slug) : [];
  const [row] = rowsOf<{ slug: string }>(await db.execute(sql`DELETE FROM articles WHERE id = ${id} RETURNING slug`));
  if (!row) throw new AdminError("The article was already deleted");
  const blobUrls = [a.featured_image ?? "", ...listContentImages(a.content).map((i) => i.url)].filter((u) => BLOB_URL.test(u));
  return { slug: row.slug, wasPublished: a.status === "published", linkedFrom, blobUrls: [...new Set(blobUrls)] };
}

/** H2 section headings an image can be added under (the FAQ section excluded: its answers feed structured data). */
export function sectionHeadings(markdown: string): string[] {
  return (parseMarkdown(markdown).children ?? [])
    .filter((n) => n.type === "heading" && n.depth === 2)
    .map((n) => textOf(n).trim())
    .filter((t) => t && !/faq|frequently asked/i.test(t));
}

const escapeAlt = (alt: string) => alt.replace(/\s+/g, " ").trim().replace(/[[\]\\]/g, "");

/**
 * Inserts an image directly under an H2 section heading (before its first paragraph). The image is plain Markdown,
 * so it is sanitised and lazy-loaded like any other content; it is not a link, so link and citation checks ignore it.
 */
export async function insertSectionImage(db: Db, id: string, heading: string, url: string, alt: string, provider: EmbeddingsProvider | null = null) {
  const a = await requireAgentArticle(db, id, ["pending_review", "rejected", "published"]);
  if (!url.startsWith("/") && !BLOB_URL.test(url)) throw new AdminError("Images must be a site path or a Vercel Blob URL");
  const text = escapeAlt(alt);
  if (text.length < 5 || text.length > 125) throw new AdminError("Alt text must be 5–125 characters");
  if (!sectionHeadings(a.content).includes(heading.trim())) throw new AdminError("Choose one of the article's sections");
  const lines = a.content.split("\n");
  const at = lines.findIndex((l) => {
    const m = /^##\s+(.+?)\s*#*\s*$/.exec(l);
    return m !== null && textOf(parseMarkdown(l)).trim() === heading.trim();
  });
  if (at < 0) throw new AdminError("Choose one of the article's sections");
  lines.splice(at + 1, 0, "", `![${text}](${url})`);
  await saveContent(db, id, a.title, lines.join("\n").replace(/\n{3,}/g, "\n\n"));
  if (a.status === "published") await reindex(db, id, provider, true);
  return { slug: a.slug, status: a.status };
}

/** Removes an in-content image by URL. Returns whether it was a Blob image (the caller deletes the file). */
export async function removeContentImage(db: Db, id: string, url: string, provider: EmbeddingsProvider | null = null) {
  const a = await requireAgentArticle(db, id, ["pending_review", "rejected", "published"]);
  const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^!\\[[^\\]]*\\]\\(${escaped}\\)\\s*$`);
  const lines = a.content.split("\n");
  const kept = lines.filter((l) => !pattern.test(l));
  if (kept.length === lines.length) throw new AdminError("That image is not in the article");
  await saveContent(db, id, a.title, kept.join("\n").replace(/\n{3,}/g, "\n\n"));
  if (a.status === "published") await reindex(db, id, provider, true);
  return { slug: a.slug, status: a.status, isBlob: BLOB_URL.test(url) };
}
