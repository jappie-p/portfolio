"use client";
import { useRef } from "react";
import { createLouisaScene } from "./louisa/scene";
import type { BackdropProps } from "./lib/types";
import { useCanvasScene } from "./lib/useCanvasScene";

/** Louisa's geode in Canvas 2D: low-poly amethyst and rose quartz on banded
 *  agate walls, labradorite drifting, glints where facets catch. The fallback
 *  for screens without a hardware GPU (see LouisaBackdrop). */
export function LouisaBackdrop2D({ active, still, className = "" }: BackdropProps) {
  const host = useRef<HTMLDivElement>(null);
  useCanvasScene(host, createLouisaScene, active, still, 9.3);
  return (
    <div ref={host} aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden bg-[#05080d] ${className}`}>
      <canvas data-layer="bg" className="absolute inset-0 h-full w-full" />
      <canvas data-layer="fx" className="absolute inset-0 h-full w-full" />
    </div>
  );
}
