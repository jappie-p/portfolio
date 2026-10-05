import type { Pixels } from "./voxels";

/** A heart container, outlined the way the game's HUD draws them. */
export const HEART: Pixels = {
  rows: [
    ".KK...KK.",
    "KRRK.KRRK",
    "KRWRKRRrK",
    "KRRRRRRrK",
    ".KRRRRrK.",
    "..KRRrK..",
    "...KrK...",
    "....K....",
  ],
  palette: { K: "#4a0b16", R: "#e5303f", r: "#a8172b", W: "#ffd3d9" },
};

const RUPEE = [
  "...K...",
  "..KLK..",
  ".KLLGK.",
  ".KLGGK.",
  "KLLGGDK",
  "KLGGGDK",
  "KLGGGDK",
  ".KLGDK.",
  ".KGGDK.",
  "..KDK..",
  "...K...",
];

/** The two rupees lying on the path in the print. */
export const GREEN_RUPEE: Pixels = { rows: RUPEE, palette: { K: "#0b3a1b", L: "#a6f5b0", G: "#2fc95a", D: "#15803a" } };
export const BLUE_RUPEE: Pixels = { rows: RUPEE, palette: { K: "#0c2463", L: "#cfe8ff", G: "#3e8dff", D: "#1d51c2" } };

/** The sword from the HUD's item box: steel blade, gold guard, blue grip. */
export const SWORD: Pixels = {
  rows: [
    "...W...",
    "..WSE..",
    "..WSE..",
    "..WSE..",
    "..WSE..",
    "..WSE..",
    "..WSE..",
    "..WSE..",
    "..WSE..",
    "..WSE..",
    "Y.WSE.Y",
    "YYYBYYy",
    ".y.b.y.",
    "...b...",
    "...b...",
    "..YYy..",
    "...y...",
  ],
  palette: { W: "#f2f6ff", S: "#aebbd3", E: "#5d6a86", Y: "#f0c02f", y: "#a77a12", B: "#3554d6", b: "#24308a" },
};
