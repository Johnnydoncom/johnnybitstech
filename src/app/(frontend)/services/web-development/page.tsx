import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Code2,
  Database,
  Globe,
  Layers,
  Server,
  Sparkles,
  Workflow,
  Zap,
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
  title: "Web Application Development | Johnnybits Technology",
  description: "Robust web apps with the latest stacks — React, Laravel, VueJS, APIs. Custom dashboards, portals, booking systems and internal tools.",
});

export default function WebDevelopmentPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            "name": "Web Application Development",
            "provider": {
              "@type": "Organization",
              "name": "Johnnybits Technology"
            },
            "description": "Robust web apps with the latest stacks — React, Laravel, VueJS, APIs. Custom dashboards, portals, booking systems and internal tools."
          })
        }}
      />
      {/* Hero — Code-inspired with tech stack badges */}
      <section className="surface-dark relative overflow-hidden -mt-16 md:-mt-20 pt-32 pb-28">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute top-10 right-0 h-96 w-96 rounded-full bg-primary/20 blur-3xl animate-blob" />

        <div className="container-tight relative">
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
            <Code2 className="h-3.5 w-3.5" />
            Development
          </div>

          <h1
            className="reveal mt-5 font-display text-4xl md:text-6xl font-bold tracking-tight max-w-3xl"
            data-delay="120"
          >
            Web Application Development
          </h1>
          <p
            className="reveal mt-6 text-lg text-surface-dark-foreground/75 max-w-2xl"
            data-delay="200"
          >
            Combining strong engineering with modern frameworks, we ship custom
            web applications tailored to your business — secure, scalable and
            easy to maintain.
          </p>

          {/* Tech stack badges */}
          <div
            className="reveal mt-10 flex flex-wrap gap-3"
            data-delay="280"
          >
            {[
              "Progressive Web Apps",
              "Laravel & Node.js",
              "VueJS & React",
              "REST & GraphQL APIs",
            ].map((tech) => (
              <span
                key={tech}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary-glow/20 bg-primary-glow/5 px-3 py-2 text-sm font-medium text-primary-glow backdrop-blur-sm"
              >
                <Code2 className="h-3.5 w-3.5" />
                {tech}
              </span>
            ))}
          </div>

          <div className="reveal mt-8 flex flex-wrap gap-3" data-delay="340">
            <Button asChild variant="hero" size="xl">
              <Link href="/contact">
                Get a free quote <ArrowRight className="ml-1 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outlineGlow" size="xl">
              <Link href="/pricing">View pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Intro — Full width with code-style accent */}
      <section className="py-24">
        <div className="container-tight grid gap-12 lg:grid-cols-[1fr_1fr] items-start">
          <div>
            <p className="reveal text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              Beyond brochure pages
            </p>
            <h2
              className="reveal mt-3 font-display text-3xl md:text-4xl font-bold tracking-tight"
              data-delay="80"
            >
              Custom software that powers{" "}
              <span className="text-gradient">real operations.</span>
            </h2>
            <p
              className="reveal mt-5 text-base md:text-lg text-muted-foreground leading-relaxed"
              data-delay="160"
            >
              When your business needs more than brochure pages, we build custom
              web applications that streamline operations, automate workflows and
              support growth. From dashboards and portals to booking systems and
              internal tools, our development process balances technical
              architecture, usability and long-term maintainability.
            </p>
          </div>

          {/* Code snippet card */}
          <div className="reveal rounded-2xl border border-border bg-card overflow-hidden shadow-elevated">
            <div className="flex items-center gap-2 bg-muted/60 px-4 py-3 border-b border-border">
              <div className="h-3 w-3 rounded-full bg-destructive/60" />
              <div className="h-3 w-3 rounded-full bg-yellow-400/60" />
              <div className="h-3 w-3 rounded-full bg-green-400/60" />
              <span className="ml-2 text-xs text-muted-foreground font-mono">
                api/example.ts
              </span>
            </div>
            <div className="p-5 font-mono text-sm leading-relaxed text-muted-foreground">
              <div>
                <span className="text-primary">export async function</span>{" "}
                <span className="text-foreground">GET</span>(req) {"{"}
              </div>
              <div className="pl-4">
                <span className="text-muted-foreground/60">// Your custom business logic</span>
              </div>
              <div className="pl-4">
                <span className="text-primary">const</span> data ={" "}
                <span className="text-primary">await</span>{" "}
                db.query(...)
              </div>
              <div className="pl-4">
                <span className="text-primary">return</span>{" "}
                Response.json(data)
              </div>
              <div>{"}"}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Deliverables — Vertical stack with icons */}
      <section className="bg-muted/40 py-24">
        <div className="container-tight">
          <div className="max-w-2xl">
            <p className="reveal text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              Full-stack delivery
            </p>
            <h2
              className="reveal mt-3 font-display text-3xl md:text-4xl font-bold tracking-tight"
              data-delay="80"
            >
              What every engagement includes.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Workflow,
                title: "Product planning",
                desc: "Technical architecture and feature prioritization",
              },
              {
                icon: Layers,
                title: "Frontend & backend",
                desc: "Application interfaces ready for production",
              },
              {
                icon: Globe,
                title: "API integrations",
                desc: "Data flow design and third-party connections",
              },
              {
                icon: Zap,
                title: "QA & deployment",
                desc: "Testing, deployment support and post-launch fixes",
              },
            ].map((item, i) => (
              <div
                key={item.title}
                className="reveal group rounded-2xl border border-border bg-card p-6 shadow-card hover:-translate-y-1 hover:shadow-elevated transition-smooth"
                data-delay={`${i * 80}`}
              >
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-brand text-primary-foreground shadow-brand">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process — Numbered vertical timeline */}
      <section className="py-24">
        <div className="container-tight">
          <div className="max-w-2xl mb-12">
            <p className="reveal text-sm font-semibold uppercase tracking-wider text-primary">
              Our process
            </p>
            <h2
              className="reveal mt-3 font-display text-3xl md:text-5xl font-bold tracking-tight"
              data-delay="80"
            >
              How we deliver web app projects.
            </h2>
          </div>

          <div className="space-y-6">
            {[
              {
                n: "01",
                t: "Product mapping",
                d: "We define user roles, use cases, features and priorities so development starts from business needs instead of guesswork.",
                icon: Database,
              },
              {
                n: "02",
                t: "Interface & system build",
                d: "We build the app experience with clean components, intuitive workflows and a scalable codebase.",
                icon: Server,
              },
              {
                n: "03",
                t: "Testing & rollout",
                d: "Before launch we test key journeys, reduce friction points and prepare the product for confident adoption.",
                icon: Sparkles,
              },
            ].map((step, i) => (
              <div
                key={step.n}
                className="reveal grid gap-6 md:grid-cols-[auto_1fr] items-start rounded-2xl border border-border bg-card p-8 shadow-card"
                data-delay={`${i * 90}`}
              >
                <div className="flex items-center gap-4">
                  <div className="font-display text-5xl font-bold text-gradient">
                    {step.n}
                  </div>
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-accent-foreground md:hidden">
                    <step.icon className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <h3 className="font-display text-2xl font-bold">{step.t}</h3>
                  <p className="mt-3 text-muted-foreground leading-relaxed max-w-2xl">
                    {step.d}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ideal for + Outcomes */}
      <section className="bg-muted/40 py-24">
        <div className="container-tight">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Ideal for */}
            <div className="reveal rounded-3xl border border-border bg-card p-8 shadow-card lg:col-span-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Ideal for
              </p>
              <h3 className="mt-2 font-display text-xl font-bold">
                Who benefits most
              </h3>
              <ul className="mt-5 space-y-4">
                {[
                  "Businesses replacing manual operations with custom software",
                  "Startups launching MVPs and customer portals",
                  "Teams needing integrations, automation and reporting tools",
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-sm">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Outcomes */}
            <div className="reveal lg:col-span-2 surface-dark relative overflow-hidden rounded-3xl p-8 md:p-10 shadow-elevated">
              <div className="absolute inset-0 grid-bg opacity-20" />
              <div className="relative">
                <p className="text-xs uppercase tracking-[0.2em] text-primary-glow">
                  Outcomes
                </p>
                <h3 className="mt-2 font-display text-2xl font-bold text-surface-dark-foreground">
                  What you get
                </h3>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  {[
                    "Less manual admin and faster internal operations",
                    "Scalable product foundations for future features",
                    "Secure systems with clear user flows and dependable performance",
                  ].map((item, i) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-primary-glow/10 bg-background/5 p-5 backdrop-blur-sm"
                    >
                      <div className="font-display text-3xl font-bold text-primary-glow">
                        0{i + 1}
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-surface-dark-foreground/80">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24">
        <div className="container-tight max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="reveal text-sm font-semibold uppercase tracking-wider text-primary">
              FAQ
            </p>
            <h2
              className="reveal mt-3 font-display text-3xl md:text-4xl font-bold tracking-tight"
              data-delay="80"
            >
              Common questions about web development.
            </h2>
          </div>

          <Accordion
            type="single"
            collapsible
            className="reveal rounded-2xl border border-border bg-card px-6 shadow-card"
          >
            {[
              {
                q: "Can you build a custom dashboard or portal?",
                a: "Yes. We build admin dashboards, client portals, booking systems, directories, internal tools and other custom platforms.",
              },
              {
                q: "Do you work with existing APIs or third-party services?",
                a: "Yes. We can integrate payment gateways, CRMs, messaging tools, analytics platforms and custom APIs.",
              },
              {
                q: "Can the app evolve after launch?",
                a: "Yes. We structure projects so new modules, integrations and workflow improvements can be added over time.",
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
      <section className="container-tight pb-24">
        <div className="surface-dark relative overflow-hidden rounded-3xl p-10 md:p-14 text-center">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <h2 className="relative font-display text-3xl md:text-4xl font-bold text-surface-dark-foreground">
            Have a web app idea?
          </h2>
          <p className="relative mt-4 text-surface-dark-foreground/75 max-w-xl mx-auto">
            Tell us what you need and we&apos;ll architect a solution that fits your budget and timeline.
          </p>
          <Button asChild variant="hero" size="xl" className="relative mt-8">
            <Link href="/contact">
              Start building <ArrowRight className="ml-1 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
