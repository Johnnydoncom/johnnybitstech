/**
 * Builds index entries for published articles and, if EMBEDDINGS_PROVIDER is set, embeds them and the
 * link targets. Safe to re-run (unchanged articles are skipped). Usage: npm run agent:index-backfill
 */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../../db/schema";
import type { Db } from "../../db/types";
import { getEmbeddingsProvider } from "../../lib/blog-agent/embeddings";
import { parseAgentEnv } from "../../lib/blog-agent/env";
import { indexPublishedArticles } from "../../lib/blog-agent/indexing/backfill";

config({ path: ".env.local" });
config();

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const db = drizzle({ client: neon(url), schema }) as unknown as Db;
  const provider = getEmbeddingsProvider(parseAgentEnv());
  console.log(provider ? `Embedding with ${provider.id} ${provider.model} (${provider.dims} dims)` : "No embeddings provider: building lexical index entries only");
  const r = await indexPublishedArticles(db, provider);
  console.log(`Articles indexed: ${r.articlesIndexed}, unchanged: ${r.articlesUnchanged}, link targets embedded: ${r.linkTargetsEmbedded}, cost: $${r.costUsd.toFixed(6)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
