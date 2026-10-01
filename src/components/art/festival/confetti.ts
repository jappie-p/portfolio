import { calmAt, type Layout } from "./layout";
import { TAU, between, type Rng } from "./math";
import { CERULEAN, SAFFRON, VERMILION, WHITE } from "./palette";

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** spin in the picture plane, and the tumble that flashes its face at us */
  a: number;
  va: number;
  f: number;
  vf: number;
  w: number;
  h: number;
  c: number;
  age: number;
  fall: number;
  sway: number;
};

const INKS = [VERMILION, CERULEAN, SAFFRON, WHITE];
const LEVELS = 6;
const MAX = 720;

/** Paper confetti: shot up by the cannons, braked hard by the air, then
 *  tumbling down at its own slow speed, catching the light as it turns. */
export class Confetti {
  private pieces: Piece[] = [];
  // one fill per colour and brightness step, built once instead of per piece
  private readonly styles = INKS.map((c) =>
    Array.from({ length: LEVELS }, (_, i) => {
      const k = 0.32 + 0.68 * (i / (LEVELS - 1));
      return `rgb(${(c[0] * k) | 0},${(c[1] * k) | 0},${(c[2] * k) | 0})`;
    }),
  );

  clear() {
    this.pieces.length = 0;
  }

  /** A cannon shot from (x, y), leaning `lean` radians off vertical. */
  burst(r: Rng, x: number, y: number, lean: number, n: number, u: number, power = 1) {
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + lean + between(r, -0.24, 0.24);
      const sp = between(r, 1150, 2050) * u * power;
      this.add(r, x + between(r, -3, 3) * u, y, Math.cos(ang) * sp, Math.sin(ang) * sp, u);
    }
  }

  /** Pieces already drifting down from above the frame, over the show. */
  rain(r: Rng, x0: number, x1: number, n: number, u: number) {
    for (let i = 0; i < n; i++) this.add(r, between(r, x0, x1), -between(r, 10, 520) * u, 0, between(r, 40, 90) * u, u);
  }

  private add(r: Rng, x: number, y: number, vx: number, vy: number, u: number) {
    const strip = r() < 0.12;
    const dot = !strip && r() < 0.18;
    this.pieces.push({
      x,
      y,
      vx,
      vy,
      a: r() * TAU,
      va: between(r, -4, 4),
      f: r() * TAU,
      vf: between(r, 4, 10) * (r() < 0.5 ? -1 : 1),
      w: (strip ? between(r, 2, 2.6) : dot ? between(r, 4, 5) : between(r, 6, 10)) * u,
      h: (strip ? between(r, 12, 18) : dot ? between(r, 4, 5) : between(r, 3.5, 5.5)) * u,
      c: r() < 0.3 ? 0 : r() < 0.5 ? 1 : r() < 0.72 ? 2 : 3,
      age: 0,
      fall: between(r, 55, 105) * u,
      sway: between(r, 18, 55) * u,
    });
    if (this.pieces.length > MAX) this.pieces.shift();
  }

  step(dt: number, L: Layout) {
    const g = 1250 * L.u;
    const wind = 8 * L.u;
    const kf = 1 - Math.exp(-2.6 * dt);
    const ks = 1 - Math.exp(-2 * dt);
    let alive = 0;
    for (const p of this.pieces) {
      p.age += dt;
      if (p.vy < p.fall * 0.6 && p.age < 2.5) {
        // still flying: air brakes it fast, gravity turns it round
        p.vx *= Math.exp(-2.4 * dt);
        p.vy = p.vy * Math.exp(-1.25 * dt) + g * dt;
      } else {
        p.vy += (p.fall - p.vy) * kf;
        p.vx += (Math.sin(p.f * 0.5) * p.sway + wind - p.vx) * ks;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.a += p.va * dt;
      p.f += p.vf * dt;
      if (p.y < L.h + 30 && p.age < 16) this.pieces[alive++] = p;
    }
    this.pieces.length = alive;
  }

  draw(ctx: CanvasRenderingContext2D, L: Layout, dpr: number) {
    for (const p of this.pieces) {
      const fl = Math.cos(p.f);
      const lvl = Math.min(LEVELS - 1, (Math.abs(fl) * LEVELS) | 0);
      const fade = Math.min(1, p.age * 12, (16 - p.age) * 0.8);
      const alpha = fade * (1 - 0.72 * calmAt(L, p.x, p.y));
      if (alpha < 0.02) continue;
      const ca = Math.cos(p.a);
      const sa = Math.sin(p.a);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = this.styles[p.c][lvl];
      ctx.setTransform(ca * dpr, sa * dpr, -sa * fl * dpr, ca * fl * dpr, p.x * dpr, p.y * dpr);
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
  }
}
