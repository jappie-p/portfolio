"use client";
import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { CyberStage } from "./CyberStage";
import type { Tier } from "./SimContext";

/** Touch devices and small machines skip the mirror floor and get fewer particles. */
function detectTier(): Tier {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = (nav.deviceMemory ?? 8) < 4 || (nav.hardwareConcurrency ?? 8) < 4;
  return coarse || small ? "low" : "high";
}

const MIN_DPR = 1;
const EXPOSURE = 1.4;

export type CyberCanvasProps = {
  progress: { current: number };
  /** flips true once the section is properly in view: starts the power-on */
  boot: { current: boolean };
  /** render loop runs only while the section is near the viewport */
  active: boolean;
  /** reduced motion: one composed still frame */
  still: boolean;
  onReady?: () => void;
};

/** The live WebGL firewall scene: resolution independent, so it stays sharp on any screen. */
export function CyberCanvas({ progress, boot, active, still, onReady }: CyberCanvasProps) {
  const [tier] = useState(detectTier);
  const [screen] = useState(() => window.devicePixelRatio || 1);
  // 1.5x on retina is the sweet spot: sharp, and ~60fps on an M1 at 1440x900.
  // The monitor only ever walks down from there (it cannot see headroom at the
  // vsync cap, so stepping up just made it oscillate).
  const maxDpr = Math.max(MIN_DPR, Math.min(screen, 1.5));
  const [dpr, setDpr] = useState(maxDpr);

  return (
    <Canvas
      frameloop={still ? "demand" : active ? "always" : "never"}
      dpr={still ? maxDpr : dpr}
      gl={{ antialias: false, alpha: false, stencil: false, powerPreference: "high-performance" }}
      camera={{ fov: 40, near: 0.1, far: 140, position: [0, 3.5, 13] }}
      onCreated={({ gl }) => {
        // read by the ToneMapping effect: lifts steel and haze out of the ACES toe
        gl.toneMappingExposure = EXPOSURE;
        onReady?.();
      }}
    >
      <color attach="background" args={["#040b16"]} />
      <fog attach="fog" args={["#07142a", 16, 56]} />
      {!still && (
        <PerformanceMonitor
          factor={1}
          step={0.25}
          flipflops={3}
          onChange={({ factor }) => setDpr(Math.round((MIN_DPR + (maxDpr - MIN_DPR) * factor) * 4) / 4)}
        />
      )}
      <CyberStage progress={progress} boot={boot} tier={tier} still={still} antialias={screen < 1.5} />
    </Canvas>
  );
}
