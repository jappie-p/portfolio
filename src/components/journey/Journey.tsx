"use client";

import { useRef } from "react";
import { CHAPTERS } from "@/lib/journey-math";
import { useJourney } from "@/lib/store";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import Hero from "./Hero";
import Dream from "./Dream";
import Turn from "./Turn";
import Work from "./Work";
import Craft from "./Craft";
import Contact from "./Contact";

const CHAPTER_COMPONENTS: Record<string, React.ComponentType> = {
  hero: Hero,
  dream: Dream,
  turn: Turn,
  work: Work,
  craft: Craft,
  contact: Contact,
};

export default function Journey() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Chapter state must stay correct even under reduced motion — this is
      // wiring, not visual choreography, so no gsap.matchMedia gate here.
      ScrollTrigger.create({
        trigger: ref.current,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) =>
          useJourney.getState().setScroll(self.progress, self.getVelocity()),
      });

      // Velocity skew: fast scrolling shears the whole journey a fraction of
      // a degree, snapping back as it settles. Sticky children are fine with
      // a transformed ancestor; only position:fixed would break (none here).
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const skewTo = gsap.quickTo(ref.current, "skewY", {
          duration: 0.6,
          ease: "power3",
        });
        const st = ScrollTrigger.create({
          onUpdate: (self) => {
            const v = Math.max(-0.55, Math.min(0.55, self.getVelocity() / -3500));
            skewTo(v);
          },
        });
        return () => st.kill();
      });
    },
    { scope: ref }
  );

  return (
    <main ref={ref} className="relative">
      {CHAPTERS.map(({ id, weight }) => {
        const Chapter = CHAPTER_COMPONENTS[id];
        return (
          <section
            key={id}
            id={id}
            style={{ height: `${weight * 100}vh` }}
            className="relative"
          >
            <Chapter />
          </section>
        );
      })}
    </main>
  );
}
