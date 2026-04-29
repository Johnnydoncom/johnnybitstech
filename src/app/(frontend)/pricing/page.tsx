import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { constructMetadata } from "@/lib/seo";

export const metadata = constructMetadata({
  title: "Pricing | Johnnybits Technology",
  description: "Simple, transparent pricing for web design, development, SEO and digital marketing. Pick a package and we'll tailor it to your goals.",
});

const TIERS = [
  {
    name: "Starter",
    price: "₦350,000",
    period: "starting",
    desc: "For small businesses launching their first professional website.",
    features: [
      "Up to 5 pages",
      "Mobile-responsive design",
      "On-page SEO setup",
      "Contact form & WhatsApp",
      "1 month free support",
    ],
    cta: "Start small",
    highlight: false,
  },
  {
    name: "Growth",
    price: "₦850,000",
    period: "starting",
    desc: "For growing brands who want to convert visitors and rank on Google.",
    features: [
      "Up to 12 custom pages",
      "Advanced SEO + Google Business",
      "Blog / CMS setup",
      "Speed & performance tuning",
      "Analytics & lead tracking",
      "3 months free support",
    ],
    cta: "Most popular",
    highlight: true,
  },
  {
    name: "Bespoke",
    price: "Custom",
    period: "quote",
    desc: "Ecommerce, web apps and large brand projects with custom scope.",
    features: [
      "Custom design system",
      "Ecommerce / web app build",
      "Paystack / Flutterwave",
      "Integrations & APIs",
      "Ongoing growth retainer",
      "Dedicated team",
    ],
    cta: "Get a quote",
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Pricing | Johnnybits Technology",
            "description": "Simple, transparent pricing for web design, development, SEO and digital marketing. Pick a package and we'll tailor it to your goals.",
            "url": "https://johnnybits.com/pricing"
          })
        }}
      />

      <section className="surface-dark relative overflow-hidden -mt-16 md:-mt-20 pt-32 pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute top-10 right-1/4 h-80 w-80 rounded-full bg-primary-glow/20 blur-3xl animate-blob" />
        <div className="container-tight relative text-center">
          <p className="reveal text-sm font-semibold uppercase tracking-[0.25em] text-primary-glow">Pricing</p>
          <h1 className="reveal mt-4 font-display text-4xl md:text-6xl font-bold tracking-tight" data-delay="80">
            Simple, transparent <span className="text-gradient">pricing.</span>
          </h1>
          <p className="reveal mt-6 text-lg text-surface-dark-foreground/75 max-w-2xl mx-auto" data-delay="160">
            Pick a starting package — we'll tailor it to your exact goals on the call.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="container-tight grid gap-6 md:grid-cols-3">
          {TIERS.map((t, i) => (
            <div
              key={t.name}
              className={`reveal relative rounded-3xl p-8 border shadow-card transition-smooth hover:-translate-y-2 ${
                t.highlight
                  ? "bg-gradient-brand text-primary-foreground border-transparent shadow-brand md:scale-105"
                  : "bg-card border-border"
              }`}
              data-delay={`${i * 80}`}
            >
              {t.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-surface-dark text-surface-dark-foreground text-xs px-3 py-1 font-semibold">
                  Most popular
                </div>
              )}
              <h3 className="font-display text-2xl font-bold">{t.name}</h3>
              <p className={`mt-1 text-sm ${t.highlight ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{t.desc}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold">{t.price}</span>
                <span className={`text-sm ${t.highlight ? "text-primary-foreground/80" : "text-muted-foreground"}`}>/ {t.period}</span>
              </div>
              <ul className="mt-6 space-y-3">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm">
                    <Check className="h-5 w-5 shrink-0" />
                    <span>{f}</span>
                  </li>
                 ))}
              </ul>
              <Button
                asChild
                variant={t.highlight ? "hero" : "default"}
                size="lg"
                className="mt-8 w-full"
              >
                <Link href="/contact">{t.cta} <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="container-tight pb-24">
        <p className="text-center text-muted-foreground">
          Not sure which is right? <Link href="/contact" className="text-primary font-semibold underline-offset-4 hover:underline">Talk to us</Link> — we'll recommend the best fit for free.
        </p>
      </section>
    </>
  );
}
