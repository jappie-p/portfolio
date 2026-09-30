import { CORE, type Vec3 } from "./layout";

// Everything the sideways scroll position decides, as pure functions of p
// (0..1 across the chapter track). The story has four stops, one per panel:
// overview under attack, the floods at full force, the firewall pushing back,
// and the close-up on FIREWALL ACTIVE with the attack blocked.

export const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export function smoothstep(e0: number, e1: number, x: number) {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

/** Where each chapter panel sits on the track. */
export const BEATS = [0, 1 / 3, 2 / 3, 1] as const;

/** Horizontal position through a scroll track, 0 at the first panel, 1 at the last. */
export function trackProgress(scrollLeft: number, scrollWidth: number, clientWidth: number): number {
  const max = scrollWidth - clientWidth;
  return max > 0 ? clamp01(scrollLeft / max) : 0;
}

// --- camera -----------------------------------------------------------------

/** Orbit keys around the core: angle in degrees from +z toward +x, distance
 *  from the core, absolute eye height, an offset for the look-at point, and a
 *  dutch roll in degrees. One key per chapter. */
type Orbit = { at: number; angle: number; dist: number; height: number; look: Vec3; roll: number };

export const CAMERA_KEYS: readonly Orbit[] = [
  // overview: the whole wall under attack
  { at: BEATS[0], angle: -4, dist: 11, height: 3.55, look: [0.75, -0.2, 0], roll: 0 },
  // attack: swing right, low and tilted, straight into the impacts
  { at: BEATS[1], angle: 24, dist: 8, height: 2.4, look: [2.3, 0.1, -1.9], roll: -3 },
  // defence: back to the core from below, the heroic angle
  { at: BEATS[2], angle: -14, dist: 6.4, height: 1.7, look: [0.1, 0.35, 0], roll: 1.5 },
  // secure: close on FIREWALL ACTIVE
  { at: BEATS[3], angle: 10, dist: 4.7, height: 2.62, look: [0, 0, 0], roll: 0 },
];

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (3 * p1 - p0 - 3 * p2 + p3) * t3)
  );
}

const orbitParams = (k: Orbit) => [k.angle, k.dist, k.height, ...k.look, k.roll];

function sampleOrbit(p: number): number[] {
  const keys = CAMERA_KEYS;
  const x = clamp01(p);
  let i = 0;
  while (i < keys.length - 2 && x > keys[i + 1].at) i++;
  const a = keys[Math.max(i - 1, 0)];
  const b = keys[i];
  const c = keys[i + 1];
  const d = keys[Math.min(i + 2, keys.length - 1)];
  const t = clamp01((x - b.at) / (c.at - b.at));
  const [pa, pb, pc, pd] = [a, b, c, d].map(orbitParams);
  return pb.map((_, j) => catmullRom(pa[j], pb[j], pc[j], pd[j], t));
}

/** Screens narrower than 16:9 keep the 16:9 horizontal framing by widening the
 *  lens, up to a cap. Past that (portrait phones) the camera only pulls back a
 *  little: the wall is landscape, so a phone crops in on the core instead of
 *  shrinking the whole scene to a strip. */
export function lensForAspect(aspect: number) {
  const baseFov = 40;
  const refAspect = 16 / 9;
  const maxFov = 52;
  const rad = Math.PI / 180;
  const tanH = Math.tan((baseFov / 2) * rad) * refAspect;
  const want = (2 * Math.atan(tanH / Math.max(aspect, 0.2))) / rad;
  const fov = Math.min(Math.max(baseFov, want), maxFov);
  const got = Math.tan((fov / 2) * rad) * aspect;
  const dolly = got >= tanH ? 1 : Math.pow(tanH / got, 0.25);
  return { fov, dolly };
}

export type CameraPose = { position: Vec3; target: Vec3; fov: number; roll: number };

export function cameraPose(p: number, aspect: number): CameraPose {
  const [angle, dist, height, lx, ly, lz, roll] = sampleOrbit(p);
  const { fov, dolly } = lensForAspect(aspect);
  const a = (angle * Math.PI) / 180;
  const r = dist * dolly;
  return {
    // pulled back on narrow screens, so rise a little to keep the floor in view
    position: [CORE[0] + Math.sin(a) * r, height + (dolly - 1) * 0.9, CORE[2] + Math.cos(a) * r],
    target: [CORE[0] + lx, CORE[1] + ly, CORE[2] + lz],
    fov,
    roll: (roll * Math.PI) / 180,
  };
}

// --- story ------------------------------------------------------------------

/** Strength of the DDoS floods: already on arrival (it is the point of the
 *  scene), full force at the attack chapter, pushed back in the defence
 *  chapter, a hum once it is blocked. */
export function attackIntensity(p: number): number {
  const surge = lerp(0.55, 1, smoothstep(BEATS[0], BEATS[1], p));
  const pushed = lerp(surge, 0.75, smoothstep(BEATS[1], BEATS[2], p));
  return lerp(pushed, 0.22, smoothstep(BEATS[2], BEATS[3], p));
}

/** How hard the firewall visibly pushes back (shockwaves through the cells). */
export function defenseLevel(p: number): number {
  return smoothstep(0.4, BEATS[2], p) * (1 - 0.45 * smoothstep(BEATS[2], BEATS[3], p));
}

export type AlertLevel = "high" | "critical" | "blocked";
export const CRITICAL_AT = 0.2;
export const BLOCKED_AT = 0.55;

export function alertLevel(p: number): AlertLevel {
  if (p >= BLOCKED_AT) return "blocked";
  return p >= CRITICAL_AT ? "critical" : "high";
}

/** The first four log lines are already there; the rest arrive with the story. */
export const LOG_AT = [-1, -1, -1, -1, 0.12, 0.45, 0.58, 0.85, 0.95] as const;

export function visibleLogCount(p: number): number {
  return LOG_AT.filter((at) => p >= at).length;
}
