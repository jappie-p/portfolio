export type Rgb = readonly [number, number, number];

/** Packs a colour for a Uint32Array view over ImageData (little-endian RGBA). */
export const pack = ([r, g, b]: Rgb, a = 255) => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;

export const css = ([r, g, b]: Rgb, a = 1) => `rgb(${r} ${g} ${b} / ${a})`;

const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

/** Blends a toward b; t above 1 pushes past b, which is how contrast gets stretched. */
export const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  clamp(a[0] + (b[0] - a[0]) * t),
  clamp(a[1] + (b[1] - a[1]) * t),
  clamp(a[2] + (b[2] - a[2]) * t),
];

/** A light: multiply the daylight colour, then add ambient. `fog` fades the
 *  result toward `fogTo`, which is how the far layers sink into the sky. */
export type Grade = { mul: Rgb; add: Rgb; fog?: number; fogTo?: Rgb };

export function grade(c: Rgb, g: Grade): Rgb {
  const lit: Rgb = [clamp(c[0] * g.mul[0] + g.add[0]), clamp(c[1] * g.mul[1] + g.add[1]), clamp(c[2] * g.mul[2] + g.add[2])];
  return g.fog && g.fogTo ? mix(lit, g.fogTo, g.fog) : lit;
}

/** 4x4 ordered-dither thresholds in [0, 1): the SNES way to blend two colours. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bayer = (x: number, y: number) => BAYER[((y & 3) << 2) | (x & 3)] / 16;
