"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, useCarousel, type CarouselApi } from "@/components/ui/carousel";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

import { CarouselDots } from "@/components/CarouselDots";

export const PortfolioCarousel = ({ items }: { items: any[] }) => {
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

  // Group items into pairs for the 2-row grid per slide
  const groupedItems = [];
  for (let i = 0; i < items.length; i += 2) {
    groupedItems.push(items.slice(i, i + 2));
  }

  return (
    <div className="md:hidden mt-8 relative px-2 sm:px-10">
      <Carousel setApi={setApi} opts={{ align: "start", loop: false }} className="w-full">
        <CarouselContent className="-ml-4">
          {groupedItems.map((group, groupIndex) => (
            <CarouselItem key={groupIndex} className="pl-4 basis-full">
              <div className="flex flex-col gap-5 h-full">
                {group.map((p: any, i: number) => {
                  const screenshot = p.image || `https://image.thum.io/get/width/800/crop/600/noanimate/${p.url}`;
                  return (
                    <a
                      key={p.name}
                      href={p.url}
                      target="_blank"
                      rel="noopener"
                      className="reveal group flex flex-col h-full overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-b from-card to-muted/30 shadow-card hover:shadow-brand hover:border-primary/50 transition-all duration-500"
                    >
                      <div className="relative aspect-[16/10] overflow-hidden bg-muted border-b border-border/50 shrink-0">
                        <Image
                          src={screenshot}
                          alt={`${p.name} website screenshot`}
                          loading="lazy"
                          className="absolute inset-0 h-full w-full object-cover object-top"
                          width={600}
                          height={800}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-1.5 z-10">
                          {p.tags.slice(0, 3).map((t: string) => (
                            <span key={t} className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gradient-brand text-white shadow-md border border-white/20">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col flex-1 p-5 relative bg-card">
                        <div className="absolute top-0 right-5 -translate-y-1/2 w-10 h-10 bg-gradient-brand rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 group-hover:-translate-y-6 transition-all duration-500 shadow-glow">
                          <ArrowRight className="h-5 w-5 -rotate-45" />
                        </div>
                        <div className="font-display text-lg font-bold text-foreground line-clamp-1">{p.name}</div>
                        <div className="mt-2 text-sm font-medium text-primary inline-flex items-center gap-1.5">
                          Visit site <ArrowRight className="h-3 w-3" />
                        </div>
                      </div>
                    </a>
                  );
                })}
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
