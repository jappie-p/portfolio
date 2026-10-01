"use client";
import { useEffect, useMemo } from "react";
import { AiSimProvider, createAiUniforms, type AiLabels, type AiSim, type AiTier } from "./sim";
import { AiDriver } from "./AiDriver";
import { AiCamera } from "./AiCamera";
import { Core } from "./Core";
import { Lattice } from "./Lattice";
import { Pipeline } from "./Pipeline";
import { Hub } from "./Hub";
import { Environment } from "./Environment";

/** The AI core and everything around it, sharing one sim. */
export function AiStage({
  progress,
  boot,
  labels,
  tier,
  still,
}: {
  progress: { current: number };
  boot: { current: boolean };
  labels: AiLabels;
  tier: AiTier;
  still: boolean;
}) {
  const sim = useMemo<AiSim>(
    () => ({
      u: createAiUniforms(),
      state: { p: 0, time: 0, bootAt: -1, jarvis: 0, hub: 0, hubAt: -1e4, flare: 0 },
      pointer: { x: 0, y: 0, active: false, pings: 0 },
      progress,
      boot,
      labels,
      tier,
      still,
    }),
    [progress, boot, labels, tier, still],
  );

  // one listener for the pointer: parallax, and a click on the scene sends a pulse
  useEffect(() => {
    if (still || !window.matchMedia("(pointer: fine)").matches) return;
    const p = sim.pointer;
    const onMove = (e: PointerEvent) => {
      p.x = (e.clientX / window.innerWidth) * 2 - 1;
      p.y = (e.clientY / window.innerHeight) * 2 - 1;
      p.active = true;
    };
    const onDown = (e: PointerEvent) => {
      const el = e.target as Element | null;
      if (el?.closest('[data-section="ai"]') && !el.closest("button, a, .glass")) p.pings++;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [sim, still]);

  return (
    <AiSimProvider value={sim}>
      <AiDriver />
      <AiCamera />
      <Environment />
      <Lattice />
      <Core />
      <Pipeline />
      <Hub />
    </AiSimProvider>
  );
}
