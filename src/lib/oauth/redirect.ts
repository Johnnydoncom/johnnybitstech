import { CLAUDE_CALLBACKS } from "./config";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function parse(uri: string): URL | null {
  try {
    const u = new URL(uri);
    return u.hash ? null : u;
  } catch {
    return null;
  }
}

/** RFC 8252 loopback redirect (Claude Code): http on localhost/127.0.0.1/[::1], any port. */
export function isLoopback(uri: string): boolean {
  const u = parse(uri);
  return Boolean(u && u.protocol === "http:" && LOOPBACK_HOSTS.has(u.hostname));
}

/** Only Claude's hosted callback and loopback redirects are ever accepted. */
export function isAllowedRedirectUri(uri: string): boolean {
  const u = parse(uri);
  if (!u) return false;
  if ((CLAUDE_CALLBACKS as readonly string[]).includes(u.toString())) return true;
  return isLoopback(uri);
}

/** Exact match, except loopback URIs where the port is ignored (RFC 8252 §7.3). */
export function redirectUriMatches(registered: readonly string[], requested: string): boolean {
  const req = parse(requested);
  if (!req || !isAllowedRedirectUri(requested)) return false;
  return registered.some((r) => {
    if (r === requested) return true;
    const reg = parse(r);
    if (!reg || !isLoopback(r) || !isLoopback(requested)) return false;
    return reg.hostname === req.hostname && reg.pathname === req.pathname && reg.search === req.search;
  });
}
