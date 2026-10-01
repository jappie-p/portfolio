"use client";
import { useRef } from "react";
import { createHypScene } from "./hyp/scene";
import type { BackdropProps } from "./lib/types";
import { useCanvasScene } from "./lib/useCanvasScene";

/** HypHosting's world: an isometric field of Minecraft-like blocks (grass,
 *  dirt, stone, obsidian, redstone) floating in a red-lit void, a few server
 *  blocks blinking their status LEDs. Canvas 2D, sprites baked per size. */
export function HypBackdrop({ active, still, className = "" }: BackdropProps) {
  const host = useRef<HTMLDivElement>(null);
  useCanvasScene(host, createHypScene, active, still, 7.4);
  return (
    <div ref={host} aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden bg-[#05080d] ${className}`}>
      <canvas data-layer="bg" className="absolute inset-0 h-full w-full" />
      <canvas data-layer="fx" className="absolute inset-0 h-full w-full" />
    </div>
  );
}
