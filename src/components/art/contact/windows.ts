import type { Pane } from "./houses";
import { calmAt, type Layout } from "./layout";
import { OFFICE, TV, WARM, rgba } from "./palette";
import { archSprite, glowSprite, paneSprite } from "./sprites";
import { between, chance, easeInOut, noise1, rng, type Rng } from "./rng";

/** The four layers of windows, far to near. */
export const IN_FAR = 0;
export const IN_OLD = 1;
export const IN_HOUSES = 2;
export const IN_CELLARS = 3;

/** How many rooms burn in each layer, before and after the beacon. */
const SHARE = [0.12, 0.12, 0.2, 0.4];
const LIFT = [0.06, 0.08, 0.1, 0.18];
/** The share of dark rooms the beacon's wave switches on. */
const WAVE = 0.32;
const TV_HUE = 3;
const WARM_CSS = WARM.map((c) => rgba(c));
const OFFICE_CSS = rgba(OFFICE);

type Win = {
  x: number;
  y: number;
  w: number;
  h: number;
  layer: number;
  hue: number;
  calm: number;
  life: number;
  bright: number;
  seed: number;
  shop: boolean;
  on: number;
  from: number;
  to: number;
  t0: number;
  dur: number;
  waveAt: number;
  flash: number;
};

/** Every window in the city and whether its room is lit. Rooms switch on and
 *  off one at a time with a short fade, a few flicker blue with a television,
 *  and the beacon sends a wave of them on, outward from the tower. */
export class Windows {
  private readonly list: Win[] = [];
  private readonly r: Rng;
  private readonly lit = [0, 0, 0, 0];
  private readonly count = [0, 0, 0, 0];
  private readonly share = SHARE.slice();
  private readonly panes: HTMLCanvasElement[];
  private readonly arch: HTMLCanvasElement;
  private readonly halo: HTMLCanvasElement;
  private next = 0;

  constructor(L: Layout, groups: readonly (readonly [number, readonly Pane[]])[], seed: number) {
    const r = rng(seed);
    this.r = rng(seed + 1);
    this.panes = [...WARM.map((c) => paneSprite(c, true)), paneSprite(TV, false), paneSprite(WARM[0], false)];
    this.arch = archSprite(WARM[1]);
    this.halo = glowSprite(WARM[0], 32);
    for (const [layer, panes] of groups) {
      for (const p of panes) {
        const calm = calmAt(L, p.x + p.w / 2, p.y + p.h / 2);
        const hue = layer >= IN_HOUSES && !p.shop && chance(r, 0.07) ? TV_HUE : Math.floor(r() * 3);
        const share = p.shop && layer === IN_HOUSES ? 0.3 : this.share[layer];
        const on = chance(r, Math.min(0.92, share * p.life) * (1 - calm)) ? 1 : 0;
        this.list.push({ ...p, layer, hue, calm, bright: between(r, 0.55, 1), seed: r() * 50, on, from: on, to: on, t0: 0, dur: 1, waveAt: Infinity, flash: -9 });
        this.count[layer]++;
        this.lit[layer] += on;
      }
    }
  }

  /** Advances fades and the wave, and now and then switches one room. */
  step(t: number) {
    for (const w of this.list) {
      if (t >= w.waveAt) {
        w.waveAt = Infinity;
        this.set(w, 1, t, 0.09);
        w.flash = t;
      }
      w.on = w.from + (w.to - w.from) * easeInOut((t - w.t0) / w.dur);
    }
    if (t < this.next) return;
    this.next = t + between(this.r, 0.18, 0.7);
    const n = this.list.length;
    for (let tries = 0; tries < 8 && n; tries++) {
      const w = this.list[Math.floor(this.r() * n)];
      if (w.to !== w.from && t < w.t0 + w.dur) continue;
      // lights go on in lively houses and off in sleepy ones, so the city
      // keeps its busy and quiet stretches while it changes
      const want = this.lit[w.layer] < this.share[w.layer] * this.count[w.layer];
      const lively = Math.min(1, w.life / 1.6);
      if (w.to === 1 && !want && this.r() < 1 - lively * 0.6) return this.set(w, 0, t, between(this.r, 0.2, 0.9));
      if (w.to === 0 && want && this.r() < lively * (1 - w.calm)) return this.set(w, 1, t, between(this.r, 0.25, 1.1));
    }
  }

  private set(w: Win, to: number, t: number, dur: number) {
    if (w.to === to) return;
    this.lit[w.layer] += to - w.to;
    w.from = w.on;
    w.to = to;
    w.t0 = t;
    w.dur = dur;
  }

