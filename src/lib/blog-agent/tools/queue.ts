import { sql } from "drizzle-orm";
import { z } from "zod";
import { rowsOf } from "@/db/rows";
import type { Db } from "@/db/types";
import { latestStages, nextStage, releaseStale, STALE_RUN_HOURS } from "./run-store";
import { defineTool, normalizeKeyword, ToolError, type ToolContext } from "./types";

/** Agent-added keywords cannot outrank the admin's top priorities (81–100). */
export const AGENT_MAX_PRIORITY = 80;

const keywordText = z.string().trim().min(2).max(200);
const priority = z.number().int().min(0).max(AGENT_MAX_PRIORITY);

const keywordItem = z.object({
  keyword: keywordText,
  priority: priority.default(50),
  notes: z.string().trim().max(1000).optional(),
});

type AddResult = { added: { id: string; keyword: string; priority: number }[]; skipped: { keyword: string; reason: string }[] };

async function addKeywords(db: Db, items: z.output<typeof keywordItem>[], clusterId: string | null): Promise<AddResult> {
  const result: AddResult = { added: [], skipped: [] };
  const seen = new Set<string>();
  for (const item of items) {
    const normalized = normalizeKeyword(item.keyword);
    if (normalized.length < 2) {
      result.skipped.push({ keyword: item.keyword, reason: "empty after normalisation" });
      continue;
    }
    if (seen.has(normalized)) {
      result.skipped.push({ keyword: item.keyword, reason: "duplicate in this request" });
      continue;
    }
    seen.add(normalized);
    const [row] = rowsOf<{ id: string }>(
      await db.execute(sql`
        INSERT INTO keyword_queue (keyword, keyword_normalized, priority, notes, cluster_id, source)
        VALUES (${item.keyword}, ${normalized}, ${item.priority}, ${item.notes ?? null}, ${clusterId}, 'agent')
        ON CONFLICT (keyword_normalized) DO NOTHING
        RETURNING id
      `),
    );
    if (row) {
      result.added.push({ id: row.id, keyword: item.keyword, priority: item.priority });
    } else {
      const [existing] = rowsOf<{ status: string }>(
        await db.execute(sql`SELECT status FROM keyword_queue WHERE keyword_normalized = ${normalized}`),
      );
      result.skipped.push({ keyword: item.keyword, reason: `already in the queue (${existing?.status ?? "unknown"})` });
    }
  }
  return result;
}

const addResultSchema = z.object({
  added: z.array(z.object({ id: z.string().uuid(), keyword: z.string(), priority: z.number() })),
  skipped: z.array(z.object({ keyword: z.string(), reason: z.string() })),
});

export const enqueueKeywords = defineTool({
  name: "enqueue_keywords",
  title: "Add keywords to the queue",
  description:
    "Adds keywords to the blog keyword queue (max 50 per call). Duplicates of existing keywords are skipped, not overwritten. " +
    `Priority 0–${AGENT_MAX_PRIORITY} (higher is written sooner).`,
  input: z.object({ items: z.array(keywordItem).min(1).max(50) }),
  output: addResultSchema,
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  run: (ctx, input) => addKeywords(ctx.db, input.items, null),
});

export const saveClusterPlan = defineTool({
  name: "save_cluster_plan",
  title: "Save a topic cluster plan",
  description:
    "Stage 2 batch mode: saves pillar/supporting clusters and queues the pillar keyword plus its supporting keywords. " +
    "Existing clusters (same pillar keyword) are updated; existing keywords are not duplicated.",
  input: z.object({
    clusters: z
      .array(
        z.object({
          name: z.string().trim().min(2).max(120),
          pillar_keyword: keywordText,
          priority: priority.default(50),
          notes: z.string().trim().max(1000).optional(),
          children: z.array(keywordItem).max(30),
        }),
      )
      .min(1)
      .max(10),
  }),
  output: z.object({
    clusters: z.array(z.object({ id: z.string().uuid(), name: z.string(), pillar_keyword: z.string() })),
    keywords: addResultSchema,
  }),
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  async run(ctx, input) {
    const clusters: { id: string; name: string; pillar_keyword: string }[] = [];
    const keywords: AddResult = { added: [], skipped: [] };
    for (const c of input.clusters) {
      const [row] = rowsOf<{ id: string }>(
        await ctx.db.execute(sql`
          INSERT INTO content_clusters (name, pillar_keyword, priority, notes)
          VALUES (${c.name}, ${c.pillar_keyword}, ${c.priority}, ${c.notes ?? null})
          ON CONFLICT ((lower(pillar_keyword))) DO UPDATE
            SET name = EXCLUDED.name, priority = EXCLUDED.priority, notes = coalesce(EXCLUDED.notes, content_clusters.notes)
          RETURNING id
        `),
      );
      clusters.push({ id: row.id, name: c.name, pillar_keyword: c.pillar_keyword });
      const added = await addKeywords(ctx.db, [{ keyword: c.pillar_keyword, priority: c.priority, notes: "Pillar" }, ...c.children], row.id);
      keywords.added.push(...added.added);
      keywords.skipped.push(...added.skipped);
    }
    return { clusters, keywords };
  },
});

