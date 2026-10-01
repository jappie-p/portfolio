import type { Box, Layout } from "./layout";
import { lerp } from "./math";

export type FixtureKind = "roof" | "deck" | "tower";
/** A moving head: where its beam starts and its place in its group (-1..1). */
export type Fixture = { x: number; y: number; kind: FixtureKind; u: number; side: -1 | 1 };
/** A window into the shared LED grid, in LED pixels. */
export type Panel = { c: number; r: number; cols: number; rows: number };
/** The LED screens: the wall behind the band and the header over the roof
 *  share one pixel grid (origin x, y; `cell` CSS px per LED), so the rings
 *  leaving the heart in the header roll on across the wall below. */
export type Wall = { x: number; y: number; cols: number; rows: number; cell: number; main: Panel; header: Panel };

/** A panel's rectangle on screen, in CSS px. */
export const panelRect = (w: Wall, p: Panel) => ({ x: w.x + p.c * w.cell, y: w.y + p.r * w.cell, w: p.cols * w.cell, h: p.rows * w.cell });

export type Stage = {
  wall: Wall;
  fixtures: Fixture[];
  cannons: { x: number; y: number; side: -1 | 1 }[];
  /** cold-spark fountains along the deck edge */
  fountains: { x: number; y: number }[];
  /** bounds of the static layer */
  box: Box;
};

const STEEL = "#0b0e17";
const STEEL_BACK = "#06080d";
const BOX = "#07090f";
const LED_LIT = "rgba(255,92,76,0.42)";
const SKY_LIT = "rgba(150,185,255,0.10)";

/** Towers, a roof truss with moving heads on top, line arrays, subs and a deck
 *  around an LED wall, all sized from the layout. */
export function buildStage(L: Layout, dpr: number): Stage {
  const { u, cx, stageL, stageR, roof, deck } = L;
  const tw = 18 * u;
  const th = 17 * u;
  const top = roof + th + 12 * u;
  const bottom = deck - 22 * u;
  const inL = stageL + tw + 12 * u;
  const inR = stageR - tw - 12 * u;

  // LED pitch in whole device pixels, so the dot mask tiles exactly. The wall
  // leaves dark bays at its sides for the line arrays to hang in; the header
  // stands on the roof truss and carries the festival's heart.
  const cellPx = Math.max(3, Math.round(6 * u * dpr));
  const cell = cellPx / dpr;
  const cols = Math.max(12, Math.floor(((inR - inL) * 0.8) / cell));
  let headCols = Math.min(cols - 6, Math.round((L.wide ? 150 : 128) * u / cell));
  if ((cols - headCols) % 2) headCols -= 1;
  // on short screens the header shrinks rather than slide under the site's nav
  const room = roof - 18 * u - 64;
  const headRows = Math.max(8, Math.min(Math.round(((L.wide ? 84 : 70) * u) / cell), Math.floor(room / cell)));
  const headTop = roof - 18 * u - headRows * cell;
  const y0 = Math.round(headTop * dpr) / dpr;
  const mainR = Math.round((top - y0) / cell);
  const mainRows = Math.max(6, Math.floor((bottom - (y0 + mainR * cell)) / cell));
  const wall: Wall = {
    x: Math.round((cx - (cols * cell) / 2) * dpr) / dpr,
    y: y0,
    cols,
    rows: mainR + mainRows,
    cell,
    main: { c: 0, r: mainR, cols, rows: mainRows },
    header: { c: (cols - headCols) / 2, r: 0, cols: headCols, rows: headRows },
  };

  const fixtures: Fixture[] = [];
  const roofN = 8;
  for (let i = 0; i < roofN; i++) {
    const t = i / (roofN - 1);
    fixtures.push({ x: lerp(stageL + tw * 0.5, stageR - tw * 0.5, t), y: roof - 8 * u, kind: "roof", u: t * 2 - 1, side: t < 0.5 ? -1 : 1 });
  }
  const deckN = 6;
  for (let i = 0; i < deckN; i++) {
    const t = i / (deckN - 1);
    fixtures.push({ x: lerp(inL + 24 * u, inR - 24 * u, t), y: deck - 6 * u, kind: "deck", u: t * 2 - 1, side: t < 0.5 ? -1 : 1 });
  }
  // side-mounted on the towers; on wide screens the copy's side gets only the
  // top one, whose beam stays in the sky above the text
  for (const side of [-1, 1] as const) {
    const x = side < 0 ? stageL - 4 * u : stageR + 4 * u;
    const heights = side > 0 && L.wide ? [0.1] : [0.1, 0.42];
    for (const k of heights) fixtures.push({ x, y: lerp(roof + th, deck, k), kind: "tower", u: side, side });
  }

  return {
    wall,
    fixtures,
    cannons: [
      { x: inL + 8 * u, y: deck - 3 * u, side: -1 },
      { x: inR - 8 * u, y: deck - 3 * u, side: 1 },
    ],
    // on wide screens the one nearest the copy stays dark
    fountains: [stageL + 6 * u, stageL + 50 * u, stageR - 50 * u, ...(L.wide ? [] : [stageR - 6 * u])].map((x) => ({ x, y: deck - 1 * u })),
    box: { x0: stageL - 80 * u, y0: y0 - 12 * u, x1: stageR + 80 * u, y1: deck + 44 * u },
  };
}

