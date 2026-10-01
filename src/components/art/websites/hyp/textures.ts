import { context, makeCanvas } from "../lib/canvas";
import { mulberry32 } from "../lib/rng";

export type BlockKind = "grass" | "dirt" | "stone" | "obsidian" | "server" | "redstone";
export type LedMode = "power" | "activity" | "alert";
export interface LedSpot {
  u: number;
  v: number;
  color: "green" | "red";
  mode: LedMode;
}

type Face = "top" | "left" | "right";
export interface BlockFaces {
  tex: Record<Face, HTMLCanvasElement>;
  /** Emissive texels in the same layout (redstone ore), or null. */
  glow: Record<Face, HTMLCanvasElement> | null;
  /** Status LED sockets on the left face (server blocks). */
  leds: LedSpot[];
  /** Mid tone, painted under the faces so seams never show the void. */
  base: string;
}

type RGB = readonly [number, number, number];
const S = 16;

// dark to light, so a 0..1 value picks a shade
const GRASS: RGB[] = [[52, 88, 31], [64, 104, 38], [78, 122, 46], [92, 139, 54], [108, 158, 64]];
const DIRT: RGB[] = [[74, 51, 34], [92, 64, 43], [108, 76, 52], [124, 88, 61], [142, 103, 72]];
const STONE: RGB[] = [[70, 70, 75], [86, 86, 91], [100, 100, 105], [114, 114, 119], [132, 132, 137]];
const OBSIDIAN: RGB[] = [[10, 7, 16], [17, 12, 27], [25, 18, 39], [42, 30, 66], [66, 47, 104]];
const METAL: RGB[] = [[22, 24, 29], [33, 36, 42], [43, 47, 54], [56, 61, 70], [78, 84, 96]];
const ORE: RGB[] = [[128, 14, 14], [196, 28, 28], [248, 64, 58]];

const shade = (pal: readonly RGB[], v: number, cuts: readonly number[]) => {
  let i = 0;
  while (i < cuts.length && v > cuts[i]) i++;
  return pal[i];
};

function paint(fn: (x: number, y: number) => RGB | null): HTMLCanvasElement {
  const c = makeCanvas(S, S);
  const ctx = context(c);
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const col = fn(x, y);
      if (!col) continue;
      const i = (y * S + x) * 4;
      img.data[i] = col[0];
      img.data[i + 1] = col[1];
      img.data[i + 2] = col[2];
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** 16x16 white noise softened into clusters (wrapping), normalised to 0..1.
 *  `sx` stretches the clusters sideways, like the streaks in stone. */
function clusters(rnd: () => number, passes: number, sx = 1): Float32Array {
  let f = Float32Array.from({ length: S * S }, rnd);
  for (let p = 0; p < passes; p++) {
    const g = new Float32Array(S * S);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        let s = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -sx; dx <= sx; dx++) {
            s += f[((y + dy + S) % S) * S + ((x + dx + S) % S)];
            n++;
          }
        }
        g[y * S + x] = s / n;
      }
    }
    f = g;
  }
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of f) {
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  return f.map((v) => (v - lo) / (hi - lo || 1));
}

function dirtTex(seed: number) {
  const rnd = mulberry32(seed);
  const f = clusters(rnd, 1);
  return paint((x, y) => shade(DIRT, f[y * S + x] * 0.45 + rnd() * 0.55, [0.16, 0.36, 0.64, 0.86]));
}

function stoneTex(seed: number) {
  const rnd = mulberry32(seed);
  const f = clusters(rnd, 2, 2);
  return paint((x, y) => shade(STONE, f[y * S + x] * 0.72 + rnd() * 0.28, [0.2, 0.38, 0.62, 0.82]));
}

function grassTop(seed: number) {
  const rnd = mulberry32(seed);
  const f = clusters(rnd, 1);
  return paint((x, y) => shade(GRASS, f[y * S + x] * 0.55 + rnd() * 0.45, [0.2, 0.4, 0.62, 0.84]));
}

/** Dirt with the ragged green lip that makes a grass block a grass block. */
function grassSide(seed: number) {
  const rnd = mulberry32(seed);
  const dirt = dirtTex(seed + 1);
  const d = context(dirt).getImageData(0, 0, S, S).data;
  const lip = Array.from({ length: S }, () => 2 + (rnd() < 0.6 ? 1 : 0) + (rnd() < 0.3 ? 1 : 0) + (rnd() < 0.08 ? 1 : 0));
  return paint((x, y) => {
    if (y < lip[x]) return shade(GRASS, y === lip[x] - 1 ? rnd() * 0.45 : 0.3 + rnd() * 0.7, [0.2, 0.4, 0.62, 0.84]);
    const i = (y * S + x) * 4;
    return [d[i], d[i + 1], d[i + 2]];
  });
}

function obsidianTex(seed: number) {
  const rnd = mulberry32(seed);
  const f = clusters(rnd, 2);
  return paint((x, y) => {
    const v = f[y * S + x];
    const streak = Math.sin(x * 0.8 + y * 1.25 + v * 6) > 0.72 && rnd() < 0.75;
    if (streak) return shade(OBSIDIAN, 0.6 + rnd() * 0.4, [0.2, 0.4, 0.6, 0.86]);
    return shade(OBSIDIAN, v * 0.62 + rnd() * 0.2, [0.22, 0.46, 0.7, 0.95]);
  });
}

