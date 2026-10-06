import * as THREE from "three";
import { EXHIBITS, outerH, type Room } from "../layout";
import { GLOWS, SPOTS } from "./glsl";

/** Where the track runs: just under a 3.7 m ceiling, 1.25 m out from the wall. */
export const TRACK = { y: 3.55, z: 1.25 };

/** Warm gallery light, about 2700 K. */
const WARM = new THREE.Color(1.0, 0.8, 0.58);

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
  /** its colour, linear, brightest channel 1 */
  color: THREE.Color;
};

/** A work's light: its exhibit's colour, as bright as the warm white. */
function tint(hex: string | undefined) {
  if (!hex) return WARM.clone();
  const c = new THREE.Color(hex);
  return c.multiplyScalar(1 / Math.max(c.r, c.g, c.b));
}

/** One spot per work on the ceiling track, aimed a touch below its centre so
 *  the scallop of light peaks just above the frame, each in its work's own
 *  colour; on wide screens one more, a wide dim wash on the wall behind the
 *  exhibition title. */
export function spotsFor(room: Room): Spot[] {
  const spots: Spot[] = room.works.map((w, i) => {
    const card = w.id === "berlijn";
    const pos = new THREE.Vector3(w.x, TRACK.y, TRACK.z);
    const aim = new THREE.Vector3(w.x, w.y - outerH(w) * 0.12, 0);
    return { pos, dir: aim.sub(pos).normalize(), outer: card ? 20 : 28, inner: card ? 9 : 12, power: card ? 10 : 20, work: i, color: tint(EXHIBITS[w.id]?.light) };
  });
  const first = room.works[0];
  // the wash sits behind the copy, which hangs where the entrance looks
  const wash = new THREE.Vector3(first.x - 3.3, TRACK.y, TRACK.z + 0.2);
  const aim = new THREE.Vector3(wash.x + 0.2, 1.2, 0);
  spots.unshift({ pos: wash, dir: aim.sub(wash).normalize(), outer: 28, inner: 6, power: room.narrow ? 0 : 1.6, work: -1, color: WARM.clone() });
  return spots.slice(0, SPOTS);
}

/** A glow: where it sits, which work gives it off, its colour (linear) and strength. */
export type Glow = { pos: THREE.Vector3; work: number; color: THREE.Color; power: number };

/** The light the works give off themselves: Zelda's fireflies and glowing
 *  blocks low by its foot, the festival's neon above and beside its frame. */
export function glowsFor(room: Room): Glow[] {
  const at = (id: string) => room.works.findIndex((w) => w.id === id);
  const zelda = at("zelda");
  const festival = at("festival");
  const z = room.works[zelda];
  const f = room.works[festival];
  return [
    { pos: new THREE.Vector3(z.x + 0.6, 0.45, 0.6), work: zelda, color: new THREE.Color(0.42, 0.95, 0.25), power: 0.45 },
    { pos: new THREE.Vector3(f.x - 0.15, 2.4, 0.45), work: festival, color: new THREE.Color(1.0, 0.22, 0.85), power: 0.7 },
  ].slice(0, GLOWS);
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
    uGlowPos: { value: Array.from({ length: GLOWS }, () => new THREE.Vector3(0, -50, 0)) },
    uGlowCol: { value: Array.from({ length: GLOWS }, () => new THREE.Vector3()) },
    uAmbient: { value: new THREE.Vector3(0.009, 0.011, 0.015) },
    uNoise: { value: null as THREE.Texture | null },
  };
}

export type Shared = ReturnType<typeof sharedUniforms>;

export const smooth = (a: number, b: number, x: number) => {
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
    u.uSpotCol.value[i].set(s.color.r * k, s.color.g * k, s.color.b * k);
    const rad = Math.PI / 180;
    u.uSpotCone.value[i].set(Math.cos(s.outer * rad), Math.cos(s.inner * rad));
  });
}

/** Write the glows; each follows its work's level, as its spot does. */
export function applyGlows(u: Shared, glows: Glow[], workLevel: (work: number) => number) {
  glows.forEach((g, i) => {
    u.uGlowPos.value[i].copy(g.pos);
    const k = g.power * workLevel(g.work);
    u.uGlowCol.value[i].set(g.color.r * k, g.color.g * k, g.color.b * k);
  });
}