/** The static silhouette, drawn once per size in CSS px (the caller sets the
 *  transform). Dark steel against the wall's glow, lit on the edges that face it. */
export function drawStage(ctx: CanvasRenderingContext2D, L: Layout, S: Stage) {
  const { u, stageL, stageR, roof, deck } = L;
  const tw = 18 * u;
  const th = 17 * u;
  const { wall } = S;
  const main = panelRect(wall, wall.main);
  const head = panelRect(wall, wall.header);

  // the screens' frames, and the header's legs down to the roof
  ctx.strokeStyle = "#040509";
  ctx.lineWidth = 3 * u;
  ctx.strokeRect(main.x - 1.5 * u, main.y - 1.5 * u, main.w + 3 * u, main.h + 3 * u);
  ctx.strokeRect(head.x - 1.5 * u, head.y - 1.5 * u, head.w + 3 * u, head.h + 3 * u);
  ctx.fillStyle = STEEL;
  for (const x of [head.x + head.w * 0.18, head.x + head.w * 0.82]) ctx.fillRect(x - 1.4 * u, head.y + head.h, 2.8 * u, roof - head.y - head.h);
  ctx.fillStyle = "rgba(255,92,76,0.3)";
  ctx.fillRect(head.x, head.y + head.h + 1.5 * u, head.w, 0.8 * u);

  // towers and the roof truss over them
  truss(ctx, stageL, roof, tw, deck - roof, true, u, 1);
  truss(ctx, stageR - tw, roof, tw, deck - roof, true, u, -1);
  truss(ctx, stageL - 10 * u, roof, stageR - stageL + 20 * u, th, false, u, 0);

  // moving heads standing on the roof truss
  for (const f of S.fixtures) {
    if (f.kind === "roof") movingHead(ctx, f.x, roof, u);
    if (f.kind === "tower") {
      ctx.fillStyle = BOX;
      ctx.fillRect(f.x - (f.side < 0 ? 6 * u : 2 * u), f.y - 4 * u, 8 * u, 8 * u);
    }
  }

  // line arrays hanging in a J in the bays beside the wall
  const bayL = (stageL + tw + main.x) / 2;
  const bayR = (stageR - tw + main.x + main.w) / 2;
  lineArray(ctx, bayL, roof + th + 3 * u, u, -1);
  lineArray(ctx, bayR, roof + th + 3 * u, u, 1);

  // the deck, its lit front edge, the subs stacked on the wings, confetti cannons
  ctx.fillStyle = "#05060b";
  ctx.fillRect(stageL - 32 * u, deck, stageR - stageL + 64 * u, 44 * u);
  ctx.fillStyle = "rgba(255,110,92,0.34)";
  ctx.fillRect(stageL - 32 * u, deck, stageR - stageL + 64 * u, 1.2 * u);
  subs(ctx, stageL - 30 * u, deck, u);
  subs(ctx, stageR + 30 * u - 58 * u, deck, u);
  for (const c of S.cannons) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.side * 0.18);
    ctx.fillStyle = BOX;
    ctx.fillRect(-3 * u, -15 * u, 6 * u, 15 * u);
    ctx.fillStyle = "rgba(255,110,92,0.3)";
    ctx.fillRect(-3 * u, -15 * u, 6 * u, 1 * u);
    ctx.restore();
  }
}

