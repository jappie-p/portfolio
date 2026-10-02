import * as THREE from "three";
import { outerH, type Room } from "../layout";
import { SPOTS } from "./glsl";

/** Where the track runs: just under a 3.7 m ceiling, 1.25 m out from the wall. */
export const TRACK = { y: 3.55, z: 1.25 };

/** Warm gallery light, about 3000 K. */
const WARM = new THREE.Color(1.0, 0.86, 0.7);

export type Spot = {
  pos: THREE.Vector3;
  dir: THREE.Vector3;
  /** cone half angles, degrees */
  outer: number;
  inner: number;
  /** full strength; the scene scales it for power-up and hover */
  power: number;
  /** the work it lights, or -1 for the wash on the title */
  work: number;
};

/** One spot per work on the ceiling track, aimed a touch below its centre so
 *  the scallop of light peaks just above the frame; on wide screens one more,
 *  a wide dim wash on the wall behind the exhibition title. */
export function spotsFor(room: Room): Spot[] {
  const spots: Spot[] = room.works.map((w, i) => {
    const card = w.id === "berlijn";
    const pos = new THREE.Vector3(w.x, TRACK.y, TRACK.z);
    const aim = new THREE.Vector3(w.x, w.y - outerH(w) * 0.12, 0);
    return { pos, dir: aim.sub(pos).normalize(), outer: card ? 18 : 24, inner: card ? 9 : 12, power: card ? 7 : 14, work: i };
  });
  const first = room.works[0];
  // the wash sits behind the copy, which hangs where the entrance looks
  const wash = new THREE.Vector3(first.x - 3.3, TRACK.y, TRACK.z + 0.2);
  const aim = new THREE.Vector3(wash.x + 0.2, 1.2, 0);
  spots.unshift({ pos: wash, dir: aim.sub(wash).normalize(), outer: 28, inner: 6, power: room.narrow ? 0 : 1.6, work: -1 });
  return spots.slice(0, SPOTS);
}

/** Uniforms every material shares: one update per frame reaches them all. */
export function sharedUniforms() {
  return {
    uScreen: { value: 1 },
    uTime: { value: 0 },
    uSpotPos: { value: Array.from({ length: SPOTS }, () => new THREE.Vector3()) },
    uSpotDir: { value: Array.from({ length: SPOTS }, () => new THREE.Vector3(0, -1, 0)) },
    uSpotCol: { value: Array.from({ length: SPOTS }, () => new THREE.Vector3()) },
    uSpotCone: { value: Array.from({ length: SPOTS }, () => new THREE.Vector2(1, 1)) },
    uAmbient: { value: new THREE.Vector3(0.009, 0.011, 0.015) },
    uNoise: { value: null as THREE.Texture | null },
  };
}

export type Shared = ReturnType<typeof sharedUniforms>;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

/** The spot's shape at a point of a face looking along +z (cone squared over
 *  distance squared, times the cosine): the face shader is normalised by it
 *  at the picture's centre, so a print shows at its own exposure there. */
export function shapeAt(s: Spot, p: THREE.Vector3) {
  const d = s.pos.clone().sub(p);
  const d2 = d.lengthSq();
  d.normalize();
  const rad = Math.PI / 180;
  const c = smooth(Math.cos(s.outer * rad), Math.cos(s.inner * rad), -d.dot(s.dir));
  return ((c * c) / d2) * Math.max(d.z, 0);
}

/** Write the spots into the shared uniforms; `level` scales each one. */
export function applySpots(u: Shared, spots: Spot[], level: number[]) {
  spots.forEach((s, i) => {
    u.uSpotPos.value[i].copy(s.pos);
    u.uSpotDir.value[i].copy(s.dir);
    const k = s.power * (level[i] ?? 1);
    u.uSpotCol.value[i].set(WARM.r * k, WARM.g * k, WARM.b * k);
    const rad = Math.PI / 180;
    u.uSpotCone.value[i].set(Math.cos(s.outer * rad), Math.cos(s.inner * rad));
  });
}
