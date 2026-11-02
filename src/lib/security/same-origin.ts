/**
 * CSRF defence for cookie-authenticated route handlers (OWASP "verify origin").
 * State-changing requests must carry an Origin (or Referer) whose host matches the request host.
 * Combined with the SameSite=Lax session cookie this blocks cross-site form/fetch submissions.
 */
export function isSameOrigin(request: Request): boolean {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return false;

  const source = request.headers.get("origin") ?? request.headers.get("referer");
  if (!source || source === "null") return false;

  try {
    return new URL(source).host === host;
  } catch {
    return false;
  }
}
