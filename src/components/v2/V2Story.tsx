"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { story } from "@/data/story";

type ChapterData = {
  label: string;
  lines: readonly string[];
};

function ChapterScene({
  data,
  numeral,
  side,
}: {
  data: ChapterData;
  numeral: string;
  side: "left" | "right";
}) {
  const pinRef = useRef<HTMLDivElement>(null);
  const numeralRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      const pin = pinRef.current;
      if (!pin) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const lines = gsap.utils.toArray<HTMLElement>(".story-line", pin);

        // Restack the flow-laid lines into one centered slot so they can
        // crossfade in place. Without JS / reduced motion the lines simply
        // remain stacked and fully visible.
        gsap.set(lines, {
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          yPercent: -50,
          y: 40,
          opacity: 0,
          filter: "blur(8px)",
        });
        gsap.set(labelRef.current, { opacity: 0, y: 24 });

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: pin,
            start: "top top",
            end: "+=280%",
            pin: true,
            scrub: 1,
            anticipatePin: 1,
          },
        });

        // Giant numeral drifts upward across the entire pin (parallax).
        tl.fromTo(
          numeralRef.current,
          { yPercent: 20 },
          { yPercent: -20, duration: 1 },
          0,
        );

        // Chapter label settles in right as the pin engages.
        tl.to(labelRef.current, { opacity: 1, y: 0, duration: 0.05 }, 0);

        const lineIn = (el: HTMLElement, at: number, dur: number) =>
          tl.to(
            el,
            { opacity: 1, y: 0, filter: "blur(0px)", duration: dur },
            at,
          );
        const lineOut = (el: HTMLElement, at: number, dur: number) =>
          tl.to(
            el,
            { opacity: 0, y: -40, filter: "blur(8px)", duration: dur },
            at,
          );

        // Transition windows: 0.05–0.30, 0.35–0.60, 0.65–0.95.
        lineIn(lines[0], 0.05, 0.25);
        lineOut(lines[0], 0.35, 0.12);
        lineIn(lines[1], 0.43, 0.17);
        lineOut(lines[1], 0.65, 0.12);
        lineIn(lines[2], 0.73, 0.22);

        return () => {};
      });
    },
    { scope: pinRef },
  );

  const left = side === "left";

  return (
    <div ref={pinRef} className="relative h-screen overflow-hidden">
      <div
        ref={numeralRef}
        aria-hidden
        className={`headline headline-outline pointer-events-none select-none absolute top-[4vh] text-[40vw] leading-none opacity-[0.18] ${
          left ? "right-[-7vw]" : "left-[-7vw]"
        }`}
      >
        {numeral}
      </div>

      <div
        className={`relative z-10 flex h-full flex-col px-[7vw] pb-[10vh] pt-[15vh] ${
          left ? "items-start text-left" : "items-end text-right"
        }`}
      >
        <p
          ref={labelRef}
          className="font-mono text-xs uppercase tracking-[0.3em] text-ember md:text-sm"
        >
          {data.label}
        </p>

        <div className="relative flex w-full flex-1 flex-col justify-center gap-[7vh]">
          {data.lines.map((line, i) => (
            <div key={i} className="story-line w-full">
              <p
                className={
                  i === 0
                    ? `headline text-[max(2rem,5vw)] text-bone ${
                        left ? "" : "ml-auto"
                      } max-w-[20ch]`
                    : `text-[max(1.15rem,3.2vw)] leading-[1.3] text-bone-dim ${
                        left ? "" : "ml-auto"
                      } max-w-[32ch]`
                }
              >
                {line}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function V2Story() {
  return (
    <section id="v2-story" className="relative">
      <ChapterScene data={story.dream} numeral="01" side="left" />
      <ChapterScene data={story.turn} numeral="02" side="right" />
    </section>
  );
}
