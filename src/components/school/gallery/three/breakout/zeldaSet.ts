import * as THREE from "three";
import type { Vine } from "./ivy";
import type { Pixel } from "./pixels";
import type { Stone } from "./ruins";
import { BLOCK, type Slope } from "./terrain";

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
 *  standing taller and broken off, a slab fallen against the frame's top
 *  corner, and blocks that have tumbled to the floor. */
export const STONES: Stone[] = [
  // the left pillar, its courses worn out of true, broken off at head height
  { at: [-1.06, 0.12, 0.1], size: [0.22, 0.24, 0.2], turn: [0, 0.02, 0] },
  { at: [-1.05, 0.36, 0.1], size: [0.2, 0.23, 0.19], turn: [0, -0.06, 0.02] },
  { at: [-1.07, 0.6, 0.1], size: [0.21, 0.24, 0.19], turn: [0.02, 0.05, -0.03] },
  { at: [-1.05, 0.84, 0.1], size: [0.19, 0.23, 0.18], turn: [0, -0.04, 0.025] },
  { at: [-1.065, 1.08, 0.1], size: [0.2, 0.24, 0.19], turn: [-0.02, 0.07, -0.02] },
  { at: [-1.05, 1.31, 0.1], size: [0.18, 0.21, 0.18], turn: [0.02, -0.05, 0.03] },
  { at: [-1.03, 1.47, 0.11], size: [0.13, 0.12, 0.15], turn: [0.06, -0.15, 0.12] },
  { at: [-1.1, 1.5, 0.09], size: [0.09, 0.1, 0.12], turn: [-0.1, 0.25, -0.18] },
  // the right one, shorter, its top course fallen
  { at: [0.99, 0.13, 0.12], size: [0.29, 0.26, 0.26] },
  { at: [1.0, 0.385, 0.12], size: [0.27, 0.25, 0.24], turn: [0, 0.05, -0.02] },
  { at: [0.98, 0.64, 0.125], size: [0.26, 0.26, 0.25], turn: [0.02, -0.04, 0.03] },
  { at: [1.0, 0.9, 0.12], size: [0.27, 0.25, 0.23], turn: [0, 0.06, -0.02] },
  { at: [0.975, 1.13, 0.12], size: [0.22, 0.2, 0.22], turn: [0.05, -0.1, 0.09] },
  { at: [1.02, 1.27, 0.11], size: [0.13, 0.11, 0.15], turn: [-0.12, 0.3, -0.2] },
  // a slab fallen against the frame's top left corner
  { at: [-0.84, 2.24, 0.05], size: [0.4, 0.13, 0.1], turn: [0, 0, 0.22] },
  // what tumbled to the floor
  { at: [1.32, 0.1, 0.98], size: [0.24, 0.2, 0.22], turn: [0.1, 0.6, 0.15] },
  { at: [-1.24, 0.08, 0.42], size: [0.2, 0.16, 0.2], turn: [-0.1, 0.4, 0.05] },
  { at: [-1.3, 0.06, 0.16], size: [0.14, 0.12, 0.14], turn: [0.2, 1.1, 0.1] },
  { at: [-1.1, 0.05, 0.6], size: [0.1, 0.09, 0.11], turn: [0.3, 0.7, 0.2] },
  { at: [0.7, 0.05, 0.93], size: [0.11, 0.1, 0.12], turn: [0.1, 1.4, -0.2] },
];

/** Where the slope starts along the wall: just clear of the plaque. */
const X0 = -0.08;

/** The game's grass pouring out of the picture and down to the floor beside
 *  it: level with the frame's foot under the picture, lower beside the
 *  plaque, falling away to the right until it meets the floor at `reach` (m
 *  from the work's centre). Narrow where it stands tall, it widens out over
 *  the floor as it comes down; ragged, here a block short, there one proud. */
function cascade(reach: number): Slope {
  return {
    x0: X0,
    z0: 0.125,
    columns: Math.ceil((reach + 0.1 - X0) / BLOCK),
    rows: 8,
    height: (i, k) => {
      const x = X0 + (i + 0.5) * BLOCK;
      const peak = x < 0.15 ? 8 - (0.15 - x) / 0.05 : x < 0.45 ? 8 : 8 - ((x - 0.45) / (reach - 0.45)) * 8;
      const fall = 0.15 + 0.04 * Math.max(peak, 0) ** 2;
      const r = hash(i, k);
      const rough = k > 0 && r < 0.24 ? -1 : r > 0.92 ? 1 : 0;
      return Math.round(peak - k * fall) + rough;
    },
  };
}

/** The wide room's slope runs most of the way to the next work; the narrow
 *  room hangs that one closer, so its slope comes down sooner. */
export const SLOPE = cascade(2.05);
export const NARROW_SLOPE = cascade(1.2);

/** Link stands on the slope near here (only x and z count), this many
 *  metres a pixel, this many pixels thick, turned this far toward the entrance. */
export const LINK = { near: new THREE.Vector3(0.25, 0, 0.17), size: 0.0105, thick: 3, turn: -0.35 };

/** Ivy on the frame itself: over the top bar either side of the name, down
 *  both sides, a few strands hanging over the picture's top edge. */
