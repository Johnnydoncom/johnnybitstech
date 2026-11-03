import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { requireAdmin } from "@/lib/blog-agent/admin/auth";
import { getRunDetail } from "@/lib/blog-agent/admin/runs";
import { abandonRunAction, requeueKeywordAction } from "../../actions";
import { ConfirmButton } from "../../_components/ConfirmButton";
import { Button } from "@/components/ui/button";
import { AgentHeader, Card, Notice, StatusBadge, fmt, tableHead, td, th } from "../../_components/ui";

export const dynamic = "force-dynamic";

const STAGE_LABELS: Record<string, string> = {
  s1_keyword: "1 · Keyword intelligence", s2_cluster: "2 · Cluster placement", s3_brief: "3 · Brief", s4_research: "4 · Research",
  s5_outline: "5 · Outline", s6_draft: "6 · Draft", s8_links: "8 · Link picks", s8_applied: "8 · Links inserted (app)",
  s7_seo: "7 · SEO fields", s7_package: "7 · SEO package (app)", s9_qa: "9 · Editorial QA", s9_validation: "9 · Validation (app)",
  s10_index: "10 · Index (app)", s11_draft: "11 · Draft created (app)",
};

function pretty(value: unknown) {
  const text = JSON.stringify(value, (k, v) => (k === "embedding" && Array.isArray(v) ? `[${v.length} numbers]` : v), 2);
  return text.length > 60_000 ? `${text.slice(0, 60_000)}\n… (truncated)` : text;
}

export default async function RunDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const detail = await getRunDetail(getDb(), id);
  if (!detail) notFound();
  const { run, stages, calls } = detail;
  const error = run.error as { reason?: string; details?: string; recommendation?: string; message?: string } | null;
  const cannibalization = run.cannibalization as { verdict?: string; guidance?: string; matches?: { url: string | null; title: string; status: string; reason: string }[] } | null;

  return (
    <div>
      <AgentHeader title={run.keyword} description={`Run ${run.id}`} active="/admin/blog-agent/runs" />
      <Notice ok={sp.ok} error={sp.error} />

      <div className="grid gap-4 lg:grid-cols-3 mb-8">
        <Card>
          <div className="flex items-center gap-2"><StatusBadge status={run.status} /><span className="font-mono text-xs text-muted-foreground">{run.current_stage}</span></div>
          <dl className="mt-4 grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Started</dt><dd>{fmt(run.started_at)}</dd>
            <dt className="text-muted-foreground">Last activity</dt><dd>{fmt(run.heartbeat_at)}</dd>
            <dt className="text-muted-foreground">Finished</dt><dd>{fmt(run.finished_at)}</dd>
            <dt className="text-muted-foreground">Embedding cost</dt><dd>${Number(run.embedding_cost_usd).toFixed(4)}</dd>
            <dt className="text-muted-foreground">Keyword</dt><dd>{run.keyword_status ? <StatusBadge status={run.keyword_status} /> : "—"}</dd>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            {run.article_id && <Button asChild size="sm"><Link href={`/admin/blog-agent/drafts/${run.article_id}`}>Review draft</Link></Button>}
            {(run.status === "running" || run.status === "needs_human") && (
              <form action={abandonRunAction}><input type="hidden" name="id" value={run.id} /><ConfirmButton size="sm" variant="outline" message="Abandon this run?">Abandon run</ConfirmButton></form>
            )}
            {run.keyword_id && (run.keyword_status === "failed" || run.keyword_status === "skipped") && (
              <form action={requeueKeywordAction}>
                <input type="hidden" name="id" value={run.keyword_id} /><input type="hidden" name="back" value="run" /><input type="hidden" name="run_id" value={run.id} />
                <Button type="submit" size="sm" variant="outline">Re-queue keyword</Button>
              </form>
            )}
          </div>
        </Card>

        {error && (
          <Card className="lg:col-span-2 border-destructive/30">
            <h2 className="font-semibold text-destructive">Why it stopped</h2>
            <p className="mt-2 text-sm">{error.reason ?? error.message}</p>
            {error.recommendation && <p className="mt-2 text-sm"><span className="font-medium">Recommendation: </span>{error.recommendation}</p>}
            {error.details && <pre className="mt-3 max-h-60 overflow-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap">{error.details}</pre>}
          </Card>
        )}

        {cannibalization && (
          <Card className={error ? "lg:col-span-3" : "lg:col-span-2"}>
            <h2 className="font-semibold">Overlap check: <StatusBadge status={cannibalization.verdict ?? "unknown"} /></h2>
            <p className="mt-2 text-sm text-muted-foreground">{cannibalization.guidance}</p>
            {!!cannibalization.matches?.length && (
              <ul className="mt-3 space-y-1 text-sm">
                {cannibalization.matches.slice(0, 6).map((m, i) => (
                  <li key={i}>{m.url ? <Link href={m.url} className="text-primary hover:underline" target="_blank">{m.title}</Link> : m.title} <span className="text-muted-foreground">· {m.status} · {m.reason}</span></li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>

      <h2 className="font-semibold mb-3">Timeline ({stages.length} saved outputs)</h2>
      <ol className="space-y-2 mb-10">
        {stages.map((s) => (
          <li key={`${s.stage}-${s.version}`} className="rounded-xl border border-border bg-card">
            <details>
              <summary className="cursor-pointer list-none px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-medium">{STAGE_LABELS[s.stage] ?? s.stage}</span>
                <span className="text-xs text-muted-foreground">v{s.version}</span>
                <span className="text-xs text-muted-foreground">{fmt(s.created_at)}</span>
                {s.content_hash && <span className="font-mono text-xs text-muted-foreground">#{s.content_hash.slice(0, 8)}</span>}
              </summary>
              <pre className="border-t border-border max-h-[32rem] overflow-auto p-4 text-xs leading-relaxed">{pretty(s.output)}</pre>
            </details>
          </li>
        ))}
      </ol>

      <h2 className="font-semibold mb-3">Tool calls</h2>
      <div className="rounded-2xl border border-border bg-card overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead><tr className={tableHead}><th className={th}>Time</th><th className={th}>Tool</th><th className={th}>Result</th><th className={th}>Duration</th></tr></thead>
          <tbody>
            {calls.map((c, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className={`${td} whitespace-nowrap text-muted-foreground`}>{fmt(c.created_at)}</td>
                <td className={`${td} font-mono text-xs`}>{c.tool}</td>
                <td className={`${td} text-xs ${c.ok ? "text-green-700" : "text-destructive"}`}>{c.ok ? "ok" : c.error_code}</td>
                <td className={`${td} text-xs text-muted-foreground`}>{c.duration_ms} ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
