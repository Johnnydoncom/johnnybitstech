"use client";

import { useState } from "react";
import { Save, Shield, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProfileAdminPage() {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    const fd = new FormData(e.currentTarget);
    const currentPassword = fd.get("current_password") as string;
    const newPassword = fd.get("new_password") as string;
    const confirmPassword = fd.get("confirm_password") as string;
    const newEmail = fd.get("email") as string;

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      setSaving(false);
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, newEmail }),
      });

      if (res.ok) {
        setMessage("Credentials updated successfully.");
        (e.target as HTMLFormElement).reset();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update password.");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Profile</h1>
        <p className="mt-1 text-muted-foreground">Manage your admin account settings.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="font-display font-bold text-lg">Account Security</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Your admin credentials are now securely stored in the database.
          You can change your login email and password using the form below.
        </p>
      </div>

      <form onSubmit={handlePasswordChange} className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Key className="h-5 w-5 text-primary" />
          <h2 className="font-display font-bold text-lg">Update Credentials</h2>
        </div>

        {message && <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-700">{message}</div>}
        {error && <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{error}</div>}

        <div className="space-y-4">
          <div>
            <Label htmlFor="email">New Email Address</Label>
            <Input id="email" name="email" type="email" required className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="current_password">Current Password</Label>
            <Input id="current_password" name="current_password" type="password" required className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="new_password">New Password</Label>
            <Input id="new_password" name="new_password" type="password" required minLength={8} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="confirm_password">Confirm New Password</Label>
            <Input id="confirm_password" name="confirm_password" type="password" required minLength={8} className="mt-1.5" />
          </div>
        </div>

        <Button type="submit" disabled={saving} className="mt-6">
          <Save className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Update Credentials"}
        </Button>
      </form>
    </div>
  );
}
