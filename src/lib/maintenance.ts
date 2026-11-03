import { sql, type SQL } from "drizzle-orm";
import { rowsOf } from "@/db/rows";
import type { Db } from "@/db/types";
import { audit } from "@/lib/audit";
import { releaseStale } from "@/lib/blog-agent/tools/run-store";
import { safeEqual } from "@/lib/oauth/crypto";

/** How long each kind of record is kept after it stops being useful. */
export const RETENTION = {
  /** Codes and consent requests live for minutes; keep a day for debugging. */
  expiredCodesDays: 1,
  /** Tokens past expiry can never be used (refresh-reuse detection only needs unexpired rows). */
  expiredTokensDays: 1,
  /** Revoked connections disappear from the admin list after this. */
  revokedGrantsDays: 30,
  /** Dynamically registered clients that never completed sign-in. */
  unusedDcrClientsDays: 7,
  mcpCallLogDays: 90,
  rateLimitWindowsDays: 1,
} as const;

export type MaintenanceReport = Record<
  "oauth_codes" | "oauth_auth_requests" | "oauth_tokens" | "oauth_grants" | "oauth_clients" | "mcp_call_log" | "rate_limits",
  number
>;

async function countDeleted(db: Db, statement: SQL): Promise<number> {
  const [row] = rowsOf<{ n: number | string }>(await db.execute(sql`WITH d AS (${statement} RETURNING 1) SELECT count(*)::int AS n FROM d`));
  return Number(row?.n ?? 0);
}

const daysAgo = (days: number) => sql`now() - make_interval(days => ${days}::int)`;

/**
 * Releases stale pipeline runs and prunes records that are no longer useful. Each delete is its own
 * statement (grant deletion cascades to codes/tokens, so they must not share a snapshot). Safe to run often.
 */
export async function runMaintenance(db: Db): Promise<MaintenanceReport> {
  await releaseStale(db);
  const report: MaintenanceReport = {
    oauth_codes: await countDeleted(db, sql`DELETE FROM oauth_codes WHERE expires_at < ${daysAgo(RETENTION.expiredCodesDays)}`),
    oauth_auth_requests: await countDeleted(db, sql`DELETE FROM oauth_auth_requests WHERE expires_at < ${daysAgo(RETENTION.expiredCodesDays)}`),
    oauth_tokens: await countDeleted(db, sql`DELETE FROM oauth_tokens WHERE expires_at < ${daysAgo(RETENTION.expiredTokensDays)}`),
    oauth_grants: await countDeleted(db, sql`DELETE FROM oauth_grants WHERE revoked_at < ${daysAgo(RETENTION.revokedGrantsDays)}`),
    oauth_clients: await countDeleted(
      db,
      sql`DELETE FROM oauth_clients c
          WHERE c.kind = 'dcr'
            AND ((c.last_used_at IS NULL AND c.created_at < ${daysAgo(RETENTION.unusedDcrClientsDays)})
                 OR c.revoked_at < ${daysAgo(RETENTION.revokedGrantsDays)})
            AND NOT EXISTS (SELECT 1 FROM oauth_grants g WHERE g.client_id = c.client_id AND g.revoked_at IS NULL)`,
    ),
    mcp_call_log: await countDeleted(db, sql`DELETE FROM mcp_call_log WHERE created_at < ${daysAgo(RETENTION.mcpCallLogDays)}`),
    rate_limits: await countDeleted(db, sql`DELETE FROM rate_limits WHERE window_start < ${daysAgo(RETENTION.rateLimitWindowsDays)}`),
  };
  if (Object.values(report).some((n) => n > 0)) {
    await audit(db, { actor: "maintenance", actorType: "system", action: "maintenance.prune", entity: "system", details: report });
  }
  return report;
}

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Fails closed when the secret is unset or short. */
export function isAuthorizedCronRequest(authorization: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 16 || !authorization) return false;
  return safeEqual(authorization, `Bearer ${secret}`);
}
