export const TAU = Math.PI * 2;

/** Small deterministic PRNG, so the sky is the same on every visit. */
export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const between = (r: () => number, lo: number, hi: number) => lo + (hi - lo) * r();

/** n mod m, always 0..m. */
export const wrap = (n: number, m: number) => ((n % m) + m) % m;
