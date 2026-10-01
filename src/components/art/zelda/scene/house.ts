import { grade, mix, type Grade, type Rgb } from "./color";
import { FIRE, GAME } from "./palette";
import type { Raster } from "./raster";
import { int, seeded } from "./rng";

type Rect = readonly [number, number, number, number];
export type HouseParts = { panes: Rect[]; door: Rect; smoke: readonly [number, number] };

/** Where the animated bits of the house sit, for a house with its top-left at (hx, hy). */
export function houseParts(hx: number, hy: number): HouseParts {
  const wx = hx + 16;
  const wy = hy + 16;
  return {
    panes: [
      [wx + 3, wy + 3, 4, 3],
      [wx + 9, wy + 3, 4, 3],
      [wx + 3, wy + 7, 4, 3],
      [wx + 9, wy + 7, 4, 3],
    ],
    door: [hx + 21, hy + 33, 6, 10],
    smoke: [hx + 27.5, hy - 1],
  };
}

/** Lit window panes; `glow` in [0, 1] is the fire behind them. */
export function drawPanes(ctx: CanvasRenderingContext2D, parts: HouseParts, ox: number, glow: number) {
  const c = mix(FIRE.paneDim, FIRE.pane, glow);
  ctx.fillStyle = `rgb(${c[0]} ${c[1]} ${c[2]})`;
  for (const [x, y, w, h] of parts.panes) ctx.fillRect(x + ox, y, w, h);
  ctx.fillStyle = `rgb(${FIRE.paneHi[0]} ${FIRE.paneHi[1]} ${FIRE.paneHi[2]})`;
  for (const [x, y] of parts.panes.slice(0, 2)) ctx.fillRect(x + ox, y, 1, 1);
}

/** The open door: the room inside, lit by the hearth from below. */
export function drawOpenDoor(ctx: CanvasRenderingContext2D, parts: HouseParts, ox: number, glow: number) {
  const [x, y, w, h] = parts.door;
  for (let j = 0; j < h; j++) {
    const c = mix(FIRE.inside, FIRE.insideHi, Math.min(1, (j / h) * 1.2) * (0.75 + 0.25 * glow));
    ctx.fillStyle = `rgb(${c[0]} ${c[1]} ${c[2]})`;
    ctx.fillRect(x + ox, y + j, w, 1);
  }
}

/** Link's House from the school game, drawn tile by tile like its
 *  overworld_tiles.py does (roof L/M/R, walls L/M/R, base L/M/R), only at
 *  night: the grass behind the roof is left out so the forest shows through. */
