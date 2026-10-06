import * as THREE from "three";
import { shade } from "./bigPlants";
import type { Garden } from "./garden";

const UP = new THREE.Vector3(0, 1, 0);
const out = (yaw: number) => new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));

/**
 * A pothos: a few short shoots in the pot, and vines spilling over the
 * front of what it stands on and hanging down, heart-shaped leaves
 * alternating along them, turned out to the room. `vines` lists where each
 * vine leaves the pot's rim and how far down it hangs (metres below the rim).
 */
export function pothos(g: Garden, soil: THREE.Vector3, edgeZ: number, rand: () => number, vines: { dx: number; drop: number }[]) {
  const vine = new THREE.Color("#6f8f3e");
  const leafAt = (p: THREE.Vector3, side: number, phase: number, small = 1, hang = 0) => {
    const len = (0.055 + rand() * 0.03) * small;
    const dir = new THREE.Vector3(side * 0.7, 0.35 - hang, 0.65).normalize();
    g.pothos.leaf({
      base: p,
      dir,
      face: new THREE.Vector3(side * 0.25, 0.45, 1),
      len,
      width: len * 0.85,
      attach: 0.14,
      droop: 0.5 + rand() * 0.4,
      fold: 0.15,
      roll: (rand() - 0.5) * 0.5,
      tint: shade(rand, 0.3, 1.05),
      sway: 0.006,
      phase,
      root: 0.6,
      cols: 4,
      rows: 5,
    });
  };
  // a tuft in the pot
  for (let i = 0; i < 9; i++) {
    const o = out(i * 2.4);
    const p = soil.clone().addScaledVector(o, 0.02 + rand() * 0.03).addScaledVector(UP, 0.02 + rand() * 0.04);
    leafAt(p, Math.sign(o.x) || 1, rand() * 6, 1.1, -0.3);
  }
  for (const v of vines) {
    const phase = rand() * 6.28;
    const lip = new THREE.Vector3(soil.x + v.dx, soil.y + 0.02, edgeZ + 0.03);
    const pts = [
      soil.clone().add(new THREE.Vector3(v.dx * 0.4, 0.02, 0)),
      new THREE.Vector3(soil.x + v.dx * 0.8, soil.y + 0.04, (soil.z + edgeZ) / 2),
      lip,
      lip.clone().add(new THREE.Vector3(v.dx * 0.15, -v.drop * 0.3, 0.025)),
      lip.clone().add(new THREE.Vector3(v.dx * 0.1 + (rand() - 0.5) * 0.04, -v.drop * 0.65, 0.02)),
      lip.clone().add(new THREE.Vector3(v.dx * 0.25 + (rand() - 0.5) * 0.05, -v.drop, 0.03 + rand() * 0.02)),
    ];
    const curve = g.plain.stem(pts, 0.0028, 0.0018, vine, 0.012, phase, 4, 24, 0.1);
    const count = Math.round(curve.getLength() / 0.045);
    for (let k = 1; k < count; k++) {
      const t = k / count;
      const p = curve.getPointAt(t);
      leafAt(p, k % 2 ? 1 : -1, phase + t * 2, 1 - t * 0.35, t > 0.3 ? 0.6 : 0);
    }
  }
}

/** A fleshy leaf of a succulent: spoon-shaped, to a point. */
const spoon = (v: number) => Math.min(1, 0.45 + v * 1.6) * (1 - Math.pow(v, 3)) + 0.05;

/** An echeveria: a rosette of fleshy blue-green leaves, blushing at their tips. */
export function echeveria(g: Garden, centre: THREE.Vector3, rand: () => number, size = 1) {
  const rings = [
    { n: 6, len: 0.022, e: 1.15 },
    { n: 9, len: 0.034, e: 0.7 },
    { n: 12, len: 0.044, e: 0.32 },
  ];
  rings.forEach((ring, ri) => {
    for (let i = 0; i < ring.n; i++) {
      const yaw = (i / ring.n) * Math.PI * 2 + ri * 0.45;
      const o = out(yaw);
      const e = ring.e + (rand() - 0.5) * 0.15;
      g.plain.leaf({
        base: centre.clone().addScaledVector(o, 0.004 * ri).addScaledVector(UP, 0.012 - ri * 0.005),
        dir: o.clone().multiplyScalar(Math.cos(e)).addScaledVector(UP, Math.sin(e)).normalize(),
        len: ring.len * size,
        width: ring.len * size * 0.62,
        profile: spoon,
        droop: -0.35,
        fold: 0.45,
        tint: new THREE.Color("#8fb0a2").multiplyScalar(0.9 + rand() * 0.2),
        tip: new THREE.Color("#c98a86"),
        sway: 0,
        phase: 0,
        cols: 3,
        rows: 4,
      });
    }
  });
}

/** A small cactus: a ribbed column with a rounded top. */
export function cactus(g: Garden, foot: THREE.Vector3, rand: () => number, h = 0.09, r = 0.022) {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const rr = t < 0.75 ? r : r * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.75) / 0.25, 2)));
    pts.push(new THREE.Vector2(Math.max(rr, 0.0005), t * h));
  }
  const geo = new THREE.LatheGeometry(pts, 32);
  const p = geo.attributes.position as THREE.BufferAttribute;
  const ribs = 9;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const a = Math.atan2(z, x);
    const k = 0.86 + 0.14 * Math.abs(Math.cos((a * ribs) / 2));
    p.setXYZ(i, x * k + foot.x, p.getY(i) + foot.y, z * k + foot.z);
  }
  geo.deleteAttribute("normal");
  g.plain.solid(geo, new THREE.Color("#4c7444").multiplyScalar(0.9 + rand() * 0.2));
}

/** A potted herb: a few stems with small bright oval leaves in pairs. */
export function herb(g: Garden, soil: THREE.Vector3, rand: () => number) {
  const stem = new THREE.Color("#6b9a45");
  for (let s = 0; s < 4; s++) {
    const o = out(s * 1.7 + rand());
    const h = 0.08 + rand() * 0.06;
    const top = soil.clone().addScaledVector(UP, h).addScaledVector(o, 0.02);
    const curve = g.plain.stem([soil.clone().addScaledVector(o, 0.01), soil.clone().addScaledVector(UP, h * 0.5).addScaledVector(o, 0.012), top], 0.0018, 0.0012, stem, 0.002, rand() * 6, 3, 6, 0.3);
    for (let k = 0; k < 4; k++) {
      const p = curve.getPointAt(0.35 + k * 0.2);
      for (const side of [-1, 1]) {
        const lo = out(s * 1.7 + k * 1.57 + (side > 0 ? 0 : Math.PI));
        const len = 0.03 + rand() * 0.012 - k * 0.003;
        g.rubber.leaf({
          base: p,
          dir: lo.clone().multiplyScalar(0.8).addScaledVector(UP, 0.45).normalize(),
          len,
          width: len * 0.6,
          droop: 0.6,
          fold: 0.3,
          tint: new THREE.Color(2.4, 3.0, 1.9).multiplyScalar(0.9 + rand() * 0.2),
          sway: 0.002,
          phase: rand() * 6,
          root: 0.5,
          cols: 2,
          rows: 4,
        });
      }
    }
  }
}
