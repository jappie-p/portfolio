"use client";
import type { MouseEvent } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/** "Scroll sideways" for everyone: moves the track to the next panel. Mouse
 *  wheels cannot scroll sideways, so every chapter offers this button too. */
export function NextButton({ label, className = "" }: { label: string; className?: string }) {
  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    const panel = e.currentTarget.closest<HTMLElement>(".project-panel");
    const next = panel?.nextElementSibling;
    const track = panel?.parentElement;
    // scroll the track itself: scrollIntoView inside a snapping track is unreliable in Firefox
    if (next instanceof HTMLElement && track) {
      track.scrollTo({ left: next.offsetLeft, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }
  };
  return (
    <button type="button" onClick={onClick} className={`next-btn btn btn-ghost mt-6 ${className}`}>
      {label}
      <span aria-hidden className="btn-arrow">
        →
      </span>
    </button>
  );
}
