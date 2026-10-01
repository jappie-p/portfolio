import { blurred } from "../lib/blur";
import { context, makeCanvas } from "../lib/canvas";
import type { BlockFaces, BlockKind, LedMode } from "./textures";

/** One unit cube of a cluster, on an integer grid (y is up). */
export interface Cell {
  kind: BlockKind;
  x: number;
  y: number;
  z: number;
  /** Texture rotation / mirror, so repeated blocks do not read as stamps. */
  variant?: number;
}

/** How a cluster sits in the scene, baked into its sprite. */
export interface Look {
  /** 0..1 blend into the void (distance). */
  fog: number;
  /** Depth-of-field blur, Gaussian sigma in device px. */
  blur: number;
  /** 0..1 red light bouncing up from below. */
  heat: number;
  /** 0..1: how much hotter the lowest cubes are than the top (islands). */
  heatDepth?: number;
  /** 0..1 darkening for near blocks, out of the light. */
  shade?: number;
  /** 0..1 desaturation, so big set pieces stay behind the site they frame. */
  mute?: number;
}

export interface Led {
  x: number;
  y: number;
  size: number;
  color: "green" | "red";
  mode: LedMode;
  seed: number;
}

export interface Halo {
  canvas: HTMLCanvasElement;
  /** extra margin around the sprite footprint, device px */
  pad: number;
}

export interface Sprite {
  canvas: HTMLCanvasElement;
  /** Red glow behind the silhouette, drawn additively first. */
  halo: Halo | null;
  /** Emissive ore, drawn additively with a slow pulse; same footprint. */
  emissive: HTMLCanvasElement | null;
  /** Footprint in device px (the canvas may be smaller when blurred). */
  w: number;
  h: number;
  /** LEDs relative to the sprite's top-left, device px. */
  leds: Led[];
  /** the middle of the cluster's top surface, relative to the sprite's
   *  top-left, device px: islands are placed by where their grass is */
  pivot: [number, number];
}

type P = [number, number];
const C30 = Math.cos(Math.PI / 6);
const FOG = "rgb(11,8,12)";

function poly(ctx: CanvasRenderingContext2D, pts: P[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]];

/** Put the unit square (u, v in 0..1) onto the parallelogram o + u*U + v*V. */
function onFace(ctx: CanvasRenderingContext2D, o: P, u: P, v: P, ss: number) {
  ctx.setTransform(u[0] * ss, u[1] * ss, v[0] * ss, v[1] * ss, o[0] * ss, o[1] * ss);
}

/** Draw a 16x16 texture onto the parallelogram o + u*U + v*V. */
function mapTex(ctx: CanvasRenderingContext2D, tex: HTMLCanvasElement, o: P, u: P, v: P, ss: number) {
  ctx.setTransform((u[0] / 16) * ss, (u[1] / 16) * ss, (v[0] / 16) * ss, (v[1] / 16) * ss, o[0] * ss, o[1] * ss);
  ctx.drawImage(tex, 0, 0);
}

/** Darken a band of a face from one of its edges (voxel ambient occlusion),
 *  in face space: `along` "u" runs across u from u = 0, "v" from v = 0. */
