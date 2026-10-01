import { context, edgeFade, fadeTop, glowSprite, headerBand, PAGE_BG, paintGrain, radial, sizeCanvas } from "../lib/canvas";
import { panelAnchors, type PanelAnchors } from "../lib/anchors";
import { hash1, mulberry32, smooth } from "../lib/rng";
import type { CanvasScene } from "../lib/types";
import { renderCluster, type Led, type Sprite } from "./cube";
import { hypLayout } from "./layout";
import { blockFaces, type LedMode } from "./textures";

interface Block {
  sprite: Sprite;
  /** Home position of the sprite centre, device px. */
  x: number;
  y: number;
  /** Size factor from depth: parallax and bob scale with it. */
  s: number;
  fog: number;
  phase: number;
  speed: number;
  /** islands barely bob, debris floats more */
  bob: number;
  /** sprite's top-left relative to x, y: its centre, or its grass (pin top) */
  ox: number;
  oy: number;
  /** lifting blocks: travel and speed in device px, stagger 0..1 */
  rise: { dist: number; v: number; offset: number } | null;
  /** scene time it was baked (it fades in), -Infinity when built up front */
  born: number;
}

interface Mote {
  x: number;
  y: number;
  size: number;
  s: number;
  rise: number;
  sway: number;
  phase: number;
  ember: boolean;
}

type Pt = { x: number; y: number };
const PARALLAX = 16;
const depthScale = (z: number) => 1 / (0.35 + 2.1 * z);

function ledLevel(mode: LedMode, t: number, seed: number): number {
  if (mode === "power") return 0.7 + 0.12 * Math.sin(t * 1.1 + seed);
  if (mode === "alert") return (t * 0.55 + hash1(seed)) % 1 < 0.16 ? 1 : 0.05;
  // disk activity: bursts of fast flicker, then rest
  const burst = hash1(Math.floor(t * 1.6 + seed * 3.1)) > 0.42;
  return burst && hash1(Math.floor(t * 17 + seed * 7.7)) > 0.38 ? 1 : 0.08;
}

function paintBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number, core: Pt) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = PAGE_BG;
  ctx.fillRect(0, 0, w, h);
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, "#05070c");
  base.addColorStop(0.6, "#08070b");
  base.addColorStop(1, "#110609");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  const m = Math.max(w, h);
  radial(ctx, w * core.x, h * core.y, m * 0.62, [
    [0, "rgba(220,40,40,0.34)"],
    [0.22, "rgba(150,22,28,0.18)"],
    [0.55, "rgba(70,10,16,0.06)"],
    [1, "rgba(0,0,0,0)"],
  ], 0.62);
  // a cooler, quieter air behind the copy
  radial(ctx, w * 0.78, h * 0.42, m * 0.42, [
    [0, "rgba(34,42,62,0.16)"],
    [1, "rgba(0,0,0,0)"],
  ]);
  edgeFade(ctx, w, h, 0.08, headerBand(w));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  paintGrain(ctx, w * dpr, h * dpr, 0.07);
}

/** One job per cluster, far ones first: baking the big islands takes a few
 *  frames' worth of work, so the scene spreads it out while it runs. */
