import { context, makeCanvas } from "../lib/canvas";

let star: HTMLCanvasElement | null = null;

/** A four-point glint with two faint diagonals and a soft core, white. */
export function starSprite(): HTMLCanvasElement {
  if (star) return star;
  const s = 128;
  const c = makeCanvas(s, s);
  const ctx = context(c);
  const m = s / 2;
  const core = ctx.createRadialGradient(m, m, 0, m, m, s * 0.2);
  core.addColorStop(0, "rgba(255,255,255,0.95)");
  core.addColorStop(0.25, "rgba(236,228,255,0.4)");
  core.addColorStop(1, "rgba(236,228,255,0)");
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, s, s);
  for (const [len, thick, rot, a] of [
    [0.5, 0.014, 0, 1],
    [0.5, 0.014, Math.PI / 2, 1],
    [0.2, 0.01, Math.PI / 4, 0.55],
    [0.2, 0.01, -Math.PI / 4, 0.55],
  ]) {
    ctx.save();
    ctx.translate(m, m);
    ctx.rotate(rot);
    const g = ctx.createLinearGradient(-len * s, 0, len * s, 0);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, `rgba(255,255,255,${a})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, len * s, thick * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  star = c;
  return c;
}
