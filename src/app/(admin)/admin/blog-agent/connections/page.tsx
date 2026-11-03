import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { rowsOf } from "@/db/rows";
import { getOAuthConfig } from "@/lib/oauth/config";
import { Button } from "@/components/ui/button";
import { revokeConnection } from "./actions";
import { requireAdmin } from "@/lib/blog-agent/admin/auth";
import { AgentHeader } from "../_components/ui";

export const dynamic = "force-dynamic";

type GrantRow = {
  id: string;
  client_name: string;
  client_id: string;
  admin_email: string;
  created_at: string | Date;
  last_used_at: string | Date | null;
  revoked_at: string | Date | null;
  revoked_reason: string | null;
};

type CallRow = { tool: string; ok: boolean; error_code: string | null; duration_ms: number; run_id: string | null; created_at: string | Date };

const fmt = (d: string | Date | null) =>
  d ? new Date(d).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }) : "—";

export default async function ConnectionsPage() {
  await requireAdmin();
  const db = getDb();
  const [grants, calls] = await Promise.all([
    db.execute(sql`
      SELECT g.id, c.client_name, c.client_id, g.admin_email, g.created_at, g.last_used_at, g.revoked_at, g.revoked_reason
      FROM oauth_grants g JOIN oauth_clients c ON c.client_id = g.client_id
      ORDER BY g.revoked_at IS NOT NULL, g.created_at DESC
      LIMIT 50
    `),
    db.execute(sql`SELECT tool, ok, error_code, duration_ms, run_id, created_at FROM mcp_call_log ORDER BY created_at DESC LIMIT 25`),
  ]);
  const grantRows = rowsOf<GrantRow>(grants);
  const callRows = rowsOf<CallRow>(calls);
  const serverUrl = getOAuthConfig().resource;

  return (
    <div className="space-y-10">
      <AgentHeader title="Connections" description="Claude connections to the Blog Agent, and recent tool calls." active="/admin/blog-agent/connections" />

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-semibold">Connector URL</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          In Claude: Settings → Connectors → Add custom connector, name it “Johnnybits Blog” and paste this URL. You will be asked to approve the connection here.
        </p>
        <code className="mt-3 block rounded-lg bg-muted px-3 py-2 text-sm break-all">{serverUrl}</code>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Connections</h2>
        {grantRows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">No connections yet.</p>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-x-auto shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Approved by</th>
                  <th className="px-5 py-3 font-medium">Connected</th>
                  <th className="px-5 py-3 font-medium">Last used</th>
                  <th className="px-5 py-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {grantRows.map((g) => (
                  <tr key={g.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-4">
                      <div className="font-medium">{g.client_name}</div>
                      <div className="text-xs text-muted-foreground break-all">{g.client_id}</div>
                    </td>
                    <td className="px-5 py-4">{g.admin_email}</td>
                    <td className="px-5 py-4 whitespace-nowrap">{fmt(g.created_at)}</td>
                    <td className="px-5 py-4 whitespace-nowrap">{fmt(g.last_used_at)}</td>
                    <td className="px-5 py-4 text-right">
                      {g.revoked_at ? (
                        <span className="text-xs text-muted-foreground">Revoked {fmt(g.revoked_at)}{g.revoked_reason ? ` (${g.revoked_reason})` : ""}</span>
                      ) : (
                        <form action={revokeConnection}>
                          <input type="hidden" name="grant_id" value={g.id} />
                          <Button type="submit" variant="outline" size="sm">Revoke</Button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-semibold mb-3">Recent tool calls</h2>
        {callRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No calls yet.</p>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-x-auto shadow-sm">
            <table className="w-full text-sm">
              <tbody>
                {callRows.map((c, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-5 py-2.5 whitespace-nowrap text-muted-foreground">{fmt(c.created_at)}</td>
                    <td className="px-5 py-2.5 font-mono text-xs">{c.tool}</td>
                    <td className={`px-5 py-2.5 text-xs ${c.ok ? "text-green-600" : "text-destructive"}`}>{c.ok ? "ok" : c.error_code}</td>
                    <td className="px-5 py-2.5 text-xs text-muted-foreground">{c.duration_ms} ms</td>
                    <td className="px-5 py-2.5 text-xs text-muted-foreground font-mono">{c.run_id?.slice(0, 8) ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
