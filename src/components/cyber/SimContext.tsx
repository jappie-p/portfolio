"use client";
import { createContext, useContext } from "react";
import type * as THREE from "three";
import type { SceneUniforms } from "./lib/uniforms";

export type Tier = "high" | "low";

/** Mutable per-frame story state. Written once per frame by SimDriver, read by everything else. */
export type SimState = {
  /** eased scroll progress 0..1 */
  p: number;
  attack: number;
  defense: number;
  time: number;
  /** time the power-on started (-1 until the section is in view) */
  bootAt: number;
  /** camera shake budget 0..1 (hits add, time bleeds it off) */
  trauma: number;
  /** time of the last firewall shockwave */
  pulseAt: number;
  /** strongest hit flash right now, 0..~1.5 */
  hit: number;
  /** per flood: when the last salvo landed */
  hitAt: [number, number, number];
  /** when the green all-clear sweep started (arriving at the last chapter) */
  clearAt: number;
};

/** The mouse, shared by the camera parallax and the cursor on the wall. */
export type Pointer = {
  clientX: number;
  clientY: number;
  x: number;
  y: number;
  active: boolean;
  /** clicks on the wall so far (the probe turns each new one into a ripple) */
  pings: number;
};

export type Sim = {
  u: SceneUniforms;
  pointer: Pointer;
  /** raw scroll progress from the DOM (the target SimDriver eases toward) */
  progress: { current: number };
  /** set by the DOM once the section is properly in view: starts the power-on */
  boot: { current: boolean };
  state: SimState;
  atlas: THREE.Texture;
  tier: Tier;
  /** reduced motion: render one composed frame, no animation */
  still: boolean;
};

const SimContext = createContext<Sim | null>(null);

export const SimProvider = SimContext.Provider;

export function useSim(): Sim {
  const sim = useContext(SimContext);
  if (!sim) throw new Error("useSim must be used inside <CyberStage>");
  return sim;
}

/** Seconds since the power-on started; everything is fully on in reduced motion. */
export function sinceBoot(s: SimState, still: boolean): number {
  if (still) return 1e4;
  return s.bootAt < 0 ? -1 : s.time - s.bootAt;
}
