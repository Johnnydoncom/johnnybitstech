import { sql } from "drizzle-orm";
import { rowsOf } from "@/db/rows";
import type { Db } from "@/db/types";
import { resolveClient } from "./clients";
import { SCOPE_BLOG_AGENT, SUPPORTED_SCOPES, TTL, type OAuthConfig } from "./config";
import { isValidCodeChallenge, randomToken, sha256Hex, verifyPkceS256 } from "./crypto";
import { OAuthError } from "./errors";
import { isLoopback, redirectUriMatches } from "./redirect";

// ---------------------------------------------------------------------------
// Authorization endpoint
// ---------------------------------------------------------------------------

export type AuthorizeOutcome =
  | { kind: "consent"; requestId: string }
  /** The request is invalid but the redirect URI is trusted: send the error back to the client. */
  | { kind: "redirect"; url: string };

export function withParams(base: string, params: Record<string, string | null | undefined>): string {
  const url = new URL(base);
  for (const [k, v] of Object.entries(params)) if (v != null) url.searchParams.set(k, v);
  return url.toString();
}

function normaliseResource(value: string): string {
  return value.replace(/\/+$/, "");
}

export function normaliseScope(raw: string | null): string | null {
  const requested = (raw ?? "").split(/\s+/).filter(Boolean);
  if (requested.some((s) => !(SUPPORTED_SCOPES as readonly string[]).includes(s))) return null;
  return [...new Set([SCOPE_BLOG_AGENT, ...requested])].join(" ");
}

/**
 * Validates an /oauth/authorize request. Throws OAuthError (shown to the user, never redirected)
 * until the client and redirect URI are trusted; after that, errors are returned to the client.
 */
export async function startAuthorization(
  db: Db,
  config: OAuthConfig,
  params: URLSearchParams,
  fetchImpl: typeof fetch = fetch,
): Promise<AuthorizeOutcome> {
  const clientId = params.get("client_id") ?? "";
  const redirectUri = params.get("redirect_uri") ?? "";
  if (!redirectUri) throw new OAuthError("invalid_request", "redirect_uri is required");
  const client = await resolveClient(db, config, clientId, fetchImpl);
  if (!redirectUriMatches(client.redirectUris, redirectUri)) {
    throw new OAuthError("invalid_request", "redirect_uri is not registered for this client");
  }

  const state = params.get("state");
  const fail = (error: string, description: string): AuthorizeOutcome => ({
    kind: "redirect",
    url: withParams(redirectUri, { error, error_description: description, state, iss: config.issuer }),
  });

  if (params.get("response_type") !== "code") return fail("unsupported_response_type", "Only response_type=code is supported");
  const challenge = params.get("code_challenge") ?? "";
  if (params.get("code_challenge_method") !== "S256" || !isValidCodeChallenge(challenge)) {
    return fail("invalid_request", "PKCE with code_challenge_method=S256 is required");
  }
  const scope = normaliseScope(params.get("scope"));
  if (!scope) return fail("invalid_scope", `Supported scopes: ${SUPPORTED_SCOPES.join(" ")}`);
  const resource = params.get("resource");
  if (resource && normaliseResource(resource) !== config.resource) {
    return fail("invalid_target", `This server only issues tokens for ${config.resource}`);
  }
  if (state && state.length > 1000) return fail("invalid_request", "state is too long");

  const [row] = rowsOf<{ id: string }>(
    await db.execute(sql`
      INSERT INTO oauth_auth_requests (client_id, redirect_uri, code_challenge, scope, state, resource, expires_at)
      VALUES (${client.clientId}, ${redirectUri}, ${challenge}, ${scope}, ${state}, ${config.resource},
              now() + make_interval(secs => ${TTL.authRequestSeconds}::int))
      RETURNING id
    `),
  );
  return { kind: "consent", requestId: row.id };
}

export type ConsentView = {
  id: string;
  clientId: string;
  clientName: string;
  clientKind: "cimd" | "dcr";
  redirectHost: string;
  loopbackRedirect: boolean;
  scope: string;
  status: "pending" | "expired" | "decided";
};

export async function getConsentRequest(db: Db, id: string): Promise<ConsentView | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = rowsOf<{
    id: string; client_id: string; client_name: string; kind: "cimd" | "dcr"; redirect_uri: string;
    scope: string; decision: string | null; expired: boolean;
  }>(
    await db.execute(sql`
      SELECT r.id, r.client_id, c.client_name, c.kind, r.redirect_uri, r.scope, r.decision, r.expires_at <= now() AS expired
      FROM oauth_auth_requests r JOIN oauth_clients c ON c.client_id = r.client_id
      WHERE r.id = ${id}
    `),
  );
  if (!row) return null;
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    clientKind: row.kind,
    redirectHost: new URL(row.redirect_uri).host,
    loopbackRedirect: isLoopback(row.redirect_uri),
    scope: row.scope,
    status: row.decision ? "decided" : row.expired ? "expired" : "pending",
  };
}

