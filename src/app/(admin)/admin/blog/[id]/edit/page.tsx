"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function EditBlogPostPage() {
  const router = useRouter();
  const { id } = useParams();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [post, setPost] = useState<Record<string, string | number | null>>({});

  useEffect(() => {
    fetch(`/api/admin/blog/${id}`)
      .then((r) => r.json())
      .then((data) => { setPost(data); setLoading(false); })
      .catch(() => { setError("Failed to load post"); setLoading(false); });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const data = {
      title: fd.get("title"),
      slug: fd.get("slug"),
      excerpt: fd.get("excerpt"),
      content: fd.get("content"),
      tag: fd.get("tag"),
      published: fd.get("published") === "on",
      meta_title: fd.get("meta_title"),
      meta_description: fd.get("meta_description"),
    };

    try {
      const res = await fetch(`/api/admin/blog/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) router.push("/admin/blog");
      else { const err = await res.json(); setError(err.error || "Failed to update"); }
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />)}</div>;

  return (
    <div className="max-w-3xl">
      <Link href="/admin/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to posts
      </Link>
      <h1 className="font-display text-3xl font-bold tracking-tight mb-8">Edit Post</h1>
      {error && <div className="mb-6 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <h2 className="font-display font-bold text-lg">Post Content</h2>
          <div><Label htmlFor="title">Title *</Label><Input id="title" name="title" required className="mt-1.5" defaultValue={post.title as string ?? ""} /></div>
          <div><Label htmlFor="slug">Slug *</Label><Input id="slug" name="slug" required className="mt-1.5" defaultValue={post.slug as string ?? ""} /></div>
          <div><Label htmlFor="excerpt">Excerpt</Label><Textarea id="excerpt" name="excerpt" rows={3} className="mt-1.5" defaultValue={post.excerpt as string ?? ""} /></div>
          <div><Label htmlFor="content">Content</Label><Textarea id="content" name="content" rows={12} className="mt-1.5 font-mono text-sm" defaultValue={post.content as string ?? ""} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="tag">Tag</Label><Input id="tag" name="tag" className="mt-1.5" defaultValue={post.tag as string ?? ""} /></div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="published" className="h-4 w-4 rounded border-border" defaultChecked={!!post.published} />
                <span className="text-sm font-medium">Published</span>
              </label>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <h2 className="font-display font-bold text-lg">SEO Settings</h2>
          <div><Label htmlFor="meta_title">Meta Title</Label><Input id="meta_title" name="meta_title" className="mt-1.5" defaultValue={post.meta_title as string ?? ""} /></div>
          <div><Label htmlFor="meta_description">Meta Description</Label><Textarea id="meta_description" name="meta_description" rows={2} className="mt-1.5" defaultValue={post.meta_description as string ?? ""} /></div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" asChild><Link href="/admin/blog">Cancel</Link></Button>
          <Button type="submit" disabled={saving}><Save className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Update Post"}</Button>
        </div>
      </form>
    </div>
  );
}
