import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Colour along a crystal: root, shoulder, tip (linear). */
export type Ramp = readonly [THREE.Color, THREE.Color, THREE.Color];

/** A spot where a facet can catch the light and glint: on the surface, with
 *  that facet's outward normal. */
export interface GlintSpot {
  p: THREE.Vector3;
  n: THREE.Vector3;
  size: number;
}

type V = THREE.Vector3;
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP = v3(0, 1, 0);

/** Triangles with flat normals (crisp facets) and per-vertex colour. */
class Soup {
  readonly pos: number[] = [];
  readonly nor: number[] = [];
  readonly col: number[] = [];
  private readonly ab = new THREE.Vector3();
  private readonly ac = new THREE.Vector3();
  private readonly n = new THREE.Vector3();

  /** Add triangle a b c, wound so its normal points away from `inside`.
   *  Returns the normal. */
  tri(a: V, b: V, c: V, ca: THREE.Color, cb: THREE.Color, cc: THREE.Color, inside: V): V {
    this.n.crossVectors(this.ab.subVectors(b, a), this.ac.subVectors(c, a)).normalize();
    const mid = v3((a.x + b.x + c.x) / 3, (a.y + b.y + c.y) / 3, (a.z + b.z + c.z) / 3);
    if (this.n.dot(mid.sub(inside)) < 0) {
      [b, c] = [c, b];
      [cb, cc] = [cc, cb];
      this.n.negate();
    }
    for (const [p, col] of [
      [a, ca],
      [b, cb],
      [c, cc],
    ] as const) {
      this.pos.push(p.x, p.y, p.z);
      this.nor.push(this.n.x, this.n.y, this.n.z);
      this.col.push(col.r, col.g, col.b);
    }
    return this.n.clone();
  }

  geometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.col, 3));
    return g;
  }
}

function rampAt(ramp: Ramp, t: number): THREE.Color {
  const k = Math.min(1, Math.max(0, t));
  return k < 0.66 ? ramp[0].clone().lerp(ramp[1], k / 0.66) : ramp[1].clone().lerp(ramp[2], (k - 0.66) / 0.34);
}

/**
 * One quartz point, growing along +Y from the origin: a hexagonal prism
 * (slightly irregular, buried a little at the root) ending in a six-faced
 * termination whose faces alternate large and small, apex off centre, the
 * way amethyst grows. `double` makes a loose, doubly terminated point centred
 * on the origin. Colour runs from the ramp's root to its tip.
 */
