import { sql } from "drizzle-orm";
import { z } from "zod";
import { rowsOf } from "@/db/rows";
import { isUniqueViolation } from "@/lib/blog/admin";
import { contentHash } from "../hash";
import { AGENT_STAGES, STAGE_PREREQUISITES, stageSchemas, type AgentStage } from "../schemas/stages";
import { assertRunning, latestStages, loadRun, nextStage, staleStages, touchRun } from "./run-store";
import { checkStage, type CheckIssue } from "./stage-checks";
import { defineTool, runAdminUrl, ToolError } from "./types";

const runId = z.string().uuid();
const stageEnum = z.enum(AGENT_STAGES);
const iso = (v: string | Date | null) => (v ? new Date(v).toISOString() : null);

export const getRun = defineTool({
  name: "get_run",
  title: "Load a run and its saved stages",
  description:
    "Returns the run, the latest saved version of every stage (with outputs), the next stage to do, and stages that are stale " +
    "because an earlier stage was re-saved after them. Use it to resume after an interruption.",
  input: z.object({ run_id: runId }),
  output: z.object({
    run: z.object({
      id: z.string(),
      keyword: z.string(),
      status: z.string(),
      current_stage: z.string().nullable(),
      started_at: z.string(),
      heartbeat_at: z.string(),
      finished_at: z.string().nullable(),
      error: z.unknown(),
      cannibalization: z.unknown(),
      admin_url: z.string(),
    }),
    stages: z.record(z.string(), z.object({ version: z.number(), saved_at: z.string(), content_hash: z.string().nullable(), output: z.unknown() })),
    next_stage: z.string(),
    stale_stages: z.array(z.string()),
  }),
  annotations: { readOnlyHint: true, openWorldHint: false },
  async run(ctx, input) {
    const run = await loadRun(ctx.db, input.run_id);
    const saved = await latestStages(ctx.db, run.id);
    await touchRun(ctx.db, run.id);
    return {
      run: {
        id: run.id,
        keyword: run.keyword,
        status: run.status,
        current_stage: run.current_stage,
        started_at: iso(run.started_at)!,
        heartbeat_at: iso(run.heartbeat_at)!,
        finished_at: iso(run.finished_at),
        error: run.error ?? null,
        cannibalization: run.cannibalization ?? null,
        admin_url: runAdminUrl(ctx, run.id),
      },
      stages: Object.fromEntries(
        [...saved].map(([stage, r]) => [stage, { version: r.version, saved_at: iso(r.created_at)!, content_hash: r.content_hash, output: r.output }]),
      ),
      next_stage: nextStage(saved),
      stale_stages: staleStages(saved),
    };
  },
});

const issueSchema = z.object({ path: z.string(), message: z.string() });