/** Stone with a few clumps of glowing red ore: returns the face and its glow map. */
function redstoneTex(seed: number): [HTMLCanvasElement, HTMLCanvasElement] {
  const rnd = mulberry32(seed);
  const stone = stoneTex(seed + 7);
  const sd = context(stone).getImageData(0, 0, S, S).data;
  const ore = new Int8Array(S * S).fill(-1);
  for (let k = 0; k < 5; k++) {
    let x = 2 + Math.floor(rnd() * 12);
    let y = 2 + Math.floor(rnd() * 12);
    const n = 3 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      ore[y * S + x] = Math.min(2, Math.floor(rnd() * 3.2));
      x = Math.max(1, Math.min(14, x + Math.round(rnd() * 2 - 1)));
      y = Math.max(1, Math.min(14, y + Math.round(rnd() * 2 - 1)));
    }
  }
  const face = paint((x, y) => {
    const o = ore[y * S + x];
    if (o >= 0) return ORE[o];
    const i = (y * S + x) * 4;
    return [sd[i], sd[i + 1], sd[i + 2]];
  });
  const glow = paint((x, y) => (ore[y * S + x] >= 0 ? [255, 70 + ore[y * S + x] * 25, 60] : null));
  return [face, glow];
}

const BAYS = [3, 7, 11];

/** A rack node: a plate with rivets on top, drive bays with LED sockets in
 *  front (left face), vent slits on the side (right face). */
function serverFaces(seed: number): { top: HTMLCanvasElement; left: HTMLCanvasElement; right: HTMLCanvasElement; leds: LedSpot[] } {
  const rnd = mulberry32(seed);
  const edge = (x: number, y: number) => x === 0 || y === 0 || x === S - 1 || y === S - 1;
  const top = paint((x, y) => {
    if (edge(x, y)) return METAL[0];
    if ((x === 2 || x === 13) && (y === 2 || y === 13)) return METAL[4];
    if (x >= 4 && x <= 11 && y >= 5 && y <= 10) return y % 2 ? METAL[0] : METAL[1];
    return METAL[1 + Math.floor(rnd() * 2.2)];
  });
  const left = paint((x, y) => {
    if (edge(x, y)) return METAL[0];
    if (y === 1) return METAL[3];
    for (const r of BAYS) {
      if (y === r && x >= 2 && x <= 10) return [11, 12, 15];
      if (y === r + 1 && x >= 2 && x <= 10) return [19, 21, 25];
      if (y === r && (x === 12 || x === 13)) return [14, 14, 17];
    }
    return METAL[1 + Math.floor(rnd() * 2.2)];
  });
  const right = paint((x, y) => {
    if (edge(x, y)) return METAL[0];
    if (y >= 3 && y <= 12 && x >= 3 && x <= 13 && x % 2 === 1) return [15, 16, 20];
    return METAL[1 + Math.floor(rnd() * 2)];
  });
  const alertBay = Math.floor(rnd() * 3);
  const leds: LedSpot[] = [];
  BAYS.forEach((r, i) => {
    leds.push({ u: 12, v: r, color: "green", mode: "activity" });
    leds.push(i === alertBay ? { u: 13, v: r, color: "red", mode: "alert" } : { u: 13, v: r, color: "green", mode: "power" });
  });
  return { top, left, right, leds };
}

const rgb = (c: RGB) => `rgb(${c[0]},${c[1]},${c[2]})`;
let cache: Record<BlockKind, BlockFaces> | null = null;

/** Every block's faces, generated once per page from fixed seeds. */
export function blockFaces(): Record<BlockKind, BlockFaces> {
  if (cache) return cache;
  const same = (t: HTMLCanvasElement) => ({ top: t, left: t, right: t });
  const [ore, oreGlow] = redstoneTex(41);
  const [oreB, oreGlowB] = redstoneTex(43);
  const [oreC, oreGlowC] = redstoneTex(47);
  const server = serverFaces(59);
  cache = {
    grass: { tex: { top: grassTop(11), left: grassSide(12), right: grassSide(13) }, glow: null, leds: [], base: rgb(DIRT[2]) },
    dirt: { tex: { top: dirtTex(21), left: dirtTex(22), right: dirtTex(23) }, glow: null, leds: [], base: rgb(DIRT[2]) },
    stone: { tex: { top: stoneTex(31), left: stoneTex(32), right: stoneTex(33) }, glow: null, leds: [], base: rgb(STONE[2]) },
    obsidian: { tex: same(obsidianTex(51)), glow: null, leds: [], base: rgb(OBSIDIAN[1]) },
    redstone: { tex: { top: ore, left: oreB, right: oreC }, glow: { top: oreGlow, left: oreGlowB, right: oreGlowC }, leds: [], base: rgb(STONE[2]) },
    server: { tex: { top: server.top, left: server.left, right: server.right }, glow: null, leds: server.leds, base: rgb(METAL[1]) },
  };
  return cache;
}
