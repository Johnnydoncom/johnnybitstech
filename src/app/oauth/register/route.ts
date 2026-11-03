import { getDb } from "@/db/client";
import { registerClient } from "@/lib/oauth/clients";
import { OAuthError, oauthErrorResponse } from "@/lib/oauth/errors";
import { CORS_HEADERS, json, preflight } from "@/lib/oauth/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

/** RFC 7591 Dynamic Client Registration (fallback for clients that do not use a Client ID Metadata Document). */
export async function POST(request: Request) {
  const db = getDb();
  try {
    const limit = await rateLimit(db, `oauth-register:${clientIp(request)}`, 10);
    if (!limit.allowed) throw new OAuthError("slow_down", "Too many registrations", 429);
    const body = await request.json().catch(() => {
      throw new OAuthError("invalid_client_metadata", "Body must be JSON");
    });
    return json(await registerClient(db, body), 201);
  } catch (error) {
    if (error instanceof OAuthError) return oauthErrorResponse(error, CORS_HEADERS);
    console.error("oauth register error", error);
    return oauthErrorResponse(new OAuthError("temporarily_unavailable", "Registration error", 500), CORS_HEADERS);
  }
}
