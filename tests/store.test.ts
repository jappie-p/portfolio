import { describe, it, expect, beforeEach } from "vitest";
import { useJourney } from "@/lib/store";

describe("journey store", () => {
  beforeEach(() => {
    useJourney.setState({
      loaded: false,
      progress: 0,
      chapter: 0,
      chapterProgress: 0,
      webglOk: null,
    });
  });

  it("has sane defaults", () => {
    const s = useJourney.getState();
    expect(s.loaded).toBe(false);
    expect(s.progress).toBe(0);
    expect(s.webglOk).toBeNull();
  });

  it("setScroll updates progress and derived chapter", () => {
    useJourney.getState().setScroll(0);
    expect(useJourney.getState().chapter).toBe(0);
    useJourney.getState().setScroll(0.99);
    const s = useJourney.getState();
    expect(s.progress).toBeCloseTo(0.99);
    expect(s.chapter).toBe(5); // contact
    expect(s.chapterProgress).toBeGreaterThan(0.5);
  });

  it("setLoaded and setWebglOk flip flags", () => {
    useJourney.getState().setLoaded(true);
    useJourney.getState().setWebglOk(true);
    expect(useJourney.getState().loaded).toBe(true);
    expect(useJourney.getState().webglOk).toBe(true);
  });
});
