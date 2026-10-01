import { describe, it, expect } from "vitest";
import {
  AI_BEATS,
  AI_CAMERA_KEYS,
  aiCameraPose,
  bezier,
  chapterMix,
  hubMix,
  hubPosition,
  jarvisMix,
  latticeLayout,
  networkEnergy,
} from "@/components/ai/lib/ai-math";

describe("AI scene story", () => {
  it("has one camera key per chapter, on its beat", () => {
    expect(AI_CAMERA_KEYS.map((k) => k.at)).toEqual([...AI_BEATS]);
  });

  it("shows the Jarvis pipeline on its own chapter only", () => {
    expect(jarvisMix(AI_BEATS[1])).toBe(1);
    expect(jarvisMix(AI_BEATS[0])).toBe(0);
    expect(jarvisMix(AI_BEATS[2])).toBe(0);
  });

  it("assembles the hub on the way to the last chapter", () => {
    expect(hubMix(AI_BEATS[1])).toBe(0);
    expect(hubMix(AI_BEATS[2])).toBe(1);
    for (let p = 0; p <= 1; p += 0.05) expect(hubMix(p + 0.05)).toBeGreaterThanOrEqual(hubMix(p));
  });

  it("makes the network busier with each chapter, never idle", () => {
    expect(networkEnergy(0)).toBeGreaterThan(0.4);
    expect(networkEnergy(1)).toBe(1);
  });

  it("fades a chapter out evenly on both sides", () => {
    expect(chapterMix(0.3, 0.5, 0.4)).toBeCloseTo(chapterMix(0.7, 0.5, 0.4));
  });
});

describe("AI scene camera", () => {
  it("moves smoothly: no jumps between neighbouring scroll positions", () => {
    let prev = aiCameraPose(0, 16 / 9);
    for (let p = 0.01; p <= 1; p += 0.01) {
      const pose = aiCameraPose(p, 16 / 9);
      const jump = Math.hypot(...pose.position.map((v, i) => v - prev.position[i]));
      expect(jump).toBeLessThan(0.6);
      prev = pose;
    }
  });

  it("widens the lens on narrow screens instead of cropping the scene", () => {
    expect(aiCameraPose(0, 9 / 19.5).fov).toBeGreaterThan(aiCameraPose(0, 16 / 9).fov);
  });
});

describe("AI scene layouts", () => {
  it("builds the same network every visit", () => {
    const a = latticeLayout();
    const b = latticeLayout();
    expect(Array.from(a.nodes)).toEqual(Array.from(b.nodes));
    expect(Array.from(a.edges)).toEqual(Array.from(b.edges));
  });

  it("keeps the network out from between the camera and the core", () => {
    const { nodes } = latticeLayout();
    for (let i = 0; i < nodes.length / 3; i++) {
      const [x, z] = [nodes[i * 3], nodes[i * 3 + 2]];
      expect(z > 2 && Math.abs(x) < 9).toBe(false);
    }
  });

  it("links every edge to two real nodes", () => {
    const { nodes, edges } = latticeLayout();
    const n = nodes.length / 3;
    for (const i of edges) expect(i).toBeLessThan(n);
  });

  it("spaces the tools evenly round the core, none straight behind it", () => {
    const pts = [0, 1, 2, 3, 4].map((i) => hubPosition(i, 5));
    for (const [x, , z] of pts) {
      expect(Math.hypot(x, z)).toBeCloseTo(6, 5);
      expect(!(z < 0 && Math.abs(x) < 1)).toBe(true);
    }
  });

  it("runs a route from its start to its end", () => {
    expect(bezier([0, 0, 0], [1, 2, 0], [2, 0, 0], 0)).toEqual([0, 0, 0]);
    expect(bezier([0, 0, 0], [1, 2, 0], [2, 0, 0], 1)).toEqual([2, 0, 0]);
  });
});
