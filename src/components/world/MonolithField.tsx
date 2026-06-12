"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshStandardMaterial, PointLight } from "three";
import { featured } from "@/data/projects";
import { useJourney } from "@/lib/store";

// The work chapter is a colonnade: two tight rows forming a hall the camera
// glides through dead-center (path y≈1.1, z -3.9 → -7.4), plus ambient
// silhouettes deeper in the fog.
const PROJECT_SLOTS: [number, number, number, number][] = [
  // x, z, height, rotationY
  [-2.0, -4.6, 3.0, 0.12],
  [2.0, -5.6, 3.4, -0.15],
  [-2.1, -6.8, 2.9, 0.2],
  [2.1, -7.9, 3.6, -0.1],
  [-2.0, -9.2, 3.2, 0.15],
];

const AMBIENT_SLOTS: [number, number, number, number][] = [
  [-6, -12, 4.5, 0.5],
  [7, -14, 6, -0.3],
  [-8, -18, 8, 0.2],
  [5, -20, 7, 0.7],
  [-4, -24, 9, -0.5],
  [9, -26, 8, 0.1],
  [0, -30, 11, 0.3],
  [-10, -28, 7, -0.2],
];

function ProjectMonolith({
  slot,
  phase,
}: {
  slot: [number, number, number, number];
  phase: number;
}) {
  const [x, z, h, ry] = slot;
  const mat = useRef<MeshStandardMaterial>(null);
  const light = useRef<PointLight>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const { chapter, chapterProgress } = useJourney.getState();
    // The cores ignite as the journey approaches the work chapter: asleep
    // through the story (the turn camera passes right beside them), waking
    // only in the turn's final stretch, full burn among the projects.
    const ignite =
      chapter < 2
        ? 0.08
        : chapter === 2
          ? 0.08 + Math.max(0, (chapterProgress - 0.7) / 0.3) * 0.92
          : 1;
    if (mat.current) {
      mat.current.emissiveIntensity =
        (0.11 + (Math.sin(t * 1.3 + phase) * 0.5 + 0.5) * 0.1) * ignite;
    }
    if (light.current) {
      light.current.intensity =
        (1.7 + Math.sin(t * 2.1 + phase * 2) * 0.45) * ignite;
    }
  });

  return (
    <group>
      <mesh position={[x, h / 2 - 0.2, z]} rotation={[0, ry, 0]}>
        <boxGeometry args={[h * 0.28, h, h * 0.2]} />
        <meshStandardMaterial
          ref={mat}
          color="#1b1612"
          roughness={0.85}
          metalness={0.08}
          emissive="#d97706"
          emissiveIntensity={0.14}
        />
      </mesh>
      <pointLight
        ref={light}
        position={[x, 1.1, z + 0.7]}
        color="#e8961e"
        intensity={2.4}
        distance={5.5}
        decay={2}
      />
    </group>
  );
}

function AmbientMonolith({ slot }: { slot: [number, number, number, number] }) {
  const [x, z, h, ry] = slot;
  return (
    <mesh position={[x, h / 2 - 0.2, z]} rotation={[0, ry, 0]}>
      <boxGeometry args={[h * 0.28, h, h * 0.2]} />
      <meshStandardMaterial color="#120f0c" roughness={0.92} metalness={0.05} />
    </mesh>
  );
}

export default function MonolithField() {
  return (
    <group>
      {featured.map((p, i) => (
        <ProjectMonolith key={p.slug} slot={PROJECT_SLOTS[i]} phase={i * 1.7} />
      ))}
      {AMBIENT_SLOTS.map((slot, i) => (
        <AmbientMonolith key={`ambient-${i}`} slot={slot} />
      ))}
    </group>
  );
}
