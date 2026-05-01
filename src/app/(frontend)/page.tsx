// "use client";
import Link from "next/link";

import { ArrowRight, Sparkles, Zap, Globe2, Award, Users2, Rocket, CheckCircle2, Layout, Code2, TrendingUp, ShoppingBag, Smartphone, PenTool, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

import { BRAND, SERVICES, PORTFOLIO, CLIENTS } from "@/lib/brand";

import { constructMetadata } from "@/lib/seo";

export const metadata = constructMetadata({
  title: "Web Designers in Ibadan | Digital Marketing | Johnnybits",
  description: "Web Designers in Ibadan - We are Nigeria&#039;s leading web design company. We help grow your business with Web Design, Digital Marketing and E-Commerce services.",
  absoluteTitle: true
});

const ICONS = { Layout, Code2, TrendingUp, ShoppingBag, Smartphone, PenTool, ShieldCheck };

const Index = () => {
  return (
    <>


      {/* HERO — dark surface */}
      <section className="surface-dark relative overflow-hidden -mt-16 md:-mt-20 pt-28 md:pt-36 pb-24 md:pb-36">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--surface-dark)/0.96),hsl(var(--surface-dark)/0.78)_24%,transparent_48%)]" />
        <div className="absolute -top-24 right-[10%] h-96 w-96 rounded-full bg-primary/25 blur-3xl animate-blob" />
        <div className="absolute -bottom-20 -right-10 h-[28rem] w-[28rem] rounded-full bg-primary-glow/20 blur-3xl animate-blob" style={{ animationDelay: "4s" }} />

        <div className="container-tight relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="max-w-3xl">
              <div className="reveal inline-flex items-center gap-2 rounded-full border border-primary-glow/30 bg-primary-glow/10 px-4 py-1.5 text-xs font-medium text-primary-glow backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Creative Agency · Ibadan, Nigeria
              </div>
              <h1 className="reveal mt-6 font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight" data-delay="80">
                We design <span className="text-gradient">brands & websites</span> that win on Google.
              </h1>
              <p className="reveal mt-6 text-lg md:text-xl text-surface-dark-foreground/75 leading-relaxed max-w-2xl" data-delay="160">
                Johnnybits is a result-focused web design, development & digital marketing agency in Ibadan. We help startups and growing businesses across Nigeria turn ideas into beautiful, high-converting digital experiences.
              </p>
              <div className="reveal mt-9 flex flex-wrap gap-3" data-delay="240">
                <Button asChild variant="hero" size="xl">
                  <Link href="/contact">Get a free quote <ArrowRight className="ml-1 h-5 w-5" /></Link>
                </Button>
                <Button asChild variant="outlineGlow" size="xl">
                  <Link href="/portfolio">View our work</Link>
                </Button>
              </div>

              {/* <div className="reveal mt-12 grid grid-cols-3 gap-6 max-w-lg" data-delay="320">
                {[
                  { k: "5+", v: "Years" },
                  { k: "80+", v: "Projects" },
                  { k: "5.0★", v: "Google" },
                ].map((s) => (
                  <div key={s.v}>
                    <div className="text-3xl md:text-4xl font-display font-bold text-primary-glow">{s.k}</div>
                    <div className="text-xs uppercase tracking-wider text-surface-dark-foreground/60 mt-1">{s.v}</div>
                  </div>
                ))}
              </div> */}
            </div>

            <div className="reveal hidden lg:block relative w-full flex items-center justify-center" data-delay="400">
              {/* Soft ambient blur behind the image */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />

              {/* Main glass container */}
              <div className="relative w-full mmax-w-lg mx-auto lg:ml-auto rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl p-3 shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent rounded-3xl pointer-events-none" />

                {/* Image container with gradient mask */}
                <div className="relative rounded-2xl overflow-hidden bg-black/60 border border-white/[0.05] shadow-inner">
                  {/* Decorative browser/editor dots */}
                  <div className="absolute top-0 left-0 right-0 h-10 bg-white/[0.02] backdrop-blur-md border-b border-white/[0.05] flex items-center px-4 gap-2 z-10">
                    <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                  </div>

                  <img
                    src="/assets/hero_code_ui.png"
                    alt="Modern Enterprise Software Development"
                    className="w-full h-auto object-cover pt-10"
                    style={{
                      WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
                      maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)"
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CLIENTS MARQUEE */}
      <section className="border-y border-border bg-muted/40 py-8 overflow-hidden">
        <p className="text-center text-xs uppercase tracking-[0.25em] text-muted-foreground mb-6">Trusted by brands across Nigeria & beyond</p>
        <div className="marquee">
          {[...CLIENTS, ...CLIENTS].map((c, i) => (
            <span key={i} className="text-xl md:text-2xl font-display font-semibold text-foreground/40 whitespace-nowrap">
              {c}
            </span>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section className="py-24">
        <div className="container-tight">
          <div className="max-w-2xl mb-14">
            <p className="reveal text-sm font-semibold uppercase tracking-wider text-primary">What we do</p>
            <h2 className="reveal mt-3 font-display text-3xl md:text-5xl font-bold tracking-tight" data-delay="80">
              A full-stack creative team for the brands of tomorrow.
            </h2>
            <p className="reveal mt-4 text-lg text-muted-foreground" data-delay="160">
              From your first wireframe to your hundred-thousandth visitor — we cover every step.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s, i) => {
              const Icon = ICONS[s.icon as keyof typeof ICONS] ?? Sparkles;
              return (
                <Link
                  key={s.slug}
                  href={`/services/${s.slug}`}
                  className="reveal group relative overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-card hover:shadow-elevated hover:-translate-y-1 transition-smooth"
                  data-delay={`${(i % 3) * 80}`}
                >
                  <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-gradient-brand opacity-0 group-hover:opacity-20 blur-2xl transition-smooth" />
                  <div className="relative">
                    <div className="inline-grid place-items-center h-12 w-12 rounded-xl bg-gradient-brand text-primary-foreground shadow-brand">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 font-display text-xl font-bold">{s.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.short}</p>
                    <div className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-primary">
                      Learn more
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* WHY US */}
      <section className="bg-muted/40 py-24 overflow-hidden">
        <div className="container-tight grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <p className="reveal text-sm font-semibold uppercase tracking-wider text-primary">Why Johnnybits</p>
            <h2 className="reveal mt-3 font-display text-3xl md:text-5xl font-bold tracking-tight" data-delay="80">
              Beautiful design meets <span className="text-gradient">measurable results.</span>
            </h2>
            <p className="reveal mt-5 text-lg text-muted-foreground" data-delay="160">
              We've spent years helping Nigerian businesses launch and grow online. Every project we ship is engineered for speed, SEO and conversion — not just looks.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                { i: Award, t: "Award-winning design", d: "Bespoke visuals tailored to your brand identity." },
                { i: Globe2, t: "Built for Nigeria & global", d: "Local SEO, Naira payments, fast on slow networks." },
                { i: Zap, t: "Performance-first builds", d: "Lightning-fast load times that Google actually rewards." },
                { i: Users2, t: "Hands-on team", d: "You speak directly with strategists, designers and devs." },
              ].map((b, i) => (
                <li key={b.t} className="reveal flex gap-4" data-delay={`${i * 80}`}>
                  <div className="grid place-items-center h-11 w-11 rounded-xl bg-accent text-accent-foreground shrink-0">
                    <b.i className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-display font-semibold">{b.t}</div>
                    <div className="text-sm text-muted-foreground">{b.d}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="reveal relative" data-delay="120">
            <div className="absolute -inset-6 bg-gradient-brand opacity-20 blur-3xl rounded-full" />
            <div className="relative grid grid-cols-2 gap-4">
              {[
                { k: "98", s: "Pagespeed score", c: "bg-card" },
                { k: "+312%", s: "Avg traffic growth", c: "bg-gradient-brand text-primary-foreground" },
                { k: "5.0★", s: "Google rating", c: "bg-gradient-brand text-primary-foreground" },
                { k: "24/7", s: "Support & monitoring", c: "bg-card" },
              ].map((b) => (
                <div key={b.s} className={`rounded-2xl p-6 shadow-card ${b.c}`}>
                  <div className="text-4xl md:text-5xl font-display font-bold">{b.k}</div>
                  <div className="mt-2 text-sm opacity-80">{b.s}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SELECTED WORK */}
      <section className="py-24">
        <div className="container-tight">
          <div className="flex flex-wrap items-end justify-between gap-6 mb-12">
            <div className="max-w-2xl">
              <p className="reveal text-sm font-semibold uppercase tracking-wider text-primary">Recent work</p>
              <h2 className="reveal mt-3 font-display text-3xl md:text-5xl font-bold tracking-tight" data-delay="80">
                Projects we're proud of.
              </h2>
            </div>
            <Button asChild variant="outline" size="lg" className="rounded-full">
              <Link href="/portfolio">See all projects <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {PORTFOLIO.slice(0, 6).map((p, i) => {
              const screenshot = p.image || `https://image.thum.io/get/width/800/crop/600/noanimate/${p.url}`;
              return (
                <a
                  key={p.name}
                  href={p.url}
                  target="_blank"
                  rel="noopener"
                  className="reveal group flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-b from-card to-muted/30 shadow-card hover:shadow-brand hover:border-primary/50 hover:-translate-y-1 transition-all duration-500"
                  data-delay={`${(i % 3) * 80}`}
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted border-b border-border/50">
                    <img
                      src={screenshot}
                      alt={`${p.name} website screenshot — project by Johnnybits`}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-1.5 z-10">
                      {p.tags.map((t) => (
                        <span key={t} className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gradient-brand text-white shadow-md border border-white/20">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col flex-1 p-5 relative">
                    <div className="absolute top-0 right-5 -translate-y-1/2 w-10 h-10 bg-gradient-brand rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 group-hover:-translate-y-6 transition-all duration-500 shadow-glow">
                      <ArrowRight className="h-5 w-5 -rotate-45" />
                    </div>
                    <div className="font-display text-xl font-bold text-foreground group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-primary-glow transition-all duration-300">{p.name}</div>
                    <div className="mt-4 text-sm font-medium text-muted-foreground inline-flex items-center gap-1.5 group-hover:text-foreground transition-colors">
                      Visit live site <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="bg-muted/40 py-24">
        <div className="container-tight">
          <div className="max-w-2xl mb-14 text-center mx-auto">
            <p className="reveal text-sm font-semibold uppercase tracking-wider text-primary">Our process</p>
            <h2 className="reveal mt-3 font-display text-3xl md:text-5xl font-bold tracking-tight" data-delay="80">
              From idea to launch in 4 simple steps.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "01", t: "Discovery", d: "We learn about your brand, goals and audience." },
              { n: "02", t: "Strategy & Design", d: "Wireframes and pixel-perfect designs you'll love." },
              { n: "03", t: "Build & Test", d: "Fast, secure development with rigorous QA." },
              { n: "04", t: "Launch & Grow", d: "We ship, then optimise with SEO & analytics." },
            ].map((s, i) => (
              <div key={s.n} className="reveal relative rounded-2xl bg-card border border-border p-7 shadow-card hover:-translate-y-1 transition-smooth" data-delay={`${i * 80}`}>
                <div className="text-5xl font-display font-bold text-gradient leading-none">{s.n}</div>
                <h3 className="mt-4 font-display text-xl font-bold">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24">
        <div className="container-tight">
          <div className="max-w-2xl mb-14">
            <p className="reveal text-sm font-semibold uppercase tracking-wider text-primary">Kind words</p>
            <h2 className="reveal mt-3 font-display text-3xl md:text-5xl font-bold tracking-tight" data-delay="80">
              Clients love working with us.
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { q: "Johnnybits redesigned our website and our leads tripled within 3 months. Worth every Naira.", n: "Adebayo O.", r: "CEO, Lagos retail brand" },
              { q: "Smooth process, beautiful design and an SEO strategy that actually moved us to page 1 of Google.", n: "Chinwe E.", r: "Founder, fashion startup" },
              { q: "The team is responsive, creative and deeply technical. Easily the best agency I've worked with in Nigeria.", n: "Femi A.", r: "MD, real estate firm" },
            ].map((t, i) => (
              <div key={t.n} className="reveal rounded-2xl bg-card border border-border p-7 shadow-card" data-delay={`${i * 80}`}>
                <div className="text-primary text-2xl">★★★★★</div>
                <p className="mt-4 leading-relaxed">"{t.q}"</p>
                <div className="mt-5 pt-5 border-t border-border">
                  <div className="font-semibold">{t.n}</div>
                  <div className="text-sm text-muted-foreground">{t.r}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-tight py-16">
        <div className="surface-dark relative overflow-hidden rounded-3xl p-10 md:p-16 text-center">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="absolute -top-10 left-1/4 h-72 w-72 rounded-full bg-primary-glow/30 blur-3xl animate-blob" />
          <div className="relative">
            <Rocket className="mx-auto h-12 w-12 text-primary-glow animate-float-slow" />
            <h2 className="reveal mt-6 font-display text-3xl md:text-5xl font-bold text-surface-dark-foreground tracking-tight">
              Ready to grow your brand online?
            </h2>
            <p className="reveal mt-4 text-lg text-surface-dark-foreground/75 max-w-xl mx-auto" data-delay="80">
              Tell us about your project — we reply within one business day.
            </p>
            <div className="reveal mt-8 flex flex-wrap gap-3 justify-center" data-delay="160">
              <Button asChild variant="hero" size="xl">
                <Link href="/contact">Start a project <ArrowRight className="ml-1 h-5 w-5" /></Link>
              </Button>
              <Button asChild variant="outlineGlow" size="xl">
                <a href={BRAND.whatsapp} target="_blank" rel="noopener">Chat on WhatsApp</a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Index;
