import { afterEach, beforeEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import nextConfig from "../../next.config";
import { getBrandContext } from "@/lib/blog-agent/brand/johnnybits";
import { createFixtureProvider } from "@/lib/blog-agent/embeddings/fixture";
import { parseAgentEnv } from "@/lib/blog-agent/env";
import { ImageError, optimizeImage } from "@/lib/blog-agent/images";
import { invokeTool } from "@/lib/blog-agent/mcp/server";
import { linkTargetSeeds } from "@/lib/blog-agent/seed/link-targets";
import { seedAuthors, seedLinkTargets } from "@/lib/blog-agent/seed/seed";
import { BLOG_AGENT_TOOLS } from "@/lib/blog-agent/tools";
import { MAX_STAGE_OUTPUT_BYTES } from "@/lib/blog-agent/tools/runs";
import { isAuthorizedCronRequest, RETENTION, runMaintenance } from "@/lib/maintenance";
import { registerClient } from "@/lib/oauth/clients";
import { createTestDb, type TestDb } from "../helpers/db";
import { CALLBACK, connect } from "../helpers/oauth";
import { ok, runPipeline } from "../helpers/pipeline";
import { toolCaller, type CallOutcome } from "../helpers/tools";
import * as fx from "../fixtures/stages";

let t: TestDb;
beforeEach(async () => {
  t = await createTestDb();
  await seedAuthors(t.exec, getBrandContext().authors);
  await seedLinkTargets(t.exec, linkTargetSeeds());
});
afterEach(() => t.close());

const count = async (table: string) => (await t.exec.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${table}`))[0].n;

describe("security headers", () => {
  it("forbids framing and indexing of admin, consent and OAuth pages", async () => {
    const rules = await nextConfig.headers!();
    for (const source of ["/admin/:path*", "/oauth/:path*"]) {
      const headers = Object.fromEntries(rules.find((r) => r.source === source)!.headers.map((h) => [h.key, h.value]));
      expect(headers["X-Frame-Options"]).toBe("DENY");
      expect(headers["Content-Security-Policy"]).toBe("frame-ancestors 'none'");
      expect(headers["X-Robots-Tag"]).toContain("noindex");
    }
    expect(rules.find((r) => r.source === "/api/mcp")).toBeTruthy();
    // The public site is untouched.
    expect(rules.some((r) => r.source.startsWith("/blog") || r.source === "/:path*")).toBe(false);
  });
});

describe("cron authorisation", () => {
  it("accepts only the exact bearer secret and fails closed without one", () => {
    const secret = "s".repeat(32);
    expect(isAuthorizedCronRequest(`Bearer ${secret}`, secret)).toBe(true);
    expect(isAuthorizedCronRequest(`Bearer ${secret}x`, secret)).toBe(false);
    expect(isAuthorizedCronRequest(secret, secret)).toBe(false);
    expect(isAuthorizedCronRequest(null, secret)).toBe(false);
    expect(isAuthorizedCronRequest("Bearer ", undefined)).toBe(false);
    expect(isAuthorizedCronRequest("Bearer short", "short")).toBe(false);
  });
});

describe("maintenance", () => {
  it("prunes spent OAuth records, old logs and abandoned registrations, and keeps everything live", async () => {
    const live = await connect(t.db);
    const dead = await connect(t.db);
    await t.exec.query("UPDATE oauth_grants SET revoked_at = now() - interval '31 days' WHERE id = $1", [dead.grantId]);
    const stale = await registerClient(t.db, { redirect_uris: [CALLBACK], client_name: "Abandoned" });
    const fresh = await registerClient(t.db, { redirect_uris: [CALLBACK], client_name: "Just registered" });
    await t.exec.query(`UPDATE oauth_clients SET created_at = now() - interval '${RETENTION.unusedDcrClientsDays + 1} days' WHERE client_id = $1`, [stale.client_id]);
    // Live connection: its used code and an old expired token go; its current tokens stay.
    await t.exec.query("UPDATE oauth_codes SET expires_at = now() - interval '2 days' WHERE grant_id = $1", [live.grantId]);
    await t.exec.query(
      "INSERT INTO oauth_tokens (token_hash, kind, grant_id, expires_at) SELECT 'old-' || token_hash, kind, grant_id, now() - interval '2 days' FROM oauth_tokens WHERE grant_id = $1",
      [live.grantId],
    );
    await t.exec.query("INSERT INTO mcp_call_log (tool, ok, duration_ms, created_at) VALUES ('get_run', true, 5, now() - interval '91 days'), ('get_run', true, 5, now())");
    await t.exec.query("INSERT INTO rate_limits (bucket, window_start, hits) VALUES ('old', now() - interval '2 days', 3), ('new', now(), 1)");

    const report = await runMaintenance(t.db);
    expect(report).toMatchObject({ oauth_grants: 1, oauth_clients: 1, mcp_call_log: 1, rate_limits: 1 });
    expect(report.oauth_codes).toBeGreaterThanOrEqual(1);
    expect(report.oauth_tokens).toBe(2);

    const grants = await t.exec.query<{ id: string }>("SELECT id FROM oauth_grants");
    expect(grants.map((g) => g.id)).toEqual([live.grantId]);
    const [{ n: liveTokens }] = await t.exec.query<{ n: number }>("SELECT count(*)::int AS n FROM oauth_tokens WHERE grant_id = $1 AND expires_at > now()", [live.grantId]);
    expect(liveTokens).toBe(2);
    const clients = (await t.exec.query<{ client_id: string }>("SELECT client_id FROM oauth_clients")).map((c) => c.client_id);
    expect(clients).toContain(fresh.client_id);
    expect(clients).not.toContain(stale.client_id);
    expect(await count("mcp_call_log")).toBe(1);
    expect(await count("rate_limits")).toBe(1);
    const [entry] = await t.exec.query<{ action: string }>("SELECT action FROM audit_log WHERE actor = 'maintenance'");
    expect(entry.action).toBe("maintenance.prune");

    // A second run finds nothing and writes no audit entry.
    expect(Object.values(await runMaintenance(t.db)).every((n) => n === 0)).toBe(true);
    expect(await count("audit_log WHERE actor = 'maintenance'")).toBe(1);
  });

  it("releases runs with no heartbeat for hours so their keyword is picked up again", async () => {
    const call = toolCaller(t);
    ok(await call("enqueue_keywords", { items: [{ keyword: fx.KEYWORD }] }));
    const runId = ok(await call("claim_next_keyword")).run_id as string;
    await t.exec.query("UPDATE pipeline_runs SET heartbeat_at = now() - interval '7 hours' WHERE id = $1", [runId]);
    await runMaintenance(t.db);
    const [run] = await t.exec.query<{ status: string }>("SELECT status::text AS status FROM pipeline_runs WHERE id = $1", [runId]);
    expect(run.status).toBe("abandoned");
    const [kw] = await t.exec.query<{ status: string }>("SELECT status::text AS status FROM keyword_queue");
    expect(kw.status).toBe("queued");
  });
});

describe("payload and spend limits", () => {
  it("refuses an oversized stage output with a fixable error", async () => {
    const call = toolCaller(t);
    ok(await call("enqueue_keywords", { items: [{ keyword: fx.KEYWORD }] }));
    const runId = ok(await call("claim_next_keyword")).run_id as string;
    const huge = { ...fx.s4, padding: "x".repeat(MAX_STAGE_OUTPUT_BYTES) };
    const r = await call("save_stage_output", { run_id: runId, stage: "s4_research", output: huge });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("validation_failed");
      expect(r.error.message).toMatch(/limit is 300 KB/);
    }
  });

  it("stops embedding once a run reaches its spend cap and finishes lexical-only", async () => {
    const agentEnv = parseAgentEnv({ RETRIEVAL_MODE: "hybrid", EMBEDDINGS_PROVIDER: "fixture", AGENT_MAX_EMBEDDING_USD_PER_RUN: "0.01" });
    const base = createFixtureProvider(64);
    let embedCalls = 0;
    const embeddings = { ...base, id: base.id, model: base.model, dims: base.dims, embed: async (texts: readonly string[], kind: "document" | "query") => {
      embedCalls++;
      return { ...(await base.embed(texts, kind)), costUsd: 0.02 };
    } };
    const deps = { getDb: () => t.db, siteOrigin: "https://johnnybits.com", rateLimitPerMinute: 1000, agentEnv, embeddings };
    const auth = { token: "t", clientId: "budget", scopes: ["blog_agent"], extra: { grantId: null } };
    const call = async (name: string, args: Record<string, unknown> = {}): Promise<CallOutcome> => {
      const result = await invokeTool(BLOG_AGENT_TOOLS.find((x) => x.name === name)!, args, auth, deps);
      if (result.isError) return { ok: false, error: JSON.parse((result.content[0] as { text: string }).text).error };
      return { ok: true, data: result.structuredContent as Record<string, unknown> };
    };
    const { runId, index } = await runPipeline(call);
    // find_link_candidates spent $0.02 (over the $0.01 cap), so index_article skipped embedding.
    expect(embedCalls).toBe(1);
    expect(index).toMatchObject({ embedded: false, embedding_skipped: "budget", verified: true });
    const [run] = await t.exec.query<{ spent: string }>("SELECT embedding_cost_usd::text AS spent FROM pipeline_runs WHERE id = $1", [runId]);
    expect(Number(run.spent)).toBeCloseTo(0.02);
  });
});

describe("image upload limits", () => {
  it("rejects decompression bombs before decoding them", async () => {
    const bomb = await sharp({ create: { width: 10_000, height: 5_000, channels: 3, background: "#fff" } }).png({ compressionLevel: 9 }).toBuffer();
    expect(bomb.length).toBeLessThan(4 * 1024 * 1024);
    await expect(optimizeImage(bomb)).rejects.toThrow(ImageError);
    await expect(optimizeImage(bomb)).rejects.toThrow(/too large/);
  });
});
