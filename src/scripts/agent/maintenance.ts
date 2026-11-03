/**
 * Runs the retention job once (the same work as the daily cron). Usage: npm run agent:maintenance
 */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../../db/schema";
import type { Db } from "../../db/types";
import { runMaintenance } from "../../lib/maintenance";

config({ path: ".env.local" });
config();

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const db = drizzle({ client: neon(url), schema }) as unknown as Db;
  const report = await runMaintenance(db);
  for (const [table, n] of Object.entries(report)) console.log(`${table.padEnd(20)} ${n} deleted`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
