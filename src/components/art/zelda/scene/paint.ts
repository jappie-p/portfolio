import { fireflyAt, rupeeGlint, slimePose, type Burst, type Firefly, type Meteor, type Puff, type Rupee, type Slime } from "./actors";
import type { Cloud } from "./clouds";
import { css, mix, type Rgb } from "./color";
import { glow, glowSprite } from "./glow";
import type { Ground, Tuft } from "./ground";
import type { Hero } from "./hero";
import { drawOpenDoor, drawPanes } from "./house";
import type { Band } from "./land";
import { MARGIN, type Layout } from "./layout";
import { CELL_H, CELL_W, ROW, type LinkSheet } from "./link";
import { LIGHT, NIGHT, NIGHT_NEAR } from "./palette";
import type { Sky } from "./sky";
import { rupeeFrames, shadowSprite, slimeFrames, smokeFrames, sparkleFrames, tuftFrames } from "./sprites";

/** Everything built for one screen size. Layer canvases are W + 2 * MARGIN
 *  wide; "layer x" is view x + MARGIN. */
export type World = {
  L: Layout;
  sky: Sky;
  clouds: Cloud[];
  hills: Band;
  trees: Band;
  ground: Ground;
  near: HTMLCanvasElement;
  nearCtx: CanvasRenderingContext2D;
  nearTop: number;
  slimes: Slime[];
  rupees: Rupee[];
  fireflies: Firefly[];
};

/** The moving parts, read by the painters each frame. */
export type Frame = {
  t: number;
  still: boolean;
  /** device pixels per logical pixel */
  s: number;
  cam: number;
  door: number;
  fire: number;
  hero: Hero;
  link: LinkSheet | null;
  puffs: Puff[];
  bursts: Burst[];
  meteor: Meteor | null;
};

export const PARALLAX = 7;
export const DEPTH = { sky: 0.08, hills: 0.25, trees: 0.45, near: 1 };

export function makeArt() {
  return {
    tuftFar: tuftFrames(NIGHT),
    tuftNear: tuftFrames(NIGHT_NEAR),
    slime: slimeFrames(),
    shadow: shadowSprite(11, 3),
    slimeShadow: shadowSprite(9, 3),
    green: rupeeFrames("green"),
    blue: rupeeFrames("blue"),
    sparkle: sparkleFrames(),
    smoke: smokeFrames(),
    fire: glowSprite(LIGHT.fire),
    moon: glowSprite(LIGHT.moon),
    firefly: glowSprite(LIGHT.firefly, 64),
    rupee: glowSprite(LIGHT.rupee, 64),
    blueRupee: glowSprite(LIGHT.blueRupee, 64),
  };
}
export type Art = ReturnType<typeof makeArt>;

const SPARKLE_SEQ = [0, 1, 2, 1, 0];

function tuftSway(f: Frame, t: Tuft) {
  return f.still ? 1 : 1 + Math.round(Math.sin(f.t * 1.7 + t.phase) * 1.2);
}

function drawSlime(n: CanvasRenderingContext2D, art: Art, s: Slime) {
  const x = Math.round(s.x) + MARGIN - 8;
  n.drawImage(art.slimeShadow, x + 3, s.ground - 1);
  n.drawImage(art.slime[slimePose(s)], x, Math.round(s.ground - 13 - s.lift));
}

/** How much of the house's lamplight falls on Link. */
function warmth(w: World, f: Frame) {
  const h = f.hero;
  if (h.phase === "exit" || h.phase === "enter" || h.phase === "turn") return 0.6 * f.fire;
  const d = Math.abs(h.x + MARGIN - w.ground.pool.x) / w.ground.pool.rx;
  return Math.max(0, 1 - d) * (0.3 + 0.25 * f.door) * f.fire;
}

