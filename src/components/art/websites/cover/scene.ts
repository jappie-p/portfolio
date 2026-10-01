import { context, edgeFade, fadeTop, headerBand, makeCanvas, PAGE_BG, paintGrain, radial, sizeCanvas } from "../lib/canvas";
import { mulberry32, smooth, valueNoise } from "../lib/rng";
import type { CanvasScene } from "../lib/types";
import { coverLayout, dof, haze } from "./layout";
import { ink, renderWindow, roundRect, trace, type WindowSprite } from "./window";
import { wireframe, type Live } from "./wireframes";

interface Win {
  sprite: WindowSprite;
  x: number;
  y: number;
  z: number;
  alpha: number;
  glow: number;
  live: Live[];
  /** window space to CSS px scale, for sizing live bits */
  phase: number;
}

const PARALLAX = 22;
/** A light sweep crosses every SWEEP_EVERY seconds and takes SWEEP_FOR. */
const SWEEP_EVERY = 11;
const SWEEP_FOR = 4.2;

/** Deep blue-violet space: a nebula of fbm noise painted small and scaled
 *  up (it is soft anyway), glows, and a fine starfield. */
function paintSpace(ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = PAGE_BG;
  ctx.fillRect(0, 0, w, h);
  const base = ctx.createLinearGradient(0, 0, w * 0.3, h);
  base.addColorStop(0, "#070a1d");
  base.addColorStop(0.55, "#0a0a22");
  base.addColorStop(1, "#0c0820");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  const q = 1 / 6;
  const nw = Math.ceil(w * q);
  const nh = Math.ceil(h * q);
  const neb = makeCanvas(nw, nh);
  const nctx = context(neb);
  const img = nctx.createImageData(nw, nh);
  const n1 = valueNoise(41);
  const n2 = valueNoise(42);
  const fbm = (x: number, y: number) => n1(x, y) * 0.55 + n1(x * 2.1, y * 2.1) * 0.28 + n1(x * 4.3, y * 4.3) * 0.17;
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      const u = x / nw;
      const v = y / nh;
      const warp = n2(u * 3, v * 3) * 1.4;
      const d = fbm(u * 3.2 + warp, v * 2.4 - warp * 0.6);
      const cloud = smooth(0.42, 0.85, d);
      // violet on the right behind the screenshots, bluer to the left
      const t = Math.min(1, Math.max(0, u * 1.2 - 0.1));
      const i = (y * nw + x) * 4;
      img.data[i] = 40 + 60 * t;
      img.data[i + 1] = 38 + 8 * t;
      img.data[i + 2] = 120 + 40 * t;
      img.data[i + 3] = cloud * 70;
    }
  }
  nctx.putImageData(img, 0, 0);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(neb, 0, 0, w, h);

  const m = Math.max(w, h);
  radial(ctx, w * 0.7, h * 0.52, m * 0.45, [
    [0, "rgba(124,92,255,0.18)"],
    [0.4, "rgba(80,60,200,0.07)"],
    [1, "rgba(0,0,0,0)"],
  ], 0.8);
  radial(ctx, w * 0.12, h * 0.18, m * 0.35, [
    [0, "rgba(59,130,246,0.1)"],
    [1, "rgba(0,0,0,0)"],
  ]);
  const rnd = mulberry32(77);
  for (let i = 0; i < Math.round((w * h) / 5200); i++) {
    const s = rnd() < 0.92 ? 0.6 + rnd() * 0.7 : 1.4 + rnd();
    ctx.fillStyle = `rgba(${200 + rnd() * 55},${205 + rnd() * 50},255,${0.12 + rnd() * rnd() * 0.6})`;
    ctx.fillRect(rnd() * w, rnd() * h, s, s);
  }
  edgeFade(ctx, w, h, 0.09, headerBand(w));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  paintGrain(ctx, w * dpr, h * dpr, 0.06);
}

/** The Websites cover: wireframe browser windows adrift in deep space, sharp
 *  at one depth and soft before and behind it, a light sweeping through. */
