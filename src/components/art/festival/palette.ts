export type RGB = readonly [number, number, number];

/** ❤️U Festival's own colours, from the app. */
export const VERMILION: RGB = [240, 50, 40];
export const CERULEAN: RGB = [36, 123, 160];
export const SAFFRON: RGB = [227, 181, 5];
export const WHITE: RGB = [255, 255, 255];

/** The same four as emitted light. A beam in haze reads brighter than the ink
 *  it is named after, so cerulean in particular is lifted. Index with V/C/S/W. */
export const LIGHTS: readonly RGB[] = [
  [255, 66, 50],
  [58, 164, 222],
  [255, 198, 38],
  [232, 242, 255],
];
export const V = 0;
export const C = 1;
export const S = 2;
export const W = 3;

export const rgba = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
export const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
