import mysql, { type FieldPacket, type QueryResult } from "mysql2/promise";

let pool: mysql.Pool | null = null;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "johnnybits",
      waitForConnections: true,
      connectionLimit: 5, // keep low for serverless
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
  }
  return pool;
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: (string | number | null | boolean)[]
): Promise<T[]> {
  const db = getPool();
  const [rows] = await db.execute(sql, params) as [T[], FieldPacket[]];
  return rows;
}

export async function execute(sql: string, params?: (string | number | null | boolean)[]) {
  const db = getPool();
  const [result] = await db.execute(sql, params) as [mysql.ResultSetHeader, FieldPacket[]];
  return result;
}
