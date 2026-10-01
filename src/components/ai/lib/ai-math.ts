import { clamp01, lensForAspect, lerp, smoothstep } from "@/components/cyber/lib/scene-math";
import { mulberry32 } from "@/components/cyber/lib/rng";

// Everything the AI scene's sideways scroll decides, as pure functions of p
// (0..1 across the chapter track): cover, Jarvis, Go to Guy. Plus the
// deterministic layouts, so the scene is built the same on every visit.

export type Vec3 = [number, number, number];

/** Where each chapter panel sits on the track. */
export const AI_BEATS = [0, 0.5, 1] as const;

/** 1 on a chapter's beat, fading to 0 within `width` of it. */
export function chapterMix(p: number, beat: number, width: number): number {
  return 1 - smoothstep(0, width, Math.abs(p - beat));
}

/** The Jarvis pipeline is on stage around the middle chapter. */
export const jarvisMix = (p: number) => chapterMix(p, AI_BEATS[1], 0.42);

/** The Go to Guy hub assembles on the way to the last chapter. */
export const hubMix = (p: number) => smoothstep(0.58, 0.96, p);

/** How busy the network is: already alive on the cover, busier with each chapter. */
export const networkEnergy = (p: number) => lerp(0.55, 1, smoothstep(0, 0.5, p));

// --- camera -----------------------------------------------------------------

/** Orbit keys around the core: angle in degrees from +z toward +x, distance,
 *  eye height, the look-at point and a dutch roll in degrees. */
type Key = { at: number; angle: number; dist: number; height: number; look: Vec3; roll: number };

export const AI_CAMERA_KEYS: readonly Key[] = [
  // cover: wide, the core sits right of centre so the title reads on the left
  { at: AI_BEATS[0], angle: -26, dist: 17, height: 1.4, look: [-3.8, 0.25, 0], roll: 0 },
  // Jarvis: closer and a little lower, the pipeline standing tall on the right
  { at: AI_BEATS[1], angle: -14, dist: 19.5, height: 0.5, look: [-4.8, 0.15, 0], roll: -1 },
  // Go to Guy: up and over, the ring on the left, the copy on the right
  { at: AI_BEATS[2], angle: 14, dist: 18.5, height: 9.5, look: [3.6, -1.2, 0], roll: 0 },
];

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (3 * p1 - p0 - 3 * p2 + p3) * t3);
}

const keyParams = (k: Key) => [k.angle, k.dist, k.height, ...k.look, k.roll];

function sampleKeys(p: number): number[] {
  const keys = AI_CAMERA_KEYS;
  const x = clamp01(p);
  let i = 0;
  while (i < keys.length - 2 && x > keys[i + 1].at) i++;
  const a = keys[Math.max(i - 1, 0)];
  const b = keys[i];
  const c = keys[i + 1];
  const d = keys[Math.min(i + 2, keys.length - 1)];
  const t = clamp01((x - b.at) / (c.at - b.at));
  const [pa, pb, pc, pd] = [a, b, c, d].map(keyParams);
  return pb.map((_, j) => catmullRom(pa[j], pb[j], pc[j], pd[j], t));
}

export type AiCameraPose = { position: Vec3; target: Vec3; fov: number; roll: number };

export function aiCameraPose(p: number, aspect: number): AiCameraPose {
  const [angle, dist, height, lx, ly, lz, roll] = sampleKeys(p);
  const { fov, dolly } = lensForAspect(aspect);
  const a = (angle * Math.PI) / 180;
  const r = dist * dolly;
  // portrait screens have no room beside the copy: the copy sits low, so the
  // camera centres the core and looks under it, lifting it into the top third
  const portrait = aspect < 1;
  return {
    position: [Math.sin(a) * r, height + (dolly - 1) * 1.2, Math.cos(a) * r],
    target: [portrait ? lx * 0.12 : lx, ly - (portrait ? 3.4 : 0), lz],
    fov,
    roll: (roll * Math.PI) / 180,
  };
}

// --- layouts ----------------------------------------------------------------

export type Lattice = {
  /** node positions, xyz */
  nodes: Float32Array;
  /** node index pairs, two per edge */
  edges: Uint16Array;
};

/** A shell of nodes around the core, each linked to its nearest neighbours. */
export function latticeLayout(count = 260, links = 3, seed = 11): Lattice {
  const rnd = mulberry32(seed);
  const pts: number[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  // a wide dome behind and beside the core, never between it and the camera
  for (let i = 0; pts.length < count * 3 && i < count * 6; i++) {
    const y = 1 - (2 * ((i * 0.61803) % 1));
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const th = i * golden;
    const r = 5.2 + Math.pow(rnd(), 0.7) * 7;
    const x = Math.cos(th) * ring * r * 1.35;
    const z = Math.sin(th) * ring * r;
    if (z > 2 && Math.abs(x) < 9) continue;
    pts.push(x, y * r * 0.6, z);
  }
  const nodes = new Float32Array(pts);
  count = nodes.length / 3;
  const pairs = new Set<number>();
  const d2 = (a: number, b: number) => {
    const dx = nodes[a * 3] - nodes[b * 3];
    const dy = nodes[a * 3 + 1] - nodes[b * 3 + 1];
    const dz = nodes[a * 3 + 2] - nodes[b * 3 + 2];
    return dx * dx + dy * dy + dz * dz;
  };
  for (let i = 0; i < count; i++) {
    const near: number[] = [];
    for (let j = 0; j < count; j++) {
      if (j === i) continue;
      near.push(j);
    }
    near.sort((a, b) => d2(i, a) - d2(i, b));
    for (const j of near.slice(0, links)) pairs.add(i < j ? i * 65536 + j : j * 65536 + i);
  }
  const edges = new Uint16Array(pairs.size * 2);
  let k = 0;
  for (const key of pairs) {
    edges[k++] = Math.floor(key / 65536);
    edges[k++] = key % 65536;
  }
  return { nodes, edges };
}

/** The Jarvis pipeline, top to bottom: three inputs arc in from above the
 *  core, two outputs leave below it. */
export const PIPE_SOURCES: readonly Vec3[] = [
  [-3.7, 4.1, 0.3],
  [0, 4.8, -0.4],
  [3.7, 4.1, 0.3],
];
export const PIPE_TARGETS: readonly Vec3[] = [
  [-2.7, -3.8, 0.6],
  [2.7, -3.8, 0.6],
];

/** The Go to Guy tools, evenly on a ring around the core. */
export const HUB_RADIUS = 6;

export function hubPosition(i: number, n: number): Vec3 {
  // half a step off, so no tool hides straight behind the core
  const a = -Math.PI / 2 + ((i + 0.5) / n) * Math.PI * 2;
  return [Math.cos(a) * HUB_RADIUS, -0.6 + Math.sin(a * 2) * 0.3, Math.sin(a) * HUB_RADIUS];
}

/** Point on a quadratic Bézier. */
export function bezier(a: Vec3, c: Vec3, b: Vec3, t: number): Vec3 {
  const u = 1 - t;
  return [0, 1, 2].map((i) => u * u * a[i] + 2 * u * t * c[i] + t * t * b[i]) as Vec3;
}

/** The control point that bows a route from `a` to `b` outward. */
export function bow(a: Vec3, b: Vec3, lift = 1.6): Vec3 {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + lift, (a[2] + b[2]) / 2 + lift * 0.6];
}
