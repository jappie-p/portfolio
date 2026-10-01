import type { PanelAnchors } from "../lib/anchors";
import { mulberry32 } from "../lib/rng";
import { MAT } from "./materials";
import { addPoint, addSlab, emptyMesh, norm, type Mesh, type V3 } from "./mesh";
import type { Body } from "./render";
import { lip, type Wall } from "./wall";

/** A soft out-of-focus disc of light in front of everything, like the bokeh
 *  in a jewellery photograph. */
export interface Bokeh {
  x: number;
  y: number;
  r: number;
  rgb: string;
  alpha: number;
}

export interface LouisaLayout {
  walls: Wall[];
  /** crystals that turn in the light, drawn every frame */
  bodies: Body[];
  /** the dense bed of small crystals on each lip, painted once */
  beds: Body[];
  bokeh: Bokeh[];
  /** the soft light behind the site, 0..1 of the panel */
  glow: { x: number; y: number };
}

/**
 * The lining of one wall, from angle `from` to `to`: groups of points rooted
 * on the lip, each a main crystal with a few smaller ones at its foot, all
 * growing out into the cavity and partly toward the viewer. `size(f)` sets
 * the main crystal's length along the arc; `sink` roots them down into the
 * band (0..1 of r) so they grow out of the agate.
 */
function lining(wall: Wall, seed: number, groups: number, size: (f: number) => number, mats: number[], satellites = 3, sink = 0.03): Mesh {
  const rnd = mulberry32(seed);
  const m = emptyMesh();
  for (let i = 0; i < groups; i++) {
    const f = (i + 0.15 + rnd() * 0.7) / groups;
    const a = wall.from + (wall.to - wall.from) * f;
    const main = size(f) * (0.6 + rnd() * 0.5);
    const lean = (rnd() - 0.5) * 0.7;
    const mat = mats[Math.floor(rnd() * mats.length)];
    const n = 1 + Math.floor(rnd() * (satellites + 1));
    for (let k = 0; k < n; k++) {
      const len = k ? main * (0.25 + rnd() * 0.4) : main;
      const aa = a + (k ? (rnd() - 0.5) * 0.1 : 0);
      const rr = lip(wall, aa, 1 - sink * rnd());
      const root: V3 = [Math.cos(aa) * rr, Math.sin(aa) * rr, (rnd() - 0.5) * wall.r * 0.06];
      const dir = aa + lean + (k ? (rnd() - 0.5) * 0.9 : 0);
      const d = norm([Math.cos(dir), Math.sin(dir), -(0.45 + rnd() * 0.7)]);
      addPoint(m, rnd, root, d, len, len * (0.15 + rnd() * 0.06), k && rnd() < 0.3 ? mats[Math.floor(rnd() * mats.length)] : mat);
    }
  }
  return m;
}

function body(mesh: Mesh, x: number, y: number, o: Partial<Body> = {}): Body {
  return { mesh, x, y, scale: 1, yaw: 0, pitch: 0, roll: 0, sway: 0.1, period: 22, phase: 0, spin: null, fog: 0, depth: 0.5, ...o };
}

function slab(seed: number, radius: number): Mesh {
  const m = emptyMesh();
  addSlab(m, mulberry32(seed), [0, 0, 0], [0.2, -0.3, -1], radius, radius * 0.3, MAT.labradorite);
  return m;
}

function shard(seed: number, len: number, mat: number): Mesh {
  const m = emptyMesh();
  addPoint(m, mulberry32(seed), [0, len * 0.4, 0], [0.1, -1, -0.2], len, len * 0.15, mat);
  return m;
}

/** Bokeh drifts round the corners and edges, never over the copy. */
function bokeh(w: number, h: number, spots: [number, number][]): Bokeh[] {
  const rnd = mulberry32(61);
  const u = Math.min(w, h);
  return spots.map(([x, y]) => {
    const pink = rnd() < 0.4;
    return { x: x * w, y: y * h, r: u * (0.03 + rnd() * 0.07), rgb: pink ? "244,114,182" : rnd() < 0.8 ? "167,139,250" : "94,234,212", alpha: 0.05 + rnd() * 0.07 };
  });
}

/** Bigger toward the ends of an arc (off the frame), smaller in between. */
const ends = (lo: number, hi: number) => (f: number) => lo + (hi - lo) * Math.abs(f - 0.5) * 2;
const even = (v: number) => () => v;

