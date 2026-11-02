-- 0001 Blog agent: content model, retrieval, pipeline state, audit.
-- Reversible: see 0001_blog_agent.down.sql. Leaves the legacy blog_posts table untouched.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE article_status AS ENUM ('draft', 'pending_review', 'published', 'rejected', 'archived');
CREATE TYPE content_format AS ENUM ('html', 'markdown');
CREATE TYPE chunk_scope AS ENUM ('full', 'intro', 'section', 'faq', 'meta');
CREATE TYPE link_target_type AS ENUM ('service', 'portfolio', 'contact', 'category', 'pillar', 'page');
CREATE TYPE keyword_status AS ENUM ('queued', 'claimed', 'done', 'skipped', 'failed');
CREATE TYPE run_status AS ENUM ('running', 'needs_human', 'draft_created', 'failed', 'abandoned');
CREATE TYPE pipeline_stage AS ENUM (
  's1_keyword', 's2_cluster', 's3_brief', 's4_research', 's5_outline', 's6_draft',
  's7_seo', 's8_links', 's9_qa', 's10_index', 's11_draft'
);

CREATE FUNCTION blog_agent_touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TABLE authors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text NOT NULL,
  job_title   text,
  bio         text,
  url         text,
  same_as     jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE content_clusters (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL,
  pillar_keyword     text NOT NULL,
  pillar_article_id  uuid,
  parent_cluster_id  uuid REFERENCES content_clusters(id) ON DELETE SET NULL,
  priority           integer NOT NULL DEFAULT 50 CHECK (priority BETWEEN 0 AND 100),
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX content_clusters_pillar_keyword_uq ON content_clusters (lower(pillar_keyword));

CREATE TABLE keyword_queue (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword             text NOT NULL CHECK (length(btrim(keyword)) BETWEEN 2 AND 200),
  keyword_normalized  text NOT NULL UNIQUE,
  priority            integer NOT NULL DEFAULT 50 CHECK (priority BETWEEN 0 AND 100),
  status              keyword_status NOT NULL DEFAULT 'queued',
  cluster_id          uuid REFERENCES content_clusters(id) ON DELETE SET NULL,
  source              text NOT NULL DEFAULT 'admin' CHECK (source IN ('admin', 'agent', 'import')),
  notes               text,
  claimed_at          timestamptz,
  claimed_by_run      uuid,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX keyword_queue_claim_idx ON keyword_queue (status, priority DESC, created_at);

CREATE TABLE pipeline_runs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id          uuid REFERENCES keyword_queue(id) ON DELETE SET NULL,
  keyword             text NOT NULL,
  status              run_status NOT NULL DEFAULT 'running',
  current_stage       pipeline_stage,
  article_id          uuid,
  error               jsonb,
  client_id           text,
  embedding_cost_usd  numeric(12, 6) NOT NULL DEFAULT 0,
  started_at          timestamptz NOT NULL DEFAULT now(),
  heartbeat_at        timestamptz NOT NULL DEFAULT now(),
  finished_at         timestamptz
);
CREATE INDEX pipeline_runs_status_idx ON pipeline_runs (status, started_at DESC);

CREATE TABLE articles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id           integer UNIQUE,
  title               text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 300),
  slug                text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) <= 120),
  summary             text,
  content             text NOT NULL DEFAULT '',
  content_format      content_format NOT NULL DEFAULT 'markdown',
  content_hash        text,
  primary_keyword     text,
  secondary_keywords  jsonb NOT NULL DEFAULT '[]'::jsonb,
  category            text,
  tags                jsonb NOT NULL DEFAULT '[]'::jsonb,
  status              article_status NOT NULL DEFAULT 'draft',
  meta_title          text,
  meta_description    text,
  og_title            text,
  og_description      text,
  featured_image      text,
  featured_image_alt  text,
  image_prompt        text,
  schema_jsonld       jsonb,
  faq                 jsonb,
  citations           jsonb,
  qa_report           jsonb,
  word_count          integer NOT NULL DEFAULT 0 CHECK (word_count >= 0),
  reading_minutes     integer NOT NULL DEFAULT 1 CHECK (reading_minutes >= 1),
  author_id           uuid REFERENCES authors(id) ON DELETE SET NULL,
  reviewer_id         uuid REFERENCES authors(id) ON DELETE SET NULL,
  cluster_id          uuid REFERENCES content_clusters(id) ON DELETE SET NULL,
  run_id              uuid REFERENCES pipeline_runs(id) ON DELETE SET NULL,
  canonical_override  text CHECK (canonical_override IS NULL OR canonical_override ~ '^https://'),
  rejection_reason    text,
  search_tsv          tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english'::regconfig, coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english'::regconfig, coalesce(primary_keyword, '') || ' ' || coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english'::regconfig, regexp_replace(coalesce(content, ''), '<[^>]+>', ' ', 'g')), 'C')
  ) STORED,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  published_at        timestamptz,
  CONSTRAINT articles_published_has_date CHECK (status <> 'published' OR published_at IS NOT NULL)
);
CREATE INDEX articles_status_published_idx ON articles (status, published_at DESC);
CREATE INDEX articles_search_tsv_idx ON articles USING gin (search_tsv);
CREATE INDEX articles_title_trgm_idx ON articles USING gin (title gin_trgm_ops);
CREATE INDEX articles_primary_keyword_trgm_idx ON articles USING gin (primary_keyword gin_trgm_ops);