export function drawHouse(r: Raster, hx: number, hy: number, g: Grade, seed = 5) {
  const k = (c: Rgb) => grade(c, g);
  const C = {
    roof: k(GAME.roof),
    roofDark: k(GAME.roofDark),
    roofHi: k(GAME.roofHi),
    roofLine: k(GAME.roofLine),
    roofSeam: k(GAME.roofSeam),
    wall: k(GAME.wall),
    wallDark: k(GAME.wallDark),
    mortar: k(GAME.wallMortar),
    wallLight: k(GAME.wallLight),
    frame: k(GAME.windowFrame),
    door: k(GAME.door),
    doorDark: k(GAME.doorDark),
    doorFrame: k(GAME.doorFrame),
    handle: k(GAME.handle),
    threshold: k(GAME.threshold),
    found: k(GAME.foundation),
    foundDark: k(GAME.foundationDark),
    chimney: k(GAME.chimney),
    chimneyDark: k(GAME.chimneyDark),
    chimneyCap: k(GAME.chimneyCap),
  };
  const rand = seeded(seed);
  const speckle = (x0: number, y0: number, n: number, c: Rgb, maxY = 15) => {
    for (let i = 0; i < n; i++) r.set(x0 + int(rand, 1, 14), y0 + int(rand, 1, maxY), c);
  };
  const shingle = (row: number) => ((Math.floor(row / 3) & 1 ? C.roofDark : C.roof));
  const seam = (row: number) => row === 3 || row === 6 || row === 9 || row === 12;

  // roof, left: the slope grows from the top right corner to full width
  for (let row = 0; row < 16; row++) {
    const edge = Math.max(0, 15 - row);
    for (let col = edge; col < 16; col++) r.set(hx + col, hy + row, col === edge ? C.roofLine : col === edge + 1 ? C.roofDark : shingle(row));
    if (seam(row)) for (let col = edge; col < 16; col++) r.set(hx + col, hy + row, C.roofDark);
    r.set(hx + 15, hy + row, C.roofSeam);
    if (row >= 1 && row <= 8) r.set(hx + 16 - row, hy + row, C.roofHi);
  }
  // roof, middle, with the chimney
  const mx = hx + 16;
  r.rect(mx, hy, 16, 16, C.roof);
  for (const row of [3, 6, 9, 12]) r.rect(mx, hy + row, 16, 1, C.roofDark);
  for (const row of [4, 7, 10, 13]) r.rect(mx, hy + row, 16, 1, C.roofHi);
  r.rect(mx + 10, hy, 4, 7, C.chimney);
  r.rect(mx + 10, hy, 4, 1, C.chimneyDark);
  r.rect(mx + 9, hy, 6, 1, C.chimneyCap);
  r.rect(mx + 10, hy + 3, 4, 1, C.chimneyDark);
  // roof, right: the mirror of the left slope
  const rx = hx + 32;
  for (let row = 0; row < 16; row++) {
    const edge = Math.min(15, row);
    for (let col = 0; col <= edge; col++) r.set(rx + col, hy + row, col === edge ? C.roofLine : col === edge - 1 ? C.roofDark : shingle(row));
    if (seam(row)) for (let col = 0; col <= edge; col++) r.set(rx + col, hy + row, C.roofDark);
    r.set(rx, hy + row, C.roofSeam);
  }

  // walls: plaster with staggered mortar, the window in the middle tile
  const wy = hy + 16;
  for (const [x0, verticals, edgeCol] of [
    [hx, [[0, [8]], [4, [4, 12]], [8, [8]], [12, [4]]], 0],
    [hx + 32, [[0, [8]], [4, [4, 12]], [8, [8]], [12, [12]]], 15],
  ] as const) {
    r.rect(x0, wy, 16, 16, C.wall);
    for (const my of [4, 8, 12]) r.rect(x0, wy + my, 16, 1, C.mortar);
    for (const [start, cols] of verticals) for (const col of cols) r.rect(x0 + col, wy + start, 1, 4, C.mortar);
    r.rect(x0 + edgeCol, wy, 1, 16, C.wallDark);
    r.rect(x0, wy, 16, 1, C.wallDark);
    speckle(x0, wy, 8, C.wallDark);
  }
  r.rect(mx, wy, 16, 16, C.wall);
  r.rect(mx, wy, 16, 1, C.wallDark);
  r.rect(mx, wy + 13, 16, 1, C.mortar);
  r.rect(mx + 2, wy + 2, 12, 9, C.frame);
  r.rect(mx + 1, wy + 11, 14, 2, C.wallDark);
  speckle(mx, wy, 5, C.wallLight);
  // panes are painted per frame (the fire flickers); the frame's cross stays
  r.rect(mx + 8, wy + 3, 1, 7, C.frame);
  r.rect(mx + 3, wy + 6, 11, 1, C.frame);

  // base: lower wall and stone foundation, the door in the middle
  const by = hy + 32;
  for (const [x0, edgeCol] of [
    [hx, 0],
    [hx + 32, 15],
  ] as const) {
    r.rect(x0, by, 16, 16, C.wall);
    for (const my of [4, 8]) r.rect(x0, by + my, 16, 1, C.mortar);
    r.rect(x0 + edgeCol, by, 1, 12, C.wallDark);
    speckle(x0, by, 6, C.wallDark, 11);
  }
  r.rect(mx, by, 16, 16, C.wall);
  r.rect(mx + 4, by, 8, 12, C.doorFrame);
  r.rect(mx + 5, by + 1, 6, 10, C.door);
  r.rect(mx + 7, by + 1, 1, 10, C.doorDark);
  r.rect(mx + 9, by + 1, 1, 10, C.doorDark);
  r.rect(mx + 5, by + 5, 6, 1, C.doorDark);
  r.rect(mx + 4, by, 1, 12, C.doorDark);
  r.rect(mx + 11, by, 1, 12, C.doorDark);
  r.rect(mx + 4, by, 8, 1, C.doorDark);
  r.rect(mx + 10, by + 6, 1, 2, C.handle);
  r.rect(mx + 5, by + 11, 6, 1, C.threshold);
  for (const x0 of [hx, mx, hx + 32]) {
    r.rect(x0, by + 12, 16, 4, C.found);
    r.rect(x0, by + 12, 16, 1, C.foundDark);
    r.rect(x0 + 8, by + 12, 1, 4, C.foundDark);
  }
}
