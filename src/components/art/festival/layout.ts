import { smoothstep } from "./math";

export type Box = { x0: number; y0: number; x1: number; y1: number };

export type Layout = {
  w: number;
  h: number;
  /** phones left and text right (lg), or phones above the text */
  wide: boolean;
  /** 1 at the desktop panel size; every length in the scene scales with it */
  u: number;
  /** where the three phones sit */
  fan: Box;
  /** stage centre, wings, top of the roof truss and the deck */
  cx: number;
  stageL: number;
  stageR: number;
  roof: number;
  deck: number;
  horizon: number;
  /** the side the copy sits on: light fades out from `from` to `to` along the axis */
  calm: { axis: "x" | "y"; from: number; to: number };
  /** right edge of the copy on wide screens (for the skyline) */
  textR: number;
};

// Mirrors the School project panel so the stage stands right behind the
// phones at any size: a max-w-6xl grid with 1.35fr/1fr columns and a 4rem gap
// from lg, the phone fan centred in its column, the panel padded pt-24 pb-20
// px-12 (px-6 on phones). Change these if that panel's layout changes.
const INNER = 1152;
const GAP = 64;
const FAN_H = 440;

export function computeLayout(w: number, h: number): Layout {
  const wide = w >= 1024;
  let fan: Box;
  let calm: Layout["calm"];
  let textR = w;
  if (wide) {
    const inner = Math.min(w - 96, INNER);
    const colW = ((inner - GAP) * 1.35) / 2.35;
    const left = (w - inner) / 2;
    const cx = left + colW / 2;
    const fw = Math.min(576, colW) * 0.96;
    const cy = Math.max(h / 2 + 8, 96 + 270);
    fan = { x0: cx - fw / 2, x1: cx + fw / 2, y0: cy - FAN_H / 2, y1: cy + FAN_H / 2 };
    const text = left + colW + GAP;
    calm = { axis: "x", from: text - 70, to: text + 230 };
    textR = left + inner;
  } else {
    const sm = w >= 640;
    const fw = Math.min(576, w - (sm ? 96 : 48));
    const box = sm ? 540 : 440;
    const fh = box * 0.82;
    const y0 = 96 + (box - fh) / 2;
    fan = { x0: (w - fw) / 2, x1: (w + fw) / 2, y0, y1: y0 + fh };
    calm = { axis: "y", from: 96 + box + 20, to: 96 + box + 240 };
  }
  const fw = fan.x1 - fan.x0;
  const fh = fan.y1 - fan.y0;
  const u = fh / FAN_H;
  const cx = (fan.x0 + fan.x1) / 2;
  const half = Math.min(fw * 0.62, w * 0.5 - 4 * u);
  const deck = fan.y1 - 6 * u;
  return {
    w,
    h,
    wide,
    u,
    fan,
    cx,
    stageL: cx - half,
    stageR: cx + half,
    roof: fan.y0 - 50 * u,
    deck,
    horizon: deck - 10 * u,
    calm,
    textR,
  };
}

/** 0 where the show is, 1 behind the copy. */
export function calmAt(L: Layout, x: number, y: number): number {
  const c = L.calm;
  return smoothstep(c.from, c.to, c.axis === "x" ? x : y);
}
