import { mulberry32 } from "./rng";

export const PAGE_BG = "#05080d";

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

export function context(c: HTMLCanvasElement, opts?: CanvasRenderingContext2DSettings): CanvasRenderingContext2D {
  const ctx = c.getContext("2d", opts);
  if (!ctx) throw new Error("2d canvas unavailable");
  return ctx;
}

/** Give an on-screen canvas a backing store of w x h CSS px at `dpr`. */
export function sizeCanvas(c: HTMLCanvasElement, w: number, h: number, dpr: number) {
  const bw = Math.max(1, Math.round(w * dpr));
  const bh = Math.max(1, Math.round(h * dpr));
  if (c.width !== bw) c.width = bw;
  if (c.height !== bh) c.height = bh;
}

let grainTile: HTMLCanvasElement | null = null;

/** A 128 px tile of fine mid-grey noise, laid over gradients with "overlay"
 *  so dark ramps never band. */
function grain(): HTMLCanvasElement {
  if (grainTile) return grainTile;
  const size = 128;
  const c = makeCanvas(size, size);
  const ctx = context(c);
  const img = ctx.createImageData(size, size);
  const rnd = mulberry32(90210);
  for (let i = 0; i < size * size; i++) {
    const v = 128 + (rnd() + rnd() - 1) * 90;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

export function paintGrain(ctx: CanvasRenderingContext2D, w: number, h: number, alpha: number) {
  const pattern = ctx.createPattern(grain(), "repeat");
  if (!pattern) return;
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = alpha;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Soft radial light: `stops` are [offset, rgba] pairs out to radius r. */
export function radial(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, stops: [number, string][], sy = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, sy);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();
}

/** How tall the site header sits over a panel: the logo and the menu pill on
 *  phones, the nav pill on wide screens. Art fades out under it. */
export const headerBand = (w: number) => (w < 640 ? 110 : 60);

/** Darken toward the page colour at all four edges, so neighbouring panels and
 *  rows meet in the same dark instead of a hard seam; the top band reaches at
 *  least `top` px, under the header. */
export function edgeFade(ctx: CanvasRenderingContext2D, w: number, h: number, amount = 0.09, top = 0) {
  const side = w * amount * 0.7;
  const bands: [number, number, number, number][] = [
    [0, 0, 0, Math.max(h * amount, top)],
    [0, h, 0, h * (1 - amount)],
    [0, 0, side, 0],
    [w, 0, w - side, 0],
  ];
  bands.forEach(([x0, y0, x1, y1], i) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, "rgba(5,8,13,0.92)");
    // under the header: near-black until past the logo and menu
    if (i === 0 && top > h * amount) g.addColorStop(0.5, "rgba(5,8,13,0.86)");
    g.addColorStop(1, "rgba(5,8,13,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

/** Erase a moving layer's top `band` px, so nothing animated runs up behind
 *  the header: gone under the logo and menu, back in by the band's end. Call
 *  last, in the layer's own units. */
export function fadeTop(ctx: CanvasRenderingContext2D, w: number, band: number) {
  const g = ctx.createLinearGradient(0, 0, 0, band);
  g.addColorStop(0, "rgba(0,0,0,1)");
  g.addColorStop(0.5, "rgba(0,0,0,0.92)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.globalAlpha = 1;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, band);
  ctx.restore();
}

const glowCache = new Map<string, HTMLCanvasElement>();

/** A cached round glow sprite (bright core, soft falloff) of one colour. */
export function glowSprite(rgb: string, size = 64): HTMLCanvasElement {
  const key = `${rgb}/${size}`;
  const hit = glowCache.get(key);
  if (hit) return hit;
  const c = makeCanvas(size, size);
  const ctx = context(c);
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, `rgba(${rgb},1)`);
  g.addColorStop(0.18, `rgba(${rgb},0.55)`);
  g.addColorStop(0.45, `rgba(${rgb},0.16)`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  glowCache.set(key, c);
  return c;
}
