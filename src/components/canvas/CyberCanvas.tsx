"use client";
import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { CyberScene } from "./CyberScene";
import { hasWebGL } from "@/lib/webgl";
import { prefersReducedMotion } from "@/lib/motion";
import { useJourney } from "@/lib/store";

/** The cyber topic's dark "screen" backdrop — opaque so the additive blue/red
 *  code reads (additive washes out on light). Scoped to the topic, like the orb. */
export function CyberCanvas() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const ok = hasWebGL() && !prefersReducedMotion();
    useJourney.getState().setWebglOk(ok);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(ok);
  }, []);

  if (!ready) return <div className="absolute inset-0 z-0 bg-[#0f1d33]" aria-hidden />;

  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
      <Canvas camera={{ position: [0, 0.4, 11], fov: 52 }} dpr={[1, 1.5]} gl={{ alpha: false, antialias: true }}>
        <color attach="background" args={["#0f1d33"]} />
        <CyberScene />
      </Canvas>
    </div>
  );
}
