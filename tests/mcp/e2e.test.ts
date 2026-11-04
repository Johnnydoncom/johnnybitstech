import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getPublishedPost } from "@/lib/blog/queries";
import { getBrandContext } from "@/lib/blog-agent/brand/johnnybits";
import { prePublishCheck, publishArticle, setFeaturedImage } from "@/lib/blog-agent/admin/drafts";
import { linkTargetSeeds } from "@/lib/blog-agent/seed/link-targets";
import { seedAuthors, seedLinkTargets } from "@/lib/blog-agent/seed/seed";
import { createTestDb, type TestDb } from "../helpers/db";
import { connect } from "../helpers/oauth";
import { ok, runPipeline, type Call } from "../helpers/pipeline";
import type { CallOutcome } from "../helpers/tools";

let t: TestDb;
vi.mock("@/db/client", () => ({ getDb: () => t.db }));
// The real route reads research sources over the network; tests stay offline.
vi.mock("@/lib/blog-agent/qa/source-fetch", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/blog-agent/qa/source-fetch")>();
  return { ...actual, fetchSourceText: async (url: string) => ({ ok: false as const, url, reason: "offline in tests" }) };
});

let POST: (req: Request) => Promise<Response>;
let token: string;

beforeAll(async () => {
  t = await createTestDb();
  await seedAuthors(t.exec, getBrandContext().authors);
  await seedLinkTargets(t.exec, linkTargetSeeds());
  ({ POST } = await import("@/app/api/mcp/route"));
  token = (await connect(t.db)).tokens.access_token;
});
afterAll(() => t.close());

let nextId = 1;
async function rpc(method: string, params: Record<string, unknown> = {}) {
  const res = await POST(
    new Request("https://johnnybits.com/api/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2025-06-18",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
    }),
  );
  expect(res.status).toBe(200);
  const text = await res.text();
  return res.headers.get("content-type")?.includes("text/event-stream")
    ? JSON.parse(text.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5)).join(""))
    : JSON.parse(text);
}

/** A tool call over the real HTTP route: OAuth bearer, JSON-RPC, zod validation, rate limit, call log. */
const httpCall: Call = async (name, args = {}): Promise<CallOutcome> => {
  const json = await rpc("tools/call", { name, arguments: args });
  if (json.error) throw new Error(`JSON-RPC error on ${name}: ${JSON.stringify(json.error)}`);
  if (json.result.isError) return { ok: false, error: JSON.parse(json.result.content[0].text).error };
  return { ok: true, data: json.result.structuredContent };
};

describe("end to end over /api/mcp", () => {
  it("runs keyword → draft through the connector, then a human publishes and the post goes live", async () => {
    await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "e2e", version: "1" } });
    const brand = ok(await httpCall("get_brand_context"));
    expect(brand.company).toMatchObject({ name: "Johnnybits Technology" });

    const { articleId, runId, slug, index } = await runPipeline(httpCall);
    expect(index).toMatchObject({ verified: true, embedded: false });

    const run = ok(await httpCall("get_run", { run_id: runId }));
    expect(run.run).toMatchObject({ status: "draft_created" });

    // The agent cannot publish: the draft is invisible until a human acts in /admin.
    expect(await getPublishedPost(slug)).toBeNull();
    const [logged] = await t.exec.query<{ calls: number; failed: number }>(
      "SELECT count(*)::int AS calls, count(*) FILTER (WHERE NOT ok)::int AS failed FROM mcp_call_log WHERE client_id LIKE 'dcr_%'",
    );
    expect(logged.calls).toBeGreaterThanOrEqual(18);
    expect(logged.failed).toBe(0);

    await setFeaturedImage(t.db, articleId, "https://abc123.public.blob.vercel-storage.com/blog/cover-e2e.webp");
    expect((await prePublishCheck(t.db, articleId)).blockers).toEqual([]);
    await publishArticle(t.db, articleId);

    const post = await getPublishedPost(slug);
    expect(post?.title).toBeTruthy();
    expect(post?.author?.name).toBe("Odoh John");

    const found = ok(await httpCall("search_site_content", { query: "website cost in Nigeria" }));
    expect((found.results as { url: string }[]).map((r) => r.url)).toContain(`/blog/${slug}`);
  });
});
