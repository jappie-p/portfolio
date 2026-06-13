"use client";

import { useRef } from "react";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { story } from "@/data/story";
import { archive } from "@/data/projects";

const GOAL =
  "Open for internships and teams that ship. I bring production experience, AI-native speed, and I learn anything.";

const MARQUEE_TEXT = "LET'S BUILD SOMETHING — ";

const FOOTER =
  "© 2026 jasper pathuis — built from scratch, runs on my own server";

export default function V2Contact() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;

      const mm = gsap.matchMedia();

      // Reveal choreography (one-shot, no scrub) + marquee
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const heading = section.querySelector<HTMLElement>("[data-heading]");
        if (!heading) return () => {};

        const split = SplitText.create(heading, {
          type: "words,chars",
          mask: "chars",
        });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: "top 70%",
          },
        });

        tl.from("[data-label]", { opacity: 0, y: 14, duration: 0.5, ease: "power2.out" })
          .from(
            split.chars,
            { yPercent: 110, duration: 0.9, ease: "power4.out", stagger: 0.025 },
            "-=0.25"
          )
          .from("[data-goal]", { opacity: 0, y: 18, duration: 0.6, ease: "power2.out" }, "-=0.5")
          .from(
            "[data-link-wrap]",
            { opacity: 0, y: 16, duration: 0.6, ease: "power2.out", stagger: 0.12 },
            "-=0.4"
          )
          .from(
            "[data-archive-item]",
            { opacity: 0, y: 12, duration: 0.5, ease: "power2.out", stagger: 0.06 },
            "-=0.4"
          )
          .from(
            ["[data-marquee-wrap]", "[data-footer]"],
            { opacity: 0, duration: 0.6, ease: "power2.out" },
            "-=0.3"
          );

        // Infinite marquee — independent of scroll, paused under reduced motion
        // by virtue of only existing inside this gate.
        const marquee = gsap.to("[data-marquee-track]", {
          xPercent: -50,
          duration: 18,
          ease: "none",
          repeat: -1,
        });

        return () => {
          marquee.kill();
          split.revert();
        };
      });

      // Magnetic links — fine pointers + motion allowed only
      mm.add(
        "(prefers-reduced-motion: no-preference) and (pointer: fine)",
        () => {
          const links = gsap.utils.toArray<HTMLElement>("[data-magnetic]", section);
          const cleanups: (() => void)[] = [];

          links.forEach((link) => {
            const xTo = gsap.quickTo(link, "x", { duration: 0.4, ease: "power3.out" });
            const yTo = gsap.quickTo(link, "y", { duration: 0.4, ease: "power3.out" });

            const onMove = (e: PointerEvent) => {
              const rect = link.getBoundingClientRect();
              const relX = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
              const relY = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
              xTo(gsap.utils.clamp(-8, 8, relX * 8));
              yTo(gsap.utils.clamp(-8, 8, relY * 8));
            };
            const onLeave = () => {
              xTo(0);
              yTo(0);
            };

            link.addEventListener("pointermove", onMove);
            link.addEventListener("pointerleave", onLeave);
            cleanups.push(() => {
              link.removeEventListener("pointermove", onMove);
              link.removeEventListener("pointerleave", onLeave);
              gsap.set(link, { x: 0, y: 0 });
            });
          });

          return () => cleanups.forEach((fn) => fn());
        }
      );
    },
    { scope: sectionRef }
  );

  return (
    <section
      id="v2-contact"
      ref={sectionRef}
      className="relative flex min-h-screen flex-col justify-end pb-12"
    >
      <div className="px-6 md:px-12">
        <p
          data-label
          className="font-mono text-xs uppercase tracking-[0.3em] text-ember"
        >
          {story.contact.label}
        </p>

        <h2 data-heading className="headline mt-4 text-[11vw] leading-[0.95] text-bone">
          {story.contact.heading}
        </h2>

        <p data-goal className="mt-8 max-w-lg text-bone-dim">
          {GOAL}
        </p>

        <div data-links className="mt-10 flex flex-wrap gap-x-12 gap-y-5">
          <div data-link-wrap>
            <a
              data-magnetic
              href={`mailto:${story.contact.email}`}
              className="inline-block font-mono text-xl text-bone underline decoration-ember decoration-2 underline-offset-8 md:text-2xl"
            >
              {story.contact.email}
            </a>
          </div>
          <div data-link-wrap>
            <a
              data-magnetic
              href={story.contact.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block font-mono text-xl text-bone underline decoration-ember decoration-2 underline-offset-8 md:text-2xl"
            >
              github.com/jappie-p
            </a>
          </div>
        </div>

        <ul className="mt-16 grid grid-cols-1 gap-x-12 border-t border-stone md:grid-cols-2">
          {archive.map((item) => (
            <li
              key={item.title}
              data-archive-item
              className="flex items-baseline justify-between gap-4 border-b border-stone py-2"
            >
              <span className="text-sm text-bone">
                {item.href ? (
                  <a href={item.href} target="_blank" rel="noopener noreferrer">
                    {item.title}
                  </a>
                ) : (
                  item.title
                )}
              </span>
              <span className="font-mono text-[11px] text-bone-faint">
                {item.year} · {item.tech.join(", ")}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div
        data-marquee-wrap
        aria-hidden
        className="mt-16 overflow-hidden border-y border-stone py-2"
      >
        <div data-marquee-track className="flex w-max whitespace-nowrap">
          {Array.from({ length: 8 }, (_, i) => (
            <span
              key={i}
              className="font-mono text-sm uppercase tracking-[0.35em] text-bone-faint"
            >
              {MARQUEE_TEXT}
            </span>
          ))}
        </div>
      </div>

      <p data-footer className="mt-6 px-6 font-mono text-[10px] text-bone-faint md:px-12">
        {FOOTER}
      </p>
    </section>
  );
}
