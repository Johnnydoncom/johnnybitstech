/**
 * End-to-end smoke test of the connector against a running local server and the real database:
 * register (HTTP) → authorize (HTTP) → consent (library, no admin password needed) → token (HTTP)
 * → MCP initialize / tools/list / tools/call (HTTP) → refresh (HTTP) → revoke (HTTP) → 401.
 * Uses only read-only tools. Deletes the test client (and its grants, tokens, codes, call log) at the end.
 * Never prints tokens. Usage: BASE_URL=http://localhost:3100 npx tsx src/scripts/local-test/oauth-mcp-smoke.ts
 */
import { createHash, randomBytes } from "node:crypto";
import { config as loadEnv } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import * as schema from "../../db/schema";
import type { Db } from "../../db/types";
import { getOAuthConfig } from "../../lib/oauth/config";
import { decideAuthorization } from "../../lib/oauth/flow";

loadEnv({ path: ".env.local" });
loadEnv();

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const REDIRECT = "http://localhost:9999/callback";
const results: { check: string; ok: boolean; detail?: string }[] = [];

function record(check: string, ok: boolean, detail?: string) {
  results.push({ check, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${check}${detail ? `  — ${detail}` : ""}`);
}

let rpcId = 1;
async function mcp(token: string | null, method: string, params: Record<string, unknown> = {}) {
  const res = await fetch(`${BASE}/api/mcp`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "mcp-protocol-version": "2025-06-18",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: rpcId++, method, params }),
  });
  const text = await res.text();
  let json: { result?: Record<string, unknown>; error?: unknown } | null = null;
  try {
    json = res.headers.get("content-type")?.includes("text/event-stream")
      ? JSON.parse(text.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5)).join(""))
      : text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, json };
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const db = drizzle({ client: neon(url), schema }) as unknown as Db;
  const config = getOAuthConfig({ ...process.env, OAUTH_ISSUER: BASE });
  let clientId: string | null = null;

  try {
    // 1. Discovery
    const as = await (await fetch(`${BASE}/.well-known/oauth-authorization-server`)).json();
    record("AS metadata issuer + S256 + CIMD", as.issuer === BASE && as.code_challenge_methods_supported?.[0] === "S256" && as.client_id_metadata_document_supported === true);
    const pr = await (await fetch(`${BASE}/.well-known/oauth-protected-resource/api/mcp`)).json();
    record("Protected resource = exact MCP URL", pr.resource === `${BASE}/api/mcp`, pr.resource);

    // 2. Unauthenticated MCP call
    const anon = await mcp(null, "tools/list");
    record("MCP without token → 401 + resource_metadata", anon.res.status === 401 && (anon.res.headers.get("www-authenticate") ?? "").includes("resource_metadata="), `status ${anon.res.status}`);

    // 3. Dynamic client registration over HTTP (a foreign redirect must be refused)
    const evil = await fetch(`${BASE}/oauth/register`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ redirect_uris: ["https://evil.example/cb"] }) });
    record("DCR refuses a foreign redirect URI", evil.status === 400, `status ${evil.status}`);
    const reg = await fetch(`${BASE}/oauth/register`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ redirect_uris: [REDIRECT], client_name: "Local smoke test" }) });
    const client = await reg.json();
    clientId = client.client_id ?? null;
    record("DCR registers a loopback client", reg.status === 201 && Boolean(clientId), `status ${reg.status}`);
    if (!clientId) return;

    // 4. Authorize over HTTP → redirected to the admin consent page
    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const authorize = new URL(`${BASE}/oauth/authorize`);
    for (const [k, v] of Object.entries({ client_id: clientId, redirect_uri: REDIRECT, response_type: "code", code_challenge: challenge, code_challenge_method: "S256", state: "smoke", scope: "blog_agent offline_access", resource: `${BASE}/api/mcp` })) authorize.searchParams.set(k, v);
    const authRes = await fetch(authorize, { redirect: "manual" });
    const consentUrl = authRes.headers.get("location") ?? "";
    const requestId = consentUrl.match(/\/admin\/connector\/authorize\/([0-9a-f-]{36})/)?.[1];
    record("/oauth/authorize → admin consent page", authRes.status === 302 && Boolean(requestId), consentUrl.replace(BASE, ""));
    if (!requestId) return;

    const consentPage = await fetch(`${BASE}/admin/connector/authorize/${requestId}`, { redirect: "manual" });
    const loginLocation = consentPage.headers.get("location") ?? "";
    record("Consent page requires admin login and returns to it", consentPage.status === 307 && loginLocation.includes(`next=${encodeURIComponent(`/admin/connector/authorize/${requestId}`)}`), loginLocation.replace(BASE, ""));

    // 5. Approve (stands in for clicking Approve while logged in)
    const decision = await decideAuthorization(db, config, requestId, "local-smoke-test", true);
    const code = new URL(decision.redirectTo).searchParams.get("code");
    record("Consent approval issues a code to the registered redirect", decision.redirectTo.startsWith(REDIRECT) && Boolean(code));
    if (!code) return;

    // 6. Token exchange over HTTP, then a replay of the same code
    const tokenRes = await fetch(`${BASE}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: REDIRECT, client_id: clientId, code_verifier: verifier }),
    });
    const tokens = await tokenRes.json();
    record("Token endpoint exchanges the code (PKCE)", tokenRes.status === 200 && Boolean(tokens.access_token) && Boolean(tokens.refresh_token), `status ${tokenRes.status}`);
    const replay = await fetch(`${BASE}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: REDIRECT, client_id: clientId, code_verifier: verifier }),
    });
    record("Replayed code is rejected", replay.status === 400, `status ${replay.status}`);
    // The replay revoked the grant (by design). Get a fresh connection for the MCP checks.
    const verifier2 = randomBytes(32).toString("base64url");
    authorize.searchParams.set("code_challenge", createHash("sha256").update(verifier2).digest("base64url"));
    const auth2 = await fetch(authorize, { redirect: "manual" });
    const req2 = (auth2.headers.get("location") ?? "").match(/([0-9a-f-]{36})$/)?.[1];
    const d2 = await decideAuthorization(db, config, req2!, "local-smoke-test", true);
    const tok2 = await (await fetch(`${BASE}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code: new URL(d2.redirectTo).searchParams.get("code")!, redirect_uri: REDIRECT, client_id: clientId, code_verifier: verifier2 }),
    })).json();
    const oldTokenAfterReplay = await mcp(tokens.access_token, "tools/list");
    record("Code replay revoked the first connection's token", oldTokenAfterReplay.res.status === 401, `status ${oldTokenAfterReplay.res.status}`);

    // 7. MCP over HTTP with a valid token
    const init = await mcp(tok2.access_token, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "smoke", version: "1" } });
    record("MCP initialize", init.res.status === 200 && (init.json?.result as { serverInfo?: { name?: string } })?.serverInfo?.name === "johnnybits-blog-agent", `status ${init.res.status}`);
    const list = await mcp(tok2.access_token, "tools/list");
    const names = ((list.json?.result as { tools?: { name: string }[] })?.tools ?? []).map((t) => t.name);
    record("tools/list returns 16 tools, none can publish/approve/delete", names.length === 16 && !names.some((n) => /publish|approve|reject|delete/.test(n)), names.join(", "));
    const brand = await mcp(tok2.access_token, "tools/call", { name: "get_brand_context", arguments: {} });
    const company = (brand.json?.result as { structuredContent?: { company?: { name?: string }; authors?: { name: string }[] } })?.structuredContent;
    record("get_brand_context (live)", company?.company?.name === "Johnnybits Technology" && company?.authors?.[0]?.name === "Odoh John");
    const search = await mcp(tok2.access_token, "tools/call", { name: "search_site_content", arguments: { query: "ecommerce payment gateways in Nigeria", limit: 5 } });
    const hits = ((search.json?.result as { structuredContent?: { results?: { url: string }[] } })?.structuredContent?.results ?? []).map((h) => h.url);
    record("search_site_content finds real published content", hits.length > 0 && hits.some((u) => u.startsWith("/blog/")), hits.join(", "));
    const bad = await mcp(tok2.access_token, "tools/call", { name: "get_run", arguments: { run_id: "00000000-0000-4000-8000-000000000000" } });
    const badResult = bad.json?.result as { isError?: boolean; content?: { text: string }[] } | undefined;
    record("Tool errors come back as isError with a code", badResult?.isError === true && (badResult.content?.[0]?.text ?? "").includes("not_found"));

    // 8. Refresh rotation and revocation over HTTP
    const refreshed = await fetch(`${BASE}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: tok2.refresh_token, client_id: clientId }),
    });
    const tok3 = await refreshed.json();
    record("Refresh token rotates", refreshed.status === 200 && tok3.refresh_token && tok3.refresh_token !== tok2.refresh_token, `status ${refreshed.status}`);
    const revoke = await fetch(`${BASE}/oauth/revoke`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token: tok3.refresh_token }) });
    const afterRevoke = await mcp(tok3.access_token, "tools/list");
    record("Revocation ends the connection", revoke.status === 200 && afterRevoke.res.status === 401, `revoke ${revoke.status}, then MCP ${afterRevoke.res.status}`);

    const logged = await db.execute(sql`SELECT count(*)::int AS n FROM mcp_call_log WHERE client_id = ${clientId}`);
    const n = Number(((logged as unknown as { rows: { n: number }[] }).rows ?? [])[0]?.n ?? 0);
    record("Tool calls were written to mcp_call_log", n >= 3, `${n} rows`);
  } finally {
    if (clientId) {
      await db.execute(sql`DELETE FROM mcp_call_log WHERE client_id = ${clientId}`);
      await db.execute(sql`DELETE FROM oauth_clients WHERE client_id = ${clientId}`); // cascades to requests, grants, codes, tokens
      console.log("Cleaned up the smoke-test client and everything issued to it.");
    }
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\nOAuth/MCP smoke: ${results.length - failed}/${results.length} passed`);
  process.exitCode = failed ? 1 : 0;
}

main().catch((error: unknown) => {
  console.error("Smoke test crashed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