export function crystalPoint(rnd: () => number, len: number, radius: number, ramp: Ramp, double = false): { geo: THREE.BufferGeometry; glints: GlintSpot[] } {
  const soup = new Soup();
  const spin = rnd() * Math.PI;
  const angles = Array.from({ length: 6 }, (_, i) => spin + (i * Math.PI) / 3 + (rnd() - 0.5) * 0.14);
  const radii = angles.map(() => radius * (0.9 + rnd() * 0.18));
  const ring = (y: (i: number) => number, k = 1) => angles.map((a, i) => v3(Math.cos(a) * radii[i] * k, y(i), Math.sin(a) * radii[i] * k));
  const half = len / 2;
  const shoulder = (double ? half * (0.42 + rnd() * 0.12) : len * (0.56 + rnd() * 0.12)) + 0;
  const step = len * 0.035;
  const top = ring((i) => shoulder + (i % 2 ? -step : step) + (rnd() - 0.5) * step);
  const off = rnd() * Math.PI * 2;
  const apexR = radius * 0.28 * rnd();
  const tipY = double ? half : len;
  const apex = v3(Math.cos(off) * apexR, tipY, Math.sin(off) * apexR);
  const tone = (y: number) => (double ? Math.abs(y) / half : y / len);
  const glints: GlintSpot[] = [];

  let bottom: V[];
  let bottomApex: V | null = null;
  if (double) {
    bottom = ring((i) => -shoulder + (i % 2 ? step : -step) + (rnd() - 0.5) * step, 0.97);
    const off2 = rnd() * Math.PI * 2;
    bottomApex = v3(Math.cos(off2) * apexR, -half, Math.sin(off2) * apexR);
  } else {
    bottom = ring(() => -radius * 0.6, 1.04);
  }
  const axis = (y: number) => v3(0, y, 0);
  for (let i = 0; i < 6; i++) {
    const j = (i + 1) % 6;
    const a = bottom[i];
    const b = bottom[j];
    const c = top[j];
    const d = top[i];
    const mid = axis((a.y + d.y) / 2);
    const n = soup.tri(a, b, c, rampAt(ramp, tone(a.y)), rampAt(ramp, tone(b.y)), rampAt(ramp, tone(c.y)), mid);
    soup.tri(a, c, d, rampAt(ramp, tone(a.y)), rampAt(ramp, tone(c.y)), rampAt(ramp, tone(d.y)), mid);
    if (i % 3 === 1) glints.push({ p: v3((a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2), n, size: radius * 1.1 });
    const tn = soup.tri(d, c, apex, rampAt(ramp, tone(d.y)), rampAt(ramp, tone(c.y)), rampAt(ramp, 1), axis(shoulder * 0.9));
    if (i === 0) glints.push({ p: apex.clone(), n: tn, size: radius * 1.7 });
    if (i === 3) glints.push({ p: v3((d.x + c.x + apex.x) / 3, (d.y + c.y + apex.y) / 3, (d.z + c.z + apex.z) / 3), n: tn, size: radius * 1.3 });
    if (bottomApex) soup.tri(b, a, bottomApex, rampAt(ramp, tone(b.y)), rampAt(ramp, tone(a.y)), rampAt(ramp, 1), axis(-shoulder * 0.9));
  }
  return { geo: soup.geometry(), glints };
}

/** Move a point to `root`, its +Y turned to `dir`, and the same for its glints. */
export function place(geo: THREE.BufferGeometry, glints: GlintSpot[], root: V, dir: V): void {
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
  const m = new THREE.Matrix4().compose(root, q, v3(1, 1, 1));
  geo.applyMatrix4(m);
  for (const g of glints) {
    g.p.applyMatrix4(m);
    g.n.applyQuaternion(q);
  }
}

/** Merge points into one draw call. */
export function merge(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
  if (!merged) throw new Error("crystal merge failed");
  merged.computeBoundingSphere();
  return merged;
}

/** A tumbled labradorite slab: an irregular, bevelled heptagon of thickness
 *  `thick`, centred on the origin, broad faces along ±Z. UVs span 0..1 over
 *  its face, for the schiller map. */
export function slabGeometry(rnd: () => number, radius: number, thick: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const n = 7;
  const spin = rnd() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const a = spin + (i / n) * Math.PI * 2 + (rnd() - 0.5) * 0.35;
    const r = radius * (0.74 + rnd() * 0.3);
    if (i) shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    else shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  shape.closePath();
  const depth = thick * 0.5;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: thick * 0.25,
    bevelSize: radius * 0.1,
    bevelSegments: 3,
    curveSegments: 1,
  });
  geo.translate(0, 0, -depth / 2);
  remapUv(geo, radius * 1.15);
  geo.computeBoundingSphere();
  return geo;
}

/** The wall's outline: the lip's radius at angle a (y up), wobbling slowly so
 *  the cavity reads as grown rather than drawn. */
export function lipShape(a: number, seed: number): number {
  const p = seed * 1.7;
  return 1 + 0.13 * Math.sin(a * 2 + p) + 0.05 * Math.sin(a * 5 + p * 2.3) + 0.018 * Math.sin(a * 11 + p * 0.7);
}

/** Largest value lipShape can reach: the texture has to fit it. */
export const LIP_MAX = 1.2;

/** A polished slab of geode wall: the lip outline at radius r, extruded and
 *  bevelled, its cut face toward +Z. Returns the face's z. UVs map the face so
 *  that the band texture (see bandTexture) lines up with the outline. */
export function wallGeometry(r: number, seed: number): { geo: THREE.BufferGeometry; face: number } {
  const shape = new THREE.Shape();
  const steps = 128;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const rr = r * lipShape(a, seed);
    if (i) shape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else shape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  shape.closePath();
  const depth = r * 0.16;
  const bevel = r * 0.05;
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: r * 0.04, bevelSegments: 3, curveSegments: 1 });
  geo.translate(0, 0, -depth);
  remapUv(geo, r * LIP_MAX);
  geo.computeBoundingSphere();
  return { geo, face: bevel };
}

/** Extrude UVs come out in shape units: map ±half onto 0..1. */
function remapUv(geo: THREE.BufferGeometry, half: number) {
  const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5 + uv.getX(i) / (2 * half), 0.5 + uv.getY(i) / (2 * half));
  uv.needsUpdate = true;
}
