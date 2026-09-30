import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { WORLD_DOTS, projectLatLon } from "@/data/world-dots";
import { WorldMap } from "@/components/contact/WorldMap";

const DOT = /M(-?[\d.]+) (-?[\d.]+)h0/g;
const dots = [...WORLD_DOTS.d.matchAll(DOT)].map(([, x, y]) => [Number(x), Number(y)] as const);

const nearestDist = (x: number, y: number) => Math.min(...dots.map(([dx, dy]) => Math.hypot(dx - x, dy - y)));

describe("WORLD_DOTS", () => {
  it("draws a non-empty grid well under the size budget", () => {
    expect(dots.length).toBeGreaterThan(0);
    expect(WORLD_DOTS.d.length).toBeGreaterThan(0);
    expect(WORLD_DOTS.d.length).toBeLessThan(40_000);
  });

  it("keeps a sane dot count for a world map", () => {
    expect(dots.length).toBeGreaterThanOrEqual(1800);
    expect(dots.length).toBeLessThanOrEqual(3200);
  });
});

describe("projectLatLon", () => {
  it("places Utrecht inside the viewBox", () => {
    const [x, y] = projectLatLon(52.09, 5.12);
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThanOrEqual(WORLD_DOTS.width);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThanOrEqual(WORLD_DOTS.height);
  });

  it("lands on or near a dot for Utrecht, so the marker sits on land", () => {
    const [x, y] = projectLatLon(52.09, 5.12);
    expect(nearestDist(x, y)).toBeLessThanOrEqual(1.5 * WORLD_DOTS.step);
  });

  it("finds nothing nearby for a Pacific Ocean point", () => {
    const [x, y] = projectLatLon(0, -150);
    expect(nearestDist(x, y)).toBeGreaterThan(5 * WORLD_DOTS.step);
  });
});

describe("WorldMap", () => {
  const html = renderToStaticMarkup(WorldMap({ label: "Utrecht, NL", alt: "World map highlighting Utrecht, Netherlands" }));

  it("renders one accessible image carrying the alt text, not a canvas or img", () => {
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="World map highlighting Utrecht, Netherlands"');
    expect(html).not.toContain("<canvas");
    expect(html).not.toContain("<img");
  });

  it("draws the dot grid twice (base layer, then the spotlight tint) and nothing per-dot", () => {
    expect(html.match(/<path/g)).toHaveLength(2);
    expect(html.split(WORLD_DOTS.d)).toHaveLength(3); // the literal d string occurs exactly twice
  });

  it("shows the label text on a visible chip, not just in the alt text", () => {
    expect(html).toContain("Utrecht, NL");
  });

  it("sizes to its viewBox with no fixed pixel box, so it cannot cause layout shift", () => {
    expect(html).toContain(`viewBox="${WORLD_DOTS.viewBox}"`);
    expect(html).not.toMatch(/width="\d+" height="\d+"/);
  });
});
