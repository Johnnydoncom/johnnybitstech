import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Clock, Tag } from "lucide-react";
import { query } from "@/lib/db";
import { SITE_NAME, SITE_URL } from "@/config/site";
import type { Metadata } from "next";

interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  created_at: Date;
  tag: string;
  featured_image: string | null;
  meta_title: string | null;
  meta_description: string | null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const posts = await query<BlogPost>("SELECT * FROM blog_posts WHERE slug = ? AND published = true", [slug]);

  if (!posts.length) return { title: "Post Not Found" };

  const post = posts[0];
  const title = post.meta_title || post.title;
  const description = post.meta_description || post.excerpt;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/blog/${post.slug}`,
      siteName: SITE_NAME,
      images: post.featured_image ? [{ url: post.featured_image, width: 1200, height: 630, alt: post.title }] : [],
      locale: "en_US",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: post.featured_image ? [post.featured_image] : [],
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const posts = await query<BlogPost>("SELECT * FROM blog_posts WHERE slug = ? AND published = true", [slug]);

  if (!posts.length) notFound();

  const post = posts[0];
  const wordCount = (post.content || "").split(/\s+/).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));
  const dateStr = new Date(post.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": post.title,
            "description": post.excerpt,
            "image": post.featured_image ? `${SITE_URL}${post.featured_image}` : undefined,
            "datePublished": new Date(post.created_at).toISOString(),
            "author": { "@type": "Organization", "name": SITE_NAME },
            "publisher": { "@type": "Organization", "name": SITE_NAME },
            "url": `${SITE_URL}/blog/${post.slug}`,
          }),
        }}
      />

      {/* Hero */}
      <section className="surface-dark relative overflow-hidden -mt-16 md:-mt-20 pt-32 pb-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute top-0 right-1/3 h-80 w-80 rounded-full bg-primary-glow/20 blur-3xl animate-blob" />
        <div className="container-tight relative max-w-4xl">
          <Link href="/blog" className="reveal inline-flex items-center gap-1.5 text-sm font-medium text-primary-glow hover:text-primary transition-colors mb-8">
            <ArrowLeft className="h-4 w-4" /> Back to Blog
          </Link>

          <div className="reveal flex flex-wrap items-center gap-3 mb-5" data-delay="60">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-gradient-brand text-white shadow-md border border-white/20">
              <Tag className="h-3 w-3" /> {post.tag}
            </span>
          </div>

          <h1 className="reveal font-display text-3xl md:text-5xl font-bold tracking-tight leading-tight" data-delay="120">
            {post.title}
          </h1>

          <div className="reveal flex items-center gap-5 mt-6 text-sm text-surface-dark-foreground/60" data-delay="180">
            <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {dateStr}</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> {readTime} min read</span>
          </div>
        </div>
      </section>



      {/* Content */}
      <article className="container-tight max-w-4xl pb-20 mt-10">
        <div
          className="blog-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Bottom CTA */}
        <div className="mt-16 pt-10 border-t border-border">
          <div className="surface-dark rounded-2xl p-8 md:p-10 text-center relative overflow-hidden">
            <div className="absolute inset-0 grid-bg opacity-30" />
            <h2 className="relative font-display text-2xl md:text-3xl font-bold text-surface-dark-foreground">
              Need help building your project?
            </h2>
            <p className="relative mt-3 text-surface-dark-foreground/70 max-w-lg mx-auto">
              We help Nigerian businesses ship world-class software. Let&apos;s talk about your idea.
            </p>
            <Link
              href="/contact"
              className="relative inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-full bg-gradient-brand text-white font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              Get in touch
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}
