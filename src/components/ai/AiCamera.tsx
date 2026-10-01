"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useAiSim } from "./sim";
import { aiCameraPose } from "./lib/ai-math";

/** Flies between the chapter keys, drifts a little as if handheld, leans with
 *  the pointer, and breathes in on each flare of the core. */
export function AiCamera() {
  const { state, still, pointer } = useAiSim();
  const smooth = useRef({ x: 0, y: 0 });
  const tmp = useRef({ pos: new THREE.Vector3(), target: new THREE.Vector3(), right: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) });

  useFrame(({ camera, size }, delta) => {
    const cam = camera as THREE.PerspectiveCamera;
    const pose = aiCameraPose(state.p, size.width / Math.max(size.height, 1));
    const { pos, target, right, up } = tmp.current;
    pos.set(...pose.position);
    target.set(...pose.target);
    right.subVectors(target, pos).cross(up).normalize();
    const t = state.time;

    if (!still) {
      const sm = smooth.current;
      const k = 1 - Math.exp(-2.5 * Math.min(delta, 0.05));
      sm.x += (pointer.x - sm.x) * k;
      sm.y += (pointer.y - sm.y) * k;
      pos.addScaledVector(right, sm.x * 0.6 + Math.sin(t * 0.21) * 0.12);
      pos.addScaledVector(up, -sm.y * 0.35 + Math.sin(t * 0.33 + 1) * 0.08);
    }

    cam.position.copy(pos);
    cam.lookAt(target);
    if (pose.roll) cam.rotateZ(pose.roll);
    const fov = pose.fov - state.flare * 1.4;
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  }, -1);

  return null;
}
