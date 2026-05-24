import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Heart, Target, Lightbulb, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { constructMetadata } from "@/lib/seo";
import { SEPARATOR, SITE_NAME, SITE_URL } from "@/config/site";


const SEO_TITLE = "About Us" + SEPARATOR + "Creative Web Design Company in Nigeria" + SEPARATOR + SITE_NAME;
const SEO_DESCRIPTION = "Johnnybits Technology is a leading Nigerian software development and digital marketing agency. We build digital experiences that move the needle for businesses across Nigeria.";
const SEO_KEYWORDS = [
  "Web Design Company in Nigeria",
  "Web Designers in Nigeria",
  "Corporate Web Design in Nigeria",
  "Professional Web Design in Nigeria",
  "Best Web Design Company in Nigeria",
  "Website Design in Nigeria",
  "Web Development in Nigeria",
  "Digital Marketing in Nigeria",
  "Best Digital Marketing Company in Nigeria",
  "Best Software Development Company in Nigeria",
  "Best Branding Agency in Nigeria",
  "Best Graphics Design Company in Nigeria",
  "Best Logo Design Company in Nigeria",
  "Best UI/UX Design Company in Nigeria",
  "Best E-commerce Development Company in Nigeria",
  "Best Mobile App Development Company in Nigeria",
  "Best Digital Transformation Company in Nigeria",
  "Best IT Solutions Company in Nigeria",
  "Best Software Company in Nigeria",
];
const CANONICAL_URL = `${SITE_URL}/about-the-web-design-company`;

