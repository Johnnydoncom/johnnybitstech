import { sql } from "drizzle-orm";
import { rowsOf } from "@/db/rows";
import type { Db } from "@/db/types";
import { STAGE_FLOW, STAGE_PREREQUISITES, type AgentStage } from "../schemas/stages";
import { ToolError } from "./types";

/** A run whose heartbeat is older than this is abandoned and its keyword re-queued. */
export const STALE_RUN_HOURS = 6;
/** A keyword claimed without a run (should not happen; claim and run creation are atomic) is released after this. */
export const STALE_CLAIM_MINUTES = 60;

export type RunRow = {
  id: string;
  keyword_id: string | null;
  keyword: string;
  status: "running" | "needs_human" | "draft_created" | "failed" | "abandoned";
  current_stage: string | null;
  article_id: string | null;
  client_id: string | null;
  error: unknown;
  cannibalization: { verdict: "ok" | "review" | "block" } & Record<string, unknown> | null;
  started_at: string | Date;
  heartbeat_at: string | Date;
  finished_at: string | Date | null;
};

export type StageRecord = { stage: AgentStage; version: number; output: Record<string, unknown>; content_hash: string | null; created_at: string | Date };

export async function loadRun(db: Db, runId: string): Promise<RunRow> {
  const [run] = rowsOf<RunRow>(await db.execute(sql`SELECT * FROM pipeline_runs WHERE id = ${runId}`));
  if (!run) throw new ToolError("not_found", `Run ${runId} does not exist`, "Use the run_id returned by claim_next_keyword or create_run");
  return run;
}

export function assertRunning(run: RunRow) {
  if (run.status !== "running") {
    throw new ToolError(
      "invalid_state",
      `Run is ${run.status}, not running`,
      run.status === "needs_human" ? "A human must review this run in the admin before it can continue" : "Start a new run with claim_next_keyword",
    );
  }
}

export async function touchRun(db: Db, runId: string, stage?: AgentStage) {
  await db.execute(sql`
    UPDATE pipeline_runs SET heartbeat_at = now(), current_stage = coalesce(${stage ?? null}::pipeline_stage, current_stage)
    WHERE id = ${runId} AND status = 'running'
  `);
}

/** Latest version of every saved stage for a run. */
export async function latestStages(db: Db, runId: string): Promise<Map<AgentStage, StageRecord>> {
  const rows = rowsOf<StageRecord>(
    await db.execute(sql`
      SELECT DISTINCT ON (stage) stage, version, output, content_hash, created_at
      FROM pipeline_stage_outputs WHERE run_id = ${runId}
      ORDER BY stage, version DESC
    `),
  );
  return new Map(rows.map((r) => [r.stage, r]));
}

export function nextStage(saved: ReadonlyMap<AgentStage, unknown>): AgentStage | "index_and_create_draft" {
  return STAGE_FLOW.find((s) => !saved.has(s)) ?? "index_and_create_draft";
}

/** Stages saved before a newer version of one of their prerequisites (they need redoing). */
export function staleStages(saved: ReadonlyMap<AgentStage, StageRecord>): AgentStage[] {
  const time = (s: AgentStage) => new Date(saved.get(s)!.created_at).getTime();
  const stale = new Set<AgentStage>();
  // Walk in dependency order so staleness propagates (a stale s6 makes s7/s8/s9 stale too).
  for (const stage of STAGE_FLOW.concat(["s2_cluster"])) {
    if (!saved.has(stage)) continue;
    for (const pre of STAGE_PREREQUISITES[stage]) {
      if (saved.has(pre) && (stale.has(pre) || time(pre) > time(stage))) stale.add(stage);
    }
  }
  return [...stale];
}

/** Releases abandoned runs and orphaned claims so their keywords can be picked up again. */
export async function releaseStale(db: Db) {
  await db.execute(sql`
    WITH stale AS (
      UPDATE pipeline_runs
      SET status = 'abandoned', finished_at = now(),
          error = jsonb_build_object('code', 'stale', 'message', ${`No activity for ${STALE_RUN_HOURS} hours`}::text)
      WHERE status = 'running' AND heartbeat_at < now() - make_interval(hours => ${STALE_RUN_HOURS}::int)
      RETURNING keyword_id
    )
    UPDATE keyword_queue SET status = 'queued', claimed_at = NULL, claimed_by_run = NULL
    WHERE id IN (SELECT keyword_id FROM stale WHERE keyword_id IS NOT NULL)
  `);
  await db.execute(sql`
    UPDATE keyword_queue SET status = 'queued', claimed_at = NULL
    WHERE status = 'claimed' AND claimed_by_run IS NULL AND claimed_at < now() - make_interval(mins => ${STALE_CLAIM_MINUTES}::int)
  `);
}
