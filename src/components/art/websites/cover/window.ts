import { blurred } from "../lib/blur";
import { context, makeCanvas } from "../lib/canvas";
import type { Ink, Prim, Wireframe } from "./wireframes";

/** How one window floats in the space, baked into its sprite. */
export interface WindowLook {
  /** width across its centre, CSS px */
  width: number;
  /** tilt, radians */
  yaw: number;
  pitch: number;
  roll: number;
  /** depth of field: Gaussian sigma, CSS px */
  blur: number;
  /** 0..1 soft bloom round the lines (in-focus windows) */
  glow: number;
}

/** Window space (u, v) to sprite-centre-relative screen px, with perspective. */
export type Project = (u: number, v: number) => [number, number];

export interface WindowSprite {
  canvas: HTMLCanvasElement;
  bloom: HTMLCanvasElement | null;
  /** sprite top-left relative to the window centre, CSS px, and its size */
  ox: number;
  oy: number;
  w: number;
  h: number;
  project: Project;
}

type RGBA = readonly [number, number, number, number];
export const INK: Record<Ink, RGBA> = {
  frame: [176, 188, 255, 0.62],
  line: [150, 164, 244, 0.34],
  text: [176, 188, 255, 0.24],
  strong: [214, 220, 255, 0.46],
  accent: [125, 211, 252, 0.62],
  violet: [167, 139, 250, 0.66],
  ok: [74, 222, 128, 0.8],
  panel: [34, 40, 96, 0.32],
};
export const ink = (i: Ink, a = 1) => {
  const c = INK[i];
  return `rgba(${c[0]},${c[1]},${c[2]},${(c[3] * a).toFixed(3)})`;
};

export function projector(wf: Wireframe, look: WindowLook): Project {
  const s = look.width / wf.w;
  const f = look.width * 2.1;
  const cy = Math.cos(look.yaw);
  const sy = Math.sin(look.yaw);
  const cp = Math.cos(look.pitch);
  const sp = Math.sin(look.pitch);
  const cr = Math.cos(look.roll);
  const sr = Math.sin(look.roll);
  return (u, v) => {
    const x0 = (u - wf.w / 2) * s;
    const y0 = (v - wf.h / 2) * s;
    const x = x0 * cr - y0 * sr;
    const y = x0 * sr + y0 * cr;
    const z = -x * sy;
    const y2 = y * cp - z * sp;
    const z2 = y * sp + z * cp;
    const k = f / (f + z2);
    return [x * cy * k, y2 * k];
  };
}

/** Outline of a rounded rect in window space, as projected points. */
export function roundRect(p: Project, x: number, y: number, w: number, h: number, r: number): [number, number][] {
  const pts: [number, number][] = [];
  const rr = Math.min(r, w / 2, h / 2);
  const corner = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= 4; i++) {
      const a = a0 + (i / 4) * (Math.PI / 2);
      pts.push(p(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr));
    }
  };
  corner(x + w - rr, y + rr, -Math.PI / 2);
  corner(x + w - rr, y + h - rr, 0);
  corner(x + rr, y + h - rr, Math.PI / 2);
  corner(x + rr, y + rr, Math.PI);
  return pts;
}

export function trace(ctx: CanvasRenderingContext2D, pts: [number, number][], close = true) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
}

