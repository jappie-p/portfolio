"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useInView, useStill } from "@/lib/scene";

/** A panel's own art, behind its copy: mounted once its topic comes near
 *  (so the panel next door is ready before you slide to it), animating only
 *  while the panel is on screen, one still frame for reduced motion. `scrim`
 *  darkens where the copy sits so it always reads. */
export function Backdrop({
  children,
  scrim = "",
}: {
  children: (state: { active: boolean; still: boolean }) => ReactNode;
  /** classes for a legibility scrim layered over the art */
  scrim?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const active = useInView(ref);
  const still = useStill();
  const [near, setNear] = useState(false);

  useEffect(() => {
    // the track clips its panels, so watch the whole topic row instead
    const row = ref.current?.closest("[data-section]");
    if (!row) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setNear(true);
        io.disconnect();
      }
    }, { rootMargin: "100% 0px" });
    io.observe(row);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {near && children({ active, still })}
      {scrim && <div data-scrim className={`absolute inset-0 ${scrim}`} />}
    </div>
  );
}
