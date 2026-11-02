import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import type { Db } from "./types";

export type { Db } from "./types";

let instance: Db | undefined;

/** Lazily created so importing this module never fails at build time. */
export function getDb(): Db {
  if (!instance) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    // NeonHttpDatabase is a PgDatabase; the cast widens its result HKT to the shared Db type.
    instance = drizzle({ client: neon(url), schema }) as unknown as Db;
  }
  return instance;
}
