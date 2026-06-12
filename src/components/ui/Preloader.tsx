"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useJourney } from "@/lib/store";

const SESSION_KEY = "ember-preloaded";

export default function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const emberRef = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline>(null);

  // Always render the same tree on server and client; the skip decision is
  // made post-mount so React owns the node (branching the initial render on
  // sessionStorage orphans the server-rendered overlay on hydration).
  useGSAP(
    () => {
      const skipped = sessionStorage.getItem(SESSION_KEY) === "1";
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (skipped || reduced) {
        useJourney.getState().setLoaded(true);
        if (root.current) root.current.style.display = "none";
        return;
      }

      const counter = { v: 0 };
      const timeline = gsap.timeline({
        onComplete: () => {
          sessionStorage.setItem(SESSION_KEY, "1");
          useJourney.getState().setLoaded(true);
          if (root.current) root.current.style.display = "none";
        },
      });
      tl.current = timeline;

      // Counter gates on real loading: fonts ready before it may finish.
      timeline.to(counter, {
        v: 100,
        duration: 1.8,
        ease: "steps(24)",
        onUpdate: () => {
          if (counterRef.current) {
            counterRef.current.textContent = String(Math.round(counter.v)).padStart(3, "0");
          }
        },
      });
      timeline.addPause("+=0", () => {
        document.fonts.ready.then(() => timeline.play());
      });
      // Ignition: the ember flares, the void burns open.
      timeline.to(emberRef.current, {
        scale: 28,
        opacity: 0.9,
        duration: 0.7,
        ease: "power3.in",
      });
      timeline.to(
        root.current,
        { clipPath: "inset(0 0 100% 0)", duration: 0.8, ease: "power4.inOut" },
        "-=0.15"
      );

      const skipOnKey = () => tl.current?.progress(1);
      window.addEventListener("keydown", skipOnKey);
      return () => window.removeEventListener("keydown", skipOnKey);
    },
    { scope: root }
  );

  return (
    <div
      ref={root}
      data-preloader
      role="button"
      tabIndex={0}
      aria-label="Skip intro"
      onClick={() => tl.current?.progress(1)}
      className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-void"
      style={{ clipPath: "inset(0 0 0% 0)" }}
    >
      <div
        ref={emberRef}
        className="absolute h-2 w-2 rounded-full bg-ember opacity-60"
        style={{ boxShadow: "0 0 24px 6px rgba(217,119,6,.55)" }}
      />
      <div className="relative flex flex-col items-center gap-3">
        <span
          ref={counterRef}
          className="headline text-bone tabular-nums"
          style={{ fontSize: "clamp(4rem, 14vw, 11rem)" }}
        >
          000
        </span>
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-bone-faint">
          igniting
        </span>
      </div>
    </div>
  );
}
