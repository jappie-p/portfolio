"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

const MANIFESTO = [
  "I build systems that run.",
  "Nineteen. Dutch. Self-taught, with AI as my co-builder.",
  "A hosting platform with paying customers.",
  "An AI assistant that manages my day.",
  "Servers, security and automations I run myself.",
  "What follows is the proof.",
] as const;

export default function V2Manifesto() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const root = ref.current;
        if (!root) return () => {};

        const lines = gsap.utils.toArray<HTMLElement>(".mf-line", root);
        const bars = lines.map((line) =>
          line.querySelector<HTMLElement>(".mf-bar")
        );
        const caption = root.querySelector<HTMLElement>(".mf-caption");

        // Initial states (JS-gated only, so no-JS / reduced-motion stays static)
        gsap.set(lines, { opacity: 0.25, x: -20 });
        gsap.set(bars, { scaleY: 0, transformOrigin: "top center" });
        if (caption) gsap.set(caption, { opacity: 0, y: 14 });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: "+=350%",
            pin: true,
            scrub: 1,
            anticipatePin: 1,
          },
        });

        // One unit per line, evenly spread; ~10% tail for the finale.
        lines.forEach((line, i) => {
          tl.to(line, { opacity: 1, x: 0, duration: 0.5, ease: "none" }, i);
          const bar = bars[i];
          if (bar) {
            tl.to(bar, { scaleY: 1, duration: 0.5, ease: "none" }, i);
          }
          if (i > 0) {
            const prev = lines[i - 1];
            const prevBar = bars[i - 1];
            tl.to(prev, { opacity: 0.45, duration: 0.5, ease: "none" }, i);
            if (prevBar) {
              tl.to(prevBar, { scaleY: 0, duration: 0.5, ease: "none" }, i);
            }
          }
        });

        // Finale: line 6 holds full bone, the rest sink to 0.15, caption rises.
        const finaleAt = lines.length;
        tl.to(
          lines.slice(0, -1),
          { opacity: 0.15, duration: 0.7, ease: "none" },
          finaleAt
        );
        if (caption) {
          tl.to(
            caption,
            { opacity: 1, y: 0, duration: 0.7, ease: "none" },
            finaleAt
          );
        }

        return () => {};
      });
    },
    { scope: ref }
  );

  return (
    <section id="v2-manifesto" ref={ref} className="relative">
      <div className="flex min-h-screen items-center justify-center px-6 md:px-12">
        <div className="w-full max-w-4xl">
          <div className="flex flex-col gap-[1.7vw]">
            {MANIFESTO.map((line, i) => (
              <p
                key={line}
                className={`mf-line headline relative pl-5 leading-[1.05] md:pl-10 ${
                  i === 0
                    ? "text-[4.6vw] text-ember"
                    : "text-[3.05vw] text-bone"
                }`}
              >
                <span
                  aria-hidden
                  className="mf-bar absolute left-0 top-0 h-full w-[3px] bg-ember"
                />
                {line}
              </p>
            ))}
          </div>
          <p className="mf-caption mt-14 pl-5 font-mono text-xs tracking-widest text-bone-faint md:pl-10 md:text-sm">
            scroll — every pixel of this site is driven by it
          </p>
        </div>
      </div>
    </section>
  );
}
