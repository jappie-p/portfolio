import * as THREE from "three";
import type { Materials } from "../../materials";
import { disc, gear, rod, solid, tube, type V3 } from "./shapes";

/** A cog's pitch radius for its tooth count (a 12.7 mm chain). */
export const pitch = (teeth: number) => (teeth * 0.0127) / (2 * Math.PI);

/** The chainrings, the spider and both crank arms with their pedals.
 *  `at` is the bottom bracket; `angle` the drive arm's angle (radians from +x). */
export function crankset(m: Materials, at: V3, rings: number[], angle: number, length: number, pedal: "flat" | "clip", chainline: number) {
  const group = new THREE.Group();
  const [x, y] = at;
  rings.forEach((teeth, i) => {
    const r = pitch(teeth);
    const ring = solid(gear(teeth, r + 0.0035, r - 0.0025, 0.003, r * 0.55, 5, r * 0.16, r * 0.62), i === 0 ? m.graphite() : m.black());
    ring.position.set(x, y, chainline - i * 0.0055);
    group.add(ring);
  });
  // the spindle through the frame, and the arms
  group.add(solid(disc(0.012, 0.15, 16).translate(x, y, 0), m.graphite()));
  const arm = (side: number, a: number) => {
    const end: V3 = [x + Math.cos(a) * length, y + Math.sin(a) * length, side * 0.07];
    group.add(solid(rod([x, y, side * 0.064], end, 0.012, 10, 0.0085), m.black()));
    group.add(solid(disc(0.016, 0.014, 18).translate(x, y, side * 0.066), m.black()));
    // the pedal on its axle, out from the arm
    const out = side * (pedal === "flat" ? 0.11 : 0.1);
    group.add(solid(rod([end[0], end[1], end[2]], [end[0], end[1], out], 0.006, 8), m.steel()));
    const body =
      pedal === "flat"
        ? new THREE.BoxGeometry(0.1, 0.016, 0.1)
        : new THREE.BoxGeometry(0.075, 0.012, 0.065);
    const p = solid(body, pedal === "flat" ? m.black() : m.graphite());
    p.position.set(end[0], end[1], out + side * (pedal === "flat" ? 0.012 : 0.02));
    group.add(p);
  };
  arm(1, angle);
  arm(-1, angle + Math.PI);
  return group;
}

/** The cassette on the rear hub, biggest cog inboard. */
export function cassette(m: Materials, at: V3, teeth: number[], z0: number) {
  const group = new THREE.Group();
  const sorted = [...teeth].sort((a, b) => b - a);
  sorted.forEach((t, i) => {
    const r = pitch(t);
    const cog = solid(gear(t, r + 0.003, r - 0.002, 0.0018, 0.012), i < 3 ? m.black() : m.steel());
    cog.position.set(at[0], at[1], z0 + i * 0.0039);
    group.add(cog);
  });
  return group;
}

/** The rear derailleur hanging from the axle: its body and the cage with its
 *  two jockey wheels. Returns where the jockeys sit, for the chain. */
export function derailleur(m: Materials, axle: V3, z: number) {
  const group = new THREE.Group();
  const [x, y] = axle;
  const upper: V3 = [x - 0.012, y - 0.095, z];
  const lower: V3 = [x + 0.03, y - 0.175, z];
  const rj = pitch(12);
  group.add(solid(tube([[x - 0.004, y - 0.01, z + 0.012], [x - 0.04, y - 0.03, z + 0.022], [x - 0.035, y - 0.07, z + 0.02], [upper[0] - 0.006, upper[1] + 0.012, z + 0.012]], 0.011, 10), m.black()));
  for (const j of [upper, lower]) {
    const w = solid(gear(12, rj + 0.003, rj - 0.002, 0.0026, 0.004), m.graphite());
    w.position.set(...j);
    group.add(w);
  }
  // the cage plates either side of the jockeys
  for (const side of [-1, 1]) {
    const plate = new THREE.Shape();
    plate.moveTo(-0.012, 0.012);
    plate.lineTo(0.016, 0.006);
    plate.lineTo(0.05, -0.07);
    plate.lineTo(0.044, -0.094);
    plate.lineTo(0.022, -0.09);
    plate.lineTo(-0.018, -0.006);
    plate.closePath();
    const g = new THREE.ExtrudeGeometry(plate, { depth: 0.002, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.0008, bevelSegments: 2 });
    const p = solid(g, side > 0 ? m.alu() : m.black());
    p.position.set(upper[0] - 0.004, upper[1] + 0.004, z + side * 0.006);
    group.add(p);
  }
  return { group, upper, lower, rj };
}

