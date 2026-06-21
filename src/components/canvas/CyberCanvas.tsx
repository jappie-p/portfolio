"use client";
import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { CyberScene } from "./CyberScene";
import { hasWebGL } from "@/lib/webgl";
import { prefersReducedMotion } from "@/lib/motion";
import { useJourney } from "@/lib/store";

/** The cyber topic's dark "screen" backdrop, with bloom + fog so the battle
 *  glows. Opaque (additive blue/red washes out on light), scoped to the topic. */
export function CyberCanvas() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const ok = hasWebGL() && !prefersReducedMotion();
    useJourney.getState().setWebglOk(ok);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(ok);
  }, []);

  if (!ready) return <div className="absolute inset-0 z-0 bg-[#0a1626]" aria-hidden />;

  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
      <Canvas camera={{ position: [0, 1.5, 11], fov: 52 }} dpr={[1, 1.6]} gl={{ alpha: false, antialias: true }}>
        <color attach="background" args={["#0a1626"]} />
        <fog attach="fog" args={["#0a1626", 13, 44]} />
        <CyberScene />
        <EffectComposer>
          <Bloom intensity={1.35} luminanceThreshold={0.2} luminanceSmoothing={0.85} mipmapBlur />
          <Vignette offset={0.3} darkness={0.78} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
