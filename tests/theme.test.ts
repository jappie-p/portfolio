import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

const css = readFileSync(resolve(__dirname, "../src/app/globals.css"), "utf8");

describe("globals.css dark theme", () => {
  it("declares the dark color-scheme", () => {
    expect(css).toMatch(/color-scheme:\s*dark/);
  });
  it("defines the core tokens", () => {
    for (const t of ["--canvas", "--glass-bg", "--ink", "--leaf", "--cyber-cyan", "--honey", "--focus-ring"]) {
      expect(css).toContain(t);
    }
  });
  it("defines the .glass primitive", () => {
    expect(css).toMatch(/\.glass\s*\{/);
    expect(css).toMatch(/backdrop-filter:\s*blur/);
  });
  it("keeps component classes in the components layer, so utilities can override them", () => {
    const layer = css.slice(css.indexOf("@layer components {"));
    for (const cls of [".btn {", ".chip {", ".glass {", ".label {"]) expect(layer).toContain(cls);
  });
  it("does not bring back the old EMBER look", () => {
    expect(css).not.toMatch(/--void/);
    expect(css).not.toMatch(/\.grain\b/);
  });
  it("names its own keyframes apart from Tailwind's (spin rotates the element)", () => {
    expect(css).not.toMatch(/@keyframes spin\b/);
  });
});
