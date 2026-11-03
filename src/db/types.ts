import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "./schema";

/**
 * Driver-agnostic database type: production uses Neon HTTP, tests use PGlite.
 * Neon HTTP has no interactive transactions; code that needs one takes a Pool-backed db instead.
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
