"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NAV_LINKS, BRAND, SERVICES } from "@/lib/brand";
import { cn } from "@/lib/utils";

export const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-smooth",
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border/60 shadow-sm"
          : "bg-transparent"
      )}
    >
      <div className="container-tight flex h-16 md:h-24 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group" aria-label={BRAND.name}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/johnnybits-logo.png"
            alt={`${BRAND.name} logo`}
            className="h-12 md:h-16 w-auto transition-all group-hover:scale-105"
          />
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((l) => {
            const isActive = pathname === l.to || (l.label === "Services" && pathname.startsWith("/services"));

            if (l.label === "Services") {
              return (
                <div key={l.to} className="relative group">
                  <Link
                    href={l.to}
                    className={cn(
                      "px-4 py-2 text-sm font-medium rounded-full transition-smooth relative flex items-center gap-1.5",
                      scrolled
                        ? isActive ? "text-primary-deep" : "text-foreground/70 hover:text-foreground"
                        : isActive ? "text-surface-dark-foreground" : "text-surface-dark-foreground/80 hover:text-surface-dark-foreground"
                    )}
                  >
                    {l.label}
                    <ChevronDown className="h-3.5 w-3.5 opacity-70 group-hover:rotate-180 transition-transform duration-300" />
                    {isActive && (
                      <span className="absolute inset-x-4 -bottom-0.5 h-0.5 bg-gradient-brand rounded-full" />
                    )}
                  </Link>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[340px] bg-card rounded-2xl border border-border shadow-elevated opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 flex flex-col p-2.5 translate-y-2 group-hover:translate-y-0">
                    {SERVICES.map((s) => (
                      <Link 
                        key={s.slug} 
                        href={`/services/${s.slug}`} 
                        className="px-4 py-3 rounded-xl transition-colors flex flex-col gap-1 hover:bg-muted/60"
                      >
                        <span className="text-sm font-bold text-foreground">{s.title}</span>
                        <span className="text-[11px] font-medium text-muted-foreground line-clamp-1">{s.short}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={l.to}
                href={l.to}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-full transition-smooth relative",
                  scrolled
                    ? isActive
                      ? "text-primary-deep"
                      : "text-foreground/70 hover:text-foreground"
                    : isActive
                      ? "text-surface-dark-foreground"
                      : "text-surface-dark-foreground/80 hover:text-surface-dark-foreground"
                )}
              >
                {l.label}
                {isActive && (
                  <span className="absolute inset-x-4 -bottom-0.5 h-0.5 bg-gradient-brand rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:block">
          <Button asChild variant="brand" size="sm">
            <Link href="/contact">
              Get a quote <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <button
          className={cn(
            "lg:hidden p-2 -mr-2",
            scrolled ? "text-foreground" : "text-surface-dark-foreground"
          )}
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border bg-background/95 backdrop-blur-xl animate-fade-in max-h-[85vh] overflow-y-auto">
          <nav className="container-tight py-4 flex flex-col gap-1">
            {NAV_LINKS.map((l) => {
              const isActive = pathname === l.to || (l.label === "Services" && pathname.startsWith("/services"));

              if (l.label === "Services") {
                return (
                  <div key={l.to} className="flex flex-col gap-1">
                    <div className={cn(
                      "flex items-center justify-between rounded-lg transition-colors",
                      isActive ? "bg-accent text-accent-foreground" : "text-foreground/80 hover:bg-muted/50"
                    )}>
                      <Link href={l.to} className="px-3 py-3 flex-1 font-medium">{l.label}</Link>
                      <button 
                        onClick={(e) => { e.preventDefault(); setMobileServicesOpen(!mobileServicesOpen); }}
                        className="px-4 py-3"
                        aria-label="Toggle services menu"
                      >
                        <ChevronDown className={cn("h-5 w-5 transition-transform duration-300", mobileServicesOpen ? "rotate-180" : "")} />
                      </button>
                    </div>
                    {mobileServicesOpen && (
                      <div className="flex flex-col gap-1 pl-4 border-l-2 border-border/60 ml-3 mt-1 mb-2 animate-accordion-down overflow-hidden">
                        {SERVICES.map((s) => (
                          <Link
                            key={s.slug}
                            href={`/services/${s.slug}`}
                            className={cn(
                              "px-3 py-2.5 rounded-lg text-sm transition-colors",
                              pathname === `/services/${s.slug}` ? "bg-primary/10 text-primary font-bold" : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
                            )}
                          >
                            {s.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={l.to}
                  href={l.to}
                  className={cn(
                    "px-3 py-3 rounded-lg font-medium transition-colors",
                    isActive ? "bg-accent text-accent-foreground" : "text-foreground/80 hover:bg-muted/50"
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
            <Button asChild variant="brand" className="mt-4 mb-2">
              <Link href="/contact">Get a quote</Link>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
};
