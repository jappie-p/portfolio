import type { Grade, Rgb } from "./color";

/** The school game's own daylight colours (overworld_tiles.py and main.py),
 *  so the backdrop is his world, only later in the evening. */
export const GAME = {
  grass: [72, 184, 72],
  grassDot: [56, 152, 56],
  grassHi: [88, 200, 88],
  grassDeep: [48, 136, 48],
  path: [200, 168, 112],
  pathDark: [184, 152, 96],
  pathMid: [192, 160, 104],
  pathLight: [216, 184, 128],
  pathPebble: [176, 144, 88],
  tree: [48, 160, 48],
  treeHi: [88, 200, 88],
  treeShadow: [32, 136, 32],
  treeSpec: [104, 216, 104],
  treeDeep: [24, 136, 24],
  trunk: [128, 96, 48],
  trunkLight: [144, 112, 64],
  trunkDark: [104, 72, 32],
  bushLight: [72, 184, 72],
  bushDeep: [24, 120, 24],
  bushSpec: [96, 208, 96],
  bladeHi: [96, 216, 96],
  bladeMid: [56, 176, 56],
  roof: [216, 120, 120],
  roofDark: [184, 96, 96],
  roofHi: [224, 136, 136],
  roofEdge: [160, 80, 80],
  roofLine: [120, 64, 64],
  roofSeam: [104, 56, 56],
  wall: [232, 208, 160],
  wallDark: [208, 184, 136],
  wallMortar: [200, 176, 128],
  wallLight: [240, 216, 168],
  windowFrame: [176, 152, 104],
  door: [160, 112, 48],
  doorDark: [128, 80, 32],
  doorFrame: [144, 104, 40],
  handle: [232, 200, 64],
  threshold: [160, 136, 88],
  foundation: [160, 150, 130],
  foundationDark: [130, 120, 100],
  chimney: [110, 88, 72],
  chimneyDark: [88, 68, 52],
  chimneyCap: [80, 60, 48],
  sign: [216, 184, 104],
  signHi: [224, 192, 112],
  signDark: [184, 152, 72],
  signPost: [160, 128, 64],
  signPostDark: [136, 104, 48],
  nail: [160, 160, 168],
  stem: [40, 144, 40],
  flowerCenter: [240, 232, 64],
  slime: [32, 136, 32],
  slimeDark: [16, 72, 16],
  white: [255, 255, 255],
  black: [0, 0, 0],
} as const satisfies Record<string, Rgb>;

export const FLOWERS: readonly Rgb[] = [
  [240, 128, 128],
  [240, 240, 96],
  [240, 160, 240],
  [128, 200, 240],
  [240, 180, 128],
];

/** Blue hour, top of the sky to the horizon. The top band sits next to the
 *  page's #05080d; the warm end is mostly hidden behind the hills. */
export const SKY: readonly Rgb[] = [
  [6, 9, 19],
  [8, 13, 28],
  [11, 18, 40],
  [15, 25, 54],
  [21, 33, 70],
  [29, 42, 86],
  [40, 51, 101],
  [55, 60, 113],
  [74, 68, 121],
  [97, 76, 124],
  [124, 86, 122],
  [152, 98, 116],
  [184, 116, 106],
];

/** Moonlit night over the near ground. */
export const NIGHT: Grade = { mul: [0.36, 0.46, 0.66], add: [4, 9, 26] };
/** Link's House in the moonlight: the cream plaster goes to a soft slate. */
export const HOUSE: Grade = { mul: [0.34, 0.4, 0.58], add: [8, 8, 24] };
/** The dirt path keeps a little of its warmth and stays the brightest ground. */
export const PATH_NIGHT: Grade = { mul: [0.47, 0.49, 0.64], add: [10, 10, 22] };
/** Moonlight on the tops of things (blade tips, canopy rims). */
export const MOONLIGHT: Rgb = [150, 172, 230];
/** The foreground strip, closer to the viewer and a touch deeper in shadow. */
export const NIGHT_NEAR: Grade = { mul: [0.28, 0.37, 0.56], add: [3, 7, 22] };
/** Lamplight spilling from the house: warm and brighter than the night. */
export const LAMP: Grade = { mul: [0.86, 0.64, 0.4], add: [26, 12, 2] };
/** Characters stay readable: the same night, with a lighter hand. */
export const ACTOR: Grade = { mul: [0.66, 0.72, 0.9], add: [10, 12, 30] };
/** Characters inside the lamplight. */
export const ACTOR_LAMP: Grade = { mul: [0.92, 0.8, 0.66], add: [14, 6, 4] };

/** Window glass and the open door at night: the fire inside. */
export const FIRE = {
  pane: [248, 196, 96] as Rgb,
  paneHi: [255, 236, 168] as Rgb,
  paneDim: [216, 148, 64] as Rgb,
  inside: [120, 60, 24] as Rgb,
  insideHi: [232, 150, 64] as Rgb,
};

/** Soft light colours for the glow pass. */
export const LIGHT = {
  fire: [255, 170, 80] as Rgb,
  moon: [150, 170, 255] as Rgb,
  firefly: [110, 240, 140] as Rgb,
  rupee: [90, 255, 150] as Rgb,
  blueRupee: [110, 170, 255] as Rgb,
};
