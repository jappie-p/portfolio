import type { Lamp } from "./canal";
import type { Layout } from "./layout";
import { CANVAS, LAMP, LEAF, MINT, SKY, TV, WARM, rgba } from "./palette";
import { clamp01, lerp } from "./rng";
import { canvas, ctx2d, streakSprite, tint } from "./sprites";
import type { Windows } from "./windows";

/** The mirror is squashed a little, as a canal seen from the street is. */
const SQ = 0.82;
/** Reflections are soft: the mirrored city is kept at a fraction of the
 *  screen's resolution and the ripples smear it further. */
const REFL_SCALE = 0.6;
const VARIANTS = 4;
// streak tints: three warm rooms, a television, a street lamp, the lantern
const TINTS = [...WARM, TV, LAMP, MINT];
const LAMP_TINT = 4;
const LEAF_TINT = 5;
const GLINTS = 26;
const SHEEN = rgba([150, 205, 215]);
const GREEN = rgba(LEAF);

export type Mirror = { city: HTMLCanvasElement; cityTop: number; front: HTMLCanvasElement; frontTop: number; glow: HTMLCanvasElement; glowAlpha: number };

/** Ripple offset of the water at depth `y` (px below the wharf). */
function ripple(y: number, t: number, depth: number, u: number): number {
  const k = y / depth;
  return lerp(0.5, 5.5, k) * u * (0.62 * Math.sin(t * 1.15 + y * 0.23) + 0.38 * Math.sin(t * 1.85 - y * 0.091 + 1.3));
}

/** Deterministic hash in 0..1, so the glints are a pure function of time. */
const hash = (a: number, b: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export class Canal {
  private refl = canvas(1, 1);
  private sc = 1;
  private edge: CanvasGradient | null = null;
  private readonly streaks = TINTS.map((c) => Array.from({ length: VARIANTS }, (_, i) => tint(streakSprite(31 + i * 7), c)));

  /** Mirrors the sky, the glow and the city into the water, darkened. `ctx`
   *  is the screen's context, which the wharf's shadow is made for. */
  build(L: Layout, dpr: number, m: Mirror, ctx: CanvasRenderingContext2D) {
    this.edge = ctx.createLinearGradient(0, L.wharf, 0, L.wharf + 7 * L.u);
    this.edge.addColorStop(0, "rgba(0,0,0,0.55)");
    this.edge.addColorStop(1, "rgba(0,0,0,0)");
    const depth = L.h - L.wharf;
    const sc = Math.max(0.5, dpr * REFL_SCALE);
    this.sc = sc;
    this.refl = canvas(L.w * sc, depth * sc + 2);
    const g = ctx2d(this.refl);
    g.setTransform(sc, 0, 0, -sc * SQ, 0, sc * SQ * L.wharf);
    const sky = g.createLinearGradient(0, 0, 0, L.h);
    for (const [o, c] of SKY) sky.addColorStop(o, rgba(c));
    g.fillStyle = sky;
    g.fillRect(0, 0, L.w, L.wharf);
    g.globalAlpha = m.glowAlpha;
    g.drawImage(m.glow, 0, 0, L.w, L.h);
    g.globalAlpha = 1;
    g.drawImage(m.city, 0, m.cityTop, L.w, m.city.height * (L.w / m.city.width));
    g.drawImage(m.front, 0, m.frontTop, L.w, m.front.height * (L.w / m.front.width));
    g.setTransform(1, 0, 0, 1, 0, 0);
    const dark = g.createLinearGradient(0, 0, 0, this.refl.height);
    dark.addColorStop(0, rgba(CANVAS, 0.3));
    dark.addColorStop(1, rgba(CANVAS, 0.6));
    g.fillStyle = dark;
    g.fillRect(0, 0, this.refl.width, this.refl.height);
  }

  draw(ctx: CanvasRenderingContext2D, L: Layout, t: number, win: Windows, lamps: readonly Lamp[], lantern: number) {
    const { u, w, wharf } = L;
    const depth = L.h - wharf;
    const sc = this.sc;
    // the mirrored city in strips, each pushed sideways by the ripples, with
    // the dark troughs between the swells
    let y = 0;
    let row = 0;
    ctx.fillStyle = "rgba(2,4,8,0.38)";
    while (y < depth) {
      const k = y / depth;
      const sh = lerp(1.4, 5.5, k ** 0.8) * Math.max(0.8, u);
      const dx = ripple(y, t, depth, u);
      const sy = Math.max(0, Math.min(depth - sh, y + Math.sin(t * 0.9 + y * 0.33) * lerp(0.2, 2, k)));
      ctx.drawImage(this.refl, 0, sy * sc, this.refl.width, sh * sc, dx - 8, wharf + y, w + 16, sh + 0.6);
      if (row++ % 2 === 1) ctx.fillRect(0, wharf + y + sh * 0.55, w, Math.max(0.5, sh * 0.3));
      y += sh;
    }
    // the shadow of the wharf's edge on the water just below it
    if (this.edge) {
      ctx.fillStyle = this.edge;
      ctx.fillRect(0, wharf, w, 7 * u);
    }

    ctx.globalCompositeOperation = "lighter";
    const streak = (tintIx: number, x: number, top: number, len: number, sw: number, a: number, seed: number) => {
      if (a <= 0.01 || top >= L.h) return;
      const v = Math.floor(t * 6 + seed) % VARIANTS;
      const dx = ripple(top - wharf, t, depth, u) * 0.7;
      ctx.globalAlpha = Math.min(1, a);
      ctx.drawImage(this.streaks[tintIx][v], x - sw / 2 + dx, top, sw, len);
    };
    for (const l of lamps) {
      const d = wharf - l.y;
      streak(LAMP_TINT, l.x, wharf + d * SQ * 0.45, d * SQ * 1.5, 11 * u, 0.85, l.x * 0.13);
    }
    win.eachLight(t, L.street - 80 * u, (x, sill, ww, a, hue) => {
      const d = Math.max(4 * u, wharf - sill);
      const low = d < 22 * u;
      streak(hue, x, wharf + (low ? 1.5 * u : d * SQ * 0.8), Math.min(90 * u, Math.max(18 * u, d * 1.2)), ww * (low ? 1.7 : 1.4), a * (low ? 0.8 : 0.36), x * 0.21);
    });
    // the lantern's light laid on the water like a moon path, a little
    // brighter when it flares
    const lane = this.streaks[LEAF_TINT][Math.floor(t * 5) % VARIANTS];
    ctx.globalAlpha = clamp01(0.12 + 0.13 * lantern);
    ctx.drawImage(lane, L.domX - 13 * u + ripple(10, t, depth, u), wharf + 2 * u, 26 * u, depth * 1.4);

    // glints: the sky catching on wave crests, here and gone
    for (let i = 0; i < GLINTS; i++) {
      const period = 0.9 + hash(i, 0.5) * 1.6;
      const c = Math.floor((t + hash(i, 1.5) * period) / period);
      const phase = ((t + hash(i, 1.5) * period) % period) / period;
      const gx = hash(i, c) * w;
      const gy = wharf + (0.08 + 0.92 * hash(c, i + 0.3) ** 0.7) * depth;
      const len = (2.5 + hash(i + 0.7, c) * 7) * u * (0.6 + (gy - wharf) / depth);
      ctx.globalAlpha = 0.22 * Math.sin(phase * Math.PI);
      ctx.fillStyle = hash(c, i) < 0.75 ? SHEEN : GREEN;
      ctx.fillRect(gx, gy, len, Math.max(0.6, 0.6 * u));
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
}
