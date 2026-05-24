import Link from "next/link";
import { ArrowRight, ArrowLeft, CheckCircle2, ShieldCheck, Activity, RefreshCw, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { constructMetadata, getServiceSchema, getWebPageSchema, getBreadcrumbSchema, buildJsonLdGraph } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL, SEPARATOR, SITE_NAME } from "@/config/site";

const SEO_TITLE = "Website Maintenance" + SEPARATOR + "Web Support Services in Nigeria" + SEPARATOR + SITE_NAME;
const SEO_DESCRIPTION = "Our web maintenance and support services help you maximize the lifetime value of your business investment. We keep your site fast, secure and always up with twice-weekly updates, security patches, and 24/7 monitoring.";
const PAGE_URL = `${SITE_URL}/website-maintenance-and-support`;

const SEO_KEYWORDS = ["Website Maintenance", "Website Support", "Website Security", "Website Performance", "Website Updates", "Website Monitoring", "Website Care", "Website Backup", "Website Fix", "Website Fix and Maintenance", "Website Fixes and Maintenance", "Website Fixes", "Website Maintenance Services", "Website Maintenance Services in Nigeria", "Website Maintenance Services in Nigeria", "Website Maintenance Services in Lagos", "Website Maintenance Services in Abuja", "Website Maintenance Services in Port Harcourt", "Website Maintenance Services in Kano", "Website Maintenance Services in Kaduna", "Website Maintenance Services in Oyo", "Website Maintenance Services in Ogun", "Website Maintenance Services in Ekiti", "Website Maintenance Services in Osun", "Website Maintenance Services in Ondo", "Website Maintenance Services in Kwara"];


export const metadata = constructMetadata({
  title: SEO_TITLE,
  description: SEO_DESCRIPTION,
  keywords: SEO_KEYWORDS,
  canonicalUrl: PAGE_URL,
});

