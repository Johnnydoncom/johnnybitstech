import Link from "next/link";
import { getDb } from "@/db/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireAdmin } from "@/lib/blog-agent/admin/auth";
import { listQueue } from "@/lib/blog-agent/admin/queue";
import { addKeywordsAction, deleteKeywordAction, requeueKeywordAction, setPriorityAction, skipKeywordAction } from "../actions";
import { ConfirmButton } from "../_components/ConfirmButton";
import { AgentHeader, Card, Notice, StatusBadge, fmt, tableHead, td, th } from "../_components/ui";

export const dynamic = "force-dynamic";
const FILTERS = ["all", "queued", "claimed", "failed", "skipped", "done"];

export default async function QueuePage({ searchParams }: { searchParams: Promise<{ status?: string; ok?: string; error?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const status = FILTERS.includes(sp.status ?? "") && sp.status !== "all" ? sp.status : undefined;
  const rows = await listQueue(getDb(), status);

  return (
    <div>
      <AgentHeader title="Keyword queue" description="The agent writes the highest-priority queued keyword next." active="/admin/blog-agent/queue" />
      <Notice ok={sp.ok} error={sp.error} />

      <Card className="mb-8">
        <form action={addKeywordsAction} className="grid gap-4 md:grid-cols-[1fr,auto]">
          <div>
            <Label htmlFor="keywords">Add keywords (one per line)</Label>
            <Textarea id="keywords" name="keywords" rows={4} required placeholder={"website design cost in lagos\necommerce website for small business nigeria"} className="mt-1.5" />
            <Input name="notes" placeholder="Notes for the agent (optional)" className="mt-2" maxLength={500} />
          </div>
          <div className="flex flex-col gap-3 md:w-40">
            <div>
              <Label htmlFor="priority">Priority (0–100)</Label>
              <Input id="priority" name="priority" type="number" min={0} max={100} defaultValue={50} className="mt-1.5" />
            </div>
            <Button type="submit">Add to queue</Button>
          </div>
        </form>
      </Card>

      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        {FILTERS.map((f) => (
          <Link key={f} href={f === "all" ? "/admin/blog-agent/queue" : `/admin/blog-agent/queue?status=${f}`}
            className={`rounded-full px-3 py-1 border ${(status ?? "all") === f ? "border-primary bg-primary/10" : "border-border"}`}>
            {f}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">No keywords here yet.</p>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead><tr className={tableHead}><th className={th}>Keyword</th><th className={th}>Status</th><th className={th}>Priority</th><th className={th}>Cluster</th><th className={th}>Added</th><th className={`${th} text-right`}>Actions</th></tr></thead>
            <tbody>
              {rows.map((k) => (
                <tr key={k.id} className="border-b border-border last:border-0">
                  <td className={td}>
                    <div className="font-medium">{k.keyword}</div>
                    <div className="text-xs text-muted-foreground">{k.source}{k.notes ? ` · ${k.notes.split("\n").pop()}` : ""}</div>
                  </td>
                  <td className={td}>
                    <StatusBadge status={k.status} />
                    {k.claimed_by_run && <Link href={`/admin/blog-agent/runs/${k.claimed_by_run}`} className="ml-2 text-xs text-primary hover:underline">run</Link>}
                  </td>
                  <td className={td}>
                    <form action={setPriorityAction} className="flex gap-1.5">
                      <input type="hidden" name="id" value={k.id} />
                      <Input name="priority" type="number" min={0} max={100} defaultValue={k.priority} className="h-8 w-20" aria-label={`Priority for ${k.keyword}`} />
                      <Button type="submit" size="sm" variant="ghost">Save</Button>
                    </form>
                  </td>
                  <td className={`${td} text-muted-foreground`}>{k.cluster ?? "—"}</td>
                  <td className={`${td} whitespace-nowrap text-muted-foreground`}>{fmt(k.created_at)}</td>
                  <td className={`${td} text-right`}>
                    <div className="inline-flex gap-1.5">
                      {k.status === "queued" && (
                        <form action={skipKeywordAction}><input type="hidden" name="id" value={k.id} /><Button type="submit" size="sm" variant="outline">Skip</Button></form>
                      )}
                      {(k.status === "failed" || k.status === "skipped") && (
                        <form action={requeueKeywordAction}><input type="hidden" name="id" value={k.id} /><Button type="submit" size="sm" variant="outline">Re-queue</Button></form>
                      )}
                      {["queued", "skipped", "failed"].includes(k.status) && (
                        <form action={deleteKeywordAction}><input type="hidden" name="id" value={k.id} /><ConfirmButton size="sm" variant="ghost" message={`Delete “${k.keyword}”?`}>Delete</ConfirmButton></form>
                      )}
                    </div>
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
