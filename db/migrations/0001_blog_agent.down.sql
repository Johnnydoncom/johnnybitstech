-- Reverts 0001. Extensions (vector, pg_trgm) are kept on purpose: other objects may depend on them.
ALTER TABLE admin_users DROP COLUMN IF EXISTS role;

DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS pipeline_stage_outputs;
DROP TABLE IF EXISTS link_targets;
DROP TABLE IF EXISTS article_chunks;

ALTER TABLE IF EXISTS pipeline_runs DROP CONSTRAINT IF EXISTS pipeline_runs_article_fk;
ALTER TABLE IF EXISTS keyword_queue DROP CONSTRAINT IF EXISTS keyword_queue_claimed_by_run_fk;
ALTER TABLE IF EXISTS content_clusters DROP CONSTRAINT IF EXISTS content_clusters_pillar_article_fk;

DROP TABLE IF EXISTS articles;
DROP TABLE IF EXISTS pipeline_runs;
DROP TABLE IF EXISTS keyword_queue;
DROP TABLE IF EXISTS content_clusters;
DROP TABLE IF EXISTS authors;

DROP FUNCTION IF EXISTS blog_agent_touch_updated_at();

DROP TYPE IF EXISTS pipeline_stage;
DROP TYPE IF EXISTS run_status;
DROP TYPE IF EXISTS keyword_status;
DROP TYPE IF EXISTS link_target_type;
DROP TYPE IF EXISTS chunk_scope;
DROP TYPE IF EXISTS content_format;
DROP TYPE IF EXISTS article_status;
