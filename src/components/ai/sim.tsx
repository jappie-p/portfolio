"use client";
import { createContext, useContext } from "react";
import * as THREE from "three";

export type AiTier = "high" | "low";

/** Uniforms every AI material reads; written once per frame by AiDriver. */
export function createAiUniforms() {
  return {
    uTime: { value: 0 },
    /** power-on front radius from the core, grows once the topic is in view */
    uBoot: { value: 0 },
    /** last wake pulse: start time, strength */
    uWake: { value: new THREE.Vector2(-1e4, 0) },
    uEnergy: { value: 0.55 },
    uJarvis: { value: 0 },
    uHub: { value: 0 },
    uPixelRatio: { value: 1 },
  };
}
export type AiUniforms = ReturnType<typeof createAiUniforms>;

/** Per-frame story state: written by AiDriver, read by the scene parts. */
export type AiState = {
  /** eased scroll progress 0..1 */
  p: number;
  time: number;
  /** time the power-on started, -1 before the topic came into view */
  bootAt: number;
  jarvis: number;
  hub: number;
  /** when the ring of tools started lighting up (arriving at Go to Guy) */
  hubAt: number;
  /** a flare of the core, 0..1 */
  flare: number;
};

export type AiPointer = { x: number; y: number; active: boolean; pings: number };

/** Copy for the 3D labels, from the dictionaries (so it follows the language). */
export type AiLabels = {
  jarvis: { hub: string; nodes: { app: string; mail: string; agenda: string; claude: string; push: string } };
  hub: { hub: string; nodes: { mail: string; agenda: string; hours: string; crm: string; team: string } };
};

export type AiSim = {
  u: AiUniforms;
  state: AiState;
  pointer: AiPointer;
  progress: { current: number };
  boot: { current: boolean };
  labels: AiLabels;
  tier: AiTier;
  still: boolean;
};

const Ctx = createContext<AiSim | null>(null);
export const AiSimProvider = Ctx.Provider;

export function useAiSim(): AiSim {
  const sim = useContext(Ctx);
  if (!sim) throw new Error("useAiSim must be used inside <AiStage>");
  return sim;
}

/** Seconds since the power-on; everything is fully on in reduced motion. */
export function sinceBoot(s: AiState, still: boolean): number {
  if (still) return 1e4;
  return s.bootAt < 0 ? -1 : s.time - s.bootAt;
}
