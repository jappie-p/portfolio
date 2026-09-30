"use client";
import { Canvas } from "@react-three/fiber";
import { PortfolioOrb } from "./PortfolioOrb";

/** The AI topic's orb, rendered live behind the copy; `active` pauses it when
 *  the topic is off screen, `still` draws a single frame (reduced motion). */
export function WorldCanvas({ active, still }: { active: boolean; still: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <Canvas
        camera={{ position: [0, 0, 9], fov: 50 }}
        dpr={[1, 1.5]}
        frameloop={still ? "demand" : active ? "always" : "never"}
        gl={{ alpha: true, antialias: true }}
      >
        <PortfolioOrb />
      </Canvas>
    </div>
  );
}