function drawHero(n: CanvasRenderingContext2D, art: Art, w: World, f: Frame) {
  const h = f.hero;
  if (!f.link || !h.visible) return;
  const fx = Math.round(h.x) + MARGIN;
  const fy = Math.round(h.y);
  const alpha = h.presence;
  n.globalAlpha = alpha;
  n.drawImage(art.shadow, fx - 5, fy - 2);
  const sx = h.frame() * CELL_W;
  const sy = ROW[h.facing] * CELL_H;
  n.drawImage(f.link.night, sx, sy, CELL_W, CELL_H, fx - 9, fy - CELL_H, CELL_W, CELL_H);
  const warm = warmth(w, f);
  if (warm > 0.02) {
    n.globalAlpha = warm * alpha;
    n.drawImage(f.link.lamp, sx, sy, CELL_W, CELL_H, fx - 9, fy - CELL_H, CELL_W, CELL_H);
  }
  n.globalAlpha = 1;
}

/** The near layer for this frame: the baked ground, then everything that moves on it. */
export function composeNear(w: World, f: Frame, art: Art) {
  const n = w.nearCtx;
  const { L, ground } = w;
  n.clearRect(0, w.nearTop, w.near.width, L.H - w.nearTop);
  n.drawImage(ground.canvas, 0, w.nearTop, w.near.width, L.H - w.nearTop, 0, w.nearTop, w.near.width, L.H - w.nearTop);
  drawPanes(n, ground.house, 0, f.fire);
  if (f.door > 0.5) drawOpenDoor(n, ground.house, 0, f.fire);

  for (const p of f.puffs) {
    const k = p.age / p.life;
    const sprite = art.smoke[Math.min(3, Math.floor(k * 4))];
    n.globalAlpha = 0.46 * (1 - k) * Math.min(1, p.age * 2.5);
    n.drawImage(sprite, Math.round(p.x - sprite.width / 2), Math.round(p.y - sprite.height / 2));
  }
  n.globalAlpha = 1;

  for (const t of ground.tufts) if (!t.near) n.drawImage(art.tuftFar[tuftSway(f, t)], t.x, t.y - 10);
  for (const r of w.rupees) if (r.gone <= 0) n.drawImage((r.kind === "green" ? art.green : art.blue)[f.still ? 0 : rupeeGlint(r)], r.x + MARGIN, r.y);
  for (const s of w.slimes) if (!s.front) drawSlime(n, art, s);
  drawHero(n, art, w, f);
  for (const s of w.slimes) if (s.front) drawSlime(n, art, s);
  for (const t of ground.tufts) if (t.near) n.drawImage(art.tuftNear[tuftSway(f, t)], t.x, t.y - 10);

  for (const r of w.rupees) {
    const k = f.still ? (r.kind === "blue" ? 0.25 : -1) : -r.sparkle;
    if (r.gone > 0 || k < 0 || k >= 0.5) continue;
    n.drawImage(art.sparkle[SPARKLE_SEQ[Math.floor(k / 0.1)]], r.x + MARGIN + 3, r.y - 3);
  }
  for (const b of f.bursts) {
    const d = 3 + b.age * 20;
    const sprite = art.sparkle[Math.max(0, 2 - Math.floor(b.age / 0.17))];
    for (const [ax, ay] of [[-1, -1], [1, -1], [-1, 0.4], [1, 0.4]]) {
      n.drawImage(sprite, Math.round(b.x + MARGIN + ax * d * 0.7 - 3), Math.round(b.y + ay * d * 0.7 - 3));
    }
  }
}

/** Twinkling stars and the odd falling star, over the baked sky. */
export function paintStars(ctx: CanvasRenderingContext2D, w: World, f: Frame, x0: number) {
  const { s } = f;
  for (const st of w.sky.twinklers) {
    const k = f.still ? 0.85 : 0.6 + 0.4 * Math.sin(f.t * st.speed + st.phase);
    ctx.fillStyle = css(mix(st.sky, st.color, st.peak * k));
    ctx.fillRect(x0 + st.x * s, st.y * s, s, s);
    if (!st.big || k < 0.72) continue;
    ctx.fillStyle = css(mix(st.sky, st.color, 0.5 * k));
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) ctx.fillRect(x0 + (st.x + dx) * s, (st.y + dy) * s, s, s);
  }
  const m = f.meteor;
  if (!m) return;
  const fade = Math.min(1, m.age / 0.08, (m.life - m.age) / 0.2);
  const len = Math.hypot(m.vx, m.vy);
  for (let i = 0; i < 12; i++) {
    const x = Math.round(m.x - (m.vx / len) * i * 1.4) + MARGIN;
    const y = Math.round(m.y - (m.vy / len) * i * 1.4);
    ctx.fillStyle = css([236, 242, 255] as Rgb, Math.max(0, fade * (1 - i / 12)));
    ctx.fillRect(x0 + x * s, y * s, s, s);
  }
}

