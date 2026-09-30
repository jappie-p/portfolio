// World layout of the firewall scene, as plain numbers (no three.js) so the
// scroll maths and the tests can use it too.
//
// The wall stands on the floor (y = 0), runs along its local s axis and faces
// local +z. It is turned by `yaw` so its left end is near the camera and the
// right end recedes into the dark, the classic 3/4 view.

export type Vec3 = [number, number, number];

export const WALL = {
  yaw: 0.6,
  coreY: 2.55,
  cellR: 0.5,
  gap: 0.07,
  rows: 5,
  cols: [-3, 22] as const,
  depth: 0.42,
  coreR: 1.2,
  coreLift: 0.36,
} as const;

const C = Math.cos(WALL.yaw);
const S = Math.sin(WALL.yaw);

/** Wall-local (s along the wall, y height, z out of the face) to world. */
export function wallToWorld(s: number, y: number, z: number): Vec3 {
  return [s * C + z * S, y, -s * S + z * C];
}

export const WALL_DIR: Vec3 = [C, 0, -S];
export const WALL_NORMAL: Vec3 = [S, 0, C];

/** Centre of the FIREWALL ACTIVE shield face. */
export const CORE: Vec3 = wallToWorld(0, WALL.coreY, WALL.coreLift);

/** Where the three DDoS floods hit the wall (wall-local s, world y). */
export const IMPACTS = [
  { s: 3.75, y: 4.05 },
  { s: 4.1, y: 2.75 },
  { s: 3.55, y: 1.42 },
] as const;

export const IMPACTS_WORLD: Vec3[] = IMPACTS.map((i) => wallToWorld(i.s, i.y, 0.04));