/** A chain along a closed path: links stepped along it at the chain's
 *  pitch, alternating inner and outer plates. One instanced draw. */
export function chain(m: Materials, path: V3[], z: number) {
  const curve = new THREE.CatmullRomCurve3(
    path.map(([x, y]) => new THREE.Vector3(x, y, z)),
    true,
    "catmullrom",
    0.15,
  );
  const length = curve.getLength();
  const n = Math.round(length / 0.0127);
  const link = new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.InstancedMesh(link, m.steel(), n);
  const mat = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const x = new THREE.Vector3(1, 0, 0);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const p = curve.getPointAt(t);
    const d = curve.getTangentAt(t);
    q.setFromUnitVectors(x, d);
    const outer = i % 2 === 0;
    mesh.setMatrixAt(i, mat.compose(p, q, new THREE.Vector3(0.0135, outer ? 0.0072 : 0.0062, outer ? 0.0072 : 0.0054)));
  }
  mesh.castShadow = true;
  return mesh;
}

/** A saddle: its planform (nose to tail) extruded and rounded, on its rails.
 *  `at` is the clamp; it points along +x. */
export function saddle(m: Materials, at: V3, length: number, width: number, tilt = 0.04, cover?: THREE.Material) {
  const group = new THREE.Group();
  const s = new THREE.Shape();
  const L = length / 2;
  s.moveTo(L, 0);
  s.bezierCurveTo(L, width * 0.12, L * 0.3, width * 0.16, -L * 0.15, width * 0.32);
  s.bezierCurveTo(-L * 0.6, width * 0.5, -L, width * 0.52, -L, width * 0.3);
  s.lineTo(-L, -width * 0.3);
  s.bezierCurveTo(-L, -width * 0.52, -L * 0.6, -width * 0.5, -L * 0.15, -width * 0.32);
  s.bezierCurveTo(L * 0.3, -width * 0.16, L, -width * 0.12, L, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.009, bevelSegments: 4, curveSegments: 16 });
  g.rotateX(-Math.PI / 2);
  const top = solid(g, cover ?? m.own("saddle", () => new THREE.MeshStandardMaterial({ color: "#151515", roughness: 0.62 })));
  top.position.set(0, 0.03, 0);
  group.add(top);
  for (const side of [-1, 1]) group.add(solid(tube([[-L * 0.7, 0.018, side * 0.02], [-L * 0.3, 0.005, side * 0.022], [L * 0.3, 0.005, side * 0.02], [L * 0.75, 0.02, side * 0.01]], 0.0035, 6), m.steel()));
  group.position.set(...at);
  group.rotation.z = tilt;
  return group;
}

/** A brake or shifter hose, a thin black line along the frame. */
export const hose = (m: Materials, points: V3[], r = 0.0028) => solid(tube(points, r, 6, points.length * 14), m.plasticBlack());

/** A decal material: lettering on clear, toned with the piece, its texture
 *  freed with it. */
export function letteredMaterial(m: Materials, key: string, make: () => THREE.Texture, opts: THREE.MeshStandardMaterialParameters = {}) {
  return m.own(`decal:${key}`, () => {
    const map = make();
    const mat = new THREE.MeshStandardMaterial({ map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, roughness: 0.35, ...opts });
    mat.addEventListener("dispose", () => map.dispose());
    return mat;
  });
}
