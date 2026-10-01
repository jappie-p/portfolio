/** Overscan on each side of every layer, in logical pixels, so parallax never
 *  shows an edge. Layer canvases are W + 2 * MARGIN wide. */
export const MARGIN = 12;

/** The scene is designed on a 180-row stage anchored to the bottom edge:
 *  taller screens just get more sky above it. */
export const STAGE_H = 180;

export type Layout = {
  W: number;
  H: number;
  /** where the sky meets the hills */
  horizon: number;
  groundTop: number;
  pathTop: number;
  pathBottom: number;
  /** the row Link's feet stand on while walking the path */
  feet: number;
  /** top-left of Link's house (a 48x48, three-by-three tile house) */
  houseX: number;
  houseY: number;
  /** centre of the front door and the row just below its threshold */
  doorX: number;
  doorFeet: number;
};

export function layout(W: number, H: number): Layout {
  const groundTop = H - 34;
  const houseX = -6;
  const houseY = groundTop + 9 - 48;
  return {
    W,
    H,
    horizon: H - 40,
    groundTop,
    pathTop: H - 24,
    pathBottom: H - 10,
    feet: H - 12,
    houseX,
    houseY,
    doorX: houseX + 24,
    doorFeet: houseY + 48,
  };
}
