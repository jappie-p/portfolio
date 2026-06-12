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