/** Records the admin's decision (once) and returns where to send the browser. */
export async function decideAuthorization(
  db: Db,
  config: OAuthConfig,
  requestId: string,
  adminEmail: string,
  approve: boolean,
): Promise<{ redirectTo: string; grantId: string | null }> {
  const [req] = rowsOf<{ client_id: string; redirect_uri: string; code_challenge: string; scope: string; state: string | null; resource: string }>(
    await db.execute(sql`
      UPDATE oauth_auth_requests
      SET decision = ${approve ? "approved" : "denied"}, decided_by = ${adminEmail}, decided_at = now()
      WHERE id = ${requestId} AND decision IS NULL AND expires_at > now()
      RETURNING client_id, redirect_uri, code_challenge, scope, state, resource
    `),
  );
  if (!req) throw new OAuthError("invalid_request", "This authorization request has expired or was already used");

  if (!approve) {
    return {
      grantId: null,
      redirectTo: withParams(req.redirect_uri, { error: "access_denied", error_description: "The administrator denied access", state: req.state, iss: config.issuer }),
    };
  }

  const code = randomToken(32);
  const [grant] = rowsOf<{ id: string }>(
    await db.execute(sql`
      WITH g AS (
        INSERT INTO oauth_grants (client_id, admin_email, scope, resource)
        VALUES (${req.client_id}, ${adminEmail}, ${req.scope}, ${req.resource})
        RETURNING id
      ), c AS (
        INSERT INTO oauth_codes (code_hash, grant_id, client_id, redirect_uri, code_challenge, expires_at)
        SELECT ${sha256Hex(code)}, g.id, ${req.client_id}, ${req.redirect_uri}, ${req.code_challenge},
               now() + make_interval(secs => ${TTL.codeSeconds}::int)
        FROM g
      )
      SELECT id FROM g
    `),
  );
  await db.execute(sql`UPDATE oauth_clients SET last_used_at = now() WHERE client_id = ${req.client_id}`);
  return { grantId: grant.id, redirectTo: withParams(req.redirect_uri, { code, state: req.state, iss: config.issuer }) };
}

// ---------------------------------------------------------------------------
// Token endpoint
// ---------------------------------------------------------------------------

export type TokenResponse = {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
};

async function issueTokens(db: Db, grantId: string, scope: string): Promise<TokenResponse> {
  const access = randomToken(32);
  const refresh = randomToken(32);
  await db.execute(sql`
    INSERT INTO oauth_tokens (token_hash, kind, grant_id, expires_at) VALUES
      (${sha256Hex(access)}, 'access', ${grantId}, now() + make_interval(secs => ${TTL.accessTokenSeconds}::int)),
      (${sha256Hex(refresh)}, 'refresh', ${grantId}, now() + make_interval(secs => ${TTL.refreshTokenSeconds}::int))
  `);
  return { access_token: access, token_type: "Bearer", expires_in: TTL.accessTokenSeconds, refresh_token: refresh, scope };
}

export async function revokeGrant(db: Db, grantId: string, reason: string) {
  await db.execute(sql`
    UPDATE oauth_grants SET revoked_at = coalesce(revoked_at, now()), revoked_reason = coalesce(revoked_reason, ${reason})
    WHERE id = ${grantId}
  `);
  await db.execute(sql`UPDATE oauth_tokens SET revoked_at = now() WHERE grant_id = ${grantId} AND revoked_at IS NULL`);
  await db.execute(sql`DELETE FROM oauth_codes WHERE grant_id = ${grantId} AND used_at IS NULL`);
}

function required(form: URLSearchParams, name: string): string {
  const value = form.get(name);
  if (!value) throw new OAuthError("invalid_request", `${name} is required`);
  return value;
}

function checkResource(config: OAuthConfig, form: URLSearchParams) {
  const resource = form.get("resource");
  if (resource && normaliseResource(resource) !== config.resource) {
    throw new OAuthError("invalid_target", `This server only issues tokens for ${config.resource}`);
  }
}

export async function exchangeAuthorizationCode(db: Db, config: OAuthConfig, form: URLSearchParams): Promise<TokenResponse> {
  const code = required(form, "code");
  const redirectUri = required(form, "redirect_uri");
  const clientId = required(form, "client_id");
  const verifier = required(form, "code_verifier");
  checkResource(config, form);
  const hash = sha256Hex(code);

  const [row] = rowsOf<{ grant_id: string; client_id: string; redirect_uri: string; code_challenge: string; fresh: boolean }>(
    await db.execute(sql`
      UPDATE oauth_codes SET used_at = now()
      WHERE code_hash = ${hash} AND used_at IS NULL
      RETURNING grant_id, client_id, redirect_uri, code_challenge, expires_at > now() AS fresh
    `),
  );
  if (!row) {
    // A replayed code means it may have leaked: revoke everything issued from it (RFC 6749 §4.1.2).
    const [replayed] = rowsOf<{ grant_id: string }>(await db.execute(sql`SELECT grant_id FROM oauth_codes WHERE code_hash = ${hash}`));
    if (replayed) await revokeGrant(db, replayed.grant_id, "authorization_code_replay");
    throw new OAuthError("invalid_grant", "Invalid or already used authorization code");
  }
  if (!row.fresh) throw new OAuthError("invalid_grant", "Authorization code expired");
  if (row.client_id !== clientId) throw new OAuthError("invalid_grant", "Code was issued to another client");
  if (row.redirect_uri !== redirectUri) throw new OAuthError("invalid_grant", "redirect_uri does not match the authorization request");
  if (!verifyPkceS256(verifier, row.code_challenge)) throw new OAuthError("invalid_grant", "PKCE verification failed");

  const [grant] = rowsOf<{ scope: string; revoked: boolean }>(
    await db.execute(sql`SELECT scope, revoked_at IS NOT NULL AS revoked FROM oauth_grants WHERE id = ${row.grant_id}`),
  );
  if (!grant || grant.revoked) throw new OAuthError("invalid_grant", "Authorization was revoked");
  return issueTokens(db, row.grant_id, grant.scope);
}

