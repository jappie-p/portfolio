import { mulberry32 } from "../lib/rng";
import type { Template } from "./wireframes";

/** One window in the space: x, y centre as 0..1 of the panel; `z` is depth
 *  (0 at the lens, 1 in focus, 3 far away); `w` its width as 0..1 of the
 *  panel's short side; yaw and pitch tilt it. */
export interface Placement {
  t: Template;
  x: number;
  y: number;
  z: number;
  w: number;
  yaw: number;
  pitch: number;
  roll?: number;
}

const FOCUS = 1;

/** Copy on the left ~45%, the fanned screenshots on the right: in-focus
 *  windows ring the edges, big blurred ones sit right at the lens in two
 *  corners, and far ones drift in the middle distance. */
const WIDE: Placement[] = [
  { t: "landing", x: 0.07, y: 0.9, z: 0.28, w: 0.62, yaw: 0.42, pitch: -0.2, roll: 0.04 },
  { t: "dashboard", x: 0.93, y: 0.07, z: 0.32, w: 0.56, yaw: -0.38, pitch: 0.18, roll: -0.05 },
  { t: "landing", x: 0.2, y: 0.13, z: 1, w: 0.3, yaw: 0.46, pitch: 0.16, roll: -0.04 },
  { t: "dashboard", x: 0.6, y: 0.145, z: 1.05, w: 0.24, yaw: -0.38, pitch: 0.2, roll: 0.03 },
  { t: "shop", x: 0.44, y: 0.88, z: 0.95, w: 0.28, yaw: 0.3, pitch: -0.3, roll: 0.03 },
  { t: "mobile", x: 0.965, y: 0.52, z: 0.95, w: 0.12, yaw: -0.62, pitch: 0.08, roll: 0.05 },
  { t: "blog", x: 0.8, y: 0.9, z: 1.1, w: 0.2, yaw: -0.42, pitch: -0.26, roll: -0.04 },
  { t: "gallery", x: 0.03, y: 0.44, z: 1.2, w: 0.2, yaw: 0.62, pitch: 0.08, roll: 0.02 },
];

/** Phones: the header (logo, menu) owns the top ~110 px, so the windows
 *  start below it, between the header and the copy, and under the copy. */
const TALL: Placement[] = [
  { t: "landing", x: 0.1, y: 0.95, z: 0.3, w: 0.9, yaw: 0.4, pitch: -0.2 },
  { t: "dashboard", x: 0.72, y: 0.19, z: 1, w: 0.62, yaw: -0.32, pitch: 0.14 },
  { t: "mobile", x: 0.12, y: 0.24, z: 1.1, w: 0.26, yaw: 0.4, pitch: 0.05 },
  { t: "shop", x: 0.8, y: 0.8, z: 1.05, w: 0.6, yaw: -0.26, pitch: -0.2 },
  { t: "blog", x: 0.95, y: 0.32, z: 1.3, w: 0.4, yaw: -0.5, pitch: 0.1 },
];

const FAR: Template[] = ["landing", "shop", "blog", "gallery", "dashboard", "mobile"];

/** Far windows stay out of the copy and do not pile up on each other or on
 *  the hero windows. */
function far(n: number, wide: boolean, heroes: Placement[]): Placement[] {
  const rnd = mulberry32(19);
  const out: Placement[] = [];
  const taken = heroes.filter((p) => p.z > 0.6);
  let guard = 0;
  while (out.length < n && guard++ < 3000) {
    const x = rnd();
    const y = rnd();
    const inCopy = wide ? x > 0.06 && x < 0.44 && y > 0.3 && y < 0.72 : y > 0.28 && y < 0.72;
    if (inCopy) continue;
    // nothing under the header: the whole top band on phones, the nav pill on wide screens
    if (wide ? y < 0.12 && x > 0.3 && x < 0.7 : y < 0.16) continue;
    if (out.some((o) => Math.hypot((o.x - x) * (wide ? 1.6 : 1), o.y - y) < 0.16)) continue;
    if (taken.some((o) => Math.hypot((o.x - x) * (wide ? 1.6 : 1), o.y - y) < 0.2)) continue;
    const t = FAR[Math.floor(rnd() * FAR.length)];
    out.push({ t, x, y, z: 1.7 + rnd() * 1.4, w: (t === "mobile" ? 0.07 : 0.16) + rnd() * 0.06, yaw: (rnd() - 0.5) * 0.9, pitch: (rnd() - 0.5) * 0.5, roll: (rnd() - 0.5) * 0.1 });
  }
  return out;
}

export function coverLayout(w: number, h: number): Placement[] {
  const wide = w / h > 0.9;
  const heroes = wide ? WIDE : TALL;
  return [...far(wide ? 11 : 6, wide, heroes), ...heroes];
}

/** Depth of field, CSS px: sharp at the focus, soft far away, very soft near. */
export const dof = (z: number) => (z < FOCUS ? ((FOCUS - z) / FOCUS) ** 1.3 * 12 : Math.min(3, (z - FOCUS) * 1.1));
/** Distance fade into the space. */
export const haze = (z: number) => Math.min(0.72, Math.max(0, (z - 1.1) * 0.34));
