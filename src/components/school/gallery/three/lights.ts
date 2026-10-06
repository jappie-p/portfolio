import * as THREE from "three";
import { EXHIBITS, outerH, type Room } from "../layout";
import { GLOWS, SPOTS } from "./glsl";

/** Where the track runs: in the wide room low and near the wall, so the
 *  entrance sees its lamps in a row just over the frames, running off down
 *  the room; in the narrow one high up and further out, out of sight over
 *  the copy. */
export const trackOf = (room: Room) => (room.narrow ? { y: 3.55, z: 1.25 } : { y: 2.78, z: 0.95 });
/** The ceiling just above the track. */
export const ceilingOf = (room: Room) => trackOf(room).y + 0.17;

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

/** One spot per work on the ceiling track, aimed at its centre with a cone
 *  wide enough that the scallop of light climbs the wall above the frame
 *  and spills on the floor below, each in its work's own
 *  colour; on wide screens one more, a downlight pooling on the floor by
 *  the way in. */
export function spotsFor(room: Room): Spot[] {
  const track = trackOf(room);
  const spots: Spot[] = room.works.map((w, i) => {
    const card = w.id === "berlijn";
    const pos = new THREE.Vector3(w.x, track.y, track.z);
    const aim = new THREE.Vector3(w.x, w.y - outerH(w) * 0.04, 0);
    // the narrow room keeps a tighter pool: it falls right behind the copy
    const cone = room.narrow ? { outer: card ? 20 : 28, inner: card ? 9 : 12, power: card ? 10 : 22 } : { outer: card ? 22 : 31, inner: card ? 9 : 12, power: card ? 9 : 32 };
    return { pos, dir: aim.sub(pos).normalize(), ...cone, work: i, color: tint(EXHIBITS[w.id]?.light) };
  });
  const first = room.works[0];
  // a downlight set in the ceiling over the way in: a warm pool on the
  // polished floor in front of the first work, the bench at its edge
  const pool = new THREE.Vector3(first.x - 1.5, ceilingOf(room) - 0.02, 1.9);
  const aim = new THREE.Vector3(first.x - 1.0, 0, 1.45);
  spots.unshift({ pos: pool, dir: aim.sub(pool).normalize(), outer: 48, inner: 14, power: room.narrow ? 0 : 8, work: -1, color: WARM.clone() });
  return spots.slice(0, SPOTS);
}

/** A glow: where it sits, which work gives it off, its colour (linear) and strength. */
export type Glow = { pos: THREE.Vector3; work: number; color: THREE.Color; power: number };

/** The light the works give off themselves: Zelda's fireflies and glowing
 *  blocks low by its foot, the festival's neon above its frame and its
 *  stage's violet past it. */
export function glowsFor(room: Room): Glow[] {
  const at = (id: string) => room.works.findIndex((w) => w.id === id);
  const zelda = at("zelda");
  const festival = at("festival");
  const z = room.works[zelda];
  const f = room.works[festival];
  return [
    { pos: new THREE.Vector3(z.x + 0.6, 0.3, 0.7), work: zelda, color: new THREE.Color(0.42, 0.95, 0.25), power: 0.38 },
    { pos: new THREE.Vector3(f.x + 0.1, 2.5, 0.7), work: festival, color: new THREE.Color(0.95, 0.2, 1.0), power: 1.4 },
    // the stage's violet wash, high on the wall and the ceiling past it
    { pos: new THREE.Vector3(f.x + 0.9, 2.6, 0.6), work: festival, color: new THREE.Color(0.55, 0.22, 1.0), power: 0.85 },
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
