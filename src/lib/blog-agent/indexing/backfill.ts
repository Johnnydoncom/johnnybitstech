import { sql } from "drizzle-orm";
import { rowsOf } from "@/db/rows";
import type { Db } from "@/db/types";
import type { ContentFormat } from "@/db/schema";
import type { EmbeddingsProvider } from "../embeddings/types";
import { buildChunks, type Chunk } from "./chunks";

export type BackfillResult = { articlesIndexed: number; articlesUnchanged: number; linkTargetsEmbedded: number; costUsd: number };

/**
 * (Re)builds index entries for published articles (searchable, since they are public) and, when a provider
 * is configured, embeds them and the link targets. Idempotent: an article whose chunks are unchanged
 * (same hashes and same embedding model) is skipped.
 */
export async function indexPublishedArticles(db: Db, provider: EmbeddingsProvider | null): Promise<BackfillResult> {
  const result: BackfillResult = { articlesIndexed: 0, articlesUnchanged: 0, linkTargetsEmbedded: 0, costUsd: 0 };
  const articles = rowsOf<{ id: string; title: string; content: string; content_format: ContentFormat; meta_title: string | null; meta_description: string | null; faq: { question: string; answer: string }[] | null }>(
    await db.execute(sql`SELECT id, title, content, content_format, meta_title, meta_description, faq FROM articles WHERE status = 'published' ORDER BY published_at`),
  );

  for (const a of articles) {
    const chunks = buildChunks({ title: a.title, content: a.content, format: a.content_format, metaTitle: a.meta_title, metaDescription: a.meta_description, faq: a.faq });
    const existing = rowsOf<{ content_hash: string; embedding_model: string | null }>(
      await db.execute(sql`SELECT content_hash, embedding_model FROM article_chunks WHERE article_id = ${a.id}`),
    );
    const same =
      existing.length === chunks.length &&
      chunks.every((c) => existing.some((e) => e.content_hash === c.content_hash)) &&
      existing.every((e) => e.embedding_model === (provider?.model ?? null));
    if (same) {
      result.articlesUnchanged++;
      continue;
    }

    result.costUsd += await writeChunks(db, a.id, chunks, provider, true);
    result.articlesIndexed++;
  }

  if (provider) {
    const targets = rowsOf<{ id: string; title: string; summary: string }>(
      await db.execute(sql`
        SELECT id, title, summary FROM link_targets
        WHERE is_active AND (embedding IS NULL OR embedding_model IS DISTINCT FROM ${provider.model} OR embedding_dims IS DISTINCT FROM ${provider.dims}::int)
      `),
    );
    if (targets.length) {
      const embedded = await provider.embed(targets.map((t) => `${t.title}. ${t.summary}`), "document");
      result.costUsd += embedded.costUsd;
      for (const [i, t] of targets.entries()) {
        await db.execute(sql`
          UPDATE link_targets SET embedding = ${`[${embedded.vectors[i].join(",")}]`}::vector, embedding_model = ${provider.model}, embedding_dims = ${provider.dims}::int
          WHERE id = ${t.id}
        `);
      }
      result.linkTargetsEmbedded = targets.length;
    }
  }
  return result;
}

/**
 * Embeds (when a provider is given) and writes an article's index units in one statement: upserts the current
 * units and deletes units that no longer exist. Returns the embedding cost in USD.
 * (A DELETE + INSERT of the same keys in one statement would conflict: data-modifying CTEs share a snapshot.)
 */
export async function writeChunks(db: Db, articleId: string, chunks: Chunk[], provider: EmbeddingsProvider | null, searchable: boolean): Promise<number> {
  let vectors: (number[] | null)[] = chunks.map(() => null);
  let cost = 0;
  if (provider && chunks.length) {
    const embedded = await provider.embed(chunks.map((c) => c.body), "document");
    if (embedded.vectors.length !== chunks.length || embedded.vectors.some((v) => v.length !== provider.dims || !v.every(Number.isFinite))) {
      throw new Error(`Embedding verification failed for article ${articleId}`);
    }
    vectors = embedded.vectors;
    cost = embedded.costUsd;
  }
  const rows = chunks.map((c, i) => ({
    ...c,
    embedding: vectors[i] ? `[${vectors[i]!.join(",")}]` : null,
    embedding_model: vectors[i] ? provider!.model : null,
    embedding_dims: vectors[i] ? provider!.dims : null,
  }));
  await db.execute(sql`
    WITH incoming AS (
      SELECT * FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS c(
        scope text, section_key text, heading text, body text, content_hash text, embedding text, embedding_model text, embedding_dims int
      )
    ), upserted AS (
      INSERT INTO article_chunks (article_id, scope, section_key, heading, body, content_hash, searchable, embedding, embedding_model, embedding_dims)
      SELECT ${articleId}::uuid, scope::chunk_scope, section_key, heading, body, content_hash, ${searchable}, embedding::vector, embedding_model, embedding_dims
      FROM incoming
      ON CONFLICT (article_id, scope, section_key) DO UPDATE
        SET heading = EXCLUDED.heading, body = EXCLUDED.body, content_hash = EXCLUDED.content_hash, searchable = EXCLUDED.searchable,
            embedding = EXCLUDED.embedding, embedding_model = EXCLUDED.embedding_model, embedding_dims = EXCLUDED.embedding_dims
      RETURNING 1
    )
    DELETE FROM article_chunks d
    WHERE d.article_id = ${articleId}::uuid
      AND NOT EXISTS (SELECT 1 FROM incoming i WHERE i.scope::chunk_scope = d.scope AND i.section_key = d.section_key)
  `);
  return cost;
}
