import Link from "next/link";
import { Check, X } from "lucide-react";
import { getDb } from "@/db/client";
import { requireAdmin } from "@/lib/blog-agent/admin/auth";
import { listDrafts } from "@/lib/blog-agent/admin/runs";
import { AgentHeader, Notice, StatusBadge, fmt, tableHead, td, th } from "../_components/ui";

export const dynamic = "force-dynamic";

export default async function DraftsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const drafts = await listDrafts(getDb());
  return (
    <div>
      <AgentHeader title="Drafts" description="Articles written by the agent. Pending drafts are not public until you publish them." active="/admin/blog-agent/drafts" />
      <Notice ok={sp.ok} error={sp.error} />
      {drafts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">No agent drafts yet.</p>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead><tr className={tableHead}><th className={th}>Title</th><th className={th}>Status</th><th className={th}>Words</th><th className={th}>Image</th><th className={th}>Updated</th></tr></thead>
            <tbody>
              {drafts.map((d) => (
                <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className={td}>
                    <Link href={`/admin/blog-agent/drafts/${d.id}`} className="font-medium hover:underline">{d.title}</Link>
                    <div className="text-xs text-muted-foreground">/blog/{d.slug}</div>
                  </td>
                  <td className={td}><StatusBadge status={d.status} /></td>
                  <td className={td}>{d.word_count}</td>
                  <td className={td}>{d.featured_image ? <Check className="h-4 w-4 text-green-600" aria-label="Has image" /> : <X className="h-4 w-4 text-destructive" aria-label="No image" />}</td>
                  <td className={`${td} whitespace-nowrap text-muted-foreground`}>{fmt(d.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
