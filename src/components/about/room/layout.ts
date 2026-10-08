/** Where the camera looks from to see the whole room, and what it looks at
 *  (scripts/room/space.py holds the same numbers); how far back it stands
 *  is fitted to the screen (fit.ts). */
export const OVERVIEW = { target: [4.15, 1.2, 2.1] as const, azimuth: -0.52, elevation: 0.36, fov: 24 };

/** The room's outline, the points the overview must keep on screen
 *  (scripts/room: 8 m wide, 4.4 m deep, walls 3 m high and 0.12 thick, the
 *  slab 0.22 under the floor): the slab's corners under its stepped front
 *  edge, and the tops of the two walls, low at the back wall's left end and
 *  at the right wall's front end. */
export const HULL: readonly (readonly [number, number, number])[] = [
  [0, -0.22, -0.12], [8.12, -0.22, -0.12], [8.12, -0.22, 4.4], [5.5, -0.22, 4.4], [5.0, -0.22, 3.9], [0, -0.22, 3.9],
  [0, 0, 3.9], [5.0, 0, 3.9], [5.5, 0, 4.4], [8.12, 0, 4.4],
  [0, 2.35, -0.12], [0, 2.35, 0], [0.9, 3.0, -0.12], [8.12, 3.0, -0.12],
  [8.0, 3.0, 0], [8.12, 3.0, 4.15], [8.12, 2.45, 4.4], [8.0, 2.45, 4.4],
];
