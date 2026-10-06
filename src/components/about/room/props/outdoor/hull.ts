import * as THREE from "three";

/**
 * A freeride windsurf board in its own space: the tail at y = 0, the nose
 * at y = LENGTH, x across, the deck facing +z. Its shape is a planform, a
 * deck that domes off the rails, a shallow belly underneath, and rocker
 * that kicks the nose up.
 */
export const LENGTH = 2.35;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

/** Half the board's width `u` of the way from tail to nose. */
export function halfWidth(u: number) {
  const tail = 0.215;
  const max = 0.36;
  const at = 0.42;
  let w = u < at ? tail + (max - tail) * Math.pow(Math.sin((Math.PI / 2) * (u / at)), 0.9) : max * Math.pow(Math.max(0, 1 - Math.pow((u - at) / (1 - at), 2.3)), 0.55);
  // the tail's corners rounded off
  if (u < 0.03) w *= 0.84 + 0.16 * Math.sqrt(u / 0.03);
  return w;
}
/** How far the deck rises over the rail line, and the belly sinks under it. */
const deckRise = (u: number) => 0.02 + 0.055 * Math.pow(Math.sin(Math.PI * Math.min(Math.max((u + 0.12) / 1.12, 0), 1)), 1.2);
const belly = (u: number) => 0.012 + 0.028 * Math.sin((Math.PI * (u + 0.05)) / 1.1);
/** The rail line's height: the nose kicks up, the tail a touch. */
export const rocker = (u: number) => 0.1 * Math.pow(Math.max(0, (u - 0.7) / 0.3), 2.2) + 0.008 * Math.pow(Math.max(0, (0.06 - u) / 0.06), 2);

/** A point on the deck, `s` across it (-1 rail to +1 rail). */
export function deckPoint(u: number, s: number, lift = 0, out = new THREE.Vector3()) {
  const a = Math.min(Math.abs(s), 1);
  const dome = Math.pow(Math.max(0, 1 - Math.pow(a, 3.5)), 0.42);
  return out.set(s * halfWidth(u), u * LENGTH, rocker(u) + deckRise(u) * dome + lift);
}
/** A point on the bottom. */
export function bottomPoint(u: number, s: number, out = new THREE.Vector3()) {
  const a = Math.min(Math.abs(s), 1);
  const curve = Math.pow(Math.max(0, 1 - Math.pow(a, 4)), 0.3);
  return out.set(s * halfWidth(u), u * LENGTH, rocker(u) - belly(u) * curve);
}

/** A grid over (u, s), its uv (u, (s + 1) / 2). */
function grid(f: (u: number, s: number, out: THREE.Vector3) => THREE.Vector3, u0: number, u1: number, s0: number, s1: number, nu: number, ns: number, flip: boolean) {
  const pos: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  const p = new THREE.Vector3();
  for (let i = 0; i <= nu; i++) {
    // more rows toward the nose, where it curves
    const t = i / nu;
    const u = u0 + (u1 - u0) * (t + 0.18 * Math.sin(Math.PI * t) * smooth(0, 1, t));
    for (let j = 0; j <= ns; j++) {
      const s = s0 + ((s1 - s0) * j) / ns;
      f(u, s, p);
      pos.push(p.x, p.y, p.z);
      uv.push(u, (s + 1) / 2);
    }
  }
  for (let i = 0; i < nu; i++)
    for (let j = 0; j < ns; j++) {
      const a = i * (ns + 1) + j;
      const b = a + ns + 1;
      if (flip) index.push(a, a + 1, b, a + 1, b + 1, b);
      else index.push(a, b, a + 1, a + 1, b, b + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setIndex(index);
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

/** The deck's surface (the graphics go on it). */
export const deck = () => grid((u, s, o) => deckPoint(u, s, 0, o), 0, 1, -1, 1, 120, 40, true);
/** The bottom and the tail's face, in one. */
export function hull() {
  const bottom = grid((u, s, o) => bottomPoint(u, s, o), 0, 1, -1, 1, 120, 40, false);
  // the tail's face: between the deck's edge and the bottom's at u = 0
  const pos: number[] = [];
  const n = 40;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (let j = 0; j < n; j++) {
    const s0 = -1 + (2 * j) / n;
    const s1 = -1 + (2 * (j + 1)) / n;
    const d0 = deckPoint(0, s0).clone();
    const d1 = deckPoint(0, s1).clone();
    bottomPoint(0, s0, a);
    bottomPoint(0, s1, b);
    pos.push(d0.x, d0.y, d0.z, a.x, a.y, a.z, d1.x, d1.y, d1.z, d1.x, d1.y, d1.z, a.x, a.y, a.z, b.x, b.y, b.z);
  }
  const tail = new THREE.BufferGeometry();
  tail.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  tail.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  tail.computeVertexNormals();
  return { bottom, tail };
}

/** The deck pad: a soft layer on the deck from the tail to past the mast track. */
export const pad = () => grid((u, s, o) => deckPoint(u, s, 0.0035, o), 0.025, 0.47, -0.84, 0.84, 50, 26, true);
