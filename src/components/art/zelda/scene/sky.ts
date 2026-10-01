import { bayer, mix, type Rgb } from "./color";
import { MARGIN, type Layout } from "./layout";
import { SKY } from "./palette";
import { Raster } from "./raster";
import { between, int, seeded } from "./rng";

export type Twinkler = { x: number; y: number; color: Rgb; sky: Rgb; peak: number; big: boolean; speed: number; phase: number };
export type Moon = { x: number; y: number; r: number };
export type Sky = { canvas: HTMLCanvasElement; twinklers: Twinkler[]; moon: Moon; at: (x: number, y: number) => Rgb };

const STAR_COLORS: readonly Rgb[] = [
  [236, 240, 255],
  [196, 214, 255],
  [255, 236, 204],
];
const HALO: Rgb = [128, 140, 214];
const MOON: readonly Rgb[] = [
  [150, 158, 186],
  [196, 198, 204],
  [226, 226, 214],
  [248, 246, 228],
];

/** Stepped evening bands with short ordered-dither seams, the way an SNES
 *  paints a gradient. Bands widen toward the top, where the night is. */
function band(x: number, y: number, horizon: number): Rgb {
  const u = Math.min(1, Math.max(0, y / horizon));
  const p = Math.pow(u, 1.7) * (SKY.length - 1);
  let i = Math.floor(p);
  const f = p - i;
  const seam = 0.34;
  if (f > 1 - seam && bayer(x, y) < (f - (1 - seam)) / seam) i++;
  return SKY[Math.min(SKY.length - 1, i)];
}

function drawMoon(r: Raster, moon: Moon, at: (x: number, y: number) => Rgb) {
  const { x: mx, y: my, r: R } = moon;
  // halo rings: a close bright one, then a sparse dithered one
  for (let y = my - R - 9; y <= my + R + 9; y++) {
    for (let x = mx - R - 9; x <= mx + R + 9; x++) {
      const d = Math.hypot(x - mx, y - my);
      if (d <= R + 0.5 || d > R + 9) continue;
      const near = d <= R + 3.5;
      if (!near && bayer(x, y) > 0.45) continue;
      r.set(x, y, mix(at(x, y), HALO, near ? 0.2 : 0.1));
    }
  }
  // maria and craters, placed like the familiar face of the moon
  const maria = [
    [-0.35, -0.3, 0.3],
    [0.25, -0.35, 0.22],
    [0.3, 0.1, 0.26],
    [-0.15, 0.35, 0.2],
  ];
  for (let y = -R; y <= R; y++) {
    for (let x = -R; x <= R; x++) {
      const nx = x / (R + 0.5);
      const ny = y / (R + 0.5);
      const d2 = nx * nx + ny * ny;
      if (d2 > 1) continue;
      const nz = Math.sqrt(1 - d2);
      // mostly front-lit, with a little light from the upper left
      let lum = 0.55 + 0.45 * Math.pow(nz, 0.6) - 0.22 * (nx + ny);
      for (const [cx, cy, cr] of maria) if ((nx - cx) ** 2 + (ny - cy) ** 2 < cr * cr) lum -= 0.3;
      const level = lum > 1.02 ? 3 : lum > 0.8 ? 2 : lum > 0.55 ? 1 : 0;
      r.set(mx + x, my + y, MOON[level]);
    }
  }
  // two small craters with a lit lower-right rim
  for (const [cx, cy] of [
    [-0.45, 0.25],
    [0.05, 0.62],
  ]) {
    const px = Math.round(mx + cx * R);
    const py = Math.round(my + cy * R);
    r.set(px, py, MOON[0]);
    r.set(px + 1, py + 1, MOON[3]);
  }
}

export function buildSky(L: Layout, seed = 7): Sky {
  const LW = L.W + MARGIN * 2;
  const r = new Raster(LW, L.H);
  const at = (x: number, y: number) => band(x, y, L.horizon);
  for (let y = 0; y < L.H; y++) for (let x = 0; x < LW; x++) r.set(x, y, at(x, y));

  const moon: Moon = { x: MARGIN + Math.round(Math.min(L.W * 0.19, 70)), y: Math.round(Math.min(26, L.horizon * 0.2)), r: 10 };
  const rand = seeded(seed);
  const twinklers: Twinkler[] = [];
  const count = Math.round(LW * L.horizon * 0.0085);
  for (let i = 0; i < count; i++) {
    const x = int(rand, 1, LW - 2);
    const y = Math.floor(L.horizon * 0.8 * Math.pow(rand(), 1.3));
    if (Math.hypot(x - moon.x, y - moon.y) < moon.r + 12) continue;
    const depth = y / L.horizon;
    const color = STAR_COLORS[int(rand, 0, 2)];
    const peak = between(rand, 0.25, 1) * (1 - depth * 0.75);
    const big = rand() < 0.035 && depth < 0.45;
    if (rand() < 0.2 || big) {
      twinklers.push({ x, y, color, sky: at(x, y), peak: big ? 1 : Math.max(0.4, peak), big, speed: between(rand, 0.6, 2.2), phase: between(rand, 0, 6.3) });
      continue;
    }
    r.set(x, y, mix(at(x, y), color, peak));
  }
  drawMoon(r, moon, at);
  return { canvas: r.canvas(), twinklers, moon, at };
}
