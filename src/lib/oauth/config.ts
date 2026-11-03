import { SITE_URL } from "@/config/site";

/** Single scope: everything the connector can do. Publishing is not reachable through it. */
export const SCOPE_BLOG_AGENT = "blog_agent";
/** Claude appends offline_access when advertised, to obtain refresh tokens. We always issue them. */
export const SCOPE_OFFLINE = "offline_access";
export const SUPPORTED_SCOPES = [SCOPE_BLOG_AGENT, SCOPE_OFFLINE] as const;

export const TTL = {
  authRequestSeconds: 10 * 60,
  codeSeconds: 5 * 60,
  accessTokenSeconds: 60 * 60,
  refreshTokenSeconds: 30 * 24 * 60 * 60,
  cimdCacheSeconds: 24 * 60 * 60,
} as const;

/** Hosted Claude apps (claude.ai web, desktop, mobile, Cowork) use this fixed callback. */
export const CLAUDE_CALLBACKS = ["https://claude.ai/api/mcp/auth_callback", "https://claude.com/api/mcp/auth_callback"] as const;

export type OAuthConfig = {
  issuer: string;
  resource: string;
  allowedClientHosts: string[];
  staticToken: string | null;
};

function originOf(url: string): string {
  const u = new URL(url);
  return `${u.protocol}//${u.host}`;
}

export function getOAuthConfig(env: Record<string, string | undefined> = process.env): OAuthConfig {
  const issuer = originOf(env.OAUTH_ISSUER || SITE_URL);
  const hosts = (env.OAUTH_ALLOWED_CLIENT_HOSTS || "claude.ai,claude.com")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  const staticToken = env.MCP_STATIC_TOKEN && env.MCP_STATIC_TOKEN.length >= 32 ? env.MCP_STATIC_TOKEN : null;
  return { issuer, resource: `${issuer}/api/mcp`, allowedClientHosts: hosts, staticToken };
}

export function endpoints(issuer: string) {
  return {
    authorization: `${issuer}/oauth/authorize`,
    token: `${issuer}/oauth/token`,
    registration: `${issuer}/oauth/register`,
    revocation: `${issuer}/oauth/revoke`,
    protectedResourceMetadata: `${issuer}/.well-known/oauth-protected-resource/api/mcp`,
  };
}

/** RFC 8414 authorization server metadata. */
export function authorizationServerMetadata(config: OAuthConfig) {
  const e = endpoints(config.issuer);
  return {
    issuer: config.issuer,
    authorization_endpoint: e.authorization,
    token_endpoint: e.token,
    registration_endpoint: e.registration,
    revocation_endpoint: e.revocation,
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    revocation_endpoint_auth_methods_supported: ["none"],
    scopes_supported: [...SUPPORTED_SCOPES],
    client_id_metadata_document_supported: true,
    authorization_response_iss_parameter_supported: true,
    service_documentation: `${config.issuer}/admin/blog-agent/connections`,
  };
}

/** RFC 9728 protected resource metadata for /api/mcp. `resource` must equal the URL entered in Claude. */
export function protectedResourceMetadata(config: OAuthConfig) {
  return {
    resource: config.resource,
    authorization_servers: [config.issuer],
    scopes_supported: [SCOPE_BLOG_AGENT],
    bearer_methods_supported: ["header"],
    resource_name: "Johnnybits Blog Agent",
  };
}
