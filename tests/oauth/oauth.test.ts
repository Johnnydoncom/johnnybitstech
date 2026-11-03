import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerClient, resolveClient } from "@/lib/oauth/clients";
import { authorizationServerMetadata, protectedResourceMetadata } from "@/lib/oauth/config";
import { verifyPkceS256 } from "@/lib/oauth/crypto";
import { OAuthError } from "@/lib/oauth/errors";
import {
  decideAuthorization,
  exchangeAuthorizationCode,
  getConsentRequest,
  refreshAccessToken,
  revokeGrant,
  revokeToken,
  startAuthorization,
  verifyAccessToken,
} from "@/lib/oauth/flow";
import { isAllowedRedirectUri, redirectUriMatches } from "@/lib/oauth/redirect";
import { createTestDb, type TestDb } from "../helpers/db";
import { authorizeParams, CALLBACK, config, connect, pkce } from "../helpers/oauth";

let t: TestDb;
beforeEach(async () => {
  t = await createTestDb();
});
afterEach(() => t.close());

const oauthCode = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    if (e instanceof OAuthError) return e.code;
    throw e;
  }
  return "no error";
};

describe("discovery metadata", () => {
  it("advertises PKCE S256, CIMD, DCR, public clients and the exact resource URL", () => {
    expect(authorizationServerMetadata(config)).toMatchObject({
      issuer: "https://johnnybits.com",
      authorization_endpoint: "https://johnnybits.com/oauth/authorize",
      token_endpoint: "https://johnnybits.com/oauth/token",
      registration_endpoint: "https://johnnybits.com/oauth/register",
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      client_id_metadata_document_supported: true,
      scopes_supported: ["blog_agent", "offline_access"],
    });
    expect(protectedResourceMetadata(config)).toMatchObject({
      resource: "https://johnnybits.com/api/mcp",
      authorization_servers: ["https://johnnybits.com"],
    });
  });
});

describe("redirect URIs and PKCE", () => {
  it("accepts only Claude's callback and loopback redirects", () => {
    expect(isAllowedRedirectUri(CALLBACK)).toBe(true);
    expect(isAllowedRedirectUri("http://localhost:3118/callback")).toBe(true);
    expect(isAllowedRedirectUri("http://127.0.0.1:50000/callback")).toBe(true);
    expect(isAllowedRedirectUri("https://evil.example/callback")).toBe(false);
    expect(isAllowedRedirectUri("http://claude.ai/api/mcp/auth_callback")).toBe(false);
    expect(isAllowedRedirectUri(`${CALLBACK}#frag`)).toBe(false);
  });

  it("matches loopback redirects regardless of port but otherwise exactly", () => {
    expect(redirectUriMatches(["http://localhost/callback"], "http://localhost:4567/callback")).toBe(true);
    expect(redirectUriMatches(["http://localhost/callback"], "http://localhost:4567/other")).toBe(false);
    expect(redirectUriMatches([CALLBACK], `${CALLBACK}?x=1`)).toBe(false);
  });

  it("verifies S256 challenges", () => {
    const { verifier, challenge } = pkce();
    expect(verifyPkceS256(verifier, challenge)).toBe(true);
    expect(verifyPkceS256(pkce().verifier, challenge)).toBe(false);
    expect(verifyPkceS256("short", challenge)).toBe(false);
  });
});

describe("client registration and CIMD", () => {
  it("DCR accepts Claude callbacks and rejects other redirects or confidential clients", async () => {
    const ok = await registerClient(t.db, { redirect_uris: [CALLBACK] });
    expect(ok).toMatchObject({ token_endpoint_auth_method: "none", redirect_uris: [CALLBACK] });
    expect(await oauthCode(registerClient(t.db, { redirect_uris: ["https://evil.example/cb"] }))).toBe("invalid_redirect_uri");
    expect(await oauthCode(registerClient(t.db, { redirect_uris: [CALLBACK], token_endpoint_auth_method: "client_secret_basic" }))).toBe("invalid_client_metadata");
  });

  const CIMD = "https://claude.ai/oauth/claude-code-client-metadata";
  const doc = (overrides: Record<string, unknown> = {}) =>
    new Response(JSON.stringify({ client_id: CIMD, client_name: "Claude Code", redirect_uris: ["http://localhost/callback", "https://evil.example/cb"], ...overrides }));

  it("fetches, validates, filters and caches a metadata document from an allowed host", async () => {
    const fetchMock = vi.fn(async () => doc());
    const client = await resolveClient(t.db, config, CIMD, fetchMock as unknown as typeof fetch);
    expect(client).toMatchObject({ kind: "cimd", clientName: "Claude Code", redirectUris: ["http://localhost/callback"] });
    await resolveClient(t.db, config, CIMD, fetchMock as unknown as typeof fetch);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects disallowed hosts, mismatched client_id and unknown DCR ids", async () => {
    const never = vi.fn();
    expect(await oauthCode(resolveClient(t.db, config, "https://evil.example/meta.json", never as unknown as typeof fetch))).toBe("invalid_client");
    expect(never).not.toHaveBeenCalled();
    const mismatch = vi.fn(async () => doc({ client_id: "https://claude.ai/other" }));
    expect(await oauthCode(resolveClient(t.db, config, CIMD, mismatch as unknown as typeof fetch))).toBe("invalid_client");
    expect(await oauthCode(resolveClient(t.db, config, "dcr_unknown"))).toBe("invalid_client");
  });
});

