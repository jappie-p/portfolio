"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, PlaneGeometry } from "three";
import { useJourney } from "@/lib/store";

// CH1: a floating low-poly "game world" fragment — the dream of building
// game worlds. A wireframe terrain island with floating debris.
export default function DreamFragment() {
  const dream = useRef<Group>(null);

  // Deterministic low-poly terrain: sin/cos height field, no RNG needed.
  const terrain = useMemo(() => {
    const geo = new PlaneGeometry(2.6, 2.6, 10, 10);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const h =
        Math.sin(x * 2.1) * 0.22 +
        Math.cos(y * 1.7 + x * 0.8) * 0.18 +
        Math.sin((x + y) * 3.2) * 0.06;
      pos.setZ(i, h);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Prop-passed geometry isn't auto-disposed by R3F.
  useEffect(() => () => terrain.dispose(), [terrain]);

  useFrame((state) => {
    const { chapter, chapterProgress } = useJourney.getState();
    const t = state.clock.elapsedTime;

    if (dream.current) {
      dream.current.rotation.y = t * 0.12;
      dream.current.position.y = 1.7 + Math.sin(t * 0.6) * 0.12;
      // Visible through hero + dream, gone by mid-turn.
      const vis =
        chapter < 2 ? 1 : chapter === 2 ? Math.max(0, 1 - chapterProgress * 2) : 0;
      dream.current.visible = vis > 0.01;
      dream.current.scale.setScalar(0.001 + vis);
    }
  });

  return (
    <group ref={dream} position={[-3.0, 1.6, 1.0]}>
      <mesh geometry={terrain} rotation={[-Math.PI / 2.3, 0, 0]} position={[0, -0.5, 0]}>
        <meshBasicMaterial color="#8a5a26" wireframe transparent opacity={0.38} />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[0.55, 0]} />
        <meshBasicMaterial color="#c87f2e" wireframe />
      </mesh>
      <mesh position={[0.85, 0.45, -0.3]} rotation={[0.4, 0.3, 0.1]}>
        <boxGeometry args={[0.24, 0.24, 0.24]} />
        <meshBasicMaterial color="#e8c9a0" wireframe />
      </mesh>
      <mesh position={[-0.75, -0.1, 0.3]} rotation={[0.2, 0.8, 0.3]}>
        <boxGeometry args={[0.17, 0.17, 0.17]} />
        <meshBasicMaterial color="#a8865f" wireframe />
      </mesh>
      <pointLight color="#e8961e" intensity={1.2} distance={4.5} decay={2} />
    </group>
  );
}
