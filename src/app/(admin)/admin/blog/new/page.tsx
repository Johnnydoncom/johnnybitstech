"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/admin/RichTextEditor";

export default function NewBlogPostPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [content, setContent] = useState("");

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const data = {
      title: fd.get("title") as string,
      slug: fd.get("slug") as string,
      excerpt: fd.get("excerpt") as string,
      content: content,
      tag: fd.get("tag") as string,
      published: fd.get("published") === "on",
      featured_image: fd.get("featured_image") as string,
      meta_title: fd.get("meta_title") as string,
      meta_description: fd.get("meta_description") as string,
    };

    try {
      const res = await fetch("/api/admin/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        router.push("/admin/blog");
      } else {
        const err = await res.json();
        setError(err.error || "Failed to create post");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <Link href="/admin/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to posts
      </Link>

      <h1 className="font-display text-3xl font-bold tracking-tight mb-8">New Blog Post</h1>

      {error && <div className="mb-6 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <h2 className="font-display font-bold text-lg">Post Content</h2>

          <div>
            <Label htmlFor="title">Title *</Label>
            <Input id="title" name="title" required className="mt-1.5"
              onChange={(e) => {
                const slugInput = document.getElementById("slug") as HTMLInputElement;
                if (slugInput && !slugInput.dataset.manual) slugInput.value = generateSlug(e.target.value);
              }}
            />
          </div>

          <div>
            <Label htmlFor="slug">Slug *</Label>
            <Input id="slug" name="slug" required className="mt-1.5" placeholder="auto-generated-from-title"
              onChange={(e) => { e.currentTarget.dataset.manual = "true"; }}
            />
          </div>

          <div>
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea id="excerpt" name="excerpt" rows={3} className="mt-1.5" placeholder="Short summary for listings..." />
          </div>

          <div>
            <Label htmlFor="featured_image">Featured Image URL</Label>
            <Input id="featured_image" name="featured_image" className="mt-1.5" placeholder="/assets/blog/image.png" />
          </div>

          <div>
            <Label className="mb-2 block">Content (Rich Text)</Label>
            <RichTextEditor value={content} onChange={setContent} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="tag">Tag / Category</Label>
              <Input id="tag" name="tag" className="mt-1.5" placeholder="e.g. SEO, Web Design" />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="published" className="h-4 w-4 rounded border-border" />
                <span className="text-sm font-medium">Publish immediately</span>
              </label>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <h2 className="font-display font-bold text-lg">SEO Settings</h2>
          <div>
            <Label htmlFor="meta_title">Meta Title</Label>
            <Input id="meta_title" name="meta_title" className="mt-1.5" placeholder="Custom title for search engines..." />
          </div>
          <div>
            <Label htmlFor="meta_description">Meta Description</Label>
            <Textarea id="meta_description" name="meta_description" rows={2} className="mt-1.5" placeholder="Custom description for search engines..." />
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-20">
          <Button variant="outline" asChild><Link href="/admin/blog">Cancel</Link></Button>
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Create Post"}
          </Button>
        </div>
      </form>
    </div>
  );
}
