import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  Search,
  Target,
  Megaphone,
  LineChart,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { constructMetadata } from "@/lib/seo";

export const metadata = constructMetadata({
  title: "SEO & Digital Marketing | Johnnybits Technology",
  description: "Get found on Google in Nigeria. Local SEO, Google Ads, Meta Ads, content marketing, analytics & reporting — we grow your traffic and conversions.",
});

export default function SEODigitalMarketingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            "name": "SEO & Digital Marketing",
            "provider": {
              "@type": "Organization",
              "name": "Johnnybits Technology"
            },
            "description": "Get found on Google in Nigeria. Local SEO, Google Ads, Meta Ads, content marketing, analytics & reporting — we grow your traffic and conversions."
          })
        }}
      />
      {/* Hero — Data dashboard style with metric cards */}
      <section className="surface-dark relative overflow-hidden -mt-16 md:-mt-20 pt-32 pb-28">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute -top-16 left-1/3 h-96 w-96 rounded-full bg-primary/25 blur-3xl animate-blob" />

        <div className="container-tight relative">
          <Link
            href="/services"
            className="reveal inline-flex items-center gap-1.5 text-sm text-surface-dark-foreground/70 hover:text-primary-glow transition-smooth"
          >
            <ArrowLeft className="h-4 w-4" /> All services
          </Link>

          <div className="reveal mt-6 inline-flex items-center gap-2 rounded-full border border-primary-glow/25 bg-primary-glow/5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary-glow backdrop-blur-sm" data-delay="80">
            <TrendingUp className="h-3.5 w-3.5" />
            Marketing
          </div>

          <h1 className="reveal mt-5 font-display text-4xl md:text-6xl font-bold tracking-tight max-w-3xl" data-delay="120">
            SEO &amp; Digital Marketing
          </h1>
          <p className="reveal mt-6 text-lg text-surface-dark-foreground/75 max-w-2xl" data-delay="200">
            We grow your client base through technical SEO, content marketing, social media, paid ads and analytics — drastically increasing visibility, traffic and conversions.
          </p>

          {/* Metric cards row */}
          <div className="reveal mt-10 grid grid-cols-2 md:grid-cols-4 gap-4" data-delay="280">
            {[
              { value: "+312%", label: "Avg traffic growth" },
              { value: "Page 1", label: "Google rankings" },
              { value: "3.2x", label: "Lead increase" },
              { value: "45%", label: "Lower cost-per-lead" },
            ].map((m) => (
              <div key={m.label} className="rounded-xl border border-primary-glow/15 bg-background/5 p-4 backdrop-blur-sm text-center">
                <div className="font-display text-2xl md:text-3xl font-bold text-primary-glow">{m.value}</div>
                <p className="mt-1 text-xs text-surface-dark-foreground/60">{m.label}</p>
              </div>
            ))}
          </div>

          <div className="reveal mt-8 flex flex-wrap gap-3" data-delay="340">
            <Button asChild variant="hero" size="xl">
              <Link href="/contact">Get a free audit <ArrowRight className="ml-1 h-5 w-5" /></Link>
            </Button>
            <Button asChild variant="outlineGlow" size="xl">
              <Link href="/pricing">View pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="py-24">
        <div className="container-tight max-w-3xl">
          <p className="reveal text-sm font-semibold uppercase tracking-[0.2em] text-primary">Why us</p>
          <h2 className="reveal mt-3 font-display text-3xl md:text-4xl font-bold tracking-tight" data-delay="80">
            Marketing that delivers <span className="text-gradient">measurable growth</span>, not vanity metrics.
          </h2>
          <p className="reveal mt-6 text-lg text-muted-foreground leading-relaxed" data-delay="160">
            Our digital marketing service is designed for businesses that want measurable growth, not vanity metrics. We combine SEO, content, paid media and conversion tracking to help Johnnybits clients dominate relevant searches, attract qualified prospects and turn traffic into revenue. We tailor campaigns to Nigerian markets, search intent and local competition.
          </p>
        </div>
      </section>

      {/* Services grid — what's included */}
      <section className="bg-muted/40 py-24">
        <div className="container-tight">
          <div className="max-w-2xl mb-12">
            <p className="reveal text-sm font-semibold uppercase tracking-[0.2em] text-primary">What we cover</p>
            <h2 className="reveal mt-3 font-display text-3xl md:text-4xl font-bold tracking-tight" data-delay="80">
              End-to-end digital marketing services.
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {[
              { icon: Search, title: "Local SEO Nigeria", desc: "Keyword research, technical fixes, on-page and off-page optimisation targeting Nigerian search queries." },
              { icon: Megaphone, title: "Google Ads & Meta Ads", desc: "Campaign setup, targeting, ad creative and ongoing refinement for maximum return on ad spend." },
              { icon: BarChart3, title: "Content & Backlinks", desc: "Content planning, blog strategy, landing page copy and authoritative backlink acquisition." },
              { icon: LineChart, title: "Analytics & Reporting", desc: "Tracking setup, monthly reporting with actionable insights and campaign performance reviews." },
            ].map((item, i) => (
              <div key={item.title} className="reveal group rounded-2xl border border-border bg-card p-7 shadow-card hover:-translate-y-1 hover:shadow-elevated transition-smooth" data-delay={`${i * 80}`}>
                <div className="flex gap-5">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-brand">
                    <item.icon className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold">{item.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process — Three columns */}
      <section className="py-24">
        <div className="container-tight">
          <div className="max-w-2xl mb-12">
            <p className="reveal text-sm font-semibold uppercase tracking-wider text-primary">Our approach</p>
            <h2 className="reveal mt-3 font-display text-3xl md:text-5xl font-bold tracking-tight" data-delay="80">
              How we drive digital growth.
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {[
              { n: "01", t: "Audit & opportunity mapping", d: "We review your website, keyword landscape, visibility gaps and competitors to find the fastest growth opportunities." },
              { n: "02", t: "Campaign execution", d: "We optimise pages, publish targeted content and run acquisition campaigns designed around search intent and conversion quality." },
              { n: "03", t: "Measure & improve", d: "We track performance, refine targeting and improve landing pages so the channel mix keeps getting stronger." },
            ].map((step, i) => (
              <div key={step.n} className="reveal rounded-2xl border border-border bg-card p-7 shadow-card" data-delay={`${i * 90}`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-brand text-primary-foreground shadow-brand">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="font-display text-4xl font-bold text-primary/30">{step.n}</div>
                </div>
                <h3 className="mt-6 font-display text-2xl font-bold">{step.t}</h3>
                <p className="mt-3 text-muted-foreground leading-relaxed">{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ideal for + Outcomes */}
      <section className="bg-muted/40 py-24">
        <div className="container-tight grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-2 reveal rounded-3xl border border-border bg-card p-8 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Ideal for</p>
            <h3 className="mt-2 font-display text-xl font-bold">Who benefits most</h3>
            <ul className="mt-5 space-y-4">
              {[
                "Businesses that want more visibility on Google in Nigeria",
                "Brands ready to turn ad spend into qualified leads",
                "Companies needing a clearer content and analytics strategy",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
            <Button asChild variant="hero" size="lg" className="mt-8 w-full">
              <Link href="/contact">Start your campaign <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>

          <div className="lg:col-span-3 reveal surface-dark relative overflow-hidden rounded-3xl p-8 md:p-10 shadow-elevated">
            <div className="absolute inset-0 grid-bg opacity-20" />
            <div className="absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-primary-glow/20 blur-3xl" />
            <div className="relative">
              <p className="text-xs uppercase tracking-[0.2em] text-primary-glow">Outcomes</p>
              <h3 className="mt-2 font-display text-2xl font-bold text-surface-dark-foreground">Results you can expect</h3>
              <div className="mt-6 space-y-4">
                {[
                  "Higher rankings for local and industry keywords",
                  "More qualified leads from organic and paid channels",
                  "Clearer attribution through tracking, reporting and campaign refinement",
                ].map((item, i) => (
                  <div key={item} className="flex gap-4 rounded-2xl border border-primary-glow/10 bg-background/5 p-4 backdrop-blur-sm">
                    <div className="font-display text-2xl font-bold text-primary-glow shrink-0 w-10">0{i + 1}</div>
                    <p className="text-sm leading-relaxed text-surface-dark-foreground/85 self-center">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24">
        <div className="container-tight grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="reveal text-sm font-semibold uppercase tracking-wider text-primary">FAQ</p>
            <h2 className="reveal mt-3 font-display text-3xl md:text-5xl font-bold tracking-tight" data-delay="80">
              Common questions about SEO & marketing.
            </h2>
          </div>

          <Accordion type="single" collapsible className="reveal rounded-2xl border border-border bg-card px-6 shadow-card" data-delay="120">
            {[
              { q: "How long does SEO take to show results?", a: "SEO is a medium-term growth channel. Many businesses begin seeing traction within a few months, with stronger gains building over time." },
              { q: "Do you manage paid advertising too?", a: "Yes. We run Google Ads and Meta Ads campaigns and align them with your landing pages for better conversion performance." },
              { q: "Is this service useful for businesses outside Ibadan?", a: "Yes. We support brands across Nigeria and can also target regional or international audiences where needed." },
            ].map((faq, index) => (
              <AccordionItem key={faq.q} value={`faq-${index}`}>
                <AccordionTrigger className="text-left font-display text-lg">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-base leading-relaxed text-muted-foreground">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="container-tight pb-24">
        <div className="surface-dark relative overflow-hidden rounded-3xl p-10 md:p-14 text-center">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <Target className="relative mx-auto h-12 w-12 text-primary-glow" />
          <h2 className="relative mt-5 font-display text-3xl md:text-4xl font-bold text-surface-dark-foreground">
            Ready to dominate Google in Nigeria?
          </h2>
          <p className="relative mt-4 text-surface-dark-foreground/75 max-w-xl mx-auto">
            Book a free SEO audit — we&apos;ll show you exactly where you can grow.
          </p>
          <Button asChild variant="hero" size="xl" className="relative mt-8">
            <Link href="/contact">Get your free audit <ArrowRight className="ml-1 h-5 w-5" /></Link>
          </Button>
        </div>
      </section>
    </>
  );
}