export default function WebsiteMaintenancePage() {
  return (
    <>
      <JsonLd
        data={buildJsonLdGraph(
          getWebPageSchema({
            name: SEO_TITLE,
            description: SEO_DESCRIPTION,
            url: PAGE_URL,
          }),
          getServiceSchema({
            name: "Website Maintenance",
            description: SEO_DESCRIPTION,
            url: PAGE_URL,
          }),
          getBreadcrumbSchema([
            { name: "Home", url: SITE_URL },
            { name: "Services", url: `${SITE_URL}/services` },
            { name: "Website Maintenance", url: PAGE_URL },
          ])
        )}
      />
      <section className="surface-dark relative overflow-hidden -mt-16 md:-mt-20 pt-32 pb-28">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute top-10 left-1/3 h-96 w-96 rounded-full bg-primary/25 blur-3xl animate-blob" />
        <div className="container-tight relative">
          <Link href="/services" className="reveal inline-flex items-center gap-1.5 text-sm text-surface-dark-foreground/70 hover:text-primary-glow transition-smooth"><ArrowLeft className="h-4 w-4" /> All services</Link>
          <div className="reveal mt-6 inline-flex items-center gap-2 rounded-full border border-primary-glow/25 bg-primary-glow/5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary-glow backdrop-blur-sm" data-delay="80"><ShieldCheck className="h-3.5 w-3.5" /> Maintenance</div>
          <h1 className="reveal mt-5 font-display text-4xl md:text-6xl font-bold tracking-tight max-w-3xl" data-delay="120">Website Maintenance</h1>
          <p className="reveal mt-6 text-lg text-surface-dark-foreground/75 max-w-2xl" data-delay="200">Our maintenance retainers cover updates, backups, security patches, performance and content edits — maximizing uptime and minimizing disruption.</p>

          {/* Status dashboard visual */}
          <div className="reveal mt-10 grid grid-cols-2 md:grid-cols-4 gap-4" data-delay="280">
            {[{ icon: ShieldCheck, label: "Security & Backups", status: "Protected" }, { icon: Activity, label: "Performance Tuning", status: "Optimised" }, { icon: RefreshCw, label: "Content Updates", status: "Current" }, { icon: Clock, label: "24/7 Monitoring", status: "Active" }].map((item) => (
              <div key={item.label} className="rounded-xl border border-primary-glow/15 bg-background/5 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2"><item.icon className="h-4 w-4 text-primary-glow" /><span className="text-xs font-medium text-surface-dark-foreground/70">{item.label}</span></div>
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" /><span className="text-sm font-bold text-primary-glow">{item.status}</span></div>
              </div>
            ))}
          </div>

          <div className="reveal mt-8 flex flex-wrap gap-3" data-delay="340">
            <Button asChild variant="hero" size="xl"><Link href="/contact-us">Get a maintenance plan <ArrowRight className="ml-1 h-5 w-5" /></Link></Button>
            <Button asChild variant="outlineGlow" size="xl"><Link href="/pricing">View pricing</Link></Button>
          </div>
        </div>
      </section>

      <section className="py-24"><div className="container-tight max-w-3xl">
        <p className="reveal text-sm font-semibold uppercase tracking-[0.2em] text-primary">Why maintenance matters</p>
        <h2 className="reveal mt-3 font-display text-3xl md:text-4xl font-bold tracking-tight" data-delay="80">A website should keep <span className="text-gradient">working after launch.</span></h2>
        <p className="reveal mt-6 text-lg text-muted-foreground leading-relaxed" data-delay="160">Our maintenance service helps businesses stay secure, current and high-performing without relying on emergency fixes. We proactively monitor, update and improve your website so downtime, broken pages and slow performance do not quietly cost you leads or sales.</p>
      </div></section>

      <section className="bg-muted/20 py-24 border-y border-border/50">
        <div className="container-tight max-w-4xl text-center">
          <h2 className="reveal font-display text-3xl md:text-4xl font-bold tracking-tight">Expert IT Support & Consultancy</h2>
          <div className="reveal mt-8 space-y-6 text-lg text-muted-foreground leading-relaxed text-left md:text-center" data-delay="80">
            <p>
              IT is at the heart of everything these days, and any problems or difficulties can mean your business grinds to a halt. Fast and reliable support is essential to any company that relies on technology – and that covers just about everyone.
            </p>
            <p>
              At Johnnybits, we take care of your internet presence and provide the expert support you need to keep your whole IT infrastructure healthy. We can manage and consult on your <strong className="text-foreground">email, domains, and DNS requirements</strong>, ensuring everything runs smoothly behind the scenes.
            </p>
            <p className="pt-4 font-medium text-foreground">
              If you&apos;d like to know more about our consultancy services, please feel free to call <a href="tel:+2348031304346" className="text-primary hover:underline">+234 (803) 130-4346</a> or email us at <a href="mailto:info@johnnybits.com" className="text-primary hover:underline">info@johnnybits.com</a>.
            </p>
            <div className="pt-8 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 border-t border-border/50 mt-8">
              <div className="text-sm font-semibold uppercase tracking-wider text-primary">
                Service Hours: 8am - 5pm, Mon - Sat
              </div>
              <p className="text-sm text-muted-foreground">
                Visit us: Suite 16, Sunazco Plaza, 187 Obafemi Awolowo Way, Oke-Ado, Ibadan
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-muted/40 py-24"><div className="container-tight">
        <div className="max-w-2xl mb-12"><p className="reveal text-sm font-semibold uppercase tracking-[0.2em] text-primary">What&apos;s included</p><h2 className="reveal mt-3 font-display text-3xl md:text-4xl font-bold tracking-tight" data-delay="80">Comprehensive maintenance coverage.</h2></div>
        <div className="grid gap-4 sm:grid-cols-2">
          {["Routine updates (twice weekly), backups and plugin maintenance", "Performance reviews and speed tuning", "Content edits and website housekeeping", "Monitoring and support for urgent issues"].map((item, i) => (
            <div key={item} className="reveal flex gap-4 rounded-2xl border border-border bg-card p-6 shadow-card" data-delay={`${i * 70}`}>
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-base leading-relaxed">{item}</p>
            </div>
          ))}
        </div>
      </div></section>

      <section className="py-24"><div className="container-tight"><div className="max-w-2xl mb-12"><p className="reveal text-sm font-semibold uppercase tracking-wider text-primary">Our approach</p><h2 className="reveal mt-3 font-display text-3xl md:text-5xl font-bold tracking-tight" data-delay="80">How we maintain your website.</h2></div>
        <div className="grid gap-6 lg:grid-cols-3">
          {[{ n: "01", t: "Initial health check", d: "We assess the current website state, identify risk areas and prioritise immediate fixes or improvements." }, { n: "02", t: "Proactive maintenance", d: "We keep the site updated, backed up and monitored so issues are caught before they become costly." }, { n: "03", t: "Continuous improvement", d: "As the business evolves, we support content changes, performance improvements and incremental refinements." }].map((step, i) => (
            <div key={step.n} className="reveal rounded-2xl border border-border bg-card p-7 shadow-card" data-delay={`${i * 90}`}><div className="flex items-center justify-between"><div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-brand text-primary-foreground shadow-brand"><Sparkles className="h-5 w-5" /></div><div className="font-display text-4xl font-bold text-primary/30">{step.n}</div></div><h3 className="mt-6 font-display text-2xl font-bold">{step.t}</h3><p className="mt-3 text-muted-foreground leading-relaxed">{step.d}</p></div>
          ))}
        </div></div></section>

      <section className="bg-muted/40 py-24"><div className="container-tight grid gap-8 lg:grid-cols-2">
        <div className="reveal rounded-3xl border border-border bg-card p-8 shadow-card"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Ideal for</p><h3 className="mt-2 font-display text-2xl font-bold">Who benefits most</h3><ul className="mt-6 space-y-5">{["Businesses without an in-house web team", "Websites that need regular updates and protection", "Growing brands that cannot afford downtime or neglected content"].map((item) => (<li key={item} className="flex gap-3"><div className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground"><CheckCircle2 className="h-4 w-4" /></div><p className="text-sm text-muted-foreground">{item}</p></li>))}</ul></div>
        <div className="reveal surface-dark relative overflow-hidden rounded-3xl p-8 md:p-10 shadow-elevated"><div className="absolute inset-0 grid-bg opacity-20" /><div className="relative"><p className="text-xs uppercase tracking-[0.2em] text-primary-glow">Outcomes</p><h3 className="mt-2 font-display text-2xl font-bold text-surface-dark-foreground">Results you can expect</h3><div className="mt-6 space-y-4">{["Greater reliability and lower risk of issues", "Improved speed, uptime and user trust", "Full money-back guarantee & complete freedom to customize"].map((item, i) => (<div key={item} className="flex gap-4 rounded-2xl border border-primary-glow/10 bg-background/5 p-4 backdrop-blur-sm"><div className="font-display text-2xl font-bold text-primary-glow shrink-0 w-10">0{i + 1}</div><p className="text-sm leading-relaxed text-surface-dark-foreground/85 self-center">{item}</p></div>))}</div></div></div>
      </div></section>

      <section className="py-24"><div className="container-tight grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start"><div><p className="reveal text-sm font-semibold uppercase tracking-wider text-primary">FAQ</p><h2 className="reveal mt-3 font-display text-3xl md:text-5xl font-bold tracking-tight" data-delay="80">Common questions about maintenance.</h2></div>
        <Accordion type="single" collapsible className="reveal rounded-2xl border border-border bg-card px-6 shadow-card" data-delay="120">
          {[{ q: "Do you maintain websites you did not build?", a: "Yes. We can take over maintenance for existing websites after an initial audit and cleanup where needed." }, { q: "What happens if the website goes down?", a: "We investigate promptly, restore service where possible and address the cause to reduce repeat issues." }, { q: "Can maintenance include content updates?", a: "Yes. Depending on the plan, we can support regular content edits, uploads and page adjustments." }].map((faq, index) => (<AccordionItem key={faq.q} value={`faq-${index}`}><AccordionTrigger className="text-left font-display text-lg">{faq.q}</AccordionTrigger><AccordionContent className="text-base leading-relaxed text-muted-foreground">{faq.a}</AccordionContent></AccordionItem>))}
        </Accordion></div></section>

      <section className="container-tight pb-24"><div className="surface-dark relative overflow-hidden rounded-3xl p-10 md:p-14 text-center"><div className="absolute inset-0 grid-bg opacity-30" /><ShieldCheck className="relative mx-auto h-12 w-12 text-primary-glow" /><h2 className="relative mt-5 font-display text-3xl md:text-4xl font-bold text-surface-dark-foreground">Need reliable website care?</h2><p className="relative mt-4 text-surface-dark-foreground/75">Let us handle the technical upkeep so you can focus on growing your business.</p><Button asChild variant="hero" size="xl" className="relative mt-8"><Link href="/contact-us">Get a maintenance plan <ArrowRight className="ml-1 h-5 w-5" /></Link></Button></div></section>
    </>
  );
}
