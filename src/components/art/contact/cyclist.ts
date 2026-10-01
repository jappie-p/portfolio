import type { Layout } from "./layout";
import { RED, rgba } from "./palette";
import { TAU } from "./rng";
import { glowSprite } from "./sprites";

const SLOT = 44;
const hash = (n: number) => {
  const s = Math.sin(n * 91.7 + 13.1) * 43758.5453;
  return s - Math.floor(s);
};

/** Now and then someone cycles home along the canal, lamp on, behind the
 *  trees and the railing. A pure function of time, so pausing is free. */
export class Cyclist {
  private readonly lamp = glowSprite([255, 246, 220], 32);

  draw(ctx: CanvasRenderingContext2D, L: Layout, t: number) {
    const k = Math.floor(t / SLOT);
    if (hash(k) > 0.7) return;
    const { u, street } = L;
    const speed = (40 + hash(k + 0.5) * 22) * u;
    const start = 4 + hash(k + 0.25) * 8;
    const ride = t - k * SLOT - start;
    const span = L.w + 40 * u;
    if (ride < 0 || ride * speed > span) return;
    const dir = hash(k + 0.75) < 0.5 ? 1 : -1;
    const x = dir > 0 ? -20 * u + ride * speed : L.w + 20 * u - ride * speed;
    const X = (dx: number) => x + dx * dir * u;
    const Y = (dy: number) => street - dy * u;
    const crank = ((ride * speed) / (u * 15)) * TAU;

    ctx.strokeStyle = "#060a11";
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(0.7, 0.6 * u);
    ctx.beginPath();
    for (const wx of [-3.6, 3.6]) {
      ctx.moveTo(X(wx) + 2.5 * u, Y(2.5));
      ctx.arc(X(wx), Y(2.5), 2.5 * u, 0, TAU);
    }
    // frame: rear hub, crank, seat, head tube, front hub
    ctx.moveTo(X(-3.6), Y(2.5));
    ctx.lineTo(X(0), Y(2.5));
    ctx.lineTo(X(-1), Y(6.6));
    ctx.lineTo(X(-3.6), Y(2.5));
    ctx.moveTo(X(-1), Y(6.6));
    ctx.lineTo(X(2.6), Y(6.8));
    ctx.lineTo(X(3.6), Y(2.5));
    ctx.moveTo(X(0), Y(2.5));
    ctx.lineTo(X(2.6), Y(6.8));
    ctx.stroke();

    // the rider, upright in the Dutch way, pedalling
    ctx.lineWidth = Math.max(1, 1.2 * u);
    ctx.beginPath();
    ctx.moveTo(X(-1), Y(7));
    ctx.lineTo(X(0.2), Y(12.6));
    ctx.lineTo(X(2.8), Y(7.6));
    for (const side of [0, Math.PI]) {
      const px = Math.cos(crank + side) * 1.5;
      const py = 2.5 + Math.sin(crank + side) * 1.5;
      ctx.moveTo(X(-1), Y(7));
      ctx.lineTo(X((px - 1) / 2 + 1.6), Y((py + 7) / 2 + 0.6));
      ctx.lineTo(X(px), Y(py));
    }
    ctx.stroke();
    ctx.fillStyle = "#060a11";
    ctx.beginPath();
    ctx.arc(X(0.5), Y(14.1), 1.35 * u, 0, TAU);
    ctx.fill();

    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.85;
    ctx.drawImage(this.lamp, X(3.4) - 5 * u, Y(6) - 5 * u, 10 * u, 10 * u);
    ctx.globalAlpha = 0.3;
    ctx.drawImage(this.lamp, X(9) - 9 * u, Y(1) - 2.5 * u, 18 * u, 5 * u);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = rgba(RED, 0.9);
    ctx.fillRect(X(-4.4) - 0.5 * u, Y(5.4), 1 * u, 1 * u);
  }
}
