"use client";
import { useEffect, useRef } from "react";
import { BASE_PATH } from "@/data/site";
import { Scene } from "./scene/scene";

/** Decorative, full-panel pixel scene from the Zelda remake: Link's House by
 *  moonlight, the forest edge, fireflies, slimes, and Link walking the path.
 *  Canvas 2D only. `active` runs the animation (nothing ticks while false);
 *  `still` (reduced motion) holds one composed frame. */
export function ZeldaBackdrop({ active, still, className = "" }: { active: boolean; still: boolean; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<Scene | null>(null);

  useEffect(() => {
    const box = wrap.current;
    const cv = canvas.current;
    if (!box || !cv) return;
    const sc = new Scene(cv, `${BASE_PATH}/art/zelda/link.png`);
    scene.current = sc;
    const fit = () => sc.resize(box.clientWidth, box.clientHeight, window.devicePixelRatio);
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    // moving the window to a screen with another pixel ratio changes no size, so watch for it
    let dpr: MediaQueryList | null = null;
    const watch = () => {
      dpr?.removeEventListener("change", onDpr);
      dpr = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      dpr.addEventListener("change", onDpr);
    };
    const onDpr = () => {
      fit();
      watch();
    };
    watch();
    return () => {
      ro.disconnect();
      dpr?.removeEventListener("change", onDpr);
      sc.dispose();
      scene.current = null;
    };
  }, []);

  useEffect(() => {
    const sc = scene.current;
    if (!sc) return;
    sc.setStill(still);
    const on = active && !still;
    sc.run(on);
    if (!on) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse") sc.point((e.clientX / window.innerWidth) * 2 - 1);
    };
    const onLeave = () => sc.point(null);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      sc.run(false);
    };
  }, [active, still]);

  return (
    <div ref={wrap} aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <canvas ref={canvas} className="absolute bottom-0 left-0 block [image-rendering:pixelated]" />
      {/* seams into the page: the top of the sky meets the site's night */}
      <div className="absolute inset-x-0 top-0 h-[14%] bg-gradient-to-b from-[#05080d] to-transparent" />
    </div>
  );
}
