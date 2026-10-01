import type { PanelAnchors } from "../lib/anchors";
import { mulberry32 } from "../lib/rng";
import type { Cell } from "./cube";
import { island } from "./island";
import type { BlockKind } from "./textures";

/** A cluster placed in the panel: x, y as 0..1 of the panel (the sprite's
 *  centre), z is depth (0 at the lens, ~0.45 in focus, 1.6 far in the void). */
export interface Placement {
  cells: Cell[];
  x: number;
  y: number;
  z: number;
  /** islands burn hotter toward their hanging tips */
  heatDepth?: number;
  /** near blocks sit out of the light */
  shade?: number;
  /** override the red light it catches (0..1), otherwise from the core distance */
  heat?: number;
  /** "top": x, y place the middle of its grass, not the sprite's centre */
  pin?: "top";
  /** size against its depth's default */
  scale?: number;
  /** 0..1 desaturation for the set pieces next to the site */
  mute?: number;
  /** part of the slow stream of blocks lifting off the hero island: rises
   *  from y to `to` (0..1 of the panel) at `speed` CSS px/s, `offset` 0..1
   *  staggering it along the way */
  rise?: { to: number; speed: number; offset: number };
}

export interface HypLayout {
  placements: Placement[];
  /** where the red light lives, 0..1 of the panel */
  core: { x: number; y: number };
  /** cube edge at depth 0.5, CSS px */
  unit: number;
}

const one = (kind: BlockKind, variant = 0): Cell[] => [{ kind, x: 0, y: 0, z: 0, variant }];
const stack = (...kinds: BlockKind[]): Cell[] => kinds.map((kind, i) => ({ kind, x: 0, y: kinds.length - 1 - i, z: 0, variant: i * 3 }));
const pair = (a: BlockKind, b: BlockKind): Cell[] => [
  { kind: a, x: 0, y: 0, z: 0, variant: 2 },
  { kind: b, x: 1, y: 0, z: 0, variant: 5 },
];
const racks = (base: Cell[], at: [number, number, number][]): Cell[] => [...base, ...at.map(([x, y, z]) => ({ kind: "server" as const, x, y, z }))];

/** Rack towers standing on the grass: [x, z, floors] where there is grass. */
function onTop(base: Cell[], spots: [number, number, number][]): Cell[] {
  const out = [...base];
  for (const [x, z, n] of spots) {
    if (!base.some((c) => c.kind === "grass" && c.x === x && c.y === 0 && c.z === z)) continue;
    for (let k = 1; k <= n; k++) out.push({ kind: "server", x, y: k, z });
  }
  return out;
}

const LIFT: BlockKind[] = ["grass", "dirt", "stone", "redstone", "dirt", "stone", "grass", "obsidian"];

/** The stream: blocks lift off the hero island's top and drift up out of frame. */
function stream(n: number, x0: number, x1: number, from: number, rnd: () => number): Placement[] {
  return Array.from({ length: n }, (_, i) => ({
    cells: one(LIFT[i % LIFT.length], Math.floor(rnd() * 8)),
    x: x0 + (x1 - x0) * ((i + rnd() * 0.8) / n),
    y: from,
    z: 0.5 + rnd() * 0.45,
    heat: 0.35,
    rise: { to: -0.08, speed: 7 + rnd() * 6, offset: rnd() },
  }));
}

/** The hero island: grass over dirt over a hanging stone underside, rack
 *  towers on its left and front, where they show past the frame. */
const heroIsland = () =>
  onTop(island(5, 8, 5, 4, 2), [
    [1, 3, 2],
    [0, 2, 1],
    [2, 4, 1],
    [5, 4, 1],
  ]);

/** Frame + phone sit on the left ~55%, copy on the right. The hero island
 *  peeks out past the frame's lower-left corner: grass, racks and LEDs to
 *  its left, the red-lit underside below it; blocks lift off it and rise
 *  along the frame's left edge. A smaller island with racks holds the space
 *  right of the copy's label, debris hangs below, the copy stays quiet. The
 *  islands are muted a touch so the site stays the hero. */
function wide(rnd: () => number, w: number, h: number, a: PanelAnchors | null, unit: number): { placements: Placement[]; core: { x: number; y: number } } {
  const overhead = island(13, 11, 6, 7, 4);
  const small = racks(island(9, 5, 4, 3), [
    [2, 1, 1],
    [2, 2, 1],
    [1, 1, 2],
  ]);
  // where the hero's grass sits: past the frame's lower-left corner when the
  // margin beside the frame can hold most of it, else under the frame's left
  // side; sized so its underside always ends above the panel's bottom
  const edge = unit * 0.714;
  const fx = a ? a.frame.x : w * 0.1;
  const fw = a ? a.frame.w : w * 0.43;
  const fb = a ? a.frame.y + a.frame.h : h * 0.75;
  const roomy = fx >= 5.63 * edge * 1.1;
  const py = fb + (h - fb) * (roomy ? 0.1 : 0.14);
  const heroScale = Math.max(0.6, Math.min(1.1, (h - 12 - py) / (8.25 * edge)));
  const px = roomy ? fx - fw * 0.05 : fx + 5.63 * edge * heroScale * 0.62;
  // the small island stands right of the copy's label row, as far in as fits
  const smallHalf = 3.9 * edge;
  const smallX = a
    ? Math.min(w - smallHalf * 0.6, Math.max(fx + fw + (w - fx - fw) * 0.78, a.copyTop >= 0 ? copyLeft(a) + copyWidth(a) * 0.8 + smallHalf + 10 : 0))
    : w * 0.88;
  const frameMid = a ? a.frame.x + a.frame.w / 2 : w * 0.3;
  return {
    core: { x: (px + frameMid) / 2 / w, y: 1 },
    placements: [
      { cells: overhead, x: 0.17, y: -0.06, z: 0.42, heatDepth: 0.9, heat: 0.55, mute: 0.25 },
      { cells: heroIsland(), x: px / w, y: py / h, z: 0.5, heatDepth: 0.8, pin: "top", scale: heroScale, mute: 0.3, shade: 0.1 },
      ...stream(5, (px - w * 0.06) / w, (px + w * 0.03) / w, py / h - 0.03, rnd),
      { cells: small, x: smallX / w, y: 0.19, z: 0.5, heatDepth: 0.6, mute: 0.3, shade: 0.1 },
      // debris hanging under the frame
      { cells: one("redstone", 1), x: 0.53, y: 0.9, z: 0.46 },
      { cells: pair("dirt", "stone"), x: 0.62, y: 0.965, z: 0.62 },
      { cells: one("stone", 6), x: 0.45, y: 1.0, z: 0.55 },
      // the right edge
      { cells: one("obsidian", 5), x: 0.968, y: 0.5, z: 0.6 },
      { cells: stack("server", "server"), x: 0.93, y: 0.84, z: 0.44 },
      // near, out of focus and out of the light
      { cells: one("obsidian"), x: 0.985, y: 0.07, z: 0.07, shade: 0.2 },
    ],
  };
}

