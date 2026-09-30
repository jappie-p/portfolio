import { describe, it, expect } from "vitest";
import {
  BEATS,
  CAMERA_KEYS,
  alertLevel,
  attackIntensity,
  cameraPose,
  defenseLevel,
  lensForAspect,
  trackProgress,
  visibleLogCount,
  LOG_AT,
} from "@/components/cyber/lib/scene-math";
import { CORE, IMPACTS, WALL, WALL_DIR, WALL_NORMAL, wallToWorld } from "@/components/cyber/lib/layout";

const sub = (a: number[], b: number[]) => a.map((v, i) => v - b[i]);
const dot = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);
const len = (a: number[]) => Math.hypot(...a);
const samples = (n: number) => Array.from({ length: n + 1 }, (_, i) => i / n);

describe("trackProgress", () => {
  it("runs from 0 at the first panel to 1 at the last", () => {
    expect(trackProgress(0, 4000, 1000)).toBe(0);
    expect(trackProgress(1000, 4000, 1000)).toBeCloseTo(1 / 3);
    expect(trackProgress(3000, 4000, 1000)).toBe(1);
  });
  it("clamps overscroll and handles a track that does not scroll", () => {
    expect(trackProgress(-40, 4000, 1000)).toBe(0);
    expect(trackProgress(3200, 4000, 1000)).toBe(1);
    expect(trackProgress(0, 1000, 1000)).toBe(0);
  });
});

describe("layout", () => {
  it("maps wall-local axes to an orthonormal world frame", () => {
    expect(len(WALL_DIR)).toBeCloseTo(1);
    expect(len(WALL_NORMAL)).toBeCloseTo(1);
    expect(dot(WALL_DIR, WALL_NORMAL)).toBeCloseTo(0);
    expect(wallToWorld(1, 0, 0)).toEqual(WALL_DIR);
    expect(wallToWorld(0, 2, 0)[1]).toBe(2);
  });
  it("puts the floods on the attacker side (right of the core), inside the wall's height", () => {
    for (const i of IMPACTS) {
      expect(i.s).toBeGreaterThan(WALL.coreR);
      expect(i.y).toBeGreaterThan(0.5);
      expect(i.y).toBeLessThan(5);
    }
  });
});

describe("cameraPose", () => {
  it("has one key per chapter, and sits exactly on each at its chapter", () => {
    expect(CAMERA_KEYS.map((k) => k.at)).toEqual([...BEATS]);
    for (const key of CAMERA_KEYS) {
      const pose = cameraPose(key.at, 16 / 9);
      const flat = sub(pose.position, CORE);
      expect(Math.hypot(flat[0], flat[2])).toBeCloseTo(key.dist, 5);
      expect(pose.position[1]).toBeCloseTo(key.height, 5);
      expect(pose.target.map((v, i) => v - CORE[i])).toEqual(key.look.map((v) => expect.closeTo(v, 5)));
      expect(pose.roll).toBeCloseTo((key.roll * Math.PI) / 180, 5);
    }
  });
  it("moves continuously between chapters, with no jumps", () => {
    let prev = cameraPose(0, 16 / 9).position;
    for (const p of samples(600).slice(1)) {
      const cur = cameraPose(p, 16 / 9).position;
      expect(len(sub(cur, prev))).toBeLessThan(0.08);
      prev = cur;
    }
  });
  it("ends closer to the core than it starts", () => {
    expect(len(sub(cameraPose(1, 16 / 9).position, CORE))).toBeLessThan(len(sub(cameraPose(0, 16 / 9).position, CORE)));
  });
  it("always stays in front of the wall and above the floor", () => {
    for (const aspect of [0.46, 1, 16 / 10, 16 / 9, 2.4]) {
      for (const p of samples(60)) {
        const { position } = cameraPose(p, aspect);
        expect(dot(sub(position, CORE), WALL_NORMAL)).toBeGreaterThan(2);
        expect(position[1]).toBeGreaterThan(1);
      }
    }
  });
});

describe("lensForAspect", () => {
  const halfWidth = (fov: number, aspect: number) => Math.tan(((fov / 2) * Math.PI) / 180) * aspect;
  it("keeps the 40deg lens on 16:9 and wider", () => {
    expect(lensForAspect(16 / 9)).toEqual({ fov: 40, dolly: 1 });
    expect(lensForAspect(2.4)).toEqual({ fov: 40, dolly: 1 });
  });
  it("widens the lens on 16:10 so the horizontal framing matches 16:9", () => {
    const { fov, dolly } = lensForAspect(16 / 10);
    expect(fov).toBeGreaterThan(40);
    expect(dolly).toBe(1);
    expect(halfWidth(fov, 16 / 10)).toBeCloseTo(halfWidth(40, 16 / 9), 5);
  });
  it("caps the lens on phones and only pulls back a little", () => {
    const { fov, dolly } = lensForAspect(390 / 844);
    expect(fov).toBe(52);
    expect(dolly).toBeGreaterThan(1);
    expect(dolly).toBeLessThan(1.4);
  });
});

describe("story across the chapters", () => {
  it("is under attack on arrival, peaks at the attack chapter, is pushed back, then hums", () => {
    expect(attackIntensity(BEATS[0])).toBeCloseTo(0.55);
    expect(attackIntensity(BEATS[1])).toBeCloseTo(1);
    expect(attackIntensity(BEATS[2])).toBeCloseTo(0.75);
    expect(attackIntensity(BEATS[3])).toBeCloseTo(0.22);
    for (const p of samples(100)) {
      expect(attackIntensity(p)).toBeGreaterThanOrEqual(0);
      expect(attackIntensity(p)).toBeLessThanOrEqual(1);
    }
  });
  it("pushes back hardest in the defence chapter", () => {
    expect(defenseLevel(BEATS[0])).toBe(0);
    expect(defenseLevel(BEATS[1])).toBe(0);
    expect(defenseLevel(BEATS[2])).toBeCloseTo(1);
    expect(defenseLevel(BEATS[3])).toBeCloseTo(0.55);
  });
  it("shows the alerts escalate, then blocked by the defence chapter", () => {
    expect(alertLevel(BEATS[0])).toBe("high");
    expect(alertLevel(BEATS[1])).toBe("critical");
    expect(alertLevel(BEATS[2])).toBe("blocked");
    expect(alertLevel(BEATS[3])).toBe("blocked");
  });
  it("starts the log with four lines and adds the rest in order", () => {
    expect(visibleLogCount(0)).toBe(4);
    expect(visibleLogCount(1)).toBe(LOG_AT.length);
    let prev = 0;
    for (const p of samples(100)) {
      const n = visibleLogCount(p);
      expect(n).toBeGreaterThanOrEqual(prev);
      prev = n;
    }
  });
});
