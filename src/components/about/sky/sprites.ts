export type RGB = readonly [number, number, number];

export const rgba = ([r, g, b]: RGB, a = 1) => `rgba(${r},${g},${b},${a})`;

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

export function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2d canvas unavailable");
  return ctx;
}

const cache = new Map<string, HTMLCanvasElement>();

/** A round light of one colour: a bright core falling off to nothing. `soft`
 *  widens the core, for clouds rather than stars. Cached per colour. */
export function glow(rgb: RGB, size = 64, soft = false): HTMLCanvasElement {
  const id = `${rgb.join()}/${size}/${soft}`;
  const hit = cache.get(id);
  if (hit) return hit;
  const c = makeCanvas(size, size);
  const g = ctx2d(c);
  const r = size / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  const stops: [number, number][] = soft
    ? [[0, 1], [0.25, 0.78], [0.5, 0.4], [0.75, 0.12], [1, 0]]
    : [[0, 1], [0.12, 0.6], [0.3, 0.18], [0.6, 0.04], [1, 0]];
  for (const [o, a] of stops) grad.addColorStop(o, rgba(rgb, a));
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  cache.set(id, c);
  return c;
}
