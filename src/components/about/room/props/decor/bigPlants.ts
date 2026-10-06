import * as THREE from "three";
import type { Garden } from "./garden";
import { MONSTERA_ATTACH } from "./leafArt";

const UP = new THREE.Vector3(0, 1, 0);
const GOLDEN = 2.39996;

/** A leaf's own shade of the painted green: lighter or darker, a little
 *  warmer or cooler (a multiplier on the texture). */
export function shade(rand: () => number, spread = 0.18, light = 1) {
  const k = light * (1 - spread / 2 + rand() * spread);
  const warm = (rand() - 0.5) * 0.12;
  return new THREE.Color(k * (1 + warm), k, k * (1 - warm));
}

const out = (yaw: number) => new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));

/**
 * A monstera rooted at `soil`: long stalks rising from the pot and arching
 * out, each with a big split leaf at its end, drooping at the tip; the
 * youngest in the middle, smaller and more upright. Leaves lean toward
 * `toward` (a yaw), away from what is behind it.
 */
export function monstera(g: Garden, soil: THREE.Vector3, rand: () => number, size = 1, toward = 0, spread = Math.PI * 2) {
  const n = 14;
  const stalk = new THREE.Color("#4f7d3a");
  for (let i = 0; i < n; i++) {
    const young = i >= n - 3;
    const yaw = toward + ((((i * GOLDEN) % (Math.PI * 2)) / (Math.PI * 2)) - 0.5) * spread + (rand() - 0.5) * 0.3;
    const o = out(yaw);
    const L = size * (young ? 0.4 + rand() * 0.12 : 0.34 + rand() * 0.36);
    const lift = young ? 0.95 : 0.55 + rand() * 0.35;
    const foot = soil.clone().addScaledVector(o, 0.025 + rand() * 0.02);
    const p1 = foot.clone().addScaledVector(UP, L * 0.42).addScaledVector(o, L * 0.06);
    const p2 = foot.clone().addScaledVector(UP, L * (0.55 + 0.25 * lift)).addScaledVector(o, L * (0.22 + 0.2 * (1 - lift)));
    const end = foot.clone().addScaledVector(UP, L * (0.6 + 0.35 * lift)).addScaledVector(o, L * (0.38 + 0.35 * (1 - lift)));
    const phase = rand() * 6.28;
    g.plain.stem([foot, p1, p2, end], 0.0075 * size, 0.0055 * size, stalk, 0.004, phase, 6, 12, 0);
    const len = size * (young ? 0.26 + rand() * 0.06 : 0.36 + rand() * 0.16);
    const e = young ? 0.75 + rand() * 0.3 : 0.15 + rand() * 0.45;
    g.monstera.leaf({
      base: end,
      dir: o.clone().multiplyScalar(Math.cos(e)).addScaledVector(UP, Math.sin(e)).normalize(),
      len,
      width: len * 0.94,
      attach: MONSTERA_ATTACH,
      droop: young ? 0.35 : 0.55 + rand() * 0.45,
      fold: 0.12 + rand() * 0.08,
      wave: 0.008,
      roll: (rand() - 0.5) * 0.5,
      twist: (rand() - 0.5) * 0.3,
      tint: shade(rand, 0.25, young ? 1.18 : 1),
      sway: 0.007,
      phase,
      root: 0.4,
      cols: 8,
      rows: 12,
    });
  }
}

/**
 * A fiddle-leaf fig rooted at `soil`: a slim trunk with a gentle lean and
 * a side branch, its big violin-shaped leaves spiralling up it, upright and
 * crowded at the top. `height` is the trunk's, above the soil.
 */
export function fiddleFig(g: Garden, soil: THREE.Vector3, rand: () => number, height = 1.35, toward = 0) {
  const bark = new THREE.Color("#7a6a55");
  const lean = out(toward).multiplyScalar(0.06);
  const trunk = g.wood.stem(
    [
      soil.clone(),
      soil.clone().add(new THREE.Vector3(0.015, height * 0.3, -0.01)),
      soil.clone().add(new THREE.Vector3(-0.012, height * 0.62, 0.012)).addScaledVector(lean, 0.5),
      soil.clone().add(new THREE.Vector3(0.01, height, 0)).add(lean),
    ],
    0.02,
    0.008,
    bark,
    0.002,
    rand() * 6,
    7,
    16,
    0,
  );
  // a side branch from two thirds up
  const fork = trunk.getPointAt(0.62);
  const bo = out(toward + 1.9);
  const branch = g.wood.stem([fork, fork.clone().addScaledVector(bo, 0.1).addScaledVector(UP, 0.12), fork.clone().addScaledVector(bo, 0.17).addScaledVector(UP, 0.32)], 0.009, 0.005, bark, 0.004, rand() * 6, 6, 8, 0.3);
  const stalk = new THREE.Color("#5f7a3e");
  const put = (p: THREE.Vector3, t: number, k: number) => {
    const yaw = k * GOLDEN + rand() * 0.4;
    const o = out(yaw);
    const e = 0.3 + 0.95 * t * t + (rand() - 0.5) * 0.2;
    const len = 0.21 + rand() * 0.07 + 0.05 * (1 - t);
    const base = p.clone().addScaledVector(o, 0.022).addScaledVector(UP, 0.012);
    const phase = rand() * 6.28;
    g.plain.stem([p, base], 0.004, 0.003, stalk, 0.003, phase, 4, 2, 0.5);
    g.fig.leaf({
      base,
      dir: o.clone().multiplyScalar(Math.cos(e)).addScaledVector(UP, Math.sin(e)).normalize(),
      len,
      width: len * 0.62,
      droop: 0.25 + rand() * 0.45,
      fold: 0.22,
      wave: 0.005,
      roll: (rand() - 0.5) * 0.6,
      tint: shade(rand, 0.25, t > 0.9 ? 1.15 : 1),
      sway: 0.005,
      phase,
      root: 0.5,
      cols: 4,
      rows: 8,
    });
  };
  const n = 24;
  for (let k = 0; k < n; k++) {
    const t = 0.36 + 0.64 * Math.pow(k / (n - 1), 0.75);
    put(trunk.getPointAt(Math.min(t, 0.99)), t, k);
  }
  for (let k = 0; k < 6; k++) put(branch.getPointAt(0.35 + 0.13 * k), 0.6 + k * 0.06, k + 3);
}