ALTER TABLE content_clusters
  ADD CONSTRAINT content_clusters_pillar_article_fk
  FOREIGN KEY (pillar_article_id) REFERENCES articles(id) ON DELETE SET NULL;
ALTER TABLE keyword_queue
  ADD CONSTRAINT keyword_queue_claimed_by_run_fk
  FOREIGN KEY (claimed_by_run) REFERENCES pipeline_runs(id) ON DELETE SET NULL;
ALTER TABLE pipeline_runs
  ADD CONSTRAINT pipeline_runs_article_fk
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL;

-- Retrieval units. Lexical search uses search_tsv; vector search uses embedding once a provider is enabled.
-- The embedding column has no fixed dimension: an HNSW index is added per model/dimension when vectors are switched on.
CREATE TABLE article_chunks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id       uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  scope            chunk_scope NOT NULL,
  section_key      text NOT NULL DEFAULT '',
  heading          text,
  body             text NOT NULL,
  content_hash     text NOT NULL,
  searchable       boolean NOT NULL DEFAULT false,
  embedding        vector,
  embedding_model  text,
  embedding_dims   integer,
  search_tsv       tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english'::regconfig, coalesce(heading, '')), 'A') ||
    setweight(to_tsvector('english'::regconfig, body), 'B')
  ) STORED,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT article_chunks_unit_uq UNIQUE (article_id, scope, section_key),
  CONSTRAINT article_chunks_embedding_meta CHECK (
    (embedding IS NULL AND embedding_model IS NULL AND embedding_dims IS NULL) OR
    (embedding IS NOT NULL AND embedding_model IS NOT NULL AND embedding_dims = vector_dims(embedding))
  )
);
CREATE INDEX article_chunks_search_tsv_idx ON article_chunks USING gin (search_tsv);
CREATE INDEX article_chunks_searchable_idx ON article_chunks (searchable) WHERE searchable;

CREATE TABLE link_targets (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url              text NOT NULL UNIQUE CHECK (url ~ '^/[a-z0-9/-]*$'),
  title            text NOT NULL,
  summary          text NOT NULL DEFAULT '',
  type             link_target_type NOT NULL,
  keywords         jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active        boolean NOT NULL DEFAULT true,
  embedding        vector,
  embedding_model  text,
  embedding_dims   integer,
  search_tsv       tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english'::regconfig, title), 'A') ||
    setweight(to_tsvector('english'::regconfig, summary), 'B')
  ) STORED,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX link_targets_search_tsv_idx ON link_targets USING gin (search_tsv);

CREATE TABLE pipeline_stage_outputs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        uuid NOT NULL REFERENCES pipeline_runs(id) ON DELETE CASCADE,
  stage         pipeline_stage NOT NULL,
  version       integer NOT NULL CHECK (version >= 1),
  output        jsonb NOT NULL,
  content_hash  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pipeline_stage_outputs_version_uq UNIQUE (run_id, stage, version)
);

CREATE TABLE audit_log (
  id          bigserial PRIMARY KEY,
  actor       text NOT NULL,
  actor_type  text NOT NULL CHECK (actor_type IN ('admin', 'mcp_client', 'system')),
  action      text NOT NULL,
  entity      text NOT NULL,
  entity_id   text,
  details     jsonb,
  ip          text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_created_idx ON audit_log (created_at DESC);
CREATE INDEX audit_log_entity_idx ON audit_log (entity, entity_id);

ALTER TABLE admin_users
  ADD COLUMN role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'editor'));

CREATE TRIGGER authors_touch BEFORE UPDATE ON authors
  FOR EACH ROW EXECUTE FUNCTION blog_agent_touch_updated_at();
CREATE TRIGGER content_clusters_touch BEFORE UPDATE ON content_clusters
  FOR EACH ROW EXECUTE FUNCTION blog_agent_touch_updated_at();
CREATE TRIGGER keyword_queue_touch BEFORE UPDATE ON keyword_queue
  FOR EACH ROW EXECUTE FUNCTION blog_agent_touch_updated_at();
CREATE TRIGGER articles_touch BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION blog_agent_touch_updated_at();
CREATE TRIGGER link_targets_touch BEFORE UPDATE ON link_targets
  FOR EACH ROW EXECUTE FUNCTION blog_agent_touch_updated_at();