describe("authorization code flow", () => {
  it("issues tokens that verify against the MCP resource", async () => {
    const { tokens, clientId } = await connect(t.db);
    expect(tokens).toMatchObject({ token_type: "Bearer", expires_in: 3600, scope: "blog_agent offline_access" });
    const verified = await verifyAccessToken(t.db, config, tokens.access_token);
    expect(verified).toMatchObject({ clientId, scopes: ["blog_agent", "offline_access"], resource: config.resource });
    expect(await verifyAccessToken(t.db, { ...config, resource: "https://other.example/api/mcp" }, tokens.access_token)).toBeNull();
    const [row] = await t.exec.query<{ n: number }>("SELECT count(*)::int AS n FROM oauth_tokens WHERE token_hash = $1", [tokens.access_token]);
    expect(row.n).toBe(0); // only hashes are stored
  });

  it("refuses to redirect to an unregistered URI and redirects other errors to the client", async () => {
    const client = await registerClient(t.db, { redirect_uris: [CALLBACK] });
    const { challenge } = pkce();
    expect(await oauthCode(startAuthorization(t.db, config, authorizeParams(client.client_id, challenge, { redirect_uri: "http://localhost:1/cb" })))).toBe("invalid_request");

    const noPkce = await startAuthorization(t.db, config, authorizeParams(client.client_id, challenge, { code_challenge_method: "plain" }));
    expect(noPkce.kind).toBe("redirect");
    if (noPkce.kind === "redirect") {
      const url = new URL(noPkce.url);
      expect(url.origin + url.pathname).toBe(CALLBACK);
      expect(url.searchParams.get("error")).toBe("invalid_request");
      expect(url.searchParams.get("state")).toBe("xyz");
      expect(url.searchParams.get("iss")).toBe("https://johnnybits.com");
    }
    const wrongResource = await startAuthorization(t.db, config, authorizeParams(client.client_id, challenge, { resource: "https://other.example/mcp" }));
    expect(wrongResource.kind === "redirect" && new URL(wrongResource.url).searchParams.get("error")).toBe("invalid_target");
    const badScope = await startAuthorization(t.db, config, authorizeParams(client.client_id, challenge, { scope: "admin" }));
    expect(badScope.kind === "redirect" && new URL(badScope.url).searchParams.get("error")).toBe("invalid_scope");
  });

  it("denial returns access_denied and a request can only be decided once", async () => {
    const client = await registerClient(t.db, { redirect_uris: [CALLBACK] });
    const outcome = await startAuthorization(t.db, config, authorizeParams(client.client_id, pkce().challenge));
    if (outcome.kind !== "consent") throw new Error("expected consent");
    expect((await getConsentRequest(t.db, outcome.requestId))?.status).toBe("pending");
    const denied = await decideAuthorization(t.db, config, outcome.requestId, "a@b.c", false);
    expect(new URL(denied.redirectTo).searchParams.get("error")).toBe("access_denied");
    expect(await oauthCode(decideAuthorization(t.db, config, outcome.requestId, "a@b.c", true))).toBe("invalid_request");
    expect((await getConsentRequest(t.db, outcome.requestId))?.status).toBe("decided");
  });

  it("expired consent requests cannot be approved", async () => {
    const client = await registerClient(t.db, { redirect_uris: [CALLBACK] });
    const outcome = await startAuthorization(t.db, config, authorizeParams(client.client_id, pkce().challenge));
    if (outcome.kind !== "consent") throw new Error("expected consent");
    await t.exec.query("UPDATE oauth_auth_requests SET expires_at = now() - interval '1 second'");
    expect(await oauthCode(decideAuthorization(t.db, config, outcome.requestId, "a@b.c", true))).toBe("invalid_request");
  });

  async function codeFor() {
    const client = await registerClient(t.db, { redirect_uris: [CALLBACK] });
    const { verifier, challenge } = pkce();
    const outcome = await startAuthorization(t.db, config, authorizeParams(client.client_id, challenge));
    if (outcome.kind !== "consent") throw new Error("expected consent");
    const d = await decideAuthorization(t.db, config, outcome.requestId, "a@b.c", true);
    const code = new URL(d.redirectTo).searchParams.get("code")!;
    const form = (o: Record<string, string> = {}) =>
      new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: CALLBACK, client_id: client.client_id, code_verifier: verifier, ...o });
    return { form, grantId: d.grantId! };
  }

  it("rejects a wrong PKCE verifier", async () => {
    const { form } = await codeFor();
    expect(await oauthCode(exchangeAuthorizationCode(t.db, config, form({ code_verifier: pkce().verifier })))).toBe("invalid_grant");
  });

  it("rejects a wrong redirect_uri or client", async () => {
    const a = await codeFor();
    expect(await oauthCode(exchangeAuthorizationCode(t.db, config, a.form({ redirect_uri: "http://localhost/callback" })))).toBe("invalid_grant");
    const b = await codeFor();
    expect(await oauthCode(exchangeAuthorizationCode(t.db, config, b.form({ client_id: "dcr_other" })))).toBe("invalid_grant");
  });

  it("revokes everything when a code is replayed", async () => {
    const { form } = await codeFor();
    const tokens = await exchangeAuthorizationCode(t.db, config, form());
    expect(await oauthCode(exchangeAuthorizationCode(t.db, config, form()))).toBe("invalid_grant");
    expect(await verifyAccessToken(t.db, config, tokens.access_token)).toBeNull();
  });

  it("rejects an expired code", async () => {
    const { form } = await codeFor();
    await t.exec.query("UPDATE oauth_codes SET expires_at = now() - interval '1 second'");
    expect(await oauthCode(exchangeAuthorizationCode(t.db, config, form()))).toBe("invalid_grant");
  });
});

