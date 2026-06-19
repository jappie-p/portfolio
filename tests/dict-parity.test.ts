import { describe, it, expect } from "vitest";
import { nl } from "@/i18n/nl";
import { en } from "@/i18n/en";

function keyPaths(obj: unknown, prefix = ""): string[] {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    return Object.keys(obj).flatMap((k) =>
      keyPaths((obj as Record<string, unknown>)[k], prefix ? `${prefix}.${k}` : k),
    );
  }
  return [prefix];
}

describe("dictionary parity (nl <-> en)", () => {
  it("has identical key sets", () => {
    expect(keyPaths(nl).sort()).toEqual(keyPaths(en).sort());
  });
  it("has no empty strings", () => {
    for (const d of [nl, en]) {
      for (const p of keyPaths(d)) {
        const val = p.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], d);
        expect(typeof val === "string" && val.length > 0).toBe(true);
      }
    }
  });
});
