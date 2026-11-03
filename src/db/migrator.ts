import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { SqlExecutor } from "./executor";

const MIGRATION_FILE = /^(\d{4})_([a-z0-9_]+)\.(up|down)\.sql$/;

export type Migration = {
  version: string;
  name: string;
  upPath: string;
  downPath: string;
};

export type MigrationStatus = Migration & { appliedAt: Date | null };

export const DEFAULT_MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");

export async function loadMigrations(dir = DEFAULT_MIGRATIONS_DIR): Promise<Migration[]> {
  const files = await readdir(dir);
  const byVersion = new Map<string, Partial<Migration>>();

  for (const file of files) {
    const match = MIGRATION_FILE.exec(file);
    if (!match) continue;
    const [, version, name, direction] = match;
    const entry = byVersion.get(version) ?? { version, name };
    if (entry.name !== name) {
      throw new Error(`Migration ${version} has mismatched names: ${entry.name} vs ${name}`);
    }
    if (direction === "up") entry.upPath = path.join(dir, file);
    else entry.downPath = path.join(dir, file);
    byVersion.set(version, entry);
  }

  return [...byVersion.values()]
    .map((m) => {
      if (!m.upPath || !m.downPath) {
        throw new Error(`Migration ${m.version}_${m.name} needs both an .up.sql and a .down.sql file`);
      }
      return m as Migration;
    })
    .sort((a, b) => a.version.localeCompare(b.version));
}

async function ensureTable(db: SqlExecutor) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version     text PRIMARY KEY,
      name        text NOT NULL,
      applied_at  timestamptz NOT NULL DEFAULT now()
    );
  `);
}

async function applied(db: SqlExecutor): Promise<Map<string, Date>> {
  const rows = await db.query<{ version: string; applied_at: Date | string }>(
    "SELECT version, applied_at FROM schema_migrations ORDER BY version",
  );
  return new Map(rows.map((r) => [r.version, new Date(r.applied_at)]));
}

function quote(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

export async function migrationStatus(db: SqlExecutor, dir?: string): Promise<MigrationStatus[]> {
  await ensureTable(db);
  const [all, done] = await Promise.all([loadMigrations(dir), applied(db)]);
  return all.map((m) => ({ ...m, appliedAt: done.get(m.version) ?? null }));
}

/** Applies every pending migration, each in its own transaction. Returns the versions applied. */
export async function migrateUp(db: SqlExecutor, dir?: string): Promise<string[]> {
  const status = await migrationStatus(db, dir);
  const ran: string[] = [];
  for (const m of status.filter((s) => !s.appliedAt)) {
    const sql = await readFile(m.upPath, "utf8");
    await db.exec(
      `BEGIN;\n${sql}\nINSERT INTO schema_migrations (version, name) VALUES (${quote(m.version)}, ${quote(m.name)});\nCOMMIT;`,
    ).catch(async (error: unknown) => {
      await db.exec("ROLLBACK;").catch(() => undefined);
      throw new Error(`Migration ${m.version}_${m.name} failed: ${(error as Error).message}`, { cause: error });
    });
    ran.push(m.version);
  }
  return ran;
}

/** Reverts the most recent `steps` applied migrations, newest first. Returns the versions reverted. */
export async function migrateDown(db: SqlExecutor, steps = 1, dir?: string): Promise<string[]> {
  const status = await migrationStatus(db, dir);
  const targets = status.filter((s) => s.appliedAt).reverse().slice(0, steps);
  const reverted: string[] = [];
  for (const m of targets) {
    const sql = await readFile(m.downPath, "utf8");
    await db.exec(
      `BEGIN;\n${sql}\nDELETE FROM schema_migrations WHERE version = ${quote(m.version)};\nCOMMIT;`,
    ).catch(async (error: unknown) => {
      await db.exec("ROLLBACK;").catch(() => undefined);
      throw new Error(`Rollback of ${m.version}_${m.name} failed: ${(error as Error).message}`, { cause: error });
    });
    reverted.push(m.version);
  }
  return reverted;
}
