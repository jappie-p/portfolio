import { describe, it, expect } from "vitest";
import { featured, archive } from "@/data/projects";
import { story } from "@/data/story";
import { skills, stats } from "@/data/skills";

describe("projects", () => {
  it("has exactly the five featured projects in order", () => {
    expect(featured.map((p) => p.slug)).toEqual([
      "hyphosting",
      "jarvis",
      "homelab",
      "social-elephant",
      "louisa-gemstones",
    ]);
  });

  it("every featured project is complete", () => {
    for (const p of featured) {
      expect(p.title.length).toBeGreaterThan(2);
      expect(p.tagline.length).toBeGreaterThan(10);
      expect(p.tech.length).toBeGreaterThanOrEqual(3);
      expect(p.year).toMatch(/20\d\d/);
    }
  });

  it("has archive items", () => {
    expect(archive.length).toBeGreaterThanOrEqual(5);
  });
});

describe("Social Elephant sanitization (spec §5, hard constraint)", () => {
  // Forbidden: client names, colleague names, internal tools/URLs.
  const FORBIDDEN = [
    "broekman",
    "rode winkel",
    "derodewinkel",
    "vincent",
    "nico",
    "mart",
    "timo",
    "simplicate",
    "clickup",
    "vraagposten",
    "socialelephant.nl",
    "bridge.hyphosting",
    "podcast jungle",
    "podcastjungle",
  ];

  it("no forbidden internal terms anywhere in site content", () => {
    const blob = JSON.stringify({ featured, archive, story, skills, stats }).toLowerCase();
    for (const term of FORBIDDEN) {
      expect(blob, `forbidden term "${term}" found in content`).not.toContain(term);
    }
  });
});

describe("story", () => {
  it("has copy for all six chapters", () => {
    for (const key of ["hero", "dream", "turn", "work", "craft", "contact"] as const) {
      expect(story[key]).toBeDefined();
    }
  });
});
