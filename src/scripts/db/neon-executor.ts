import { Pool, neonConfig } from "@neondatabase/serverless";
import type { SqlExecutor } from "../../db/executor";

/**
 * Script-only executor over Neon's WebSocket Pool (supports multi-statement
 * transactions, which the HTTP driver does not). Prefers the unpooled URL for DDL.
 */
export function createNeonExecutor(): SqlExecutor & { close(): Promise<void> } {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL (or DATABASE_URL_UNPOOLED) is not set");
  if (typeof WebSocket !== "undefined") neonConfig.webSocketConstructor = WebSocket;

  const pool = new Pool({ connectionString: url, max: 1 });
  return {
    async exec(sql) {
      await pool.query(sql);
    },
    async query(sql, params) {
      const result = await pool.query(sql, params ? [...params] : undefined);
      return result.rows;
    },
    close: () => pool.end(),
  };
}
