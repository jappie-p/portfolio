import { describe, it, expect } from "vitest";
import { Vector3 } from "three";
import {
  CHAPTERS,
  TOTAL_WEIGHT,
  progressToChapter,
  sampleCamera,
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

  it("an exact chapter boundary belongs to the ending chapter", () => {
    const boundary = CHAPTERS[0].weight / TOTAL_WEIGHT;
    const r = progressToChapter(boundary);
    expect(r.index).toBe(0);
    expect(r.local).toBeCloseTo(1);
    expect(progressToChapter(boundary + 1e-9).index).toBe(1);
  });
});

describe("sampleCamera", () => {
  const out = {
    position: new Vector3(),
    target: new Vector3(),
    roll: 0,
    fov: 42,
  };

  it("starts at the hero viewpoint", () => {
    sampleCamera(0, out);
    expect(out.position.z).toBeCloseTo(7.5, 1);
    expect(out.fov).toBeCloseTo(42, 1);
    expect(out.roll).toBeCloseTo(0, 2);
  });

  it("moves the camera forward (negative z) as progress increases", () => {
    sampleCamera(0, out);
    const zStart = out.position.z;
    sampleCamera(1, out);
    expect(out.position.z).toBeLessThan(zStart - 10);
  });

  it("target is always distinct from position", () => {
    for (const p of [0, 0.2, 0.5, 0.8, 1]) {
      sampleCamera(p, out);
      expect(out.position.distanceTo(out.target)).toBeGreaterThan(0.5);
    }
  });

  it("keeps roll and fov within sane cinematic bounds everywhere", () => {
    for (let i = 0; i <= 100; i++) {
      sampleCamera(i / 100, out);
      expect(Math.abs(out.roll)).toBeLessThanOrEqual(0.1);
      expect(out.fov).toBeGreaterThanOrEqual(40);
      expect(out.fov).toBeLessThanOrEqual(54);
    }
  });

  it("clamps progress outside 0..1", () => {
    sampleCamera(0, out);
    const z0 = out.position.z;
    sampleCamera(-1, out);
    expect(out.position.z).toBeCloseTo(z0);
  });
});
