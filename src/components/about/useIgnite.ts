"use client";
import { useEffect, type RefObject } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * Draws stars in once per visit. Once scripts run the element is armed
 * (`data-sky="armed"`: lines untraced, stars dark), and the first time enough
 * of it is on screen it lights (`data-sky="lit"`) and the CSS plays the
 * draw-in. Reduced motion lights it at once; without scripts nothing is
 * hidden. Data attributes only, so React never re-renders for it.
 */
export function useIgnite(ref: RefObject<HTMLElement | null>, threshold = 0.45) {
  useEffect(() => {
    const el = ref.current;
    if (!el || el.dataset.sky === "lit") return;
    if (prefersReducedMotion()) {
      el.dataset.sky = "lit";
      return;
    }
    el.dataset.sky = "armed";
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting && e.intersectionRatio >= threshold)) return;
        el.dataset.sky = "lit";
        io.disconnect();
      },
      { threshold: [threshold] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold]);
}
