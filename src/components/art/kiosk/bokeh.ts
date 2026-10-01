import { between, calmAt, rng, type KioskLayout } from "./layout";
import { AMBER, GOLD, LIME, ORANGE, WARM, discSprite, softSprite } from "./sprites";

const HUES = [AMBER, GOLD, WARM, ORANGE, LIME];
const A = 0;
const G = 1;
const WM = 2;
const O = 3;
const LM = 4;

/** One light: a disc (or only a glow), how it drifts and breathes, and the
 *  bloom it throws round itself. */
type Light = { x: number; y: number; r: number; a: number; hue: number; soft: boolean; bloom: number; sp: number; ph: number; amp: number; tw: number };

/** Where the room's lamps hang: festoon strings across the top, pendants over
 *  the kiosks. Shared with the static room, which draws their cords. */
export function fixtures(L: KioskLayout) {
  const { w, h, u, cx, half } = L;
  const top = Math.max(38, L.cy - 300 * u);
  return {
    strings: [
      { x0: -0.03 * w, x1: cx + half * 1.3, y: top, sag: 58 * u, n: 14, rad: 9, a: 0.95 },
      { x0: cx - half * 1.55, x1: cx + half * 1.5, y: top + 62 * u, sag: 34 * u, n: 12, rad: 5.5, a: 0.62 },
    ],
    pendants: [
      { x: cx - half * 0.95, y: Math.min(h * 0.3, top + 150 * u), r: 40 },
      { x: cx + half * 0.12, y: Math.min(h * 0.26, top + 118 * u), r: 32 },
      { x: cx + half * 0.92, y: Math.min(h * 0.31, top + 166 * u), r: 36 },
    ],
  };
}

/** The warm lights of the restaurant, thrown out of focus behind the kiosks:
 *  far glows, pendant lamps, festoon bulbs, a scatter of discs and a few lime
 *  and orange accents. Almost none on the copy's side. */
export class Bokeh {
  private readonly discs = HUES.map((c) => discSprite(c));
  private readonly softs = HUES.map((c) => softSprite(c));
  private lights: Light[] = [];

  layout(L: KioskLayout) {
    const r = rng(19);
    const { w, h, u, cx, half } = L;
    const right = L.wide ? L.calm.to : w;
    const lights: Light[] = [];
    const add = (x: number, y: number, rad: number, a: number, hue: number, soft: boolean, bloom = 0, amp = 6) => {
      const k = 1 - 0.88 * calmAt(L, x, y);
      if (a * k < 0.01) return;
      lights.push({ x, y, r: rad, a: a * k, hue, soft, bloom, sp: between(r, 0.05, 0.14), ph: r() * 6.28, amp: amp * u, tw: between(r, 0.3, 0.9) });
    };
    const warm = () => {
      const p = r();
      return p < 0.45 ? A : p < 0.7 ? G : p < 0.88 ? WM : O;
    };

    // far glows: lamplight spilling round the room
    for (let i = 0; i < 6; i++) add(between(r, -0.1 * w, right * 0.8), between(r, 0.1, 0.8) * h, between(r, 110, 220) * u, between(r, 0.05, 0.09), [A, G, O, A, LM, G][i], true, 0, 14);
    const { strings, pendants } = fixtures(L);
    // pendant lamps over the kiosks: a big warm bloom round a soft disc
    for (const p of pendants) {
      add(p.x, p.y, 130 * u, 0.17, A, true, 0, 3);
      add(p.x, p.y + 6 * u, p.r * u, 0.34, G, false, 1.9, 3);
    }
    // festoon bulbs hanging a little under their wire
    for (const s of strings)
      for (let i = 0; i < s.n; i++) {
        const q = (i + 0.5) / s.n;
        const x = s.x0 + (s.x1 - s.x0) * q;
        const y = s.y + s.sag * 4 * q * (1 - q) + s.rad * 1.4 * u;
        // amber and gold: added onto green, anything paler reads grey
        add(x, y, s.rad * u * between(r, 0.92, 1.12), s.a * between(r, 0.85, 1.1), i % 6 === 4 ? O : i % 2 ? A : G, false, 2.8, 2.5);
      }
    // a scatter of discs behind and beside the kiosks
    for (let i = 0; i < 11; i++) add(cx + between(r, -1.8, 1.6) * half, between(r, 0.34, 0.78) * h, between(r, 16, 42) * u, between(r, 0.1, 0.22), warm(), false, 1.5, 7);
    // lime: light through the leaves of the plants
    for (let i = 0; i < 3; i++) add(cx + between(r, -1.9, 1.2) * half, between(r, 0.3, 0.85) * h, between(r, 14, 30) * u, between(r, 0.08, 0.14), LM, false, 1.4, 6);
    // small sparks, nearer and brighter
    for (let i = 0; i < 8; i++) add(cx + between(r, -1.9, 1.7) * half, between(r, 0.12, 0.8) * h, between(r, 4, 8) * u, between(r, 0.3, 0.5), warm(), false, 2.4, 4);
    this.lights = lights;
  }

  draw(ctx: CanvasRenderingContext2D, t: number) {
    ctx.globalCompositeOperation = "lighter";
    for (const l of this.lights) {
      const x = l.x + Math.sin(t * l.sp + l.ph) * l.amp;
      const y = l.y + Math.cos(t * l.sp * 0.7 + l.ph) * l.amp * 0.6;
      const a = l.a * (0.82 + 0.18 * Math.sin(t * l.tw + l.ph * 3));
      if (l.bloom) {
        const b = l.r * l.bloom;
        ctx.globalAlpha = a * 0.45;
        ctx.drawImage(this.softs[l.hue], x - b, y - b, b * 2, b * 2);
      }
      ctx.globalAlpha = a;
      ctx.drawImage((l.soft ? this.softs : this.discs)[l.hue], x - l.r, y - l.r, l.r * 2, l.r * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
}