export const FRAME_IVY: Vine[] = [
  { path: [[-0.86, 2.34, 0.09], [-0.72, 2.29, 0.095], [-0.69, 2.16, 0.095]], size: 0.075, density: 3.2 },
  { path: [[-0.2, 2.31, 0.092], [0.2, 2.27, 0.095], [0.55, 2.3, 0.092], [0.86, 2.25, 0.09]], size: 0.072, density: 2.8 },
  { path: [[-0.78, 2.25, 0.092], [-0.74, 1.8, 0.095], [-0.77, 1.3, 0.092], [-0.72, 0.95, 0.095]], size: 0.07, density: 2.5 },
  { path: [[0.8, 2.28, 0.092], [0.76, 1.9, 0.095], [0.79, 1.5, 0.092]], size: 0.07, density: 2.2 },
  { path: [[0.0, 2.32, 0.095], [0.02, 2.2, 0.105], [-0.01, 2.06, 0.105]], size: 0.056, density: 2.2, over: true },
  { path: [[0.32, 2.3, 0.095], [0.3, 2.12, 0.105]], size: 0.054, density: 2.2, over: true },
  { path: [[0.62, 2.3, 0.095], [0.6, 2.02, 0.105], [0.63, 1.88, 0.105]], size: 0.056, density: 2.2, over: true },
];

/** Ivy on the wall and the stone: climbing from the frame up to the ceiling,
 *  over the pillars and down their sides, spilling off the slab. */
export const ROOM_IVY: Vine[] = [
  { path: [[-0.8, 2.35, 0.03], [-0.65, 2.7, 0.035], [-0.75, 3.1, 0.03], [-0.55, 3.65, 0.03]], size: 0.085, density: 2.8 },
  { path: [[-0.4, 2.36, 0.03], [-0.3, 2.9, 0.03], [-0.42, 3.4, 0.03]], size: 0.075, density: 2.0 },
  { path: [[0.3, 2.35, 0.03], [0.45, 2.75, 0.03], [0.35, 3.2, 0.03]], size: 0.075, density: 2.2 },
  { path: [[-1.04, 1.56, 0.21], [-1.07, 1.2, 0.205], [-1.02, 0.8, 0.205], [-1.06, 0.45, 0.205], [-1.03, 0.2, 0.205]], size: 0.085, density: 2.7 },
  { path: [[-1.18, 1.5, 0.12], [-1.18, 1.1, 0.1], [-1.18, 0.7, 0.12]], size: 0.075, density: 2.1 },
  { path: [[-0.88, 0.35, 0.03], [-0.9, 1.0, 0.03], [-0.87, 1.8, 0.03]], size: 0.07, density: 2.0 },
  { path: [[0.99, 1.4, 0.27], [1.0, 1.0, 0.27], [0.97, 0.55, 0.27], [1.0, 0.2, 0.27]], size: 0.085, density: 2.3 },
  { path: [[-1.08, 1.55, 0.2], [-1.14, 1.35, 0.26], [-1.18, 1.1, 0.28]], size: 0.07, density: 2.2 },
  { path: [[-1.0, 2.3, 0.08], [-0.85, 2.32, 0.1], [-0.66, 2.38, 0.08]], size: 0.075, density: 2.6 },
];

const BLOOMS = ["#ff5a6e", "#ffd84a", "#7ab8ff", "#ffffff", "#c58bff"];

/** Flowers in the grass: on one top in seven, a stalk and a bloom. */
export const flowers = (tops: THREE.Vector3[]): Pixel[] =>
  tops.flatMap((t, i) => {
    if (hash(t.x * 31, t.z * 17) > 0.14) return [];
    const x = t.x + (hash(i, 1) - 0.5) * BLOCK * 0.5;
    const z = t.z + (hash(i, 2) - 0.5) * BLOCK * 0.5;
    return [
      { at: [x, t.y + 0.012, z], size: 0.01, color: "#2f7a2a", glow: 0, drift: 0 },
      { at: [x, t.y + 0.03, z], size: 0.02, color: BLOOMS[i % BLOOMS.length], glow: 0, drift: 0 },
    ];
  });

/** Glowing blocks: sitting in the grass on one top in five. */
export const glowing = (tops: THREE.Vector3[]): Pixel[] =>
  tops.flatMap((t, i) =>
    hash(t.x * 13, t.z * 29) > 0.2 ? [] : [{ at: [t.x + (hash(i, 3) - 0.5) * 0.04, t.y + 0.018, t.z], size: 0.03, color: "#ffe46a", glow: 2.0, drift: 0 }],
  );

/** Fireflies loitering round the frame and down over the slope. */
export const FIREFLIES: Pixel[] = Array.from({ length: 20 }, (_, i) => ({
  at: [-1.0 + 2.6 * hash(i, 7), 0.5 + 1.9 * hash(i, 8), 0.12 + 0.55 * hash(i, 9)] as const,
  size: 0.012 + 0.008 * hash(i, 10),
  color: i % 3 ? "#f2ff8a" : "#c6ff6a",
  glow: 1.8,
  drift: 0.05 + 0.08 * hash(i, 11),
}));
