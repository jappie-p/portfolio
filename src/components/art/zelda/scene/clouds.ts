import { mix, type Rgb } from "./color";
import { MARGIN, type Layout } from "./layout";
import { Raster } from "./raster";
import { between, int, seeded, type Rng } from "./rng";

export type Cloud = { sprite: HTMLCanvasElement; x: number; y: number; w: number; speed: number; depth: number };

const BODY: Rgb = [104, 112, 172];
const RIM: Rgb = [206, 212, 246];
const SHADE: Rgb = [22, 26, 58];

/** A flat-bottomed pixel cloud: overlapping puffs, tallest in the middle,
 *  each puff's crown picked out with a thin moonlit contour the way ALttP
 *  outlines its clouds. The moon is up and to the left, so that side is brighter. */
function cloudSprite(rand: Rng, w: number, h: number, sky: Rgb, strength: number): HTMLCanvasElement {
  const r = new Raster(w, h);
  const n = int(rand, 4, 6);
  const puffs = Array.from({ length: n }, (_, i) => {
    const u = (i + 0.5) / n;
    const pr = h * (0.36 + 0.4 * Math.sin(Math.PI * u)) * between(rand, 0.85, 1.1);
    return { x: 2 + u * (w - 4), y: h - 2 - pr * 0.3, r: pr };
  });
  const inPuff = (p: (typeof puffs)[number], x: number, y: number) => (x - p.x) ** 2 + (y - p.y) ** 2 <= p.r * p.r;
  const inside = (x: number, y: number) => x >= 0 && x < w && y >= 0 && y < h - 1 && puffs.some((p) => inPuff(p, x, y));
  const body = mix(sky, BODY, 0.42 * strength);
  const rim = mix(sky, RIM, 0.56 * strength);
  const rimSoft = mix(sky, RIM, 0.36 * strength);
  const contour = mix(body, RIM, 0.22 * strength);
  const shade = mix(sky, SHADE, 0.3 * strength);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!inside(x, y)) continue;
      const left = x < w * 0.5;
      let c = body;
      if (!inside(x, y - 1)) c = left ? rim : rimSoft;
      else if (left && !inside(x, y - 2)) c = rimSoft;
      else if (y >= h - 3 || !inside(x, y + 1)) c = shade;
      else if (puffs.some((p) => inPuff(p, x, y) && !inPuff(p, x, y - 1) && p.y - p.r > 1)) c = contour;
      r.set(x, y, c);
    }
  }
  return r.canvas();
}

export function buildClouds(L: Layout, at: (x: number, y: number) => Rgb, seed = 11): Cloud[] {
  const rand = seeded(seed);
  const span = L.W + MARGIN * 2;
  const n = Math.max(3, Math.round(span / 70));
  const out: Cloud[] = [];
  for (let i = 0; i < n; i++) {
    const near = i % 3 !== 0;
    const w = near ? int(rand, 38, 64) : int(rand, 20, 34);
    const h = near ? int(rand, 10, 14) : int(rand, 6, 9);
    // clouds keep to the band above the panel's content, so the copy never
    // has one drifting behind it
    const y = Math.round(between(rand, 3, 30 - h * 0.5));
    const sky = at(0, y + h);
    out.push({
      sprite: cloudSprite(rand, w, h, sky, near ? 1 : 0.7),
      x: ((i + rand() * 0.6) / n) * span - MARGIN,
      y,
      w,
      speed: near ? between(rand, 2.2, 3.4) : between(rand, 1, 1.6),
      depth: near ? 0.3 : 0.18,
    });
  }
  return out;
}

export function driftClouds(clouds: Cloud[], W: number, dt: number) {
  for (const c of clouds) {
    c.x += c.speed * dt;
    if (c.x > W + MARGIN) c.x = -MARGIN - c.w;
  }
}
