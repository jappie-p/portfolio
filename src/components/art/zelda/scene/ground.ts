import { bayer, grade, mix, type Grade, type Rgb } from "./color";
import { drawHouse, houseParts, type HouseParts } from "./house";
import { MARGIN, type Layout } from "./layout";
import { FLOWERS, GAME, HOUSE, LAMP, NIGHT, NIGHT_NEAR, PATH_NIGHT } from "./palette";
import { Raster } from "./raster";
import { int, seeded, type Rng } from "./rng";

export type Tuft = { x: number; y: number; phase: number; near: boolean };
/** Where the house's lamplight pools on the path (layer coordinates). */
export type Pool = { x: number; y: number; rx: number; ry: number };
export type Ground = { canvas: HTMLCanvasElement; tufts: Tuft[]; house: HouseParts; pool: Pool };

/** The game's 8x8 grass texture: 0 base, 1 dark dot, 2 highlight, 3 deep shadow. */
const GRASS_PAT = [
  [0, 0, 1, 0, 0, 2, 1, 0],
  [0, 1, 0, 0, 1, 0, 0, 0],
  [1, 0, 0, 1, 0, 0, 0, 1],
  [0, 0, 1, 0, 0, 1, 0, 0],
  [0, 1, 0, 0, 2, 0, 1, 0],
  [1, 0, 0, 0, 1, 0, 0, 1],
  [0, 0, 1, 0, 0, 1, 0, 0],
  [0, 1, 0, 2, 1, 0, 0, 0],
];
const GRASS: readonly Rgb[] = [GAME.grass, GAME.grassDot, GAME.grassHi, GAME.grassDeep];

/** Paints in daylight colours; each pixel is graded for the night, or for the
 *  lamplight where the house's warm pool reaches (with a dithered edge). */
class Painter {
  constructor(
    readonly r: Raster,
    readonly pool: Pool,
  ) {}

  lit(x: number, y: number) {
    const dx = (x - this.pool.x) / this.pool.rx;
    const dy = (y - this.pool.y) / this.pool.ry;
    const t = 1 - (dx * dx + dy * dy);
    return t > 0 && bayer(x, y) < t * 1.1;
  }

  /** `night` is the colour already graded; `day` feeds the lamplit version. */
  put(x: number, y: number, night: Rgb, day: Rgb) {
    this.r.set(x, y, this.lit(x, y) ? mix(night, grade(day, LAMP), 0.3) : night);
  }

  paint(x: number, y: number, c: Rgb, g: Grade) {
    this.put(x, y, grade(c, g), c);
  }
}

function grassAt(x: number, y: number) {
  return GRASS[GRASS_PAT[y & 7][x & 7]];
}

/** The game's dirt path (tan speckle and pebbles), under the moon. Night
 *  flattens contrast, so the speckle is pushed back apart; the middle is
 *  worn a little lighter and the grass lips shade its edges. */
function paintPath(p: Painter, rand: Rng, x0: number, x1: number, top: number, bottom: number) {
  const base = grade(GAME.path, PATH_NIGHT);
  const tone = (c: Rgb, k = 1.9) => mix(base, grade(c, PATH_NIGHT), k);
  const dark = tone(GAME.pathDark);
  const mid = tone(GAME.pathMid);
  const light = tone(GAME.pathLight);
  const worn = tone(GAME.pathLight, 1.3);
  const pebble = tone(GAME.pathPebble, 2.2);
  const lip = tone(GAME.pathPebble, 1.6);
  const centre = (top + bottom - 1) / 2;
  for (let y = top; y < bottom; y++) {
    const wear = 1 - Math.abs(y - centre) / ((bottom - top) / 2);
    for (let x = x0; x < x1; x++) {
      const n = rand();
      let c = n < 0.12 ? dark : n < 0.26 ? mid : n < 0.33 ? light : base;
      if (c === base && bayer(x, y) < wear * 0.4) c = worn;
      if (y === top || (y === top + 1 && n < 0.5) || y === bottom - 1) c = lip;
      p.put(x, y, c, GAME.path);
    }
  }
  // pebbles: lit on top, a shadow pixel below
  const pebbles = Math.round(((x1 - x0) * (bottom - top)) / 44);
  for (let i = 0; i < pebbles; i++) {
    const x = int(rand, x0 + 1, x1 - 3);
    const y = int(rand, top + 2, bottom - 3);
    const wide = rand() < 0.6;
    p.put(x, y, pebble, GAME.pathPebble);
    if (wide) p.put(x + 1, y, pebble, GAME.pathPebble);
    p.put(x, y - 1, light, GAME.pathLight);
    p.put(x + (wide ? 1 : 0), y + 1, dark, GAME.pathDark);
  }
}

/** The game's bush tile: a round shrub with his diagonal shading. */
function paintBush(p: Painter, x0: number, y0: number) {
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -5; dx <= 5; dx++) {
      if (dx * dx + dy * dy > 20) continue;
      const px = 8 + dx;
      const py = 9 + dy;
      if (px < 1 || px > 14 || py < 3 || py > 14) continue;
      const s = dx + dy;
      const c = s <= -4 ? GAME.treeHi : s <= -1 ? GAME.bushLight : s <= 2 ? GAME.tree : s <= 4 ? GAME.treeShadow : GAME.bushDeep;
      p.paint(x0 + px, y0 + py, c, NIGHT);
    }
  }
  p.paint(x0 + 4, y0 + 13, GAME.bushDeep, NIGHT);
  p.paint(x0 + 11, y0 + 13, GAME.bushDeep, NIGHT);
  p.paint(x0 + 5, y0 + 5, GAME.bushSpec, NIGHT);
  p.paint(x0 + 6, y0 + 5, GAME.bushSpec, NIGHT);
}

