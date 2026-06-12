"use client";

import { useRef } from "react";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { useJourney } from "@/lib/store";
import { story } from "@/data/story";
import ScrambleLabel from "@/components/ui/ScrambleLabel";

export default function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const loaded = useJourney((s) => s.loaded);

  useGSAP(
    () => {
      if (!loaded) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const split = SplitText.create(".hero-name", {
          type: "chars",
          mask: "chars",
        });
        gsap.from(split.chars, {
          yPercent: 110,
          duration: 1.1,
          stagger: 0.035,
          ease: "power4.out",
          delay: 0.1,
        });
        gsap.from(".hero-fade", {
          opacity: 0,
          y: 14,
          duration: 0.9,
          stagger: 0.12,
          delay: 0.9,
        });
        return () => split.revert();
      });
    },
    { scope: ref, dependencies: [loaded] }
  );

  return (
    <div
      ref={ref}
      className="sticky top-0 flex h-screen flex-col justify-center px-6 md:px-14"
    >
      <p className="hero-fade mb-6 font-mono text-xs uppercase tracking-[0.3em] text-ember">
        portfolio — 2026
      </p>
      <h1 className="headline text-bone" style={{ fontSize: "clamp(4rem, 16.5vw, 15rem)" }}>
        <span className="hero-name block">{story.hero.name[0]}</span>
        <span className="hero-name headline-outline block">
          {story.hero.name[1]}
        </span>
      </h1>
      <div className="hero-fade mt-8 flex items-end justify-between">
        <p className="max-w-xs text-lg text-bone-dim">{story.hero.tagline}</p>
        <div className="hidden flex-col items-end gap-1 font-mono text-xs uppercase tracking-[0.25em] text-bone-faint md:flex">
          {story.hero.meta.map((m) => (
            <ScrambleLabel key={m} text={m} />
          ))}
        </div>
      </div>
      <div className="hero-fade absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.4em] text-bone-faint">
        {story.hero.hint}
        <span className="ml-2 inline-block animate-pulse text-ember">▾</span>
      </div>
    </div>
  );
}