/** A box truss: back chords offset for depth, front chords, zigzag lacing.
 *  `lit` says which side faces the wall (1 right, -1 left, 0 below). */
function truss(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, vertical: boolean, u: number, lit: -1 | 0 | 1) {
  const chord = 2.2 * u;
  const d = 2.6 * u;
  ctx.fillStyle = STEEL_BACK;
  if (vertical) {
    ctx.fillRect(x + d, y - d, chord, h);
    ctx.fillRect(x + w - chord + d, y - d, chord, h);
  } else {
    ctx.fillRect(x + d, y - d, w, chord);
    ctx.fillRect(x + d, y + h - chord - d, w, chord);
  }
  ctx.fillStyle = STEEL;
  ctx.strokeStyle = STEEL;
  ctx.lineWidth = 1.1 * u;
  ctx.beginPath();
  if (vertical) {
    ctx.fillRect(x, y, chord, h);
    ctx.fillRect(x + w - chord, y, chord, h);
    const step = w - chord;
    for (let t = 0, i = 0; t < h - step; t += step, i++) {
      const a = i % 2 === 0;
      ctx.moveTo(x + (a ? chord : w - chord), y + t);
      ctx.lineTo(x + (a ? w - chord : chord), y + t + step);
    }
  } else {
    ctx.fillRect(x, y, w, chord);
    ctx.fillRect(x, y + h - chord, w, chord);
    const step = h - chord;
    for (let t = 0, i = 0; t < w - step; t += step, i++) {
      const a = i % 2 === 0;
      ctx.moveTo(x + t, y + (a ? chord : h - chord));
      ctx.lineTo(x + t + step, y + (a ? h - chord : chord));
    }
  }
  ctx.stroke();

  // the edge that faces the wall picks up its red; the top picks up the sky
  ctx.fillStyle = LED_LIT;
  if (lit === 1) ctx.fillRect(x + w - 0.9 * u, y + h * 0.02, 0.9 * u, h * 0.96);
  else if (lit === -1) ctx.fillRect(x, y + h * 0.02, 0.9 * u, h * 0.96);
  else ctx.fillRect(x, y + h - 0.9 * u, w, 0.9 * u);
  ctx.fillStyle = SKY_LIT;
  if (vertical) ctx.fillRect(lit === 1 ? x : x + w - 0.8 * u, y, 0.8 * u, h);
  else ctx.fillRect(x, y, w, 0.8 * u);
}

function movingHead(ctx: CanvasRenderingContext2D, x: number, roof: number, u: number) {
  ctx.fillStyle = BOX;
  ctx.fillRect(x - 6 * u, roof - 2.5 * u, 12 * u, 2.5 * u);
  ctx.fillRect(x - 5 * u, roof - 9 * u, 2 * u, 7 * u);
  ctx.fillRect(x + 3 * u, roof - 9 * u, 2 * u, 7 * u);
  ctx.beginPath();
  ctx.roundRect(x - 3.6 * u, roof - 13 * u, 7.2 * u, 8 * u, 2 * u);
  ctx.fill();
}

function lineArray(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, side: -1 | 1) {
  const bw = 30 * u;
  const bh = 9.5 * u;
  let px = x;
  let py = y;
  let a = 0;
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-side * a);
    ctx.fillStyle = BOX;
    ctx.fillRect(-bw / 2, 0, bw, bh - 0.8 * u);
    ctx.fillStyle = "rgba(255,92,76,0.2)";
    ctx.fillRect(-bw / 2, bh - 1.6 * u, bw, 0.8 * u);
    ctx.restore();
    // each box hangs a little more angled than the one above it
    py += Math.cos(a) * bh;
    px += side * Math.sin(a) * bh;
    a += 0.012 + i * 0.012;
  }
  ctx.fillStyle = STEEL;
  ctx.fillRect(x - 1 * u, y - 4 * u, 2 * u, 4 * u);
}

function subs(ctx: CanvasRenderingContext2D, x: number, deck: number, u: number) {
  const bw = 28 * u;
  const bh = 17 * u;
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < 2; c++) {
      const bx = x + c * (bw + 2 * u);
      const by = deck - (r + 1) * (bh + 1.5 * u);
      ctx.fillStyle = BOX;
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = "rgba(255,110,92,0.16)";
      ctx.fillRect(bx, by, bw, 0.8 * u);
    }
}
