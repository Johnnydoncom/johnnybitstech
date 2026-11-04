import { sql } from "drizzle-orm";
import { z } from "zod";
import { rowsOf } from "@/db/rows";
import type { Db } from "@/db/types";
import { MAX_POSTS_PER_KEYWORD, postInfoForRun, postInfoSchema, writtenCountSql } from "./keyword-posts";
import { latestStages, loadRun, nextStage, releaseStale, STALE_RUN_HOURS } from "./run-store";
import { defineTool, normalizeKeyword, ToolError, type ToolContext } from "./types";

/** Agent-added keywords cannot outrank the admin's top priorities (81–100). */
export const AGENT_MAX_PRIORITY = 80;

const keywordText = z.string().trim().min(2).max(200);
const priority = z.number().int().min(0).max(AGENT_MAX_PRIORITY);

const postsTarget = z.number().int().min(1).max(MAX_POSTS_PER_KEYWORD);

const keywordItem = z.object({
  keyword: keywordText,
  priority: priority.default(50),
  posts: postsTarget.default(1).describe(`Distinct posts to write for this keyword (1–${MAX_POSTS_PER_KEYWORD}); each takes a different long-tail angle`),
  notes: z.string().trim().max(1000).optional(),
});

type AddResult = { added: { id: string; keyword: string; priority: number; posts: number }[]; skipped: { keyword: string; reason: string }[] };

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
        INSERT INTO keyword_queue (keyword, keyword_normalized, priority, posts_target, notes, cluster_id, source)
        VALUES (${item.keyword}, ${normalized}, ${item.priority}, ${item.posts}::int, ${item.notes ?? null}, ${clusterId}, 'agent')
        ON CONFLICT (keyword_normalized) DO NOTHING
        RETURNING id
      `),
    );
    if (row) {
      result.added.push({ id: row.id, keyword: item.keyword, priority: item.priority, posts: item.posts });
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
  added: z.array(z.object({ id: z.string().uuid(), keyword: z.string(), priority: z.number(), posts: z.number() })),
  skipped: z.array(z.object({ keyword: z.string(), reason: z.string() })),
});

export const enqueueKeywords = defineTool({
  name: "enqueue_keywords",
  title: "Add keywords to the queue",
  description:
    "Adds keywords to the blog keyword queue (max 50 per call). Duplicates of existing keywords are skipped, not overwritten. " +
    `Priority 0–${AGENT_MAX_PRIORITY} (higher is written sooner). posts (default 1, max ${MAX_POSTS_PER_KEYWORD}) is how many distinct ` +
    "articles to write for the keyword: the queue rotates, writing one post per keyword before returning for the next.",
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
      const added = await addKeywords(ctx.db, [{ keyword: c.pillar_keyword, priority: c.priority, posts: 1, notes: "Pillar" }, ...c.children], row.id);
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
  post: postInfoSchema.optional().describe("Which post of the keyword this run writes, and the earlier posts it must differ from"),
  next_stage: z.string().optional(),
  message: z.string(),
});

type ClaimRow = { run_id: string; keyword_id: string; keyword: string; priority: number; notes: string | null; post_number: number };

/**
 * Claims a keyword and creates its run in one statement, so a claim never exists without a run.
 * Rotation: keywords with the fewest written posts go first (then priority, then age), so every keyword gets its
 * first post before any keyword gets its second.
 */
async function claimAndCreateRun(ctx: ToolContext, keywordId: string | null): Promise<ClaimRow | undefined> {
  const [row] = rowsOf<ClaimRow>(
    await ctx.db.execute(sql`
      WITH picked AS (
        SELECT k.id, k.keyword, ${writtenCountSql(sql`k.id`)} AS written FROM keyword_queue k
        WHERE ${keywordId === null
          ? sql`k.status = 'queued'`
          : sql`k.id = ${keywordId} AND k.status IN ('queued', 'failed', 'skipped')`}
        ORDER BY written ASC, k.priority DESC, k.created_at ASC
        FOR UPDATE OF k SKIP LOCKED
        LIMIT 1
      ), run AS (
        INSERT INTO pipeline_runs (keyword_id, keyword, client_id, post_number)
        SELECT id, keyword, ${ctx.clientId}, written + 1 FROM picked
        RETURNING id, keyword_id, post_number
      )
      UPDATE keyword_queue k
      SET status = 'claimed', claimed_at = now(), claimed_by_run = run.id
      FROM run WHERE k.id = run.keyword_id
      RETURNING run.id AS run_id, k.id AS keyword_id, k.keyword, k.priority, k.notes, run.post_number
    `),
  );
  return row;
}

async function claimedResult(ctx: ToolContext, claimed: ClaimRow, message: string) {
  const post = await postInfoForRun(ctx.db, { id: claimed.run_id, keyword_id: claimed.keyword_id, post_number: claimed.post_number });
  return {
    status: "claimed" as const,
    run_id: claimed.run_id,
    keyword: { id: claimed.keyword_id, keyword: claimed.keyword, priority: claimed.priority, notes: claimed.notes },
    ...(post ? { post } : {}),
    next_stage: "s1_keyword",
    message: post && post.number > 1 ? `${message} This is post ${post.number} of ${post.of}: read post.guidance.` : message,
  };
}

export const claimNextKeyword = defineTool({
  name: "claim_next_keyword",
  title: "Claim the next keyword and start a run",
  description:
    "Atomically claims the next queued keyword and creates its pipeline run. Keywords rotate: those with the fewest written posts go first, " +
    "then by priority. A keyword set to several posts returns post.number/post.of and the earlier posts (post.siblings) this one must differ from. " +
    `If this connection already has a running run (active in the last ${STALE_RUN_HOURS}h), or an admin resumed a stopped run, it is ` +
    "returned instead (status \"resumed\"), so work continues from the saved stages. Returns status \"empty\" when nothing is queued: stop and report.",
  input: z.object({ resume_open_run: z.boolean().default(true) }),
  output: claimOutput,
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  async run(ctx, input) {
    await releaseStale(ctx.db);

    if (input.resume_open_run) {
      // This connection's own open run first; otherwise adopt a run an admin resumed (client_id NULL). Adoption is
      // atomic (row lock + SKIP LOCKED), so two sessions never continue the same run.
      const [open] = rowsOf<{ id: string; keyword_id: string; keyword: string; priority: number | null; notes: string | null; post_number: number | null }>(
        await ctx.db.execute(sql`
          WITH target AS (
            SELECT id FROM pipeline_runs
            WHERE status = 'running' AND (client_id = ${ctx.clientId} OR client_id IS NULL)
            ORDER BY (client_id IS NULL), started_at DESC
            FOR UPDATE SKIP LOCKED
            LIMIT 1
          ), adopted AS (
            UPDATE pipeline_runs r SET client_id = ${ctx.clientId}, heartbeat_at = now()
            FROM target WHERE r.id = target.id
            RETURNING r.id, r.keyword_id, r.keyword, r.post_number
          )
          SELECT a.id, a.keyword_id, a.keyword, a.post_number, k.priority, k.notes
          FROM adopted a LEFT JOIN keyword_queue k ON k.id = a.keyword_id
        `),
      );
      if (open) {
        const saved = await latestStages(ctx.db, open.id);
        const post = await postInfoForRun(ctx.db, open);
        return {
          status: "resumed" as const,
          run_id: open.id,
          keyword: { id: open.keyword_id, keyword: open.keyword, priority: open.priority ?? 0, notes: open.notes },
          ...(post ? { post } : {}),
          next_stage: nextStage(saved, await loadRun(ctx.db, open.id)),
          message: "Resuming an open run. Call get_run to load its saved stages and the reason it stopped (run.error), then continue from next_stage.",
        };
      }
    }

    const claimed = await claimAndCreateRun(ctx, null);
    if (!claimed) return { status: "empty" as const, message: "The keyword queue is empty. Stop and report that no keyword is queued." };
    return claimedResult(ctx, claimed, "Keyword claimed and run created. Start with stage 1 (keyword intelligence).");
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
    return claimedResult(ctx, claimed, "Run created. Start with stage 1 (keyword intelligence).");
  },
});
