"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passSaved, setPassSaved] = useState(false);
  const [settings, setSettings] = useState({
    smtp_host: "",
    smtp_port: "",
    smtp_user: "",
    smtp_pass: "",
    smtp_from_email: "",
    smtp_from_name: "",
    smtp_to_email: "",
  });

  useEffect(() => {
    let active = true;
    fetch("/api/admin/settings")
      .then(async (res) => {
        if (!res.ok || !active) return;
        const data = await res.json();
        if (!active) return;
        setSettings({
          smtp_host: data.smtp_host || "",
          smtp_port: data.smtp_port || "",
          smtp_user: data.smtp_user || "",
          smtp_pass: "", // write-only: the server never sends it back
          smtp_from_email: data.smtp_from_email || "",
          smtp_from_name: data.smtp_from_name || "",
          smtp_to_email: data.smtp_to_email || "",
        });
        setPassSaved(Boolean(data.smtp_pass_set));
      })
      .catch(() => {
        if (active) toast.error("Failed to fetch settings");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        toast.success("Settings saved successfully");
        if (settings.smtp_pass) setPassSaved(true);
        setSettings((s) => ({ ...s, smtp_pass: "" }));
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to save settings");
      }
    } catch {
      toast.error("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage system configuration and integrations.</p>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-semibold">SMTP Settings (Email Notifications)</h2>
          <p className="text-sm text-muted-foreground">Configure your third-party SMTP provider (e.g. Brevo) for system emails.</p>
        </div>
        
        <div className="p-6">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">SMTP Host</label>
                <Input
                  name="smtp_host"
                  value={settings.smtp_host}
                  onChange={handleChange}
                  placeholder="smtp-relay.brevo.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">SMTP Port</label>
                <Input
                  name="smtp_port"
                  value={settings.smtp_port}
                  onChange={handleChange}
                  placeholder="587"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">SMTP Username (Login)</label>
                <Input
                  name="smtp_user"
                  value={settings.smtp_user}
                  onChange={handleChange}
                  placeholder="your-email@example.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">SMTP Password (Master Key)</label>
                <Input
                  name="smtp_pass"
                  type="password"
                  value={settings.smtp_pass}
                  onChange={handleChange}
                  autoComplete="new-password"
                  placeholder={passSaved ? "Saved — leave blank to keep it" : "••••••••••••"}
                />
              </div>
              <div className="space-y-2 md:col-span-2 border-t pt-4 mt-2">
                <h3 className="text-sm font-semibold mb-3">Sender & Receiver Defaults</h3>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">From Email</label>
                <Input
                  name="smtp_from_email"
                  type="email"
                  value={settings.smtp_from_email}
                  onChange={handleChange}
                  placeholder="noreply@johnnybits.com"
                />
                <p className="text-xs text-muted-foreground">The email address the notifications are sent FROM.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">From Name</label>
                <Input
                  name="smtp_from_name"
                  value={settings.smtp_from_name}
                  onChange={handleChange}
                  placeholder="Johnnybits System"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Admin Notification Email</label>
                <Input
                  name="smtp_to_email"
                  type="email"
                  value={settings.smtp_to_email}
                  onChange={handleChange}
                  placeholder="admin@johnnybits.com"
                />
                <p className="text-xs text-muted-foreground">The inbox where contact form submissions will be sent.</p>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Settings
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
