"use client";

import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera, Vector3 } from "three";
import { useRef } from "react";
import { sampleCamera, type CameraSample } from "@/lib/journey-math";
import { useJourney } from "@/lib/store";

export default function CameraRig() {
  const sample = useRef<CameraSample>({
    position: new Vector3(),
    target: new Vector3(),
    roll: 0,
    fov: 42,
  });
  const smoothedTarget = useRef<Vector3 | null>(null);
  const smoothedRoll = useRef(0);

  useFrame((state, dt) => {
    const camera = state.camera as PerspectiveCamera;
    const { progress, velocity } = useJourney.getState();
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

    // Banking roll, smoothed so whoosh entries lean in and ease out.
    smoothedRoll.current += (sample.current.roll - smoothedRoll.current) * Math.min(1, dt * 4);
    camera.rotateZ(smoothedRoll.current);

    // FOV: choreographed base + a kick proportional to scroll velocity,
    // so fast scrolling stretches the view like acceleration.
    const kick = Math.min(8, Math.abs(velocity) * 0.0035);
    const targetFov = sample.current.fov + kick;
    if (Math.abs(camera.fov - targetFov) > 0.01) {
      camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 5);
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
