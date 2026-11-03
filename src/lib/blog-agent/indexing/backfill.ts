import { sql } from "drizzle-orm";
import { rowsOf } from "@/db/rows";
import type { Db } from "@/db/types";
import type { ContentFormat } from "@/db/schema";
import type { EmbeddingsProvider } from "../embeddings/types";
import { buildChunks } from "./chunks";

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

    let vectors: (number[] | null)[] = chunks.map(() => null);
    if (provider) {
      const embedded = await provider.embed(chunks.map((c) => c.body), "document");
      if (embedded.vectors.length !== chunks.length || embedded.vectors.some((v) => v.length !== provider.dims)) {
        throw new Error(`Embedding verification failed for article ${a.id}`);
      }
      vectors = embedded.vectors;
      result.costUsd += embedded.costUsd;
    }
    const rows = chunks.map((c, i) => ({
      ...c,
      embedding: vectors[i] ? `[${vectors[i]!.join(",")}]` : null,
      embedding_model: vectors[i] ? provider!.model : null,
      embedding_dims: vectors[i] ? provider!.dims : null,
    }));
    // One statement: upsert the current units and delete units that no longer exist. (A DELETE + INSERT of the
    // same keys in one statement would conflict: data-modifying CTEs share a snapshot.)
    const json = JSON.stringify(rows);
    await db.execute(sql`
      WITH incoming AS (
        SELECT * FROM jsonb_to_recordset(${json}::jsonb) AS c(
          scope text, section_key text, heading text, body text, content_hash text, embedding text, embedding_model text, embedding_dims int
        )
      ), upserted AS (
        INSERT INTO article_chunks (article_id, scope, section_key, heading, body, content_hash, searchable, embedding, embedding_model, embedding_dims)
        SELECT ${a.id}::uuid, scope::chunk_scope, section_key, heading, body, content_hash, true, embedding::vector, embedding_model, embedding_dims
        FROM incoming
        ON CONFLICT (article_id, scope, section_key) DO UPDATE
          SET heading = EXCLUDED.heading, body = EXCLUDED.body, content_hash = EXCLUDED.content_hash, searchable = true,
              embedding = EXCLUDED.embedding, embedding_model = EXCLUDED.embedding_model, embedding_dims = EXCLUDED.embedding_dims
        RETURNING 1
      )
      DELETE FROM article_chunks d
      WHERE d.article_id = ${a.id}::uuid
        AND NOT EXISTS (SELECT 1 FROM incoming i WHERE i.scope::chunk_scope = d.scope AND i.section_key = d.section_key)
    `);
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
