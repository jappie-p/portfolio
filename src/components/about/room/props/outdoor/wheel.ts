import * as THREE from "three";
import type { Materials } from "../../materials";
import { letteredMaterial } from "./parts";
import { bake, disc, lettering, rod, solid, turned } from "./shapes";

export type WheelSpec = {
  /** the tyre's outer radius and its section's half width */
  r: number;
  tyre: number;
  /** the rim's bead seat (where the tyre sits), its depth inward, its width */
  rim: number;
  depth: number;
  width: number;
  spokes: number;
  /** radians a spoke turns between hub and rim (the lacing) */
  cross: number;
  knobs: boolean;
  /** tan sidewalls, as on a trail tyre */
  skinwall: boolean;
  /** brake rotor radius (0: none), on the wheel's left side (-z) */
  rotor: number;
  /** lettering round the rim's right side */
  rimText?: string;
  rimMaterial: THREE.Material;
};

/** The tyre: a ring of the section turned round the axle, black on the tread,
 *  tan or black on the walls (vertex colours, one draw). */
function tyre(s: WheelSpec, material: THREE.Material) {
  const R = s.r - s.tyre;
  const steps = 28;
  const profile: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = -Math.PI + (i / steps) * Math.PI * 2;
    profile.push([R + Math.cos(a) * s.tyre, Math.sin(a) * s.tyre]);
  }
  const g = turned(profile, 96);
  const colors: number[] = [];
  const tan = new THREE.Color("#a77e52");
  const black = new THREE.Color("#1a1918");
  // lathe order: for each step round the axle, every profile point
  for (let seg = 0; seg <= 96; seg++)
    for (let i = 0; i <= steps; i++) {
      const a = -Math.PI + (i / steps) * Math.PI * 2;
      const wall = s.skinwall && Math.cos(a) < 0.3;
      const c = wall ? tan : black;
      colors.push(c.r, c.g, c.b);
    }
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return solid(g, material);
}

/** Knobs on the tread: a row of blocks down the middle and one on each
 *  shoulder, staggered, as on a trail tyre. One instanced draw. */
