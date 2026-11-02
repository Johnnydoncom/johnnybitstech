import { createHash, randomBytes } from "node:crypto";
import { registerClient } from "@/lib/oauth/clients";
import { getOAuthConfig } from "@/lib/oauth/config";
import { decideAuthorization, exchangeAuthorizationCode, startAuthorization } from "@/lib/oauth/flow";
import type { Db } from "@/db/types";

export const config = getOAuthConfig({ OAUTH_ISSUER: "https://johnnybits.com" });
export const CALLBACK = "https://claude.ai/api/mcp/auth_callback";

export function pkce() {
  const verifier = randomBytes(32).toString("base64url");
  return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url") };
}

export function authorizeParams(clientId: string, challenge: string, extra: Record<string, string> = {}) {
  return new URLSearchParams({
    client_id: clientId,
    redirect_uri: CALLBACK,
    response_type: "code",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state: "xyz",
    scope: "blog_agent offline_access",
    resource: config.resource,
    ...extra,
  });
}

/** Registers a client, approves consent and exchanges the code: returns tokens + ids. */
export async function connect(db: Db) {
  const client = await registerClient(db, { redirect_uris: [CALLBACK], client_name: "Claude" });
  const { verifier, challenge } = pkce();
  const outcome = await startAuthorization(db, config, authorizeParams(client.client_id, challenge));
  if (outcome.kind !== "consent") throw new Error("expected consent");
  const decision = await decideAuthorization(db, config, outcome.requestId, "admin@johnnybits.com", true);
  const code = new URL(decision.redirectTo).searchParams.get("code")!;
  const tokens = await exchangeAuthorizationCode(
    db,
    config,
    new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: CALLBACK, client_id: client.client_id, code_verifier: verifier }),
  );
  return { clientId: client.client_id, grantId: decision.grantId!, tokens };
}
