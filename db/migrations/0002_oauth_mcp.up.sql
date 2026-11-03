-- 0002 OAuth 2.1 authorization server for the MCP connector, MCP call log, rate limits.
-- Tokens and codes are stored only as SHA-256 hashes.

CREATE TABLE oauth_clients (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id            text NOT NULL UNIQUE,
  kind                 text NOT NULL CHECK (kind IN ('cimd', 'dcr')),
  client_name          text NOT NULL,
  redirect_uris        jsonb NOT NULL,
  metadata             jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata_fetched_at  timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  last_used_at         timestamptz,
  revoked_at           timestamptz
);

-- Pending consent screens (one per /oauth/authorize call).
CREATE TABLE oauth_auth_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       text NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
  redirect_uri    text NOT NULL,
  code_challenge  text NOT NULL,
  scope           text NOT NULL,
  state           text,
  resource        text NOT NULL,
  expires_at      timestamptz NOT NULL,
  decision        text CHECK (decision IN ('approved', 'denied')),
  decided_by      text,
  decided_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- A grant is one approved connection; revoking it kills every code and token issued under it.
CREATE TABLE oauth_grants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     text NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
  admin_email   text NOT NULL,
  scope         text NOT NULL,
  resource      text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz,
  revoked_reason text
);
CREATE INDEX oauth_grants_client_idx ON oauth_grants (client_id);

CREATE TABLE oauth_codes (
  code_hash       text PRIMARY KEY,
  grant_id        uuid NOT NULL REFERENCES oauth_grants(id) ON DELETE CASCADE,
  client_id       text NOT NULL,
  redirect_uri    text NOT NULL,
  code_challenge  text NOT NULL,
  expires_at      timestamptz NOT NULL,
  used_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE oauth_tokens (
  token_hash    text PRIMARY KEY,
  kind          text NOT NULL CHECK (kind IN ('access', 'refresh')),
  grant_id      uuid NOT NULL REFERENCES oauth_grants(id) ON DELETE CASCADE,
  expires_at    timestamptz NOT NULL,
  rotated_at    timestamptz,
  revoked_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX oauth_tokens_grant_idx ON oauth_tokens (grant_id);

CREATE TABLE mcp_call_log (
  id           bigserial PRIMARY KEY,
  client_id    text,
  grant_id     uuid,
  tool         text NOT NULL,
  run_id       uuid,
  ok           boolean NOT NULL,
  error_code   text,
  duration_ms  integer NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mcp_call_log_created_idx ON mcp_call_log (created_at DESC);
CREATE INDEX mcp_call_log_run_idx ON mcp_call_log (run_id) WHERE run_id IS NOT NULL;

-- Fixed-window counters (serverless-safe: no in-memory state).
CREATE TABLE rate_limits (
  bucket        text NOT NULL,
  window_start  timestamptz NOT NULL,
  hits          integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);

-- Result of check_cannibalization, required before the brief (s3) can be saved.
ALTER TABLE pipeline_runs ADD COLUMN cannibalization jsonb;
