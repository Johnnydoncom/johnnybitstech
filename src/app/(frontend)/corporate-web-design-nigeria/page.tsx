import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Layout,
  Monitor,
  Smartphone,
  Palette,
  Search,
  Target,
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
import { SITE_NAME, SEPARATOR } from "@/config/site";

export const metadata = constructMetadata({
  title: "Web Design Company in Ibadan" + SEPARATOR + "Web Designers in Ibadan" + SEPARATOR + SITE_NAME,
  description: "Web designers in Ibadan - Nigeria's leading web design company in Ibadan is here to help grow your business. Custom web design, WordPress & headless CMS — built to load fast and rank in Nigeria.",
  keywords: [
    "Web Design Company in Ibadan",
    "Web Designers in Ibadan",
    "Corporate Web Design in Ibadan",
    "Professional Web Design in Ibadan",
    "Best Web Design Company in Nigeria",
    "Website Design in Nigeria",
    "Web Development in Ibadan",
    "Digital Marketing in Ibadan",

  ],
  canonicalUrl: "/corporate-web-design-nigeria",
});

export default function WebDesignPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            "name": "Corporate Web Design",
            "provider": {
              "@type": "Organization",
              "name": "Johnnybits Technology"
            },
            "description": "Fluid, mobile-first websites that convert visitors into customers. Custom web design, WordPress & headless CMS — built to load fast and rank in Nigeria."
          })
        }}
      />
      {/* Hero — Split screen layout */}
      <section className="surface-dark relative overflow-hidden -mt-16 md:-mt-20 pt-32 pb-28">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute -top-20 left-1/4 h-[28rem] w-[28rem] rounded-full bg-primary/25 blur-3xl animate-blob" />
        <div
          className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-primary-glow/20 blur-3xl animate-blob"
          style={{ animationDelay: "5s" }}
        />

        <div className="container-tight relative grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left — Text */}
          <div>
            <Link
              href="/services"
              className="reveal inline-flex items-center gap-1.5 text-sm text-surface-dark-foreground/70 hover:text-primary-glow transition-smooth"
            >
              <ArrowLeft className="h-4 w-4" /> All services
            </Link>

            <div
              className="reveal mt-6 inline-flex items-center gap-2 rounded-full border border-primary-glow/25 bg-primary-glow/5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary-glow backdrop-blur-sm"
              data-delay="80"
            >
              <Layout className="h-3.5 w-3.5" />
              Web Design
            </div>

            <h1
              className="reveal mt-5 font-display text-4xl md:text-6xl font-bold tracking-tight"
              data-delay="120"
            >
              Corporate Web Design
            </h1>
            <p
              className="reveal mt-6 text-lg text-surface-dark-foreground/75 max-w-xl"
              data-delay="200"
            >
              We craft responsive, SEO-ready websites with attractive graphics
              and engaging content — built to load fast, look gorgeous on every
              device, and rank in Nigeria.
            </p>
            <div className="reveal mt-8 flex flex-wrap gap-3" data-delay="280">
              <Button asChild variant="hero" size="xl">
                <Link href="/contact">
                  Get a free quote{" "}
                  <ArrowRight className="ml-1 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outlineGlow" size="xl">
                <Link href="/pricing">View pricing</Link>
              </Button>
            </div>
          </div>

          {/* Right — Feature cards stacked */}
          <div className="reveal grid gap-4 sm:grid-cols-2" data-delay="300">
            {[
              {
                icon: Monitor,
                title: "Fluid Web Design",
                desc: "Every page adapts beautifully from desktop to mobile.",
              },
              {
                icon: Palette,
                title: "Custom Web Design",
                desc: "Unique visual identity aligned with your brand.",
              },
              {
                icon: Search,
                title: "WordPress & Headless CMS",
                desc: "Flexible content management for easy updates.",
              },
              {
                icon: Target,
                title: "Conversion-focused UX",
                desc: "Designed to turn visitors into leads and customers.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-primary-glow/15 bg-background/5 p-5 backdrop-blur-sm"
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-glow/10 text-primary-glow">
                  <card.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-display font-semibold text-surface-dark-foreground">
                  {card.title}
                </h3>
                <p className="mt-1 text-sm text-surface-dark-foreground/70">
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About — Full-width intro */}
      <section className="py-24">
        <div className="container-tight">
          <div className="max-w-3xl mx-auto text-center">
            <p className="reveal text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              What we deliver
            </p>
            <h2
              className="reveal mt-3 font-display text-3xl md:text-5xl font-bold tracking-tight"
              data-delay="80"
            >
              More than a pretty homepage —{" "}
              <span className="text-gradient">a growth engine.</span>
            </h2>
            <p
              className="reveal mt-6 text-lg text-muted-foreground leading-relaxed"
              data-delay="160"
            >
              Our corporate web design service is built for brands that want more
              than a pretty homepage. We create conversion-focused websites that
              communicate trust quickly, explain your offer clearly, and guide
              visitors toward enquiry, purchase or booking. Every Johnnybits
              website is tuned for Nigerian search behaviour, mobile users and the
              realities of slower network conditions.
            </p>
          </div>
        </div>
      </section>

      {/* Deliverables — Alternating rows */}
      <section className="bg-muted/40 py-24">
        <div className="container-tight space-y-16">
          <div className="max-w-2xl">
            <p className="reveal text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              What&apos;s included
            </p>
            <h2
              className="reveal mt-3 font-display text-3xl md:text-4xl font-bold tracking-tight"
              data-delay="80"
            >
              Everything in our web design service.
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {[
              "Custom UI direction based on your brand",
              "Homepage and inner page UX copy structure",
              "Responsive development and basic technical SEO setup",
              "Lead capture flows, analytics and CTA placement",
            ].map((item, i) => (
              <div
                key={item}
                className="reveal flex gap-4 rounded-2xl border border-border bg-card p-6 shadow-card"
                data-delay={`${i * 70}`}
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <p className="text-base leading-relaxed self-center">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ideal for + Outcomes — Side by side */}
      <section className="py-24">
        <div className="container-tight grid gap-8 lg:grid-cols-2">
          {/* Ideal for */}
          <div className="reveal rounded-3xl border border-border bg-card p-8 md:p-10 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Ideal for
            </p>
            <h3 className="mt-2 font-display text-2xl font-bold tracking-tight">
              Who this works best for
            </h3>
            <ul className="mt-6 space-y-5">
              {[
                "Professional service firms that need more qualified enquiries",
                "SMEs rebranding from outdated WordPress websites",
                "Startups that need a polished launch-ready web presence",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <div className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <p className="text-sm md:text-[15px] leading-relaxed text-muted-foreground">
                    {item}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* Outcomes */}
          <div className="reveal surface-dark relative overflow-hidden rounded-3xl p-8 md:p-10 shadow-elevated">
            <div className="absolute inset-0 grid-bg opacity-20" />
            <div className="absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-primary-glow/20 blur-3xl" />
            <div className="relative">
              <p className="text-xs uppercase tracking-[0.2em] text-primary-glow">
                Outcomes
              </p>
              <h3 className="mt-2 font-display text-2xl font-bold text-surface-dark-foreground">
                Results you can expect
              </h3>
              <div className="mt-6 space-y-4">
                {[
                  "Clearer positioning and stronger first impressions",
                  "Higher conversion rates from organic and paid traffic",
                  "Fast-loading responsive pages that support SEO growth",
                ].map((item, i) => (
                  <div
                    key={item}
                    className="flex gap-4 rounded-2xl border border-primary-glow/10 bg-background/5 p-4 backdrop-blur-sm"
                  >
                    <div className="font-display text-2xl font-bold text-primary-glow shrink-0 w-10">
                      0{i + 1}
                    </div>
                    <p className="text-sm leading-relaxed text-surface-dark-foreground/85 self-center">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process — Horizontal timeline */}
      <section className="bg-muted/40 py-24">
        <div className="container-tight">
          <div className="max-w-2xl">
            <p className="reveal text-sm font-semibold uppercase tracking-wider text-primary">
              Our approach
            </p>
            <h2
              className="reveal mt-3 font-display text-3xl md:text-5xl font-bold tracking-tight"
              data-delay="80"
            >
              How we deliver web design projects.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {[
              {
                n: "01",
                t: "Discovery & positioning",
                d: "We audit your current site, review competitors in Nigeria and clarify the user journey that will drive leads or sales.",
              },
              {
                n: "02",
                t: "Wireframes & visual direction",
                d: "We map key pages, messaging hierarchy and interface patterns before turning them into high-impact visual designs.",
              },
              {
                n: "03",
                t: "Build & optimisation",
                d: "The approved design is developed into a fast, responsive website with SEO essentials, performance tuning and testing.",
              },
            ].map((step, index) => (
              <div
                key={step.n}
                className="reveal rounded-2xl border border-border bg-card p-7 shadow-card"
                data-delay={`${index * 90}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-brand text-primary-foreground shadow-brand">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="font-display text-4xl font-bold text-primary/30">
                    {step.n}
                  </div>
                </div>
                <h3 className="mt-6 font-display text-2xl font-bold">
                  {step.t}
                </h3>
                <p className="mt-3 text-muted-foreground leading-relaxed">
                  {step.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Johnnybits — Stats + trust */}
      <section className="py-24">
        <div className="container-tight grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div>
            <p className="reveal text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              Why Johnnybits
            </p>
            <h2
              className="reveal mt-3 font-display text-3xl md:text-4xl font-bold tracking-tight"
              data-delay="60"
            >
              A partner built for Nigerian growth.
            </h2>
            <p
              className="reveal mt-5 text-base md:text-lg text-muted-foreground leading-relaxed"
              data-delay="120"
            >
              Senior designers and developers collaborate from day one — no
              juniors hidden behind email threads, no handoff gaps. Fast on
              patchy networks, optimised for local search, and friendly to
              Paystack, Flutterwave and local logistics partners. Every page is
              structured for SEO, accessibility and conversion.
            </p>
            <Button asChild variant="hero" size="lg" className="reveal mt-8">
              <Link href="/contact">
                Start your project <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="reveal grid grid-cols-3 gap-px rounded-2xl overflow-hidden border border-border shadow-card">
            {[
              { value: "10+", label: "Years building for Nigerian brands" },
              { value: "150+", label: "Websites & apps shipped globally" },
              { value: "100%", label: "Senior talent on every project" },
            ].map((stat) => (
              <div key={stat.label} className="bg-card p-5 text-center">
                <div className="font-display text-3xl font-bold text-gradient">
                  {stat.value}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-muted/40 py-24">
        <div className="container-tight grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="reveal text-sm font-semibold uppercase tracking-wider text-primary">
              FAQ
            </p>
            <h2
              className="reveal mt-3 font-display text-3xl md:text-5xl font-bold tracking-tight"
              data-delay="80"
            >
              Common questions about web design.
            </h2>
          </div>

          <Accordion
            type="single"
            collapsible
            className="reveal rounded-2xl border border-border bg-card px-6 shadow-card"
            data-delay="120"
          >
            {[
              {
                q: "Can you redesign an existing company website?",
                a: "Yes. We can modernise an existing website, improve its structure, refresh copy and visuals, and preserve any content worth keeping.",
              },
              {
                q: "Will the website be mobile friendly?",
                a: "Absolutely. Mobile responsiveness is a core part of the process because a large share of traffic in Nigeria comes from phones.",
              },
              {
                q: "Do you include SEO setup in web design?",
                a: "Yes. We include on-page SEO basics such as structure, metadata, semantic content layout, speed optimisation and internal linking recommendations.",
              },
            ].map((faq, index) => (
              <AccordionItem key={faq.q} value={`faq-${index}`}>
                <AccordionTrigger className="text-left font-display text-lg">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-base leading-relaxed text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="container-tight py-16">
        <div className="surface-dark relative overflow-hidden rounded-3xl p-10 md:p-14 text-center">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <h2 className="relative font-display text-3xl md:text-4xl font-bold text-surface-dark-foreground">
            Ready to redesign your website?
          </h2>
          <p className="relative mt-4 text-surface-dark-foreground/75 max-w-xl mx-auto">
            Tell us your goal and we&apos;ll craft a solution. We love a challenge.
          </p>
          <Button
            asChild
            variant="hero"
            size="xl"
            className="relative mt-8"
          >
            <Link href="/contact">
              Talk to a strategist <ArrowRight className="ml-1 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
