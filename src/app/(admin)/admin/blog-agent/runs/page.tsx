import Link from "next/link";
import { getDb } from "@/db/client";
import { requireAdmin } from "@/lib/blog-agent/admin/auth";
import { listRuns } from "@/lib/blog-agent/admin/runs";
import { AgentHeader, Notice, StatusBadge, fmt, tableHead, td, th } from "../_components/ui";

export const dynamic = "force-dynamic";
const FILTERS = ["all", "running", "needs_human", "draft_created", "abandoned", "failed"];

export default async function RunsPage({ searchParams }: { searchParams: Promise<{ status?: string; ok?: string; error?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const status = FILTERS.includes(sp.status ?? "") && sp.status !== "all" ? sp.status : undefined;
  const runs = await listRuns(getDb(), status);

  return (
    <div>
      <AgentHeader title="Runs" description="One run per keyword: every stage the agent saved, in order." active="/admin/blog-agent/runs" />
      <Notice ok={sp.ok} error={sp.error} />
      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        {FILTERS.map((f) => (
          <Link key={f} href={f === "all" ? "/admin/blog-agent/runs" : `/admin/blog-agent/runs?status=${f}`}
            className={`rounded-full px-3 py-1 border ${(status ?? "all") === f ? "border-primary bg-primary/10" : "border-border"}`}>
            {f.replace(/_/g, " ")}
          </Link>
        ))}
      </div>
      {runs.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">No runs yet.</p>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead><tr className={tableHead}><th className={th}>Keyword</th><th className={th}>Status</th><th className={th}>Stage</th><th className={th}>Started</th><th className={th}>Last activity</th><th className={th}>Result</th></tr></thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className={td}><Link href={`/admin/blog-agent/runs/${r.id}`} className="font-medium hover:underline">{r.keyword}</Link></td>
                  <td className={td}><StatusBadge status={r.status} /></td>
                  <td className={`${td} font-mono text-xs`}>{r.current_stage ?? "—"}</td>
                  <td className={`${td} whitespace-nowrap text-muted-foreground`}>{fmt(r.started_at)}</td>
                  <td className={`${td} whitespace-nowrap text-muted-foreground`}>{fmt(r.heartbeat_at)}</td>
                  <td className={td}>
                    {r.article_id ? (
                      <Link href={`/admin/blog-agent/drafts/${r.article_id}`} className="text-primary hover:underline">Review draft</Link>
                    ) : r.error ? (
                      <span className="text-xs text-muted-foreground line-clamp-2">{r.error.reason ?? r.error.message}</span>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
