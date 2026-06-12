"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { useRef } from "react";
import { sampleCamera } from "@/lib/journey-math";
import { useJourney } from "@/lib/store";

export default function CameraRig() {
  const camera = useThree((s) => s.camera);
  const sample = useRef({ position: new Vector3(), target: new Vector3() });
  const smoothedTarget = useRef<Vector3 | null>(null);

  useFrame((_, dt) => {
    const { progress } = useJourney.getState();
    sampleCamera(progress, sample.current);

    if (!smoothedTarget.current) {
      smoothedTarget.current = sample.current.target.clone();
      camera.position.copy(sample.current.position);
    }

    const k = Math.min(1, dt * 3.2);
    camera.position.lerp(sample.current.position, k);
    smoothedTarget.current.lerp(sample.current.target, k);
    camera.lookAt(smoothedTarget.current);
  });

  return null;
}
