"use client";
import { useEffect } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/** Buttons lean a few pixels toward the mouse. Mouse only, never touch; off
 *  with reduced motion. Renders nothing. */
export function MagneticButtons() {
  useEffect(() => {
    if (prefersReducedMotion() || !window.matchMedia("(pointer: fine)").matches) return;
    let pulled: HTMLElement | null = null;
    const release = () => {
      if (!pulled) return;
      pulled.style.removeProperty("--mx");
      pulled.style.removeProperty("--my");
      pulled = null;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const btn = e.target instanceof Element ? e.target.closest<HTMLElement>(".btn") : null;
      if (btn !== pulled) release();
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      btn.style.setProperty("--mx", `${((e.clientX - r.left) / r.width - 0.5) * 10}px`);
      btn.style.setProperty("--my", `${((e.clientY - r.top) / r.height - 0.5) * 8}px`);
      pulled = btn;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", release);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", release);
      release();
    };
  }, []);
  return null;
}