const claimOutput = z.object({
  status: z.enum(["claimed", "resumed", "empty"]),
  run_id: z.string().uuid().optional(),
  keyword: z.object({ id: z.string().uuid(), keyword: z.string(), priority: z.number(), notes: z.string().nullable() }).optional(),
  next_stage: z.string().optional(),
  message: z.string(),
});

type ClaimRow = { run_id: string; keyword_id: string; keyword: string; priority: number; notes: string | null };

/** Claims a keyword and creates its run in one statement, so a claim never exists without a run. */
async function claimAndCreateRun(ctx: ToolContext, keywordId: string | null): Promise<ClaimRow | undefined> {
  const [row] = rowsOf<ClaimRow>(
    await ctx.db.execute(sql`
      WITH picked AS (
        SELECT id, keyword FROM keyword_queue
        WHERE ${keywordId === null
          ? sql`status = 'queued'`
          : sql`id = ${keywordId} AND status IN ('queued', 'failed', 'skipped')`}
        ORDER BY priority DESC, created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      ), run AS (
        INSERT INTO pipeline_runs (keyword_id, keyword, client_id)
        SELECT id, keyword, ${ctx.clientId} FROM picked
        RETURNING id, keyword_id
      )
      UPDATE keyword_queue k
      SET status = 'claimed', claimed_at = now(), claimed_by_run = run.id
      FROM run WHERE k.id = run.keyword_id
      RETURNING run.id AS run_id, k.id AS keyword_id, k.keyword, k.priority, k.notes
    `),
  );
  return row;
}

export const claimNextKeyword = defineTool({
  name: "claim_next_keyword",
  title: "Claim the next keyword and start a run",
  description:
    "Atomically claims the highest-priority queued keyword and creates its pipeline run. " +
    `If this connection already has a running run (active in the last ${STALE_RUN_HOURS}h) it is returned instead (status "resumed"), ` +
    "so a crashed session can continue. Returns status \"empty\" when nothing is queued: stop and report.",
  input: z.object({ resume_open_run: z.boolean().default(true) }),
  output: claimOutput,
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  async run(ctx, input) {
    await releaseStale(ctx.db);

    if (input.resume_open_run) {
      const [open] = rowsOf<{ id: string; keyword_id: string; keyword: string; priority: number | null; notes: string | null }>(
        await ctx.db.execute(sql`
          SELECT r.id, r.keyword_id, r.keyword, k.priority, k.notes
          FROM pipeline_runs r LEFT JOIN keyword_queue k ON k.id = r.keyword_id
          WHERE r.status = 'running' AND r.client_id = ${ctx.clientId}
          ORDER BY r.started_at DESC LIMIT 1
        `),
      );
      if (open) {
        const saved = await latestStages(ctx.db, open.id);
        return {
          status: "resumed" as const,
          run_id: open.id,
          keyword: { id: open.keyword_id, keyword: open.keyword, priority: open.priority ?? 0, notes: open.notes },
          next_stage: nextStage(saved),
          message: "Resuming the open run for this connection. Call get_run to load its saved stages.",
        };
      }
    }

    const claimed = await claimAndCreateRun(ctx, null);
    if (!claimed) return { status: "empty" as const, message: "The keyword queue is empty. Stop and report that no keyword is queued." };
    return {
      status: "claimed" as const,
      run_id: claimed.run_id,
      keyword: { id: claimed.keyword_id, keyword: claimed.keyword, priority: claimed.priority, notes: claimed.notes },
      next_stage: "s1_keyword",
      message: "Keyword claimed and run created. Start with stage 1 (keyword intelligence).",
    };
  },
});

export const createRun = defineTool({
  name: "create_run",
  title: "Start a run for a specific keyword",
  description:
    "Starts a pipeline run for the given keyword (adding it to the queue if needed). Use claim_next_keyword for normal scheduled runs. " +
    "Fails if the keyword is already being written or has already been written.",
  input: z.object({ keyword: keywordText, priority: priority.default(50) }),
  output: claimOutput,
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  async run(ctx, input) {
    await releaseStale(ctx.db);
    const normalized = normalizeKeyword(input.keyword);
    await ctx.db.execute(sql`
      INSERT INTO keyword_queue (keyword, keyword_normalized, priority, source)
      VALUES (${input.keyword}, ${normalized}, ${input.priority}, 'agent')
      ON CONFLICT (keyword_normalized) DO NOTHING
    `);
    const [kw] = rowsOf<{ id: string; status: string; claimed_by_run: string | null }>(
      await ctx.db.execute(sql`SELECT id, status, claimed_by_run FROM keyword_queue WHERE keyword_normalized = ${normalized}`),
    );
    const claimed = await claimAndCreateRun(ctx, kw.id);
    if (!claimed) {
      throw new ToolError(
        "conflict",
        `Keyword "${input.keyword}" is ${kw.status}`,
        kw.status === "claimed" ? `It is being written in run ${kw.claimed_by_run}` : "It has already been written; pick another keyword",
      );
    }
    return {
      status: "claimed" as const,
      run_id: claimed.run_id,
      keyword: { id: claimed.keyword_id, keyword: claimed.keyword, priority: claimed.priority, notes: claimed.notes },
      next_stage: "s1_keyword",
      message: "Run created. Start with stage 1 (keyword intelligence).",
    };
  },
});
