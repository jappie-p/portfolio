import * as THREE from "three";
import { mulberry32 } from "../../lib/rng";
import { fbm, noise3 } from "./noise";

/** A stone the tumbler rounded: a broken chunk (an ellipsoid cut by a few
 *  planes) whose edges have worn soft. Sizes in cm. */
export interface PebbleSpec {
  seed: number;
  /** half extents before it broke */
  size: [number, number, number];
  /** broken faces, and how deep they cut into the extent (0..1) */
  cuts: number;
  depth: [number, number];
  /** edge radius: larger is softer */
  round: number;
  /** slow lumps, as a share of the size */
  lumps: number;
  /** fine relief (rough rock), cm */
  grit?: number;
  /** cut flat underneath this far down (share of the height), to sit */
  floor?: number;
  /** subdivisions of the base icosahedron */
  detail: number;
  /** measure the depth below each point (aThick), for translucent stones */
  thickness?: boolean;
}

/** Vertices shaped between pauses: a slice of the work per task. */
const SLICE = 1500;

const PHI = (1 + Math.sqrt(5)) / 2;
const ICO_V = [
  [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0], [0, -1, PHI], [0, 1, PHI],
  [0, -1, -PHI], [0, 1, -PHI], [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1],
];
const ICO_F = [
  [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
  [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
];

/**
 * A geodesic unit sphere, indexed from the start: each icosahedron face cut
 * into n x n triangles, vertices shared along the edges. (Building it
 * unindexed and merging afterwards hashes six times as many vertices.)
 */
function geodesic(n: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const index: number[] = [];
  const keyed = new Map<string, number>();
  const vertex = (x: number, y: number, z: number) => {
    const l = Math.hypot(x, y, z);
    const key = `${Math.round((x / l) * 1e5)},${Math.round((y / l) * 1e5)},${Math.round((z / l) * 1e5)}`;
    let i = keyed.get(key);
    if (i === undefined) {
      i = pos.length / 3;
      pos.push(x / l, y / l, z / l);
      keyed.set(key, i);
    }
    return i;
  };
  for (const [a, b, c] of ICO_F) {
    const [A, B, C] = [ICO_V[a], ICO_V[b], ICO_V[c]];
    const row: number[][] = [];
    for (let i = 0; i <= n; i++) {
      row.push([]);
      for (let j = 0; j <= n - i; j++) {
        const u = i / n;
        const v = j / n;
        const w = 1 - u - v;
        row[i].push(vertex(A[0] * w + B[0] * u + C[0] * v, A[1] * w + B[1] * u + C[1] * v, A[2] * w + B[2] * u + C[2] * v));
      }
    }
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n - i; j++) {
        index.push(row[i][j], row[i + 1][j], row[i][j + 1]);
        if (j < n - i - 1) index.push(row[i + 1][j], row[i + 1][j + 1], row[i][j + 1]);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(index);
  return geo;
}

/** The unit sphere the stones are shaped from, one per detail. */
const spheres = new Map<number, THREE.BufferGeometry>();
function unitSphere(detail: number): THREE.BufferGeometry {
  let s = spheres.get(detail);
  if (!s) spheres.set(detail, (s = geodesic(detail)));
  return s.clone();
}

type Field = (x: number, y: number, z: number) => number;

/** Signed distance (about) of the chunk: the smooth maximum of the
 *  ellipsoid and the cut planes, so cut edges come out rounded. */
function chunkField(spec: PebbleSpec): Field {
  const rnd = mulberry32(spec.seed);
  const [a, b, c] = spec.size;
  const planes: number[][] = [];
  for (let i = 0; i < spec.cuts; i++) {
    const n = new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize();
    const support = Math.hypot(a * n.x, b * n.y, c * n.z);
    planes.push([n.x, n.y, n.z, support * (spec.depth[0] + (spec.depth[1] - spec.depth[0]) * rnd())]);
  }
  if (spec.floor) planes.push([0, -1, 0, b * spec.floor]);
  const k = 1 / spec.round;
  const m = Math.min(a, b, c);
  const vals = new Float64Array(planes.length + 1);
  return (x, y, z) => {
    vals[0] = (Math.hypot(x / a, y / b, z / c) - 1) * m;
    let top = vals[0];
    for (let i = 0; i < planes.length; i++) {
      const p = planes[i];
      const v = p[0] * x + p[1] * y + p[2] * z - p[3];
      vals[i + 1] = v;
      if (v > top) top = v;
    }
    let s = 0;
    for (let i = 0; i < vals.length; i++) s += Math.exp(k * (vals[i] - top));
    return top + Math.log(s) / k;
  };
}

/** Where f crosses zero between t0 (inside) and t1 (outside) along a line. */
function crossing(f: (t: number) => number, t0: number, t1: number, steps = 18): number {
  for (let i = 0; i < steps; i++) {
    const t = (t0 + t1) / 2;
    if (f(t) < 0) t0 = t;
    else t1 = t;
  }
  return (t0 + t1) / 2;
}

/**
 * The stone as a smooth indexed mesh (no facets: normals are shared), and
 * with `thickness`, `aThick`: the stone's depth below each point (cm), so
 * translucent stones can deepen in colour where light travels further
 * through them. A generator: it pauses every few thousand vertices, so the
 * caller can spread the work over tasks.
 */
export function* pebbleGeometry(spec: PebbleSpec): Generator<void, THREE.BufferGeometry> {
  const field = chunkField(spec);
  const lumps = noise3(spec.seed * 7 + 1);
  const grit = noise3(spec.seed * 13 + 5);
  const reach = Math.max(...spec.size) * 1.3;
  const mean = (spec.size[0] + spec.size[1] + spec.size[2]) / 3;

  const geo = unitSphere(spec.detail);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const u = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    if (i % SLICE === SLICE - 1) yield;
    u.fromBufferAttribute(pos, i).normalize();
    let r = crossing((t) => field(u.x * t, u.y * t, u.z * t), 0, reach);
    r *= 1 + fbm(lumps, u.x * 1.1, u.y * 1.1, u.z * 1.1, 2) * spec.lumps;
    if (spec.grit) r += fbm(grit, u.x * mean * 1.6, u.y * mean * 1.6, u.z * mean * 1.6, 3) * spec.grit;
    pos.setXYZ(i, u.x * r, u.y * r, u.z * r);
  }
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  if (!spec.thickness) return geo;
  yield;

  // depth through the stone along the inward normal
  const nor = geo.attributes.normal as THREE.BufferAttribute;
  const thick = new Float32Array(pos.count);
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    if (i % SLICE === SLICE - 1) yield;
    p.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nor, i);
    const inside = (t: number) => -field(p.x - n.x * t, p.y - n.y * t, p.z - n.z * t);
    // march in until inside, then find the far side
    const start = mean * 0.04;
    thick[i] = inside(start) > 0 ? crossing((t) => -inside(t), start, reach * 2, 14) : start;
  }
  geo.setAttribute("aThick", new THREE.BufferAttribute(thick, 1));
  return geo;
}
