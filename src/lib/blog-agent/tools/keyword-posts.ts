import { sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { rowsOf } from "@/db/rows";
import type { Db } from "@/db/types";

/** Most posts an admin or the agent may ask for per keyword (matches the DB check). */
export const MAX_POSTS_PER_KEYWORD = 20;

/** Articles that count as written for a keyword: awaiting review or live. Rejected or deleted drafts do not count. */
export const WRITTEN_STATUSES = ["pending_review", "published"] as const;

/** SQL for how many posts are written for the keyword whose id is `keywordId` (a column or a value). */
export function writtenCountSql(keywordId: SQL): SQL {
  return sql`(
    SELECT count(*)::int FROM articles a JOIN pipeline_runs r ON r.id = a.run_id
    WHERE r.keyword_id = ${keywordId} AND a.status IN ('pending_review', 'published')
  )`;
}

export const siblingSchema = z.object({
  title: z.string(),
  url: z.string(),
  status: z.string(),
  primary_keyword: z.string().nullable(),
  angle: z.string().nullable(),
  meta_description: z.string().nullable(),
  h2s: z.array(z.string()),
});
export type Sibling = z.output<typeof siblingSchema>;

export const postInfoSchema = z.object({
  number: z.number().int(),
  of: z.number().int(),
  written: z.number().int(),
  siblings: z.array(siblingSchema),
  guidance: z.string(),
});
export type PostInfo = z.output<typeof postInfoSchema>;

const h2s = (markdown: string) =>
  [...markdown.matchAll(/^##\s+(.+?)\s*#*\s*$/gm)].map((m) => m[1].trim()).filter((h) => !/^(faq|frequently asked questions)/i.test(h)).slice(0, 12);

/** Earlier posts (pending review or live) written for the same keyword, excluding the given run's own article. */
export async function keywordSiblings(db: Db, keywordId: string, excludeRunId: string | null): Promise<Sibling[]> {
  const rows = rowsOf<{ title: string; slug: string; status: string; primary_keyword: string | null; meta_description: string | null; content: string; angle: string | null }>(
    await db.execute(sql`
      SELECT a.title, a.slug, a.status::text AS status, a.primary_keyword, a.meta_description, a.content,
             (SELECT o.output->>'angle' FROM pipeline_stage_outputs o
              WHERE o.run_id = a.run_id AND o.stage = 's3_brief' ORDER BY o.version DESC LIMIT 1) AS angle
      FROM articles a JOIN pipeline_runs r ON r.id = a.run_id
      WHERE r.keyword_id = ${keywordId}::uuid AND a.status IN ('pending_review', 'published')
        AND ${excludeRunId ? sql`a.run_id <> ${excludeRunId}::uuid` : sql`true`}
      ORDER BY a.created_at
      LIMIT ${MAX_POSTS_PER_KEYWORD}
    `),
  );
  return rows.map((r) => ({
    title: r.title,
    url: `/blog/${r.slug}`,
    status: r.status,
    primary_keyword: r.primary_keyword,
    angle: r.angle,
    meta_description: r.meta_description,
    h2s: h2s(r.content),
  }));
}

export function postGuidance(number: number, of: number, siblings: readonly Sibling[]): string {
  if (number <= 1 && !siblings.length) {
    return of > 1
      ? `Post 1 of ${of} for this keyword. Later posts will take other angles, so cover the core search intent well.`
      : "Single post for this keyword.";
  }
  return (
    `Post ${number} of ${of} for this keyword; ${siblings.length} earlier post(s) are listed in siblings. This post must be a genuinely ` +
    "different article: choose a distinct long-tail primary keyword (a sub-topic, audience, location, budget or question the siblings do not target), " +
    "a different search intent or content type where possible, a different angle and H2 structure, and new research. Do not reuse or reword the " +
    "siblings' text. Link to the most relevant sibling in s8_links where it helps the reader."
  );
}

/** The run's place in its keyword's posts: number, target, how many are written, and the earlier posts. */
export async function postInfoForRun(db: Db, run: { id: string; keyword_id: string | null; post_number?: number | null }): Promise<PostInfo | null> {
  if (!run.keyword_id) return null;
  const [kw] = rowsOf<{ posts_target: number; written: number }>(
    await db.execute(sql`SELECT k.posts_target, ${writtenCountSql(sql`k.id`)} AS written FROM keyword_queue k WHERE k.id = ${run.keyword_id}::uuid`),
  );
  if (!kw) return null;
  const siblings = await keywordSiblings(db, run.keyword_id, run.id);
  const number = run.post_number ?? siblings.length + 1;
  const of = Math.max(kw.posts_target, number);
  return { number, of, written: kw.written, siblings, guidance: postGuidance(number, of, siblings) };
}
