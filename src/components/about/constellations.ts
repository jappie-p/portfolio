import type { SkillGroupId } from "@/data/skills";

/** Where a star's name sits: right, left, above or below it. */
export type Side = "r" | "l" | "t" | "b";
/** A star in its constellation's box, in viewBox units (BOX_W by BOX_H). */
export type Spot = { x: number; y: number; side: Side };
/** One skill group drawn as a constellation: a spot per skill and the lines between them. */
export type Shape = { stars: Record<string, Spot>; lines: [string, string][] };

/** Every constellation sits in a box of this shape (4:3); its name is set top left. */
export const BOX_W = 100;
export const BOX_H = 75;

/** Hand-placed figures, one per group, with room left for every name. */
export const SHAPES: Record<SkillGroupId, Shape> = {
  // a kite with two ribbons
  frontend: {
    stars: {
      React: { x: 36, y: 16, side: "r" },
      TypeScript: { x: 12, y: 36, side: "t" },
      Tailwind: { x: 64, y: 30, side: "r" },
      "Next.js": { x: 40, y: 46, side: "b" },
      "HTML & CSS": { x: 14, y: 64, side: "r" },
      SwiftUI: { x: 82, y: 58, side: "b" },
    },
    lines: [
      ["TypeScript", "React"],
      ["React", "Tailwind"],
      ["Tailwind", "Next.js"],
      ["Next.js", "TypeScript"],
      ["TypeScript", "HTML & CSS"],
      ["Tailwind", "SwiftUI"],
    ],
  },
  // a triangle with one star flung out
  motion: {
    stars: {
      "Three.js": { x: 22, y: 28, side: "t" },
      "React Three Fiber": { x: 40, y: 50, side: "r" },
      GLSL: { x: 14, y: 64, side: "r" },
      GSAP: { x: 76, y: 18, side: "b" },
    },
    lines: [
      ["Three.js", "React Three Fiber"],
      ["React Three Fiber", "GLSL"],
      ["GLSL", "Three.js"],
      ["React Three Fiber", "GSAP"],
    ],
  },
  // a dipper: the bowl and its handle
  backend: {
    stars: {
      "Node.js": { x: 21, y: 32, side: "l" },
      Express: { x: 42, y: 22, side: "t" },
      MySQL: { x: 44, y: 48, side: "b" },
      "REST APIs": { x: 22, y: 58, side: "b" },
      WebSockets: { x: 62, y: 36, side: "r" },
      Python: { x: 84, y: 56, side: "b" },
    },
    lines: [
      ["Node.js", "Express"],
      ["Express", "MySQL"],
      ["MySQL", "REST APIs"],
      ["REST APIs", "Node.js"],
      ["Express", "WebSockets"],
      ["WebSockets", "Python"],
    ],
  },
  // a W, like Cassiopeia, with one star above
  infra: {
    stars: {
      Docker: { x: 12, y: 30, side: "t" },
      Linux: { x: 30, y: 56, side: "b" },
      Proxmox: { x: 50, y: 36, side: "r" },
      Nginx: { x: 68, y: 58, side: "b" },
      systemd: { x: 88, y: 30, side: "t" },
      Tailscale: { x: 50, y: 14, side: "r" },
    },
    lines: [
      ["Docker", "Linux"],
      ["Linux", "Proxmox"],
      ["Proxmox", "Nginx"],
      ["Nginx", "systemd"],
      ["Proxmox", "Tailscale"],
    ],
  },
  // a lopsided diamond
  ai: {
    stars: {
      "Claude API": { x: 24, y: 28, side: "t" },
      MCP: { x: 60, y: 20, side: "r" },
      "AI agents": { x: 74, y: 50, side: "r" },
      Automation: { x: 36, y: 60, side: "b" },
    },
    lines: [
      ["Claude API", "MCP"],
      ["MCP", "AI agents"],
      ["AI agents", "Automation"],
      ["Automation", "Claude API"],
    ],
  },
  // a crown: an arc of six, like Corona Borealis
  tools: {
    stars: {
      Git: { x: 10, y: 32, side: "t" },
      Stripe: { x: 19, y: 53, side: "l" },
      Mollie: { x: 35, y: 65, side: "b" },
      Figma: { x: 56, y: 67, side: "b" },
      Playwright: { x: 74, y: 56, side: "r" },
      Vitest: { x: 86, y: 36, side: "t" },
    },
    lines: [
      ["Git", "Stripe"],
      ["Stripe", "Mollie"],
      ["Mollie", "Figma"],
      ["Figma", "Playwright"],
      ["Playwright", "Vitest"],
    ],
  },
};
