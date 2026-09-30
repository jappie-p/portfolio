import { describe, it, expect } from "vitest";
import { SQRT3, buildWallCells, hexCorners, hexPitch } from "@/components/cyber/lib/hex";
import { WALL } from "@/components/cyber/lib/layout";
import { WALL_ICON_COUNT } from "@/components/cyber/lib/icons";

const grid = { ...WALL, iconCount: WALL_ICON_COUNT };

describe("hexCorners", () => {
  it("returns six corners on the circumradius", () => {
    const pts = hexCorners(2);
    expect(pts).toHaveLength(6);
    for (const [x, y] of pts) expect(Math.hypot(x, y)).toBeCloseTo(2);
  });
  it("puts a corner on the right for flat-top and on top for pointy-top", () => {
    expect(hexCorners(1)[0][0]).toBeCloseTo(1);
    expect(hexCorners(1)[0][1]).toBeCloseTo(0);
    const top = hexCorners(1, true).reduce((a, b) => (b[1] > a[1] ? b : a));
    expect(top[0]).toBeCloseTo(0);
    expect(top[1]).toBeCloseTo(1);
  });
});

describe("buildWallCells", () => {
  const cells = buildWallCells(grid);
  const pitch = hexPitch(WALL.cellR, WALL.gap);

  it("is deterministic", () => {
    expect(buildWallCells(grid)).toEqual(cells);
  });
  it("never overlaps: neighbours are at least one pitch apart", () => {
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        const d = Math.hypot(cells[i].s - cells[j].s, cells[i].y - cells[j].y);
        expect(d).toBeGreaterThan(pitch.d - 1e-9);
      }
    }
    expect(pitch.d).toBeCloseTo(SQRT3 * WALL.cellR + WALL.gap);
  });
  it("leaves the core shield's footprint open", () => {
    for (const c of cells) expect(Math.hypot(c.s, c.y - WALL.coreY)).toBeGreaterThanOrEqual(WALL.coreR * 0.92);
  });
  it("stands every cell on or above the floor, with a valid icon or a blank face", () => {
    const apothem = (SQRT3 / 2) * WALL.cellR;
    for (const c of cells) {
      expect(c.y - apothem).toBeGreaterThanOrEqual(0);
      expect(c.icon === -1 || (c.icon >= 0 && c.icon < WALL_ICON_COUNT)).toBe(true);
    }
  });
  it("fills the whole wall", () => {
    const [c0, c1] = WALL.cols;
    const full = (c1 - c0 + 1) * WALL.rows;
    expect(cells.length).toBeGreaterThan(full - 12);
    expect(cells.length).toBeLessThan(full);
  });
});
