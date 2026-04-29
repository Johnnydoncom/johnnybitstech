"use client";

import { useEffect, useState } from "react";
import { Trash2, Download, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

type Subscriber = { id: number; email: string; name: string | null; subscribed_at: string; active: number };

export default function NewsletterAdminPage() {
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/newsletter").then(r => r.json()).then(setSubs).catch(console.error).finally(() => setLoading(false));
  }, []);

  const deleteSub = async (id: number) => {
    if (!confirm("Remove this subscriber?")) return;
    await fetch(`/api/admin/newsletter?id=${id}`, { method: "DELETE" });
    setSubs(s => s.filter(sub => sub.id !== id));
  };

  const exportCSV = () => {
    const csv = ["Email,Name,Subscribed At,Active", ...subs.map(s => `${s.email},${s.name || ""},${s.subscribed_at},${s.active ? "Yes" : "No"}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "newsletter-subscribers.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Newsletter</h1>
          <p className="mt-1 text-muted-foreground">{subs.length} subscriber{subs.length !== 1 ? "s" : ""} total.</p>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={subs.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : subs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <Mail className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-muted-foreground">No subscribers yet.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Name</th>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Date</th>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Status</th>
              <th className="px-5 py-3 text-right font-medium text-muted-foreground">Action</th>
            </tr></thead>
            <tbody>
              {subs.map(s => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-4 font-medium">{s.email}</td>
                  <td className="px-5 py-4 text-muted-foreground hidden sm:table-cell">{s.name || "—"}</td>
                  <td className="px-5 py-4 text-muted-foreground hidden md:table-cell">{new Date(s.subscribed_at).toLocaleDateString()}</td>
                  <td className="px-5 py-4 hidden md:table-cell"><span className={`text-xs font-medium ${s.active ? "text-green-600" : "text-muted-foreground"}`}>{s.active ? "Active" : "Inactive"}</span></td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => deleteSub(s.id)} className="rounded-lg p-2 hover:bg-destructive/10 text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
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
