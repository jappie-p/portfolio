"use client";

import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import { useRef } from "react";
import { sampleCamera } from "@/lib/journey-math";
import { useJourney } from "@/lib/store";

export default function CameraRig() {
  const sample = useRef({ position: new Vector3(), target: new Vector3() });
  const smoothedTarget = useRef<Vector3 | null>(null);

  useFrame((state, dt) => {
    const camera = state.camera;
    const { progress } = useJourney.getState();
    sampleCamera(progress, sample.current);

    if (!smoothedTarget.current) {
      smoothedTarget.current = sample.current.target.clone();
      camera.position.copy(sample.current.position);
    }

    const k = Math.min(1, dt * 3.2);
    camera.position.lerp(sample.current.position, k);
    smoothedTarget.current.lerp(sample.current.target, k);

    // Idle sway: the world keeps breathing when scrolling stops. Applied
    // after the lerp so it never accumulates into the smoothed values.
    const t = state.clock.elapsedTime;
    camera.position.x += Math.sin(t * 0.4) * 0.06;
    camera.position.y += Math.cos(t * 0.27) * 0.04;
    camera.lookAt(smoothedTarget.current);
  });

  return null;
}
