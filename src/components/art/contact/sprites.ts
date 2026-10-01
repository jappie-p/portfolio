import { rng } from "./rng";
import { rgba, type RGB } from "./palette";

export function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export function ctx2d(c: HTMLCanvasElement, read = false): CanvasRenderingContext2D {
  const ctx = c.getContext("2d", read ? { willReadFrequently: true } : undefined);
  if (!ctx) throw new Error("2d canvas unavailable");
  return ctx;
}

/** A canvas sized in CSS pixels and drawn in them, backed at `dpr`. */
export function layer(w: number, h: number, dpr: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = canvas(w * dpr, h * dpr);
  const ctx = ctx2d(c);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return [c, ctx];
}

/** A soft round glow with a gaussian falloff, drawn once and stamped often. */
export function glowSprite(c: RGB, size = 64, falloff = 5): HTMLCanvasElement {
  const cv = canvas(size, size);
  const ctx = ctx2d(cv);
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    g.addColorStop(t, rgba(c, Math.exp(-t * t * falloff) * (1 - t * t)));
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return cv;
}

/** A lit pane: brighter low in the room where the lamp is, a darker rim, and
 *  optionally the glazing bars of an old sash window. */
export function paneSprite(c: RGB, bars: boolean): HTMLCanvasElement {
  const W = 20;
  const H = 32;
  const cv = canvas(W, H);
  const ctx = ctx2d(cv);
  const g = ctx.createRadialGradient(W * 0.5, H * 0.72, 1, W * 0.5, H * 0.6, H * 0.75);
  g.addColorStop(0, rgba([Math.min(255, c[0] + 30), Math.min(255, c[1] + 30), Math.min(255, c[2] + 30)], 1));
  g.addColorStop(0.55, rgba(c, 0.92));
  g.addColorStop(1, rgba([c[0] * 0.62, c[1] * 0.5, c[2] * 0.42], 0.85));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  if (bars) {
    ctx.fillStyle = "rgba(20,12,6,0.55)";
    ctx.fillRect(W / 2 - 1, 0, 2, H);
    ctx.fillRect(0, H * 0.46, W, 2);
  }
  ctx.strokeStyle = "rgba(10,8,6,0.5)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);
  return cv;
}

/** A lit wharf cellar seen through its arched door: warm, brightest low. */
export function archSprite(c: RGB): HTMLCanvasElement {
  const W = 20;
  const H = 30;
  const cv = canvas(W, H);
  const ctx = ctx2d(cv);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, rgba(c, 0.55));
  g.addColorStop(0.6, rgba(c, 0.95));
  g.addColorStop(1, rgba([255, 236, 200], 1));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "destination-in";
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, W / 2);
  ctx.arc(W / 2, W / 2, W / 2, Math.PI, 0);
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fillStyle = "#fff";
  ctx.fill();
  return cv;
}

/** A column of light broken by ripples, as a lamp or a window throws it on a
 *  canal: dashes that thin and fade with depth. White, tinted by the caller. */
export function streakSprite(seed: number): HTMLCanvasElement {
  const W = 24;
  const H = 128;
  const r = rng(seed);
  const cv = canvas(W, H);
  const ctx = ctx2d(cv);
  let y = 0;
  while (y < H) {
    const t = y / H;
    const dh = 1.2 + r() * 2.6 * (0.4 + t);
    const half = (W / 2) * (0.25 + r() * 0.75) * (1 - t * 0.55);
    const dx = (r() - 0.5) * 7 * (0.3 + t);
    const a = (1 - t) ** 1.4 * (0.45 + r() * 0.55);
    const g = ctx.createLinearGradient(W / 2 + dx - half, 0, W / 2 + dx + half, 0);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, `rgba(255,255,255,${a.toFixed(3)})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(W / 2 + dx - half, y, half * 2, dh);
    y += dh + 0.6 + r() * 2.4 * (0.5 + t);
  }
  return cv;
}

/** Tints a white sprite: the same alpha, one colour. */
export function tint(src: HTMLCanvasElement, c: RGB): HTMLCanvasElement {
  const cv = canvas(src.width, src.height);
  const ctx = ctx2d(cv);
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = rgba(c);
  ctx.fillRect(0, 0, cv.width, cv.height);
  return cv;
}
