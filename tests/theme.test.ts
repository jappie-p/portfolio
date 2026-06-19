import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

const css = readFileSync(resolve(__dirname, "../src/app/globals.css"), "utf8");

describe("globals.css light theme", () => {
  it("declares the light color-scheme", () => {
    expect(css).toMatch(/color-scheme:\s*light/);
  });
  it("defines the core light tokens", () => {
    for (const t of ["--canvas", "--glass-bg", "--ink", "--leaf", "--cyber-cyan", "--honey", "--focus-ring"]) {
      expect(css).toContain(t);
    }
  });
  it("defines the .glass primitive", () => {
    expect(css).toMatch(/\.glass\s*\{/);
    expect(css).toMatch(/backdrop-filter:\s*blur/);
  });
  it("removed the dark EMBER system", () => {
    expect(css).not.toMatch(/--void/);
    expect(css).not.toMatch(/color-scheme:\s*dark/);
    expect(css).not.toMatch(/\.grain\b/);
    expect(css).not.toMatch(/\.vignette\b/);
  });
});
