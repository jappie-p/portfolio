"use client";

import { useRef } from "react";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { story } from "@/data/story";

export default function V2Hero() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const q = gsap.utils.selector(ref);
        const names = q(".hero-name");

        const splits = names.map((el) =>
          SplitText.create(el, { type: "chars", mask: "chars" })
        );
        const chars = splits.flatMap((s) => s.chars);

        // Initial hidden states (JS-gated only — static render stays visible)
        gsap.set(names, { letterSpacing: "-0.04em" });
        gsap.set(q(".hero-corner"), { autoAlpha: 0 });
        gsap.set(q(".hero-line"), { scaleX: 0 });

        // ——— Load-in (plays once on mount, not scrubbed) ———
        const intro = gsap.timeline({ delay: 0.35 });
        intro
          .from(chars, {
            yPercent: 110,
            duration: 1.1,
            stagger: 0.04,
            ease: "power4.out",
          })
          .to(
            q(".hero-corner"),
            { autoAlpha: 1, duration: 0.8, stagger: 0.1, ease: "power2.out" },
            "-=0.7"
          );

        // Pulsing scroll-hint arrow
        const pulse = gsap.to(q(".hero-hint-arrow"), {
          y: 6,
          opacity: 0.35,
          duration: 0.9,
          ease: "power1.inOut",
          yoyo: true,
          repeat: -1,
        });

        // ——— Scrub choreography (pinned, 0 → 1) ———
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: ref.current,
            start: "top top",
            end: "+=220%",
            pin: true,
            scrub: 1,
            anticipatePin: 1,
          },
        });

        // (a) 0 → 0.35 — tracking expands, corners drift outward
        tl.to(
          names,
          { letterSpacing: "0.04em", duration: 0.35, ease: "none" },
          0
        )
          .to(q(".corner-tl"), { x: -18, y: -12, duration: 0.35, ease: "none" }, 0)
          .to(q(".corner-tr"), { x: 18, y: -12, duration: 0.35, ease: "none" }, 0)
          .to(q(".corner-bl"), { x: -18, y: 12, duration: 0.35, ease: "none" }, 0)
          .to(q(".corner-bc"), { y: 12, duration: 0.35, ease: "none" }, 0)
          // (b) 0.35 → 0.8 — the curtain split + ember line draws
          .to(
            q(".hero-name-top"),
            { yPercent: -120, duration: 0.45, ease: "power2.inOut" },
            0.35
          )
          .to(
            q(".hero-name-bottom"),
            { yPercent: 120, duration: 0.45, ease: "power2.inOut" },
            0.35
          )
          .to(
            q(".hero-line"),
            { scaleX: 1, duration: 0.45, ease: "power3.inOut" },
            0.35
          )
          // (c) 0.8 → 1 — everything fades, line stays
          .to(
            [...q(".hero-names"), ...q(".hero-corner")],
            { autoAlpha: 0, duration: 0.2, ease: "none" },
            0.8
          );

        return () => {
          intro.kill();
          pulse.kill();
          splits.forEach((s) => s.revert());
        };
      });
    },
    { scope: ref }
  );

  return (
    <section
      id="v2-hero"
      ref={ref}
      className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden"
    >
      {/* Stacked name block */}
      <div className="hero-names relative w-full px-[6vw]">
        <h1 className="sr-only">
          {story.hero.name[0]} {story.hero.name[1]}
        </h1>
        <div aria-hidden className="flex flex-col">
          <span className="hero-name hero-name-top headline block whitespace-nowrap text-[16vw] leading-[0.86] text-bone">
            {story.hero.name[0]}
          </span>
          <span className="hero-name hero-name-bottom headline headline-outline block whitespace-nowrap text-[16vw] leading-[0.86]">
            {story.hero.name[1]}
          </span>
        </div>
      </div>

      {/* Center ember line — revealed by the split, stays after the fade */}
      <div
        aria-hidden
        className="hero-line absolute inset-x-[6vw] top-1/2 h-px bg-ember"
      />

      {/* Corner furniture */}
      <div className="hero-corner corner-tl absolute left-6 top-6 font-mono text-xs uppercase tracking-widest text-ember md:left-10 md:top-8">
        portfolio — 2026
      </div>

      <div className="hero-corner corner-tr absolute right-6 top-6 flex flex-col items-end gap-1.5 font-mono text-xs uppercase tracking-widest text-bone-dim md:right-10 md:top-8">
        {story.hero.meta.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>

      <div className="hero-corner corner-bl absolute bottom-6 left-6 max-w-[16rem] font-mono text-xs text-bone-dim md:bottom-8 md:left-10">
        {story.hero.tagline}
      </div>

      <div className="hero-corner corner-bc absolute inset-x-0 bottom-6 flex flex-col items-center gap-1 font-mono text-xs uppercase tracking-widest text-bone-faint md:bottom-8">
        <span>{story.hero.hint}</span>
        <span className="hero-hint-arrow text-ember">▾</span>
      </div>
    </section>
  );
}
