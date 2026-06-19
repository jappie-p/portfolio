"use client";
import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useJourney } from "@/lib/store";
import { prefersReducedMotion } from "@/lib/motion";

export function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (prefersReducedMotion()) return; // native scroll; rig falls back to vertical
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    const setScroll = useJourney.getState().setScroll;
    lenis.on("scroll", (e: { scroll: number; limit: number; velocity: number }) => {
      setScroll(e.limit ? e.scroll / e.limit : 0, e.velocity);
      ScrollTrigger.update();
    });
    const raf = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);
  return <>{children}</>;
}
