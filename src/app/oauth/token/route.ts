import { getDb } from "@/db/client";
import { getOAuthConfig } from "@/lib/oauth/config";
import { OAuthError, oauthErrorResponse } from "@/lib/oauth/errors";
import { exchangeAuthorizationCode, refreshAccessToken } from "@/lib/oauth/flow";
import { CORS_HEADERS, json, preflight } from "@/lib/oauth/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

export async function POST(request: Request) {
  const db = getDb();
  try {
    const limit = await rateLimit(db, `oauth-token:${clientIp(request)}`, 60);
    if (!limit.allowed) throw new OAuthError("slow_down", "Too many token requests", 429);
    if (!request.headers.get("content-type")?.includes("application/x-www-form-urlencoded")) {
      throw new OAuthError("invalid_request", "Use Content-Type: application/x-www-form-urlencoded");
    }
    const form = new URLSearchParams(await request.text());
    const grantType = form.get("grant_type");
    const config = getOAuthConfig();
    if (grantType === "authorization_code") return json(await exchangeAuthorizationCode(db, config, form), 200, { Pragma: "no-cache" });
    if (grantType === "refresh_token") return json(await refreshAccessToken(db, config, form), 200, { Pragma: "no-cache" });
    throw new OAuthError("unsupported_grant_type", "Supported grant types: authorization_code, refresh_token");
  } catch (error) {
    if (error instanceof OAuthError) return oauthErrorResponse(error, CORS_HEADERS);
    console.error("oauth token error", error);
    return oauthErrorResponse(new OAuthError("temporarily_unavailable", "Token endpoint error", 500), CORS_HEADERS);
  }
}
