-- 0004 Several unique posts per keyword, plus an app-run originality check.
--   keyword_queue.posts_target  how many distinct articles to write for the keyword (1-20); the keyword is re-queued
--                               after each draft until that many exist (pending review or published), then marked done.
--   pipeline_runs.post_number   which post (1..posts_target) a run is writing, fixed when the run is claimed.
--   s9_originality              check_originality report: overlap with the site's own articles and the cited sources.
ALTER TABLE keyword_queue ADD COLUMN IF NOT EXISTS posts_target integer NOT NULL DEFAULT 1;
ALTER TABLE keyword_queue DROP CONSTRAINT IF EXISTS keyword_queue_posts_target_check;
ALTER TABLE keyword_queue ADD CONSTRAINT keyword_queue_posts_target_check CHECK (posts_target BETWEEN 1 AND 20);
ALTER TABLE pipeline_runs ADD COLUMN IF NOT EXISTS post_number integer;
ALTER TABLE pipeline_runs DROP CONSTRAINT IF EXISTS pipeline_runs_post_number_check;
ALTER TABLE pipeline_runs ADD CONSTRAINT pipeline_runs_post_number_check CHECK (post_number IS NULL OR post_number >= 1);
CREATE INDEX IF NOT EXISTS pipeline_runs_keyword_id_idx ON pipeline_runs (keyword_id);
ALTER TYPE pipeline_stage ADD VALUE IF NOT EXISTS 's9_originality';
