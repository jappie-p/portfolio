import { describe, it, expect } from "vitest";
import { FACTS, LIVE_SITES } from "@/components/about/facts";
import { MAX_LEVEL, SKILL_TREE, usesOf } from "@/components/about/levels";
import { SKILLS } from "@/data/skills";

const count = (skill: string) => usesOf(skill).length;
const names = (skill: string) => usesOf(skill).map((u) => (u.kind === "project" ? u.slug : u.id));

// A skill's level is how many projects on the page list it in their stack:
// counted from the data, never a level someone typed in.
describe("skill levels", () => {
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

  it("leave a skill no project lists at zero", () => {
    for (const skill of ["GSAP", "Nginx", "systemd", "Automation", "Git", "Figma", "Playwright", "Vitest"]) expect(count(skill)).toBe(0);
  });

  it("has a node for every skill, in its branch, levelled from the data and capped", () => {
    expect(SKILL_TREE.map((b) => b.id)).toEqual(SKILLS.map((g) => g.id));
    for (const [i, g] of SKILLS.entries()) expect(SKILL_TREE[i].nodes.map((n) => n.name)).toEqual(g.items);
    const node = (name: string) => SKILL_TREE.flatMap((b) => b.nodes).find((n) => n.name === name)!;
    expect(node("Node.js").level).toBe(MAX_LEVEL);
    expect(node("Express").level).toBe(4);
    expect(node("GSAP").level).toBe(0);
  });
});

describe("the player card's facts", () => {
  it("are counted from the data on the site", () => {
    expect(LIVE_SITES).toEqual([
      "https://hyphosting.com",
      "https://louisagemstones.nl",
      "https://kiosk.hyphosting.com",
      "https://utrecht.hyphosting.com",
      "https://amorphophallus.nl",
      "https://jasper.hyphosting.com",
    ]);
    expect(FACTS).toEqual({ live: 6, built: 12, company: 1 });
  });
});
