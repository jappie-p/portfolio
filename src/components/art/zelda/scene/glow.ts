import { css, type Rgb } from "./color";
import { makeCanvas } from "./raster";

/** A soft round light, drawn additively over the crisp pixels (the only
 *  thing in the scene that is allowed to be blurry). */
export function glowSprite(c: Rgb, size = 128): HTMLCanvasElement {
  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const h = size / 2;
  const g = ctx.createRadialGradient(h, h, 0, h, h, h);
  g.addColorStop(0, css(c, 1));
  g.addColorStop(0.16, css(c, 0.62));
  g.addColorStop(0.4, css(c, 0.22));
  g.addColorStop(0.7, css(c, 0.06));
  g.addColorStop(1, css(c, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

export function glow(ctx: CanvasRenderingContext2D, sprite: HTMLCanvasElement, x: number, y: number, rx: number, ry: number, alpha: number) {
  if (alpha <= 0.003) return;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.drawImage(sprite, x - rx, y - ry, rx * 2, ry * 2);
}
