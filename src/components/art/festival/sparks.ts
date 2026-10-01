import { calmAt, type Layout } from "./layout";
import { between, type Rng } from "./math";

type Spark = { x: number; y: number; vx: number; vy: number; age: number; life: number };

// white-hot when fresh, gold, then orange as they cool
const HEAT = ["rgba(255,250,236,0.95)", "rgba(255,206,110,0.8)", "rgba(255,132,54,0.6)"];
const MAX = 900;

/** Cold-spark fountains along the deck edge, lit for a moment on each drop:
 *  hot points streaking up, arcing over and cooling as they fall. */
export class Sparks {
  private sparks: Spark[] = [];
  private carry = 0;

  clear() {
    this.sparks.length = 0;
    this.carry = 0;
  }

  /** Feed each fountain for this frame at `rate` sparks per second. */
  emit(r: Rng, at: { x: number; y: number }[], rate: number, dt: number, u: number) {
    this.carry += rate * dt;
    const n = Math.floor(this.carry);
    this.carry -= n;
    for (const f of at)
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + between(r, -0.2, 0.2);
        const v = between(r, 300, 470) * u;
        this.sparks.push({ x: f.x + between(r, -2, 2) * u, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: 0, life: between(r, 0.55, 1.05) });
      }
    if (this.sparks.length > MAX) this.sparks.splice(0, this.sparks.length - MAX);
  }

  step(dt: number, u: number) {
    const g = 620 * u;
    let alive = 0;
    for (const s of this.sparks) {
      s.age += dt;
      s.vy += g * dt;
      s.vx *= 1 - dt * 0.8;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.age < s.life) this.sparks[alive++] = s;
    }
    this.sparks.length = alive;
  }

  /** Streaks along each spark's motion, batched by heat into three strokes. */
  draw(ctx: CanvasRenderingContext2D, L: Layout) {
    if (!this.sparks.length) return;
    const paths = HEAT.map(() => new Path2D());
    for (const s of this.sparks) {
      if (calmAt(L, s.x, s.y) > 0.2) continue;
      const k = s.age / s.life;
      const p = paths[k < 0.3 ? 0 : k < 0.65 ? 1 : 2];
      p.moveTo(s.x, s.y);
      p.lineTo(s.x - s.vx * 0.022, s.y - s.vy * 0.022);
    }
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.lineWidth = 1.3 * L.u;
    paths.forEach((p, i) => {
      ctx.strokeStyle = HEAT[i];
      ctx.stroke(p);
    });
    ctx.globalCompositeOperation = "source-over";
  }
}
