import Link from "next/link";
import { ArrowRight, ArrowLeft, CheckCircle2, Smartphone, TabletSmartphone, AppWindow, Store, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { constructMetadata } from "@/lib/seo";

export const metadata = constructMetadata({
  title: "Mobile App Development | Johnnybits Technology",
  description: "Beautiful Android & iOS apps for startups and enterprises. React Native, Flutter, Native — we ship polished, fully-functional mobile apps.",
});

export default function MobileAppsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            "name": "Mobile App Development",
            "provider": {
              "@type": "Organization",
              "name": "Johnnybits Technology"
            },
            "description": "Beautiful Android & iOS apps for startups and enterprises. React Native, Flutter, Native — we ship polished, fully-functional mobile apps."
          })
        }}
      />
      {/* Hero — Device frame style */}
      <section className="surface-dark relative overflow-hidden -mt-16 md:-mt-20 pt-32 pb-28">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-primary/25 blur-3xl animate-blob" />

        <div className="container-tight relative grid gap-12 lg:grid-cols-[1.2fr_0.8fr] items-center">
          <div>
            <Link href="/services" className="reveal inline-flex items-center gap-1.5 text-sm text-surface-dark-foreground/70 hover:text-primary-glow transition-smooth">
              <ArrowLeft className="h-4 w-4" /> All services
            </Link>
            <div className="reveal mt-6 inline-flex items-center gap-2 rounded-full border border-primary-glow/25 bg-primary-glow/5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary-glow backdrop-blur-sm" data-delay="80">
              <Smartphone className="h-3.5 w-3.5" /> Mobile Apps
            </div>
            <h1 className="reveal mt-5 font-display text-4xl md:text-6xl font-bold tracking-tight" data-delay="120">Mobile App Development</h1>
            <p className="reveal mt-6 text-lg text-surface-dark-foreground/75 max-w-xl" data-delay="200">
              A leading mobile apps development team in Nigeria — we ship polished, fully-functional Android and iOS apps with React Native and Flutter.
            </p>
            <div className="reveal mt-8 flex flex-wrap gap-3" data-delay="280">
              <Button asChild variant="hero" size="xl"><Link href="/contact">Get a free quote <ArrowRight className="ml-1 h-5 w-5" /></Link></Button>
              <Button asChild variant="outlineGlow" size="xl"><Link href="/pricing">View pricing</Link></Button>
            </div>
          </div>

          {/* Phone mockup with platform badges */}
          <div className="reveal hidden lg:flex flex-col items-center gap-6" data-delay="300">
            <div className="relative mx-auto w-56 rounded-[2.5rem] border-4 border-primary-glow/30 bg-background/5 p-3 backdrop-blur-sm shadow-glow">
              <div className="aspect-[9/16] rounded-[2rem] bg-gradient-to-b from-primary-glow/20 to-primary/10 flex flex-col items-center justify-center gap-3 p-6">
                <Smartphone className="h-12 w-12 text-primary-glow" />
                <p className="text-center text-sm text-surface-dark-foreground/80 font-medium">Your app, beautifully crafted</p>
              </div>
            </div>
            <div className="flex gap-3">
              {["React Native", "Flutter", "iOS", "Android"].map((p) => (
                <span key={p} className="rounded-full border border-primary-glow/20 bg-primary-glow/5 px-3 py-1 text-xs font-medium text-primary-glow">{p}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="py-24">
        <div className="container-tight max-w-3xl mx-auto text-center">
          <p className="reveal text-sm font-semibold uppercase tracking-[0.2em] text-primary">What we build</p>
          <h2 className="reveal mt-3 font-display text-3xl md:text-4xl font-bold tracking-tight" data-delay="80">
            Apps that are <span className="text-gradient">intuitive, fast and genuinely useful.</span>
          </h2>
          <p className="reveal mt-6 text-lg text-muted-foreground leading-relaxed" data-delay="160">
            Johnnybits designs and develops mobile apps that are intuitive, fast and genuinely useful in day-to-day business or customer experiences. We focus on strong product logic, clean interaction design and dependable app journeys that help brands launch with confidence and keep users engaged after install.
          </p>
        </div>
      </section>

      {/* Deliverables — Large icon cards */}
      <section className="bg-muted/40 py-24">
        <div className="container-tight">
          <div className="max-w-2xl mb-12">
            <p className="reveal text-sm font-semibold uppercase tracking-[0.2em] text-primary">What&apos;s included</p>
            <h2 className="reveal mt-3 font-display text-3xl md:text-4xl font-bold tracking-tight" data-delay="80">Full mobile development package.</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {[
              { icon: AppWindow, title: "App planning & UX", desc: "User flow design and interface systems tailored to your product." },
              { icon: TabletSmartphone, title: "Cross-platform dev", desc: "Cross-platform development for faster rollout on both ecosystems." },
              { icon: Smartphone, title: "QA & testing", desc: "QA for core mobile journeys and device responsiveness." },
              { icon: Store, title: "Launch support", desc: "App publishing guidance and app store launch support." },
            ].map((item, i) => (
              <div key={item.title} className="reveal group rounded-2xl border border-border bg-card p-7 shadow-card hover:-translate-y-1 hover:shadow-elevated transition-smooth" data-delay={`${i * 80}`}>
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-brand">
                  <item.icon className="h-7 w-7" />
                </div>
                <h3 className="mt-5 font-display text-xl font-bold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process — Horizontal cards */}
      <section className="py-24">
        <div className="container-tight">
          <div className="max-w-2xl mb-12">
            <p className="reveal text-sm font-semibold uppercase tracking-wider text-primary">Our process</p>
            <h2 className="reveal mt-3 font-display text-3xl md:text-5xl font-bold tracking-tight" data-delay="80">How we build mobile apps.</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {[
              { n: "01", t: "Product strategy", d: "We prioritise the features that matter most to your users and shape them into a lean, launch-ready product roadmap." },
              { n: "02", t: "UI design & development", d: "We craft app screens, interactions and logic with a strong emphasis on usability, speed and clarity." },
              { n: "03", t: "Launch preparation", d: "We test the experience, reduce friction and support deployment so the app is ready for real users." },
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

      {/* Ideal for + Outcomes — side by side reversed */}
      <section className="bg-muted/40 py-24">
        <div className="container-tight grid gap-8 lg:grid-cols-2">
          <div className="reveal surface-dark relative overflow-hidden rounded-3xl p-8 md:p-10 shadow-elevated order-2 lg:order-1">
            <div className="absolute inset-0 grid-bg opacity-20" />
            <div className="relative">
              <p className="text-xs uppercase tracking-[0.2em] text-primary-glow">Outcomes</p>
              <h3 className="mt-2 font-display text-2xl font-bold text-surface-dark-foreground">Results you can expect</h3>
              <div className="mt-6 space-y-4">
                {["A smoother mobile experience for customers or staff", "Launch-ready Android and iOS products with clear UX", "Stronger retention through thoughtful flows and performance"].map((item, i) => (
                  <div key={item} className="flex gap-4 rounded-2xl border border-primary-glow/10 bg-background/5 p-4 backdrop-blur-sm">
                    <div className="font-display text-2xl font-bold text-primary-glow shrink-0 w-10">0{i + 1}</div>
                    <p className="text-sm leading-relaxed text-surface-dark-foreground/85 self-center">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="reveal rounded-3xl border border-border bg-card p-8 shadow-card order-1 lg:order-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Ideal for</p>
            <h3 className="mt-2 font-display text-2xl font-bold">Who benefits most</h3>
            <ul className="mt-6 space-y-5">
              {["Founders launching consumer or business apps", "Companies extending their service into mobile experiences", "Teams needing booking, ordering, marketplace or engagement products"].map((item) => (
                <li key={item} className="flex gap-3"><div className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground"><CheckCircle2 className="h-4 w-4" /></div><p className="text-sm text-muted-foreground leading-relaxed">{item}</p></li>
              ))}
            </ul>
            <Button asChild variant="hero" size="lg" className="mt-8 w-full"><Link href="/contact">Start your app project <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24">
        <div className="container-tight max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="reveal text-sm font-semibold uppercase tracking-wider text-primary">FAQ</p>
            <h2 className="reveal mt-3 font-display text-3xl md:text-4xl font-bold tracking-tight" data-delay="80">Common questions about mobile app development.</h2>
          </div>
          <Accordion type="single" collapsible className="reveal rounded-2xl border border-border bg-card px-6 shadow-card">
            {[
              { q: "Do you build for both Android and iPhone?", a: "Yes. We can deliver cross-platform solutions for both ecosystems depending on the product requirement." },
              { q: "Can you help validate an MVP idea?", a: "Yes. We can define a lean feature set for launch so you go to market faster without overbuilding." },
              { q: "Will the app match our brand?", a: "Yes. We design app interfaces around your brand identity while keeping usability and accessibility in focus." },
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
          <h2 className="relative font-display text-3xl md:text-4xl font-bold text-surface-dark-foreground">Have a mobile app idea?</h2>
          <p className="relative mt-4 text-surface-dark-foreground/75 max-w-xl mx-auto">Let&apos;s turn your vision into an app your users will love.</p>
          <Button asChild variant="hero" size="xl" className="relative mt-8"><Link href="/contact">Start building <ArrowRight className="ml-1 h-5 w-5" /></Link></Button>
        </div>
      </section>
    </>
  );
}
