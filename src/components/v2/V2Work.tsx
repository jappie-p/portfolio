"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { featured } from "@/data/projects";
import { story } from "@/data/story";

// 1 intro panel + 5 project panels
const PANEL_COUNT = featured.length + 1;

export default function V2Work() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const section = ref.current;
        const track = section?.querySelector<HTMLElement>(".v2w-track");
        if (!section || !track) return;

        const splits: SplitText[] = [];

        // Master scrub: pin the section, slide the 6-panel row left by 5 viewports.
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "+=500%",
            pin: true,
            scrub: 1,
            anticipatePin: 1,
          },
        });

        // Track is PANEL_COUNT viewports wide; move it (PANEL_COUNT - 1)
        // viewports left. Timeline runs 0 -> 5: one unit per panel transition.
        tl.to(
          track,
          {
            xPercent: (-100 * (PANEL_COUNT - 1)) / PANEL_COUNT,
            duration: PANEL_COUNT - 1,
          },
          0
        );

        // Intro heading: masked line reveal in the first sliver of scrub.
        const introHeading =
          section.querySelector<HTMLElement>(".v2w-intro-heading");
        if (introHeading) {
          const introSplit = SplitText.create(introHeading, {
            type: "lines",
            mask: "lines",
          });
          splits.push(introSplit);
          tl.from(
            introSplit.lines,
            { yPercent: 110, duration: 0.3, stagger: 0.06 },
            0.02
          );
        }

        // "scroll ->" hint dissolves as the gallery starts to travel.
        tl.to(".v2w-hint", { opacity: 0, duration: 0.2 }, 0.45);

        const panels = Array.from(
          section.querySelectorAll<HTMLElement>(".v2w-panel")
        );
        panels.forEach((panel, i) => {
          const p = i + 1; // panel position in the row (intro = 0)

          // Project title: masked char rise mapped to the panel's arrival.
          const title = panel.querySelector<HTMLElement>(".v2w-title");
          if (title) {
            const split = SplitText.create(title, {
              type: "chars",
              mask: "chars",
            });
            splits.push(split);
            tl.from(
              split.chars,
              { yPercent: 110, duration: 0.45, stagger: 0.02 },
              p - 0.55
            );
          }

          // Accent underline: scaleX in, staggered by panel position.
          const underline = panel.querySelector<HTMLElement>(".v2w-underline");
          if (underline) {
            tl.from(
              underline,
              { scaleX: 0, duration: 0.4 },
              p - 0.35 + i * 0.05
            );
          }

          // Parallax: title block counter-drifts across the panel's visible
          // window (enter at +60px, centered at 0, exit at -60px) so titles
          // glide slower than the panels carrying them.
          const drift = panel.querySelector<HTMLElement>(".v2w-drift");
          if (drift) {
            const start = p - 1;
            const end = Math.min(PANEL_COUNT - 1, p + 1);
            const isLast = p === PANEL_COUNT - 1;
            tl.fromTo(
              drift,
              { x: 60 },
              { x: isLast ? 0 : -60, duration: end - start },
              start
            );
          }
        });

        return () => {
          splits.forEach((s) => s.revert());
        };
      });
    },
    { scope: ref }
  );

  return (
    <section id="v2-work" ref={ref} className="relative h-screen overflow-hidden">
      <div className="v2w-track flex h-full w-max">
        {/* Intro panel */}
        <div className="relative flex h-screen w-screen shrink-0 flex-col justify-center px-6 md:px-14">
          <p className="mb-5 font-mono text-xs uppercase tracking-[0.3em] text-ember">
            {story.work.label}
          </p>
          <h2 className="v2w-intro-heading headline text-[6vw] text-bone">
            {story.work.heading}
          </h2>
          <p className="mt-5 max-w-md text-bone-dim">{story.work.sub}</p>
          <p className="v2w-hint mt-14 font-mono text-xs uppercase tracking-[0.3em] text-bone-faint">
            scroll →
          </p>
        </div>

        {/* Project panels */}
        {featured.map((project, i) => {
          const numTopRight = i % 2 === 0;
          return (
            <Link
              key={project.slug}
              href={`/work/${project.slug}`}
              className="v2w-panel group relative flex h-screen w-screen shrink-0 flex-col justify-center overflow-hidden px-6 md:px-14"
            >
              {/* Giant background index numeral */}
              <span
                aria-hidden
                className={`headline headline-outline pointer-events-none absolute select-none text-[30vw] leading-none opacity-15 ${
                  numTopRight
                    ? "-top-[5vw] right-[3vw]"
                    : "-bottom-[5vw] left-[3vw]"
                }`}
              >
                {String(i + 1).padStart(2, "0")}
              </span>

              <div className="relative z-10">
                {/* Parallax drift wrapper: title + accent underline */}
                <div className="v2w-drift w-fit">
                  <h3 className="v2w-title headline text-[9vw] text-bone transition-colors duration-300 group-hover:text-ember">
                    {project.title}
                  </h3>
                  <div
                    className="v2w-underline mt-4 h-[2px] w-full origin-left"
                    style={{ backgroundColor: project.accent }}
                  />
                </div>

                <p className="mt-8 font-mono text-xs uppercase tracking-[0.25em] text-bone-dim">
                  {project.year} · {project.role}
                </p>
                <p className="mt-2 font-mono text-xs text-bone-faint">
                  {project.tech.join(" / ")}
                </p>
                <p className="mt-6 max-w-md text-bone-dim">{project.tagline}</p>
              </div>

              {i === featured.length - 1 && (
                <p className="absolute bottom-10 left-6 font-mono text-[11px] uppercase tracking-[0.25em] text-bone-faint md:left-14">
                  full case studies coming soon — the archive lives at the end ↓
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
