import { SCHOOL_WORLDS } from "../worlds";

type PrintId = keyof typeof SCHOOL_WORLDS;

/** A world picture's width over its height: each is its panel, as a wide screen shows it. */
export const WORLD = 1.6;
/** The square prints are slices of those worlds, this share of their width. */
export const SQUARE = 1 / WORLD;

/** Where a print's slice starts across its world (u), centred on the subject. */
export const sliceStart = (id: PrintId) => Math.min(Math.max(SCHOOL_WORLDS[id].focus - SQUARE / 2, 0), 1 - SQUARE);

/** Where a print's slice sits on a wide screen showing its panel: the
 *  centre's x as a share of the screen's width, and the slice's height as a
 *  share of the screen's (the world covers the screen, centred). */
export function sliceOnScreen(id: PrintId, aspect: number): { x: number; h: number } {
  const h = Math.max(1, aspect / WORLD);
  const w = (WORLD * h) / aspect;
  return { x: (1 - w) / 2 + (sliceStart(id) + SQUARE / 2) * w, h };
}