function blockJobs(w: number, h: number, dpr: number, anchors: PanelAnchors | null): { jobs: (() => Block)[]; core: Pt } {
  const faces = blockFaces();
  const { placements, core, unit } = hypLayout(w, h, anchors);
  const m = Math.max(w, h);
  const rnd = mulberry32(3);
  const jobs = placements.map((p, i) => (): Block => {
    const s = depthScale(p.z);
    const fog = Math.max(0, Math.min(0.82, (p.z - 0.42) * 0.62));
    const near = Math.max(0, (0.25 - p.z) / 0.25);
    const blur = (near ** 1.1 * 5.5 + Math.max(0, (p.z - 1) / 0.6) * 1.2) * dpr;
    const heat = (p.heat ?? Math.max(0, Math.min(1, 1.35 - Math.hypot(core.x * w - p.x * w, (core.y * h - p.y * h) * 1.3) / (m * 0.5)))) * (1 - fog * 0.6);
    const sprite = renderCluster(p.cells, unit * dpr * s * (p.scale ?? 1), { fog, blur, heat, heatDepth: p.heatDepth, shade: p.shade, mute: p.mute }, faces, i + 1);
    return {
      sprite,
      ox: p.pin === "top" ? -sprite.pivot[0] : -sprite.w / 2,
      oy: p.pin === "top" ? -sprite.pivot[1] : -sprite.h / 2,
      x: p.x * w * dpr,
      y: p.y * h * dpr,
      s,
      fog,
      phase: rnd() * Math.PI * 2,
      speed: 0.7 + rnd() * 0.6,
      bob: p.cells.length > 12 ? 0.35 : 1,
      rise: p.rise ? { dist: (p.y - p.rise.to) * h * dpr, v: p.rise.speed * dpr * s * 1.4, offset: p.rise.offset } : null,
      born: -Infinity,
    };
  });
  const order = placements.map((p, i) => ({ z: p.z, i })).sort((a, b) => b.z - a.z);
  return { jobs: order.map(({ i }) => jobs[i]), core };
}

function buildMotes(w: number, h: number, dpr: number, core: Pt): Mote[] {
  const rnd = mulberry32(11);
  const n = Math.round(Math.min(100, (w * h) / 14000));
  return Array.from({ length: n }, () => {
    const ember = rnd() < 0.4;
    const z = 0.3 + rnd() * 1.2;
    const cx = ember ? core.x + (rnd() - 0.5) * 0.8 : rnd();
    return {
      x: cx * w * dpr,
      y: rnd() * h * dpr,
      size: (ember ? 1.3 + rnd() * 1.5 : 0.9 + rnd() * 1.3) * dpr * Math.min(1.6, depthScale(z) * 1.4),
      s: depthScale(z),
      rise: (ember ? 10 + rnd() * 14 : 3 + rnd() * 6) * dpr,
      sway: (4 + rnd() * 10) * dpr,
      phase: rnd() * Math.PI * 2,
      ember,
    };
  });
}

