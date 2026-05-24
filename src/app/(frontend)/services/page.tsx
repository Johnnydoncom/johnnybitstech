import Link from "next/link";
import { ArrowRight, Layout, Code2, TrendingUp, ShoppingBag, Smartphone, PenTool, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { constructMetadata } from "@/lib/seo";
import { SEPARATOR, SITE_NAME } from "@/config/site";
import { SERVICES, OTHER_SPECIALTIES } from "@/lib/brand";

const SEO_TITLE = "Web Development, SEO, Mobile Apps & Ecommerce Services" + SEPARATOR + SITE_NAME;
const SEO_DESCRIPTION = "Web development, SEO, mobile apps, ecommerce, cloud solutions and website maintenance — everything your business needs to win online.";

export const metadata = constructMetadata({
  title: SEO_TITLE,
  description: SEO_DESCRIPTION,
  absoluteTitle: true,
  canonicalUrl: "/services",
  keywords: ["web development", "web design", "SEO", "mobile apps", "ecommerce", "cloud solutions", "SaaS development", "API development", "website maintenance", "Johnnybits", "Nigeria"],
});

const ICONS = { Layout, Code2, TrendingUp, ShoppingBag, Smartphone, PenTool, ShieldCheck };

export default function ServicesPage() {
  return (
    <>
      <section className="surface-dark relative overflow-hidden -mt-16 md:-mt-20 pt-32 pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute top-0 left-1/3 h-96 w-96 rounded-full bg-primary/30 blur-3xl animate-blob" />
        <div className="container-tight relative">
          <p className="reveal text-sm font-semibold uppercase tracking-[0.25em] text-primary-glow">Our services</p>
          <h1 className="reveal mt-4 font-display text-4xl md:text-6xl font-bold tracking-tight max-w-3xl" data-delay="80">
            Full-service digital solutions to <span className="text-gradient">grow your business.</span>
          </h1>
          <p className="reveal mt-6 text-lg text-surface-dark-foreground/75 max-w-2xl" data-delay="160">
            One expert team — web development, SEO, mobile apps, ecommerce, cloud solutions and beyond.
          </p>
        </div>
      </section>

      <section className="py-24">
        <div className="container-tight grid gap-5 md:grid-cols-2">
          {SERVICES.map((s, i) => {
            const Icon = ICONS[s.icon as keyof typeof ICONS] ?? Sparkles;
            return (
              <Link key={s.slug} href={`/${s.slug}`} className="reveal group relative overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-card hover:shadow-elevated hover:-translate-y-1 transition-smooth" data-delay={`${(i % 2) * 100}`}>
                <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-gradient-brand opacity-0 group-hover:opacity-20 blur-3xl transition-smooth" />
                <div className="relative flex gap-5">
                  <div className="grid place-items-center h-14 w-14 rounded-2xl bg-gradient-brand text-primary-foreground shadow-brand shrink-0">
                    <Icon className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="font-display text-2xl font-bold">{s.title}</h2>
                    <p className="mt-2 text-muted-foreground">{s.long}</p>
                    <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      {s.bullets.map((b) => (<li key={b} className="text-foreground/80">— {b}</li>))}
                    </ul>
                    <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                      Explore service <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* OTHER SPECIALTIES */}
      <section className="bg-muted/40 py-24">
        <div className="container-tight">
          <div className="max-w-2xl mb-12">
            <p className="reveal text-sm font-semibold uppercase tracking-wider text-primary">More capabilities</p>
            <h2 className="reveal mt-3 font-display text-3xl md:text-4xl font-bold tracking-tight" data-delay="80">
              We also specialise in
            </h2>
            <p className="reveal mt-4 text-muted-foreground" data-delay="160">
              Beyond our core services, we deliver specialised solutions across the modern software stack.
            </p>
          </div>

          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {OTHER_SPECIALTIES.map((cap, i) => (
              <div
                key={cap.title}
                className="reveal group relative rounded-2xl border border-border bg-card p-6 shadow-card hover:shadow-elevated hover:-translate-y-1 hover:border-primary/40 transition-smooth"
                data-delay={`${(i % 4) * 60}`}
              >
                <div className="inline-grid place-items-center h-11 w-11 rounded-xl bg-gradient-brand text-primary-foreground shadow-brand mb-4">
                  <cap.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-base font-bold leading-tight">{cap.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{cap.desc}</p>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/[0.03] to-primary-glow/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-tight pb-24 pt-8">
        <div className="surface-dark relative overflow-hidden rounded-3xl p-10 md:p-14 text-center">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <h2 className="relative font-display text-3xl md:text-4xl font-bold text-surface-dark-foreground">Need something custom?</h2>
          <p className="relative mt-4 text-surface-dark-foreground/75 max-w-xl mx-auto">Tell us your goal and we&apos;ll craft a solution. We love a challenge.</p>
          <Button asChild variant="hero" size="xl" className="relative mt-8">
            <Link href="/contact-us">Talk to a strategist <ArrowRight className="ml-1 h-5 w-5" /></Link>
          </Button>
        </div>
      </section>
    </>
  );
}
