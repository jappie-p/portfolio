import * as THREE from "three";
import type { Box, PanelAnchors } from "../lib/anchors";

export type StoneKind = "cluster" | "point" | "lying" | "palm" | "tumbled" | "slice";

/** One stone on the table (cm, y up, the camera toward +z). */
export interface Placement {
  kind: StoneKind;
  seed: number;
  x: number;
  z: number;
  /** turn about the vertical, radians */
  yaw: number;
  scale: number;
  /** out in the dark beyond the pool of light */
  far?: boolean;
}

export interface StonesPlan {
  w: number;
  h: number;
  camera: { position: THREE.Vector3; target: THREE.Vector3; fov: number };
  stones: Placement[];
  /** distance held sharp, and the depth either side of it that stays so (cm) */
  focus: number;
  range: number;
  bokeh: number;
  /** where the light pools on the slate: centre x, z and reach x, z */
  pool: [number, number, number, number];
  /** the patch of table under contact shadow: centre x, z and size */
  shadows: [number, number, number, number];
  /** a phone or a small GPU: fewer stones, fewer bounces */
  lite: boolean;
}

/** A camera looking down at the table from `rise` degrees, `dist` away. */
function lens(fov: number, rise: number, dist: number, aim: THREE.Vector3) {
  const a = THREE.MathUtils.degToRad(rise);
  const position = new THREE.Vector3(aim.x, aim.y + Math.sin(a) * dist, aim.z + Math.cos(a) * dist);
  return { position, target: aim.clone(), fov };
}

/** The point on the table under screen pixel (sx, sy) of a w x h view. */
function onTable(cam: StonesPlan["camera"], w: number, h: number, sx: number, sy: number): THREE.Vector3 {
  const c = new THREE.PerspectiveCamera(cam.fov, w / h, 1, 1000);
  c.position.copy(cam.position);
  c.lookAt(cam.target);
  c.updateMatrixWorld();
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2((sx / w) * 2 - 1, 1 - (sy / h) * 2), c);
  const t = -ray.ray.origin.y / Math.min(-1e-3, ray.ray.direction.y);
  return ray.ray.at(t, new THREE.Vector3());
}

const extent = (stones: Placement[]) => {
  const xs = stones.map((s) => s.x);
  const zs = stones.map((s) => s.z);
  return [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
};

/** Pool the light on the front stones; shadow the patch under them all. */
function around(front: Placement[], all: Placement[]): Pick<StonesPlan, "pool" | "shadows"> {
  const [fx0, fx1, fz0, fz1] = extent(front);
  const [x0, x1, z0, z1] = extent(all);
  return {
    pool: [(fx0 + fx1) / 2, (fz0 + fz1) / 2 - 4, (fx1 - fx0) * 0.55 + 8, (fz1 - fz0) * 0.5 + 14],
    shadows: [(x0 + x1) / 2, (z0 + z1) / 2, x1 - x0 + 24, z1 - z0 + 24],
  };
}

const box = (b: Box | undefined, fallback: Box) => b ?? fallback;

/**
 * A still life on dark slate, shot from a little above with a long lens, the
 * site's frames floating in front of it. On wide screens the stones gather
 * low in two groups, under the browser frame and below the copy, with one
 * amethyst out of focus far back; the middle and the copy stay dark.
 */
export function stonesPlan(w: number, h: number, a: PanelAnchors | null): StonesPlan {
  if (w / h > 0.9) {
    const camera = lens(20, 23, 66, new THREE.Vector3(0, 0, -2));
    const frame = box(a?.frame, { x: w * 0.1, y: h * 0.26, w: w * 0.43, h: h * 0.48 });
    const copy = box(a?.copy, { x: w * 0.58, y: h * 0.3, w: w * 0.3, h: h * 0.43 });
    const at = (kind: StoneKind, seed: number, sx: number, sy: number, yaw: number, scale = 1, far = false): Placement => {
      const p = onTable(camera, w, h, sx, sy);
      return { kind, seed, x: p.x, z: p.z, yaw, scale, far };
    };
    // a group at each end, the stones touching and overlapping as they
    // would be set down, nothing in a row
    const front = [
      at("cluster", 3, frame.x - 20, h - 18, 0.35),
      at("lying", 5, frame.x + 255, h - 26, -0.8, 0.9),
      at("palm", 11, copy.x - 170, h - 72, 0.35, 0.9),
      at("tumbled", 17, copy.x - 40, h - 26, 1.1, 0.9),
      at("slice", 23, w - 88, h - 30, -0.3, 0.8),
    ];
    // the same cluster again, turned away: out of focus and dim, it costs no
    // second build
    const far = [at("cluster", 3, w - 20, h * 0.1, 2.4, 1, true)];
    const stones = [...front, ...far];
    const hero = new THREE.Vector3(stones[0].x, 2, stones[0].z).distanceTo(camera.position);
    return { w, h, camera, stones, focus: hero, range: 16, bokeh: 10, ...around(front, stones), lite: false };
  }

  // phones and upright tablets: frame on top, copy below, the header's veil
  // over the little room above the frame. The stones gather in the strip
  // between frame and copy, rising behind the frame's lower edge: the agate
  // shows most of its face, the cluster leans in from under the phone
  const camera = lens(38, 34, 60, new THREE.Vector3(0, 0, -2));
  const copyTop = a?.copyTop ?? h * 0.5;
  const at = (kind: StoneKind, seed: number, sx: number, sy: number, yaw: number, scale = 1): Placement => {
    const p = onTable(camera, w, h, sx, sy);
    return { kind, seed, x: p.x, z: p.z, yaw, scale };
  };
  const stones = [
    at("slice", 23, w * 0.21, copyTop - 12, 0.2, 0.75),
    at("cluster", 3, w * 0.66, copyTop - 28, -0.4, 0.75),
    at("tumbled", 17, w * 0.45, copyTop - 6, 1.1, 0.7),
  ];
  const hero = new THREE.Vector3(stones[0].x, 2, stones[0].z).distanceTo(camera.position);
  return { w, h, camera, stones, focus: hero, range: 10, bokeh: 3, ...around(stones, stones), lite: true };
}
