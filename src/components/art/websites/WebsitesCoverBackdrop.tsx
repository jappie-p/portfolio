"use client";
import { useRef } from "react";
import { createCoverScene } from "./cover/scene";
import type { BackdropProps } from "./lib/types";
import { useCanvasScene } from "./lib/useCanvasScene";

/** The Websites cover: wireframe browser windows (nav bars, heroes, card
 *  grids, dashboards) adrift in deep blue-violet space, with depth of field
 *  and a light that sweeps through now and then. */
export function WebsitesCoverBackdrop({ active, still, className = "" }: BackdropProps) {
  const host = useRef<HTMLDivElement>(null);
  useCanvasScene(host, createCoverScene, active, still, 4.6);
  return (
    <div ref={host} aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden bg-[#05080d] ${className}`}>
      <canvas data-layer="bg" className="absolute inset-0 h-full w-full" />
      <canvas data-layer="fx" className="absolute inset-0 h-full w-full" />
    </div>
  );
}
