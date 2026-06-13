"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

// Signature trailing cursor: an ember ring that lags the pointer and swells
// over links. Augments the native cursor (doesn't hide it) so nothing is
// ever lost. Fine pointers + no-reduced-motion only; renders nothing
// otherwise, so touch/keyboard users are unaffected.
export default function V2Cursor() {
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const motionOk = !window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const ring = ringRef.current;
    if (!fine || !motionOk || !ring) return;

    gsap.set(ring, { xPercent: -50, yPercent: -50, opacity: 0 });
    const xTo = gsap.quickTo(ring, "x", { duration: 0.45, ease: "power3" });
    const yTo = gsap.quickTo(ring, "y", { duration: 0.45, ease: "power3" });
    const scaleTo = gsap.quickTo(ring, "scale", {
      duration: 0.3,
      ease: "power2",
    });

    let shown = false;
    const onMove = (e: PointerEvent) => {
      xTo(e.clientX);
      yTo(e.clientY);
      if (!shown) {
        shown = true;
        gsap.to(ring, { opacity: 1, duration: 0.4 });
      }
      const interactive = (e.target as HTMLElement)?.closest(
        "a, button, [data-magnetic]"
      );
      scaleTo(interactive ? 2.4 : 1);
    };
    const onLeave = () => gsap.to(ring, { opacity: 0, duration: 0.3 });

    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={ringRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[80] h-7 w-7 rounded-full border border-ember opacity-0 mix-blend-screen"
    />
  );
}
