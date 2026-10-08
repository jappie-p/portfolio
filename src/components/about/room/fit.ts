import * as THREE from "three";
import { HULL, OVERVIEW } from "./layout";

/** Where the room may reach on screen, in NDC, after the lens shift. */
export type Frame = { left: number; right: number; bottom: number; top: number };

/** The overview's camera position for a look at `target` from a direction. */
export function orbit(
  target: THREE.Vector3,
  azimuth: number,
  elevation: number,
  distance: number,
  out: THREE.Vector3,
) {
  return out
    .set(
      Math.sin(azimuth) * Math.cos(elevation),
      Math.sin(elevation),
      Math.cos(azimuth) * Math.cos(elevation),
    )
    .multiplyScalar(distance)
    .add(target);
}

const hull = HULL.map(([x, y, z]) => new THREE.Vector3(x, y, z));

/**
 * How far back the overview camera stands: the nearest distance at which
 * every point of the room's outline lands inside `frame`, for a screen of this
 * shape and a lens shifted by `shift` (NDC).
 */
export function fitDistance(aspect: number, frame: Frame, shift: { x: number; y: number }) {
  const t = Math.tan((OVERVIEW.fov * Math.PI) / 360);
  const target = new THREE.Vector3(...OVERVIEW.target);
  const pos = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const v = new THREE.Vector3();
  const fits = (d: number) => {
    orbit(target, OVERVIEW.azimuth, OVERVIEW.elevation, d, pos);
    fwd.subVectors(target, pos).normalize();
    right.crossVectors(fwd, THREE.Object3D.DEFAULT_UP).normalize();
    up.crossVectors(right, fwd);
    return hull.every((c) => {
      v.subVectors(c, pos);
      const z = v.dot(fwd);
      const x = v.dot(right) / (z * t * aspect) + shift.x;
      const y = v.dot(up) / (z * t) + shift.y;
      return x >= frame.left && x <= frame.right && y >= frame.bottom && y <= frame.top;
    });
  };
  let lo = 4;
  let hi = 60;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}
