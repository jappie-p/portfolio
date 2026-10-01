/** A corner of the geode: its cavity rim curves round (cx, cy), CSS px. */
export interface Wall {
  cx: number;
  cy: number;
  /** lip radius, CSS px */
  r: number;
  /** the arc that shows on screen, radians (y down) */
  from: number;
  to: number;
  seed: number;
}

/** Radius of the lip at angle `a`, scaled by `k` (bands sit at k < 1): a slow,
 *  lopsided wobble so the cavity reads as grown rather than drawn. */
export function lip(wall: Wall, a: number, k = 1): number {
  const p = wall.seed * 1.7;
  return wall.r * k * (1 + 0.13 * Math.sin(a * 2 + p) + 0.05 * Math.sin(a * 5 + p * 2.3) + 0.018 * Math.sin(a * 11 + p * 0.7));
}

/** The point on the lip at angle `a`. */
export function onLip(wall: Wall, a: number, k = 1): [number, number] {
  const r = lip(wall, a, k);
  return [wall.cx + Math.cos(a) * r, wall.cy + Math.sin(a) * r];
}
