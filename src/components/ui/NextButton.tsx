"use client";
import type { MouseEvent } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/** "Scroll sideways" for everyone: moves the track to the next panel. Mouse
 *  wheels cannot scroll sideways, so every chapter offers this button too.
 *  A row that moves on its own way (the School gallery) passes `onNext`. */
export function NextButton({ label, className = "", onNext, primary = false }: { label: string; className?: string; onNext?: () => void; primary?: boolean }) {
  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (onNext) return onNext();
    const panel = e.currentTarget.closest<HTMLElement>(".project-panel");
    const next = panel?.nextElementSibling;
    const track = panel?.parentElement;
    // scroll the track itself: scrollIntoView inside a snapping track is unreliable in Firefox
    if (next instanceof HTMLElement && track) {
      track.scrollTo({ left: next.offsetLeft, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }
  };
  return (
    <button type="button" onClick={onClick} className={`next-btn btn ${primary ? "btn-primary" : "btn-ghost"} mt-6 ${className}`}>
      {label}
      <span aria-hidden className="btn-arrow">
        →
      </span>
    </button>
  );
}
