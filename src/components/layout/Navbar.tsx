"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NAV_LINKS, BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

export const Navbar = () => {
  const [open, setOpen] = useState(false);
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
      <div className="container-tight flex h-16 md:h-20 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group" aria-label={BRAND.name}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/johnnybits-logo.png"
            alt={`${BRAND.name} logo`}
            className="h-10 md:h-16 w-auto transition-all group-hover:scale-105"
          />
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((l) => {
            const isActive = pathname === l.to;
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
        <div className="lg:hidden border-t border-border bg-background/95 backdrop-blur-xl animate-fade-in">
          <nav className="container-tight py-4 flex flex-col gap-1">
            {NAV_LINKS.map((l) => {
              const isActive = pathname === l.to;
              return (
                <Link
                  key={l.to}
                  href={l.to}
                  className={cn(
                    "px-3 py-3 rounded-lg font-medium",
                    isActive ? "bg-accent text-accent-foreground" : "text-foreground/80"
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
            <Button asChild variant="brand" className="mt-2">
              <Link href="/contact">Get a quote</Link>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
};
