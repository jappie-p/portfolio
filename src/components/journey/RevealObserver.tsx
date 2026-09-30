"use client";
import { useEffect } from "react";

/** Marks every panel ([data-panel]) with data-on while it is mostly on screen,
 *  and arms the rise-in animation on <html>. The copy inside ([data-reveal])
 *  then rises in each time its panel comes into view, horizontally or
 *  vertically. Without JS nothing is hidden. */
export function RevealObserver() {
  useEffect(() => {
    const panels = Array.from(document.querySelectorAll<HTMLElement>("[data-panel]"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) e.target.toggleAttribute("data-on", e.isIntersecting);
      },
      { threshold: 0.55 },
    );
    panels.forEach((p) => io.observe(p));
    document.documentElement.classList.add("reveal-armed");
    return () => io.disconnect();
  }, []);
  return null;
}