/** HypHosting's world: floating Minecraft-like blocks in a red-lit void. */
export function createHypScene(host: HTMLElement): CanvasScene {
  const bg = host.querySelector<HTMLCanvasElement>('canvas[data-layer="bg"]')!;
  const fx = host.querySelector<HTMLCanvasElement>('canvas[data-layer="fx"]')!;
  const bctx = context(bg, { alpha: false });
  const ctx = context(fx);
  const red = glowSprite("255,70,60");
  const green = glowSprite("74,222,128");
  let blocks: Block[] = [];
  let queue: (() => Block)[] = [];
  let motes: Mote[] = [];
  let core: Pt = { x: 0.3, y: 1 };
  let W = 0;
  let H = 0;
  let R = 1;

  const drawLed = (l: Led, x0: number, y0: number, t: number, fade: number) => {
    const level = ledLevel(l.mode, t, l.seed) * fade;
    if (level < 0.02) return;
    const x = x0 + l.x;
    const y = y0 + l.y;
    const size = Math.max(1, l.size * 0.9);
    ctx.globalAlpha = level;
    ctx.fillStyle = l.color === "red" ? "#ff8a80" : "#b8f7cf";
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
    const g = l.size * 11;
    ctx.globalAlpha = level * 0.8;
    ctx.drawImage(l.color === "red" ? red : green, x - g / 2, y - g / 2, g, g);
  };

  const drawBlock = (b: Block, t: number, px: number, py: number, par: number) => {
    let lift = 0;
    let alpha = Math.min(1, (t - b.born) / 0.7);
    if (b.rise) {
      const p = (t * (b.rise.v / b.rise.dist) + b.rise.offset) % 1;
      lift = p * b.rise.dist;
      alpha *= smooth(0, 0.12, p) * (1 - smooth(0.8, 1, p));
      if (alpha < 0.01) return;
    }
    const bob = Math.sin(t * 0.42 * b.speed + b.phase) * b.bob;
    const sway = Math.sin(t * 0.27 * b.speed + b.phase * 1.7) * b.bob;
    const x = b.x + (sway * 5 - px * par) * b.s * R * 0.9 + b.ox;
    const y = b.y - lift + (bob * 7 - py * par * 0.7) * b.s * R * 0.9 + b.oy;
    const halo = b.sprite.halo;
    if (halo) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = (0.75 + 0.25 * Math.sin(t * 0.7)) * alpha;
      ctx.drawImage(halo.canvas, x - halo.pad, y - halo.pad, b.sprite.w + halo.pad * 2, b.sprite.h + halo.pad * 2);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = alpha;
    ctx.drawImage(b.sprite.canvas, x, y, b.sprite.w, b.sprite.h);
    if (!b.sprite.emissive && !b.sprite.leds.length) return;
    ctx.globalCompositeOperation = "lighter";
    if (b.sprite.emissive) {
      ctx.globalAlpha = (0.55 + 0.45 * Math.sin(t * 0.9 + b.phase)) * (1 - b.fog) * alpha;
      ctx.drawImage(b.sprite.emissive, x, y, b.sprite.w, b.sprite.h);
    }
    for (const l of b.sprite.leds) drawLed(l, x, y, t, (1 - b.fog * 0.8) * alpha);
  };

  return {
    resize(w, h, dpr) {
      W = w;
      H = h;
      R = dpr;
      sizeCanvas(bg, w, h, dpr);
      sizeCanvas(fx, w, h, dpr);
      const built = blockJobs(w, h, dpr, panelAnchors(host));
      queue = built.jobs;
      blocks = [];
      core = built.core;
      paintBackdrop(bctx, w, h, dpr, core);
      motes = buildMotes(w, h, dpr, core);
    },
    draw(t, px, py, complete) {
      // bake what is left of the clusters: all of it for a lone frame, else
      // a few milliseconds' worth per frame, each fading in as it lands
      if (queue.length) {
        const t0 = performance.now();
        while (queue.length && (complete || performance.now() - t0 < 7)) {
          const b = queue.shift()!();
          if (!complete) b.born = t;
          blocks.push(b);
        }
        blocks.sort((a, b) => a.s - b.s);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, fx.width, fx.height);
      const par = PARALLAX * R;

      // the core breathes, like a machine under load
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * 0.7);
      const m = Math.max(W, H) * R;
      radial(ctx, core.x * W * R - px * par * 0.3, core.y * H * R - py * par * 0.3, m * 0.36, [
        [0, "rgba(239,68,68,0.1)"],
        [1, "rgba(239,68,68,0)"],
      ], 0.6);

      for (const b of blocks) drawBlock(b, t, px, py, par);

      const span = H * R + 40 * R;
      for (const mo of motes) {
        const yy = ((((mo.y - t * mo.rise) % span) + span) % span) - 20 * R;
        const xx = mo.x + Math.sin(t * 0.35 + mo.phase) * mo.sway - px * par * mo.s;
        const life = Math.max(0, Math.sin((yy / (H * R)) * Math.PI));
        const tw = 0.6 + 0.4 * Math.sin(t * 2.1 + mo.phase * 3);
        if (mo.ember) {
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = 0.6 * life * tw;
          ctx.fillStyle = "#ff6a55";
          ctx.fillRect(xx, yy, mo.size, mo.size);
          ctx.globalAlpha = 0.3 * life * tw;
          const g = mo.size * 7;
          ctx.drawImage(red, xx + mo.size / 2 - g / 2, yy + mo.size / 2 - g / 2, g, g);
        } else {
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = 0.22 * life * tw;
          ctx.fillStyle = "#cfc6c2";
          ctx.fillRect(xx, yy, mo.size, mo.size);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      fadeTop(ctx, fx.width, headerBand(W) * R);
    },
  };
}
