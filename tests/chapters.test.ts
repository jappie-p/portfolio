import { describe, it, expect } from "vitest";
import { CHAPTERS, progressToChapter } from "@/lib/chapters";

describe("progressToChapter", () => {
  it("has six chapters in journey order", () => {
    expect(CHAPTERS.map((c) => c.id)).toEqual(["hero", "websites", "ai", "cyber", "about", "contact"]);
  });
  it("maps 0 to hero start", () => {
    expect(progressToChapter(0)).toEqual({ index: 0, local: 0 });
  });
  it("maps 1 to the last chapter end", () => {
    const r = progressToChapter(1);
    expect(r.index).toBe(5);
    expect(r.local).toBeCloseTo(1);
  });
  it("clamps out-of-range", () => {
    expect(progressToChapter(-0.5).index).toBe(0);
    expect(progressToChapter(2).index).toBe(5);
  });
});
