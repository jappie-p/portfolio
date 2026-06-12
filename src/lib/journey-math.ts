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

// One keyframe per chapter boundary (7 points for 6 chapters).
const POSITION_KEYS = [
  new Vector3(0, 0.6, 8), // hero
  new Vector3(-0.6, 0.7, 5), // → dream
  new Vector3(1.4, 0.9, 1.5), // → turn
  new Vector3(-1.2, 1.1, -3.5), // → work
  new Vector3(0.4, 1.8, -8), // → craft
  new Vector3(0, 1.4, -12), // → contact approach
  new Vector3(0, 1.2, -15), // contact end
];

const TARGET_KEYS = [
  new Vector3(0, 0.5, 0),
  new Vector3(-1.2, 0.6, -2),
  new Vector3(0.8, 0.7, -5),
  new Vector3(-0.5, 1.0, -9),
  new Vector3(0, 1.6, -14),
  new Vector3(0, 1.2, -18),
  new Vector3(0, 1.0, -22),
];

const positionCurve = new CatmullRomCurve3(POSITION_KEYS, false, "catmullrom", 0.4);
const targetCurve = new CatmullRomCurve3(TARGET_KEYS, false, "catmullrom", 0.4);

/** Sample camera position + look-at target for progress 0..1. Mutates `out`. */
export function sampleCamera(
  progress: number,
  out: { position: Vector3; target: Vector3 }
): void {
  const p = clamp01(progress);
  positionCurve.getPoint(p, out.position);
  targetCurve.getPoint(p, out.target);
}
