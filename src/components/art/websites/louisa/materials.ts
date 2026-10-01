export type RGB = readonly [number, number, number];

export interface Material {
  /** colour along a crystal: root, shoulder, tip */
  ramp: readonly [RGB, RGB, RGB];
  /** front-face opacity */
  alpha: number;
  /** light seen through the far side (translucent stones), or null if opaque */
  inner: RGB | null;
  spec: number;
  shine: number;
  /** labradorescence: a blue-green flash that swings with the angle */
  sheen?: boolean;
}

/** Amethyst grows milky at the root and deepens toward the tips. */
export const AMETHYST: Material = {
  ramp: [[214, 204, 255], [150, 108, 246], [82, 32, 196]],
  alpha: 0.84,
  inner: [184, 150, 255],
  spec: 1,
  shine: 64,
};

export const DEEP_AMETHYST: Material = {
  ramp: [[186, 164, 250], [118, 72, 226], [62, 24, 148]],
  alpha: 0.88,
  inner: [150, 110, 240],
  spec: 1,
  shine: 72,
};

export const ROSE: Material = {
  ramp: [[248, 208, 230], [238, 134, 192], [214, 64, 146]],
  alpha: 0.84,
  inner: [255, 170, 214],
  spec: 0.75,
  shine: 30,
};

export const LABRADORITE: Material = {
  ramp: [[44, 54, 72], [36, 45, 62], [58, 70, 92]],
  alpha: 1,
  inner: null,
  spec: 0.55,
  shine: 22,
  sheen: true,
};

export const MATERIALS = [AMETHYST, DEEP_AMETHYST, ROSE, LABRADORITE] as const;
export const MAT = { amethyst: 0, deep: 1, rose: 2, labradorite: 3 } as const;
