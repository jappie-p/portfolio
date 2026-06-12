import { describe, it, expect } from "vitest";
import {
  CHAPTERS,
  TOTAL_WEIGHT,
  progressToChapter,
} from "@/lib/journey-math";

describe("CHAPTERS", () => {
  it("defines the six chapters in order", () => {
    expect(CHAPTERS.map((c) => c.id)).toEqual([
      "hero",
      "dream",
      "turn",
      "work",
      "craft",
      "contact",
    ]);
  });

  it("total weight is the sum of chapter weights", () => {
    const sum = CHAPTERS.reduce((a, c) => a + c.weight, 0);
    expect(TOTAL_WEIGHT).toBeCloseTo(sum);
  });
});

describe("progressToChapter", () => {
  it("returns hero at progress 0", () => {
    expect(progressToChapter(0)).toEqual({ index: 0, local: 0 });
  });

  it("returns contact end at progress 1", () => {
    const r = progressToChapter(1);
    expect(r.index).toBe(CHAPTERS.length - 1);
    expect(r.local).toBeCloseTo(1);
  });

  it("clamps out-of-range progress", () => {
    expect(progressToChapter(-0.5)).toEqual({ index: 0, local: 0 });
    expect(progressToChapter(1.5).index).toBe(CHAPTERS.length - 1);
  });

  it("maps the midpoint of a chapter to local 0.5", () => {
    // start of 'dream' = weight(hero)/TOTAL, dream spans weight(dream)/TOTAL
    const start = CHAPTERS[0].weight / TOTAL_WEIGHT;
    const span = CHAPTERS[1].weight / TOTAL_WEIGHT;
    const r = progressToChapter(start + span / 2);
    expect(r.index).toBe(1);
    expect(r.local).toBeCloseTo(0.5);
  });
});