export function createCoverScene(host: HTMLElement): CanvasScene {
  const bg = host.querySelector<HTMLCanvasElement>('canvas[data-layer="bg"]')!;
  const fx = host.querySelector<HTMLCanvasElement>('canvas[data-layer="fx"]')!;
  const bctx = context(bg, { alpha: false });
  const ctx = context(fx);
  let wins: Win[] = [];
  let W = 0;
  let H = 0;
  let R = 1;

  const drawLive = (win: Win, x: number, y: number, t: number) => {
    const p = win.sprite.project;
    const at = (u: number, v: number): [number, number] => {
      const q = p(u, v);
      return [x + q[0], y + q[1]];
    };
    for (const l of win.live) {
      if (l.k === "caret") {
        if (Math.floor(t * 1.8 + win.phase) % 2) continue;
        trace(ctx, [at(l.x, l.y), at(l.x + 2.5, l.y), at(l.x + 2.5, l.y + l.h), at(l.x, l.y + l.h)]);
        ctx.fillStyle = ink("accent", 1.3);
        ctx.fill();
      } else if (l.k === "progress") {
        const k = smooth(0, 1, ((t * 0.18 + win.phase) % 1.25) / 1.25);
        trace(ctx, [at(l.x, l.y), at(l.x + l.w * k, l.y), at(l.x + l.w * k, l.y + l.h), at(l.x, l.y + l.h)]);
        ctx.fillStyle = ink("accent", 1.2);
        ctx.fill();
      } else {
        const k = Math.max(0, Math.sin((t / l.period) * Math.PI * 2 + win.phase)) ** 3;
        if (k < 0.02) continue;
        const pts = roundRect((u, v) => at(u, v), l.x, l.y, l.w, l.h, l.r);
        trace(ctx, pts);
        ctx.fillStyle = `rgba(167,139,250,${(0.1 * k).toFixed(3)})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(196,181,253,${(0.55 * k).toFixed(3)})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }
  };

  return {
    resize(w, h, dpr) {
      W = w;
      H = h;
      R = dpr;
      sizeCanvas(bg, w, h, dpr);
      sizeCanvas(fx, w, h, dpr);
      paintSpace(bctx, w, h, dpr);
      const u = Math.min(w, h);
      const rnd = mulberry32(29);
      wins = coverLayout(w, h)
        .map((p, i): Win => {
          const wf = wireframe(p.t, 100 + i);
          const inFocus = Math.abs(p.z - 1) < 0.2;
          const sprite = renderWindow(wf, { width: p.w * u, yaw: p.yaw, pitch: p.pitch, roll: p.roll ?? 0, blur: dof(p.z), glow: inFocus ? 1 : 0 }, dpr);
          return { sprite, x: p.x * w, y: p.y * h, z: p.z, alpha: 1 - haze(p.z), glow: inFocus ? 1 : 0, live: inFocus ? wf.live : [], phase: rnd() * 10 };
        })
        .sort((a, b) => b.z - a.z);
    },
    draw(t, px, py) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, fx.width, fx.height);
      ctx.setTransform(R, 0, 0, R, 0, 0);
      ctx.lineJoin = "round";

      for (const win of wins) {
        const near = 1 / Math.max(0.25, win.z);
        const x = win.x + Math.sin(t * 0.11 + win.phase) * 7 * near - px * PARALLAX * near;
        const y = win.y + Math.cos(t * 0.09 + win.phase * 1.3) * 6 * near - py * PARALLAX * near * 0.7;
        const s = win.sprite;
        if (s.bloom) {
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = 0.32 * win.alpha;
          ctx.drawImage(s.bloom, x + s.ox, y + s.oy, s.w, s.h);
          ctx.globalCompositeOperation = "source-over";
        }
        ctx.globalAlpha = win.alpha;
        ctx.drawImage(s.canvas, x + s.ox, y + s.oy, s.w, s.h);
        ctx.globalAlpha = 1;
        if (win.live.length) drawLive(win, x, y, t);
      }

      // now and then a soft band of light sweeps through and catches the lines
      const cycle = t % SWEEP_EVERY;
      if (cycle < SWEEP_FOR) {
        const k = cycle / SWEEP_FOR;
        // a narrow band leaning 20 degrees off vertical, crossing left to right
        const nx = Math.cos(0.35);
        const ny = Math.sin(0.35);
        const cx = -0.25 * W + k * 1.5 * W;
        const cy = H / 2;
        const half = W * 0.09;
        const g = ctx.createLinearGradient(cx - nx * half, cy - ny * half, cx + nx * half, cy + ny * half);
        const a = Math.sin(k * Math.PI);
        g.addColorStop(0, "rgba(190,200,255,0)");
        g.addColorStop(0.5, `rgba(220,226,255,${(0.42 * a).toFixed(3)})`);
        g.addColorStop(1, "rgba(190,200,255,0)");
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.06;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
      fadeTop(ctx, W, headerBand(W));
    },
  };
}
