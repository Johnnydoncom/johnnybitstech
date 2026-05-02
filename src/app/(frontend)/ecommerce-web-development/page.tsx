import Link from "next/link";
import { ArrowRight, ArrowLeft, CheckCircle2, ShoppingBag, CreditCard, Package, Truck, ShoppingCart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { constructMetadata } from "@/lib/seo";
import { SEPARATOR, SITE_NAME } from "@/config/site";

export const metadata = constructMetadata({
  title: "Ecommerce Website Design and Development in Nigeria" + SEPARATOR + "E-commerce Solutions" + SEPARATOR + SITE_NAME,
  description: "End-to-end online stores on WooCommerce, Shopify and custom stacks — built for Nigerian payments, logistics and growth. Johnnybits is a leading eCommerce website development agency in Nigeria.",
  keywords: [
    "Ecommerce Website Design and Development in Nigeria",
    "Ecommerce Website Design and Development in Nigeria",
    "WooCommerce Web Development Company in Ibadan",
    "Shopify Website Design and Development in Nigeria",
    "Online Store Development in Nigeria",
    "Ecommerce Marketing in Ibadan",
    "Web Development in Ibadan",
    "Digital Marketing in Ibadan"
  ],
  canonicalUrl: "/ecommerce-web-development"
});

export default function EcommercePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            "name": "E-commerce Solutions",
            "provider": {
              "@type": "Organization",
              "name": "Johnnybits Technology"
            },
            "description": "End-to-end online stores on WooCommerce, Shopify and custom stacks — built for Nigerian payments, logistics and growth."
          })
        }}
      />
      {/* Hero — Storefront-inspired */}
      <section className="surface-dark relative overflow-hidden -mt-16 md:-mt-20 pt-32 pb-28">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute top-20 right-10 h-80 w-80 rounded-full bg-primary-glow/20 blur-3xl animate-blob" />

        <div className="container-tight relative">
          <Link href="/services" className="reveal inline-flex items-center gap-1.5 text-sm text-surface-dark-foreground/70 hover:text-primary-glow transition-smooth">
            <ArrowLeft className="h-4 w-4" /> All services
          </Link>
          <div className="reveal mt-6 inline-flex items-center gap-2 rounded-full border border-primary-glow/25 bg-primary-glow/5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary-glow backdrop-blur-sm" data-delay="80">
            <ShoppingBag className="h-3.5 w-3.5" /> E-commerce
          </div>
          <h1 className="reveal mt-5 font-display text-4xl md:text-6xl font-bold tracking-tight max-w-3xl" data-delay="120">E-commerce Solutions</h1>
          <p className="reveal mt-6 text-lg text-surface-dark-foreground/75 max-w-2xl" data-delay="200">
            Our team designs and builds end-to-end ecommerce systems on WooCommerce, Shopify and custom stacks — built for Nigerian payments, logistics and growth.
          </p>
          <div className="reveal mt-8 flex flex-wrap gap-3" data-delay="280">
            <Button asChild variant="hero" size="xl"><Link href="/contact">Get a free quote <ArrowRight className="ml-1 h-5 w-5" /></Link></Button>
            <Button asChild variant="outlineGlow" size="xl"><Link href="/pricing">View pricing</Link></Button>
          </div>
        </div>
      </section>

      {/* Platform badges */}
      <section className="border-b border-border bg-muted/40 py-10">
        <div className="container-tight">
          <p className="text-center text-xs uppercase tracking-[0.25em] text-muted-foreground mb-6">Platforms & integrations we work with</p>
          <div className="flex flex-wrap justify-center gap-4">
            {["WooCommerce & Shopify", "Paystack / Flutterwave", "Inventory & Logistics", "Conversion Optimization"].map((p) => (
              <span key={p} className="inline-flex items-center gap-2 rounded-full bg-card border border-border px-4 py-2 text-sm font-medium shadow-sm">
                <ShoppingCart className="h-4 w-4 text-primary" /> {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="py-24">
        <div className="container-tight grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <p className="reveal text-sm font-semibold uppercase tracking-[0.2em] text-primary">Built to sell</p>
            <h2 className="reveal mt-3 font-display text-3xl md:text-4xl font-bold tracking-tight" data-delay="80">
              Online stores that <span className="text-gradient">actually convert.</span>
            </h2>
            <p className="reveal mt-5 text-base md:text-lg text-muted-foreground leading-relaxed" data-delay="160">
              We help retailers and product-based businesses launch ecommerce systems that feel trustworthy, move customers smoothly through checkout and support growth over time. From product structure and merchandising to payment integration and CRO, our focus is building online stores that sell consistently on mobile and desktop.
            </p>
          </div>

          {/* Cart funnel visual */}
          <div className="reveal grid gap-3" data-delay="200">
            {[
              { icon: Package, label: "Product Discovery", pct: "100%" },
              { icon: ShoppingCart, label: "Add to Cart", pct: "68%" },
              { icon: CreditCard, label: "Checkout", pct: "42%" },
              { icon: Truck, label: "Order Delivered", pct: "39%" },
            ].map((step) => (
              <div key={step.label} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <step.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-sm font-medium">
                    <span>{step.label}</span>
                    <span className="text-primary font-bold">{step.pct}</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-brand" style={{ width: step.pct }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Deliverables */}
      <section className="bg-muted/40 py-24">
        <div className="container-tight">
          <div className="max-w-2xl mb-12">
            <p className="reveal text-sm font-semibold uppercase tracking-[0.2em] text-primary">What&apos;s included</p>
            <h2 className="reveal mt-3 font-display text-3xl md:text-4xl font-bold tracking-tight" data-delay="80">Everything to launch and grow your store.</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              "Online storefront design and product architecture",
              "Payment and delivery setup for Nigerian operations",
              "Conversion-focused cart and checkout journeys",
              "Analytics, coupon and remarketing foundations",
            ].map((item, i) => (
              <div key={item} className="reveal rounded-2xl border border-border bg-card p-6 shadow-card hover:-translate-y-1 hover:shadow-elevated transition-smooth" data-delay={`${i * 70}`}>
                <CheckCircle2 className="h-6 w-6 text-primary" />
                <p className="mt-3 text-sm leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-24">
        <div className="container-tight">
          <div className="max-w-2xl mb-12">
            <p className="reveal text-sm font-semibold uppercase tracking-wider text-primary">Our approach</p>
            <h2 className="reveal mt-3 font-display text-3xl md:text-5xl font-bold tracking-tight" data-delay="80">How we build ecommerce stores.</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {[
              { n: "01", t: "Store planning", d: "We map product categories, customer journeys, payment requirements and operational constraints before the build starts." },
              { n: "02", t: "Storefront design & setup", d: "We create a polished storefront, structure products clearly and integrate the tools needed to sell efficiently." },
              { n: "03", t: "Growth optimisation", d: "After launch we refine conversion points, tracking, merchandising and campaign-readiness so the store can scale." },
            ].map((step, i) => (
              <div key={step.n} className="reveal rounded-2xl border border-border bg-card p-7 shadow-card" data-delay={`${i * 90}`}>
                <div className="flex items-center justify-between"><div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-brand text-primary-foreground shadow-brand"><Sparkles className="h-5 w-5" /></div><div className="font-display text-4xl font-bold text-primary/30">{step.n}</div></div>
                <h3 className="mt-6 font-display text-2xl font-bold">{step.t}</h3>
                <p className="mt-3 text-muted-foreground leading-relaxed">{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ideal for + Outcomes */}
      <section className="bg-muted/40 py-24">
        <div className="container-tight grid gap-8 lg:grid-cols-2">
          <div className="reveal rounded-3xl border border-border bg-card p-8 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Ideal for</p>
            <h3 className="mt-2 font-display text-2xl font-bold">Who benefits most</h3>
            <ul className="mt-6 space-y-5">
              {["Retail brands moving sales online", "Existing stores that need better UX and checkout performance", "Multi-product businesses needing structure, inventory flow and marketing support"].map((item) => (
                <li key={item} className="flex gap-3"><div className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground"><CheckCircle2 className="h-4 w-4" /></div><p className="text-sm text-muted-foreground leading-relaxed">{item}</p></li>
              ))}
            </ul>
          </div>
          <div className="reveal surface-dark relative overflow-hidden rounded-3xl p-8 md:p-10 shadow-elevated">
            <div className="absolute inset-0 grid-bg opacity-20" />
            <div className="relative">
              <p className="text-xs uppercase tracking-[0.2em] text-primary-glow">Outcomes</p>
              <h3 className="mt-2 font-display text-2xl font-bold text-surface-dark-foreground">Results you can expect</h3>
              <div className="mt-6 space-y-4">
                {["Better checkout completion and lower friction", "Stronger product presentation and merchandising", "Store foundations ready for ads, SEO and repeat sales"].map((item, i) => (
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
            <h2 className="reveal mt-3 font-display text-3xl md:text-5xl font-bold tracking-tight" data-delay="80">Common questions about ecommerce.</h2>
          </div>
          <Accordion type="single" collapsible className="reveal rounded-2xl border border-border bg-card px-6 shadow-card" data-delay="120">
            {[
              { q: "Can you integrate Nigerian payment gateways?", a: "Yes. We can integrate popular local options and configure the checkout experience around your operations." },
              { q: "Do you help with product uploads and categories?", a: "Yes. We can support category structure, product presentation and merchandising recommendations." },
              { q: "Can you improve an existing ecommerce store?", a: "Yes. We can audit and redesign stores to improve usability, mobile checkout flow and conversion performance." },
            ].map((faq, index) => (
              <AccordionItem key={faq.q} value={`faq-${index}`}><AccordionTrigger className="text-left font-display text-lg">{faq.q}</AccordionTrigger><AccordionContent className="text-base leading-relaxed text-muted-foreground">{faq.a}</AccordionContent></AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="container-tight pb-24">
        <div className="surface-dark relative overflow-hidden rounded-3xl p-10 md:p-14 text-center">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <h2 className="relative font-display text-3xl md:text-4xl font-bold text-surface-dark-foreground">Ready to sell online?</h2>
          <p className="relative mt-4 text-surface-dark-foreground/75 max-w-xl mx-auto">Let&apos;s build a store that converts visitors into paying customers.</p>
          <Button asChild variant="hero" size="xl" className="relative mt-8"><Link href="/contact">Start your store <ArrowRight className="ml-1 h-5 w-5" /></Link></Button>
        </div>
      </section>
    </>
  );
}
