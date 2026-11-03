/** RFC 6749 §5.2 / RFC 7591 §3.2.2 error. Rendered as JSON `{ error, error_description }`. */
export class OAuthError extends Error {
  constructor(
    readonly code:
      | "invalid_request"
      | "invalid_client"
      | "invalid_grant"
      | "unauthorized_client"
      | "unsupported_grant_type"
      | "invalid_scope"
      | "access_denied"
      | "unsupported_response_type"
      | "invalid_redirect_uri"
      | "invalid_client_metadata"
      | "invalid_target"
      | "temporarily_unavailable"
      | "slow_down",
    readonly description: string,
    readonly status = 400,
  ) {
    super(description);
    this.name = "OAuthError";
  }

  toJSON() {
    return { error: this.code, error_description: this.description };
  }
}

export function oauthErrorResponse(error: OAuthError, headers: Record<string, string> = {}) {
  return Response.json(error.toJSON(), {
    status: error.status,
    headers: { "Cache-Control": "no-store", Pragma: "no-cache", ...headers },
  });
}
