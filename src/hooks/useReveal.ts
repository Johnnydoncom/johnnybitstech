import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Adds .in class to elements with .reveal as they enter viewport. */
export function useReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal");
    const isVisible = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      return rect.top < window.innerHeight - 40 && rect.bottom > 0;
    };

    els.forEach((el) => {
      el.classList.remove("in");
      el.style.transitionDelay = "0ms";
    });

    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const el = e.target as HTMLElement;
            const delay = el.dataset.delay ?? "0";
            el.style.transitionDelay = `${delay}ms`;
            el.classList.add("in");
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    requestAnimationFrame(() => {
      els.forEach((el) => {
        if (isVisible(el)) {
          const delay = el.dataset.delay ?? "0";
          el.style.transitionDelay = `${delay}ms`;
          el.classList.add("in");
          return;
        }

        io.observe(el);
      });
    });

    return () => io.disconnect();
  }, [pathname]);
}
