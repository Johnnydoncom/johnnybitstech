import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/blog-agent", label: "Overview" },
  { href: "/admin/blog-agent/queue", label: "Keyword queue" },
  { href: "/admin/blog-agent/runs", label: "Runs" },
  { href: "/admin/blog-agent/drafts", label: "Drafts" },
  { href: "/admin/blog-agent/connections", label: "Connections" },
];

export function AgentHeader({ title, description, active }: { title: string; description?: string; active: string }) {
  return (
    <div className="mb-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
      {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      <nav className="mt-6 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              active === t.href ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function Notice({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return (
    <div
      role={error ? "alert" : "status"}
      className={cn(
        "mb-6 flex gap-2 rounded-lg border p-3 text-sm",
        error ? "border-destructive/20 bg-destructive/10 text-destructive" : "border-green-600/20 bg-green-600/10 text-green-700",
      )}
    >
      {error ? <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> : <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />}
      <span>{error ?? ok}</span>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  queued: "bg-sky-500/10 text-sky-700",
  claimed: "bg-amber-500/10 text-amber-700",
  running: "bg-amber-500/10 text-amber-700",
  done: "bg-green-600/10 text-green-700",
  draft_created: "bg-green-600/10 text-green-700",
  published: "bg-green-600/10 text-green-700",
  pending_review: "bg-violet-500/10 text-violet-700",
  needs_human: "bg-destructive/10 text-destructive",
  failed: "bg-destructive/10 text-destructive",
  rejected: "bg-destructive/10 text-destructive",
  skipped: "bg-muted text-muted-foreground",
  abandoned: "bg-muted text-muted-foreground",
  draft: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", STATUS_STYLES[status] ?? "bg-muted text-muted-foreground")}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export const fmt = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }) : "—";

export function Card({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return <section id={id} className={cn("rounded-2xl border border-border bg-card p-6 shadow-sm scroll-mt-24", className)}>{children}</section>;
}

export const tableHead = "border-b border-border bg-muted/50 text-left text-muted-foreground";
export const th = "px-4 py-3 font-medium";
export const td = "px-4 py-3 align-top";