export function louisaLayout(w: number, h: number, a: PanelAnchors | null = null): LouisaLayout {
  const u = Math.min(w, h);
  const A = [MAT.amethyst, MAT.amethyst, MAT.deep];
  const AR = [MAT.amethyst, MAT.rose, MAT.rose, MAT.deep];
  const wallBody = (wall: Wall, mesh: Mesh, o: Partial<Body> = {}) => body(mesh, wall.cx, wall.cy, { sway: 0.08, period: 24, depth: 0.5, ...o });
  if (w / h > 0.9) {
    // frame + phone on the left, copy on the right: the walls hold the
    // bottom-left and top-right corners and keep clear of the copy
    const bl: Wall = { cx: 0, cy: h, r: u * 0.3, from: -Math.PI * 0.54, to: Math.PI * 0.04, seed: 3 };
    const tr: Wall = { cx: w, cy: 0, r: u * 0.24, from: Math.PI * 0.46, to: Math.PI * 1.04, seed: 8 };
    return {
      walls: [bl, tr],
      glow: { x: 0.33, y: 0.52 },
      bokeh: bokeh(w, h, [
        [0.05, 0.1],
        [0.28, 0.02],
        [0.56, 0.97],
        [0.95, 0.92],
        [0.99, 0.38],
      ]),
      beds: [wallBody(bl, lining(bl, 13, 26, even(u * 0.035), A, 2, 0.1)), wallBody(tr, lining(tr, 18, 20, even(u * 0.03), AR, 2, 0.1))],
      bodies: [
        wallBody(bl, lining(bl, 3, 8, ends(u * 0.12, u * 0.27), A), { sway: 0.1, period: 26, depth: 0.55 }),
        wallBody(tr, lining(tr, 8, 6, ends(u * 0.13, u * 0.11), AR), { sway: 0.1, period: 21, phase: 1.7 }),
        body(slab(21, u * 0.036), w * 0.055, h * 0.36, { spin: [0.05, 0.11, 0.02], depth: 0.6, sway: 0 }),
        body(slab(22, u * 0.026), w * 0.47, h * 0.12, { spin: [-0.07, 0.08, 0.03], depth: 0.45, sway: 0, fog: 0.2 }),
        body(slab(23, u * 0.04), w * 0.64, h * 0.925, { spin: [0.04, -0.09, 0.02], depth: 0.65, sway: 0 }),
        body(shard(31, u * 0.07, MAT.rose), w * 0.955, h * 0.56, { spin: [0.03, 0.14, 0.01], depth: 0.5, sway: 0 }),
        body(shard(32, u * 0.05, MAT.amethyst), w * 0.37, h * 0.19, { spin: [0.06, -0.12, 0.02], depth: 0.4, sway: 0, fog: 0.3 }),
      ],
    };
  }
  // phones and upright tablets: frame on top, copy below and to the left,
  // so the walls take the top-left corner and the free bottom-right one
  // (on phones the buttons reach far right, so the lower wall fits the free
  // corner below and beside them: lip plus crystals stay clear of them)
  const roomy = w >= 600;
  const free = !roomy && a ? Math.hypot(Math.max(0, w - a.actionsRight), Math.max(0, h - a.copyBottom)) : Infinity;
  const tl: Wall = { cx: 0, cy: 0, r: u * 0.3, from: -Math.PI * 0.04, to: Math.PI * 0.54, seed: 8 };
  const br: Wall = { cx: w, cy: h, r: Math.min(u * (roomy ? 0.34 : 0.24), free * 0.5), from: Math.PI * 0.96, to: Math.PI * 1.54, seed: 3 };
  const lower = roomy ? ends(u * 0.2, u * 0.26) : ends(Math.min(u * 0.12, free * 0.26), Math.min(u * 0.17, free * 0.6));
  return {
    walls: [tl, br],
    glow: { x: 0.5, y: 0.28 },
    bokeh: bokeh(w, h, [
      [0.95, 0.06],
      [0.04, 0.3],
      [0.03, 0.97],
    ]),
    beds: [wallBody(tl, lining(tl, 18, 14, even(u * 0.045), AR, 2, 0.1)), wallBody(br, lining(br, 13, 16, even(Math.min(u * 0.045, free * 0.16)), A, 2, 0.1))],
    bodies: [
      wallBody(tl, lining(tl, 8, 5, ends(u * 0.16, u * 0.12), AR), { sway: 0.1, period: 21 }),
      wallBody(br, lining(br, 3, 6, lower, A), { sway: 0.1, period: 26, phase: 1.2, depth: 0.55 }),
      // in the gap between the phone and the copy
      body(slab(21, u * 0.05), w * 0.9, a ? (a.stageBottom + a.copyTop) / 2 : h * 0.47, { spin: [0.05, 0.11, 0.02], depth: 0.6, sway: 0 }),
      body(shard(31, u * 0.1, MAT.rose), w * 0.64, 76, { spin: [0.03, 0.14, 0.01], depth: 0.5, sway: 0 }),
    ],
  };
}
