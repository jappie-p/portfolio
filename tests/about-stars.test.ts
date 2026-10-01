import { describe, it, expect } from "vitest";
import { SKILL_STARS, starRadius, usesOf } from "@/components/about/skill-stars";
import { SHAPES } from "@/components/about/constellations";
import { SKILLS } from "@/data/skills";

const count = (skill: string) => usesOf(skill).length;
const names = (skill: string) => usesOf(skill).map((u) => (u.kind === "project" ? u.slug : u.id));

// A star's size is how many projects on the page list the skill in their
// stack: counted from the data, never a level someone typed in.
describe("skill stars", () => {
  it("count the projects whose stack lists a skill", () => {
    expect(names("Node.js")).toEqual(["hyphosting", "louisa", "jarvis", "go-to-guy", "zelda", "kiosk"]);
    expect(count("Express")).toBe(4);
    expect(count("Docker")).toBe(2);
    expect(count("TypeScript")).toBe(2);
    expect(names("Claude API")).toEqual(["jarvis"]);
  });

  it("match names, not substrings", () => {
    // React Three Fiber is not React, and React is not React Three Fiber
    expect(names("React")).toEqual(["jarvis", "kiosk"]);
    expect(names("React Three Fiber")).toEqual(["portfolio"]);
  });

  it("know the other names a stack uses for a skill", () => {
    expect(names("WebSockets")).toEqual(["hyphosting", "zelda"]);
    expect(names("MySQL")).toEqual(["hyphosting", "louisa", "jarvis", "kiosk"]);
    expect(names("HTML & CSS")).toEqual(["amorphophallus"]);
    expect(names("Three.js")).toEqual(["portfolio"]);
  });

  it("leave a skill no project lists at zero, as the smallest star", () => {
    for (const skill of ["GSAP", "Nginx", "systemd", "Automation", "Git", "Figma", "Playwright", "Vitest"]) expect(count(skill)).toBe(0);
    const all = Object.values(SKILL_STARS).flat();
    const smallest = Math.min(...all.map((s) => starRadius(s.uses.length)));
    expect(starRadius(0)).toBe(smallest);
    expect(starRadius(6)).toBeGreaterThan(starRadius(4));
  });

  it("has a star for every skill and a place in its constellation for every star", () => {
    for (const g of SKILLS) {
      expect(SKILL_STARS[g.id].map((s) => s.name)).toEqual(g.items);
      const spots = SHAPES[g.id].stars;
      expect(Object.keys(spots).sort()).toEqual([...g.items].sort());
      for (const [a, b] of SHAPES[g.id].lines) {
        expect(spots[a], `${g.id}: ${a}`).toBeTruthy();
        expect(spots[b], `${g.id}: ${b}`).toBeTruthy();
      }
    }
  });
});