function occlude(ctx: CanvasRenderingContext2D, o: P, u: P, v: P, ss: number, along: "u" | "v", strength: number) {
  onFace(ctx, o, u, v, ss);
  const g = along === "v" ? ctx.createLinearGradient(0, 0, 0, 0.5) : ctx.createLinearGradient(0, 0, 0.5, 0);
  g.addColorStop(0, `rgba(0,0,0,${strength})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1, 1);
}

/** The red light from below, wrapping round the silhouette: the sprite's
 *  shape tinted red (hottest at the bottom) and blurred wide. */
function redHalo(src: HTMLCanvasElement, w: number, h: number, e: number, heat: number): Halo {
  const sigma = Math.max(4, e * 0.32);
  const pad = Math.ceil(sigma * 3);
  const c = makeCanvas(w + pad * 2, h + pad * 2);
  const ctx = context(c);
  ctx.drawImage(src, pad, pad, w, h);
  ctx.globalCompositeOperation = "source-in";
  const g = ctx.createLinearGradient(0, pad, 0, pad + h);
  g.addColorStop(0, `rgba(239,68,68,${0.12 * heat})`);
  g.addColorStop(1, `rgba(255,86,72,${0.85 * heat})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  return { canvas: blurred(c, sigma).canvas, pad };
}

/** Paint a full-size gradient onto the sprite with `op`, only where the
 *  sprite already has pixels. */
function masked(ctx: CanvasRenderingContext2D, sprite: HTMLCanvasElement, op: GlobalCompositeOperation, fill: (l: CanvasRenderingContext2D) => CanvasGradient) {
  const layer = makeCanvas(sprite.width, sprite.height);
  const l = context(layer);
  l.fillStyle = fill(l);
  l.fillRect(0, 0, layer.width, layer.height);
  l.globalCompositeOperation = "destination-in";
  l.drawImage(sprite, 0, 0);
  ctx.globalCompositeOperation = op;
  ctx.drawImage(layer, 0, 0);
  ctx.globalCompositeOperation = "source-over";
}

/**
 * Render a cluster of cubes as one isometric sprite: pixel textures mapped
 * crisp (supersampled for clean edges), shaded like block icons (top lit,
 * sides darker), voxel occlusion where cubes meet, red bounce light and a hot
 * rim on exposed lower edges, fog for distance and a depth-of-field blur.
 */
export function renderCluster(cells: Cell[], e: number, look: Look, faces: Record<BlockKind, BlockFaces>, seed: number): Sprite {
  const pad = Math.ceil(look.blur * 3 + 3);
  const occ = new Set(cells.map((c) => `${c.x},${c.y},${c.z}`));
  const has = (x: number, y: number, z: number) => occ.has(`${x},${y},${z}`);
  const centre = (c: Cell): P => [(c.x - c.z) * C30 * e, (c.x + c.z + 1) * 0.5 * e - (c.y + 0.5) * e];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let lo = Infinity;
  let hi = -Infinity;
  for (const c of cells) {
    const [x, y] = centre(c);
    minX = Math.min(minX, x - C30 * e);
    maxX = Math.max(maxX, x + C30 * e);
    minY = Math.min(minY, y - e);
    maxY = Math.max(maxY, y + e);
    lo = Math.min(lo, c.y);
    hi = Math.max(hi, c.y);
  }
  const w = Math.ceil(maxX - minX + pad * 2);
  const h = Math.ceil(maxY - minY + pad * 2);
  const off: P = [pad - minX, pad - minY];
  // the top surface's middle: the mean of the uppermost faces at ground level
  const ground = cells.filter((c) => c.kind === "grass" && !has(c.x, c.y + 1, c.z));
  const surface = ground.length ? ground : cells.filter((c) => !has(c.x, c.y + 1, c.z));
  const pivot = surface.reduce<P>((acc, c) => {
    const [x, y] = centre(c);
    return [acc[0] + (x + off[0]) / surface.length, acc[1] + (y - e / 2 + off[1]) / surface.length];
  }, [0, 0]);
  // supersample small sprites for clean edges; big ones have texels to spare
  const ss = look.blur > 1.5 || w * h > 600_000 ? 1 : 2;

  const big = makeCanvas(w * ss, h * ss);
  const ctx = context(big);
  ctx.imageSmoothingEnabled = false;
  const hasGlow = cells.some((c) => faces[c.kind].glow);
  const glow = hasGlow ? makeCanvas(w * ss, h * ss) : null;
  const gctx = glow ? context(glow) : null;
  if (gctx) gctx.imageSmoothingEnabled = false;

  const leds: Led[] = [];
  const texel = e / 16;
  const order = [...cells].sort((a, b) => a.x + a.y + a.z - (b.x + b.y + b.z) || a.y - b.y);

  for (const cell of order) {
    const { x: gx, y: gy, z: gz } = cell;
    const [cx, cy] = centre(cell);
    const c: P = [cx + off[0], cy + off[1]];
    const A: P = [c[0], c[1] - e];
    const B: P = [c[0] + C30 * e, c[1] - e / 2];
    const D: P = [c[0] - C30 * e, c[1] - e / 2];
    const Bot: P = [c[0], c[1] + e];
    const LL: P = [c[0] - C30 * e, c[1] + e / 2];
    const LR: P = [c[0] + C30 * e, c[1] + e / 2];
    const kind = faces[cell.kind];
    const variant = cell.variant ?? 0;
    const hex: P[] = [A, B, LR, Bot, LL, D];
    const topPoly: P[] = [A, B, c, D];
    const leftPoly: P[] = [D, c, Bot, LL];
    const rightPoly: P[] = [c, B, LR, Bot];
    // texture frames: top rotated by variant, sides optionally mirrored
    const corners = [A, B, c, D];
    const r = variant & 3;
    const tO = corners[r];
    const tU = sub(corners[(r + 1) & 3], tO);
    const tV = sub(corners[(r + 3) & 3], tO);
    const flip = (variant & 4) !== 0 && !kind.leds.length;
    const lO = flip ? c : D;
    const lU = flip ? sub(D, c) : sub(c, D);
    const lV = flip ? sub(Bot, c) : sub(LL, D);
    const rO = flip ? B : c;
    const rU = flip ? sub(c, B) : sub(B, c);
    const rV = flip ? sub(LR, B) : sub(Bot, c);

    const leftOpen = !has(gx, gy, gz + 1);
    const rightOpen = !has(gx + 1, gy, gz);
    const depthFrac = hi > lo ? (hi - gy) / (hi - lo) : 0;
    const heat = look.heat * (1 - (look.heatDepth ?? 0) + (look.heatDepth ?? 0) * depthFrac);

    // nearer cubes hide the ore glow of the ones behind them
    if (gctx) {
      gctx.setTransform(ss, 0, 0, ss, 0, 0);
      gctx.globalCompositeOperation = "destination-out";
      poly(gctx, hex);
      gctx.fill();
      gctx.globalCompositeOperation = "source-over";
    }

    ctx.setTransform(ss, 0, 0, ss, 0, 0);
    ctx.fillStyle = kind.base;
    poly(ctx, hex);
    ctx.fill();
    mapTex(ctx, kind.tex.top, tO, tU, tV, ss);
    mapTex(ctx, kind.tex.left, lO, lU, lV, ss);
    mapTex(ctx, kind.tex.right, rO, rU, rV, ss);
    if (gctx && kind.glow) {
      mapTex(gctx, kind.glow.top, tO, tU, tV, ss);
      mapTex(gctx, kind.glow.left, lO, lU, lV, ss);
      mapTex(gctx, kind.glow.right, rO, rU, rV, ss);
    }

    // block-icon shading: cool top light, darker sides
    ctx.setTransform(ss, 0, 0, ss, 0, 0);
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "rgb(152,160,182)";
    poly(ctx, topPoly);
    ctx.fill();
    ctx.fillStyle = "rgb(108,108,122)";
    poly(ctx, leftPoly);
    ctx.fill();
    ctx.fillStyle = "rgb(58,56,70)";
    poly(ctx, rightPoly);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    // voxel occlusion: under overhangs and along walls
    if (has(gx, gy + 1, gz - 1)) occlude(ctx, A, sub(B, A), sub(D, A), ss, "v", 0.5);
    if (has(gx - 1, gy + 1, gz)) occlude(ctx, A, sub(B, A), sub(D, A), ss, "u", 0.5);
    if (leftOpen && has(gx, gy + 1, gz + 1)) occlude(ctx, D, sub(c, D), sub(LL, D), ss, "v", 0.62);
    if (leftOpen && has(gx - 1, gy, gz + 1)) occlude(ctx, D, sub(c, D), sub(LL, D), ss, "u", 0.45);
    if (rightOpen && has(gx + 1, gy + 1, gz)) occlude(ctx, c, sub(B, c), sub(Bot, c), ss, "v", 0.62);
    if (rightOpen && has(gx + 1, gy, gz - 1)) occlude(ctx, B, sub(c, B), sub(LR, B), ss, "u", 0.45);
    ctx.setTransform(ss, 0, 0, ss, 0, 0);

    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    // the hot rim along exposed lower edges, strongest at the hanging tips
    const under = !has(gx, gy - 1, gz);
    const rim = heat * (hi > lo ? 0.45 + 0.55 * depthFrac : 1);
    ctx.globalCompositeOperation = "lighter";
    if (rim > 0.02 && under) {
      ctx.lineWidth = Math.max(0.9, e * 0.04);
      ctx.strokeStyle = `rgba(255,110,96,${Math.min(0.9, 0.75 * rim)})`;
      ctx.beginPath();
      if (leftOpen && !has(gx, gy - 1, gz + 1)) {
        ctx.moveTo(LL[0], LL[1]);
        ctx.lineTo(Bot[0], Bot[1]);
      }
      if (rightOpen && !has(gx + 1, gy - 1, gz)) {
        ctx.moveTo(Bot[0], Bot[1]);
        ctx.lineTo(LR[0], LR[1]);
      }
      ctx.stroke();
    }
    // a faint catch light on the top face's exposed front edges
    if (!has(gx, gy + 1, gz)) {
      ctx.lineWidth = Math.max(0.7, e * 0.024);
      ctx.strokeStyle = "rgba(220,230,255,0.1)";
      ctx.beginPath();
      if (leftOpen) {
        ctx.moveTo(D[0], D[1]);
        ctx.lineTo(c[0], c[1]);
      }
      if (rightOpen) {
        ctx.moveTo(c[0], c[1]);
        ctx.lineTo(B[0], B[1]);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";

    if (leftOpen) {
      kind.leds.forEach((l, i) => {
        // hidden if a cube sits anywhere along the line of sight from the socket
        const a = (l.u + 0.5) / 16;
        const b = 1 - (l.v + 0.5) / 16;
        for (let t = 0.04; t < 4; t += 0.08) {
          if (has(gx + Math.floor(a + t), gy + Math.floor(b + t), gz + 1 + Math.floor(t))) return;
        }
        const p: P = [
          lO[0] + ((l.u + 0.5) / 16) * lU[0] + ((l.v + 0.5) / 16) * lV[0],
          lO[1] + ((l.u + 0.5) / 16) * lU[1] + ((l.v + 0.5) / 16) * lV[1],
        ];
        leds.push({ x: p[0], y: p[1], size: texel, color: l.color, mode: l.mode, seed: seed * 31 + gx * 7 + gy * 13 + gz * 17 + i });
      });
    }
  }

  if (look.mute) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = look.mute;
    masked(ctx, big, "saturation", (l) => {
      const g = l.createLinearGradient(0, 0, 0, 1);
      g.addColorStop(0, "rgb(128,128,128)");
      g.addColorStop(1, "rgb(128,128,128)");
      return g;
    });
    ctx.globalAlpha = 1;
  }

  // cluster-wide light, smooth across cube seams: the underside falls into
  // shadow, then red bounce light climbs from the bottom
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const H = big.height;
  const top = (pad + (hi > lo ? e : 0)) * ss;
  masked(ctx, big, "multiply", (l) => {
    const g = l.createLinearGradient(0, top, 0, H);
    g.addColorStop(0, "rgb(255,255,255)");
    g.addColorStop(1, "rgb(96,88,98)");
    return g;
  });
  if (look.heat > 0.01) {
    masked(ctx, big, "lighter", (l) => {
      const g = l.createLinearGradient(0, H - pad * ss, 0, H * 0.4);
      g.addColorStop(0, `rgba(239,68,68,${0.16 * look.heat})`);
      g.addColorStop(0.45, `rgba(190,36,40,${0.05 * look.heat})`);
      g.addColorStop(1, "rgba(190,36,40,0)");
      return g;
    });
  }
  if (look.shade) {
    ctx.globalCompositeOperation = "source-atop";
    ctx.globalAlpha = look.shade;
    ctx.fillStyle = "#050306";
    ctx.fillRect(0, 0, big.width, big.height);
  }
  if (look.fog > 0.01) {
    ctx.globalCompositeOperation = "source-atop";
    ctx.globalAlpha = look.fog;
    ctx.fillStyle = FOG;
    ctx.fillRect(0, 0, big.width, big.height);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  const down = (src: HTMLCanvasElement) => {
    if (ss === 1) return src;
    const d = makeCanvas(w, h);
    const x = context(d);
    x.imageSmoothingQuality = "high";
    x.drawImage(src, 0, 0, w, h);
    return d;
  };
  let canvas = down(big);
  const halo = look.heat > 0.05 ? redHalo(canvas, w, h, e, look.heat) : null;
  let emissive = glow ? down(glow) : null;
  if (look.blur > 0.35) canvas = blurred(canvas, look.blur).canvas;
  if (emissive) emissive = blurred(emissive, Math.max(texel * 0.7, look.blur)).canvas;
  return { canvas, emissive, halo, w, h, leds, pivot };
}
