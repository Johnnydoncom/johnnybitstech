import { getOAuthConfig, protectedResourceMetadata } from "@/lib/oauth/config";
import { CORS_HEADERS, preflight } from "@/lib/oauth/http";

// Served at /.well-known/oauth-protected-resource[/api/mcp] via a rewrite in next.config.ts.
export function GET() {
  return Response.json(protectedResourceMetadata(getOAuthConfig()), {
    headers: { ...CORS_HEADERS, "Cache-Control": "public, max-age=3600" },
  });
}

export const OPTIONS = preflight;
