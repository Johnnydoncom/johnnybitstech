import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getBrandContext } from "@/lib/blog-agent/brand/johnnybits";
import { seedAuthors } from "@/lib/blog-agent/seed/seed";
import { revokeGrant } from "@/lib/oauth/flow";
import { createTestDb, type TestDb } from "../helpers/db";
import { connect } from "../helpers/oauth";

let t: TestDb;
vi.mock("@/db/client", () => ({ getDb: () => t.db }));

let POST: (req: Request) => Promise<Response>;
let token: string;
let grantId: string;

beforeAll(async () => {
  t = await createTestDb();
  await seedAuthors(t.exec, getBrandContext().authors);
  ({ POST } = await import("@/app/api/mcp/route"));
  const c = await connect(t.db);
  token = c.tokens.access_token;
  grantId = c.grantId;
});
afterAll(() => t.close());

let nextId = 1;
async function rpc(method: string, params: Record<string, unknown> = {}, bearer: string | null = token) {
  const res = await POST(
    new Request("https://johnnybits.com/api/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2025-06-18",
        ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
    }),
  );
  const text = await res.text();
  const json = res.headers.get("content-type")?.includes("text/event-stream")
    ? JSON.parse(text.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5)).join(""))
    : text ? JSON.parse(text) : null;
  return { res, json };
}

const initialize = () =>
  rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "vitest", version: "1" } });

describe("/api/mcp", () => {
  it("challenges unauthenticated requests with RFC 9728 metadata", async () => {
    const { res } = await rpc("tools/list", {}, null);
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain(
      'resource_metadata="https://johnnybits.com/.well-known/oauth-protected-resource/api/mcp"',
    );
    expect((await rpc("tools/list", {}, "not-a-real-token")).res.status).toBe(401);
  });

  it("initialises and lists the blog agent tools, with no publish/approve/delete tool", async () => {
    const init = await initialize();
    expect(init.res.status).toBe(200);
    expect(init.json.result.serverInfo.name).toBe("johnnybits-blog-agent");
    expect(init.json.result.instructions).toContain("cannot publish");

    const { json } = await rpc("tools/list");
    const names: string[] = json.result.tools.map((x: { name: string }) => x.name);
    expect(names.sort()).toEqual([
      "check_cannibalization", "claim_next_keyword", "create_run", "enqueue_keywords", "get_brand_context",
      "get_run", "report_failure", "save_cluster_plan", "save_stage_output", "search_site_content",
    ]);
    expect(names.filter((n) => /publish|approve|reject|delete/.test(n))).toEqual([]);
    const brand = json.result.tools.find((x: { name: string }) => x.name === "get_brand_context");
    expect(brand.annotations.readOnlyHint).toBe(true);
    expect(brand.outputSchema.type).toBe("object");
  });

  it("calls a tool and returns structured content", async () => {
    await initialize();
    const { json } = await rpc("tools/call", { name: "get_brand_context", arguments: {} });
    expect(json.result.isError).toBeFalsy();
    expect(json.result.structuredContent.company.name).toBe("Johnnybits Technology");
    const [log] = await t.exec.query<{ tool: string; ok: boolean; client_id: string }>("SELECT tool, ok, client_id FROM mcp_call_log ORDER BY id DESC LIMIT 1");
    expect(log).toMatchObject({ tool: "get_brand_context", ok: true });
    expect(log.client_id).toMatch(/^dcr_/);
  });

  it("returns tool errors as isError results Claude can act on", async () => {
    await initialize();
    const { json } = await rpc("tools/call", { name: "get_run", arguments: { run_id: "00000000-0000-4000-8000-000000000000" } });
    expect(json.result.isError).toBe(true);
    expect(JSON.parse(json.result.content[0].text).error.code).toBe("not_found");
  });

  it("rejects the token once the connection is revoked", async () => {
    await revokeGrant(t.db, grantId, "test");
    expect((await rpc("tools/list")).res.status).toBe(401);
  });
});
