"use client";

import { useRef } from "react";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";

/**
 * Masked line-by-line reveal on scroll. Children that should animate get a
 * `data-lines` attribute. Without JS or with reduced motion the text is
 * simply visible — the animation is a `from` tween, so the resting state
 * is the final state.
 */
export default function RevealLines({
  children,
  className,
  start = "top 75%",
}: {
  children: React.ReactNode;
  className?: string;
  start?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const targets = ref.current!.querySelectorAll("[data-lines]");
        if (!targets.length) return;
        const split = SplitText.create(targets, {
          type: "lines",
          mask: "lines",
          autoSplit: true,
        });
        gsap.from(split.lines, {
          yPercent: 115,
          duration: 0.9,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: ref.current, start },
        });
        return () => split.revert();
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
