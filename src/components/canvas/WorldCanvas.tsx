"use client";
import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PortfolioOrb } from "./PortfolioOrb";
import { hasWebGL } from "@/lib/webgl";
import { prefersReducedMotion } from "@/lib/motion";
import { useJourney } from "@/lib/store";

/** Orb canvas, scoped to the hero. NOTE: in this Chrome a WebGL canvas is
 *  composited below page content/background unless its z-index is high, so the
 *  wrapper sits at z-40 and the hero text is lifted above it (z-45). The canvas
 *  is transparent so the page gradient shows around the orb + its dark disc. */
export function WorldCanvas() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const ok = hasWebGL() && !prefersReducedMotion();
    useJourney.getState().setWebglOk(ok);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(ok);
  }, []);

  if (!ready) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
      <Canvas camera={{ position: [0, 0, 9], fov: 50 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }}>
        <PortfolioOrb />
      </Canvas>
    </div>
  );
}
