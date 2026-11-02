import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { getDb } from "@/db/client";
import { registerBlogAgentTools, SERVER_INFO, SERVER_INSTRUCTIONS } from "@/lib/blog-agent/mcp/server";
import { getOAuthConfig, SCOPE_BLOG_AGENT } from "@/lib/oauth/config";
import { safeEqual } from "@/lib/oauth/crypto";
import { verifyAccessToken } from "@/lib/oauth/flow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const config = getOAuthConfig();

const handler = createMcpHandler(
  (server) =>
    registerBlogAgentTools(server, {
      getDb,
      siteOrigin: config.issuer,
      rateLimitPerMinute: Number(process.env.MCP_RATE_LIMIT_PER_MIN) || 120,
    }),
  { serverInfo: SERVER_INFO, instructions: SERVER_INSTRUCTIONS },
);

async function verifyBearer(_req: Request, token?: string): Promise<AuthInfo | undefined> {
  if (!token) return undefined;
  if (config.staticToken && safeEqual(token, config.staticToken)) {
    return { token, clientId: "static-token", scopes: [SCOPE_BLOG_AGENT], extra: { grantId: null } };
  }
  const verified = await verifyAccessToken(getDb(), config, token);
  if (!verified) return undefined;
  return {
    token,
    clientId: verified.clientId,
    scopes: verified.scopes,
    expiresAt: verified.expiresAt,
    resource: new URL(verified.resource),
    extra: { grantId: verified.grantId },
  };
}

const authed = withMcpAuth(handler, verifyBearer, {
  required: true,
  resourceUrl: config.issuer,
  resourceMetadataPath: "/.well-known/oauth-protected-resource/api/mcp",
  requiredScopes: [SCOPE_BLOG_AGENT],
});

export { authed as GET, authed as POST, authed as DELETE };
