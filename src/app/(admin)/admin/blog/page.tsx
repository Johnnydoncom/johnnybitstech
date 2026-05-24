"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

type Post = {
  id: number;
  title: string;
  slug: string;
  tag: string | null;
  published: number;
  created_at: string;
};

export default function BlogAdminPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/admin/blog");
      if (res.ok) setPosts(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, []);

  const deletePost = async (id: number) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
      setPosts((p) => p.filter((post) => post.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Blog Posts</h1>
          <p className="mt-1 text-muted-foreground">Create and manage your blog content.</p>
        </div>
        <Button asChild variant="default">
          <Link href="/admin/blog/new"><Plus className="mr-2 h-4 w-4" /> New Post</Link>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => (<div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />))}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">No blog posts yet.</p>
          <Button asChild variant="default" className="mt-4">
            <Link href="/admin/blog/new"><Plus className="mr-2 h-4 w-4" /> Create your first post</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Title</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Tag</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Status</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Date</th>
                <th className="px-5 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-4 font-medium">{post.title}</td>
                  <td className="px-5 py-4 hidden sm:table-cell">
                    {post.tag && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">{post.tag}</span>}
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${post.published ? "text-green-600" : "text-muted-foreground"}`}>
                      {post.published ? <><Eye className="h-3 w-3" /> Published</> : <><EyeOff className="h-3 w-3" /> Draft</>}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground hidden lg:table-cell">{new Date(post.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Link href={`/admin/blog/${post.id}/edit`} className="rounded-lg p-2 hover:bg-muted transition-colors" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button onClick={() => deletePost(post.id)} className="rounded-lg p-2 hover:bg-destructive/10 text-destructive transition-colors" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
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
