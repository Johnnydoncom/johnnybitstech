ALTER TABLE pipeline_runs DROP COLUMN IF EXISTS cannibalization;
DROP TABLE IF EXISTS rate_limits;
DROP TABLE IF EXISTS mcp_call_log;
DROP TABLE IF EXISTS oauth_tokens;
DROP TABLE IF EXISTS oauth_codes;
DROP TABLE IF EXISTS oauth_grants;
DROP TABLE IF EXISTS oauth_auth_requests;
DROP TABLE IF EXISTS oauth_clients;