/** The game's signpost tile: a board with carved lines on a post. */
function paintSign(p: Painter, x0: number, y0: number) {
  const rect = (x: number, y: number, w: number, h: number, c: Rgb) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) p.paint(x0 + i, y0 + j, c, NIGHT);
  };
  rect(7, 8, 2, 7, GAME.signPost);
  rect(8, 9, 1, 6, GAME.signPostDark);
  rect(2, 1, 12, 8, GAME.sign);
  rect(2, 1, 12, 1, GAME.signHi);
  rect(2, 8, 12, 1, GAME.signDark);
  rect(2, 1, 1, 8, GAME.signDark);
  rect(13, 1, 1, 8, GAME.signDark);
  for (const ty of [3, 5, 7]) rect(4, ty, 8, 1, GAME.signDark);
  rect(7, 4, 1, 1, GAME.nail);
  rect(8, 6, 1, 1, GAME.nail);
}

/** The game's flower: a five-pixel cross of petals round a yellow heart. */
function paintFlower(p: Painter, x: number, y: number, c: Rgb, g: Grade) {
  p.paint(x, y + 3, GAME.stem, g);
  p.paint(x, y + 4, GAME.stem, g);
  p.paint(x, y, c, g);
  p.paint(x - 1, y + 1, c, g);
  p.paint(x + 1, y + 1, c, g);
  p.paint(x, y + 1, GAME.flowerCenter, g);
  p.paint(x, y + 2, c, g);
}

export function buildGround(L: Layout, seed = 41): Ground {
  const LW = L.W + MARGIN * 2;
  const r = new Raster(LW, L.H);
  const rand = seeded(seed);
  const ox = MARGIN;
  const pool: Pool = { x: ox + L.doorX, y: L.pathTop + 3, rx: 42, ry: 13 };
  const p = new Painter(r, pool);
  const flowerGrade: Grade = { mul: [0.5, 0.56, 0.74], add: [6, 10, 28] };

  // grass strips either side of the path, with grass tips into the forest floor
  for (let y = L.groundTop; y < L.H; y++) {
    const g = y >= L.pathBottom ? NIGHT_NEAR : NIGHT;
    // the forest edge and the path's lip cast a row of shade
    const shade = y === L.groundTop || y === L.pathBottom;
    for (let x = 0; x < LW; x++) p.paint(x, y, shade && bayer(x, y) < 0.75 ? GAME.grassDeep : grassAt(x, y), g);
  }
  for (let x = 0; x < LW; x++) {
    if (rand() < 0.45) p.paint(x, L.groundTop - 1, GAME.grassHi, NIGHT);
    if (rand() < 0.15) p.paint(x, L.groundTop - 2, GAME.grass, NIGHT);
  }
  // his per-tile variation: a few stray highlight and shadow pixels
  for (let tx = 0; tx < LW; tx += 16) {
    for (let i = 0; i < 4; i++) {
      const x = tx + int(rand, 0, 15);
      const y = int(rand, L.groundTop, L.H - 1);
      p.paint(x, y, i < 2 ? GAME.grassHi : GAME.grassDeep, y >= L.pathBottom ? NIGHT_NEAR : NIGHT);
    }
  }

  // the path, its edges nibbled by the grass
  paintPath(p, rand, 0, LW, L.pathTop, L.pathBottom);
  for (let x = 0; x < LW; x++) {
    if (rand() < 0.3) p.paint(x, L.pathTop, grassAt(x, L.pathTop), NIGHT);
    if (rand() < 0.3) p.paint(x, L.pathBottom - 1, grassAt(x, L.pathBottom - 1), NIGHT_NEAR);
    if (rand() < 0.12) p.paint(x, L.pathBottom, GAME.pathDark, NIGHT);
  }

  drawHouse(r, ox + L.houseX, L.houseY, HOUSE);
  const house = houseParts(ox + L.houseX, L.houseY);
  paintSign(p, ox + L.houseX + 52, L.pathTop - 16);

  // bushes along the forest edge, away from the house
  for (let x = ox + L.houseX + 72; x < LW - 8; x += int(rand, 40, 78)) paintBush(p, x, L.groundTop + 9 - 14);

  const tufts: Tuft[] = [];
  for (let x = ox + L.houseX + 62 + int(rand, 0, 16); x < LW - 4; x += int(rand, 38, 76)) {
    tufts.push({ x, y: L.pathTop - 1, phase: rand() * 6.3, near: false });
  }
  for (let x = int(rand, 6, 30); x < LW - 4; x += int(rand, 44, 86)) {
    tufts.push({ x, y: L.H - 1, phase: rand() * 6.3, near: true });
  }
  for (let x = int(rand, 4, 20); x < LW - 4; x += int(rand, 10, 26)) {
    const y = int(rand, L.pathBottom + 1, L.H - 6);
    paintFlower(p, x, y, FLOWERS[int(rand, 0, FLOWERS.length - 1)], flowerGrade);
  }

  return { canvas: r.canvas(), tufts, house, pool };
}
