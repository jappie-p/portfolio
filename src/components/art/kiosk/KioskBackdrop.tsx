"use client";
import { useEffect, useRef } from "react";
import { Leaves } from "./Leaves";
import { KioskScene } from "./scene";
import { useOnScreen } from "./useOnScreen";

const EDGES = "linear-gradient(90deg, transparent, #000 5%, #000 95%, transparent), linear-gradient(180deg, transparent, #000 4%, #000 93%, transparent)";

/** Happy Herbivore's restaurant behind the kiosk screens: deep green into dark
 *  teal, warm lamps and festoon bulbs out of focus, and leaves drifting past.
 *  Calm on the copy's side. `active` runs it (nothing ticks while it is
 *  false, nor while none of it is on screen), `still` shows one composed frame
 *  for reduced motion. */
export function KioskBackdrop({ active, still, className = "" }: { active: boolean; still: boolean; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const scene = useRef<KioskScene | null>(null);
  const onScreen = useOnScreen(host);
  const live = active && onScreen;

  useEffect(() => {
    const el = host.current;
    const c = cv.current;
    const l = layer.current;
    if (!el || !c || !l) return;
    const s = new KioskScene(c, l);
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
        background: "linear-gradient(110deg, #0b3526 0%, #082d29 40%, #06222a 70%, #05141a 100%)",
        maskImage: EDGES,
        WebkitMaskImage: EDGES,
        maskComposite: "intersect",
        WebkitMaskComposite: "source-in",
      }}
    >
      <canvas ref={cv} className="absolute inset-0 block h-full w-full" />
      <div ref={layer} className="absolute inset-0">
        <Leaves />
      </div>
    </div>
  );
}
