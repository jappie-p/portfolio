import { calmAt, type Layout } from "./layout";
import { LEAF, RED, STAR, rgba, type RGB } from "./palette";
import { TAU, between, rng, smoothstep } from "./rng";
import { canvas, ctx2d, glowSprite } from "./sprites";

type Star = { x: number; y: number; s: number; b: number; f: number; p: number };

/** Glow is painted at a quarter of the resolution: it is all soft. */
const GLOW_SCALE = 0.25;
/** The glow canvas holds this much light; drawing it at alpha 1/GLOW_MAX
 *  shows the resting city, higher alphas the brighter one after the beacon. */
export const GLOW_MAX = 1.7;
const STAR_TINTS: readonly RGB[] = [STAR, [255, 228, 196], [196, 255, 222]];
const PLANE_PERIOD = 47;
const PLANE_TIME = 30;

export class Sky {
  glow = canvas(1, 1);
  private cloud = canvas(1, 1);
  private stars: Star[][] = [[], [], []];
  private readonly dot = glowSprite([255, 255, 255], 32);
  private readonly red = glowSprite(RED, 32);

  build(L: Layout, domTop: number, domH: number) {
    const { w, h, u } = L;
    // the city's green glow along the horizon, gathered round the Dom
    this.glow = canvas(w * GLOW_SCALE, h * GLOW_SCALE);
    const g = ctx2d(this.glow);
    g.setTransform(GLOW_SCALE, 0, 0, GLOW_SCALE, 0, 0);
    const k = GLOW_MAX;
    const band = g.createLinearGradient(0, L.bandTop - h * 0.3, 0, L.wharf);
    band.addColorStop(0, rgba(LEAF, 0));
    band.addColorStop(0.55, rgba(LEAF, 0.055 * k));
    band.addColorStop(0.82, rgba(LEAF, 0.14 * k));
    band.addColorStop(1, rgba(LEAF, 0.07 * k));
    g.fillStyle = band;
    g.fillRect(0, 0, w, h);
    // the light has a direction: it gathers toward the Dom and thins out
    // behind the copy on the other side
    const lean = g.createLinearGradient(0, 0, w, 0);
    lean.addColorStop(0, "rgba(0,0,0,0.5)");
    lean.addColorStop(Math.min(0.95, L.domX / w), "rgba(0,0,0,1)");
    lean.addColorStop(1, "rgba(0,0,0,0.9)");
    g.globalCompositeOperation = "destination-in";
    g.fillStyle = lean;
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "source-over";
    const cx = L.domX;
    const cy = domTop + domH * 0.45;
    const halo = g.createRadialGradient(cx, cy, 0, cx, cy, domH * 0.75);
    halo.addColorStop(0, rgba(LEAF, 0.1 * k));
    halo.addColorStop(1, rgba(LEAF, 0));
    g.fillStyle = halo;
    g.fillRect(0, 0, w, h);

    // stars, thinning toward the glow and behind the copy
    const r = rng(52);
    this.stars = [[], [], []];
    const n = Math.min(460, Math.round((w * L.bandTop) / 4600));
    for (let i = 0, made = 0; i < n * 1.6 && made < n; i++) {
      const x = r() * w;
      const y = L.bandTop * 0.98 * r() ** 1.25;
      if (r() < calmAt(L, x, y) * 0.7) continue;
      const fade = 1 - 0.85 * smoothstep(L.bandTop - h * 0.32, L.bandTop, y);
      const tint = r() < 0.76 ? 0 : r() < 0.6 ? 1 : 2;
      this.stars[tint].push({ x, y, s: 0.6 + r() ** 3 * 1.2, b: (0.3 + r() ** 2 * 0.7) * fade, f: between(r, 0.5, 2.2), p: r() * TAU });
      made++;
    }

    // one long stratus band low over the city, lit from below by its glow
    const cw = Math.round(w * 1.4);
    const ch = Math.round(h * 0.2);
    this.cloud = canvas(cw * 0.5, ch * 0.5);
    const c = ctx2d(this.cloud);
    c.setTransform(0.5, 0, 0, 0.5, 0, 0);
    const puff = glowSprite([186, 214, 222], 64, 3.4);
    const rc = rng(9);
    for (let i = 0; i < 70; i++) {
      const px = rc() * cw;
      const py = ch * (0.5 + (rc() - 0.5) * 0.5 * Math.sin((px / cw) * TAU * 2 + 1));
      const rx = between(rc, 50, 200) * u;
      const ry = between(rc, 4, 13) * u;
      c.globalAlpha = between(rc, 0.05, 0.13);
      c.drawImage(puff, px - rx, py - ry, rx * 2, ry * 2);
    }
  }

