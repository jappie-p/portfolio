import { rng } from "./layout";

export type RGB = readonly [number, number, number];

// the room's lamps, warm, with the brand's orange and lime as accents
export const AMBER: RGB = [255, 168, 78];
export const GOLD: RGB = [255, 198, 104];
export const WARM: RGB = [255, 218, 168];
export const ORANGE: RGB = [249, 115, 22];
export const LIME: RGB = [140, 198, 63];

export const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

export function canvas(w: number, h = w): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2d canvas unavailable");
  return ctx;
}

/** An out-of-focus light as a lens renders it: a flat, luminous disc with a
 *  slightly brighter rim and faint onion rings inside. */
export function discSprite(c: RGB, size = 160): HTMLCanvasElement {
  const cv = canvas(size);
  const ctx = ctx2d(cv);
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, rgba(c, 0.5));
  g.addColorStop(0.6, rgba(c, 0.54));
  g.addColorStop(0.86, rgba(c, 0.68));
  g.addColorStop(0.93, rgba(c, 0.6));
  g.addColorStop(0.975, rgba(c, 0.22));
  g.addColorStop(1, rgba(c, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = size * 0.012;
  ctx.strokeStyle = rgba(c, 0.035);
  for (const k of [0.38, 0.6]) {
    ctx.beginPath();
    ctx.arc(r, r, r * k, 0, Math.PI * 2);
    ctx.stroke();
  }
  return cv;
}

/** A light so far out of focus it is only a glow; also the bloom round a disc. */
export function softSprite(c: RGB, size = 128): HTMLCanvasElement {
  const cv = canvas(size);
  const ctx = ctx2d(cv);
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    g.addColorStop(t, rgba(c, Math.exp(-t * t * 4.5) * (1 - t * t)));
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return cv;
}

/** White-noise grain, stamped at a whisper of alpha to dither dark gradients. */
export function grainPattern(ctx: CanvasRenderingContext2D, size = 128): CanvasPattern | null {
  const r = rng(3);
  const cv = canvas(size);
  const g = ctx2d(cv);
  const img = g.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = r() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return ctx.createPattern(cv, "repeat");
}
