"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Save, X, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Client = { id: number; name: string; logo_url: string | null; website: string | null; display_order: number; active: number };

export default function ClientsAdminPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    fetch("/api/admin/clients").then(r => r.json()).then(setClients).catch(console.error).finally(() => setLoading(false));
  }, []);

  const createClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: fd.get("name"), logo_url: fd.get("logo_url"), website: fd.get("website"), display_order: clients.length }),
    });
    if (res.ok) {
      const { id } = await res.json();
      setClients(c => [...c, { id, name: fd.get("name") as string, logo_url: fd.get("logo_url") as string || null, website: fd.get("website") as string || null, display_order: clients.length, active: 1 }]);
      setShowNew(false);
    }
  };

  const updateClient = async (client: Client) => {
    await fetch(`/api/admin/clients/${client.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(client),
    });
    setEditingId(null);
  };

  const deleteClient = async (id: number) => {
    if (!confirm("Remove this client?")) return;
    await fetch(`/api/admin/clients/${id}`, { method: "DELETE" });
    setClients(c => c.filter(cl => cl.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Clients</h1>
          <p className="mt-1 text-muted-foreground">Manage client logos displayed on your website.</p>
        </div>
        <Button variant="default" onClick={() => setShowNew(true)} disabled={showNew}>
          <Plus className="mr-2 h-4 w-4" /> Add Client
        </Button>
      </div>

      {showNew && (
        <form onSubmit={createClient} className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-6">
          <h3 className="font-display font-bold text-lg mb-4">New Client</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><Label htmlFor="new-name">Name *</Label><Input id="new-name" name="name" required className="mt-1" /></div>
            <div><Label htmlFor="new-logo">Logo URL</Label><Input id="new-logo" name="logo_url" className="mt-1" placeholder="https://..." /></div>
            <div><Label htmlFor="new-website">Website</Label><Input id="new-website" name="website" className="mt-1" placeholder="https://..." /></div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button type="submit" size="sm"><Save className="mr-1 h-3.5 w-3.5" /> Save</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowNew(false)}><X className="mr-1 h-3.5 w-3.5" /> Cancel</Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : clients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-muted-foreground">No clients added yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map(client => (
            <div key={client.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              {editingId === client.id ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input value={client.name} onChange={e => setClients(c => c.map(cl => cl.id === client.id ? { ...cl, name: e.target.value } : cl))} />
                  <Input value={client.logo_url || ""} placeholder="Logo URL" onChange={e => setClients(c => c.map(cl => cl.id === client.id ? { ...cl, logo_url: e.target.value } : cl))} />
                  <div className="flex gap-2">
                    <Input value={client.website || ""} placeholder="Website" onChange={e => setClients(c => c.map(cl => cl.id === client.id ? { ...cl, website: e.target.value } : cl))} />
                    <Button size="sm" onClick={() => updateClient(client)}><Save className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {client.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={client.logo_url} alt={client.name} className="h-8 w-8 rounded object-contain bg-muted" />
                    ) : (
                      <div className="h-8 w-8 rounded bg-muted grid place-items-center text-xs font-bold text-muted-foreground">{client.name.charAt(0)}</div>
                    )}
                    <div>
                      <p className="font-medium text-sm">{client.name}</p>
                      {client.website && <p className="text-xs text-muted-foreground">{client.website}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditingId(client.id)} className="rounded-lg p-2 hover:bg-muted transition-colors"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => deleteClient(client.id)} className="rounded-lg p-2 hover:bg-destructive/10 text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
