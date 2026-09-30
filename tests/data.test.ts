import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { PROJECTS, ARCHIVE, formatPeriod } from "@/data/projects";
import { SITE } from "@/data/site";
import { LEARNING, SKILLS, SOFT_SKILLS } from "@/data/skills";
import { DIAGRAMS } from "@/data/diagrams";
import { SNIPPETS, type SnippetSlug } from "@/data/snippets";
import { PROJECT_NAMES, TOPICS } from "@/lib/chapters";
import { nl } from "@/i18n/nl";
import { en } from "@/i18n/en";

const DASHES = /[–—]/;
const PUBLIC = path.join(__dirname, "..", "public");
const SLUGS = Object.keys(SNIPPETS) as SnippetSlug[];
const code = (slug: SnippetSlug) => readFileSync(path.join(__dirname, "..", "src", "data", "snippets", `${slug}.txt`), "utf8");

describe("project data", () => {
  it("has facts for every named project, and every topic's projects exist", () => {
    expect(Object.keys(PROJECTS).sort()).toEqual(Object.keys(PROJECT_NAMES).sort());
    for (const t of TOPICS) for (const slug of t.projects) expect(PROJECTS[slug]).toBeTruthy();
  });
  it("links out over https only", () => {
    for (const p of Object.values(PROJECTS)) {
      if (p.live) expect(p.live).toMatch(/^https:\/\//);
      if (p.code) expect(p.code).toMatch(/^https:\/\//);
    }
    for (const a of ARCHIVE) if (a.href) expect(a.href).toMatch(/^https:\/\//);
    expect(SITE.github).toMatch(/^https:\/\//);
  });
  it("shows a live site with screenshots for every website project", () => {
    for (const slug of TOPICS.find((t) => t.id === "websites")!.projects) {
      expect(PROJECTS[slug].live).toBeTruthy();
      expect(PROJECTS[slug].shots).toBeTruthy();
    }
  });
  it("gives every project a picture: screenshots, screens, a video or a diagram", () => {
    for (const p of Object.values(PROJECTS)) expect(Boolean(p.shots || p.screens || p.trailer || p.diagram)).toBe(true);
  });
  it("ships every trailer as mp4, webm and a poster", () => {
    for (const p of Object.values(PROJECTS)) {
      if (!p.trailer) continue;
      for (const ext of ["mp4", "webm", "jpg"]) {
        const file = path.join(PUBLIC, "trailers", `${p.trailer}.${ext}`);
        expect(existsSync(file), file).toBe(true);
        expect(statSync(file).size).toBeLessThan(3_000_000);
      }
    }
  });
  it("ships every browser-playable build it links to", () => {
    for (const p of Object.values(PROJECTS)) if (p.play) expect(existsSync(path.join(PUBLIC, p.play)), p.play).toBe(true);
  });
  it("ships the cv as pdf in both languages", () => {
    for (const file of Object.values(SITE.cv)) expect(existsSync(path.join(PUBLIC, file)), file).toBe(true);
  });
  it("marks school work, team work and the projects that matter most", () => {
    for (const slug of TOPICS.find((t) => t.id === "school")!.projects) expect(PROJECTS[slug].kind).toBe("school");
    expect(Object.values(PROJECTS).some((p) => p.team)).toBe(true);
    expect(Object.values(PROJECTS).some((p) => p.featured)).toBe(true);
  });
  it("writes periods without dashes", () => {
    expect(formatPeriod({ from: 2026, to: "now" }, "tot", "nu")).toBe("2026 tot nu");
    expect(formatPeriod({ from: 2025, to: 2026 }, "to", "now")).toBe("2025 to 2026");
    expect(formatPeriod({ from: 2026 }, "tot", "nu")).toBe("2026");
  });
  it("has copy for every skill group, soft skill, learning goal and diagram node in both languages", () => {
    for (const d of [nl, en]) {
      for (const g of SKILLS) expect(d.skills[g.id]).toBeTruthy();
      for (const id of SOFT_SKILLS) expect(d.softSkills[id].title).toBeTruthy();
      for (const id of LEARNING) expect(d.learning[id].title).toBeTruthy();
      for (const [id, def] of Object.entries(DIAGRAMS)) {
        const nodes = d.diagrams[id as keyof typeof DIAGRAMS].nodes as Record<string, string>;
        for (const key of [...def.in, ...def.out]) expect(nodes[key], `${id}.${key}`).toBeTruthy();
      }
    }
  });
});

const walk = (v: unknown): string[] =>
  typeof v === "string" ? [v] : v && typeof v === "object" ? Object.values(v).flatMap(walk) : [];

describe("copy", () => {
  it("never uses em or en dashes", () => {
    for (const s of [...walk(nl), ...walk(en)]) expect(s).not.toMatch(DASHES);
  });

  // Hard constraint from the redesign spec: the work-experience copy is public,
  // so no client or colleague names and no internal tools or URLs.
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
  it("leaks nothing internal from client or agency work", () => {
    const text = [...walk(nl), ...walk(en), ...walk(PROJECTS), ...SLUGS.map(code)].join(" \n ").toLowerCase();
    for (const term of FORBIDDEN) expect(text).not.toMatch(new RegExp(`\\b${term.replace(".", "\\.")}\\b`));
  });
});

// Code on the site is public: nothing that points at my servers or unlocks them.
describe("code snippets", () => {
  it("has a source file and a caption in both languages for every sample", () => {
    for (const slug of SLUGS) {
      expect(code(slug).trim().length).toBeGreaterThan(0);
      expect(nl.snippets[slug]).toBeTruthy();
      expect(en.snippets[slug]).toBeTruthy();
    }
  });
  it("contain no addresses, private hosts or secrets", () => {
    for (const slug of SLUGS) {
      const c = code(slug);
      expect(c, slug).not.toMatch(/\b\d{1,3}(\.\d{1,3}){3}\b/);
      expect(c, slug).not.toMatch(/\.ts\.net|tailaa|hyphosting-vps|@gmail|BEGIN [A-Z ]*PRIVATE KEY/i);
      expect(c, slug).not.toMatch(/(password|secret|token|api[_-]?key|privkey)\s*[:=]\s*["'`]?[A-Za-z0-9+/_-]{8,}/i);
    }
  });
  it("stay short enough to read in the case panel", () => {
    for (const slug of SLUGS) expect(code(slug).split("\n").length).toBeLessThanOrEqual(34);
  });
});
