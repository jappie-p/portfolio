"use client";
import { useEffect, useRef } from "react";
import { HexField, type FieldState } from "./field/HexField";

/** The field of columns behind the hero. It draws while `active` and holds
 *  one frame otherwise; `onReady` fires once its first frame is on screen
 *  (or at once, if this browser has no WebGL 2). */
export function HeroField({ state, active, still, onReady }: { state: FieldState; active: boolean; still: boolean; onReady: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const run = useRef<(on: boolean) => void>(() => {});

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    let field: HexField;
    try {
      field = new HexField(cv, state);
    } catch {
      onReady();
      return;
    }
    let raf = 0;
    let last = 0;
    let wanted = false;
    let shown = false;
    const fit = () => field.resize(cv.clientWidth, cv.clientHeight, Math.min(window.devicePixelRatio || 1, 1.5));
    const ro = new ResizeObserver(() => {
      fit();
      if (!raf) field.frame(0);
    });
    ro.observe(cv);
    fit();

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((now - (last || now)) / 1000, 0.05);
      last = now;
      field.frame(dt);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
      if (wanted) raf = requestAnimationFrame(loop);
    };
    // the shaders build in the background; the canvas shows from its first frame
    const wait = () => {
      try {
        if (!field.ready()) {
          raf = requestAnimationFrame(wait);
          return;
        }
      } catch {
        onReady();
        return;
      }
      field.frame(0);
      shown = true;
      cv.style.opacity = "1";
      onReady();
      start();
    };
    raf = requestAnimationFrame(wait);
    run.current = (on) => {
      wanted = on;
      if (shown) start();
    };

    // the pointer is tracked on the window: the canvas sits under the copy
    const follow = !still && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      field.pointer(e.clientX - r.left, e.clientY - r.top);
    };
    const onLeave = () => field.pointer(null);
    if (follow) {
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
    }
    return () => {
      run.current = () => {};
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (follow) {
        window.removeEventListener("pointermove", onMove);
        document.documentElement.removeEventListener("pointerleave", onLeave);
      }
      field.dispose();
    };
  }, [state, still, onReady]);

  useEffect(() => {
    run.current(active && !still);
  }, [active, still]);

  return (
    <div aria-hidden className="absolute inset-0">
      <canvas ref={canvas} className="block h-full w-full opacity-0 transition-opacity duration-500" />
    </div>
  );
}
