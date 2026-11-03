import { sql } from "drizzle-orm";
import { z } from "zod";
import { rowsOf } from "@/db/rows";
import type { Db } from "@/db/types";
import { TTL, type OAuthConfig } from "./config";
import { randomToken } from "./crypto";
import { OAuthError } from "./errors";
import { isAllowedRedirectUri } from "./redirect";

export type ResolvedClient = {
  clientId: string;
  kind: "cimd" | "dcr";
  clientName: string;
  redirectUris: string[];
};

type ClientRow = {
  client_id: string;
  kind: "cimd" | "dcr";
  client_name: string;
  redirect_uris: string[];
  metadata_fetched_at: string | Date | null;
  revoked_at: string | Date | null;
};

const MAX_METADATA_BYTES = 64 * 1024;

const cimdDocument = z
  .object({
    client_id: z.string().url(),
    client_name: z.string().trim().min(1).max(200).optional(),
    redirect_uris: z.array(z.string()).min(1).max(20),
    token_endpoint_auth_method: z.string().optional(),
  })
  .passthrough();

function hostAllowed(hostname: string, allowed: readonly string[]): boolean {
  const host = hostname.toLowerCase();
  return allowed.some((h) => host === h || host.endsWith(`.${h}`));
}

function asCimdUrl(clientId: string): URL | null {
  try {
    const url = new URL(clientId);
    // CIMD client ids are https URLs with a path component (MCP spec 2025-11-25).
    return url.protocol === "https:" && url.pathname !== "/" && !url.hash ? url : null;
  } catch {
    return null;
  }
}

async function loadClient(db: Db, clientId: string): Promise<ClientRow | undefined> {
  const [row] = rowsOf<ClientRow>(
    await db.execute(sql`
      SELECT client_id, kind, client_name, redirect_uris, metadata_fetched_at, revoked_at
      FROM oauth_clients WHERE client_id = ${clientId}
    `),
  );
  return row;
}

function toResolved(row: ClientRow): ResolvedClient {
  return { clientId: row.client_id, kind: row.kind, clientName: row.client_name, redirectUris: row.redirect_uris };
}

async function fetchCimd(url: URL, fetchImpl: typeof fetch) {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
  } catch {
    throw new OAuthError("invalid_client", "Could not fetch the client metadata document", 401);
  }
  if (!response.ok) throw new OAuthError("invalid_client", `Client metadata document returned HTTP ${response.status}`, 401);
  const text = await response.text();
  if (text.length > MAX_METADATA_BYTES) throw new OAuthError("invalid_client", "Client metadata document is too large", 401);
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new OAuthError("invalid_client", "Client metadata document is not JSON", 401);
  }
  const parsed = cimdDocument.safeParse(json);
  if (!parsed.success) throw new OAuthError("invalid_client", "Client metadata document is invalid", 401);
  return parsed.data;
}

/**
 * Resolves a client_id: an https URL is a Client ID Metadata Document (fetched, validated, cached 24h,
 * host-allowlisted); anything else must be a client registered through /oauth/register.
 */
export async function resolveClient(
  db: Db,
  config: OAuthConfig,
  clientId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ResolvedClient> {
  if (!clientId || clientId.length > 500) throw new OAuthError("invalid_client", "Missing or invalid client_id", 401);
  const cached = await loadClient(db, clientId);
  if (cached?.revoked_at) throw new OAuthError("invalid_client", "This client has been revoked", 401);

  const cimdUrl = asCimdUrl(clientId);
  if (!cimdUrl) {
    if (!cached || cached.kind !== "dcr") throw new OAuthError("invalid_client", "Unknown client", 401);
    return toResolved(cached);
  }

  if (!hostAllowed(cimdUrl.hostname, config.allowedClientHosts)) {
    throw new OAuthError("invalid_client", `Clients from ${cimdUrl.hostname} are not allowed`, 401);
  }
  const fresh =
    cached?.metadata_fetched_at &&
    Date.now() - new Date(cached.metadata_fetched_at).getTime() < TTL.cimdCacheSeconds * 1000;
  if (cached && fresh) return toResolved(cached);

  const doc = await fetchCimd(cimdUrl, fetchImpl);
  if (doc.client_id !== clientId) throw new OAuthError("invalid_client", "client_id in the metadata document does not match", 401);
  if (doc.token_endpoint_auth_method && doc.token_endpoint_auth_method !== "none") {
    throw new OAuthError("invalid_client", "Only public clients (token_endpoint_auth_method=none) are supported", 401);
  }
  const redirectUris = doc.redirect_uris.filter(isAllowedRedirectUri);
  if (redirectUris.length === 0) throw new OAuthError("invalid_client", "The client has no acceptable redirect URIs", 401);
  const clientName = doc.client_name ?? cimdUrl.hostname;

  await db.execute(sql`
    INSERT INTO oauth_clients (client_id, kind, client_name, redirect_uris, metadata, metadata_fetched_at)
    VALUES (${clientId}, 'cimd', ${clientName}, ${JSON.stringify(redirectUris)}::jsonb, ${JSON.stringify(doc)}::jsonb, now())
    ON CONFLICT (client_id) DO UPDATE
      SET client_name = EXCLUDED.client_name, redirect_uris = EXCLUDED.redirect_uris,
          metadata = EXCLUDED.metadata, metadata_fetched_at = now()
  `);
  return { clientId, kind: "cimd", clientName, redirectUris };
}

const registrationRequest = z.object({
  redirect_uris: z.array(z.string()).min(1).max(10),
  client_name: z.string().trim().min(1).max(200).optional(),
  token_endpoint_auth_method: z.string().optional(),
  grant_types: z.array(z.string()).optional(),
  response_types: z.array(z.string()).optional(),
  scope: z.string().optional(),
});

/** RFC 7591 Dynamic Client Registration, restricted to Claude callbacks and loopback redirects. */
export async function registerClient(db: Db, body: unknown) {
  const parsed = registrationRequest.safeParse(body);
  if (!parsed.success) throw new OAuthError("invalid_client_metadata", parsed.error.issues[0]?.message ?? "Invalid registration request");
  const req = parsed.data;

  const bad = req.redirect_uris.find((u) => !isAllowedRedirectUri(u));
  if (bad) throw new OAuthError("invalid_redirect_uri", `Redirect URI not allowed: ${bad.slice(0, 200)}`);
  if (req.token_endpoint_auth_method && req.token_endpoint_auth_method !== "none") {
    throw new OAuthError("invalid_client_metadata", "Only token_endpoint_auth_method=none is supported");
  }
  const grantTypes = req.grant_types ?? ["authorization_code", "refresh_token"];
  if (grantTypes.some((g) => g !== "authorization_code" && g !== "refresh_token")) {
    throw new OAuthError("invalid_client_metadata", "Unsupported grant_types");
  }
  const responseTypes = req.response_types ?? ["code"];
  if (responseTypes.some((r) => r !== "code")) throw new OAuthError("invalid_client_metadata", "Unsupported response_types");

  const clientId = `dcr_${randomToken(18)}`;
  const clientName = req.client_name ?? "MCP client";
  await db.execute(sql`
    INSERT INTO oauth_clients (client_id, kind, client_name, redirect_uris, metadata)
    VALUES (${clientId}, 'dcr', ${clientName}, ${JSON.stringify(req.redirect_uris)}::jsonb, ${JSON.stringify(req)}::jsonb)
  `);

  return {
    client_id: clientId,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    client_name: clientName,
    redirect_uris: req.redirect_uris,
    grant_types: grantTypes,
    response_types: responseTypes,
    token_endpoint_auth_method: "none",
  };
}