  drawGlow(ctx: CanvasRenderingContext2D, L: Layout, level: number) {
    ctx.globalAlpha = Math.min(1, level / GLOW_MAX);
    ctx.drawImage(this.glow, 0, 0, L.w, L.h);
    ctx.globalAlpha = 1;
  }

  drawStars(ctx: CanvasRenderingContext2D, t: number) {
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = rgba(STAR_TINTS[k]);
      for (const s of this.stars[k]) {
        ctx.globalAlpha = s.b * (0.7 + 0.3 * Math.sin(t * s.f + s.p));
        ctx.fillRect(s.x - s.s / 2, s.y - s.s / 2, s.s, s.s);
        if (s.b > 0.75 && s.s > 1.2) {
          // the few bright ones get a soft halo and a faint cross
          const a = ctx.globalAlpha;
          ctx.globalAlpha = a * 0.35;
          ctx.drawImage(this.dot, s.x - s.s * 3, s.y - s.s * 3, s.s * 6, s.s * 6);
          ctx.globalAlpha = a * 0.28;
          ctx.fillRect(s.x - s.s * 2.4, s.y - 0.25, s.s * 4.8, 0.5);
          ctx.fillRect(s.x - 0.25, s.y - s.s * 2.4, 0.5, s.s * 4.8);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  drawCloud(ctx: CanvasRenderingContext2D, L: Layout, t: number, lit: number) {
    const cw = L.w * 1.4;
    const ch = L.h * 0.2;
    const y = L.bandTop - L.h * 0.2;
    const x = -((t * 4.5 * L.u) % cw);
    ctx.globalAlpha = 0.5 + 0.25 * lit;
    ctx.drawImage(this.cloud, x, y, cw, ch);
    ctx.drawImage(this.cloud, x + cw, y, cw, ch);
    ctx.globalAlpha = 1;
  }

  /** A plane far off, crossing every 47 s: strobe, beacon and nav light. */
  drawPlane(ctx: CanvasRenderingContext2D, L: Layout, t: number) {
    const cycle = Math.floor((t + 20) / PLANE_PERIOD);
    const p = ((t + 20) % PLANE_PERIOD) / PLANE_TIME;
    if (p > 1) return;
    const rtl = cycle % 2 === 1;
    const x = (rtl ? 1.04 - p * 1.08 : -0.04 + p * 1.08) * L.w;
    const y = L.h * (0.1 - 0.035 * p) + (rtl ? L.h * 0.025 : 0);
    ctx.globalCompositeOperation = "lighter";
    const s = (t * 1000) % 1300;
    const strobe = s < 60 || (s > 190 && s < 250) ? 1 : 0;
    const beacon = 0.5 + 0.5 * Math.sin(t * TAU);
    this.stamp(ctx, this.dot, x, y, 5 * strobe, 0.9 * strobe);
    this.stamp(ctx, this.red, x - (rtl ? -2 : 2), y + 0.8, 4, 0.55 * beacon);
    ctx.fillStyle = rtl ? rgba(RED) : rgba([120, 255, 160]);
    ctx.globalAlpha = 0.55;
    ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  /** The red obstacle lights on the far towers, slow and out of step. */
  drawReds(ctx: CanvasRenderingContext2D, reds: readonly { x: number; y: number }[], t: number, u: number) {
    ctx.globalCompositeOperation = "lighter";
    reds.forEach((p, i) => {
      const a = 0.25 + 0.75 * Math.max(0, Math.sin(t * 1.6 + i * 2.1)) ** 2;
      this.stamp(ctx, this.red, p.x, p.y, 4.5 * u, a * 0.8);
      ctx.fillStyle = rgba(RED, a);
      ctx.fillRect(p.x - 0.6 * u, p.y - 0.6 * u, 1.2 * u, 1.2 * u);
    });
    ctx.globalCompositeOperation = "source-over";
  }

  private stamp(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, x: number, y: number, r: number, a: number) {
    if (a <= 0.01 || r <= 0) return;
    ctx.globalAlpha = Math.min(1, a);
    ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  }
}
