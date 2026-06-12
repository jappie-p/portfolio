import { CatmullRomCurve3, Vector3 } from "three";

export const CHAPTERS = [
  { id: "hero", weight: 1 },
  { id: "dream", weight: 2 },
  { id: "turn", weight: 2 },
  { id: "work", weight: 2.5 },
  { id: "craft", weight: 2 },
  { id: "contact", weight: 1.5 },
] as const;

export type ChapterId = (typeof CHAPTERS)[number]["id"];

export const TOTAL_WEIGHT = CHAPTERS.reduce((a, c) => a + c.weight, 0);

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Map global scroll progress (0..1) to a chapter index + local progress within it. */
export function progressToChapter(progress: number): {
  index: number;
  local: number;
} {
  const p = clamp01(progress);
  let acc = 0;
  for (let i = 0; i < CHAPTERS.length; i++) {
    const span = CHAPTERS[i].weight / TOTAL_WEIGHT;
    if (p <= acc + span || i === CHAPTERS.length - 1) {
      return { index: i, local: clamp01((p - acc) / span) };
    }
    acc += span;
  }
  return { index: CHAPTERS.length - 1, local: 1 };
}

/**
 * Camera choreography: a beat list instead of evenly-spaced keyframes.
 * Each beat pins the camera at a scroll progress `t`. Closely spaced
 * positions across a wide t-span read as a HOLD (scene plays, text reads);
 * large position deltas across a narrow t-span read as a WHOOSH. Banking
 * roll and fov widen during the whooshes to sell the flight.
 *
 * Chapter spans for reference (weights /11):
 * hero 0–.091 · dream –.273 · turn –.455 · work –.682 · craft –.864 · contact –1
 */
type Beat = {
  t: number;
  pos: [number, number, number];
  tgt: [number, number, number];
  roll?: number;
  fov?: number;
};

const BEATS: Beat[] = [
  // hero — the name, the shard, embers
  { t: 0.0, pos: [0, 0.85, 7.5], tgt: [0.5, 1.15, 0.5], fov: 42 },
  { t: 0.06, pos: [-0.2, 0.8, 7.1], tgt: [0.4, 1.1, 0.3] },
  // dive out toward the dream island
  { t: 0.1, pos: [-1.0, 1.7, 5.9], tgt: [-1.8, 1.35, 2.4], roll: -0.05, fov: 47 },
  { t: 0.15, pos: [-0.4, 1.3, 4.7], tgt: [-2.4, 1.4, 1.7], fov: 42 },
  // slow orbit around the island while the dream text reads
  { t: 0.24, pos: [-1.3, 1.05, 3.5], tgt: [-2.7, 1.5, 1.5], roll: 0.04 },
  // WHOOSH — bank right into the website corridor
  { t: 0.29, pos: [0.7, 1.4, 2.2], tgt: [-0.6, 1.5, -2.6], roll: 0.07, fov: 51 },
  { t: 0.34, pos: [0.4, 1.25, 0.9], tgt: [-1.2, 1.5, -3.4], fov: 43 },
  { t: 0.43, pos: [-0.2, 1.15, -0.6], tgt: [-1.4, 1.3, -5.2] },
  // WHOOSH — dive down into the monolith hall
  { t: 0.475, pos: [0.1, 0.95, -2.2], tgt: [0, 1.5, -8.5], roll: -0.06, fov: 53 },
  { t: 0.52, pos: [0, 1.05, -3.9], tgt: [0, 1.6, -9.8], fov: 44 },
  // glide down the middle of the colonnade while the work list reads
  { t: 0.65, pos: [0, 1.15, -7.4], tgt: [0, 1.7, -13], fov: 43 },
  // pull UP out of the hall, revealing the automation network below
  { t: 0.695, pos: [0.4, 2.2, -8.9], tgt: [0, 0.9, -13.8], roll: 0.05, fov: 48 },
  { t: 0.74, pos: [0, 3.2, -9.9], tgt: [0, 0.85, -14.4], fov: 42 },
  { t: 0.85, pos: [-0.5, 3.0, -10.9], tgt: [0.3, 0.8, -15.2] },
  // descend into the radar arena for the finale
  { t: 0.89, pos: [0, 1.9, -12.8], tgt: [0, 0.45, -20], roll: -0.04, fov: 47 },
  { t: 0.95, pos: [0, 1.25, -15.4], tgt: [0, 0.55, -21.5], fov: 42 },
  { t: 1.0, pos: [-0.2, 1.1, -16.4], tgt: [0, 0.5, -22.5] },
];

const positionCurve = new CatmullRomCurve3(
  BEATS.map((b) => new Vector3(...b.pos)),
  false,
  "catmullrom",
  0.5
);
const targetCurve = new CatmullRomCurve3(
  BEATS.map((b) => new Vector3(...b.tgt)),
  false,
  "catmullrom",
  0.5
);

export type CameraSample = {
  position: Vector3;
  target: Vector3;
  /** Banking roll in radians, applied after lookAt. */
  roll: number;
  /** Field of view in degrees; widens during whooshes. */
  fov: number;
};

const smooth = (v: number) => v * v * (3 - 2 * v);

/** Sample the camera flight for progress 0..1. Mutates `out`. */
export function sampleCamera(progress: number, out: CameraSample): void {
  const p = clamp01(progress);

  let i = 0;
  while (i < BEATS.length - 2 && p > BEATS[i + 1].t) i++;
  const a = BEATS[i];
  const b = BEATS[i + 1];
  const local = clamp01((p - a.t) / Math.max(1e-6, b.t - a.t));

  // Map beat segment to curve parameter: spatial spacing between beats
  // creates the speed variation (hold vs whoosh) automatically.
  const u = (i + local) / (BEATS.length - 1);
  positionCurve.getPoint(u, out.position);
  targetCurve.getPoint(u, out.target);

  const s = smooth(local);
  const rollA = a.roll ?? 0;
  const rollB = b.roll ?? 0;
  out.roll = rollA + (rollB - rollA) * s;
  const fovA = a.fov ?? 42;
  const fovB = b.fov ?? 42;
  out.fov = fovA + (fovB - fovA) * s;
}
