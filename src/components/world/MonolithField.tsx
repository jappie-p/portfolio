"use client";

import { featured } from "@/data/projects";

// Five project monoliths flank the camera path through the work chapter
// (camera z ≈ -3.5 → -8 there), plus ambient silhouettes deeper in the fog.
const PROJECT_SLOTS: [number, number, number, number][] = [
  // x, z, height, rotationY
  [-2.6, -4.0, 2.6, 0.18],
  [2.4, -5.2, 3.1, -0.22],
  [-2.2, -6.4, 2.2, 0.4],
  [2.8, -7.6, 2.8, -0.1],
  [-2.9, -8.8, 3.4, 0.28],
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

function Monolith({
  slot,
  emissive = 0,
}: {
  slot: [number, number, number, number];
  emissive?: number;
}) {
  const [x, z, h, ry] = slot;
  return (
    <mesh position={[x, h / 2 - 0.2, z]} rotation={[0, ry, 0]}>
      <boxGeometry args={[h * 0.28, h, h * 0.2]} />
      <meshStandardMaterial
        color="#14110e"
        roughness={0.92}
        metalness={0.05}
        emissive="#d97706"
        emissiveIntensity={emissive}
      />
    </mesh>
  );
}

export default function MonolithField() {
  return (
    <group>
      {featured.map((p, i) => (
        <group key={p.slug}>
          <Monolith slot={PROJECT_SLOTS[i]} emissive={0.06} />
          {/* faint ember core light per project monolith */}
          <pointLight
            position={[PROJECT_SLOTS[i][0], 1.1, PROJECT_SLOTS[i][1] + 0.6]}
            color="#d97706"
            intensity={1.4}
            distance={4}
            decay={2}
          />
        </group>
      ))}
      {AMBIENT_SLOTS.map((slot, i) => (
        <Monolith key={`ambient-${i}`} slot={slot} />
      ))}
    </group>
  );
}