describe("refresh tokens", () => {
  const refreshForm = (token: string, clientId: string) => new URLSearchParams({ grant_type: "refresh_token", refresh_token: token, client_id: clientId });

  it("rotates on every use", async () => {
    const { tokens, clientId } = await connect(t.db);
    const next = await refreshAccessToken(t.db, config, refreshForm(tokens.refresh_token, clientId));
    expect(next.refresh_token).not.toBe(tokens.refresh_token);
    expect(await verifyAccessToken(t.db, config, next.access_token)).not.toBeNull();
  });

  it("treats an immediate second use as a benign race, but later reuse as theft", async () => {
    const { tokens, clientId } = await connect(t.db);
    const next = await refreshAccessToken(t.db, config, refreshForm(tokens.refresh_token, clientId));
    expect(await oauthCode(refreshAccessToken(t.db, config, refreshForm(tokens.refresh_token, clientId)))).toBe("invalid_grant");
    expect(await verifyAccessToken(t.db, config, next.access_token)).not.toBeNull(); // grace: not revoked

    await t.exec.query("UPDATE oauth_tokens SET rotated_at = now() - interval '5 minutes' WHERE rotated_at IS NOT NULL");
    expect(await oauthCode(refreshAccessToken(t.db, config, refreshForm(tokens.refresh_token, clientId)))).toBe("invalid_grant");
    expect(await verifyAccessToken(t.db, config, next.access_token)).toBeNull(); // whole grant revoked
  });

  it("revokes the grant if another client presents the token", async () => {
    const { tokens } = await connect(t.db);
    expect(await oauthCode(refreshAccessToken(t.db, config, refreshForm(tokens.refresh_token, "dcr_attacker")))).toBe("invalid_grant");
    expect(await verifyAccessToken(t.db, config, tokens.access_token)).toBeNull();
  });
});

describe("revocation", () => {
  it("revoking a token or the grant ends the connection", async () => {
    const a = await connect(t.db);
    await revokeToken(t.db, a.tokens.refresh_token);
    expect(await verifyAccessToken(t.db, config, a.tokens.access_token)).toBeNull();

    const b = await connect(t.db);
    await revokeGrant(t.db, b.grantId, "revoked_by_admin");
    expect(await verifyAccessToken(t.db, config, b.tokens.access_token)).toBeNull();
    expect(await oauthCode(refreshAccessToken(t.db, config, new URLSearchParams({ refresh_token: b.tokens.refresh_token, client_id: b.clientId })))).toBe("invalid_grant");
    await revokeToken(t.db, "unknown-token"); // no error
  });

  it("expired access tokens do not verify", async () => {
    const { tokens } = await connect(t.db);
    await t.exec.query("UPDATE oauth_tokens SET expires_at = now() - interval '1 second' WHERE kind = 'access'");
    expect(await verifyAccessToken(t.db, config, tokens.access_token)).toBeNull();
  });
});
