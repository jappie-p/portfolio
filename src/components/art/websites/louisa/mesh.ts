/** Low-poly crystal meshes. Space: x right, y down, z into the screen, in CSS
 *  px relative to the cluster's pivot. */
export type V3 = [number, number, number];

export interface Face {
  /** vertex indices, a convex polygon */
  idx: number[];
  /** outward normal and centroid, cluster space */
  n: V3;
  c: V3;
  /** vertices whose tones set the face's gradient ends */
  lo: number;
  hi: number;
  mat: number;
  /** a small per-face brightness offset: the hand-cut, low-poly look */
  vary: number;
}

export interface Mesh {
  v: V3[];
  /** per vertex: 0 at the root, 1 at the termination */
  tone: number[];
  faces: Face[];
  /** apex vertices, where glints sit */
  tips: number[];
  /** per crystal: a vertex on the axis (not part of any face) and its radius,
   *  for the light glowing inside */
  cores: { at: number; r: number; mat: number }[];
}

export const emptyMesh = (): Mesh => ({ v: [], tone: [], faces: [], tips: [], cores: [] });

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Two unit vectors perpendicular to `w` and to each other. */
function basis(w: V3): [V3, V3] {
  const helper: V3 = Math.abs(w[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = norm(cross(helper, w));
  return [u, cross(w, u)];
}

/** Add a face, orienting its normal away from `inside`. */
function addFace(m: Mesh, idx: number[], inside: V3, mat: number, vary = 1) {
  const c: V3 = [0, 0, 0];
  for (const i of idx) {
    c[0] += m.v[i][0] / idx.length;
    c[1] += m.v[i][1] / idx.length;
    c[2] += m.v[i][2] / idx.length;
  }
  // Newell's method copes with slightly non-planar quads
  let n: V3 = [0, 0, 0];
  for (let k = 0; k < idx.length; k++) {
    const a = m.v[idx[k]];
    const b = m.v[idx[(k + 1) % idx.length]];
    n[0] += (a[1] - b[1]) * (a[2] + b[2]);
    n[1] += (a[2] - b[2]) * (a[0] + b[0]);
    n[2] += (a[0] - b[0]) * (a[1] + b[1]);
  }
  n = norm(n);
  if (dot(n, sub(c, inside)) < 0) n = [-n[0], -n[1], -n[2]];
  let lo = idx[0];
  let hi = idx[0];
  for (const i of idx) {
    if (m.tone[i] < m.tone[lo]) lo = i;
    if (m.tone[i] > m.tone[hi]) hi = i;
  }
  m.faces.push({ idx, n, c, lo, hi, mat, vary });
}

/**
 * A quartz point: a hexagonal prism rooted at `root`, growing along `dir`,
 * ending in an irregular six-faced termination (unequal faces, apex off
 * centre), the way real amethyst points grow.
 */
export function addPoint(m: Mesh, rnd: () => number, root: V3, dir: V3, len: number, radius: number, mat: number) {
  const w = norm(dir);
  const [u, v] = basis(w);
  const at = (a: number, r: number, along: number): V3 => [
    root[0] + (u[0] * Math.cos(a) + v[0] * Math.sin(a)) * r + w[0] * along,
    root[1] + (u[1] * Math.cos(a) + v[1] * Math.sin(a)) * r + w[1] * along,
    root[2] + (u[2] * Math.cos(a) + v[2] * Math.sin(a)) * r + w[2] * along,
  ];
  const spin = rnd() * Math.PI;
  const start = m.v.length;
  const shoulder = len * (0.54 + rnd() * 0.14);
  for (let i = 0; i < 6; i++) {
    const a = spin + (i * Math.PI) / 3 + (rnd() - 0.5) * 0.18;
    m.v.push(at(a, radius * (0.9 + rnd() * 0.2), -radius * 0.4));
    m.tone.push(0);
  }
  for (let i = 0; i < 6; i++) {
    const a = spin + (i * Math.PI) / 3 + (rnd() - 0.5) * 0.12;
    m.v.push(at(a, radius * (0.94 + rnd() * 0.1), shoulder + (rnd() - 0.5) * len * 0.1));
    m.tone.push(0.72);
  }
  const off = rnd() * Math.PI * 2;
  const apexR = radius * 0.28 * rnd();
  m.v.push(at(off, apexR, len));
  m.tone.push(1);
  const apex = start + 12;
  m.tips.push(apex);
  const axisMid = at(0, 0, shoulder * 0.5);
  const axisTip = at(0, 0, (shoulder + len) / 2);
  for (let i = 0; i < 6; i++) {
    const j = (i + 1) % 6;
    addFace(m, [start + i, start + j, start + 6 + j, start + 6 + i], axisMid, mat, 0.86 + rnd() * 0.28);
    addFace(m, [start + 6 + i, start + 6 + j, apex], axisTip, mat, 0.86 + rnd() * 0.28);
  }
  m.v.push(at(0, 0, shoulder * 0.62));
  m.tone.push(0.6);
  m.cores.push({ at: m.v.length - 1, r: radius, mat });
}

/** A tumbled slab (labradorite): an irregular flat hexagon with thickness,
 *  its broad face turned toward `dir`. */
export function addSlab(m: Mesh, rnd: () => number, centre: V3, dir: V3, radius: number, thick: number, mat: number) {
  const w = norm(dir);
  const [u, v] = basis(w);
  const start = m.v.length;
  const n = 7;
  const spin = rnd() * Math.PI * 2;
  const ring = Array.from({ length: n }, (_, i) => [spin + (i / n) * Math.PI * 2 + (rnd() - 0.5) * 0.3, radius * (0.75 + rnd() * 0.3)]);
  for (let side = 0; side < 2; side++) {
    for (const [a, r0] of ring) {
      const r = r0 * (side ? 0.84 : 1);
      const h = side ? thick / 2 : -thick / 2;
      m.v.push([
        centre[0] + (u[0] * Math.cos(a) + v[0] * Math.sin(a)) * r + w[0] * h,
        centre[1] + (u[1] * Math.cos(a) + v[1] * Math.sin(a)) * r + w[1] * h,
        centre[2] + (u[2] * Math.cos(a) + v[2] * Math.sin(a)) * r + w[2] * h,
      ]);
      m.tone.push(side ? 1 : 0.5);
    }
  }
  addFace(m, Array.from({ length: n }, (_, i) => start + n + i), centre, mat);
  addFace(m, Array.from({ length: n }, (_, i) => start + n - 1 - i), centre, mat);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    addFace(m, [start + i, start + j, start + n + j, start + n + i], centre, mat);
  }
  m.tips.push(start + n + Math.floor(rnd() * n));
}
