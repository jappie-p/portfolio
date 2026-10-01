import { bayer, grade, mix, type Grade, type Rgb } from "./color";
import { MARGIN, type Layout } from "./layout";
import { GAME, MOONLIGHT, NIGHT } from "./palette";
import { Raster } from "./raster";
import { between, int, seeded } from "./rng";

export type Band = { canvas: HTMLCanvasElement; top: number };

const FAR: Rgb = [50, 50, 98];
const FAR_LIT: Rgb = [78, 78, 132];
const MIST: Rgb = [86, 88, 146];
const NEAR: Rgb = [27, 32, 66];
const NEAR_LIT: Rgb = [46, 54, 98];
const FOREST_FLOOR: Rgb = [6, 16, 22];
const UNDERGROWTH: Rgb = [12, 32, 34];

/** Two ridgelines toward the horizon: a far range with moonlit west faces and
 *  low rolling hills in front. */
export function buildHills(L: Layout, seed = 23): Band {
  const LW = L.W + MARGIN * 2;
  const r = new Raster(LW, L.H);
  const rand = seeded(seed);
  const p = Array.from({ length: 6 }, () => between(rand, 0, 6.3));
  const far = (x: number) =>
    L.horizon - 16 - 11 * Math.abs(Math.sin(x * 0.019 + p[0])) - 5 * Math.sin(x * 0.053 + p[1]) - 2.5 * Math.sin(x * 0.14 + p[2]);
  const near = (x: number) => L.horizon - 5 - 7 * (0.5 + 0.5 * Math.sin(x * 0.016 + p[3])) - 2.5 * Math.sin(x * 0.047 + p[4]);
  let top = L.H;
  const mistY = L.horizon - 7;
  for (let x = 0; x < LW; x++) {
    const f = Math.round(far(x));
    const rising = far(x + 1) < far(x - 1) - 0.25;
    top = Math.min(top, f);
    for (let y = f; y < L.H; y++) {
      const depth = y - f;
      const lit = rising && (depth < 2 || (depth < 5 && bayer(x, y) < 0.3));
      // valley mist pooled at the foot of the range
      const mist = 1 - Math.abs(y - mistY) / 5;
      r.set(x, y, mist > 0 && bayer(x, y) < mist * 0.5 ? MIST : lit ? FAR_LIT : FAR);
    }
    const n = Math.round(near(x));
    for (let y = n; y < L.H; y++) r.set(x, y, y === n ? NEAR_LIT : NEAR);
  }
  return { canvas: r.canvas(), top };
}

/** One of the game's round trees, scaled up for the tree line: his five-step
 *  diagonal shading (light from the top left), a bumpier ALttP outline, and a
 *  thin moonlit rim. */
function drawTree(r: Raster, cx: number, cy: number, R: number, g: Grade, trunkTo: number, phase: number) {
  const c = {
    spec: grade(GAME.treeSpec, g),
    hi: grade(GAME.treeHi, g),
    base: grade(GAME.tree, g),
    shadow: grade(GAME.treeShadow, g),
    deep: grade(GAME.treeDeep, g),
    trunk: grade(GAME.trunk, g),
    trunkDark: grade(GAME.trunkDark, g),
    trunkLight: grade(GAME.trunkLight, g),
  };
  const tw = R > 8 ? 4 : 3;
  const tx = Math.round(cx - tw / 2);
  for (let y = Math.round(cy + R * 0.5); y < trunkTo; y++) {
    for (let x = tx; x < tx + tw; x++) r.set(x, y, x === tx + tw - 1 ? c.trunkDark : (x + y) % 5 === 0 ? c.trunkLight : c.trunk);
  }
  const rim = mix(c.spec, MOONLIGHT, 0.32);
  const inside = (dx: number, dy: number) => {
    const a = Math.atan2(dy, dx);
    const rr = R * (1 + 0.07 * Math.sin(a * 6 + phase) + 0.04 * Math.sin(a * 11 + phase * 2));
    return dx * dx + dy * dy <= rr * rr;
  };
  for (let dy = -R - 2; dy <= R + 2; dy++) {
    for (let dx = -R - 2; dx <= R + 2; dx++) {
      if (!inside(dx, dy)) continue;
      const s = (dx + dy) / R;
      let col = s <= -0.95 ? c.spec : s <= -0.38 ? c.hi : s <= 0.38 ? c.base : s <= 0.95 ? c.shadow : c.deep;
      if (!inside(dx - 1, dy - 1) && dx + dy < 0) col = rim;
      // leaf clusters: a scatter of the neighbouring shade breaks up the bands
      if (((dx * 7 + dy * 13 + Math.round(phase * 10)) & 15) === 0) col = s < 0 ? c.base : c.deep;
      r.set(cx + dx, cy + dy, col);
    }
  }
}

/** The forest edge behind the house and the path: a hazier back row, a
 *  front row of big round trees, and dark forest floor between the trunks. */
export function buildTrees(L: Layout, seed = 31): Band {
  const LW = L.W + MARGIN * 2;
  const r = new Raster(LW, L.H);
  const rand = seeded(seed);
  const back: Grade = { ...NIGHT, fog: 0.5, fogTo: [22, 30, 60] };
  const front: Grade = { ...NIGHT, fog: 0.12, fogTo: [10, 22, 36] };
  let top = L.H;
  for (let x = -6; x < LW + 8; x += int(rand, 8, 13)) {
    const R = int(rand, 6, 9);
    const cy = L.groundTop - 15 + int(rand, -3, 2);
    top = Math.min(top, cy - R - 1);
    drawTree(r, x, cy, R, back, L.groundTop, between(rand, 0, 6.3));
  }
  // the dark understory: over the back row's lower edge, with low scrub on top
  for (let x = 0; x < LW; x++) {
    const scrub = Math.round(1.5 + 1.5 * Math.sin(x * 0.7) * Math.sin(x * 0.23 + 1));
    for (let y = L.groundTop - 7 - scrub; y < L.groundTop; y++) {
      if (y < L.groundTop - 7 && r.get(x, y)) continue;
      r.set(x, y, y < L.groundTop - 6 ? UNDERGROWTH : FOREST_FLOOR);
    }
  }
  let i = 0;
  for (let x = int(rand, -4, 6); x < LW + 10; x += int(rand, 15, 24)) {
    // now and then an old tree that stands a head taller than the rest
    const tall = i++ % 4 === 2;
    const R = tall ? int(rand, 12, 14) : int(rand, 8, 11);
    const cy = L.groundTop - (tall ? 16 : 12) + int(rand, -3, 2);
    top = Math.min(top, cy - R - 1);
    drawTree(r, x, cy, R, front, L.groundTop, between(rand, 0, 6.3));
  }
  return { canvas: r.canvas(), top };
}
