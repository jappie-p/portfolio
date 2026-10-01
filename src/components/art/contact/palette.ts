export type RGB = readonly [number, number, number];

export const rgba = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
export const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const shade = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];

/** The site's tokens: page canvas, the leaf accent and its lighter tints. */
export const CANVAS: RGB = [5, 8, 13];
export const LEAF: RGB = [74, 222, 128];
export const MINT: RGB = [134, 239, 172];
export const BEAM: RGB = [214, 255, 230];

/** The night sky from the top of the screen to the horizon, as stops over the
 *  height. The host paints it with CSS; the canal mirrors it on canvas. */
export const SKY: readonly (readonly [number, RGB])[] = [
  [0, [5, 8, 13]],
  [0.42, [6, 10, 17]],
  [0.64, [9, 15, 27]],
  [0.78, [12, 21, 35]],
  [1, [10, 17, 29]],
];
export const skyCss = () => `linear-gradient(180deg, ${SKY.map(([o, c]) => `${rgba(c)} ${(o * 100).toFixed(0)}%`).join(", ")})`;

/** Silhouettes, far to near: the haze lifts the far ones toward the glow, the
 *  near ones sink toward the canvas. Deep blue-black, never flat grey. */
export const FAR: RGB = [22, 38, 56];
export const OLD: RGB = [15, 26, 42];
export const DOM: RGB = [14, 23, 39];
export const HOUSE: RGB = [9, 15, 26];
export const ROOF: RGB = [7, 12, 21];
export const TREE: RGB = [4, 8, 13];
export const QUAY: RGB = [8, 13, 22];
export const STONE: RGB = [22, 33, 50];
/** The night air between the layers, lit by the city's green glow. */
export const HAZE: RGB = [46, 96, 92];

/** Light: warm rooms in three temperatures, the blue of a television, the
 *  street lamps, and the cold white of the stars and far offices. */
export const WARM: readonly RGB[] = [
  [255, 198, 122],
  [255, 174, 92],
  [255, 221, 160],
];
export const TV: RGB = [128, 172, 255];
export const LAMP: RGB = [255, 204, 138];
export const STAR: RGB = [222, 233, 255];
export const OFFICE: RGB = [196, 214, 236];
export const RED: RGB = [255, 72, 64];