function fireflyScreen(f: Frame, ff: Firefly) {
  const p = fireflyAt(ff, f.t);
  const depth = ff.depth ? 1.2 : 0.6;
  const g = f.still ? (ff.offset > 3.5 ? 0.9 : 0.4) : p.glow;
  return { x: Math.round((p.x + f.cam * depth * PARALLAX) * f.s), y: Math.round(p.y * f.s), g };
}

export function paintFireflies(ctx: CanvasRenderingContext2D, w: World, f: Frame) {
  for (const ff of w.fireflies) {
    const p = fireflyScreen(f, ff);
    if (p.g < 0.08) continue;
    ctx.fillStyle = css(mix([40, 96, 56], [226, 255, 160], p.g));
    ctx.fillRect(p.x, p.y, f.s, f.s);
  }
}

/** The soft lights, added over the pixels: moon, fire, fireflies, rupees. */
export function paintLights(ctx: CanvasRenderingContext2D, w: World, f: Frame, art: Art, skyX: number, nearX: number) {
  const { s } = f;
  const at = (x: number) => nearX + x * s;
  ctx.globalCompositeOperation = "lighter";
  ctx.imageSmoothingEnabled = true;

  const m = w.sky.moon;
  const mx = skyX + (m.x + 0.5) * s;
  const my = (m.y + 0.5) * s;
  glow(ctx, art.moon, mx, my, m.r * 8 * s, m.r * 8 * s, 0.2);
  glow(ctx, art.moon, mx, my, m.r * 2.4 * s, m.r * 2.4 * s, 0.26);

  const { house, pool } = w.ground;
  const [wx, wy] = house.panes[0];
  glow(ctx, art.fire, at(wx + 5), (wy + 3.5) * s, 15 * s, 15 * s, 0.34 * f.fire);
  const [dx, dy, dw, dh] = house.door;
  glow(ctx, art.fire, at(dx + dw / 2), (dy + dh - 2) * s, 24 * s, 18 * s, 0.5 * f.door * f.fire);
  glow(ctx, art.fire, at(pool.x), (pool.y + 1) * s, pool.rx * s, pool.ry * s, (0.12 + 0.14 * f.door) * f.fire);

  for (const ff of w.fireflies) {
    const p = fireflyScreen(f, ff);
    glow(ctx, art.firefly, p.x + s / 2, p.y + s / 2, 6.5 * s, 6.5 * s, p.g * 0.75);
  }
  for (const r of w.rupees) {
    if (r.gone > 0) continue;
    const flash = !f.still && r.sparkle < 0 && r.sparkle > -0.5 ? Math.sin((-r.sparkle / 0.5) * Math.PI) : 0;
    glow(ctx, r.kind === "green" ? art.rupee : art.blueRupee, at(r.x + MARGIN + 3.5), (r.y + 5.5) * s, 8 * s, 8 * s, 0.16 + flash * 0.3);
  }
  for (const b of f.bursts) glow(ctx, art.rupee, at(b.x + MARGIN), b.y * s, 12 * s, 12 * s, (1 - b.age / 0.5) * 0.55);
  if (f.meteor) glow(ctx, art.moon, skyX + (f.meteor.x + MARGIN) * s, f.meteor.y * s, 5 * s, 5 * s, 0.5 * Math.min(1, (f.meteor.life - f.meteor.age) / 0.2));

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.imageSmoothingEnabled = false;
}
