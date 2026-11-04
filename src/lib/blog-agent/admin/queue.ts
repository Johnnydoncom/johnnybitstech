import { sql } from "drizzle-orm";
import { rowsOf } from "@/db/rows";
import type { Db } from "@/db/types";
import { MAX_POSTS_PER_KEYWORD, writtenCountSql } from "../tools/keyword-posts";
import { normalizeKeyword } from "../tools/types";
import { AdminError } from "./drafts";

export type QueueRow = {
  id: string; keyword: string; priority: number; status: string; source: string; notes: string | null;
  cluster: string | null; claimed_by_run: string | null; created_at: string | Date;
  /** Posts wanted for the keyword, and how many are written (awaiting review or published). */
  posts_target: number; posts_written: number;
};

function checkPosts(posts: number) {
  if (!Number.isInteger(posts) || posts < 1 || posts > MAX_POSTS_PER_KEYWORD) {
    throw new AdminError(`Posts per keyword must be a whole number from 1 to ${MAX_POSTS_PER_KEYWORD}`);
  }
}

export async function listQueue(db: Db, status?: string): Promise<QueueRow[]> {
  return rowsOf<QueueRow>(
    await db.execute(sql`
      SELECT k.id, k.keyword, k.priority, k.status::text AS status, k.source, k.notes, c.name AS cluster, k.claimed_by_run, k.created_at,
             k.posts_target, ${writtenCountSql(sql`k.id`)} AS posts_written
      FROM keyword_queue k LEFT JOIN content_clusters c ON c.id = k.cluster_id
      WHERE ${status ? sql`k.status::text = ${status}` : sql`true`}
      ORDER BY CASE k.status WHEN 'claimed' THEN 0 WHEN 'queued' THEN 1 WHEN 'failed' THEN 2 ELSE 3 END, k.priority DESC, k.created_at
      LIMIT 500
    `),
  );
}

/**
 * Adds one keyword per line (admins may use priority up to 100), each to be written `posts` times as distinct
 * articles. Returns added/skipped counts.
 */
export async function addKeywords(db: Db, text: string, priority: number, notes: string | null, posts = 1) {
  if (!Number.isInteger(priority) || priority < 0 || priority > 100) throw new AdminError("Priority must be a whole number from 0 to 100");
  checkPosts(posts);
  const lines = [...new Set(text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length >= 2))];
  if (!lines.length) throw new AdminError("Enter at least one keyword (one per line)");
  if (lines.length > 200) throw new AdminError("At most 200 keywords at a time");
  let added = 0;
  const skipped: string[] = [];
  for (const keyword of lines) {
    if (keyword.length > 200) {
      skipped.push(keyword.slice(0, 40));
      continue;
    }
    const rows = rowsOf(
      await db.execute(sql`
        INSERT INTO keyword_queue (keyword, keyword_normalized, priority, posts_target, notes, source)
        VALUES (${keyword}, ${normalizeKeyword(keyword)}, ${priority}::int, ${posts}::int, ${notes}, 'admin')
        ON CONFLICT (keyword_normalized) DO NOTHING RETURNING id
      `),
    );
    if (rows.length) added++;
    else skipped.push(keyword);
  }
  return { added, skipped };
}

export async function setPriority(db: Db, id: string, priority: number) {
  if (!Number.isInteger(priority) || priority < 0 || priority > 100) throw new AdminError("Priority must be a whole number from 0 to 100");
  await db.execute(sql`UPDATE keyword_queue SET priority = ${priority}::int WHERE id = ${id}`);
}

/**
 * Changes how many posts a keyword should get. A finished keyword whose new target is higher goes back in the queue;
 * a queued keyword that already has enough posts is marked done. A keyword being written keeps its status (the
 * draft step applies the new target when it finishes).
 */
export async function setPostsTarget(db: Db, id: string, posts: number): Promise<{ status: string; posts_written: number }> {
  checkPosts(posts);
  const [row] = rowsOf<{ status: string; posts_written: number }>(
    await db.execute(sql`
      UPDATE keyword_queue k
      SET posts_target = ${posts}::int,
          status = CASE
            WHEN k.status = 'done' AND ${writtenCountSql(sql`k.id`)} < ${posts}::int THEN 'queued'::keyword_status
            WHEN k.status = 'queued' AND ${writtenCountSql(sql`k.id`)} >= ${posts}::int THEN 'done'::keyword_status
            ELSE k.status END,
          claimed_at = CASE WHEN k.status = 'done' AND ${writtenCountSql(sql`k.id`)} < ${posts}::int THEN NULL ELSE k.claimed_at END,
          claimed_by_run = CASE WHEN k.status = 'done' AND ${writtenCountSql(sql`k.id`)} < ${posts}::int THEN NULL ELSE k.claimed_by_run END
      WHERE k.id = ${id}
      RETURNING k.status::text AS status, ${writtenCountSql(sql`k.id`)} AS posts_written
    `),
  );
  if (!row) throw new AdminError("Keyword not found");
  return row;
}

export async function skipKeyword(db: Db, id: string) {
  const rows = rowsOf(await db.execute(sql`UPDATE keyword_queue SET status = 'skipped' WHERE id = ${id} AND status = 'queued' RETURNING id`));
  if (!rows.length) throw new AdminError("Only queued keywords can be skipped");
}

/** Puts a failed or skipped keyword back in the queue. */
export async function requeueKeyword(db: Db, id: string) {
  const rows = rowsOf(
    await db.execute(sql`
      UPDATE keyword_queue SET status = 'queued', claimed_at = NULL, claimed_by_run = NULL
      WHERE id = ${id} AND status IN ('failed', 'skipped') RETURNING id
    `),
  );
  if (!rows.length) throw new AdminError("Only failed or skipped keywords can be re-queued");
}

export async function deleteKeyword(db: Db, id: string) {
  const rows = rowsOf(await db.execute(sql`DELETE FROM keyword_queue WHERE id = ${id} AND status IN ('queued', 'skipped', 'failed') RETURNING id`));
  if (!rows.length) throw new AdminError("Keywords that are being written or already written cannot be deleted");
}