  /** The beacon: dark rooms switch on as its ring passes over them. */
  wave(t: number, ox: number, speed: number) {
    for (let l = 0; l < 4; l++) this.share[l] = Math.min(0.62, this.share[l] + LIFT[l]);
    for (const w of this.list) {
      if (w.to === 1 || w.waveAt < Infinity || this.r() > WAVE * (1 - w.calm)) continue;
      w.waveAt = t + 0.1 + Math.abs(w.x - ox) / speed + this.r() * 0.22;
    }
  }

  /** The wave's end state at once, for the still frame. */
  settle(t: number) {
    for (const w of this.list) {
      if (w.waveAt === Infinity) continue;
      w.waveAt = Infinity;
      this.set(w, 1, t - 1, 0.01);
      w.on = 1;
    }
  }

  private level(w: Win, t: number): number {
    let a = w.on * w.bright;
    if (w.hue === TV_HUE) a *= 0.72 + 0.2 * noise1(t * 7 + w.seed, w.seed) + 0.1 * Math.sign(noise1(t * 0.9, w.seed + 4));
    const f = t - w.flash;
    if (f >= 0 && f < 1.2) a += 0.9 * Math.exp(-f * 4.5) * w.on;
    return a;
  }

  /** Windows of the city layer (far, old town, canal houses). */
  drawCity(ctx: CanvasRenderingContext2D, t: number) {
    ctx.fillStyle = OFFICE_CSS;
    for (const w of this.list) {
      if (w.layer !== IN_FAR || w.on <= 0.01) continue;
      ctx.globalAlpha = Math.min(1, this.level(w, t) * 0.36);
      ctx.fillRect(w.x, w.y, w.w, w.h);
    }
    for (const w of this.list) {
      if (w.layer !== IN_OLD || w.on <= 0.01) continue;
      ctx.fillStyle = WARM_CSS[w.hue % 3];
      ctx.globalAlpha = Math.min(1, this.level(w, t) * 0.75);
      ctx.fillRect(w.x, w.y, w.w, w.h);
    }
    this.drawLayer(ctx, t, IN_HOUSES);
    ctx.globalAlpha = 1;
  }

  /** The wharf cellars, which sit in the quay wall in front of the trees,
   *  each lit one throwing a pool of light out over the wharf. */
  drawCellars(ctx: CanvasRenderingContext2D, t: number) {
    this.drawLayer(ctx, t, IN_CELLARS);
    ctx.globalCompositeOperation = "lighter";
    for (const w of this.list) {
      if (w.layer !== IN_CELLARS || w.on <= 0.01) continue;
      ctx.globalAlpha = Math.min(1, this.level(w, t) * 0.4);
      ctx.drawImage(this.halo, w.x + w.w / 2 - w.w * 1.9, w.y + w.h - w.w * 0.32, w.w * 3.8, w.w * 0.75);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }

  private drawLayer(ctx: CanvasRenderingContext2D, t: number, layer: number) {
    for (const w of this.list) {
      if (w.layer !== layer || w.on <= 0.01) continue;
      ctx.globalAlpha = Math.min(1, this.level(w, t));
      const img = layer === IN_CELLARS ? this.arch : w.shop ? this.panes[4] : this.panes[w.hue];
      ctx.drawImage(img, w.x, w.y, w.w, w.h);
    }
    ctx.globalCompositeOperation = "lighter";
    for (const w of this.list) {
      if (w.layer !== layer || w.on <= 0.01 || w.hue === TV_HUE) continue;
      const a = this.level(w, t) * (w.shop || layer === IN_CELLARS ? 0.28 : 0.13);
      ctx.globalAlpha = Math.min(1, a);
      const rx = Math.max(w.w, w.h) * 1.5;
      ctx.drawImage(this.halo, w.x + w.w / 2 - rx, w.y + w.h * 0.55 - rx, rx * 2, rx * 2);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  /** Lit rooms low enough to show in the canal: x centre, sill y, width,
   *  level and colour index (0..2 warm, 3 television). */
  eachLight(t: number, from: number, fn: (x: number, y: number, w: number, a: number, hue: number) => void) {
    for (const w of this.list) {
      if (w.layer < IN_HOUSES || w.on <= 0.02 || w.y + w.h < from) continue;
      fn(w.x + w.w / 2, w.y + w.h, w.w, this.level(w, t), w.hue === TV_HUE ? TV_HUE : w.hue % 3);
    }
  }
}
