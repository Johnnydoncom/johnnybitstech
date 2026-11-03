import { sql } from "drizzle-orm";
import { rowsOf } from "@/db/rows";
import type { Db } from "@/db/types";
import type { SiteSearchHit } from "./lexical";

/**
 * Cosine-similarity search over searchable chunks of published articles (best chunk per article)
 * and active link targets, restricted to vectors from the same model and dimension.
 */
export async function vectorSearch(db: Db, vector: readonly number[], model: string, limit = 20): Promise<SiteSearchHit[]> {
  const dims = vector.length;
  const literal = `[${vector.join(",")}]`;
  const result = await db.execute(sql`
    WITH q AS (SELECT ${literal}::vector AS v),
    hits AS (
      SELECT 'article' AS kind, 'article' AS type, a.id::text AS id, '/blog/' || a.slug AS url, a.title,
             coalesce(a.summary, '') AS summary, max(1 - (c.embedding <=> q.v)) AS score
      FROM article_chunks c JOIN articles a ON a.id = c.article_id, q
      WHERE c.searchable AND a.status = 'published' AND c.embedding_model = ${model} AND c.embedding_dims = ${dims}::int
      GROUP BY a.id, a.slug, a.title, a.summary
      UNION ALL
      SELECT 'link_target', t.type::text, t.id::text, t.url, t.title, t.summary, 1 - (t.embedding <=> q.v)
      FROM link_targets t, q
      WHERE t.is_active AND t.embedding_model = ${model} AND t.embedding_dims = ${dims}::int
    )
    SELECT kind, type, id, url, title, summary, round(score::numeric, 4)::float8 AS score
    FROM hits ORDER BY score DESC LIMIT ${Math.min(Math.max(limit, 1), 50)}::int
  `);
  return rowsOf<SiteSearchHit>(result).map((r) => ({ ...r, score: Number(r.score) }));
}

/** Reciprocal rank fusion of several ranked lists (k = 60, the usual constant). */
export function fuseRankings(lists: readonly SiteSearchHit[][], limit = 20): SiteSearchHit[] {
  const byUrl = new Map<string, { hit: SiteSearchHit; score: number }>();
  for (const list of lists) {
    list.forEach((hit, rank) => {
      const entry = byUrl.get(hit.url) ?? { hit, score: 0 };
      entry.score += 1 / (60 + rank + 1);
      byUrl.set(hit.url, entry);
    });
  }
  return [...byUrl.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ hit, score }) => ({ ...hit, score: Math.round(score * 10_000) / 10_000 }));
}
