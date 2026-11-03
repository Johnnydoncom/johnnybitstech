import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Clock, Tag, User } from "lucide-react";
import type { Metadata } from "next";
import { getPublishedPost, listPublishedSlugs } from "@/lib/blog/queries";
import { contentShowsImage, renderArticleHtml } from "@/lib/blog/render";
import { articleJsonLd, postMetadata, serializeJsonLd } from "@/lib/blog/seo";

// ISR safety net; publishing and admin edits revalidate the post on demand (src/lib/blog/revalidate.ts).
export const revalidate = 3600;

export async function generateStaticParams() {
  const posts = await listPublishedSlugs();
  return posts.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return { title: "Post Not Found", robots: { index: false, follow: true } };
  return postMetadata(post);
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);

  if (!post) notFound();

  const readTime = post.readingMinutes;
  const dateStr = post.publishedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const html = renderArticleHtml(post.content, post.contentFormat);
  // Older posts embed their image in the content; show the featured image only where the content does not already.
  const showFeatured = Boolean(post.featuredImage) && !contentShowsImage(html, post.featuredImage!);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleJsonLd(post, { includeFaq: process.env.AGENT_FAQ_SCHEMA === "true" })) }}
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
              <Tag className="h-3 w-3" /> {post.category}
            </span>
          </div>

          <h1 className="reveal font-display text-3xl md:text-5xl font-bold tracking-tight leading-tight" data-delay="120">
            {post.title}
          </h1>

          <div className="reveal flex items-center gap-5 mt-6 text-sm text-surface-dark-foreground/60" data-delay="180">
            {post.author && (
              <span className="inline-flex items-center gap-1.5"><User className="h-4 w-4" /> {post.author.name}</span>
            )}
            <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" /> <time dateTime={post.publishedAt.toISOString()}>{dateStr}</time></span>
            <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> {readTime} min read</span>
          </div>
        </div>
      </section>



      {/* Content */}
      <article className="container-tight max-w-4xl pb-20 mt-10">
        {showFeatured && (
          <Image
            src={post.featuredImage!}
            alt={post.featuredImageAlt || post.title}
            width={1200}
            height={630}
            priority
            sizes="(max-width: 896px) 100vw, 896px"
            className="w-full max-h-[450px] rounded-2xl object-cover shadow-card mb-8"
          />
        )}
        <div
          className="blog-content"
          dangerouslySetInnerHTML={{ __html: html }}
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
              href="/contact-us"
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
