import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getBrandContext } from "@/lib/blog-agent/brand/johnnybits";
import { AdminError } from "@/lib/blog-agent/admin/drafts";
import { requeueKeyword } from "@/lib/blog-agent/admin/queue";
import { abandonRun, resumeRun } from "@/lib/blog-agent/admin/runs";
import { linkTargetSeeds } from "@/lib/blog-agent/seed/link-targets";
import { seedAuthors, seedLinkTargets } from "@/lib/blog-agent/seed/seed";
import { createTestDb, type TestDb } from "../helpers/db";
import { createDraftViaTools, ok } from "../helpers/pipeline";
import { toolCaller } from "../helpers/tools";
import * as fx from "../fixtures/stages";

let t: TestDb;
beforeEach(async () => {
  t = await createTestDb();
  await seedAuthors(t.exec, getBrandContext().authors);
  await seedLinkTargets(t.exec, linkTargetSeeds());
});
afterEach(() => t.close());

const ADMIN = "admin@johnnybits.com";
const keywordOf = async (runId: string) =>
  (await t.exec.query<{ status: string; claimed_by_run: string | null }>("SELECT k.status::text AS status, k.claimed_by_run FROM keyword_queue k JOIN pipeline_runs r ON r.keyword_id = k.id WHERE r.id = $1", [runId]))[0];
const runOf = async (runId: string) =>
  (await t.exec.query<{ status: string; client_id: string | null; error: Record<string, unknown> }>("SELECT status::text AS status, client_id, error FROM pipeline_runs WHERE id = $1", [runId]))[0];

/** A run that saved S1–S6 and then stopped with report_failure, like the first supervised run. */
async function stoppedRun(clientId = "session-1") {
  const call = toolCaller(t, clientId);
  ok(await call("enqueue_keywords", { items: [{ keyword: fx.KEYWORD }] }));
  const runId = ok(await call("claim_next_keyword")).run_id as string;
  const save = async (stage: string, output: object) => ok(await call("save_stage_output", { run_id: runId, stage, output }));
  await save("s1_keyword", fx.s1);
  ok(await call("check_cannibalization", { run_id: runId }));
  for (const [stage, output] of [["s3_brief", fx.s3], ["s4_research", fx.s4], ["s5_outline", fx.s5], ["s6_draft", fx.s6]] as const) await save(stage, output);
  ok(await call("report_failure", { run_id: runId, stage: "s9_qa", reason: "QA still FAIL after 2 loops", recommendation: "Apply the s9_qa revisions" }));
  return runId;
}

async function adminError(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    if (e instanceof AdminError) return e.message;
    throw e;
  }
  throw new Error("Expected an AdminError");
}

describe("resuming a stopped run", () => {
  it("lets the next session (any connection) continue from the saved stages, with the stop reason visible", async () => {
    const runId = await stoppedRun("session-1");
    expect(await keywordOf(runId)).toMatchObject({ status: "failed" });

    await resumeRun(t.db, runId, ADMIN);
    expect(await runOf(runId)).toMatchObject({ status: "running", client_id: null });
    expect((await runOf(runId)).error).toMatchObject({ reason: "QA still FAIL after 2 loops", resumed_by: ADMIN });
    expect(await keywordOf(runId)).toEqual({ status: "claimed", claimed_by_run: runId });

    // A scheduled session is a new connection: it adopts the resumed run instead of starting a new one.
    const next = ok(await toolCaller(t, "session-2")("claim_next_keyword"));
    expect(next).toMatchObject({ status: "resumed", run_id: runId, next_stage: "s8_links" });
    expect((await runOf(runId)).client_id).toBe("session-2");
    const run = ok(await toolCaller(t, "session-2")("get_run", { run_id: runId }));
    expect(Object.keys(run.stages as object)).toEqual(expect.arrayContaining(["s1_keyword", "s4_research", "s6_draft"]));
    expect((run.run as { error: { recommendation: string } }).error.recommendation).toBe("Apply the s9_qa revisions");

    // Only one session gets it: a third connection finds nothing to resume and an empty queue.
    expect(ok(await toolCaller(t, "session-3")("claim_next_keyword"))).toMatchObject({ status: "empty" });
  });

  it("also resumes a run whose keyword the admin re-queued in the meantime, and abandoned runs", async () => {
    const runId = await stoppedRun();
    const [{ id: keywordId }] = await t.exec.query<{ id: string }>("SELECT keyword_id AS id FROM pipeline_runs WHERE id = $1", [runId]);
    await requeueKeyword(t.db, keywordId);
    await resumeRun(t.db, runId, ADMIN);
    expect(await keywordOf(runId)).toEqual({ status: "claimed", claimed_by_run: runId });

    await abandonRun(t.db, runId, ADMIN);
    expect((await runOf(runId)).status).toBe("abandoned");
    await resumeRun(t.db, runId, ADMIN);
    expect((await runOf(runId)).status).toBe("running");
  });

  it("refuses running runs, runs that made a draft, and keywords another run is writing", async () => {
    const runId = await stoppedRun();
    await resumeRun(t.db, runId, ADMIN);
    expect(await adminError(resumeRun(t.db, runId, ADMIN))).toMatch(/Only a stopped run/);

    const { runId: drafted } = await createDraftViaTools(t, "other");
    expect(await adminError(resumeRun(t.db, drafted, ADMIN))).toMatch(/Only a stopped run/);
  });

  it("refuses when a newer run is already writing the same keyword", async () => {
    const runId = await stoppedRun("session-1");
    const [{ id: keywordId }] = await t.exec.query<{ id: string }>("SELECT keyword_id AS id FROM pipeline_runs WHERE id = $1", [runId]);
    await requeueKeyword(t.db, keywordId);
    const newer = ok(await toolCaller(t, "session-2")("claim_next_keyword"));
    expect(newer).toMatchObject({ status: "claimed" });
    expect(newer.run_id).not.toBe(runId);
    expect(await adminError(resumeRun(t.db, runId, ADMIN))).toMatch(/being written by another run/);
    expect((await runOf(runId)).status).toBe("needs_human");
  });
});
