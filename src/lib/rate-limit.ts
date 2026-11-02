import { sql } from "drizzle-orm";
import { rowsOf } from "@/db/rows";
import type { Db } from "@/db/types";

export type RateLimitResult = { allowed: boolean; limit: number; remaining: number; resetAt: Date };

/**
 * Fixed-window rate limit stored in Postgres (no in-memory state, safe on serverless).
 * One upsert per call; old windows are pruned opportunistically.
 */
export async function rateLimit(db: Db, bucket: string, limit: number, windowSeconds = 60): Promise<RateLimitResult> {
  const result = await db.execute(sql`
    INSERT INTO rate_limits (bucket, window_start, hits)
    VALUES (${bucket}, to_timestamp(floor(extract(epoch FROM now()) / ${windowSeconds}::int) * ${windowSeconds}::int), 1)
    ON CONFLICT (bucket, window_start) DO UPDATE SET hits = rate_limits.hits + 1
    RETURNING hits, window_start
  `);
  const [row] = rowsOf<{ hits: number; window_start: string | Date }>(result);
  if (Math.random() < 0.02) {
    await db.execute(sql`DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'`);
  }
  const hits = Number(row.hits);
  return {
    allowed: hits <= limit,
    limit,
    remaining: Math.max(0, limit - hits),
    resetAt: new Date(new Date(row.window_start).getTime() + windowSeconds * 1000),
  };
}

/** Client IP as seen by Vercel's edge (first X-Forwarded-For entry). */
export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}
