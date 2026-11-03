-- Postgres cannot drop enum values, so the type is rebuilt without them.
DELETE FROM pipeline_stage_outputs WHERE stage::text IN ('s8_applied', 's7_package', 's9_validation');
UPDATE pipeline_runs SET current_stage = NULL WHERE current_stage::text IN ('s8_applied', 's7_package', 's9_validation');
ALTER TYPE pipeline_stage RENAME TO pipeline_stage_0003;
CREATE TYPE pipeline_stage AS ENUM (
  's1_keyword', 's2_cluster', 's3_brief', 's4_research', 's5_outline', 's6_draft',
  's7_seo', 's8_links', 's9_qa', 's10_index', 's11_draft'
);
ALTER TABLE pipeline_stage_outputs ALTER COLUMN stage TYPE pipeline_stage USING stage::text::pipeline_stage;
ALTER TABLE pipeline_runs ALTER COLUMN current_stage TYPE pipeline_stage USING current_stage::text::pipeline_stage;
DROP TYPE pipeline_stage_0003;
