import Link from "next/link";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { constructMetadata } from "@/lib/seo";

export const metadata = constructMetadata({
  title: "Blog | Johnnybits Technology",
  description: "Practical articles from our designers, developers and marketers — tips, guides and ideas for growing online in Nigeria.",
});

import { query } from "@/lib/db";
import Image from "next/image";

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  created_at: Date;
  tag: string;
  featured_image: string | null;
}

export default async function BlogPage() {
  const posts = await query<BlogPost>("SELECT * FROM blog_posts WHERE published = true ORDER BY created_at DESC");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            "name": "Johnnybits Technology Blog",
            "description": "Practical articles from our designers, developers and marketers — tips, guides and ideas for growing online in Nigeria.",
            "url": "https://johnnybits.com/blog"
          })
        }}
      />

      <section className="surface-dark relative overflow-hidden -mt-16 md:-mt-20 pt-32 pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute top-0 right-1/3 h-80 w-80 rounded-full bg-primary-glow/20 blur-3xl animate-blob" />
        <div className="container-tight relative">
          <p className="reveal text-sm font-semibold uppercase tracking-[0.25em] text-primary-glow">Insights</p>
          <h1 className="reveal mt-4 font-display text-4xl md:text-6xl font-bold tracking-tight max-w-3xl" data-delay="80">
            Tech insights & strategies for <span className="text-gradient">growing your business.</span>
          </h1>
          <p className="reveal mt-6 text-lg text-surface-dark-foreground/75 max-w-2xl" data-delay="160">
            Explore our latest thoughts on AI, web development, and digital transformation in 2026.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="container-tight grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p, i) => {
            const wordCount = (p.content || '').split(/\\s+/).length;
            const readTime = Math.max(1, Math.ceil(wordCount / 200)) + " min";
            const dateStr = new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            
            // Fallback image if null
            const imageSrc = p.featured_image || "/assets/portfolio/Travels Insider.webp";

            return (
              <article
                key={p.slug}
                className="reveal group rounded-2xl bg-card border border-border/50 shadow-card hover:shadow-brand hover:-translate-y-1 transition-all duration-500 flex flex-col overflow-hidden"
                data-delay={`${(i % 3) * 80}`}
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-muted border-b border-border/50">
                  <Image
                    src={imageSrc}
                    alt={p.title}
                    width={600}
                    height={400}
                    className="absolute inset-0 h-full w-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-1.5 z-10">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gradient-brand text-white shadow-md border border-white/20">
                      {p.tag}
                    </span>
                  </div>
                </div>

                <div className="p-6 flex flex-col flex-1">
                  <h2 className="font-display text-xl font-bold leading-snug group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-primary-glow transition-all duration-300 line-clamp-3">
                    <Link href={`/blog/${p.slug}`} className="before:absolute before:inset-0">
                      {p.title}
                    </Link>
                  </h2>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed flex-1 line-clamp-3">{p.excerpt}</p>
                  <div className="mt-6 pt-5 border-t border-border/50 flex items-center justify-between text-xs font-medium text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {dateStr}</span>
                      <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {readTime}</span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="container-tight pb-24">
        <div className="surface-dark relative overflow-hidden rounded-3xl p-10 md:p-14 text-center">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <h2 className="relative font-display text-3xl md:text-4xl font-bold text-surface-dark-foreground">Want a free strategy session?</h2>
          <p className="relative mt-4 text-surface-dark-foreground/75">30 minutes. No fluff. Real recommendations for your business.</p>
          <Button asChild variant="hero" size="xl" className="relative mt-8">
            <Link href="/contact">Book a call <ArrowRight className="ml-1 h-5 w-5" /></Link>
          </Button>
        </div>
      </section>
    </>
  );
}
