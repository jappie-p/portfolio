import { grade, mix, type Grade, type Rgb } from "./color";
import { ACTOR, ACTOR_LAMP, MOONLIGHT } from "./palette";
import { context, makeCanvas } from "./raster";

/** public/art/zelda/link.png: the school game's own Link frames (sprites/link),
 *  teal background keyed out, one 18x26 cell per frame, feet on the cell floor.
 *  Row 0 walks right (frames 66-73), row 1 walks down (0-7), row 2 walks up
 *  (126-133): the full eight-step ALttP cycles from the sheet the game loads. */
export const CELL_W = 18;
export const CELL_H = 26;
export const FRAMES = 8;
export const ROW = { right: 0, down: 1, up: 2, left: 3 } as const;
export type Facing = keyof typeof ROW;

export type LinkSheet = { night: HTMLCanvasElement; lamp: HTMLCanvasElement };

/** Grades every frame for its light; with `rim`, the pixels just inside the
 *  outline on the side facing the moon (up and to the left) catch a thin cool
 *  highlight, so he reads against the night. */
function graded(src: HTMLCanvasElement, g: Grade, rim = 0): HTMLCanvasElement {
  const out = makeCanvas(src.width, src.height);
  const ctx = context(out);
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, out.width, out.height);
  const d = img.data;
  const W = out.width;
  const dark = (i: number) => d[i] + d[i + 1] + d[i + 2] < 150;
  // outline or empty; each cell's last row and column count as empty, so frames never touch
  const hard = (x: number, y: number) => x % CELL_W === CELL_W - 1 || y % CELL_H === CELL_H - 1 || !d[(y * W + x) * 4 + 3] || dark((y * W + x) * 4);
  const edge = new Uint8Array(W * out.height);
  for (let y = 0; y < out.height; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (!d[i + 3] || dark(i)) continue;
      if (x % CELL_W === 0 || y % CELL_H === 0 || hard(x - 1, y) || hard(x, y - 1)) edge[y * W + x] = 1;
    }
  }
  for (let p = 0, i = 0; i < d.length; i += 4, p++) {
    if (!d[i + 3]) continue;
    let c: Rgb = grade([d[i], d[i + 1], d[i + 2]], g);
    if (rim && edge[p]) c = mix(c, MOONLIGHT, rim);
    d[i] = c[0];
    d[i + 1] = c[1];
    d[i + 2] = c[2];
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

/** Loads the atlas and bakes a moonlit and a lamplit copy, each with a fourth
 *  row that mirrors the right walk for walking left (the game flips it too). */
export async function loadLink(src: string): Promise<LinkSheet> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const sheet = makeCanvas(CELL_W * FRAMES, CELL_H * 4);
  const ctx = context(sheet);
  ctx.drawImage(img, 0, 0);
  for (let i = 0; i < FRAMES; i++) {
    ctx.setTransform(-1, 0, 0, 1, (2 * i + 1) * CELL_W, 0);
    ctx.drawImage(img, i * CELL_W, 0, CELL_W, CELL_H, i * CELL_W, ROW.left * CELL_H, CELL_W, CELL_H);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return { night: graded(sheet, ACTOR, 0.3), lamp: graded(sheet, ACTOR_LAMP) };
}
