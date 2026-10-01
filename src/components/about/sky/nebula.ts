import { mulberry32, between } from "./rng";
import { ctx2d, glow, makeCanvas, type RGB } from "./sprites";

/** px the nebula moves per px of sideways scroll (stars: 0.2 to 0.55). */
export const NEBULA_DEPTH = 0.28;
/** The nebula is all soft, so it is painted at a quarter of the resolution. */
export const NEBULA_SCALE = 0.25;
/** Extra sky round the edges, for the mouse lean and the vertical drift. */
export const NEBULA_PAD = 24;

type Cloud = {
  /** the panel it is composed for (0 = the bio) and where it sits on that screen, 0..1 */
  panel: number;
  at: [number, number];
  /** half-size of the area the wisps fill, in screens */
  spread: [number, number];
  rgb: RGB;
  wisps: number;
  alpha: [number, number];
  /** wisp length, in screen widths */
  size: [number, number];
};

/** Each cloud is placed by the panel it is seen from, in sky the copy leaves
 *  open: round the portrait, the empty corners, the open right of the last
 *  panel. Panning, each one slides off before the next panel's copy arrives. */
const CLOUDS: readonly Cloud[] = [
  // starlight round the portrait
  { panel: 0, at: [0.25, 0.44], spread: [0.09, 0.22], rgb: [40, 72, 140], wisps: 26, alpha: [0.035, 0.07], size: [0.06, 0.14] },
  { panel: 0, at: [0.25, 0.28], spread: [0.05, 0.08], rgb: [96, 132, 200], wisps: 8, alpha: [0.025, 0.05], size: [0.04, 0.09] },
  // high in the open sky over the bio, drifting over the top of the skills
  { panel: 0, at: [0.9, 0.09], spread: [0.12, 0.05], rgb: [52, 70, 138], wisps: 14, alpha: [0.03, 0.06], size: [0.05, 0.12] },
  // indigo low on the learning panel
  { panel: 2, at: [0.8, 0.8], spread: [0.16, 0.09], rgb: [66, 52, 136], wisps: 16, alpha: [0.035, 0.07], size: [0.05, 0.12] },
  // a green whisper at the edge of the sky, right of the last panel
  { panel: 3, at: [0.88, 0.34], spread: [0.1, 0.2], rgb: [30, 120, 100], wisps: 16, alpha: [0.03, 0.06], size: [0.05, 0.12] },
];

/** The base sky, a faint band of milky light across all of it with dust lanes
 *  through it, and the clouds, as one opaque canvas at NEBULA_SCALE. Wisps are
 *  stretched along the band, so it reads as a stream, not as fog. World
 *  coordinates are CSS px; `w` and `h` are the screen, `worldW` and `worldH`
 *  the whole sky it pans across. */
export function paintNebula(w: number, h: number, worldW: number, worldH: number): HTMLCanvasElement {
  const c = makeCanvas(worldW * NEBULA_SCALE, worldH * NEBULA_SCALE);
  const g = ctx2d(c);
  g.setTransform(NEBULA_SCALE, 0, 0, NEBULA_SCALE, 0, 0);

  const base = g.createLinearGradient(0, 0, 0, worldH);
  base.addColorStop(0, "#04070c");
  base.addColorStop(0.55, "#060a12");
  base.addColorStop(1, "#070b15");
  g.fillStyle = base;
  g.fillRect(0, 0, worldW, worldH);

  const r = mulberry32(7);
  /** one soft wisp: `len` along `angle`, `wide` across it */
  const wisp = (rgb: RGB, x: number, y: number, len: number, wide: number, angle: number, a: number) => {
    g.save();
    g.translate(x, y);
    g.rotate(angle);
    g.globalAlpha = a;
    g.drawImage(glow(rgb, 64, true), -len, -wide, len * 2, wide * 2);
    g.restore();
  };

  // the band runs from low on the left to high on the right
  const y0 = h * 1.05 + NEBULA_PAD;
  const y1 = h * 0.1 + NEBULA_PAD;
  const bandY = (x: number) => y0 + (y1 - y0) * (x / worldW);
  const tilt = Math.atan2(y1 - y0, worldW);

  g.globalCompositeOperation = "lighter";
  for (let i = 0; i < 90; i++) {
    const x = between(r, -0.1, 1.1) * worldW;
    const off = (r() + r() - 1) * 0.16 * h;
    const core = 1 - Math.min(1, Math.abs(off) / (0.16 * h));
    const rgb: RGB = core > 0.6 ? [104, 116, 160] : [58, 78, 140];
    wisp(rgb, x, bandY(x) + off, between(r, 0.1, 0.26) * w, between(r, 0.025, 0.06) * h, tilt + between(r, -0.12, 0.12), between(r, 0.012, 0.026));
  }
  for (const cl of CLOUDS) {
    const cx = (cl.panel * NEBULA_DEPTH + cl.at[0]) * w + NEBULA_PAD;
    const cy = cl.at[1] * h + NEBULA_PAD;
    for (let i = 0; i < cl.wisps; i++) {
      // gather toward the middle: two randoms averaged
      const dx = (r() + r() - 1) * cl.spread[0] * w;
      const dy = (r() + r() - 1) * cl.spread[1] * h;
      const len = between(r, cl.size[0], cl.size[1]) * w;
      wisp(cl.rgb, cx + dx, cy + dy, len, len * between(r, 0.35, 0.7), between(r, -0.6, 0.6), between(r, cl.alpha[0], cl.alpha[1]));
    }
  }

  // dark lanes along the band, so it reads as dust and not as fog
  g.globalCompositeOperation = "source-over";
  const lane: RGB = [5, 8, 13];
  for (let i = 0; i < 34; i++) {
    const x = r() * worldW;
    wisp(lane, x, bandY(x) + (r() - 0.45) * 0.08 * h, between(r, 0.05, 0.14) * w, between(r, 0.008, 0.02) * h, tilt + between(r, -0.08, 0.08), between(r, 0.25, 0.5));
  }
  g.globalAlpha = 1;
  return c;
}
