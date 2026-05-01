"use client";
import { useState } from "react";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

import { PORTFOLIO } from "@/lib/brand";

const FILTERS = ["All", "Web Development", "SEO", "E-commerce", "WordPress", "Web App"];

const Portfolio = () => {
  const [filter, setFilter] = useState("All");
  const items = filter === "All" ? PORTFOLIO : PORTFOLIO.filter((p) => p.tags.includes(filter));

  return (
    <>


      <section className="surface-dark relative overflow-hidden -mt-16 md:-mt-20 pt-32 pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute top-10 left-0 h-80 w-80 rounded-full bg-primary/30 blur-3xl animate-blob" />
        <div className="container-tight relative">
          <p className="reveal text-sm font-semibold uppercase tracking-[0.25em] text-primary-glow">Portfolio</p>
          <h1 className="reveal mt-4 font-display text-4xl md:text-6xl font-bold tracking-tight max-w-3xl" data-delay="80">
            A snapshot of our <span className="text-gradient">recent work.</span>
          </h1>
          <p className="reveal mt-6 text-lg text-surface-dark-foreground/75 max-w-2xl" data-delay="160">
            Brands we've helped launch, scale and grow online.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container-tight">
          <div className="flex flex-wrap gap-2 mb-10">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-smooth ${filter === f
                    ? "bg-gradient-brand text-primary-foreground shadow-brand"
                    : "bg-muted text-foreground/70 hover:bg-accent"
                  }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((p, i) => {
              const screenshot = p.image || `https://image.thum.io/get/width/800/crop/600/noanimate/${p.url}`;
              return (
                <a
                  key={p.name}
                  href={p.url}
                  target="_blank"
                  rel="noopener"
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-b from-card to-muted/30 shadow-card hover:shadow-brand hover:border-primary/50 hover:-translate-y-1 transition-all duration-500 animate-scale-in"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted border-b border-border/50">
                    <img
                      src={screenshot}
                      alt={`${p.name} website screenshot — project by Johnnybits`}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                      onError={(e) => {
                        const img = e.currentTarget;
                        img.style.display = "none";
                        img.parentElement?.classList.add("bg-gradient-brand");
                      }}
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
                      <ExternalLink className="h-4 w-4" />
                    </div>
                    <div className="font-display text-xl font-bold text-foreground group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-primary-glow transition-all duration-300">{p.name}</div>
                    <div className="mt-4 text-sm font-medium text-muted-foreground inline-flex items-center gap-1.5 group-hover:text-foreground transition-colors">
                      Visit live site <ExternalLink className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container-tight pb-24">
        <div className="surface-dark relative overflow-hidden rounded-3xl p-10 md:p-14 text-center">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <h2 className="relative font-display text-3xl md:text-4xl font-bold text-surface-dark-foreground">Your project could be next.</h2>
          <Button asChild variant="hero" size="xl" className="relative mt-8">
            <Link href="/contact">Let's talk <ArrowRight className="ml-1 h-5 w-5" /></Link>
          </Button>
        </div>
      </section>
    </>
  );
};

export default Portfolio;
