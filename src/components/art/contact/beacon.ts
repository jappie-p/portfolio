import type { Lantern } from "./dom";
import { BEAM, DOM, LEAF, MINT, rgba, shade } from "./palette";
import { clamp01, easeInOut, easeOut, lerp } from "./rng";
import { glowSprite } from "./sprites";

/** Seconds from the send to the settled, brighter city. */
export const FLARE = 2.8;
/** When the first ring leaves the lantern, and how long it takes to reach
 *  the far edge of the screen; the windows switch on as it passes. */
export const RING_DELAY = 0.08;
export const RING_TIME = 1.9;
const PEAK = 4.2;

/** The payoff when a message is sent: the lantern flares white-green, rings
 *  of light spread over the city from the tower, the sky behind the
 *  silhouettes flashes once, and the city settles a little brighter. */
export class Beacon {
  private at = -1e9;
  private sent = 0;
  private readonly halo = glowSprite(LEAF, 64);
  private readonly core = glowSprite(BEAM, 64);
  private readonly tracery = rgba(shade(DOM, 0.62));

  fire(t: number) {
    this.at = t;
    this.sent++;
  }

  /** The settled state, as if the flare were long over (the still frame). */
  settle(t: number) {
    this.at = t - 60;
    this.sent++;
  }

  private age(t: number) {
    return t - this.at;
  }

  /** The lantern's light: 1 at rest, a flare, then 1.35 for good. */
  lantern(t: number): number {
    const rest = this.sent ? 1.35 : 1;
    const before = this.sent > 1 ? 1.35 : 1;
    const a = this.age(t);
    const breathe = 1 + 0.06 * Math.sin(t * 0.8);
    if (a < 0 || a >= FLARE) return rest * breathe;
    if (a < 0.3) return lerp(before, PEAK, easeOut(a / 0.3));
    return lerp(PEAK, rest * breathe, easeInOut((a - 0.3) / (FLARE - 0.3)));
  }

  /** The horizon glow as a multiple of the resting glow. */
  glow(t: number): number {
    const rest = this.sent ? 1.25 : 1;
    const a = this.age(t);
    if (a < 0 || a >= FLARE) return rest;
    if (a < 0.5) return lerp(this.sent > 1 ? 1.25 : 1, 1.65, easeOut(a / 0.5));
    return lerp(1.65, rest, easeInOut((a - 0.5) / (FLARE - 0.5)));
  }

  /** The flash of the sky behind the city, 0..1. */
  flash(t: number): number {
    const a = this.age(t);
    if (a < 0 || a > 1.9) return 0;
    return easeOut(a / 0.18) * (1 - easeInOut((a - 0.18) / 1.7));
  }

  /** Behind the silhouettes: the sky lighting up round the tower, and two
   *  flat rings of light spreading over the city at the lantern's height. */
  drawSky(ctx: CanvasRenderingContext2D, lan: Lantern, t: number, reach: number, h: number, u: number) {
    const a = this.age(t);
    if (a < 0 || a >= FLARE) return;
    ctx.globalCompositeOperation = "lighter";
    const f = this.flash(t);
    if (f > 0.01) {
      ctx.globalAlpha = 0.17 * f;
      ctx.drawImage(this.halo, lan.cx - h * 0.9, lan.cy - h * 0.55, h * 1.8, h * 1.1);
    }
    for (let k = 0; k < 2; k++) {
      const p = (a - RING_DELAY - k * 0.42) / RING_TIME;
      if (p <= 0 || p >= 1.15) continue;
      const rx = reach * p;
      const ry = rx * 0.16;
      const fade = (1 - clamp01(p / 1.15)) ** 1.5 * (k ? 0.5 : 1);
      ctx.beginPath();
      ctx.ellipse(lan.cx, lan.cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(LEAF, 0.16 * fade);
      ctx.lineWidth = 12 * u;
      ctx.globalAlpha = 1;
      ctx.stroke();
      ctx.strokeStyle = rgba(MINT, 0.55 * fade);
      ctx.lineWidth = 1.4 * u;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  /** In front of everything: the lantern's lancets lit from within, the
   *  tracery dark across them, and the halo round the top of the tower. */
  drawLantern(ctx: CanvasRenderingContext2D, lan: Lantern, t: number) {
    const I = this.lantern(t);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = clamp01(0.15 * I ** 1.3);
    ctx.fillStyle = lan.fill;
    ctx.fill(lan.openings);
    if (I > 1.6) {
      ctx.globalAlpha = 0.5 * clamp01((I - 1.6) / 2.6);
      ctx.fillStyle = rgba(BEAM);
      ctx.fill(lan.openings);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.tracery;
    ctx.fill(lan.tracery);

    ctx.globalCompositeOperation = "lighter";
    const r = lan.r * (0.9 + 0.3 * (I - 1));
    ctx.globalAlpha = clamp01(0.085 * I ** 1.2);
    ctx.drawImage(this.halo, lan.cx - r, lan.cy - r * 1.15, r * 2, r * 2.3);
    if (I > 1.6) {
      const k = clamp01((I - 1.6) / 2.6);
      ctx.globalAlpha = 0.55 * k;
      ctx.drawImage(this.core, lan.cx - lan.r * 0.5, lan.cy - lan.r * 0.7, lan.r, lan.r * 1.4);
      // a thin anamorphic streak through the lantern, as a lens draws it
      ctx.globalAlpha = 0.3 * k;
      ctx.drawImage(this.core, lan.cx - lan.r * 4.5, lan.cy - lan.r * 0.05, lan.r * 9, lan.r * 0.1);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
}
