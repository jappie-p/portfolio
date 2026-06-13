"use client";

import { useRef } from "react";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { story } from "@/data/story";
import { skills, stats } from "@/data/skills";

export default function V2Craft() {
  const sectionRef = useRef<HTMLElement>(null);
  const numRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const root = sectionRef.current;
        if (!root) return () => {};

        const headingEl = root.querySelector(".craft-heading");
        const split = headingEl
          ? SplitText.create(headingEl, { type: "words", mask: "words" })
          : null;

        // Counters start at 0 while scrubbing (JSX holds final values for the
        // static / no-JS / reduced-motion fallback).
        numRefs.current.forEach((el, i) => {
          if (el) el.textContent = `0${stats[i].suffix}`;
        });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: "+=250%",
            pin: true,
            scrub: 1,
            anticipatePin: 1,
          },
        });

        // 0 → 0.1: header
        tl.from(
          ".craft-label",
          { opacity: 0, y: 14, duration: 0.06, ease: "none" },
          0
        );
        if (split) {
          tl.from(
            split.words,
            { yPercent: 110, stagger: 0.012, duration: 0.08, ease: "power1.out" },
            0
          );
        }
        tl.from(
          ".craft-sub",
          { opacity: 0, y: 14, duration: 0.06, ease: "none" },
          0.04
        );

        // 0.08 → 0.6: skill rows wipe in one-by-one
        const rows = gsap.utils.toArray<HTMLElement>(".craft-row", root);
        rows.forEach((row, i) => {
          tl.fromTo(
            row,
            { clipPath: "inset(0 100% 0 0)", opacity: 0 },
            {
              clipPath: "inset(0 0% 0 0)",
              opacity: 1,
              duration: 0.14,
              ease: "none",
            },
            0.08 + i * 0.09
          );
        });

        // AI row (index 2): items line decodes via scrambleText as it wipes in
        const aiItems =
          skills.find((s) => s.cluster === "AI")?.items.join(" · ") ?? "";
        tl.to(
          ".craft-ai-items",
          {
            scrambleText: { text: aiItems, chars: "upperCase", speed: 0.3 },
            duration: 0.18,
            ease: "none",
          },
          0.26
        );

        // 0.62 → 1: stats fly in big + scrub-driven count-up
        tl.fromTo(
          ".craft-stat",
          { yPercent: 70, opacity: 0, scale: 0.85 },
          {
            yPercent: 0,
            opacity: 1,
            scale: 1,
            duration: 0.18,
            stagger: 0.05,
            ease: "power1.out",
          },
          0.62
        );
        stats.forEach((s, i) => {
          const counter = { v: 0 };
          tl.to(
            counter,
            {
              v: s.value,
              duration: 0.34,
              ease: "none",
              onUpdate: () => {
                const el = numRefs.current[i];
                if (el) el.textContent = `${Math.round(counter.v)}${s.suffix}`;
              },
            },
            0.62
          );
        });

        // settle beat before unpin
        tl.to({}, { duration: 0.04 }, 0.96);

        return () => {
          split?.revert();
          numRefs.current.forEach((el, i) => {
            if (el) el.textContent = `${stats[i].value}${stats[i].suffix}`;
          });
        };
      });
    },
    { scope: sectionRef }
  );

  return (
    <section
      id="v2-craft"
      ref={sectionRef}
      className="relative flex h-screen flex-col justify-center gap-[4vh] overflow-hidden px-[6vw]"
    >
      <header>
        <p className="craft-label font-mono text-xs uppercase tracking-[0.3em] text-ember">
          {story.craft.label}
        </p>
        <h2 className="craft-heading headline mt-3 text-[6vw] leading-[0.95] text-bone">
          {story.craft.heading}
        </h2>
        <p className="craft-sub mt-4 max-w-xl text-sm text-bone-dim md:text-base">
          {story.craft.sub}
        </p>
      </header>

      <div>
        {skills.map((s) => {
          const isAI = s.cluster === "AI";
          return (
            <div
              key={s.cluster}
              className="craft-row flex items-baseline justify-between gap-8 border-t border-stone py-[2.2vh] last:border-b md:py-[2.6vh]"
            >
              <h3
                className={`headline text-[4vw] leading-none ${
                  isAI ? "text-ember" : "text-bone"
                }`}
              >
                {s.cluster}
              </h3>
              <p
                className={`${
                  isAI ? "craft-ai-items " : ""
                }text-right font-mono text-[11px] uppercase tracking-wider text-bone-dim md:text-sm`}
              >
                {s.items.join(" · ")}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex items-end justify-between gap-6">
        {stats.map((s, i) => (
          <div key={s.label} className="craft-stat">
            <span
              ref={(el) => {
                numRefs.current[i] = el;
              }}
              className="headline block text-[8vw] leading-none text-ember"
            >
              {s.value}
              {s.suffix}
            </span>
            <span className="mt-2 block font-mono text-[10px] uppercase tracking-[0.25em] text-bone-faint md:text-xs">
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
