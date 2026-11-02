import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { getOAuthConfig } from "@/lib/oauth/config";
import { OAuthError } from "@/lib/oauth/errors";
import { startAuthorization } from "@/lib/oauth/flow";
import { errorPage } from "@/lib/oauth/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const db = getDb();
  const limit = await rateLimit(db, `oauth-authorize:${clientIp(request)}`, 30);
  if (!limit.allowed) return errorPage("Too many requests", "Please wait a minute and try connecting again.", 429);

  try {
    const outcome = await startAuthorization(db, getOAuthConfig(), new URL(request.url).searchParams);
    if (outcome.kind === "redirect") return NextResponse.redirect(outcome.url, 302);
    // The consent page lives under /admin, so the admin login (proxy.ts) gates it.
    return NextResponse.redirect(new URL(`/admin/connector/authorize/${outcome.requestId}`, getOAuthConfig().issuer), 302);
  } catch (error) {
    if (error instanceof OAuthError) return errorPage("Cannot connect", error.description);
    console.error("oauth authorize error", error);
    return errorPage("Something went wrong", "The connection request could not be processed. Please try again.", 500);
  }
}