export const saveStageOutput = defineTool({
  name: "save_stage_output",
  title: "Validate and save a stage output",
  description:
    "Validates a stage output against its schema and the site's data, then saves it as a new version. " +
    "Set validate_only=true to check without saving. On validation_failed, fix every listed issue and retry (max 2 retries), then call report_failure. " +
    "Stages: s1_keyword, s2_cluster (optional), s3_brief (needs check_cannibalization first), s4_research, s5_outline, s6_draft, s8_links, s7_seo, s9_qa.",
  input: z.object({
    run_id: runId,
    stage: stageEnum,
    output: z.record(z.string(), z.unknown()).describe("The stage output object, shaped as documented for that stage"),
    validate_only: z.boolean().default(false),
  }),
  output: z.object({
    saved: z.boolean(),
    stage: z.string(),
    version: z.number().optional(),
    content_hash: z.string().nullable().optional(),
    next_stage: z.string(),
    warnings: z.array(issueSchema),
  }),
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  async run(ctx, input) {
    const stage = input.stage as AgentStage;
    const run = await loadRun(ctx.db, input.run_id);
    assertRunning(run);
    const saved = await latestStages(ctx.db, run.id);

    const missing = STAGE_PREREQUISITES[stage].filter((s) => !saved.has(s));
    if (missing.length) throw new ToolError("invalid_state", `Save ${missing.join(", ")} before ${stage}`);
    if (stage === "s3_brief") {
      if (!run.cannibalization) throw new ToolError("invalid_state", "Call check_cannibalization before saving the brief");
      if (run.cannibalization.verdict === "block") {
        throw new ToolError("invalid_state", "Cannibalization check blocked this keyword", "Call report_failure recommending an update to the existing article");
      }
    }

    const parsed = stageSchemas[stage].safeParse(input.output);
    if (!parsed.success) {
      const issues: CheckIssue[] = parsed.error.issues.map((i) => ({ path: i.path.join(".") || "(root)", message: i.message }));
      throw new ToolError("validation_failed", `${stage} output does not match its schema`, "Fix every issue listed in details and retry", { issues });
    }
    const { errors, warnings } = await checkStage(ctx.db, stage, parsed.data, saved);
    if (errors.length) {
      throw new ToolError("validation_failed", `${stage} output failed ${errors.length} check(s)`, "Fix every issue listed in details and retry", { issues: errors });
    }

    // s6's hash identifies the article text; s9 is bound to the draft it reviewed.
    const hash =
      stage === "s6_draft"
        ? contentHash((parsed.data as { title: string }).title, (parsed.data as { markdown: string }).markdown)
        : stage === "s9_qa"
          ? saved.get("s6_draft")!.content_hash
          : contentHash(JSON.stringify(parsed.data));

    if (input.validate_only) {
      return { saved: false, stage, content_hash: hash, next_stage: nextStage(saved), warnings };
    }

    const insert = () =>
      ctx.db.execute(sql`
        INSERT INTO pipeline_stage_outputs (run_id, stage, version, output, content_hash)
        SELECT ${run.id}, ${stage}::pipeline_stage, coalesce(max(version), 0) + 1, ${JSON.stringify(parsed.data)}::jsonb, ${hash}
        FROM pipeline_stage_outputs WHERE run_id = ${run.id} AND stage = ${stage}::pipeline_stage
        RETURNING version
      `);
    let result;
    try {
      result = await insert();
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      result = await insert(); // concurrent save of the same stage: take the next version
    }
    const [{ version }] = rowsOf<{ version: number }>(result);
    await touchRun(ctx.db, run.id, stage);
    saved.set(stage, { stage, version, output: parsed.data as Record<string, unknown>, content_hash: hash, created_at: new Date() });
    return { saved: true, stage, version, content_hash: hash, next_stage: nextStage(saved), warnings };
  },
});

export const reportFailure = defineTool({
  name: "report_failure",
  title: "Stop a run and hand it to a human",
  description:
    "Marks the run as needs_human with your report and releases the keyword as failed. Use it whenever you stop: a gate failed twice, " +
    "the keyword is already covered (recommend updating the existing article), or anything is ambiguous.",
  input: z.object({
    run_id: runId,
    stage: z.union([stageEnum, z.literal("other")]),
    reason: z.string().trim().min(5).max(1000),
    details: z.string().max(10_000).optional(),
    recommendation: z.string().max(2000).optional(),
  }),
  output: z.object({ status: z.literal("needs_human"), admin_url: z.string() }),
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  async run(ctx, input) {
    const run = await loadRun(ctx.db, input.run_id);
    assertRunning(run);
    const error = { code: "agent_reported", stage: input.stage, reason: input.reason, details: input.details ?? null, recommendation: input.recommendation ?? null, at: new Date().toISOString() };
    await ctx.db.execute(sql`
      UPDATE pipeline_runs SET status = 'needs_human', error = ${JSON.stringify(error)}::jsonb, finished_at = now(), heartbeat_at = now()
      WHERE id = ${run.id}
    `);
    if (run.keyword_id) {
      await ctx.db.execute(sql`
        UPDATE keyword_queue SET status = 'failed', notes = left(coalesce(notes || E'\n', '') || ${`Run ${run.id}: ${input.reason}`}, 4000)
        WHERE id = ${run.keyword_id}
      `);
    }
    return { status: "needs_human" as const, admin_url: runAdminUrl(ctx, run.id) };
  },
});
