"use client";

import { useEffect, useState } from "react";
import { Globe, RefreshCw, ExternalLink, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATIC_PAGES = [
  { path: "/", label: "Homepage" },
  { path: "/about", label: "About" },
  { path: "/services", label: "Services" },
  { path: "/services/web-design", label: "Web Design" },
  { path: "/services/web-development", label: "Web Development" },
  { path: "/services/seo-digital-marketing", label: "SEO & Digital Marketing" },
  { path: "/services/ecommerce", label: "E-commerce" },
  { path: "/services/mobile-apps", label: "Mobile Apps" },
  { path: "/services/graphics-design", label: "Graphics Design" },
  { path: "/services/website-maintenance", label: "Website Maintenance" },
  { path: "/pricing", label: "Pricing" },
  { path: "/portfolio", label: "Portfolio" },
  { path: "/blog", label: "Blog" },
  { path: "/contact", label: "Contact" },
];

type Post = { slug: string; title: string; published: number; updated_at: string };

export default function SEOAdminPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://johnnybits.com";

  useEffect(() => {
    fetch("/api/admin/blog")
      .then(r => r.json())
      .then((data: Post[]) => setPosts(data.filter(p => p.published)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const allUrls = [
    ...STATIC_PAGES.map(p => ({ url: `${baseUrl}${p.path}`, label: p.label, type: "Page" })),
    ...posts.map(p => ({ url: `${baseUrl}/blog/${p.slug}`, label: p.title, type: "Blog" })),
  ];

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url>
    <loc>${u.url}</loc>
    <changefreq>${u.type === "Blog" ? "weekly" : "monthly"}</changefreq>
    <priority>${u.url === baseUrl + "/" ? "1.0" : u.type === "Blog" ? "0.7" : "0.8"}</priority>
  </url>`).join("\n")}
</urlset>`;

  const copyXml = async () => {
    await navigator.clipboard.writeText(sitemapXml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">SEO & Sitemap</h1>
        <p className="mt-1 text-muted-foreground">Auto-generated sitemap and SEO overview for your website.</p>
      </div>

      {/* Sitemap status */}
      <div className="rounded-2xl border border-border bg-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-primary" />
            <h2 className="font-display font-bold text-lg">Sitemap</h2>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1 h-3.5 w-3.5" /> View Live
              </a>
            </Button>
            <Button variant="outline" size="sm" onClick={copyXml}>
              {copied ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy XML"}
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Your sitemap is automatically generated from static pages and published blog posts.
          It is served at <code className="bg-muted px-1.5 py-0.5 rounded text-xs">/sitemap.xml</code> and updates whenever blog posts are published.
        </p>

        <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 p-3">
          <RefreshCw className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-700 font-medium">Auto-generated · {allUrls.length} URLs indexed</span>
        </div>
      </div>

      {/* URL listing */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-border bg-muted/50">
          <h3 className="text-sm font-medium text-muted-foreground">Indexed URLs ({allUrls.length})</h3>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">{[1,2,3].map(i => <div key={i} className="h-8 rounded bg-muted animate-pulse" />)}</div>
        ) : (
          <div className="divide-y divide-border">
            {allUrls.map(u => (
              <div key={u.url} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${u.type === "Blog" ? "bg-accent text-accent-foreground" : "bg-primary/10 text-primary"}`}>{u.type}</span>
                  <span className="text-sm font-medium truncate">{u.label}</span>
                </div>
                <span className="text-xs text-muted-foreground font-mono truncate ml-4 hidden sm:block">{u.url.replace(baseUrl, "")}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sitemap XML preview */}
      <div className="mt-6 rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/50 flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">XML Preview</h3>
        </div>
        <pre className="p-5 text-xs font-mono text-muted-foreground overflow-x-auto max-h-64 overflow-y-auto">
          {sitemapXml}
        </pre>
      </div>
    </div>
  );
}