function drawPrim(ctx: CanvasRenderingContext2D, p: Project, prim: Prim) {
  if (prim.k === "line") {
    const pts: [number, number][] = [];
    for (let i = 0; i < prim.pts.length; i += 2) pts.push(p(prim.pts[i], prim.pts[i + 1]));
    trace(ctx, pts, false);
    ctx.strokeStyle = ink(prim.stroke);
    ctx.stroke();
    return;
  }
  if (prim.k === "dot") {
    const pts: [number, number][] = [];
    for (let i = 0; i < 18; i++) pts.push(p(prim.x + Math.cos((i / 18) * Math.PI * 2) * prim.r, prim.y + Math.sin((i / 18) * Math.PI * 2) * prim.r));
    trace(ctx, pts);
    if (prim.fill) {
      ctx.fillStyle = ink(prim.fill);
      ctx.fill();
    }
    if (prim.stroke) {
      ctx.strokeStyle = ink(prim.stroke);
      ctx.stroke();
    }
    return;
  }
  if (prim.k === "image") {
    // an image placeholder: a soft violet-to-blue fill, a mountain and a sun
    const outline = roundRect(p, prim.x, prim.y, prim.w, prim.h, prim.r);
    trace(ctx, outline);
    const [ax, ay] = p(prim.x, prim.y);
    const [bx, by] = p(prim.x + prim.w, prim.y + prim.h);
    const g = ctx.createLinearGradient(ax, ay, bx, by);
    g.addColorStop(0, "rgba(129,140,248,0.2)");
    g.addColorStop(1, "rgba(56,189,248,0.09)");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = ink("line");
    ctx.stroke();
    const { x, y, w, h } = prim;
    trace(ctx, [p(x + w * 0.12, y + h * 0.82), p(x + w * 0.38, y + h * 0.5), p(x + w * 0.55, y + h * 0.68), p(x + w * 0.7, y + h * 0.56), p(x + w * 0.88, y + h * 0.82)], false);
    ctx.strokeStyle = ink("strong", 0.8);
    ctx.stroke();
    const sun: [number, number][] = [];
    const r = Math.min(w, h) * 0.08;
    for (let i = 0; i < 14; i++) sun.push(p(x + w * 0.72 + Math.cos((i / 14) * Math.PI * 2) * r, y + h * 0.28 + Math.sin((i / 14) * Math.PI * 2) * r));
    trace(ctx, sun);
    ctx.strokeStyle = ink("strong", 0.8);
    ctx.stroke();
    return;
  }
  trace(ctx, roundRect(p, prim.x, prim.y, prim.w, prim.h, prim.r));
  if (prim.fill) {
    ctx.fillStyle = ink(prim.fill);
    ctx.fill();
  }
  if (prim.stroke) {
    ctx.strokeStyle = ink(prim.stroke);
    ctx.stroke();
  }
}

/** Bake a wireframe window into a sprite: dark glass body, thin lines, the
 *  layout inside, then depth of field and an optional bloom. */
export function renderWindow(wf: Wireframe, look: WindowLook, dpr: number): WindowSprite {
  const project = projector(wf, look);
  const corners = [project(0, 0), project(wf.w, 0), project(wf.w, wf.h), project(0, wf.h)];
  const xs = corners.map((c) => c[0]);
  const ys = corners.map((c) => c[1]);
  const pad = look.blur * 3 + 10;
  const ox = Math.min(...xs) - pad;
  const oy = Math.min(...ys) - pad;
  const w = Math.max(...xs) - ox + pad;
  const h = Math.max(...ys) - oy + pad;
  const canvas = makeCanvas(w * dpr, h * dpr);
  const ctx = context(canvas);
  ctx.setTransform(dpr, 0, 0, dpr, -ox * dpr, -oy * dpr);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(0.7, Math.min(1.3, (look.width / wf.w) * 1.9));

  const body = roundRect(project, 0, 0, wf.w, wf.h, 18);
  trace(ctx, body);
  const [tx, ty] = project(0, 0);
  const [bx, by] = project(wf.w, wf.h);
  const glass = ctx.createLinearGradient(tx, ty, bx, by);
  glass.addColorStop(0, "rgba(22,24,64,0.72)");
  glass.addColorStop(1, "rgba(9,10,32,0.78)");
  ctx.fillStyle = glass;
  ctx.fill();
  // a faint sheen across the glass, brightest at the top-left corner
  const sheen = ctx.createLinearGradient(tx, ty, tx + (bx - tx) * 0.5, ty + (by - ty) * 0.5);
  sheen.addColorStop(0, "rgba(190,200,255,0.07)");
  sheen.addColorStop(1, "rgba(190,200,255,0)");
  ctx.fillStyle = sheen;
  ctx.fill();
  ctx.strokeStyle = ink("frame");
  ctx.stroke();
  for (const prim of wf.prims) drawPrim(ctx, project, prim);

  const bloom = look.glow > 0 ? blurred(canvas, 7 * dpr).canvas : null;
  const out = look.blur > 0.3 ? blurred(canvas, look.blur * dpr).canvas : canvas;
  return { canvas: out, bloom, ox, oy, w, h, project };
}
