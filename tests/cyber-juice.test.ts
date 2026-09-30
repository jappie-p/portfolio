import { describe, it, expect } from "vitest";
import {
  BOOT,
  addTrauma,
  bootFront,
  bootPower,
  decayTrauma,
  easeOutBack,
  hitEnvelope,
  panelOpen,
  salvoPeriod,
  shakeAmount,
} from "@/components/cyber/lib/juice";
import { buildWallCells, nearestCell } from "@/components/cyber/lib/hex";
import { WALL } from "@/components/cyber/lib/layout";
import { WALL_ICON_COUNT } from "@/components/cyber/lib/icons";

describe("salvo rhythm", () => {
  it("fires faster as the attack grows", () => {
    for (const flood of [0, 1, 2]) expect(salvoPeriod(1, flood, 0.5)).toBeLessThan(salvoPeriod(0.3, flood, 0.5));
  });
  it("stays in a readable range, never a blur and never a lull", () => {
    for (const attack of [0, 0.5, 1])
      for (const jitter of [0, 1])
        for (const flood of [0, 1, 2]) {
          const p = salvoPeriod(attack, flood, jitter);
          expect(p).toBeGreaterThan(1);
          expect(p).toBeLessThan(5);
        }
  });
  it("flashes instantly and fades fast", () => {
    expect(hitEnvelope(-0.1)).toBe(0);
    expect(hitEnvelope(0)).toBe(1);
    expect(hitEnvelope(0.5)).toBeLessThan(0.1);
  });
});

describe("camera trauma", () => {
  it("adds up to a cap, bleeds off over time, and shakes with its square", () => {
    expect(addTrauma(0.8, 0.5)).toBe(1);
    expect(decayTrauma(0.5, 0.1)).toBeLessThan(0.5);
    expect(decayTrauma(0.05, 1)).toBe(0);
    expect(shakeAmount(0.3)).toBeCloseTo(0.09);
    expect(shakeAmount(1)).toBe(1);
  });
});

describe("power-on", () => {
  it("keeps everything dark until the section is in view", () => {
    const cells = buildWallCells({ ...WALL, iconCount: WALL_ICON_COUNT });
    const first = Math.min(...cells.map((c) => c.s));
    expect(bootFront(-1)).toBeLessThan(first - 1);
    expect(bootPower(-1)).toBe(0);
    expect(panelOpen(-1, 0)).toBe(0);
  });
  it("sweeps the light front along the whole wall, then brings the traffic up", () => {
    const cells = buildWallCells({ ...WALL, iconCount: WALL_ICON_COUNT });
    const last = Math.max(...cells.map((c) => c.s));
    let prev = bootFront(0);
    for (let t = 0.1; t < 4; t += 0.1) {
      expect(bootFront(t)).toBeGreaterThanOrEqual(prev);
      prev = bootFront(t);
    }
    expect(bootFront(3)).toBeGreaterThan(last + 1);
    expect(bootPower(BOOT.powerAt)).toBe(0);
    expect(bootPower(BOOT.powerAt + BOOT.powerDuration)).toBe(1);
  });
  it("opens the screens one after another", () => {
    const t = BOOT.panelsAt + BOOT.panelDuration * 0.5;
    expect(panelOpen(t, 0)).toBeGreaterThan(panelOpen(t, 1));
    expect(panelOpen(10, 5)).toBe(1);
  });
  it("snaps open with a small overshoot", () => {
    expect(easeOutBack(0)).toBeCloseTo(0);
    expect(easeOutBack(1)).toBeCloseTo(1);
    expect(Math.max(...Array.from({ length: 20 }, (_, i) => easeOutBack(i / 19)))).toBeGreaterThan(1);
  });
});

describe("nearestCell", () => {
  const cells = buildWallCells({ ...WALL, iconCount: WALL_ICON_COUNT });
  it("locks onto a cell's own centre", () => {
    for (const c of cells.filter((_, i) => i % 7 === 0)) {
      const n = nearestCell(c.s + 0.1, c.y - 0.1, WALL);
      expect(n.s).toBeCloseTo(c.s);
      expect(n.y).toBeCloseTo(c.y);
    }
  });
  it("never locks outside the wall", () => {
    const n = nearestCell(-50, 40, WALL);
    const top = Math.max(...cells.map((c) => c.y));
    expect(n.y).toBeLessThanOrEqual(top + 1e-9);
    expect(n.s).toBeGreaterThanOrEqual(Math.min(...cells.map((c) => c.s)) - 1e-9);
  });
});
