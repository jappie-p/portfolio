import { mulberry32 } from "./rng";

export const SQRT3 = Math.sqrt(3);

/** Hexagon corners for circumradius r. Flat-top starts at 0°, pointy-top at 30°. */
export function hexCorners(r: number, pointy = false): Array<[number, number]> {
  const offset = pointy ? Math.PI / 6 : 0;
  return Array.from({ length: 6 }, (_, i) => {
    const a = offset + (i * Math.PI) / 3;
    return [Math.cos(a) * r, Math.sin(a) * r] as [number, number];
  });
}

/** Centre spacing for flat-top cells of circumradius r with an even gap between neighbours. */
export function hexPitch(r: number, gap: number) {
  const d = SQRT3 * r + gap; // neighbour distance
  return { d, x: (d * SQRT3) / 2, y: d };
}

export type Cell = {
  s: number; // along the wall
  y: number; // height above the floor
  col: number;
  row: number;
  seed: number;
  icon: number; // atlas index, -1 = blank face
  lift: number; // small push out of the wall, breaks the CG-perfect grid
};

export type WallGrid = {
  cellR: number;
  gap: number;
  rows: number;
  cols: readonly [number, number];
  coreY: number;
  coreR: number;
  iconCount: number;
  seed?: number;
};

/** Centre of the honeycomb cell nearest to (s, y), for cursor lock-on. */
export function nearestCell(s: number, y: number, g: Pick<WallGrid, "cellR" | "gap" | "rows" | "cols">) {
  const pitch = hexPitch(g.cellR, g.gap);
  const floor = (SQRT3 / 2) * g.cellR + 0.06;
  const col0 = Math.round(s / pitch.x);
  let best = { s: 0, y: 0, d: Infinity };
  for (let col = col0 - 1; col <= col0 + 1; col++) {
    if (col < g.cols[0] || col > g.cols[1]) continue;
    const shift = Math.abs(col) % 2 === 1 ? pitch.y / 2 : 0;
    const row = Math.min(g.rows - 1, Math.max(0, Math.round((y - floor - shift) / pitch.y)));
    const cs = col * pitch.x;
    const cy = floor + row * pitch.y + shift;
    const d = Math.hypot(cs - s, cy - y);
    if (d < best.d) best = { s: cs, y: cy, d };
  }
  return { s: best.s, y: best.y };
}

/** Flat-top honeycomb in columns (odd columns shifted up half a cell), with the
 *  cells hidden behind the core shield left out. */
export function buildWallCells(g: WallGrid): Cell[] {
  const rnd = mulberry32(g.seed ?? 0x9e3779b9);
  const pitch = hexPitch(g.cellR, g.gap);
  const floor = (SQRT3 / 2) * g.cellR + 0.06; // bottom row rests on the floor
  const cells: Cell[] = [];
  for (let col = g.cols[0]; col <= g.cols[1]; col++) {
    const odd = Math.abs(col) % 2 === 1;
    for (let row = 0; row < g.rows; row++) {
      const s = col * pitch.x;
      const y = floor + row * pitch.y + (odd ? pitch.y / 2 : 0);
      if (Math.hypot(s, y - g.coreY) < g.coreR * 0.92) continue;
      const blank = rnd() < 0.14;
      const icon = Math.floor(rnd() * g.iconCount);
      const pushed = rnd() < 0.08 ? 0.08 : 0;
      cells.push({ s, y, col, row, seed: rnd(), icon: blank ? -1 : icon, lift: (rnd() - 0.5) * 0.06 + pushed });
    }
  }
  return cells;
}
