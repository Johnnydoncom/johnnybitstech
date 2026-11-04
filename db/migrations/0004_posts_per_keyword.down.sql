-- Postgres cannot drop enum values, so the type is rebuilt without s9_originality (keeping the 0003 values).
DELETE FROM pipeline_stage_outputs WHERE stage::text = 's9_originality';
UPDATE pipeline_runs SET current_stage = NULL WHERE current_stage::text = 's9_originality';
ALTER TYPE pipeline_stage RENAME TO pipeline_stage_0004;
CREATE TYPE pipeline_stage AS ENUM (
  's1_keyword', 's2_cluster', 's3_brief', 's4_research', 's5_outline', 's6_draft',
  's7_seo', 's8_links', 's9_qa', 's10_index', 's11_draft',
  's8_applied', 's7_package', 's9_validation'
);
ALTER TABLE pipeline_stage_outputs ALTER COLUMN stage TYPE pipeline_stage USING stage::text::pipeline_stage;
ALTER TABLE pipeline_runs ALTER COLUMN current_stage TYPE pipeline_stage USING current_stage::text::pipeline_stage;
DROP TYPE pipeline_stage_0004;
DROP INDEX IF EXISTS pipeline_runs_keyword_id_idx;
ALTER TABLE pipeline_runs DROP CONSTRAINT IF EXISTS pipeline_runs_post_number_check;
ALTER TABLE pipeline_runs DROP COLUMN IF EXISTS post_number;
ALTER TABLE keyword_queue DROP CONSTRAINT IF EXISTS keyword_queue_posts_target_check;
ALTER TABLE keyword_queue DROP COLUMN IF EXISTS posts_target;