/** Seconds during which a just-rotated refresh token is rejected without revoking the grant (concurrent refresh). */
const REFRESH_REUSE_GRACE_SECONDS = 30;

export async function refreshAccessToken(db: Db, config: OAuthConfig, form: URLSearchParams): Promise<TokenResponse> {
  const token = required(form, "refresh_token");
  const clientId = required(form, "client_id");
  checkResource(config, form);
  const hash = sha256Hex(token);

  const [rotated] = rowsOf<{ grant_id: string }>(
    await db.execute(sql`
      UPDATE oauth_tokens SET rotated_at = now()
      WHERE token_hash = ${hash} AND kind = 'refresh' AND rotated_at IS NULL AND revoked_at IS NULL AND expires_at > now()
      RETURNING grant_id
    `),
  );
  if (!rotated) {
    const [prior] = rowsOf<{ grant_id: string; recent: boolean; was_rotated: boolean }>(
      await db.execute(sql`
        SELECT grant_id, rotated_at IS NOT NULL AS was_rotated,
               coalesce(rotated_at > now() - make_interval(secs => ${REFRESH_REUSE_GRACE_SECONDS}::int), false) AS recent
        FROM oauth_tokens WHERE token_hash = ${hash} AND kind = 'refresh'
      `),
    );
    if (prior?.was_rotated && !prior.recent) await revokeGrant(db, prior.grant_id, "refresh_token_reuse");
    throw new OAuthError("invalid_grant", "Invalid, expired or already used refresh token");
  }

  const [grant] = rowsOf<{ client_id: string; scope: string; revoked: boolean; client_revoked: boolean }>(
    await db.execute(sql`
      SELECT g.client_id, g.scope, g.revoked_at IS NOT NULL AS revoked, c.revoked_at IS NOT NULL AS client_revoked
      FROM oauth_grants g JOIN oauth_clients c ON c.client_id = g.client_id
      WHERE g.id = ${rotated.grant_id}
    `),
  );
  if (!grant || grant.revoked || grant.client_revoked) throw new OAuthError("invalid_grant", "Authorization was revoked");
  if (grant.client_id !== clientId) {
    await revokeGrant(db, rotated.grant_id, "refresh_token_wrong_client");
    throw new OAuthError("invalid_grant", "Refresh token was issued to another client");
  }
  return issueTokens(db, rotated.grant_id, grant.scope);
}

/** RFC 7009. Revoking either token ends the whole connection. Unknown tokens are not an error. */
export async function revokeToken(db: Db, token: string) {
  const [row] = rowsOf<{ grant_id: string }>(
    await db.execute(sql`SELECT grant_id FROM oauth_tokens WHERE token_hash = ${sha256Hex(token)}`),
  );
  if (row) await revokeGrant(db, row.grant_id, "revoked_by_client");
}

// ---------------------------------------------------------------------------
// Resource server
// ---------------------------------------------------------------------------

export type VerifiedToken = {
  clientId: string;
  grantId: string;
  scopes: string[];
  expiresAt: number;
  resource: string;
};

export async function verifyAccessToken(db: Db, config: OAuthConfig, token: string): Promise<VerifiedToken | null> {
  if (!token || token.length > 200) return null;
  const [row] = rowsOf<{ grant_id: string; client_id: string; scope: string; resource: string; expires_at: string | Date }>(
    await db.execute(sql`
      SELECT t.grant_id, g.client_id, g.scope, g.resource, t.expires_at
      FROM oauth_tokens t
      JOIN oauth_grants g ON g.id = t.grant_id
      JOIN oauth_clients c ON c.client_id = g.client_id
      WHERE t.token_hash = ${sha256Hex(token)} AND t.kind = 'access'
        AND t.revoked_at IS NULL AND g.revoked_at IS NULL AND c.revoked_at IS NULL AND t.expires_at > now()
    `),
  );
  if (!row || row.resource !== config.resource) return null;
  await db.execute(sql`
    UPDATE oauth_grants SET last_used_at = now()
    WHERE id = ${row.grant_id} AND (last_used_at IS NULL OR last_used_at < now() - interval '1 minute')
  `);
  return {
    clientId: row.client_id,
    grantId: row.grant_id,
    scopes: row.scope.split(" "),
    expiresAt: Math.floor(new Date(row.expires_at).getTime() / 1000),
    resource: row.resource,
  };
}
