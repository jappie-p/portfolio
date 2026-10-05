import * as THREE from "three";
import { family } from "./textures";

/** Each name gets a row of this many pixels; the capitals stand between
 *  CAP_TOP and the baseline. */
export const ROW = 192;
export const CAP_TOP = 30;
export const BASELINE = 156;
/** Room left round the ink, so its soft edge is never cut off. */
export const PAD = 10;
/** Tracking, as a share of the font size: vinyl capitals set a little open. */
const TRACK = 0.045;

/** Where one name's ink sits in its row, in pixels. */
export type Ink = { row: number; x0: number; x1: number };

export type Lettering = {
  texture: THREE.DataTexture;
  inks: Ink[];
  width: number;
  height: number;
  /** set them again: the display font arrived after the first time */
  redraw: () => void;
};

const fontAt = (px: number) => `600 ${px.toFixed(1)}px ${family("--font-display-var", "system-ui, sans-serif")}`;

/** Set the names in capitals of one cap height, a row each, white on black. */
function set(canvas: HTMLCanvasElement, titles: readonly string[]): { inks: Ink[]; data: Uint8Array } {
  const g = canvas.getContext("2d", { willReadFrequently: true })!;
  // size the font so its capitals stand exactly CAP pixels tall
  g.font = fontAt(200);
  const cap = g.measureText("H").actualBoundingBoxAscent || 140;
  const size = (200 * (BASELINE - CAP_TOP)) / cap;
  g.font = fontAt(size);
  const advances = titles.map((t) => [...t].map((c) => g.measureText(c).width));
  const widths = advances.map((a) => a.reduce((s, w) => s + w, 0) + (a.length - 1) * size * TRACK);
  const W = Math.ceil((Math.max(...widths) + 2 * PAD + 8) / 64) * 64;
  const H = ROW * titles.length;
  canvas.width = W;
  canvas.height = H;
  g.font = fontAt(size);
  g.fillStyle = "#000";
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#fff";
  g.textBaseline = "alphabetic";
  const inks = titles.map((t, row) => {
    let x = PAD + 4;
    const lead = g.measureText(t[0]).actualBoundingBoxLeft;
    const x0 = x - lead;
    [...t].forEach((c, i) => {
      g.fillText(c, x, row * ROW + BASELINE);
      x += advances[row][i] + size * TRACK;
    });
    const last = g.measureText(t[t.length - 1]);
    const x1 = x - size * TRACK - advances[row][t.length - 1] + last.actualBoundingBoxRight;
    return { row, x0, x1 };
  });
  // one channel, rows bottom up as the texture reads them
  const rgba = g.getImageData(0, 0, W, H).data;
  const data = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    const from = (H - 1 - y) * W * 4;
    for (let x = 0; x < W; x++) data[y * W + x] = rgba[from + x * 4];
  }
  return { inks, data };
}

/** The names of the show's sections as one small mask: mipmapped, so the
 *  letters stay smooth from the walk and down the wall from the entrance. */
export function letterTitles(titles: readonly string[], anisotropy: number): Lettering {
  const canvas = document.createElement("canvas");
  const first = set(canvas, titles);
  const texture = new THREE.DataTexture(first.data, canvas.width, canvas.height, THREE.RedFormat, THREE.UnsignedByteType);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  const out: Lettering = {
    texture,
    inks: first.inks,
    width: canvas.width,
    height: canvas.height,
    redraw: () => {
      const next = set(canvas, titles);
      if (canvas.width !== out.width || canvas.height !== out.height) {
        texture.dispose();
        texture.image = { data: next.data, width: canvas.width, height: canvas.height };
      } else texture.image.data = next.data;
      out.inks = next.inks;
      out.width = canvas.width;
      out.height = canvas.height;
      texture.needsUpdate = true;
    },
  };
  return out;
}

/** Once the display font has loaded: whether it already had when the names were set. */
export function fontReady(): { ready: boolean; loaded: Promise<unknown> } {
  const font = fontAt(100);
  try {
    if (document.fonts.check(font)) return { ready: true, loaded: Promise.resolve() };
    return { ready: false, loaded: document.fonts.load(font) };
  } catch {
    return { ready: true, loaded: Promise.resolve() };
  }
}
