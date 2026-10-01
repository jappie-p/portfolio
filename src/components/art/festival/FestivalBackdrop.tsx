"use client";
import { useEffect, useRef } from "react";
import { FestivalScene } from "./scene";
import { useOnScreen } from "./useOnScreen";

// Soft edges, so the scene melts into the page background and the panels on
// either side of it.
const EDGES = "linear-gradient(90deg, transparent, #000 5%, #000 95%, transparent), linear-gradient(180deg, transparent, #000 4%, #000 93%, transparent)";

/** ❤️U Festival at night, behind the phones: a stage with an LED wall that
 *  beats a heart, beams sweeping through haze, a crowd jumping at 120 bpm and
 *  confetti on the drop. Canvas 2D only. `active` runs it (nothing ticks while
 *  it is false, nor while none of it is on screen), `still` shows one composed
 *  frame for reduced motion. */
export function FestivalBackdrop({ active, still, className = "" }: { active: boolean; still: boolean; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const scene = useRef<FestivalScene | null>(null);
  const onScreen = useOnScreen(host);
  const live = active && onScreen;

  useEffect(() => {
    const el = host.current;
    const c = cv.current;
    if (!el || !c) return;
    const s = new FestivalScene(c);
    scene.current = s;
    const ro = new ResizeObserver(([e]) => s.resize(e.contentRect.width, e.contentRect.height));
    ro.observe(el);
    return () => {
      ro.disconnect();
      s.dispose();
      scene.current = null;
    };
  }, []);

  useEffect(() => {
    scene.current?.setMode(still ? "still" : live ? "live" : "paused");
  }, [live, still]);

  return (
    <div
      ref={host}
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{
        background: "linear-gradient(180deg, #05080d 0%, #0b0e22 55%, #120e26 72%, #05060b 100%)",
        maskImage: EDGES,
        WebkitMaskImage: EDGES,
        maskComposite: "intersect",
        WebkitMaskComposite: "source-in",
      }}
    >
      <canvas ref={cv} className="absolute inset-0 block h-full w-full" />
    </div>
  );
}
