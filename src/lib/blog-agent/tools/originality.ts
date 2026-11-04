import { sql } from "drizzle-orm";
import { z } from "zod";
import { rowsOf } from "@/db/rows";
import type { Db } from "@/db/types";
import {
  containment,
  COPIED_RUN_WORDS,
  htmlToText,
  INTERNAL_OVERLAP_ERROR,
  INTERNAL_OVERLAP_WARNING,
  markdownToText,
  prepare,
  round,
  sharedPassages,
  shingles,
  SOURCE_OVERLAP_ERROR,
  tokenize,
  unquotedShingles,
  type Passage,
} from "../qa/originality";
import { fetchSourceText, type SourceFetcher } from "../qa/source-fetch";
import type { s4ResearchSchema } from "../schemas/stages";
import { currentApplied, loadRunning, type Applied } from "./current";
import { insertStageOutput, nextStage, requireStage, touchRun } from "./run-store";
import { defineTool } from "./types";

/** Most distinct research sources fetched per check (cited ones first). */
export const MAX_SOURCES_CHECKED = 15;
/** Sources fetched in parallel. */
export const SOURCE_CONCURRENCY = 4;
/** No new source fetch starts after this long, so the tool answers within the route's time limit. */
export const SOURCE_DEADLINE_MS = 15_000;
/** A passage this long shared with another of the site's articles is an error (shorter ones are warnings). */
export const INTERNAL_PASSAGE_ERROR_WORDS = 25;

const issue = z.object({ path: z.string(), message: z.string() });
const passage = z.object({ words: z.number(), excerpt: z.string() });

export const originalityReportSchema = z.object({
  passed: z.boolean(),
  errors: z.array(issue),
  warnings: z.array(issue),
  internal: z.object({
    compared: z.number(),
    matches: z.array(z.object({ url: z.string(), title: z.string(), status: z.string(), overlap: z.number(), passages: z.array(passage) })),
  }),
  sources: z.object({
    checked: z.number(),
    not_checked: z.number(),
    results: z.array(
      z.object({
        url: z.string(),
        status: z.enum(["checked", "not_checked"]),
        reason: z.string().optional(),
        overlap: z.number().optional(),
        passages: z.array(passage).optional(),
      }),
    ),
  }),
  thresholds: z.object({
    copied_run_words: z.number(),
    internal_overlap_error: z.number(),
    internal_overlap_warning: z.number(),
    source_overlap_error: z.number(),
  }),
  checked_at: z.string(),
});
export type OriginalityReport = z.output<typeof originalityReportSchema>;

async function mapLimited<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    }),
  );
  return results;
}

const quote = (p: Passage) => `"${p.excerpt}" (${p.words} words)`;

export type OriginalityInput = {
  markdown: string;
  ownArticleRunId: string;
  research: z.output<typeof s4ResearchSchema>["items"];
};

