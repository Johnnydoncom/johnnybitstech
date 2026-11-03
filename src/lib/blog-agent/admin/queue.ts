import { sql } from "drizzle-orm";
import { rowsOf } from "@/db/rows";
import type { Db } from "@/db/types";
import { normalizeKeyword } from "../tools/types";
import { AdminError } from "./drafts";

export type QueueRow = {
  id: string; keyword: string; priority: number; status: string; source: string; notes: string | null;
  cluster: string | null; claimed_by_run: string | null; created_at: string | Date;
};

export async function listQueue(db: Db, status?: string): Promise<QueueRow[]> {
  return rowsOf<QueueRow>(
    await db.execute(sql`
      SELECT k.id, k.keyword, k.priority, k.status::text AS status, k.source, k.notes, c.name AS cluster, k.claimed_by_run, k.created_at
      FROM keyword_queue k LEFT JOIN content_clusters c ON c.id = k.cluster_id
      WHERE ${status ? sql`k.status::text = ${status}` : sql`true`}
      ORDER BY CASE k.status WHEN 'claimed' THEN 0 WHEN 'queued' THEN 1 WHEN 'failed' THEN 2 ELSE 3 END, k.priority DESC, k.created_at
      LIMIT 500
    `),
  );
}

/** Adds one keyword per line (admins may use priority up to 100). Returns added/skipped counts. */
export async function addKeywords(db: Db, text: string, priority: number, notes: string | null) {
  if (!Number.isInteger(priority) || priority < 0 || priority > 100) throw new AdminError("Priority must be a whole number from 0 to 100");
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
        INSERT INTO keyword_queue (keyword, keyword_normalized, priority, notes, source)
        VALUES (${keyword}, ${normalizeKeyword(keyword)}, ${priority}::int, ${notes}, 'admin')
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
