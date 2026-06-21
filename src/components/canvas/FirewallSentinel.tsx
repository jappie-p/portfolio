"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const TARGET = 6; // max-dimension size in world units

/** Loads Jasper's firewall gate GLB, auto-centers + normalizes it (Meshy
 *  exports arbitrary scale/orientation), and gives it a subtle idle. */
export function FirewallSentinel() {
  const { scene } = useGLTF("/models/firewall-sentinel.glb");
  const ref = useRef<THREE.Group>(null!);

  const model = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const s = TARGET / maxDim;
    clone.scale.setScalar(s);
    clone.position.set(-center.x * s, -center.y * s, -center.z * s);
    return clone;
  }, [scene]);

  useFrame(() => {
    if (ref.current) {
      const t = Date.now() * 0.001;
      ref.current.rotation.y = Math.sin(t * 0.3) * 0.08;
      ref.current.position.y = Math.sin(t * 0.8) * 0.05;
    }
  });

  return (
    <group ref={ref}>
      <primitive object={model} />
    </group>
  );
}

useGLTF.preload("/models/firewall-sentinel.glb");
