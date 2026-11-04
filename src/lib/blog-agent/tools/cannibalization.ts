import { sql } from "drizzle-orm";
import { z } from "zod";
import { rowsOf } from "@/db/rows";
import type { s1KeywordSchema } from "../schemas/stages";
import { assertRunning, latestStages, loadRun, touchRun } from "./run-store";
import { defineTool, normalizeKeyword, ToolError } from "./types";

/** Heuristic thresholds; Claude makes the final call on "review". */
export const REVIEW_SCORE = 0.5;
export const REVIEW_TRIGRAM = 0.55;
/** A primary keyword this similar to an earlier post's for the same queue keyword is a near-duplicate. */
export const SIBLING_NEAR_DUPLICATE = 0.8;

const match = z.object({
  kind: z.enum(["article", "run"]),
  url: z.string().nullable(),
  title: z.string(),
  status: z.string(),
  primary_keyword: z.string().nullable(),
  score: z.number(),
  reason: z.string(),
  sibling: z.boolean().describe("An earlier post written for the same queue keyword"),
});

export const checkCannibalization = defineTool({
  name: "check_cannibalization",
  title: "Check the keyword against existing content",
  description:
    "Run after saving s1_keyword. Compares the primary and secondary keywords with published articles, drafts awaiting review and other " +
    "in-progress runs. verdict: \"block\" (same keyword already covered: stop and call report_failure recommending an update; but when " +
    "sibling_conflict is true the clash is with an earlier post for this same queue keyword: choose a distinct long-tail primary keyword, " +
    "re-save s1_keyword and check again), \"review\" (similar content exists: choose a clearly different angle and say how in the brief, or stop), \"ok\".",
  input: z.object({ run_id: z.string().uuid() }),
  output: z.object({
    verdict: z.enum(["ok", "review", "block"]),
    sibling_conflict: z.boolean(),
    keyword: z.string(),
    matches: z.array(match),
    guidance: z.string(),
  }),
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  async run(ctx, input) {
    const run = await loadRun(ctx.db, input.run_id);
    assertRunning(run);
    const s1 = (await latestStages(ctx.db, run.id)).get("s1_keyword")?.output as z.output<typeof s1KeywordSchema> | undefined;
    if (!s1) throw new ToolError("invalid_state", "Save s1_keyword before checking cannibalization");

    const primary = normalizeKeyword(s1.primary_keyword);
    const query = [s1.primary_keyword, ...s1.secondary_keywords.slice(0, 5)].join(" ");

    // Earlier posts written for the same queue keyword (posts-per-keyword).
    const siblingRows = run.keyword_id
      ? rowsOf<{ slug: string; title: string; status: string; primary_keyword: string; sim: number }>(
          await ctx.db.execute(sql`
            SELECT a.slug, a.title, a.status::text AS status, a.primary_keyword,
                   similarity(lower(a.primary_keyword), lower(${s1.primary_keyword}))::float8 AS sim
            FROM articles a JOIN pipeline_runs r ON r.id = a.run_id
            WHERE r.keyword_id = ${run.keyword_id}::uuid AND r.id <> ${run.id}::uuid
              AND a.status IN ('published', 'pending_review') AND a.primary_keyword IS NOT NULL
          `),
        )
      : [];
    const siblingSlugs = new Set(siblingRows.map((r) => r.slug));
    const nearDuplicateSiblings = siblingRows.filter((r) => normalizeKeyword(r.primary_keyword) !== primary && Number(r.sim) >= SIBLING_NEAR_DUPLICATE);

    const exactArticles = rowsOf<{ slug: string; title: string; status: string; primary_keyword: string | null }>(
      await ctx.db.execute(sql`
        SELECT slug, title, status, primary_keyword FROM articles
        WHERE status IN ('published', 'pending_review') AND primary_keyword IS NOT NULL
      `),
    ).filter((a) => normalizeKeyword(a.primary_keyword!) === primary);

    const otherRuns = rowsOf<{ id: string; keyword: string; s1_primary: string | null }>(
      await ctx.db.execute(sql`
        SELECT r.id, r.keyword,
               (SELECT o.output->>'primary_keyword' FROM pipeline_stage_outputs o
                WHERE o.run_id = r.id AND o.stage = 's1_keyword' ORDER BY o.version DESC LIMIT 1) AS s1_primary
        FROM pipeline_runs r WHERE r.status = 'running' AND r.id <> ${run.id}
      `),
    ).filter((r) => normalizeKeyword(r.keyword) === primary || (r.s1_primary && normalizeKeyword(r.s1_primary) === primary));

    const similar = rowsOf<{ slug: string; title: string; status: string; primary_keyword: string | null; score: number; trigram: number }>(
      await ctx.db.execute(sql`
        WITH q AS (
          SELECT CASE WHEN plainto_tsquery('english', ${query})::text = '' THEN NULL
                      ELSE replace(plainto_tsquery('english', ${query})::text, ' & ', ' | ')::tsquery END AS tsq,
                 ${s1.primary_keyword}::text AS raw
        )
        SELECT slug, title, status::text AS status, primary_keyword,
               greatest(similarity(title, q.raw), similarity(coalesce(primary_keyword, ''), q.raw))::float8 AS trigram,
               round((0.7 * coalesce(ts_rank_cd(search_tsv, q.tsq, 32), 0)
                    + 0.3 * greatest(similarity(title, q.raw), similarity(coalesce(primary_keyword, ''), q.raw)))::numeric, 4)::float8 AS score
        FROM articles, q
        WHERE status IN ('published', 'pending_review')
          AND ((q.tsq IS NOT NULL AND search_tsv @@ q.tsq) OR title % q.raw OR primary_keyword % q.raw)
        ORDER BY score DESC
        LIMIT 8
      `),
    );

    const matches: z.output<typeof match>[] = [
      ...exactArticles.map((a) => ({
        kind: "article" as const, url: `/blog/${a.slug}`, title: a.title, status: a.status, primary_keyword: a.primary_keyword, score: 1,
        reason: siblingSlugs.has(a.slug) ? "Same primary keyword as an earlier post for this keyword" : "Same primary keyword", sibling: siblingSlugs.has(a.slug),
      })),
      ...nearDuplicateSiblings.map((a) => ({
        kind: "article" as const, url: `/blog/${a.slug}`, title: a.title, status: a.status, primary_keyword: a.primary_keyword, score: Number(a.sim),
        reason: "Nearly the same primary keyword as an earlier post for this keyword", sibling: true,
      })),
      ...otherRuns.map((r) => ({ kind: "run" as const, url: null, title: r.keyword, status: "running", primary_keyword: r.s1_primary, score: 1, reason: `Another run (${r.id}) is writing this keyword`, sibling: false })),
      ...similar
        .filter((s) => !exactArticles.some((a) => a.slug === s.slug) && !nearDuplicateSiblings.some((a) => a.slug === s.slug))
        .map((s) => ({
          kind: "article" as const,
          url: `/blog/${s.slug}`,
          title: s.title,
          status: s.status,
          primary_keyword: s.primary_keyword,
          score: Number(s.score),
          reason: siblingSlugs.has(s.slug) ? "Earlier post for this keyword" : Number(s.trigram) >= REVIEW_TRIGRAM ? "Very similar title or keyword" : "Overlapping topic",
          sibling: siblingSlugs.has(s.slug),
        })),
    ];

    const blockingOthers = exactArticles.some((a) => !siblingSlugs.has(a.slug)) || otherRuns.length > 0;
    const siblingConflict = !blockingOthers && (exactArticles.length > 0 || nearDuplicateSiblings.length > 0);
    const verdict: "ok" | "review" | "block" =
      blockingOthers || siblingConflict
        ? "block"
        : similar.some((s) => Number(s.score) >= REVIEW_SCORE || Number(s.trigram) >= REVIEW_TRIGRAM)
          ? "review"
          : "ok";
    const hasSiblings = siblingRows.length > 0;
    const guidance = {
      block: siblingConflict
        ? "This primary keyword (or one nearly identical) is already targeted by an earlier post for this queue keyword. Do not stop: choose a " +
          "distinct long-tail primary keyword with a different intent or angle (a sub-topic, audience, location, budget or question the earlier posts " +
          "do not target), re-save s1_keyword, then call check_cannibalization again."
        : "Stop. Call report_failure with stage s1_keyword and recommend updating the matching article instead.",
      review: "Similar content exists. Proceed only with a clearly different search intent or angle, state it in the brief's angle and avoid fields, and link to the related article; otherwise stop and report.",
      ok: "No conflicting content. Continue to the brief (s3_brief).",
    }[verdict] + (hasSiblings && verdict !== "block" ? " Earlier posts for this keyword are marked sibling: this post's angle, H2s and examples must differ from theirs." : "");

    const result = { verdict, sibling_conflict: siblingConflict, keyword: s1.primary_keyword, matches, guidance };
    await ctx.db.execute(sql`
      UPDATE pipeline_runs SET cannibalization = ${JSON.stringify({ ...result, checked_at: new Date().toISOString() })}::jsonb
      WHERE id = ${run.id}
    `);
    await touchRun(ctx.db, run.id);
    return result;
  },
});
