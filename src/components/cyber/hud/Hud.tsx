"use client";
import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { cameraPose } from "../lib/scene-math";
import type { PanelPlacement } from "./HudPanel";
import { SecureNetworkPanel } from "./SecureNetworkPanel";
import { SystemLogPanel } from "./SystemLogPanel";
import { TrafficPanel } from "./TrafficPanel";
import { AlertPanel } from "./AlertPanel";

/** Panels are pinned in the world (so the push-in slides them out of frame, like
 *  a real camera move) but placed by where they sit on screen in the opening
 *  shot: NDC x/y plus distance from the camera. */
const REFERENCE = cameraPose(0, 16 / 9);

// Left column for the trusted side, right column for the floods, the top
// middle for the log. The bottom-left stays clear for the section heading.
const SPOTS = {
  secure: [-0.77, 0.54, 8.6],
  traffic: [-0.79, -0.04, 8.6],
  log: [-0.36, 0.74, 8.4],
  alert0: [0.8, 0.62, 10],
  alert1: [0.82, 0.22, 9.6],
  alert2: [0.84, -0.18, 9.2],
} as const;
const SCALE = 0.78;

function place(ndcX: number, ndcY: number, depth: number, order: number, camera: THREE.PerspectiveCamera): PanelPlacement {
  const dir = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(camera).sub(camera.position).normalize();
  const forward = camera.getWorldDirection(new THREE.Vector3());
  const position = camera.position.clone().addScaledVector(dir, depth / dir.dot(forward));
  // face the camera, but stay upright
  const look = new THREE.Vector3(camera.position.x, position.y, camera.position.z);
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(look, position, new THREE.Vector3(0, 1, 0)));
  return { position, quaternion, scale: SCALE, order };
}

export function Hud() {
  const spots = useMemo(() => {
    const cam = new THREE.PerspectiveCamera(REFERENCE.fov, 16 / 9, 0.1, 100);
    cam.position.set(...REFERENCE.position);
    cam.lookAt(...REFERENCE.target);
    cam.updateMatrixWorld();
    return Object.fromEntries(
      Object.entries(SPOTS).map(([k, [x, y, d]], order) => [k, place(x, y, d, order, cam)]),
    ) as Record<keyof typeof SPOTS, PanelPlacement>;
  }, []);

  return (
    <Suspense fallback={null}>
      <SecureNetworkPanel placement={spots.secure} />
      <SystemLogPanel placement={spots.log} />
      <TrafficPanel placement={spots.traffic} />
      <AlertPanel placement={spots.alert0} index={0} />
      <AlertPanel placement={spots.alert1} index={1} />
      <AlertPanel placement={spots.alert2} index={2} />
    </Suspense>
  );
}
