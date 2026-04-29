import Link from "next/link";
import { ArrowRight, Layout, Code2, TrendingUp, ShoppingBag, Smartphone, PenTool, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { constructMetadata } from "@/lib/seo";

export const metadata = constructMetadata({
  title: "Our Services | Johnnybits Technology",
  description: "Web design, development, SEO, ecommerce, mobile apps, graphics design and website maintenance — everything your brand needs to win online.",
});

const SERVICES_LIST = [
  { slug: "web-design", title: "Corporate Web Design", long: "We craft responsive, SEO-ready websites with attractive graphics and engaging content — built to load fast, look gorgeous on every device, and rank in Nigeria.", bullets: ["Fluid Web Design", "Custom Web Design", "WordPress & Headless CMS", "Conversion-focused UX"], icon: "Layout" },
  { slug: "web-development", title: "Web Application Development", long: "Combining strong engineering with modern frameworks, we ship custom web applications tailored to your business — secure, scalable and easy to maintain.", bullets: ["Progressive Web Apps", "Laravel & Node.js", "VueJS & React", "REST & GraphQL APIs"], icon: "Code2" },
  { slug: "seo-digital-marketing", title: "SEO & Digital Marketing", long: "We grow your client base through technical SEO, content marketing, social media, paid ads and analytics — drastically increasing visibility, traffic and conversions.", bullets: ["Local SEO Nigeria", "Google Ads & Meta Ads", "Content & Backlinks", "Analytics & Reporting"], icon: "TrendingUp" },
  { slug: "ecommerce", title: "E-commerce Solutions", long: "Our team designs and builds end-to-end ecommerce systems on WooCommerce, Shopify and custom stacks — built for Nigerian payments, logistics and growth.", bullets: ["WooCommerce & Shopify", "Paystack / Flutterwave", "Inventory & Logistics", "Conversion Optimization"], icon: "ShoppingBag" },
  { slug: "mobile-apps", title: "Mobile App Development", long: "A leading mobile apps development team in Nigeria — we ship polished, fully-functional Android and iOS apps with React Native and Flutter.", bullets: ["React Native", "Flutter", "Native Android / iOS", "App Store Launch"], icon: "Smartphone" },
  { slug: "graphics-design", title: "Graphics Design", long: "Passionate graphic designers in Ibadan crafting brochures, banners, flyers, business cards and full brand identities that grab attention and build trust.", bullets: ["Logo & Brand Identity", "Social Media Creatives", "Print & Packaging", "Pitch Decks"], icon: "PenTool" },
  { slug: "website-maintenance", title: "Website Maintenance", long: "Our maintenance retainers cover updates, backups, security patches, performance and content edits — maximizing uptime and minimizing disruption.", bullets: ["Security & Backups", "Performance Tuning", "Content Updates", "24/7 Monitoring"], icon: "ShieldCheck" },
];

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
            Everything your brand needs to <span className="text-gradient">win online.</span>
          </h1>
          <p className="reveal mt-6 text-lg text-surface-dark-foreground/75 max-w-2xl" data-delay="160">
            One creative team, end-to-end services — design, development, ecommerce, SEO, marketing and beyond.
          </p>
        </div>
      </section>

      <section className="py-24">
        <div className="container-tight grid gap-5 md:grid-cols-2">
          {SERVICES_LIST.map((s, i) => {
            const Icon = ICONS[s.icon as keyof typeof ICONS] ?? Sparkles;
            return (
              <Link key={s.slug} href={`/services/${s.slug}`} className="reveal group relative overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-card hover:shadow-elevated hover:-translate-y-1 transition-smooth" data-delay={`${(i % 2) * 100}`}>
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

      <section className="container-tight pb-24">
        <div className="surface-dark relative overflow-hidden rounded-3xl p-10 md:p-14 text-center">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <h2 className="relative font-display text-3xl md:text-4xl font-bold text-surface-dark-foreground">Need something custom?</h2>
          <p className="relative mt-4 text-surface-dark-foreground/75 max-w-xl mx-auto">Tell us your goal and we&apos;ll craft a solution. We love a challenge.</p>
          <Button asChild variant="hero" size="xl" className="relative mt-8">
            <Link href="/contact">Talk to a strategist <ArrowRight className="ml-1 h-5 w-5" /></Link>
          </Button>
        </div>
      </section>
    </>
  );
}