/** Palm leaflets: a narrow blade, pointed, widest a third of the way out. */
const leaflet = (v: number) => Math.min(1, v * 4) * (1 - Math.pow(v, 2.2)) + 0.12;

/**
 * A kentia palm rooted at `soil`: arching fronds fanning out toward
 * `toward` within `spread`, each a stalk with narrow leaflets down both
 * sides, folded in a V and hanging from it.
 */
export function palm(g: Garden, soil: THREE.Vector3, rand: () => number, size = 1, toward = 0, spread = 2) {
  const n = 8;
  const stalk = new THREE.Color("#5d7f3c");
  for (let i = 0; i < n; i++) {
    const yaw = toward + (i / (n - 1) - 0.5) * spread + (rand() - 0.5) * 0.25;
    const o = out(yaw);
    const upright = i % 3 === 1;
    const R = size * (upright ? 0.85 : 0.95 + rand() * 0.35);
    const reach = upright ? 0.45 : 0.85;
    const foot = soil.clone().addScaledVector(o, 0.02);
    const pts = [
      foot,
      foot.clone().addScaledVector(UP, R * 0.38).addScaledVector(o, R * 0.04),
      foot.clone().addScaledVector(UP, R * 0.66).addScaledVector(o, R * 0.3 * reach),
      foot.clone().addScaledVector(UP, R * (upright ? 0.86 : 0.7)).addScaledVector(o, R * 0.62 * reach),
      foot.clone().addScaledVector(UP, R * (upright ? 0.92 : 0.58)).addScaledVector(o, R * 0.9 * reach),
    ];
    const phase = rand() * 6.28;
    const rachis = g.plain.stem(pts, 0.007 * size, 0.0025, stalk, 0.008, phase, 5, 14, 0);
    const m = 17;
    for (let j = 0; j < m; j++) {
      const t = 0.3 + (0.69 * j) / (m - 1);
      const p = rachis.getPointAt(t);
      const T = rachis.getTangentAt(t);
      const side = new THREE.Vector3().crossVectors(T, UP).normalize();
      const len = size * (0.1 + 0.26 * Math.sin(Math.PI * (0.12 + 0.82 * (j / (m - 1)))));
      for (const s of [-1, 1]) {
        const dir = T.clone().multiplyScalar(0.55).addScaledVector(side, s * 0.85).addScaledVector(UP, 0.1 - 0.25 * t).normalize();
        g.plain.leaf({
          base: p,
          dir,
          len,
          width: 0.03 * size,
          profile: leaflet,
          droop: 0.9 + 0.6 * t + rand() * 0.3,
          fold: 0.55,
          roll: s * 0.15,
          tint: new THREE.Color("#3f6b2f").multiplyScalar(0.85 + rand() * 0.3),
          tip: new THREE.Color("#6b8a3c"),
          sway: 0.012,
          phase: phase + j * 0.15,
          root: 0.5,
          cols: 2,
          rows: 6,
        });
      }
    }
  }
}

/**
 * A rubber plant rooted at `soil`: a few upright stems, big glossy oval
 * leaves alternating up them, a rosy sheath at each tip where the next
 * leaf is coming.
 */
