"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, MeshStandardMaterial, PointLight } from "three";

// The hero centerpiece: a tall shard floating beside the name, ember core
// breathing inside. The camera flies past it on the way into the turn.
export default function HeroShard() {
  const group = useRef<Group>(null);
  const mat = useRef<MeshStandardMaterial>(null);
  const light = useRef<PointLight>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (group.current) {
      group.current.rotation.y = t * 0.12;
      group.current.position.y = 1.55 + Math.sin(t * 0.5) * 0.09;
    }
    const pulse = 0.09 + (Math.sin(t * 1.1) * 0.5 + 0.5) * 0.07;
    if (mat.current) mat.current.emissiveIntensity = pulse;
    if (light.current) light.current.intensity = 1.4 + Math.sin(t * 1.7) * 0.4;
  });

  return (
    <group ref={group} position={[2.6, 1.55, 0.6]}>
      <mesh rotation={[0.04, 0.5, -0.03]}>
        <boxGeometry args={[0.85, 3.4, 0.65]} />
        <meshStandardMaterial
          ref={mat}
          color="#14100c"
          roughness={0.82}
          metalness={0.1}
          emissive="#d97706"
          emissiveIntensity={0.09}
        />
      </mesh>
      <pointLight
        ref={light}
        position={[0.2, 0.4, 0.9]}
        color="#e8961e"
        intensity={1.4}
        distance={6}
        decay={2}
      />
    </group>
  );
}
