"use client";
import { useState } from "react";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

import { PORTFOLIO } from "@/lib/brand";

const FILTERS = ["All", "Web Development", "SEO", "E-commerce", "Web App"];

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
                className={`px-4 py-2 rounded-full text-sm font-medium transition-smooth ${
                  filter === f
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
              const screenshot = `https://image.thum.io/get/width/800/crop/600/noanimate/${p.url}`;
              return (
                <a
                  key={p.name}
                  href={p.url}
                  target="_blank"
                  rel="noopener"
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-card hover:shadow-elevated hover:-translate-y-1 transition-smooth animate-scale-in flex flex-col"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    <img
                      src={screenshot}
                      alt={`${p.name} website screenshot — project by Johnnybits`}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        const img = e.currentTarget;
                        img.style.display = "none";
                        img.parentElement?.classList.add("bg-gradient-brand");
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-dark/80 via-surface-dark/20 to-transparent opacity-90 group-hover:opacity-70 transition-smooth" />
                    <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-1.5">
                      {p.tags.map((t) => (
                        <span key={t} className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-background/80 text-foreground backdrop-blur">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="font-display text-xl font-bold text-foreground">{p.name}</div>
                    <div className="mt-2 text-sm text-muted-foreground inline-flex items-center gap-1.5 group-hover:text-primary group-hover:translate-x-1 transition-all">
                      Visit live site <ExternalLink className="h-4 w-4" />
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
