"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSim } from "./SimContext";
import { cameraPose } from "./lib/scene-math";
import { shakeAmount } from "./lib/juice";

/** Smooth-ish noise in -1..1 from a few incommensurate sines. */
const wobble = (t: number, seed: number) =>
  0.5 * Math.sin(t * 37.1 + seed) + 0.3 * Math.sin(t * 23.7 + seed * 2.3) + 0.2 * Math.sin(t * 13.3 + seed * 4.1);

/** Flies the camera between the chapter keys (with a dutch roll per chapter),
 *  shakes it on hits, kicks the lens on each firewall shockwave, and adds a
 *  slight handheld drift and pointer parallax. */
export function CameraRig() {
  const { state, still, pointer } = useSim();
  const smooth = useRef({ x: 0, y: 0 });
  const tmp = useRef({ pos: new THREE.Vector3(), target: new THREE.Vector3(), right: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) });

  useFrame(({ camera, size }, delta) => {
    const cam = camera as THREE.PerspectiveCamera;
    const pose = cameraPose(state.p, size.width / Math.max(size.height, 1));
    const { pos, target, right, up } = tmp.current;
    pos.set(...pose.position);
    target.set(...pose.target);
    right.subVectors(target, pos).cross(up).normalize();
    const t = state.time;
    let roll = pose.roll;
    let kick = 0;

    if (!still) {
      const sm = smooth.current;
      const k = 1 - Math.exp(-3 * Math.min(delta, 0.05));
      sm.x += (pointer.x - sm.x) * k;
      sm.y += (pointer.y - sm.y) * k;
      pos.addScaledVector(right, sm.x * 0.32 + Math.sin(t * 0.37) * 0.035);
      pos.addScaledVector(up, -sm.y * 0.18 + Math.sin(t * 0.53 + 1) * 0.025);

      // trauma shake, scaled with distance so it reads the same close up and wide
      const shake = shakeAmount(state.trauma) * (pos.distanceTo(target) / 8);
      pos.addScaledVector(right, wobble(t, 0) * shake * 0.2);
      pos.addScaledVector(up, wobble(t, 5) * shake * 0.14);
      roll += wobble(t, 9) * shakeAmount(state.trauma) * 0.035;
      kick = 3 * state.defense * Math.exp(-(t - state.pulseAt) * 5);
    }

    cam.position.copy(pos);
    cam.lookAt(target);
    if (roll) cam.rotateZ(roll);
    const fov = pose.fov + kick;
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  }, -1);

  return null;
}
