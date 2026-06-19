"use client";
import { useRef, type RefObject } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

export function useHorizontalScroll(): {
  pinRef: RefObject<HTMLDivElement | null>;
  trackRef: RefObject<HTMLDivElement | null>;
} {
  const pinRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const track = trackRef.current;
      const pin = pinRef.current;
      if (!track || !pin) return;
      const mm = gsap.matchMedia();
      mm.add("(min-width: 900px) and (prefers-reduced-motion: no-preference)", () => {
        const getDist = () => track.scrollWidth - window.innerWidth;
        const tween = gsap.to(track, {
          x: () => -getDist(),
          ease: "none",
          scrollTrigger: {
            trigger: pin,
            start: "top top",
            end: () => `+=${getDist()}`,
            scrub: true,
            pin: true,
            invalidateOnRefresh: true,
          },
        });
        return () => {
          tween.scrollTrigger?.kill();
          tween.kill();
        };
      });
      return () => mm.revert();
    },
    { scope: pinRef },
  );

  return { pinRef, trackRef };
}
