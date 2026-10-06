import { describe, it, expect } from "vitest";
import { qrModules, reedSolomon } from "@/components/school/gallery/three/breakout/qr";

describe("receipt QR code", () => {
  it("computes Reed-Solomon check codewords (the HELLO WORLD 1-M example)", () => {
    const data = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17];
    expect(reedSolomon(data, 10)).toEqual([196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
  });

  it("lays out a version 3 symbol: finders, timing, alignment, dark module", () => {
    const m = qrModules("https://kiosk.hyphosting.com");
    expect(m).toHaveLength(29);
    expect(m.every((row) => row.length === 29)).toBe(true);
    const finder = (x0: number, y0: number) => {
      for (let y = 0; y < 7; y++)
        for (let x = 0; x < 7; x++) {
          const ring = Math.max(Math.abs(x - 3), Math.abs(y - 3));
          expect(m[y0 + y][x0 + x]).toBe(ring !== 2);
        }
    };
    finder(0, 0);
    finder(22, 0);
    finder(0, 22);
    for (let i = 8; i < 21; i++) {
      expect(m[6][i]).toBe(i % 2 === 0);
      expect(m[i][6]).toBe(i % 2 === 0);
    }
    expect(m[22][22]).toBe(true);
    expect(m[21][22]).toBe(false);
    expect(m[20][22]).toBe(true);
    expect(m[21][8]).toBe(true);
  });

  it("refuses text longer than the symbol holds", () => {
    expect(() => qrModules("x".repeat(43))).toThrow();
  });
});
