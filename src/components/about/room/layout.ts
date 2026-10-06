import type { StoryId } from "./types";

/**
 * The room, in metres: x along the back wall from its left end, y up from
 * the floor, z out from the back wall toward you. Two walls stand, the back
 * one and the right one; the room is cut open at the front and the left, a
 * diorama on its own slab.
 */
export const ROOM = {
  /** along the back wall, into the room from it, floor to the walls' top */
  w: 5.2,
  d: 4.0,
  h: 2.9,
  /** how thick the walls and the slab under the floor are */
  wall: 0.14,
  slab: 0.22,
  /** the window in the back wall: left, right, sill, head */
  window: { x0: 2.8, x1: 4.2, y0: 1.5, y1: 2.55 },
} as const;

/** Where each piece stands: position, and its turn about y (radians). */
export const PLACES: Record<StoryId, { at: [number, number, number]; turn: number }> = {
  // the desk against the back wall at the left, the chair before it
  werk: { at: [1.55, 0, 0.42], turn: 0 },
  // the medal board on the back wall over the desk
  groei: { at: [1.4, 1.95, 0.02], turn: 0 },
  // the homelab rack against the back wall under the window
  homelab: { at: [3.55, 0, 0.4], turn: 0 },
  // on the right wall: the mountain bike hung up high, the road bike on the
  // floor below it, the helmet on the rack, the board in the front corner
  mountainbiken: { at: [ROOM.w - 0.22, 1.25, 1.75], turn: -Math.PI / 2 },
  wielrennen: { at: [ROOM.w - 0.3, 0, 1.55], turn: -Math.PI / 2 },
  motorrijden: { at: [3.7, 1.27, 0.42], turn: -0.5 },
  windsurfen: { at: [ROOM.w - 0.38, 0, 3.15], turn: -Math.PI / 2 },
};

/** Where the camera stands back to see the whole room, and what it looks at. */
export const OVERVIEW = { target: [2.6, 1.15, 1.8] as const, azimuth: -0.6, elevation: 0.48, distance: 13.5, fov: 26 };
