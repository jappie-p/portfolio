import { fixtures } from "./bokeh";
import type { KioskLayout } from "./layout";
import { drawShafts } from "./shafts";
import { grainPattern, rgba, type RGB } from "./sprites";

/** The still room: deep green into dark teal, lamplight slanting in, the
 *  lamps' cords and festoon wires, a warm pool on the floor where the kiosks
 *  stand, and darker toward the copy. Drawn once per size. */
export function drawRoom(ctx: CanvasRenderingContext2D, L: KioskLayout) {
  const { w, h, u, cx, cy, base, half } = L;
  const g = ctx.createLinearGradient(0, 0, w, h * 0.35);
  g.addColorStop(0, "#0a3124");
  g.addColorStop(0.42, "#082a27");
  g.addColorStop(0.75, "#062129");
  g.addColorStop(1, "#05171e");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  glow(ctx, cx, cy - 30 * u, half * 2.8, [24, 104, 72], 0.4);
  glow(ctx, cx - half * 0.7, cy - 170 * u, half * 1.7, [255, 170, 90], 0.08);
  slats(ctx, L);
  drawShafts(ctx, L);

  // the floor falls off into shadow, with a warm pool where the kiosks stand
  const floor = ctx.createLinearGradient(0, base - 10 * u, 0, h);
  floor.addColorStop(0, "rgba(3,12,13,0)");
  floor.addColorStop(0.4, "rgba(3,12,13,0.45)");
  floor.addColorStop(1, "rgba(3,9,11,0.75)");
  ctx.fillStyle = floor;
  ctx.fillRect(0, base - 10 * u, w, h - base + 10 * u);
  ctx.save();
  ctx.translate(cx, base + 4 * u);
  ctx.scale(1, 0.14);
  glow(ctx, 0, 0, half * 2.2, [255, 176, 104], 0.26);
  glow(ctx, 0, 0, half * 1.1, [255, 206, 150], 0.14);
  ctx.restore();

  // ceiling shadow
  const top = ctx.createLinearGradient(0, 0, 0, h * 0.35);
  top.addColorStop(0, "rgba(3,8,10,0.55)");
  top.addColorStop(1, "rgba(3,8,10,0)");
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, w, h * 0.35);

  // the lamps' cords and the festoon wires, soft with distance
  const { strings, pendants } = fixtures(L);
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(255,196,140,0.07)";
  ctx.lineWidth = 2 * u;
  for (const p of pendants) {
    ctx.beginPath();
    ctx.moveTo(p.x, -4);
    ctx.lineTo(p.x, p.y - p.r * 0.7 * u);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,196,140,0.1)";
  ctx.lineWidth = 1.4 * u;
  for (const s of strings) {
    ctx.beginPath();
    ctx.moveTo(s.x0, s.y);
    ctx.quadraticCurveTo((s.x0 + s.x1) / 2, s.y + s.sag * 2, s.x1, s.y);
    ctx.stroke();
  }

  // the copy's side sinks toward the page colour
  const c = L.calm;
  const calm = c.axis === "x" ? ctx.createLinearGradient(c.from - 120, 0, c.to + 160, 0) : ctx.createLinearGradient(0, c.from - 60, 0, c.to);
  calm.addColorStop(0, "rgba(5,8,13,0)");
  calm.addColorStop(1, "rgba(5,8,13,0.72)");
  ctx.fillStyle = calm;
  ctx.fillRect(0, 0, w, h);

  // a whisper of grain so the dark gradients do not band
  const grain = grainPattern(ctx);
  if (grain) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.014;
    ctx.fillStyle = grain;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
}

/** A wall of vertical wooden slats behind the kiosks, far out of focus: only
 *  the lamplight on their edges shows, strongest round the room's centre. */
function slats(ctx: CanvasRenderingContext2D, L: KioskLayout) {
  const { h, u, cx, cy, base, half } = L;
  const x0 = cx - half * 2.2;
  const x1 = L.wide ? L.calm.from : L.w;
  const top = cy - 330 * u;
  const pitch = 22 * u;
  ctx.save();
  ctx.filter = `blur(${(2.2 * u).toFixed(1)}px)`;
  for (let x = x0; x < x1; x += pitch) {
    const near = Math.exp(-(((x - cx) / (half * 1.9)) ** 2));
    const g = ctx.createLinearGradient(0, top, 0, base);
    g.addColorStop(0, "rgba(255,200,140,0)");
    g.addColorStop(0.35, `rgba(255,200,140,${(0.05 * near).toFixed(3)})`);
    g.addColorStop(1, "rgba(255,200,140,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x, top, 3 * u, Math.min(h, base) - top);
  }
  ctx.restore();
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c: RGB, a: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(c, a));
  g.addColorStop(0.4, rgba(c, a * 0.45));
  g.addColorStop(0.75, rgba(c, a * 0.1));
  g.addColorStop(1, rgba(c, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
