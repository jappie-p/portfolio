/** Where the camera looks from to see the whole room, and what it looks at
 *  (scripts/room/space.py holds the same numbers); how far back it stands
 *  is fitted to the screen (fit.ts). */
export const OVERVIEW = { target: [2.9, 1.15, 1.6] as const, azimuth: -0.52, elevation: 0.36, fov: 24 };

/** The room's outline, the points the overview must keep on screen
 *  (scripts/room): the slab's corners under its stepped front edge, and the
 *  tops of the two walls, low at the back wall's left end and at the right
 *  wall's front end. */
export const HULL: readonly (readonly [number, number, number])[] = [
  [0, -0.22, -0.12], [5.72, -0.22, -0.12], [5.72, -0.22, 3.35], [3.95, -0.22, 3.35], [3.5, -0.22, 2.95], [0, -0.22, 2.95],
  [0, 0, 2.95], [3.5, 0, 2.95], [3.95, 0, 3.35], [5.72, 0, 3.35],
  [0, 2.35, -0.12], [0, 2.35, 0], [0.9, 2.9, -0.12], [5.72, 2.9, -0.12],
  [5.6, 2.9, 0], [5.72, 2.9, 3.1], [5.72, 2.45, 3.35], [5.6, 2.45, 3.35],
];
