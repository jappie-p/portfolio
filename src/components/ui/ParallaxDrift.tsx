"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

/**
 * Drifts its children vertically across the lifetime of the enclosing
 * <section>, so pinned chapter content moves against the world instead of
 * sitting frozen. Reduced motion: no drift.
 */
export default function ParallaxDrift({
  children,
  from = 70,
  to = -70,
  className,
}: {
  children: React.ReactNode;
  from?: number;
  to?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ref.current,
          { y: from },
          {
            y: to,
            ease: "none",
            scrollTrigger: {
              trigger: ref.current!.closest("section"),
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          }
        );
      });
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
