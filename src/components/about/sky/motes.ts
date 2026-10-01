import { between, mulberry32, wrap } from "./rng";
import { glow } from "./sprites";

const COUNT = 14;
/** px the motes move per px of sideways scroll: nearer than any star. */
const DEPTH = 0.8;
const LEAN = 18;
const PAD = 40;

/** A few soft specks of dust drifting slowly in front of the sky. */
export class Motes {
  private readonly x = new Float32Array(COUNT);
  private readonly y = new Float32Array(COUNT);
  private readonly vx = new Float32Array(COUNT);
  private readonly vy = new Float32Array(COUNT);
  private readonly r = new Float32Array(COUNT);
  private readonly a = new Float32Array(COUNT);
  private readonly sprite = glow([200, 216, 255], 32, true);

  constructor() {
    const r = mulberry32(5);
    for (let i = 0; i < COUNT; i++) {
      this.x[i] = r();
      this.y[i] = r();
      this.vx[i] = between(r, -4, 4);
      this.vy[i] = between(r, -7, -2);
      this.r[i] = between(r, 1.5, 5);
      this.a[i] = between(r, 0.05, 0.14);
    }
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, sx: number, sy: number, px: number, py: number) {
    const tw = w + PAD * 2;
    const th = h + PAD * 2;
    for (let i = 0; i < COUNT; i++) {
      const X = wrap(this.x[i] * tw + this.vx[i] * t - sx * DEPTH - px * LEAN, tw) - PAD;
      const Y = wrap(this.y[i] * th + this.vy[i] * t - sy * DEPTH - py * LEAN * 0.6, th) - PAD;
      const R = this.r[i] * 3;
      // each speck breathes a little as it drifts
      ctx.globalAlpha = this.a[i] * (0.7 + 0.3 * Math.sin(t * 0.4 + i * 1.7));
      ctx.drawImage(this.sprite, X - R, Y - R, R * 2, R * 2);
    }
    ctx.globalAlpha = 1;
  }
}
