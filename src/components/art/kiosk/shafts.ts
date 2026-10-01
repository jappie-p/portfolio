import { between, calmAt, rng, type KioskLayout } from "./layout";
import { WARM, rgba } from "./sprites";

/** Soft beams of lamplight slanting in from the top left, all from one source
 *  out of frame. `a` is the angle from straight down, `s` the half-spread. */
export function shafts(L: KioskLayout) {
  const { h, cx, half } = L;
  const x = cx - half * 2.1;
  const y = -h * 0.32;
  const len = h * 1.9;
  return [
    { x, y, len, a: 0.5, s: 0.055, alpha: 0.05 },
    { x, y, len, a: 0.66, s: 0.04, alpha: 0.04 },
    { x, y, len, a: 0.84, s: 0.065, alpha: 0.045 },
  ];
}

/** The beams, drawn once into the static room: nested wedges for soft sides,
 *  each fading along its length. */
export function drawShafts(ctx: CanvasRenderingContext2D, L: KioskLayout) {
  ctx.globalCompositeOperation = "lighter";
  for (const b of shafts(L)) {
    const dx = Math.sin(b.a);
    const dy = Math.cos(b.a);
    const g = ctx.createLinearGradient(b.x, b.y, b.x + dx * b.len, b.y + dy * b.len);
    g.addColorStop(0, rgba(WARM, 1));
    g.addColorStop(0.3, rgba(WARM, 0.8));
    g.addColorStop(0.65, rgba(WARM, 0.25));
    g.addColorStop(1, rgba(WARM, 0));
    ctx.fillStyle = g;
    for (const [k, a] of [
      [1.9, 0.3],
      [1, 0.55],
      [0.45, 0.8],
    ]) {
      const s = b.s * k;
      ctx.globalAlpha = b.alpha * a;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x + Math.sin(b.a - s) * b.len, b.y + Math.cos(b.a - s) * b.len);
      ctx.lineTo(b.x + Math.sin(b.a + s) * b.len, b.y + Math.cos(b.a + s) * b.len);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

type Mote = { x: number; y: number; r: number; a: number; sp: number; ph: number; tw: number };

/** Dust hanging in the beams: it only shows where the light catches it. */
export class Motes {
  private motes: Mote[] = [];
  private beams: ReturnType<typeof shafts> = [];
  private L: KioskLayout | null = null;

  layout(L: KioskLayout) {
    const r = rng(71);
    this.L = L;
    this.beams = shafts(L);
    this.motes = Array.from({ length: 54 }, () => {
      const b = this.beams[(r() * this.beams.length) | 0];
      const d = between(r, 0.3, 0.75) * b.len;
      const off = between(r, -1.3, 1.3) * b.s * d;
      return {
        x: b.x + Math.sin(b.a) * d + Math.cos(b.a) * off,
        y: b.y + Math.cos(b.a) * d - Math.sin(b.a) * off,
        r: between(r, 0.6, 1.7) * L.u,
        a: between(r, 0.25, 0.75),
        sp: between(r, 0.08, 0.22),
        ph: r() * 6.28,
        tw: between(r, 0.6, 1.6),
      };
    });
  }

  draw(ctx: CanvasRenderingContext2D, t: number) {
    const L = this.L;
    if (!L) return;
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = rgba(WARM, 1);
    for (const m of this.motes) {
      const x = m.x + Math.sin(t * m.sp + m.ph) * 26 * L.u;
      const y = m.y + Math.sin(t * m.sp * 0.6 + m.ph * 1.7) * 18 * L.u;
      const lit = this.lit(x, y) * (1 - calmAt(L, x, y));
      const a = m.a * lit * (0.55 + 0.45 * Math.sin(t * m.tw + m.ph));
      if (a < 0.02) continue;
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(x, y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  /** How much beam light falls at (x, y): 1 on a beam's axis, 0 outside. */
  private lit(x: number, y: number): number {
    let best = 0;
    for (const b of this.beams) {
      const px = x - b.x;
      const py = y - b.y;
      const along = px * Math.sin(b.a) + py * Math.cos(b.a);
      if (along <= 0) continue;
      const across = px * Math.cos(b.a) - py * Math.sin(b.a);
      const k = across / (b.s * along * 1.4);
      best = Math.max(best, Math.exp(-k * k) * (1 - along / b.len));
    }
    return Math.min(1, best * 1.6);
  }
}
