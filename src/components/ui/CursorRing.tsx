"use client";
import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";

const INTERACTIVE = "a[href], button, [role='button'], summary, label[for], video[controls]";

/** A soft ring that trails the mouse and swells over anything clickable, plus
 *  a small pull on buttons toward the pointer. Mouse only, never touch; off
 *  with reduced motion. The real cursor stays: this is decoration. */
export function CursorRing() {
  const ring = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion() || !window.matchMedia("(pointer: fine)").matches) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOn(true);
  }, []);

  useEffect(() => {
    if (!on) return;
    const el = ring.current;
    if (!el) return;
    let x = -100;
    let y = -100;
    let tx = -100;
    let ty = -100;
    let raf = 0;
    let pulled: HTMLElement | null = null;

    const tick = () => {
      x += (tx - x) * 0.2;
      y += (ty - y) * 0.2;
      el.style.translate = `${x}px ${y}px`;
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.1 ? requestAnimationFrame(tick) : 0;
    };
    const release = () => {
      if (!pulled) return;
      pulled.style.removeProperty("--mx");
      pulled.style.removeProperty("--my");
      pulled = null;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      tx = e.clientX;
      ty = e.clientY;
      el.dataset.shown = "";
      if (!raf) raf = requestAnimationFrame(tick);
      const target = e.target instanceof Element ? e.target : null;
      el.toggleAttribute("data-hover", Boolean(target?.closest(INTERACTIVE)));
      // magnetic buttons: lean up to 5px toward the pointer
      const btn = target?.closest<HTMLElement>(".btn") ?? null;
      if (btn !== pulled) release();
      if (btn) {
        const r = btn.getBoundingClientRect();
        btn.style.setProperty("--mx", `${((e.clientX - r.left) / r.width - 0.5) * 10}px`);
        btn.style.setProperty("--my", `${((e.clientY - r.top) / r.height - 0.5) * 8}px`);
        pulled = btn;
      }
    };
    const onLeave = () => {
      delete el.dataset.shown;
      release();
    };
    const onDown = () => el.toggleAttribute("data-press", true);
    const onUp = () => el.toggleAttribute("data-press", false);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
      release();
    };
  }, [on]);

  if (!on) return null;
  return <div ref={ring} aria-hidden className="cursor-ring" />;
}
