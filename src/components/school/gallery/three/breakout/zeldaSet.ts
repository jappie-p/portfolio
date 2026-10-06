import * as THREE from "three";
import type { Vine } from "./ivy";
import type { Pixel } from "./pixels";
import type { Stone } from "./ruins";
import { BLOCK, LAMPS, type Slope } from "./terrain";

/*
 * What stands round the Zelda print, in its set's space: x from the work's
 * centre, y from the floor, z out from the wall. Its frame reaches 0.802 out
 * either side, from 0.718 to 2.322 up, its face 0.078 off the wall; the
 * picture's foot is at 0.91.
 */

/** A seeded hash, 0..1, so the room is the same every visit. */
const hash = (a: number, b: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Two pillars of weathered stone either side of the frame, the left one
 *  standing taller and broken off, the stones the grass shelf rests on, a
 *  slab fallen against the frame's top corner, and blocks that have tumbled
 *  to the floor. */
export const STONES: Stone[] = [
  // the left pillar, its courses worn out of true, broken off at head height
  { at: [-0.95, 0.12, 0.1], size: [0.22, 0.24, 0.2], turn: [0, 0.02, 0] },
  { at: [-0.94, 0.36, 0.1], size: [0.2, 0.23, 0.19], turn: [0, -0.06, 0.02] },
  { at: [-0.96, 0.6, 0.1], size: [0.21, 0.24, 0.19], turn: [0.02, 0.05, -0.03] },
  { at: [-0.94, 0.84, 0.1], size: [0.19, 0.23, 0.18], turn: [0, -0.04, 0.025] },
  { at: [-0.955, 1.08, 0.1], size: [0.2, 0.24, 0.19], turn: [-0.02, 0.07, -0.02] },
  { at: [-0.94, 1.31, 0.1], size: [0.18, 0.21, 0.18], turn: [0.02, -0.05, 0.03] },
  { at: [-0.92, 1.47, 0.11], size: [0.13, 0.12, 0.15], turn: [0.06, -0.15, 0.12] },
  { at: [-0.99, 1.5, 0.09], size: [0.09, 0.1, 0.12], turn: [-0.1, 0.25, -0.18] },
  // the right one, shorter, its top course fallen
  { at: [0.99, 0.13, 0.12], size: [0.29, 0.26, 0.26] },
  { at: [1.0, 0.385, 0.12], size: [0.27, 0.25, 0.24], turn: [0, 0.05, -0.02] },
  { at: [0.98, 0.64, 0.125], size: [0.26, 0.26, 0.25], turn: [0.02, -0.04, 0.03] },
  { at: [1.0, 0.9, 0.12], size: [0.27, 0.25, 0.23], turn: [0, 0.06, -0.02] },
  { at: [0.975, 1.13, 0.12], size: [0.22, 0.2, 0.22], turn: [0.05, -0.1, 0.09] },
  { at: [1.02, 1.27, 0.11], size: [0.13, 0.11, 0.15], turn: [-0.12, 0.3, -0.2] },
  // the stones the grass shelf rests on, right of the plaque
  { at: [0.036, 0.16, 0.215], size: [0.26, 0.32, 0.2], turn: [0, 0.03, 0] },
  { at: [0.03, 0.5, 0.212], size: [0.24, 0.36, 0.19], turn: [0, -0.04, 0.015] },
  // a slab fallen against the frame's top left corner
  { at: [-0.84, 2.24, 0.05], size: [0.4, 0.13, 0.1], turn: [0, 0, 0.22] },
  // what tumbled to the floor
  { at: [1.32, 0.1, 0.98], size: [0.24, 0.2, 0.22], turn: [0.1, 0.6, 0.15] },
  { at: [-1.24, 0.08, 0.42], size: [0.2, 0.16, 0.2], turn: [-0.1, 0.4, 0.05] },
  { at: [-1.3, 0.06, 0.16], size: [0.14, 0.12, 0.14], turn: [0.2, 1.1, 0.1] },
  { at: [-1.1, 0.05, 0.6], size: [0.1, 0.09, 0.11], turn: [0.3, 0.7, 0.2] },
  { at: [0.7, 0.05, 0.93], size: [0.11, 0.1, 0.12], turn: [0.1, 1.4, -0.2] },
];

/** The shelf the picture's grass makes on the frame's foot, from pillar to
 *  pillar: its top and underside (blocks), its ends (m along the wall) and
 *  how deep it is (rows). Over the plaque it is a single block thick. */
const SHELF = { top: 9, under: 8, from: -0.84, to: 0.84, rows: 2 };
/** Right of here the shelf stands solid on the floor and the grass pours
 *  off it, over its front and its right end. */
const POUR = 0.45;
/** How far the spill has come from the shelf (m) to drop to each height
 *  (blocks): a drop off the shelf's edge, so the shelf reads on its own,
 *  then low steps, broader as it comes down. */
const STEPS: [number, number][] = [
  [0.05, 7],
  [0.11, 6],
  [0.18, 5],
  [0.26, 4],
  [0.35, 3],
  [0.45, 2],
  [0.58, 1],
];

/** The game's grass pouring out of the picture's foot: a shelf along the
 *  frame's whole foot, Link standing on it, solid under its right part,
 *  from which the grass drops off its front and its right end in broad,
 *  low, ragged steps to the floor and runs on along the floor toward the
 *  next work until `reach` (m from the work's centre); under its left half
 *  only a few ragged blocks of grass. */
function cascade(reach: number): Slope {
  const xOf = (i: number) => SHELF.from + (i + 0.5) * BLOCK;
  const zOf = (k: number) => 0.125 + (k + 0.5) * BLOCK;
  const onShelf = (x: number, k: number) => x < SHELF.to && k < SHELF.rows;
  return {
    x0: SHELF.from,
    z0: 0.125,
    columns: Math.ceil((reach + 0.1 - SHELF.from) / BLOCK),
    rows: 11,
    height: (i, k) => {
      const x = xOf(i);
      const z = zOf(k);
      if (onShelf(x, k)) return SHELF.top;
      const r = hash(i, k);
      // how far it has run from the pouring part of the shelf, its edges wandering
      // it pours down and to the right: short and steep off the shelf's
      // front near Link, ever broader further right
      const out = 1.5 - 0.75 * Math.min(Math.max((x - POUR) / 1.1, 0), 1);
      const d =
        Math.hypot(Math.max(0, x - SHELF.to) + Math.max(0, POUR - x) * 3, Math.max(0, z - 0.125 - SHELF.rows * BLOCK) * out) +
        (r - 0.5) * 0.11 +
        0.05 * Math.sin(x * 9.0 + z * 5.0) +
        0.04 * Math.sin(x * 23.0 - z * 11.0);
      let h = STEPS.find(([far]) => d < far)?.[1] ?? 0;
      // here and there a block knocked off, or one more on
      if (h > 1) h += r < 0.16 ? -1 : r > 0.9 ? 1 : 0;
      // and on along the floor toward the next work, one block high, now and then two
      const run = 0.125 + (2.6 + 2.2 * hash(i, 0.5) + Math.sin(x * 4.0)) * BLOCK * (1 - Math.max(0, (x - (reach - 0.35)) / 0.35));
      if (x > SHELF.to && x < reach && z < run) h = Math.max(h, r > 0.84 ? 2 : 1);
      // under the shelf's left half, a few ragged blocks of grass
      if (x < -0.12 && x > -0.76 && k < 6 && hash(i * 3.1, k) > 0.55) h = Math.max(h, 1);
      return h;
    },
    // over the plaque the shelf stands out from the frame on its own
    base: (i, k) => (xOf(i) < POUR && onShelf(xOf(i), k) ? SHELF.under : 0),
  };
}

/** The wide room's slope runs most of the way to the next work; the narrow
 *  room hangs that one closer, so its slope comes down sooner. */
export const SLOPE = cascade(1.85);
export const NARROW_SLOPE = cascade(1.25);

/** How high the wide room's grass stands at (x, z) (m, the set's space): for
 *  what grows out of it. */
export function groundAt(x: number, z: number) {
  const i = Math.floor((x - SLOPE.x0) / BLOCK);
  const k = Math.floor((z - SLOPE.z0) / BLOCK);
  if (i < 0 || k < 0 || i >= SLOPE.columns || k >= SLOPE.rows) return 0;
  return Math.max(0, Math.round(SLOPE.height(i, k))) * BLOCK;
}

/** Link stands on the shelf near here, two fifths of the way across (only x and z count), this many
 *  metres a pixel, this many pixels thick, turned this far toward the entrance. */
export const LINK = { near: new THREE.Vector3(-0.17, 0, 0.17), size: 0.0105, thick: 3, turn: -0.35 };

/** Ivy on the frame itself, thick: clumps over its top corners, along the
 *  top bar right of the name (which stays clear) and on the wall above it,
 *  down both sides, a few strands hanging over the picture's top edge. */
export const FRAME_IVY: Vine[] = [
  { path: [[-0.92, 2.37, 0.09], [-0.74, 2.3, 0.095], [-0.7, 2.12, 0.095]], size: 0.082, density: 4.6 },
  { path: [[0.07, 2.33, 0.092], [0.32, 2.28, 0.095], [0.6, 2.32, 0.092], [0.88, 2.27, 0.09]], size: 0.08, density: 4.4 },
  { path: [[-0.72, 2.4, 0.07], [-0.36, 2.45, 0.065], [0.02, 2.38, 0.075]], size: 0.075, density: 3.2 },
  { path: [[-0.8, 2.25, 0.092], [-0.75, 1.8, 0.095], [-0.78, 1.3, 0.092], [-0.73, 0.95, 0.095]], size: 0.076, density: 4.0 },
  { path: [[0.8, 2.28, 0.092], [0.77, 1.9, 0.095], [0.8, 1.45, 0.092], [0.76, 1.15, 0.095]], size: 0.076, density: 3.6 },
  { path: [[0.92, 2.42, 0.08], [0.85, 2.22, 0.1], [0.88, 2.0, 0.1]], size: 0.082, density: 4.2 },
  { path: [[0.1, 2.32, 0.095], [0.12, 2.2, 0.105], [0.09, 2.06, 0.105]], size: 0.058, density: 3.2, over: true },
  { path: [[0.32, 2.3, 0.095], [0.3, 2.12, 0.105]], size: 0.056, density: 3.2, over: true },
  { path: [[0.62, 2.3, 0.095], [0.6, 2.02, 0.105], [0.63, 1.88, 0.105]], size: 0.058, density: 3.2, over: true },
  { path: [[-0.66, 2.12, 0.1], [-0.64, 1.95, 0.105], [-0.67, 1.82, 0.105]], size: 0.055, density: 3.0, over: true },
];

/** Ivy on the wall and the stone: climbing from the frame up to the ceiling,
 *  over the pillars and down their sides, spilling off the slab. */
export const ROOM_IVY: Vine[] = [
  { path: [[-0.8, 2.35, 0.03], [-0.65, 2.7, 0.035], [-0.75, 3.1, 0.03], [-0.55, 3.65, 0.03]], size: 0.085, density: 3.9 },
  { path: [[-0.4, 2.36, 0.03], [-0.3, 2.9, 0.03], [-0.42, 3.4, 0.03]], size: 0.075, density: 2.8 },
  { path: [[0.3, 2.35, 0.03], [0.45, 2.75, 0.03], [0.35, 3.2, 0.03]], size: 0.075, density: 3.1 },
  { path: [[-0.93, 1.56, 0.21], [-0.96, 1.2, 0.205], [-0.91, 0.8, 0.205], [-0.95, 0.45, 0.205], [-0.92, 0.2, 0.205]], size: 0.085, density: 3.8 },
  { path: [[-1.07, 1.5, 0.12], [-1.07, 1.1, 0.1], [-1.07, 0.7, 0.12]], size: 0.075, density: 2.9 },
  { path: [[-0.88, 0.35, 0.03], [-0.9, 1.0, 0.03], [-0.87, 1.8, 0.03]], size: 0.07, density: 2.8 },
  { path: [[0.99, 1.4, 0.27], [1.0, 1.0, 0.27], [0.97, 0.55, 0.27], [1.0, 0.2, 0.27]], size: 0.085, density: 3.2 },
  { path: [[-0.97, 1.55, 0.2], [-1.03, 1.35, 0.26], [-1.07, 1.1, 0.28]], size: 0.07, density: 3.1 },
  { path: [[-1.0, 2.3, 0.08], [-0.85, 2.32, 0.1], [-0.66, 2.38, 0.08]], size: 0.075, density: 3.6 },
];

const BLOOMS = ["#ff4058", "#ffd23a", "#b066ff", "#ff7ad0", "#ffffff", "#ff4058", "#b066ff"];

/** Flowers in the grass: on one top in five, a stalk and a bloom. */
export const flowers = (tops: THREE.Vector3[]): Pixel[] =>
  tops.flatMap((t, i) => {
    if (hash(t.x * 31, t.z * 17) > 0.2) return [];
    const x = t.x + (hash(i, 1) - 0.5) * BLOCK * 0.5;
    const z = t.z + (hash(i, 2) - 0.5) * BLOCK * 0.5;
    return [
      { at: [x, t.y + 0.012, z], size: 0.01, color: "#2f7a2a", glow: 0, drift: 0 },
      { at: [x, t.y + 0.03, z], size: 0.02, color: BLOOMS[i % BLOOMS.length], glow: 0.25, drift: 0, halo: 0 },
    ];
  });

/** Glowing blocks sitting in the grass: on one top in eight, no more than
 *  the grass has lamps for. */
export const glowing = (tops: THREE.Vector3[]): Pixel[] =>
  tops
    .filter((t) => hash(t.x * 13, t.z * 29) < 0.125)
    .slice(0, LAMPS)
    .map((t, i) => ({ at: [t.x + (hash(i, 3) - 0.5) * 0.04, t.y + 0.018, t.z] as const, size: 0.03, color: "#ffe46a", glow: 2.0, drift: 0, halo: 6 }));

/** How high a firefly may hover at (x, z) and stay clear of the site's
 *  header in the entrance's view (its top 70 px, at the squarest wide
 *  screens), its drift allowed for: lower the nearer it is to the way in. */
const below = (x: number, z: number) => Math.min(2.45, 2.28 + 0.2 * (x + 1.2) - 0.23 * (z - 0.12));

/** Fireflies: small square pixels with a tight glow, thickest round the
 *  frame's left side and its top left corner, fewer over the top and the
 *  grass; now and then a bigger soft one. */
export const FIREFLIES: Pixel[] = Array.from({ length: 64 }, (_, i) => {
  const soft = i % 9 === 0;
  const [x0, x1, y0, y1] = i < 38 ? [-1.2, -0.45, 0.75, 2.45] : i < 52 ? [-0.55, 0.75, 2.0, 2.45] : [-0.1, 1.4, 0.2, 1.3];
  const x = x0 + (x1 - x0) * hash(i, 7);
  const z = 0.12 + 0.6 * hash(i, 9);
  return {
    at: [x, y0 + (Math.min(y1, below(x, z)) - y0) * hash(i, 8), z] as const,
    size: soft ? 0.015 : 0.011 + 0.011 * hash(i, 10),
    color: i % 3 ? "#f4ff70" : "#ffe45a",
    glow: soft ? 1.6 : 2.6,
    drift: 0.035 + 0.06 * hash(i, 11),
    halo: soft ? 9 : 3,
  };
});
