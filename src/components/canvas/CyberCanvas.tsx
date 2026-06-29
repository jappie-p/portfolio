"use client";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { CyberScene } from "./CyberScene";

/** The cyber scene rendered live in WebGL (resolution-independent, crisp at any
 *  screen size): a 3/4 angled cyber-command view — code wall (left) ▸ firewall ▸
 *  named attack beams (right) — with bloom + fog. The camera scrubs on scroll. */
export function CyberCanvas({
  progressRef,
  active,
}: {
  progressRef?: { current: number };
  active: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
      <Canvas
        camera={{ position: [6, 3.4, 19], fov: 52 }}
        dpr={[1, 2]}
        gl={{ alpha: false, antialias: true }}
      >
        <color attach="background" args={["#0a1626"]} />
        <fog attach="fog" args={["#0a1626", 15, 48]} />
        <CyberScene progressRef={progressRef} active={active} />
        <EffectComposer>
          <Bloom intensity={1.1} luminanceThreshold={0.5} luminanceSmoothing={0.9} mipmapBlur />
          <Vignette offset={0.3} darkness={0.78} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
