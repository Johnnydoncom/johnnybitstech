import { sql } from "drizzle-orm";
import { rowsOf } from "@/db/rows";
import type { Db } from "@/db/types";
import type { PipelineStage } from "@/db/schema";
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
  post_number: number | null;
  error: unknown;
  cannibalization: { verdict: "ok" | "review" | "block" } & Record<string, unknown> | null;
  started_at: string | Date;
  heartbeat_at: string | Date;
  finished_at: string | Date | null;
};

export type StageRecord = { stage: PipelineStage; version: number; output: Record<string, unknown>; content_hash: string | null; created_at: string | Date };
export type StageMap = Map<PipelineStage, StageRecord>;

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

export async function touchRun(db: Db, runId: string, stage?: PipelineStage) {
  await db.execute(sql`
    UPDATE pipeline_runs SET heartbeat_at = now(), current_stage = coalesce(${stage ?? null}::pipeline_stage, current_stage)
    WHERE id = ${runId} AND status = 'running'
  `);
}

/** Latest version of every saved stage for a run. */
export async function latestStages(db: Db, runId: string): Promise<StageMap> {
  const rows = rowsOf<StageRecord>(
    await db.execute(sql`
      SELECT DISTINCT ON (stage) stage, version, output, content_hash, created_at
      FROM pipeline_stage_outputs WHERE run_id = ${runId}
      ORDER BY stage, version DESC
    `),
  );
  return new Map(rows.map((r) => [r.stage, r]));
}

const at = (r: StageRecord | undefined) => (r ? new Date(r.created_at).getTime() : 0);

/**
 * The next stage to save or tool to call. App steps are bound to content hashes, so re-saving the draft
 * (s6) makes the inserted links, SEO package, originality check, QA and validation stale automatically.
 */
export function nextStage(saved: ReadonlyMap<PipelineStage, StageRecord>, run?: Pick<RunRow, "cannibalization"> | null): string {
  const get = (s: PipelineStage) => saved.get(s);
  if (!get("s1_keyword")) return "s1_keyword";
  if (run && !run.cannibalization) return "check_cannibalization";
  for (const s of ["s3_brief", "s4_research", "s5_outline", "s6_draft"] as const) if (!get(s)) return s;
  const draft = get("s6_draft")!;
  const links = get("s8_links");
  if (!links || at(links) < at(draft)) return "s8_links";
  const applied = get("s8_applied");
  if (!applied || applied.output.source_draft_hash !== draft.content_hash || at(applied) < at(links)) return "apply_internal_links";
  const seo = get("s7_seo");
  if (!seo) return "s7_seo";
  const pkg = get("s7_package");
  if (!pkg || pkg.content_hash !== applied.content_hash || at(pkg) < at(seo)) return "build_seo_package";
  // Originality is checked on the linked text before QA, so the reviewer sees an article that is already original.
  const originality = get("s9_originality");
  if (!originality || originality.content_hash !== applied.content_hash) return "check_originality";
  if (originality.output.passed !== true) return "revise_for_originality";
  const qa = get("s9_qa");
  if (!qa || qa.content_hash !== draft.content_hash) return "s9_qa";
  const validation = get("s9_validation");
  if (!validation || validation.content_hash !== applied.content_hash || at(validation) < at(pkg)) return "validate_article";
  if (qa.output.verdict !== "PASS") return "revise_draft_after_qa";
  if (validation.output.passed !== true) return "revise_and_validate_again";
  const index = get("s10_index");
  if (!index || index.content_hash !== applied.content_hash || at(index) < at(validation)) return "index_article";
  if (!get("s11_draft")) return "create_draft";
  return "done";
}

/** Stages saved before a newer version of one of their prerequisites (they need redoing). */
export function staleStages(saved: ReadonlyMap<PipelineStage, StageRecord>): AgentStage[] {
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

/** Appends a new version of a stage output (agent- or app-produced). Retries once on a concurrent save. */
export async function insertStageOutput(
  db: Db,
  runId: string,
  stage: PipelineStage,
  output: unknown,
  contentHash: string | null,
): Promise<number> {
  const insert = () =>
    db.execute(sql`
      INSERT INTO pipeline_stage_outputs (run_id, stage, version, output, content_hash)
      SELECT ${runId}, ${stage}::pipeline_stage, coalesce(max(version), 0) + 1, ${JSON.stringify(output)}::jsonb, ${contentHash}
      FROM pipeline_stage_outputs WHERE run_id = ${runId} AND stage = ${stage}::pipeline_stage
      RETURNING version
    `);
  let result;
  try {
    result = await insert();
  } catch (error) {
    const code = (error as { code?: string; cause?: { code?: string } }).code ?? (error as { cause?: { code?: string } }).cause?.code;
    if (code !== "23505") throw error;
    result = await insert();
  }
  return rowsOf<{ version: number }>(result)[0].version;
}

export function requireStage(saved: ReadonlyMap<PipelineStage, StageRecord>, stage: PipelineStage, hint: string): StageRecord {
  const record = saved.get(stage);
  if (!record) throw new ToolError("invalid_state", `${stage} has not been saved yet`, hint);
  return record;
}

export function savedAt(record: StageRecord | undefined): number {
  return record ? new Date(record.created_at).getTime() : 0;
}