export function rubberPlant(g: Garden, soil: THREE.Vector3, rand: () => number, size = 1) {
  const stemColor = new THREE.Color("#4e5a33");
  const sheath = new THREE.Color("#9a3f30");
  const heights = [0.55, 0.74, 0.9, 0.62];
  heights.forEach((h, s) => {
    const yaw = s * 1.6 + rand();
    const lean = out(yaw).multiplyScalar(0.06 + 0.03 * s);
    const top = soil.clone().addScaledVector(UP, h * size).add(lean);
    const pts = [soil.clone().addScaledVector(out(yaw), 0.02), soil.clone().addScaledVector(UP, h * size * 0.5).addScaledVector(lean, 0.4), top];
    const phase = rand() * 6.28;
    const stem = g.wood.stem(pts, 0.008, 0.005, stemColor, 0.004, phase, 6, 10, 0);
    const n = 9;
    for (let k = 0; k < n; k++) {
      const t = 0.18 + (0.8 * k) / (n - 1);
      const p = stem.getPointAt(Math.min(t, 0.98));
      const o = out(yaw + k * 2.6 + rand() * 0.4);
      const e = 0.25 + 0.6 * t + (rand() - 0.5) * 0.2;
      const len = (0.2 + rand() * 0.08) * size * (k === n - 1 ? 0.7 : 1);
      g.rubber.leaf({
        base: p.clone().addScaledVector(o, 0.015),
        dir: o.clone().multiplyScalar(Math.cos(e)).addScaledVector(UP, Math.sin(e)).normalize(),
        len,
        width: len * 0.55,
        droop: 0.2 + rand() * 0.25,
        fold: 0.1,
        roll: (rand() - 0.5) * 0.4,
        tint: shade(rand, 0.2, k === n - 1 ? 1.5 : 1.2),
        sway: 0.004,
        phase,
        root: 0.5,
        cols: 4,
        rows: 7,
      });
    }
    // the sheath of the next leaf, a slim rosy point
    const tip = stem.getPointAt(1);
    const cone = new THREE.ConeGeometry(0.008, 0.06, 6);
    cone.translate(0, 0.03, 0);
    cone.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, stem.getTangentAt(1)));
    cone.translate(tip.x, tip.y, tip.z);
    g.plain.solid(cone, sheath);
  });
}

/**
 * A snake plant rooted at `soil`: stiff upright blades from the middle of
 * the pot, a little apart at their feet, leaning out and turning as they rise.
 */
export function snakePlant(g: Garden, soil: THREE.Vector3, rand: () => number, size = 1) {
  const n = 10;
  for (let i = 0; i < n; i++) {
    const yaw = i * GOLDEN;
    const o = out(yaw);
    const r = 0.015 + rand() * 0.045;
    const lean = 0.06 + rand() * 0.22;
    const len = size * (0.42 + rand() * 0.42) * (i < 3 ? 1.12 : 1);
    g.snake.leaf({
      base: soil.clone().addScaledVector(o, r).addScaledVector(UP, -0.01),
      dir: UP.clone().multiplyScalar(Math.cos(lean)).addScaledVector(o, Math.sin(lean)).normalize(),
      face: out(yaw + 1.2 + rand()),
      len,
      width: 0.055 + rand() * 0.02,
      droop: -0.05 + rand() * 0.25,
      fold: 0.35,
      twist: (rand() - 0.5) * 1.4,
      tint: shade(rand, 0.25),
      sway: 0.003,
      phase: rand() * 6.28,
      root: 0.2,
      cols: 3,
      rows: 10,
    });
  }
}

/**
 * A fern rooted at `soil`: many fine fronds arching out of the pot and
 * spilling over its rim, small leaflets all down both sides of each.
 */
export function fern(g: Garden, soil: THREE.Vector3, rand: () => number, size = 1) {
  const n = 16;
  const stalk = new THREE.Color("#5b8a3a");
  for (let i = 0; i < n; i++) {
    const yaw = i * GOLDEN + rand() * 0.3;
    const o = out(yaw);
    const R = size * (0.42 + rand() * 0.2);
    const rise = 0.35 + rand() * 0.4;
    const foot = soil.clone().addScaledVector(o, 0.015);
    const pts = [
      foot,
      foot.clone().addScaledVector(UP, R * 0.3 * (0.6 + rise)).addScaledVector(o, R * 0.15),
      foot.clone().addScaledVector(UP, R * 0.38 * (0.5 + rise)).addScaledVector(o, R * 0.5),
      foot.clone().addScaledVector(UP, R * 0.1 * rise).addScaledVector(o, R * 0.85),
      foot.clone().addScaledVector(UP, -R * 0.25).addScaledVector(o, R),
    ];
    const phase = rand() * 6.28;
    const rachis = g.plain.stem(pts, 0.003, 0.0012, stalk, 0.008, phase, 4, 14, 0);
    const m = 18;
    for (let j = 0; j < m; j++) {
      const t = 0.12 + (0.86 * j) / (m - 1);
      const p = rachis.getPointAt(t);
      const T = rachis.getTangentAt(t);
      const side = new THREE.Vector3().crossVectors(T, UP).normalize();
      const len = size * (0.03 + 0.05 * Math.sin(Math.PI * (0.1 + 0.85 * (j / (m - 1)))));
      for (const s of [-1, 1])
        g.plain.leaf({
          base: p,
          dir: T.clone().multiplyScalar(0.45).addScaledVector(side, s * 0.9).normalize(),
          len,
          width: len * 0.32,
          profile: leaflet,
          droop: 0.3,
          fold: 0.3,
          tint: new THREE.Color("#4a7f36").multiplyScalar(0.85 + rand() * 0.35),
          tip: new THREE.Color("#7aa04a"),
          sway: 0.01,
          phase: phase + j * 0.2,
          root: 0.5,
          cols: 2,
          rows: 3,
        });
    }
  }
}
