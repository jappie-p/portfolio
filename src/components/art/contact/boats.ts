import type { Quay } from "./canal";
import type { Layout } from "./layout";
import { LAMP, rgba } from "./palette";
import { between, chance, rng } from "./rng";

type Boat = { x: number; len: number; cabin: boolean; lit: boolean; phase: number };

/** A few boats moored along the wharf, one with a lit cabin: an open sloep
 *  or a low canal cruiser, bobbing on the water in front of the cellars. */
export class Boats {
  private list: Boat[] = [];

  build(L: Layout, q: Quay) {
    const r = rng(31);
    const { u } = L;
    this.list = [];
    const n = Math.max(1, Math.round(L.w / 720));
    for (let i = 0, tries = 0; i < n && tries < 40; tries++) {
      const cabin = chance(r, 0.55);
      const len = (cabin ? between(r, 58, 74) : between(r, 38, 50)) * u;
      const x = between(r, 0.04, 0.9) * L.w;
      if (q.stairs.some((s) => x + len > s - 8 * u && x < s + 44 * u)) continue;
      if (this.list.some((b) => x + len > b.x - 30 * u && x < b.x + b.len + 30 * u)) continue;
      // keep the tower's own stretch of water clear for its light
      if (x + len > L.domX - 24 * u && x < L.domX + 24 * u) continue;
      this.list.push({ x, len, cabin, lit: cabin && chance(r, 0.7), phase: r() * 6 });
      i++;
    }
  }

  draw(ctx: CanvasRenderingContext2D, L: Layout, t: number) {
    const { u } = L;
    for (const b of this.list) {
      const wl = L.wharf + 3.2 * u + Math.sin(t * 0.9 + b.phase) * 0.45 * u;
      const { x, len } = b;
      // the reflection first: the hull mirrored and broken by the swell
      ctx.fillStyle = "rgba(2,4,8,0.5)";
      for (let i = 0; i < 4; i++) {
        const dx = Math.sin(t * 1.3 + i * 1.7 + b.phase) * 1.2 * u;
        ctx.fillRect(x + dx + i * u, wl + i * 1.6 * u, len - i * 2 * u, 1.3 * u);
      }
      ctx.fillStyle = "#05080e";
      ctx.beginPath();
      ctx.moveTo(x, wl);
      ctx.lineTo(x, wl - 5 * u);
      ctx.lineTo(x + len * 0.84, wl - 5.2 * u);
      ctx.quadraticCurveTo(x + len * 0.97, wl - 5.6 * u, x + len, wl - 7.4 * u);
      ctx.quadraticCurveTo(x + len * 0.96, wl - 1 * u, x + len * 0.86, wl);
      ctx.closePath();
      ctx.fill();
      // the lamps' light along the gunwale and the rubbing strake
      ctx.fillStyle = rgba(LAMP, 0.26);
      ctx.fillRect(x, wl - 5.2 * u, len * 0.84, Math.max(0.6, 0.55 * u));
      ctx.fillStyle = "rgba(150,185,220,0.12)";
      ctx.fillRect(x + u, wl - 2.4 * u, len * 0.8, Math.max(0.5, 0.45 * u));
      if (b.cabin) {
        ctx.fillStyle = "#080d15";
        const c0 = x + len * 0.22;
        const cw = len * 0.46;
        ctx.fillRect(c0, wl - 11 * u, cw, 6 * u);
        ctx.fillStyle = rgba(LAMP, 0.18);
        ctx.fillRect(c0 + cw * 0.04, wl - 11.8 * u, cw * 0.92, Math.max(0.6, 0.8 * u));
        for (let k = 0; k < 4; k++) {
          const wx = c0 + cw * (0.1 + k * 0.22);
          const on = b.lit && k === 1;
          ctx.fillStyle = on ? rgba(LAMP, 0.9) : "rgba(40,58,80,0.55)";
          ctx.fillRect(wx, wl - 9.8 * u, cw * 0.14, 2.8 * u);
        }
        if (b.lit) {
          // its light on the water below
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = rgba(LAMP, 0.16);
          for (let i = 0; i < 5; i++) {
            const dx = Math.sin(t * 1.6 + i * 2.1 + b.phase) * 1.4 * u;
            ctx.fillRect(c0 + cw * 0.3 + dx, wl + (1.2 + i * 2.2) * u, cw * 0.18 * (1 - i * 0.12), 0.9 * u);
          }
          ctx.globalCompositeOperation = "source-over";
        }
      }
    }
  }
}
