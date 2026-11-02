/**
 * Minimal SQL executor used by the migrator and seed scripts, so the same code
 * runs against Neon (WebSocket Pool) in scripts and PGlite in tests.
 */
export interface SqlExecutor {
  /** Run one or more statements with no parameters (simple query protocol). */
  exec(sql: string): Promise<void>;
  /** Run one parameterised statement and return its rows. */
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: readonly unknown[],
  ): Promise<T[]>;
}
