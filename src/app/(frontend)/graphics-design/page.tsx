import Link from "next/link";
import { ArrowRight, ArrowLeft, CheckCircle2, PenTool, Palette, Image, FileImage, Layers, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { constructMetadata } from "@/lib/seo";

export const metadata = constructMetadata({
  title: "Graphics Design | Johnnybits Technology",
  description: "Brand identities, flyers, banners and social creatives that pop. Logo design, social media creatives, print & packaging, pitch decks.",
});

export default function GraphicsDesignPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            "name": "Graphics Design",
            "provider": {
              "@type": "Organization",
              "name": "Johnnybits Technology"
            },
            "description": "Brand identities, flyers, banners and social creatives that pop. Logo design, social media creatives, print & packaging, pitch decks."
          })
        }}
      />
      <section className="surface-dark relative overflow-hidden -mt-16 md:-mt-20 pt-32 pb-28">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute -top-10 right-0 h-96 w-96 rounded-full bg-primary-glow/20 blur-3xl animate-blob" />
        <div className="container-tight relative">
          <Link href="/services" className="reveal inline-flex items-center gap-1.5 text-sm text-surface-dark-foreground/70 hover:text-primary-glow transition-smooth"><ArrowLeft className="h-4 w-4" /> All services</Link>
          <div className="reveal mt-6 inline-flex items-center gap-2 rounded-full border border-primary-glow/25 bg-primary-glow/5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary-glow backdrop-blur-sm" data-delay="80"><PenTool className="h-3.5 w-3.5" /> Design</div>
          <h1 className="reveal mt-5 font-display text-4xl md:text-6xl font-bold tracking-tight max-w-3xl" data-delay="120">Graphics Design</h1>
          <p className="reveal mt-6 text-lg text-surface-dark-foreground/75 max-w-2xl" data-delay="200">Passionate graphic designers in Ibadan crafting brochures, banners, flyers, business cards and full brand identities that grab attention and build trust.</p>
          <div className="reveal mt-10 grid grid-cols-2 md:grid-cols-4 gap-3" data-delay="280">
            {[{icon: Palette, label: "Logo & Brand Identity"}, {icon: Image, label: "Social Media Creatives"}, {icon: FileImage, label: "Print & Packaging"}, {icon: Layers, label: "Pitch Decks"}].map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-xl border border-primary-glow/15 bg-background/5 p-4 backdrop-blur-sm"><item.icon className="h-5 w-5 text-primary-glow shrink-0" /><span className="text-sm font-medium text-surface-dark-foreground">{item.label}</span></div>
            ))}
          </div>
          <div className="reveal mt-8 flex flex-wrap gap-3" data-delay="340">
            <Button asChild variant="hero" size="xl"><Link href="/contact">Get a free quote <ArrowRight className="ml-1 h-5 w-5" /></Link></Button>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="container-tight grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <p className="reveal text-sm font-semibold uppercase tracking-[0.2em] text-primary">Visual excellence</p>
            <h2 className="reveal mt-3 font-display text-3xl md:text-4xl font-bold tracking-tight" data-delay="80">Design that communicates <span className="text-gradient">with clarity and polish.</span></h2>
            <p className="reveal mt-5 text-base md:text-lg text-muted-foreground leading-relaxed" data-delay="160">Our graphic design service helps businesses present themselves with clarity, consistency and polish. Whether you need a stronger brand identity, campaign visuals or everyday marketing assets, we create designs that look professional and support growth across digital and print touchpoints.</p>
          </div>
          <div className="reveal grid grid-cols-4 gap-2 rounded-2xl border border-border bg-card p-5 shadow-elevated" data-delay="200">
            {Array.from({length: 8}).map((_, i) => (<div key={i} className="aspect-square rounded-lg bg-gradient-brand opacity-[0.15]" style={{opacity: 0.15 + i * 0.1}} />))}
            <div className="col-span-4 mt-2 text-center text-xs text-muted-foreground font-mono">Your brand palette, crafted with intention</div>
          </div>
        </div>
      </section>

      <section className="bg-muted/40 py-24">
        <div className="container-tight">
          <div className="max-w-2xl mb-12"><p className="reveal text-sm font-semibold uppercase tracking-[0.2em] text-primary">What&apos;s included</p><h2 className="reveal mt-3 font-display text-3xl md:text-4xl font-bold tracking-tight" data-delay="80">Comprehensive design services.</h2></div>
          <div className="space-y-4">
            {["Brand direction, logos and identity systems", "Campaign graphics and social media creative sets", "Flyers, brochures, banners and sales collateral", "Presentation and pitch deck design"].map((item, i) => (
              <div key={item} className="reveal flex gap-5 rounded-2xl border border-border bg-card p-6 shadow-card" data-delay={`${i * 70}`}>
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-brand text-primary-foreground shadow-brand"><CheckCircle2 className="h-5 w-5" /></div>
                <p className="text-base leading-relaxed self-center">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24"><div className="container-tight"><div className="max-w-2xl mb-12"><p className="reveal text-sm font-semibold uppercase tracking-wider text-primary">Our approach</p><h2 className="reveal mt-3 font-display text-3xl md:text-5xl font-bold tracking-tight" data-delay="80">How we deliver design projects.</h2></div>
          <div className="grid gap-6 lg:grid-cols-3">
            {[{n:"01",t:"Brand review",d:"We study your current visuals, audience and market space to determine what needs refinement or reinvention."},{n:"02",t:"Concept development",d:"We explore visual directions, layouts, typography and supporting assets aligned with your business goals."},{n:"03",t:"Asset rollout",d:"Final designs are prepared for the channels where they will perform best, from social feeds to printed materials."}].map((step,i) => (
              <div key={step.n} className="reveal rounded-2xl border border-border bg-card p-7 shadow-card" data-delay={`${i*90}`}><div className="flex items-center justify-between"><div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-brand text-primary-foreground shadow-brand"><Sparkles className="h-5 w-5" /></div><div className="font-display text-4xl font-bold text-primary/30">{step.n}</div></div><h3 className="mt-6 font-display text-2xl font-bold">{step.t}</h3><p className="mt-3 text-muted-foreground leading-relaxed">{step.d}</p></div>
            ))}
          </div></div></section>

      <section className="bg-muted/40 py-24"><div className="container-tight grid gap-8 lg:grid-cols-2">
          <div className="reveal surface-dark relative overflow-hidden rounded-3xl p-8 md:p-10 shadow-elevated"><div className="absolute inset-0 grid-bg opacity-20" /><div className="relative"><p className="text-xs uppercase tracking-[0.2em] text-primary-glow">Outcomes</p><h3 className="mt-2 font-display text-2xl font-bold text-surface-dark-foreground">Results you can expect</h3><div className="mt-6 space-y-4">{["A more credible and recognisable brand presence","Design assets that support marketing performance","Consistency across print, web and social channels"].map((item,i) => (<div key={item} className="flex gap-4 rounded-2xl border border-primary-glow/10 bg-background/5 p-4 backdrop-blur-sm"><div className="font-display text-2xl font-bold text-primary-glow shrink-0 w-10">0{i+1}</div><p className="text-sm leading-relaxed text-surface-dark-foreground/85 self-center">{item}</p></div>))}</div></div></div>
          <div className="reveal rounded-3xl border border-border bg-card p-8 shadow-card"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Ideal for</p><h3 className="mt-2 font-display text-2xl font-bold">Who benefits most</h3><ul className="mt-6 space-y-5">{["Businesses refreshing their visual identity","Teams that need consistent campaign and social media creatives","Brands preparing marketing materials, proposals and presentations"].map((item) => (<li key={item} className="flex gap-3"><div className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground"><CheckCircle2 className="h-4 w-4" /></div><p className="text-sm text-muted-foreground">{item}</p></li>))}</ul><Button asChild variant="hero" size="lg" className="mt-8 w-full"><Link href="/contact">Start your design project <ArrowRight className="ml-1 h-4 w-4" /></Link></Button></div>
      </div></section>

      <section className="py-24"><div className="container-tight grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start"><div><p className="reveal text-sm font-semibold uppercase tracking-wider text-primary">FAQ</p><h2 className="reveal mt-3 font-display text-3xl md:text-5xl font-bold tracking-tight" data-delay="80">Common questions about graphics design.</h2></div>
          <Accordion type="single" collapsible className="reveal rounded-2xl border border-border bg-card px-6 shadow-card" data-delay="120">
            {[{q:"Do you only design logos?",a:"No. We also create broader identity systems, campaign creatives, sales materials, social assets and presentation graphics."},{q:"Can you work with an existing brand?",a:"Yes. We can extend an existing visual system and keep new designs aligned with your brand guidelines."},{q:"Are print-ready files included?",a:"Yes. Where relevant, assets can be prepared for both digital use and professional printing."}].map((faq,index) => (<AccordionItem key={faq.q} value={`faq-${index}`}><AccordionTrigger className="text-left font-display text-lg">{faq.q}</AccordionTrigger><AccordionContent className="text-base leading-relaxed text-muted-foreground">{faq.a}</AccordionContent></AccordionItem>))}
          </Accordion></div></section>

      <section className="container-tight pb-24"><div className="surface-dark relative overflow-hidden rounded-3xl p-10 md:p-14 text-center"><div className="absolute inset-0 grid-bg opacity-30" /><h2 className="relative font-display text-3xl md:text-4xl font-bold text-surface-dark-foreground">Need stunning visuals?</h2><p className="relative mt-4 text-surface-dark-foreground/75">Let&apos;s create designs that make your brand unforgettable.</p><Button asChild variant="hero" size="xl" className="relative mt-8"><Link href="/contact">Start your project <ArrowRight className="ml-1 h-5 w-5" /></Link></Button></div></section>
    </>
  );
}
