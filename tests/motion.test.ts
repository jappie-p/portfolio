import { describe, it, expect, vi, afterEach } from "vitest";
import { prefersReducedMotion } from "@/lib/motion";

afterEach(() => vi.unstubAllGlobals());

describe("prefersReducedMotion", () => {
  it("returns true when the media query matches", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q.includes("reduce"),
      media: q,
      addEventListener() {},
      removeEventListener() {},
    }));
    expect(prefersReducedMotion()).toBe(true);
  });
  it("returns false when it does not match", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: false,
      media: q,
      addEventListener() {},
      removeEventListener() {},
    }));
    expect(prefersReducedMotion()).toBe(false);
  });
});