function knobs(s: WheelSpec, material: THREE.Material) {
  const R = s.r - s.tyre;
  const rows = [
    { theta: 0, n: 64, size: [0.016, 0.009, 0.02], shift: 0 },
    { theta: 0.62, n: 64, size: [0.012, 0.008, 0.016], shift: 0.5 },
    { theta: -0.62, n: 64, size: [0.012, 0.008, 0.016], shift: 0.5 },
    { theta: 1.05, n: 72, size: [0.01, 0.007, 0.012], shift: 0.25 },
    { theta: -1.05, n: 72, size: [0.01, 0.007, 0.012], shift: 0.25 },
  ];
  const count = rows.reduce((n, r) => n + r.n, 0);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.InstancedMesh(box, material, count);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const basis = new THREE.Matrix4();
  let k = 0;
  for (const row of rows) {
    for (let i = 0; i < row.n; i++) {
      const phi = ((i + row.shift) / row.n) * Math.PI * 2;
      const c = Math.cos(phi);
      const sn = Math.sin(phi);
      const n = new THREE.Vector3(Math.cos(row.theta) * c, Math.cos(row.theta) * sn, Math.sin(row.theta));
      const along = new THREE.Vector3(-sn, c, 0);
      const across = new THREE.Vector3().crossVectors(along, n);
      basis.makeBasis(along, n, across);
      q.setFromRotationMatrix(basis);
      const [w, h, d] = row.size;
      const at = new THREE.Vector3((R + Math.cos(row.theta) * s.tyre) * c, (R + Math.cos(row.theta) * s.tyre) * sn, Math.sin(row.theta) * s.tyre).addScaledVector(n, h * 0.3);
      mesh.setMatrixAt(k++, m.compose(at, q, new THREE.Vector3(w, h, d)));
    }
  }
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/** The rim: its section turned round the axle; a deep rim narrows to a V. */
function rim(s: WheelSpec) {
  const w = s.width / 2;
  const inner = s.rim - s.depth;
  const deep = s.depth > 0.03;
  const profile: [number, number][] = deep
    ? [
        [s.rim, -w],
        [s.rim - 0.008, -w],
        [inner + 0.008, -w * 0.45],
        [inner, 0],
        [inner + 0.008, w * 0.45],
        [s.rim - 0.008, w],
        [s.rim, w],
        [s.rim - 0.002, 0],
        [s.rim, -w],
      ]
    : [
        [s.rim, -w],
        [s.rim - 0.006, -w],
        [inner + 0.004, -w * 0.7],
        [inner, -w * 0.3],
        [inner, w * 0.3],
        [inner + 0.004, w * 0.7],
        [s.rim - 0.006, w],
        [s.rim, w],
        [s.rim - 0.002, 0],
        [s.rim, -w],
      ];
  return solid(turned(profile, 96), s.rimMaterial);
}

/** Lettering round the rim's right face, following its slope. */
function rimDecal(s: WheelSpec, text: string, m: Materials) {
  const w = s.width / 2;
  const inner = s.rim - s.depth;
  const deep = s.depth > 0.03;
  const a: [number, number] = deep ? [s.rim - 0.009, w + 0.0007] : [s.rim - 0.007, w + 0.0007];
  const b: [number, number] = deep ? [inner + 0.009, w * 0.45 + 0.0007] : [inner + 0.004, w * 0.7 + 0.0007];
  const steps = 6;
  const profile: [number, number][] = [];
  for (let i = 0; i <= steps; i++) profile.push([a[0] + ((b[0] - a[0]) * i) / steps, a[1] + ((b[1] - a[1]) * i) / steps]);
  const g = turned(profile, 120);
  // lathe uv: u round the axle, v across the face; two runs of the word round
  const mat = letteredMaterial(m, `rim:${text}`, () => {
    const tex = lettering(text, "#f4f1ea", 1024, 128, 800, true);
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.set(2, 1);
    return tex;
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.receiveShadow = true;
  return mesh;
}

/** Spokes from the hub's flanges to the rim, crossing, both sides. */
function spokes(s: WheelSpec, material: THREE.Material) {
  const inner = s.rim - s.depth + 0.002;
  const flange = 0.029;
  const flangeZ = 0.034;
  const rod = new THREE.CylinderGeometry(0.00105, 0.00105, 1, 5, 1, true);
  rod.translate(0, 0.5, 0);
  const mesh = new THREE.InstancedMesh(rod, material, s.spokes);
  const up = new THREE.Vector3(0, 1, 0);
  const m = new THREE.Matrix4();
  for (let i = 0; i < s.spokes; i++) {
    const side = i % 2 ? 1 : -1;
    const lead = Math.floor(i / 2) % 2 ? 1 : -1;
    const ah = (i / s.spokes) * Math.PI * 2;
    const ar = ah + lead * s.cross;
    const a = new THREE.Vector3(Math.cos(ah) * flange, Math.sin(ah) * flange, side * flangeZ);
    const b = new THREE.Vector3(Math.cos(ar) * inner, Math.sin(ar) * inner, side * 0.002);
    const d = b.clone().sub(a);
    const q = new THREE.Quaternion().setFromUnitVectors(up, d.clone().normalize());
    mesh.setMatrixAt(i, m.compose(a, q, new THREE.Vector3(1, d.length(), 1)));
  }
  mesh.castShadow = true;
  return mesh;
}

/** The brake rotor: a steel disc with holes, on its carrier. */
function rotor(r: number, m: Materials) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, r, 0, Math.PI * 2, false);
  const inner = new THREE.Path();
  inner.absarc(0, 0, r - 0.022, 0, Math.PI * 2, true);
  shape.holes.push(inner);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const h = new THREE.Path();
    h.absarc(Math.cos(a) * (r - 0.011), Math.sin(a) * (r - 0.011), 0.0032, 0, Math.PI * 2, true);
    shape.holes.push(h);
  }
  const ring = new THREE.ExtrudeGeometry(shape, { depth: 0.0018, bevelEnabled: false, curveSegments: 10 });
  const group = new THREE.Group();
  group.add(solid(ring, m.steel()));
  // six arms out to the ring, and the carrier on the hub
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.2;
    group.add(solid(rod([Math.cos(a) * 0.022, Math.sin(a) * 0.022, 0.0009], [Math.cos(a + 0.35) * (r - 0.02), Math.sin(a + 0.35) * (r - 0.02), 0.0009], 0.0035, 6), m.graphite()));
  }
  group.add(solid(disc(0.026, 0.004, 24), m.graphite()));
  return group;
}

/**
 * A whole wheel round its axle (z): tyre, tread, rim, spokes, hub and
 * rotor, laid in the x-y plane. Its parts are merged per material; the
 * group turns as one when the wheel spins.
 */
export function makeWheel(s: WheelSpec, m: Materials, tyreMaterial: THREE.Material) {
  const group = new THREE.Group();
  group.add(tyre(s, tyreMaterial), rim(s), spokes(s, m.steel()));
  if (s.knobs) group.add(knobs(s, m.rubber()));
  // the hub: shell, flanges, axle ends
  group.add(solid(disc(0.019, 0.1, 24), m.graphite()), solid(disc(0.031, 0.004, 32).translate(0, 0, 0.034), m.alu()), solid(disc(0.031, 0.004, 32).translate(0, 0, -0.034), m.alu()));
  group.add(solid(disc(0.009, 0.14, 12), m.alu()));
  if (s.rotor > 0) {
    const r = rotor(s.rotor, m);
    r.position.z = -0.05;
    group.add(r);
  }
  if (s.rimText) group.add(rimDecal(s, s.rimText, m));
  bake(group);
  group.userData.keep = true;
  return group;
}
