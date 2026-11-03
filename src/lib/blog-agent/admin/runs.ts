import { sql } from "drizzle-orm";
import { rowsOf } from "@/db/rows";
import type { Db } from "@/db/types";
import { AdminError } from "./drafts";

export type RunListRow = {
  id: string; keyword: string; status: string; current_stage: string | null; article_id: string | null; article_slug: string | null;
  started_at: string | Date; heartbeat_at: string | Date; finished_at: string | Date | null; embedding_cost_usd: string; error: { reason?: string; message?: string } | null;
};

export async function listRuns(db: Db, status?: string): Promise<RunListRow[]> {
  return rowsOf<RunListRow>(
    await db.execute(sql`
      SELECT r.id, r.keyword, r.status::text AS status, r.current_stage::text AS current_stage, r.article_id, a.slug AS article_slug,
             r.started_at, r.heartbeat_at, r.finished_at, r.embedding_cost_usd::text AS embedding_cost_usd, r.error
      FROM pipeline_runs r LEFT JOIN articles a ON a.id = r.article_id
      WHERE ${status ? sql`r.status::text = ${status}` : sql`true`}
      ORDER BY r.started_at DESC LIMIT 200
    `),
  );
}

export type RunDetail = {
  run: RunListRow & { keyword_id: string | null; client_id: string | null; cannibalization: unknown; keyword_status: string | null };
  stages: { stage: string; version: number; output: unknown; content_hash: string | null; created_at: string | Date }[];
  calls: { tool: string; ok: boolean; error_code: string | null; duration_ms: number; created_at: string | Date }[];
};

export async function getRunDetail(db: Db, id: string): Promise<RunDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [run] = rowsOf<RunDetail["run"]>(
    await db.execute(sql`
      SELECT r.id, r.keyword, r.keyword_id, r.client_id, r.status::text AS status, r.current_stage::text AS current_stage, r.article_id,
             a.slug AS article_slug, r.started_at, r.heartbeat_at, r.finished_at, r.embedding_cost_usd::text AS embedding_cost_usd,
             r.error, r.cannibalization, k.status::text AS keyword_status
      FROM pipeline_runs r LEFT JOIN articles a ON a.id = r.article_id LEFT JOIN keyword_queue k ON k.id = r.keyword_id
      WHERE r.id = ${id}
    `),
  );
  if (!run) return null;
  const stages = rowsOf<RunDetail["stages"][number]>(
    await db.execute(sql`SELECT stage::text AS stage, version, output, content_hash, created_at FROM pipeline_stage_outputs WHERE run_id = ${id} ORDER BY created_at, version`),
  );
  const calls = rowsOf<RunDetail["calls"][number]>(
    await db.execute(sql`SELECT tool, ok, error_code, duration_ms, created_at FROM mcp_call_log WHERE run_id = ${id} ORDER BY created_at`),
  );
  return { run, stages, calls };
}

/** Stops a run that is still running or waiting for a human. Its keyword is marked failed (re-queue it separately). */
export async function abandonRun(db: Db, id: string, adminEmail: string) {
  const rows = rowsOf<{ keyword_id: string | null }>(
    await db.execute(sql`
      UPDATE pipeline_runs SET status = 'abandoned', finished_at = coalesce(finished_at, now()),
             error = coalesce(error, '{}'::jsonb) || jsonb_build_object('abandoned_by', ${adminEmail}::text, 'abandoned_at', now())
      WHERE id = ${id} AND status IN ('running', 'needs_human') RETURNING keyword_id
    `),
  );
  if (!rows.length) throw new AdminError("Only running or needs-human runs can be abandoned");
  if (rows[0].keyword_id) {
    await db.execute(sql`UPDATE keyword_queue SET status = 'failed', claimed_by_run = NULL WHERE id = ${rows[0].keyword_id} AND status = 'claimed'`);
  }
}

/**
 * Puts a stopped run (needs human, or abandoned) back to running so the next agent session continues from its saved
 * stages instead of starting over. The run is released from its old connection (client_id NULL) so any session of
 * the connector can adopt it, and its keyword is claimed for it again. Refused if the run already produced an article,
 * or the keyword is done or being written by another run.
 */
export async function resumeRun(db: Db, id: string, adminEmail: string) {
  const [row] = rowsOf<{ id: string; keyword_id: string | null }>(
    await db.execute(sql`
      WITH resumed AS (
        UPDATE pipeline_runs r
        SET status = 'running', finished_at = NULL, heartbeat_at = now(), client_id = NULL,
            error = coalesce(r.error, '{}'::jsonb) || jsonb_build_object('resumed_by', ${adminEmail}::text, 'resumed_at', now())
        WHERE r.id = ${id} AND r.status IN ('needs_human', 'abandoned') AND r.article_id IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM keyword_queue k
            WHERE k.id = r.keyword_id AND (k.status = 'done' OR (k.status = 'claimed' AND k.claimed_by_run IS DISTINCT FROM r.id))
          )
          AND NOT EXISTS (SELECT 1 FROM pipeline_runs o WHERE o.keyword_id = r.keyword_id AND o.id <> r.id AND o.status = 'running')
        RETURNING r.id, r.keyword_id
      ), claim AS (
        UPDATE keyword_queue k SET status = 'claimed', claimed_at = now(), claimed_by_run = resumed.id
        FROM resumed WHERE k.id = resumed.keyword_id
        RETURNING k.id
      )
      SELECT id, keyword_id FROM resumed
    `),
  );
  if (!row) {
    throw new AdminError("Only a stopped run without a draft can be resumed, and not while its keyword is done or being written by another run");
  }
  return row;
}

export async function overviewCounts(db: Db) {
  const [row] = rowsOf<Record<string, number>>(
    await db.execute(sql`
      SELECT
        (SELECT count(*)::int FROM keyword_queue WHERE status = 'queued') AS queued,
        (SELECT count(*)::int FROM pipeline_runs WHERE status = 'running') AS running,
        (SELECT count(*)::int FROM pipeline_runs WHERE status = 'needs_human') AS needs_human,
        (SELECT count(*)::int FROM articles WHERE status = 'pending_review') AS pending_review,
        (SELECT count(*)::int FROM articles WHERE status = 'rejected') AS rejected,
        (SELECT count(*)::int FROM articles WHERE status = 'published' AND content_format = 'markdown') AS published_by_agent,
        (SELECT count(*)::int FROM oauth_grants WHERE revoked_at IS NULL) AS connections
    `),
  );
  return row;
}

export async function listDrafts(db: Db) {
  return rowsOf<{ id: string; title: string; slug: string; status: string; word_count: number; featured_image: string | null; created_at: string | Date; updated_at: string | Date; published_at: string | Date | null; run_id: string | null }>(
    await db.execute(sql`
      SELECT id, title, slug, status::text AS status, word_count, featured_image, created_at, updated_at, published_at, run_id
      FROM articles WHERE content_format = 'markdown'
      ORDER BY CASE status WHEN 'pending_review' THEN 0 WHEN 'rejected' THEN 1 ELSE 2 END, updated_at DESC
      LIMIT 200
    `),
  );
}
