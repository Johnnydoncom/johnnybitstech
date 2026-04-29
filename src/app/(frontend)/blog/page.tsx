import Link from "next/link";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { constructMetadata } from "@/lib/seo";

export const metadata = constructMetadata({
  title: "Blog | Johnnybits Technology",
  description: "Practical articles from our designers, developers and marketers — tips, guides and ideas for growing online in Nigeria.",
});


const POSTS = [
  {
    slug: "seo-tips-nigerian-businesses-2025",
    title: "10 SEO Tips Every Nigerian Business Should Use in 2025",
    excerpt: "Get found on Google in Nigeria with these proven local SEO tactics — from Google Business Profile to schema markup.",
    date: "Apr 2025",
    read: "8 min",
    tag: "SEO",
  },
  {
    slug: "why-your-website-is-not-converting",
    title: "Why Your Website Isn't Converting (and How to Fix It)",
    excerpt: "Beautiful design isn't enough. Here are the 7 conversion killers we see most often on Nigerian business websites.",
    date: "Mar 2025",
    read: "6 min",
    tag: "Conversion",
  },
  {
    slug: "wordpress-vs-custom-website",
    title: "WordPress vs Custom Website: Which Should Your Business Choose?",
    excerpt: "We've built both — here's an honest breakdown of cost, speed, security and SEO for Nigerian businesses.",
    date: "Mar 2025",
    read: "10 min",
    tag: "Web Design",
  },
  {
    slug: "ecommerce-payments-nigeria",
    title: "The Best Payment Gateways for Ecommerce in Nigeria",
    excerpt: "Paystack, Flutterwave, Monnify and more — compared on fees, speed and developer experience.",
    date: "Feb 2025",
    read: "7 min",
    tag: "E-commerce",
  },
  {
    slug: "google-ads-vs-seo",
    title: "Google Ads vs SEO: Where Should You Spend in Nigeria?",
    excerpt: "Both have a place. Here's how to balance paid and organic for sustainable growth on a Nigerian budget.",
    date: "Feb 2025",
    read: "9 min",
    tag: "Marketing",
  },
  {
    slug: "website-speed-matters",
    title: "Why Website Speed Matters More on Nigerian Networks",
    excerpt: "A 1-second delay can cost you 7% of conversions. Practical tips to make your site lightning-fast on 3G/4G.",
    date: "Jan 2025",
    read: "5 min",
    tag: "Performance",
  },
];

export default function BlogPage() {
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
            Tips, guides & ideas for <span className="text-gradient">growing online.</span>
          </h1>
          <p className="reveal mt-6 text-lg text-surface-dark-foreground/75 max-w-2xl" data-delay="160">
            Practical articles from our designers, developers and marketers — written for Nigerian businesses.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="container-tight grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {POSTS.map((p, i) => (
            <article
              key={p.slug}
              className="reveal group rounded-2xl bg-card border border-border p-7 shadow-card hover:shadow-elevated hover:-translate-y-1 transition-smooth"
              data-delay={`${(i % 3) * 80}`}
            >
              <span className="inline-block text-xs uppercase tracking-wider px-2.5 py-1 rounded-full bg-accent text-accent-foreground font-semibold">{p.tag}</span>
              <h2 className="mt-4 font-display text-xl font-bold leading-snug group-hover:text-primary transition-smooth">
                {p.title}
              </h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{p.excerpt}</p>
              <div className="mt-5 pt-5 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {p.date}</span>
                <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {p.read}</span>
              </div>
            </article>
          ))}
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
