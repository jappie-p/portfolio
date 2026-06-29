"use client";
import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { CyberScene } from "./CyberScene";
import { hasWebGL } from "@/lib/webgl";
import { prefersReducedMotion } from "@/lib/motion";
import { useJourney } from "@/lib/store";

/** The cyber topic's dark "screen" backdrop: a 3/4 angled cyber-command view —
 *  code wall (left) ▸ firewall ▸ named attack beams (right) — with bloom + fog. */
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
      <Canvas
        camera={{ position: [5, 2.6, 13], fov: 52 }}
        dpr={[1, 1.6]}
        gl={{ alpha: false, antialias: true }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      >
        <color attach="background" args={["#0a1626"]} />
        <fog attach="fog" args={["#0a1626", 15, 48]} />
        <CyberScene />
        <EffectComposer>
          <Bloom intensity={1.1} luminanceThreshold={0.5} luminanceSmoothing={0.9} mipmapBlur />
          <Vignette offset={0.3} darkness={0.78} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
