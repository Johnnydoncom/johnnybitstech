import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle } from "drizzle-orm/pglite";
import type { SqlExecutor } from "@/db/executor";
import { migrateUp } from "@/db/migrator";
import * as schema from "@/db/schema";
import type { Db } from "@/db/types";

/** Pre-existing production tables the migration builds on (from src/scripts/migrate.js + add-column.js). */
export const LEGACY_DDL = `
  CREATE TABLE admin_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE blog_posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    excerpt TEXT,
    content TEXT,
    tag VARCHAR(100),
    published BOOLEAN DEFAULT FALSE,
    meta_title VARCHAR(255),
    meta_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    featured_image VARCHAR(255)
  );
`;

export type TestDb = { pg: PGlite; exec: SqlExecutor; db: Db; close(): Promise<void> };

function executor(pg: PGlite): SqlExecutor {
  return {
    async exec(sql) {
      await pg.exec(sql);
    },
    async query<T extends Record<string, unknown>>(sql: string, params?: readonly unknown[]) {
      const result = await pg.query<T>(sql, params ? [...params] : []);
      return result.rows;
    },
  };
}

/**
 * Booting PGlite and running the migrations takes ~2s, so each test file builds one migrated template
 * and every test gets a fresh clone of it (~0.2s).
 */
let migratedTemplate: Promise<PGlite> | undefined;

async function bootTemplate(migrate: boolean): Promise<PGlite> {
  const pg = await PGlite.create({ extensions: { vector, pg_trgm } });
  const exec = executor(pg);
  await exec.exec(LEGACY_DDL);
  if (migrate) await migrateUp(exec);
  return pg;
}

export async function createTestDb(options: { migrate?: boolean } = {}): Promise<TestDb> {
  const migrate = options.migrate !== false;
  let pg: PGlite;
  if (migrate) {
    migratedTemplate ??= bootTemplate(true);
    pg = (await (await migratedTemplate).clone()) as PGlite;
  } else {
    pg = await bootTemplate(false);
  }
  const exec = executor(pg);
  // PgliteDatabase is a PgDatabase; widen to the shared Db type like src/db/client.ts does.
  const db = drizzle({ client: pg, schema }) as unknown as Db;
  return { pg, exec, db, close: () => pg.close() };
}

export function legacyHtml(words: number): string {
  const sentence = "Nigerian businesses need fast websites that load well on mobile networks.";
  const perSentence = sentence.split(" ").length;
  const paragraphs: string[] = [];
  for (let i = 0; i < Math.ceil(words / perSentence); i++) paragraphs.push(`<p>${sentence}</p>`);
  return paragraphs.join("\n");
}
