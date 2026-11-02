import { getDb } from "@/db/client";
import { revokeToken } from "@/lib/oauth/flow";
import { CORS_HEADERS, preflight } from "@/lib/oauth/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

/** RFC 7009: always 200, whether or not the token existed. */
export async function POST(request: Request) {
  const db = getDb();
  const limit = await rateLimit(db, `oauth-revoke:${clientIp(request)}`, 30);
  if (limit.allowed) {
    const form = new URLSearchParams(await request.text());
    const token = form.get("token");
    if (token) await revokeToken(db, token);
  }
  return new Response(null, { status: limit.allowed ? 200 : 429, headers: { ...CORS_HEADERS, "Cache-Control": "no-store" } });
}
