"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Box3, Group, PointLight, Vector3 } from "three";

const MODEL = "/models/desert-armor.glb";
const TARGET_HEIGHT = 3.2; // normalize the model to roughly the old shard's height

// The hero centerpiece: a self-made Desert Armor model floating beside the
// name, breathing on an ember pulse. The camera flies past it into the turn.
export default function DesertArmor() {
  const group = useRef<Group>(null);
  const inner = useRef<Group>(null);
  const light = useRef<PointLight>(null);
  const { scene } = useGLTF(MODEL);

  // Clone so the cached gltf scene is never mutated across HMR / remounts.
  const model = useMemo(() => scene.clone(true), [scene]);

  // Center the model on its own origin and normalize its scale once.
  useLayoutEffect(() => {
    if (!inner.current) return;
    const box = new Box3().setFromObject(model);
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);
    const s = TARGET_HEIGHT / (size.y || 1);
    model.position.set(-center.x, -center.y, -center.z);
    inner.current.scale.setScalar(s);
  }, [model]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (group.current) {
      group.current.rotation.y = t * 0.12;
      group.current.position.y = 1.55 + Math.sin(t * 0.5) * 0.09;
    }
    if (light.current) light.current.intensity = 1.4 + Math.sin(t * 1.7) * 0.4;
  });

  return (
    <group ref={group} position={[3.0, 1.55, 0.2]}>
      <group ref={inner}>
        <primitive object={model} />
      </group>
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

useGLTF.preload(MODEL);
