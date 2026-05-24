"use client";

import React, { useState, useEffect, useCallback } from "react";
import { type CarouselApi } from "@/components/ui/carousel";

export const CarouselDots = ({ api, className = "mt-6" }: { api: CarouselApi | null, className?: string }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onInit = useCallback((api: CarouselApi) => {
    if (!api) return;
    setScrollSnaps(api.scrollSnapList());
  }, []);

  const onSelect = useCallback((api: CarouselApi) => {
    if (!api) return;
    setSelectedIndex(api.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!api) return;

    onInit(api);
    onSelect(api);
    api.on("reInit", onInit);
    api.on("reInit", onSelect);
    api.on("select", onSelect);

    return () => {
      api.off("reInit", onInit);
      api.off("reInit", onSelect);
      api.off("select", onSelect);
    };
  }, [api, onInit, onSelect]);

  if (scrollSnaps.length <= 1) return null;

  return (
    <div className={`flex justify-center items-center gap-2 ${className}`}>
      {scrollSnaps.map((_, index) => (
        <button
          key={index}
          onClick={() => api?.scrollTo(index)}
          className={`h-2 rounded-full transition-all duration-300 ${
            index === selectedIndex ? "w-6 bg-primary" : "w-2 bg-primary/20 hover:bg-primary/50"
          }`}
          aria-label={`Go to slide ${index + 1}`}
        />
      ))}
    </div>
  );
};
