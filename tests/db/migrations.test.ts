import { afterEach, describe, expect, it } from "vitest";
import { getTableColumns, getTableName } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { migrateDown, migrateUp, migrationStatus } from "@/db/migrator";
import * as schema from "@/db/schema";
import { createTestDb, type TestDb } from "../helpers/db";

let t: TestDb | undefined;
afterEach(async () => {
  await t?.close();
  t = undefined;
});

const tables: PgTable[] = [];
for (const value of Object.values(schema) as unknown[]) if (value instanceof PgTable) tables.push(value);

async function columnsOf(t: TestDb, table: string) {
  const rows = await t.exec.query<{ column_name: string }>(
    "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1",
    [table],
  );
  return new Set(rows.map((r) => r.column_name));
}

describe("migrations", () => {
  it("applies every migration and records it", async () => {
    t = await createTestDb();
    const status = await migrationStatus(t.exec);
    expect(status.map((s) => [s.version, Boolean(s.appliedAt)])).toEqual([["0001", true], ["0002", true]]);
    expect(await migrateUp(t.exec)).toEqual([]); // idempotent
  });

  it("matches the Drizzle schema column-for-column", async () => {
    t = await createTestDb();
    expect(tables.length).toBeGreaterThanOrEqual(9);
    for (const table of tables) {
      const actual = await columnsOf(t, getTableName(table));
      const expected = Object.values(getTableColumns(table)).map((c) => c.name);
      expect(actual.size, `table ${getTableName(table)} exists`).toBeGreaterThan(0);
      for (const column of expected) expect(actual.has(column), `${getTableName(table)}.${column}`).toBe(true);
    }
  });

  it("adds admin_users.role with an 'admin' default", async () => {
    t = await createTestDb();
    await t.exec.query("INSERT INTO admin_users (email, password_hash) VALUES ('a@b.c', 'x')");
    const [row] = await t.exec.query<{ role: string }>("SELECT role FROM admin_users");
    expect(row.role).toBe("admin");
  });

  it("rolls back cleanly and can be re-applied", async () => {
    t = await createTestDb();
    expect(await migrateDown(t.exec)).toEqual(["0002"]);
    expect(await columnsOf(t, "oauth_tokens")).toEqual(new Set());
    expect(await columnsOf(t, "articles")).toContain("slug"); // 0001 still applied
    expect(await migrateDown(t.exec, 5)).toEqual(["0001"]);
    for (const table of tables) expect((await columnsOf(t, getTableName(table))).size).toBe(0);
    expect(await columnsOf(t, "blog_posts")).toContain("slug"); // legacy table untouched
    expect(await columnsOf(t, "admin_users")).not.toContain("role");
    expect(await migrateUp(t.exec)).toEqual(["0001", "0002"]);
  });

  it("enforces article invariants", async () => {
    t = await createTestDb();
    const insert = (slug: string, status = "draft", publishedAt: string | null = null) =>
      t!.exec.query("INSERT INTO articles (title, slug, status, published_at) VALUES ('T', $1, $2::article_status, $3)", [slug, status, publishedAt]);

    await expect(insert("Bad Slug")).rejects.toThrow();
    await expect(insert("ok-slug", "published", null)).rejects.toThrow(); // published needs a date
    await insert("ok-slug", "published", new Date().toISOString());
    await expect(insert("ok-slug")).rejects.toThrow(); // unique slug
  });

  it("keeps search_tsv in sync and strips HTML from it", async () => {
    t = await createTestDb();
    await t.exec.query(
      "INSERT INTO articles (title, slug, content, content_format) VALUES ('Paystack guide', 'paystack-guide', '<p class=\"ql-x\">Flutterwave fees</p>', 'html')",
    );
    const [row] = await t.exec.query<{ tsv: string }>("SELECT search_tsv::text AS tsv FROM articles");
    expect(row.tsv).toContain("'paystack'");
    expect(row.tsv).toContain("'flutterwav'");
    expect(row.tsv).not.toContain("ql");
  });

  it("rejects an embedding whose recorded dimension is wrong", async () => {
    t = await createTestDb();
    const [{ id }] = await t.exec.query<{ id: string }>("INSERT INTO articles (title, slug) VALUES ('T', 't') RETURNING id");
    const add = (dims: number) =>
      t!.exec.query(
        "INSERT INTO article_chunks (article_id, scope, body, content_hash, embedding, embedding_model, embedding_dims) VALUES ($1, 'full', 'b', 'h', '[1,0,0]', 'm', $2)",
        [id, dims],
      );
    await expect(add(4)).rejects.toThrow();
    await add(3);
  });
});
