"use client";
import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbParticles } from "./OrbParticles";
import { useJourney } from "@/lib/store";
import { TOPIC_INDEX } from "@/lib/chapters";

const damp = THREE.MathUtils.damp;

/** Where the orb sits for a given sideways position through the AI topic: on
 *  the right beside the copy for the cover and Jarvis, then gliding up and
 *  shrinking on the last panel to make room for the automation diagram. On
 *  portrait screens it floats above the copy, and bows out on the last panel. */
function layout(progress: number, aspect: number) {
  const portrait = aspect < 1;
  const last = THREE.MathUtils.smoothstep(progress, 0.5, 1);
  // portrait: no room beside the copy on the last panel, so the diagram takes over there
  if (portrait) return { x: 0, y: 1.9 + last * 0.8, s: 0.52 * (1 - last) };
  const halfW = 9 * Math.tan(THREE.MathUtils.degToRad(25)) * aspect;
  return { x: halfW * 0.42 + last * halfW * 0.2, y: 0.1 + last * 2.2, s: 0.8 - last * 0.42 };
}

export function PortfolioOrb() {
  const outer = useRef<THREE.Group>(null!);
  const vis = useRef(0);
  const { size } = useThree();

  useFrame((_, delta) => {
    const g = outer.current;
    if (!g) return;
    const { topic, projectProgress } = useJourney.getState();
    // the orb belongs to the AI topic; it fades in there and out elsewhere
    const here = topic === TOPIC_INDEX.ai;
    const dt = Math.min(delta, 0.05);
    vis.current = damp(vis.current, here ? 1 : 0, 4, dt);
    const l = layout(here ? projectProgress : 0, size.width / Math.max(size.height, 1));
    g.visible = vis.current > 0.01;
    g.position.x = damp(g.position.x, l.x, 4, dt);
    g.position.y = damp(g.position.y, l.y, 4, dt);
    g.scale.setScalar(Math.max(l.s * vis.current, 0.0001));
  });

  return (
    <group ref={outer}>
      <OrbParticles />
    </group>
  );
}
