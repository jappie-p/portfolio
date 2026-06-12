"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

export default function ScrambleLabel({
  text,
  className,
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to(ref.current, {
          duration: 1.1,
          delay,
          scrambleText: {
            text,
            chars: "upperCase",
            speed: 0.4,
          },
          scrollTrigger: { trigger: ref.current, start: "top 90%" },
        });
      });
    },
    { scope: ref }
  );

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}
