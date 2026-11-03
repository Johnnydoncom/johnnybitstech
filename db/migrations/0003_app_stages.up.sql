-- 0003 Stage outputs produced by the app (not by Claude), versioned alongside Claude's stages:
--   s8_applied    internal links inserted into the draft (deterministic)
--   s7_package    computed SEO package (slug, JSON-LD, metrics)
--   s9_validation validate_article report
-- s10_index and s11_draft already exist.
ALTER TYPE pipeline_stage ADD VALUE IF NOT EXISTS 's8_applied';
ALTER TYPE pipeline_stage ADD VALUE IF NOT EXISTS 's7_package';
ALTER TYPE pipeline_stage ADD VALUE IF NOT EXISTS 's9_validation';