export const metadata = constructMetadata({
  title: SEO_TITLE,
  description: SEO_DESCRIPTION,
  canonicalUrl: CANONICAL_URL,
  keywords: SEO_KEYWORDS
});

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "AboutPage",
            "name": SEO_TITLE,
            "description": SEO_DESCRIPTION,
            "url": CANONICAL_URL,
            "keywords": SEO_KEYWORDS,
          })
        }}
      />

      <section className="surface-dark relative overflow-hidden -mt-16 md:-mt-20 pt-32 pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute top-10 right-0 h-80 w-80 rounded-full bg-primary-glow/20 blur-3xl animate-blob" />
        <div className="container-tight relative">
          <p className="reveal text-sm font-semibold uppercase tracking-[0.25em] text-primary-glow">About us</p>
          <h1 className="reveal mt-4 font-display text-4xl md:text-6xl font-bold tracking-tight max-w-3xl" data-delay="80">
            We help Nigerian brands <span className="text-gradient">stand out online.</span>
          </h1>
          <p className="reveal mt-6 text-lg text-surface-dark-foreground/75 max-w-2xl" data-delay="160">
            Registered in Lagos but based in Ibadan, Johnnybits Technology is a team of designers, engineers and marketers obsessed with building digital experiences that actually move the needle for businesses across Nigeria.
          </p>
        </div>
      </section>

      <section className="py-24 overflow-hidden">
        <div className="container-tight">
          <div className="grid gap-14 lg:grid-cols-12 items-center">
            <div className="lg:col-span-6">
              <h2 className="reveal font-display text-3xl md:text-4xl font-bold tracking-tight">Our story</h2>
              <div className="reveal mt-6 space-y-5 text-muted-foreground leading-relaxed text-lg" data-delay="80">
                <p>
                  Johnnybits Technology started in 2019 with a simple, yet powerful belief: Nigerian and African businesses deserve world-class digital products. Registered in Lagos but based in Ibadan, our <Link href="/corporate-web-design-nigeria" className="text-foreground font-semibold hover:text-primary transition-colors underline underline-offset-4 decoration-primary/50 hover:decoration-primary">web design company</Link> has grown into a full-service digital agency delivering high-performance <Link href="/corporate-web-design-nigeria" className="text-foreground font-semibold hover:text-primary transition-colors underline underline-offset-4 decoration-primary/50 hover:decoration-primary">corporate web design</Link>, <Link href="/ecommerce-web-development" className="text-foreground font-semibold hover:text-primary transition-colors underline underline-offset-4 decoration-primary/50 hover:decoration-primary">e-commerce development</Link>, and <Link href="/search-engine-optimization-seo" className="text-foreground font-semibold hover:text-primary transition-colors underline underline-offset-4 decoration-primary/50 hover:decoration-primary">SEO services</Link> to clients across Nigeria, Germany, Canada, and the UK.
                </p>
                <p>
                  We blend data-driven strategy, stunning UI/UX design, and robust software engineering to ship websites and marketing campaigns that do more than just look beautiful — they convert visitors into loyal customers. Whether you're a startup seeking an MVP <Link href="/mobile-apps-development" className="text-foreground font-semibold hover:text-primary transition-colors underline underline-offset-4 decoration-primary/50 hover:decoration-primary">mobile app</Link> or an enterprise reimagining your corporate identity, we are the reliable digital partner built to help you scale.
                </p>
                <p className="text-sm font-medium pt-2 text-foreground/80">
                  Johnnybits Technology is a registered company under the Corporate Affairs Commission (CAC) with registration number: <span className="text-primary font-bold">BN 2769011</span>.
                </p>
              </div>
            </div>
            <div className="lg:col-span-6 reveal relative" data-delay="120">
              <div className="absolute -inset-4 bg-gradient-brand opacity-20 blur-2xl rounded-3xl" />
              <div className="relative aspect-video lg:aspect-[4/3] rounded-2xl overflow-hidden border border-border shadow-2xl">
                <Image
                  src="/assets/about-us-team.png"
                  alt="Johnnybits Technology web design team collaborating in our modern office in Ibadan, Nigeria"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              </div>
            </div>
          </div>
          
          <div className="mt-20 reveal relative" data-delay="200">
            <div className="absolute -inset-8 bg-gradient-brand opacity-10 blur-3xl rounded-full" />
            <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { k: "5+", v: "Years in business" },
                { k: "80+", v: "Projects delivered" },
                { k: "12+", v: "Industries served" },
                { k: "4", v: "Countries reached" },
              ].map((s) => (
                <div key={s.v} className="rounded-2xl bg-card border border-border p-6 shadow-card text-center">
                  <div className="text-4xl font-display font-bold text-gradient">{s.k}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-muted/40 py-24">
        <div className="container-tight">
          <div className="max-w-2xl mb-14">
            <p className="reveal text-sm font-semibold uppercase tracking-wider text-primary">What drives us</p>
            <h2 className="reveal mt-3 font-display text-3xl md:text-5xl font-bold tracking-tight" data-delay="80">Our values.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              { i: Heart, t: "Craft", d: "We sweat the details so your brand looks every bit as good as it deserves." },
              { i: Target, t: "Results", d: "Pretty pixels matter — but only when they ship leads, sales and growth." },
              { i: Lightbulb, t: "Curiosity", d: "We love exploring new tech, frameworks and platforms to give you an edge." },
              { i: Trophy, t: "Partnership", d: "We treat your business like ours — invested for the long term." },
            ].map((v, i) => (
              <div key={v.t} className="reveal rounded-2xl bg-card p-7 border border-border shadow-card hover:-translate-y-1 transition-smooth" data-delay={`${i * 80}`}>
                <div className="grid place-items-center h-12 w-12 rounded-xl bg-gradient-brand text-primary-foreground shadow-brand">
                  <v.i className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-display text-xl font-bold">{v.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{v.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-tight py-16">
        <div className="surface-dark relative overflow-hidden rounded-3xl p-10 md:p-16">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="relative max-w-2xl">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-surface-dark-foreground">Let's build something great together.</h2>
            <p className="mt-4 text-surface-dark-foreground/75 text-lg">Registered in Lagos but based in Ibadan, working with clients worldwide.</p>
            <Button asChild variant="hero" size="xl" className="mt-8">
              <Link href="/contact-us">Start a conversation <ArrowRight className="ml-1 h-5 w-5" /></Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
