import { sql } from "drizzle-orm";
import { z } from "zod";
import { rowsOf } from "@/db/rows";
import type { s1KeywordSchema } from "../schemas/stages";
import { assertRunning, latestStages, loadRun, touchRun } from "./run-store";
import { defineTool, normalizeKeyword, ToolError } from "./types";

/** Heuristic thresholds; Claude makes the final call on "review". */
export const REVIEW_SCORE = 0.5;
export const REVIEW_TRIGRAM = 0.55;

const match = z.object({
  kind: z.enum(["article", "run"]),
  url: z.string().nullable(),
  title: z.string(),
  status: z.string(),
  primary_keyword: z.string().nullable(),
  score: z.number(),
  reason: z.string(),
});

export const checkCannibalization = defineTool({
  name: "check_cannibalization",
  title: "Check the keyword against existing content",
  description:
    "Run after saving s1_keyword. Compares the primary and secondary keywords with published articles, drafts awaiting review and other " +
    "in-progress runs. verdict: \"block\" (same keyword already covered: stop and call report_failure recommending an update), " +
    "\"review\" (similar content exists: choose a clearly different angle and say how in the brief, or stop), \"ok\".",
  input: z.object({ run_id: z.string().uuid() }),
  output: z.object({
    verdict: z.enum(["ok", "review", "block"]),
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
      ...exactArticles.map((a) => ({ kind: "article" as const, url: `/blog/${a.slug}`, title: a.title, status: a.status, primary_keyword: a.primary_keyword, score: 1, reason: "Same primary keyword" })),
      ...otherRuns.map((r) => ({ kind: "run" as const, url: null, title: r.keyword, status: "running", primary_keyword: r.s1_primary, score: 1, reason: `Another run (${r.id}) is writing this keyword` })),
      ...similar
        .filter((s) => !exactArticles.some((a) => a.slug === s.slug))
        .map((s) => ({
          kind: "article" as const,
          url: `/blog/${s.slug}`,
          title: s.title,
          status: s.status,
          primary_keyword: s.primary_keyword,
          score: Number(s.score),
          reason: Number(s.trigram) >= REVIEW_TRIGRAM ? "Very similar title or keyword" : "Overlapping topic",
        })),
    ];

    const verdict: "ok" | "review" | "block" =
      exactArticles.length || otherRuns.length
        ? "block"
        : similar.some((s) => Number(s.score) >= REVIEW_SCORE || Number(s.trigram) >= REVIEW_TRIGRAM)
          ? "review"
          : "ok";
    const guidance = {
      block: "Stop. Call report_failure with stage s1_keyword and recommend updating the matching article instead.",
      review: "Similar content exists. Proceed only with a clearly different search intent or angle, state it in the brief's angle and avoid fields, and link to the related article; otherwise stop and report.",
      ok: "No conflicting content. Continue to the brief (s3_brief).",
    }[verdict];

    const result = { verdict, keyword: s1.primary_keyword, matches, guidance };
    await ctx.db.execute(sql`
      UPDATE pipeline_runs SET cannibalization = ${JSON.stringify({ ...result, checked_at: new Date().toISOString() })}::jsonb
      WHERE id = ${run.id}
    `);
    await touchRun(ctx.db, run.id);
    return result;
  },
});
