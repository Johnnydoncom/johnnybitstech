import { sql } from "drizzle-orm";
import type { Db } from "@/db/types";

export type AuditEntry = {
  actor: string;
  actorType: "admin" | "mcp_client" | "system";
  action: string;
  entity: string;
  entityId?: string | null;
  details?: unknown;
  ip?: string | null;
};

/** Append-only audit trail of security-relevant and admin actions. Never throws. */
export async function audit(db: Db, e: AuditEntry) {
  try {
    await db.execute(sql`
      INSERT INTO audit_log (actor, actor_type, action, entity, entity_id, details, ip)
      VALUES (${e.actor}, ${e.actorType}, ${e.action}, ${e.entity}, ${e.entityId ?? null},
              ${e.details === undefined ? null : JSON.stringify(e.details)}::jsonb, ${e.ip ?? null})
    `);
  } catch (error) {
    console.error("audit_log insert failed", error);
  }
}
