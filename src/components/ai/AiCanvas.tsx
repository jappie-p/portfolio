"use client";
import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { AiStage } from "./AiStage";
import type { AiLabels, AiTier } from "./sim";

function detectTier(): AiTier {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = (nav.deviceMemory ?? 8) < 4 || (nav.hardwareConcurrency ?? 8) < 4;
  return coarse || small ? "low" : "high";
}

const MIN_DPR = 1;

export type AiCanvasProps = {
  progress: { current: number };
  boot: { current: boolean };
  labels: AiLabels;
  active: boolean;
  still: boolean;
  onReady?: () => void;
};

/** The live AI scene. No post-processing: every glow is an additive layer,
 *  which keeps the blacks deep and the particles crisp (bloom left a dark halo
 *  round the core). 1.5x on retina, stepping down if frames drop, and no loop
 *  at all while off screen. */
export function AiCanvas({ progress, boot, labels, active, still, onReady }: AiCanvasProps) {
  const [tier] = useState(detectTier);
  const [screen] = useState(() => window.devicePixelRatio || 1);
  const maxDpr = Math.max(MIN_DPR, Math.min(screen, 1.5));
  const [dpr, setDpr] = useState(maxDpr);

  return (
    <Canvas
      frameloop={still ? "demand" : active ? "always" : "never"}
      dpr={still ? maxDpr : dpr}
      gl={{ antialias: screen < 1.5, alpha: false, stencil: false, powerPreference: "high-performance" }}
      camera={{ fov: 40, near: 0.1, far: 200, position: [0, 2, 16] }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.3;
        onReady?.();
      }}
    >
      <color attach="background" args={["#040210"]} />
      {!still && (
        <PerformanceMonitor
          factor={1}
          step={0.25}
          flipflops={3}
          onChange={({ factor }) => setDpr(Math.round((MIN_DPR + (maxDpr - MIN_DPR) * factor) * 4) / 4)}
        />
      )}
      <AiStage progress={progress} boot={boot} labels={labels} tier={tier} still={still} />
    </Canvas>
  );
}
