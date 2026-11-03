import Link from "next/link";
import { getDb } from "@/db/client";
import { requireAdmin } from "@/lib/blog-agent/admin/auth";
import { overviewCounts } from "@/lib/blog-agent/admin/runs";
import { AgentHeader, Card } from "./_components/ui";

export const dynamic = "force-dynamic";

export default async function BlogAgentOverview() {
  await requireAdmin();
  const c = await overviewCounts(getDb());
  const tiles = [
    { label: "Drafts awaiting review", value: c.pending_review, href: "/admin/blog-agent/drafts", strong: c.pending_review > 0 },
    { label: "Runs needing a human", value: c.needs_human, href: "/admin/blog-agent/runs?status=needs_human", strong: c.needs_human > 0 },
    { label: "Runs in progress", value: c.running, href: "/admin/blog-agent/runs?status=running" },
    { label: "Keywords queued", value: c.queued, href: "/admin/blog-agent/queue" },
    { label: "Published by the agent", value: c.published_by_agent, href: "/admin/blog-agent/drafts" },
    { label: "Active connections", value: c.connections, href: "/admin/blog-agent/connections" },
  ];
  return (
    <div>
      <AgentHeader title="Blog Agent" description="Claude writes drafts in Cowork; you review and publish them here." active="/admin/blog-agent" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:border-primary/40 transition-colors">
            <div className={`font-display text-3xl font-bold ${t.strong ? "text-primary" : ""}`}>{t.value}</div>
            <div className="mt-1 text-sm text-muted-foreground">{t.label}</div>
          </Link>
        ))}
      </div>
      <Card className="mt-8">
        <h2 className="font-semibold">How it works</h2>
        <ol className="mt-3 list-decimal pl-5 space-y-1.5 text-sm text-muted-foreground">
          <li>Add keywords to the queue (or let the agent plan clusters).</li>
          <li>The scheduled Cowork task claims one keyword, researches, writes, links and validates it, then creates a draft.</li>
          <li>Review the draft: edit, add a featured image, check the warnings, then publish or reject. Nothing is published without you.</li>
        </ol>
      </Card>
    </div>
  );
}
