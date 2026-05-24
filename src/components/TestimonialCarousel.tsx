"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { CarouselDots } from "@/components/CarouselDots";

const TESTIMONIALS = [
  { q: "Johnnybits redesigned our website and our leads tripled within 3 months. Worth every Naira.", n: "Adebayo O.", r: "CEO, Lagos retail brand" },
  { q: "Smooth process, beautiful design and an SEO strategy that actually moved us to page 1 of Google.", n: "Chinwe E.", r: "Founder, fashion startup" },
  { q: "The team is responsive, creative and deeply technical. Easily the best agency I've worked with in Nigeria.", n: "Femi A.", r: "MD, real estate firm" },
];

export const TestimonialCarousel = () => {
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [canScroll, setCanScroll] = useState(false);

  const onSelect = useCallback((api: CarouselApi) => {
    if (!api) return;
    setCanScroll(api.canScrollPrev() || api.canScrollNext());
  }, []);

  useEffect(() => {
    if (!api) return;

    onSelect(api);
    api.on("reInit", onSelect);
    api.on("select", onSelect);

    return () => {
      api.off("reInit", onSelect);
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

  return (
    <div className="relative">
      <Carousel setApi={setApi} opts={{ align: "start", loop: false }} className="w-full">
        <CarouselContent className="-ml-4">
          {TESTIMONIALS.map((t, i) => (
            <CarouselItem key={t.n} className="pl-4 basis-[90%] md:basis-1/2 lg:basis-1/3">
              <div 
                className="reveal rounded-2xl bg-card border border-border p-7 shadow-card h-full flex flex-col" 
                data-delay={`${i * 80}`}
              >
                <div className="text-primary text-2xl">★★★★★</div>
                <p className="mt-4 leading-relaxed flex-grow">"{t.q}"</p>
                <div className="mt-5 pt-5 border-t border-border">
                  <div className="font-semibold">{t.n}</div>
                  <div className="text-sm text-muted-foreground">{t.r}</div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Navigation and Pagination Container - Nicer, safer placement */}
        {canScroll && (
          <div className="flex items-center justify-center gap-8 mt-8">
            <CarouselPrevious className="static translate-y-0 translate-x-0 h-10 w-10 border-border/50 bg-card shadow-sm hover:bg-muted hover:border-primary/50 transition-colors" />
            <CarouselDots api={api} className="mb-0" />
            <CarouselNext className="static translate-y-0 translate-x-0 h-10 w-10 border-border/50 bg-card shadow-sm hover:bg-muted hover:border-primary/50 transition-colors" />
          </div>
        )}
      </Carousel>
    </div>
  );
};
