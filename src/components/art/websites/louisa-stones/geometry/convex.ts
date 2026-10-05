import * as THREE from "three";

/** A half-space: everything with n·p <= d. `tag` follows the face it cuts. */
export interface Plane {
  n: THREE.Vector3;
  d: number;
  tag?: number;
}

interface Face {
  n: THREE.Vector3;
  pts: THREE.Vector3[];
  tag: number;
}

const EPS = 1e-7;

/** A box of half size s, as outward faces wound counter-clockwise. */
function box(s: number): Face[] {
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x * s, y * s, z * s);
  return [
    { n: new THREE.Vector3(1, 0, 0), pts: [v(1, -1, -1), v(1, 1, -1), v(1, 1, 1), v(1, -1, 1)], tag: -1 },
    { n: new THREE.Vector3(-1, 0, 0), pts: [v(-1, -1, -1), v(-1, -1, 1), v(-1, 1, 1), v(-1, 1, -1)], tag: -1 },
    { n: new THREE.Vector3(0, 1, 0), pts: [v(-1, 1, -1), v(-1, 1, 1), v(1, 1, 1), v(1, 1, -1)], tag: -1 },
    { n: new THREE.Vector3(0, -1, 0), pts: [v(-1, -1, -1), v(1, -1, -1), v(1, -1, 1), v(-1, -1, 1)], tag: -1 },
    { n: new THREE.Vector3(0, 0, 1), pts: [v(-1, -1, 1), v(1, -1, 1), v(1, 1, 1), v(-1, 1, 1)], tag: -1 },
    { n: new THREE.Vector3(0, 0, -1), pts: [v(-1, -1, -1), v(-1, 1, -1), v(1, 1, -1), v(1, -1, -1)], tag: -1 },
  ];
}

/** Clip every face by one plane and close the cut with a new face. */
function clip(faces: Face[], plane: Plane): Face[] {
  const out: Face[] = [];
  const cut: THREE.Vector3[] = [];
  for (const f of faces) {
    const kept: THREE.Vector3[] = [];
    for (let i = 0; i < f.pts.length; i++) {
      const a = f.pts[i];
      const b = f.pts[(i + 1) % f.pts.length];
      const da = plane.n.dot(a) - plane.d;
      const db = plane.n.dot(b) - plane.d;
      if (da <= EPS) kept.push(a);
      if (Math.abs(da) <= EPS) cut.push(a);
      if ((da < -EPS && db > EPS) || (da > EPS && db < -EPS)) {
        const p = a.clone().lerp(b, da / (da - db));
        kept.push(p);
        cut.push(p);
      }
    }
    if (kept.length >= 3) out.push({ n: f.n, pts: kept, tag: f.tag });
  }
  // the cap: the cut points in order around their centre
  const unique: THREE.Vector3[] = [];
  for (const p of cut) if (!unique.some((q) => q.distanceToSquared(p) < 1e-10)) unique.push(p);
  if (unique.length >= 3) {
    const c = unique.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(1 / unique.length);
    const u = new THREE.Vector3().subVectors(unique[0], c).normalize();
    const w = new THREE.Vector3().crossVectors(plane.n, u);
    const ang = (p: THREE.Vector3) => {
      const d = new THREE.Vector3().subVectors(p, c);
      return Math.atan2(d.dot(w), d.dot(u));
    };
    unique.sort((p, q) => ang(p) - ang(q));
    out.push({ n: plane.n.clone(), pts: unique, tag: plane.tag ?? 0 });
  }
  return out;
}

/**
 * The convex solid inside every plane, as flat-shaded triangles: each face
 * is one plane, so crystal faces stay truly flat with crisp edges between.
 * `bound` must enclose the solid.
 */
export function convexSolid(planes: Plane[], bound: number): { position: number[]; normal: number[]; tag: number[] } {
  let faces = box(bound);
  for (const p of planes) faces = clip(faces, p);
  const position: number[] = [];
  const normal: number[] = [];
  const tag: number[] = [];
  for (const f of faces) {
    for (let i = 1; i < f.pts.length - 1; i++) {
      for (const p of [f.pts[0], f.pts[i], f.pts[i + 1]]) {
        position.push(p.x, p.y, p.z);
        normal.push(f.n.x, f.n.y, f.n.z);
      }
      tag.push(f.tag);
    }
  }
  return { position, normal, tag };
}