const copyLeft = (a: PanelAnchors) => a.copy.x;
const copyWidth = (a: PanelAnchors) => a.copy.w;

/** Phones: frame on top, copy below. The hero hides behind the frame and
 *  hangs its lit underside into the gap above the copy; a small island with
 *  racks floats in the strip under the buttons. The sheet spans the panel's whole scroll height,
 *  so these sit at the measured frame and copy (fractions as a fallback).
 *  Tablets held upright have a bigger frame but an empty strip beside the
 *  copy: the hero floats there instead, whole. */
function tall(rnd: () => number, w: number, h: number, a: PanelAnchors | null): { placements: Placement[]; core: { x: number; y: number } } {
  const hero = island(5, 9, 6, 6, 3);
  const small = racks(island(9, 3, 3, 2), [[1, 1, 1]]);
  // phones: below the header, peeking over the frame; tablets: behind it,
  // clear of the nav
  const roomy = w >= 600;
  const top = [
    { cells: small, x: 0.17, y: roomy ? 0.1 : 84 / h, z: 0.55, heatDepth: 0.6 },
    { cells: one("server"), x: 0.9, y: roomy ? 0.088 : 80 / h, z: 0.6 },
    { cells: one("grass", 2), x: 0.02, y: 0.975, z: 0.06, shade: 0.5 },
  ];
  if (roomy) {
    return {
      placements: [{ cells: hero, x: 0.84, y: 0.8, z: 0.42, heatDepth: 0.8 }, ...stream(4, 0.62, 0.85, 0.72, rnd), ...top, { cells: stack("server", "server"), x: 0.9, y: 0.95, z: 0.5 }],
      core: { x: 0.84, y: 0.98 },
    };
  }
  const heroY = a ? (a.frameBottom - 32) / h : 0.34;
  return {
    placements: [
      { cells: hero, x: 0.5, y: heroY, z: 0.3, heatDepth: 0.8 },
      ...stream(4, 0.15, 0.85, heroY - 34 / h, rnd),
      ...top,
      a
        ? { cells: racks(island(9, 3, 3, 2), [[1, 1, 1], [1, 2, 1]]), x: 0.86, y: (a.copyBottom + (h - a.copyBottom) * 0.3) / h, z: 0.6, heatDepth: 0.6, pin: "top" as const, mute: 0.2 }
        : { cells: stack("server", "server"), x: 0.9, y: 0.95, z: 0.5 },
    ],
    core: { x: 0.5, y: a ? (a.frameBottom + a.copyTop) / 2 / h : 0.41 },
  };
}

const FILL: BlockKind[] = ["stone", "stone", "dirt", "grass", "obsidian", "stone", "redstone", "server"];

/** How welcome a far block is at (x, y): the edges yes, behind the copy barely. */
function welcome(x: number, y: number, isWide: boolean): number {
  const edge = Math.min(x, 1 - x, y, 1 - y);
  let v = 1 - Math.min(1, edge / 0.3) * 0.6;
  if (isWide && x > 0.54 && x < 0.95 && y > 0.2 && y < 0.8) v *= 0.1;
  if (!isWide && y > 0.15 && y < 0.9 && x > 0.12 && x < 0.88) v *= 0.15;
  return v;
}

export function hypLayout(w: number, h: number, anchors: PanelAnchors | null = null): HypLayout {
  const isWide = w / h > 0.9;
  const rnd = mulberry32(7);
  const far: Placement[] = [];
  const count = isWide ? 12 : 7;
  let guard = 0;
  while (far.length < count && guard++ < 2000) {
    const x = rnd();
    const y = rnd();
    if (rnd() > welcome(x, y, isWide)) continue;
    const kind = FILL[Math.floor(rnd() * FILL.length)];
    far.push({ cells: one(kind, Math.floor(rnd() * 8)), x, y, z: 0.95 + rnd() * 0.65 });
  }
  const unit = isWide ? Math.max(15, Math.min(44, Math.min(w, h) * 0.042)) : Math.max(15, Math.min(30, w * 0.05));
  const shaped = isWide ? wide(rnd, w, h, anchors, unit) : tall(rnd, w, h, anchors);
  return { placements: [...far, ...shaped.placements], core: shaped.core, unit };
}
