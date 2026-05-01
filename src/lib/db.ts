import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

/**
 * Convert MySQL-style `?` placeholders to PostgreSQL `$1, $2, ...` placeholders.
 */
function convertPlaceholders(queryStr: string): string {
  let index = 0;
  return queryStr.replace(/\?/g, () => `$${++index}`);
}

export async function query<T = Record<string, unknown>>(
  sqlStr: string,
  params?: (string | number | null | boolean)[]
): Promise<T[]> {
  const pgSql = convertPlaceholders(sqlStr);
  // sql.query() returns rows directly as Record<string, any>[]
  const rows = await sql.query(pgSql, params as unknown[]);
  return rows as T[];
}

export async function execute(
  sqlStr: string,
  params?: (string | number | null | boolean)[]
) {
  const pgSql = convertPlaceholders(sqlStr);
  // sql.query() returns rows directly as Record<string, any>[]
  const rows = await sql.query(pgSql, params as unknown[]);

  // Provide a MySQL-compatible shape with insertId for INSERT ... RETURNING id
  return {
    insertId: rows.length > 0 && "id" in rows[0] ? (rows[0] as { id: number }).id : 0,
    affectedRows: rows.length,
    rows,
  };
}
