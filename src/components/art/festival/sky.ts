import type { Layout } from "./layout";
import { TAU, between, rng, smoothstep } from "./math";
import { CERULEAN, VERMILION, rgba, type RGB } from "./palette";
import { grainTile } from "./sprites";

/** The still part of the night: sky, stars, the glow the stage throws up into
 *  it, a line of trees and, far off on the calm side, the Dom tower. Drawn once
 *  per size at CSS resolution (it is all soft), with a little grain so the
 *  dark gradients do not band. */
export function drawSky(ctx: CanvasRenderingContext2D, L: Layout) {
  const { w, h, u, cx, horizon, roof } = L;
  const r = rng(7);

  const g = ctx.createLinearGradient(0, 0, 0, h);
  const hz = horizon / h;
  g.addColorStop(0, "#05080d");
  g.addColorStop(hz * 0.45, "#070b18");
  g.addColorStop(hz * 0.85, "#0e0f27");
  g.addColorStop(hz, "#17112c");
  g.addColorStop(Math.min(1, hz + 0.08), "#0b0916");
  g.addColorStop(1, "#05060b");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // light pollution over the stage: a warm dome, and a cooler, wider wash
  const span = L.stageR - L.stageL;
  glow(ctx, cx, horizon - 40 * u, span * 1.25, VERMILION, 0.2);
  glow(ctx, cx, roof + 60 * u, span * 0.95, [255, 120, 110], 0.07);
  glow(ctx, cx - span * 0.35, horizon - 80 * u, span * 1.1, CERULEAN, 0.1);

  // stars: fewer where the stage glow would wash them out, none near the horizon
  const count = Math.round((w * horizon) / 2600);
  for (let i = 0; i < count; i++) {
    const x = r() * w;
    const y = r() ** 1.35 * (horizon - 60 * u);
    const near = Math.hypot((x - cx) / (span * 0.9), (y - horizon) / (span * 0.7));
    const a = between(r, 0.12, 0.75) * smoothstep(0.55, 1.4, near);
    const s = r() < 0.1 ? 1.4 : between(r, 0.5, 1);
    const warm = r() < 0.2;
    if (a < 0.03) continue;
    ctx.fillStyle = warm ? `rgba(255,214,190,${a})` : `rgba(210,225,255,${a})`;
    ctx.beginPath();
    ctx.arc(x, y, s * 0.6, 0, TAU);
    ctx.fill();
  }

  if (L.wide) dom(ctx, L);
  trees(ctx, L);

  // grain: adds 0 to 3 levels, enough to break the bands
  const grain = ctx.createPattern(grainTile(), "repeat");
  if (grain) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.012;
    ctx.fillStyle = grain;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c: RGB, a: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(c, a));
  g.addColorStop(0.35, rgba(c, a * 0.45));
  g.addColorStop(0.7, rgba(c, a * 0.1));
  g.addColorStop(1, rgba(c, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** A soft wall of crowns along the horizon, with a few Dutch poplars. */
function trees(ctx: CanvasRenderingContext2D, L: Layout) {
  const { w, h, u, horizon } = L;
  const r = rng(23);
  ctx.fillStyle = "#07070f";
  ctx.beginPath();
  ctx.rect(-10, horizon, w + 20, h - horizon + 10);
  let x = -20;
  while (x < w + 20) {
    const poplar = r() < 0.12;
    const cw = poplar ? between(r, 7, 11) * u : between(r, 14, 30) * u;
    const ch = poplar ? between(r, 48, 70) * u : between(r, 12, 34) * u;
    ctx.moveTo(x + cw * 0.55, horizon - ch * 0.5);
    ctx.ellipse(x, horizon - ch * 0.5, cw * 0.55, ch * 0.6, 0, 0, TAU);
    x += cw * between(r, 0.45, 0.8);
  }
  ctx.fill();
}

/** Utrecht's Dom tower, tiny and faint on the far horizon, clear of the copy. */
function dom(ctx: CanvasRenderingContext2D, L: Layout) {
  const { w, u, horizon } = L;
  const x = Math.min(w - 44 * u, Math.max(w * 0.9, L.textR + 46 * u));
  const k = u * 0.95;
  const base = horizon - 6 * k;
  ctx.fillStyle = "#0a0a18";
  ctx.beginPath();
  // two square stages, the octagonal lantern, and its little crown
  ctx.rect(x - 11 * k, base - 70 * k, 22 * k, 70 * k);
  ctx.rect(x - 9 * k, base - 98 * k, 18 * k, 28 * k);
  ctx.moveTo(x - 7 * k, base - 98 * k);
  ctx.lineTo(x - 6 * k, base - 126 * k);
  ctx.lineTo(x + 6 * k, base - 126 * k);
  ctx.lineTo(x + 7 * k, base - 98 * k);
  ctx.moveTo(x - 4 * k, base - 126 * k);
  ctx.quadraticCurveTo(x, base - 138 * k, x + 4 * k, base - 126 * k);
  ctx.rect(x - 0.8 * k, base - 146 * k, 1.6 * k, 12 * k);
  ctx.fill();
  // window slits catch a little of the stage light
  ctx.fillStyle = "rgba(255,120,100,0.05)";
  for (let i = 0; i < 3; i++) ctx.fillRect(x - 5 * k + i * 4 * k, base - 92 * k, 1.6 * k, 12 * k);
}
