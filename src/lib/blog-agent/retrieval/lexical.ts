import { sql } from "drizzle-orm";
import { rowsOf } from "@/db/rows";
import type { Db } from "@/db/types";

export type SiteSearchHit = {
  kind: "article" | "link_target";
  /** "article" for blog posts, otherwise the link target type (service, contact, portfolio, …). */
  type: string;
  id: string;
  url: string;
  title: string;
  summary: string;
  /** 0–1 blend of full-text rank (70%) and title trigram similarity (30%). */
  score: number;
};

export type SiteSearchOptions = { limit?: number };

/**
 * Lexical search over published articles and active link targets.
 * Terms are OR-ed (any word can match) so long natural-language queries still recall candidates;
 * ranking rewards documents matching more terms and similar titles. Claude makes the final semantic call.
 */
export async function searchSiteContent(db: Db, query: string, options: SiteSearchOptions = {}): Promise<SiteSearchHit[]> {
  const q = query.trim().slice(0, 300);
  if (!q) return [];
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);

  const result = await db.execute(sql`
    WITH q AS (
      SELECT
        CASE WHEN plainto_tsquery('english', ${q})::text = '' THEN NULL
             ELSE replace(plainto_tsquery('english', ${q})::text, ' & ', ' | ')::tsquery END AS tsq,
        ${q}::text AS raw
    ),
    hits AS (
      SELECT 'article' AS kind, 'article' AS type, a.id::text AS id, '/blog/' || a.slug AS url, a.title, coalesce(a.summary, '') AS summary,
             coalesce(ts_rank_cd(a.search_tsv, q.tsq, 32), 0) AS text_score,
             greatest(similarity(a.title, q.raw), similarity(coalesce(a.primary_keyword, ''), q.raw)) AS trigram_score
      FROM articles a, q
      WHERE a.status = 'published'
        AND ((q.tsq IS NOT NULL AND a.search_tsv @@ q.tsq) OR a.title % q.raw OR a.primary_keyword % q.raw)
      UNION ALL
      SELECT 'link_target', t.type::text, t.id::text, t.url, t.title, t.summary,
             coalesce(ts_rank_cd(t.search_tsv, q.tsq, 32), 0),
             similarity(t.title, q.raw)
      FROM link_targets t, q
      WHERE t.is_active
        AND ((q.tsq IS NOT NULL AND t.search_tsv @@ q.tsq) OR t.title % q.raw)
    )
    SELECT kind, type, id, url, title, summary, round((0.7 * text_score + 0.3 * trigram_score)::numeric, 4)::float8 AS score
    FROM hits
    ORDER BY score DESC, title
    LIMIT ${limit}
  `);

  return rowsOf<SiteSearchHit>(result).map((r) => ({ ...r, score: Number(r.score) }));
}
