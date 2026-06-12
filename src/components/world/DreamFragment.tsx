"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import { useJourney } from "@/lib/store";

// CH1: a floating low-poly "game world" fragment (the dream).
// CH2: a clean assembled stack (the turn). Both fade by chapter.
export default function DreamFragment() {
  const dream = useRef<Group>(null);
  const turn = useRef<Group>(null);

  useFrame((state) => {
    const { chapter, chapterProgress } = useJourney.getState();
    const t = state.clock.elapsedTime;

    if (dream.current) {
      dream.current.rotation.y = t * 0.15;
      dream.current.position.y = 0.9 + Math.sin(t * 0.6) * 0.12;
      // Visible through hero + dream, gone by mid-turn.
      const vis =
        chapter < 2 ? 1 : chapter === 2 ? Math.max(0, 1 - chapterProgress * 2) : 0;
      dream.current.visible = vis > 0;
      dream.current.scale.setScalar(0.001 + vis);
    }
    if (turn.current) {
      turn.current.rotation.y = -t * 0.08;
      const vis =
        chapter === 2
          ? Math.min(1, chapterProgress * 2)
          : chapter > 2
            ? 1
            : 0;
      turn.current.visible = vis > 0;
      turn.current.scale.setScalar(0.001 + vis * 0.9);
    }
  });

  return (
    <>
      <group ref={dream} position={[-2.6, 1.7, 1.6]} scale={1.4}>
        <mesh>
          <icosahedronGeometry args={[0.7, 0]} />
          <meshBasicMaterial color="#c87f2e" wireframe />
        </mesh>
        <mesh position={[0.8, 0.4, -0.3]} rotation={[0.4, 0.3, 0.1]}>
          <boxGeometry args={[0.28, 0.28, 0.28]} />
          <meshBasicMaterial color="#e8c9a0" wireframe />
        </mesh>
        <mesh position={[-0.7, -0.4, 0.2]} rotation={[0.2, 0.8, 0.3]}>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshBasicMaterial color="#a8865f" wireframe />
        </mesh>
        <pointLight color="#e8961e" intensity={1.4} distance={4.5} decay={2} />
      </group>

      <group ref={turn} position={[1.6, 0.5, -1.4]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[0, i * 0.34, 0]} rotation={[0, i * 0.18, 0]}>
            <boxGeometry args={[0.9 - i * 0.16, 0.26, 0.9 - i * 0.16]} />
            <meshStandardMaterial
              color="#241e18"
              roughness={0.82}
              emissive="#d97706"
              emissiveIntensity={0.05}
            />
          </mesh>
        ))}
        <pointLight
          position={[0.6, 1.2, 1.0]}
          color="#e8961e"
          intensity={1.6}
          distance={5}
          decay={2}
        />
      </group>
    </>
  );
}