/** Runs the internal and source checks. Exposed for tests; the tool wraps it. */
export async function checkOriginality(
  db: Db,
  input: OriginalityInput,
  fetchSource: SourceFetcher,
  now = () => Date.now(),
): Promise<OriginalityReport> {
  const draft = prepare(markdownToText(input.markdown));
  const draftShingles = unquotedShingles(draft.tokens);
  const errors: z.output<typeof issue>[] = [];
  const warnings: z.output<typeof issue>[] = [];

  // 1. The site's own articles (including other posts for the same keyword). Rejected drafts are not on the site.
  const articles = rowsOf<{ slug: string; title: string; status: string; content: string; content_format: string }>(
    await db.execute(sql`
      SELECT slug, title, status::text AS status, content, content_format::text AS content_format FROM articles
      WHERE status IN ('published', 'pending_review', 'draft', 'archived')
        AND (run_id IS NULL OR run_id <> ${input.ownArticleRunId}::uuid)
      ORDER BY updated_at DESC
      LIMIT 2000
    `),
  );
  const matches: OriginalityReport["internal"]["matches"] = [];
  for (const a of articles) {
    const words = tokenize(a.content_format === "html" ? htmlToText(a.content) : markdownToText(a.content)).map((t) => t.word);
    const overlap = containment(draftShingles, shingles(words));
    const passages = sharedPassages(draft.tokens, words, COPIED_RUN_WORDS).slice(0, 3);
    if (overlap < INTERNAL_OVERLAP_WARNING && !passages.length) continue;
    const url = `/blog/${a.slug}`;
    matches.push({ url, title: a.title, status: a.status, overlap: round(overlap), passages });
    const longest = passages[0]?.words ?? 0;
    const detail = `${Math.round(overlap * 100)}% of this article's 8-word phrases also appear in "${a.title}" (${url})`;
    if (overlap > INTERNAL_OVERLAP_ERROR || longest >= INTERNAL_PASSAGE_ERROR_WORDS) {
      errors.push({ path: `internal:${url}`, message: `${detail}${passages.length ? `; repeated text: ${quote(passages[0])}` : ""}. Rewrite it so this post stands on its own.` });
    } else {
      warnings.push({ path: `internal:${url}`, message: `${detail}${passages.length ? `; repeated text: ${quote(passages[0])}` : ""}.` });
    }
  }
  matches.sort((x, y) => y.overlap - x.overlap);

  // 2. The research sources: cited ones first, each URL once.
  const cited = new Set([...input.markdown.matchAll(/\[\^(r\d+)\]/g)].map((m) => m[1]));
  const ordered = [...input.research].sort((x, y) => Number(cited.has(y.id)) - Number(cited.has(x.id)));
  const urls = [...new Set(ordered.map((r) => r.source_url))];
  const toCheck = urls.slice(0, MAX_SOURCES_CHECKED);
  const deadline = now() + SOURCE_DEADLINE_MS;
  const results: OriginalityReport["sources"]["results"] = await mapLimited(toCheck, SOURCE_CONCURRENCY, async (url) => {
    if (now() > deadline) return { url, status: "not_checked" as const, reason: "time limit reached before this source was fetched" };
    const fetched = await fetchSource(url);
    if (!fetched.ok) return { url, status: "not_checked" as const, reason: fetched.reason };
    const words = tokenize(fetched.text).map((t) => t.word);
    const overlap = containment(draftShingles, shingles(words));
    const passages = sharedPassages(draft.tokens, words, COPIED_RUN_WORDS).slice(0, 5);
    if (passages.length) {
      errors.push({
        path: `source:${url}`,
        message: `${passages.length} passage(s) copied from this source without quotation marks, e.g. ${quote(passages[0])}. Rewrite them in your own words, or quote briefly with attribution.`,
      });
    } else if (overlap > SOURCE_OVERLAP_ERROR) {
      errors.push({ path: `source:${url}`, message: `${Math.round(overlap * 100)}% of this article's 8-word phrases match this source: it reads as a close paraphrase. Rewrite those sections in your own words and structure.` });
    }
    return { url, status: "checked" as const, overlap: round(overlap), passages };
  });
  for (const url of urls.slice(MAX_SOURCES_CHECKED)) results.push({ url, status: "not_checked", reason: `only the first ${MAX_SOURCES_CHECKED} sources are checked` });

  const notChecked = results.filter((r) => r.status === "not_checked");
  if (notChecked.length) {
    warnings.push({ path: "sources", message: `${notChecked.length} of ${results.length} source(s) could not be checked automatically; QA should compare the article with them by hand.` });
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    internal: { compared: articles.length, matches: matches.slice(0, 10) },
    sources: { checked: results.length - notChecked.length, not_checked: notChecked.length, results },
    thresholds: {
      copied_run_words: COPIED_RUN_WORDS,
      internal_overlap_error: INTERNAL_OVERLAP_ERROR,
      internal_overlap_warning: INTERNAL_OVERLAP_WARNING,
      source_overlap_error: SOURCE_OVERLAP_ERROR,
    },
    checked_at: new Date().toISOString(),
  };
}

export const checkOriginalityTool = defineTool({
  name: "check_originality",
  title: "Check the article is original",
  description:
    "Run after build_seo_package and before QA. Free plagiarism check on the linked article: compares it with every other article on the site " +
    "(including earlier posts for the same keyword) and fetches the research sources to find passages copied without quotation marks. " +
    `passed=false lists each problem: rewrite those passages in your own words in s6_draft (quoting a source needs quotation marks and a citation), ` +
    `redo the steps get_run reports, then check again. Copied = ${COPIED_RUN_WORDS}+ identical words in a row.`,
  input: z.object({ run_id: z.string().uuid() }),
  output: originalityReportSchema.extend({ next_stage: z.string() }),
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  async run(ctx, input) {
    const { run, saved } = await loadRunning(ctx, input.run_id);
    const applied = currentApplied(saved);
    const s4 = requireStage(saved, "s4_research", "Save s4_research first").output as z.output<typeof s4ResearchSchema>;
    const report = await checkOriginality(
      ctx.db,
      { markdown: (applied.output as Applied).markdown, ownArticleRunId: run.id, research: s4.items },
      ctx.fetchSource ?? fetchSourceText,
    );
    await insertStageOutput(ctx.db, run.id, "s9_originality", report, applied.content_hash);
    await touchRun(ctx.db, run.id, "s9_originality");
    saved.set("s9_originality", { stage: "s9_originality", version: 0, output: report, content_hash: applied.content_hash, created_at: new Date() });
    return { ...report, next_stage: nextStage(saved, run) };
  },
});
