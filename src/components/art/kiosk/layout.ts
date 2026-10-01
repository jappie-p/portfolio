export type Rng = () => number;

/** Seeded PRNG (mulberry32), so the lights and leaves always land the same. */
export function rng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const between = (r: Rng, a: number, b: number) => a + (b - a) * r();

export function smoothstep(a: number, b: number, v: number): number {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export type KioskLayout = {
  w: number;
  h: number;
  wide: boolean;
  /** 1 at the desktop panel size */
  u: number;
  /** centre of the two kiosk screens, and the floor they stand on */
  cx: number;
  cy: number;
  base: number;
  /** half the width the kiosks take up */
  half: number;
  /** the copy's side: things fade out from `from` to `to` along the axis */
  calm: { axis: "x" | "y"; from: number; to: number };
};

// Mirrors the School project panel: a max-w-6xl grid with 1.35fr/1fr columns
// and a 4rem gap from lg, the kiosk stage (max-w-lg, 450px tall) centred in its
// column, the panel padded pt-24 pb-20 px-12 (px-6 on phones).
export function kioskLayout(w: number, h: number): KioskLayout {
  if (w >= 1024) {
    const inner = Math.min(w - 96, 1152);
    const colW = ((inner - 64) * 1.35) / 2.35;
    const left = (w - inner) / 2;
    const cx = left + colW / 2;
    const cy = Math.max(h / 2 + 8, 96 + 225);
    const text = left + colW + 64;
    return { w, h, wide: true, u: 1, cx, cy, base: cy + 210, half: Math.min(256, colW / 2), calm: { axis: "x", from: text - 90, to: text + 220 } };
  }
  const sm = w >= 640;
  const half = Math.min(256, (w - (sm ? 96 : 48)) / 2);
  const u = half / 256;
  const top = 96;
  // the kiosks are portrait screens on a foot: about 0.72 of the stage wide, tall
  const tall = 0.72 * half * 2 + 32;
  return { w, h, wide: false, u, cx: w / 2, cy: top + tall / 2, base: top + tall - 8 * u, half, calm: { axis: "y", from: top + tall + 30, to: top + tall + 260 } };
}

/** 0 where the room is, 1 behind the copy. */
export function calmAt(L: KioskLayout, x: number, y: number): number {
  const c = L.calm;
  return smoothstep(c.from, c.to, c.axis === "x" ? x : y);
}
