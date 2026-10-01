import type { Layout } from "./layout";
import { HOUSE, LAMP, ROOF, STONE, mix, rgba, shade } from "./palette";
import { between, chance, noise1, rng, weighted, type Rng } from "./rng";

/** A window. `life` is how lively its building is: rooms in the same house
 *  tend to be lit together, so the city has busy and sleeping stretches. */
export type Pane = { x: number; y: number; w: number; h: number; shop: boolean; life: number };

export type House = {
  x0: number;
  x1: number;
  top: number;
  outline: Path2D;
  roof: Path2D | null;
  tone: number;
  panes: Pane[];
  life: number;
};

/** Flat [x, y] line, [cx, cy, x, y] quadratic or [c1x, c1y, c2x, c2y, x, y]
 *  cubic segments of a gable's left half, from the eave to the axis. */
type Seg = number[];

/** Draws a left half and its mirror image, so every gable is symmetric. */
function symmetric(p: Path2D, axis: number, start: readonly [number, number], left: Seg[]) {
  const pts: [number, number][] = [[start[0], start[1]]];
  for (const s of left) {
    if (s.length === 2) p.lineTo(s[0], s[1]);
    else if (s.length === 4) p.quadraticCurveTo(s[0], s[1], s[2], s[3]);
    else p.bezierCurveTo(s[0], s[1], s[2], s[3], s[4], s[5]);
    pts.push([s[s.length - 2], s[s.length - 1]]);
  }
  const m = (x: number) => 2 * axis - x;
  for (let i = left.length - 1; i >= 0; i--) {
    const s = left[i];
    const [ex, ey] = pts[i];
    if (s.length === 2) p.lineTo(m(ex), ey);
    else if (s.length === 4) p.quadraticCurveTo(m(s[0]), s[1], m(ex), ey);
    else p.bezierCurveTo(m(s[2]), s[3], m(s[0]), s[1], m(ex), ey);
  }
}

const TRAP = 0;
const HALS = 1;
const KLOK = 2;
const LIJST = 3;
const PUNT = 4;

/** One canal house: facade and gable as a single outline, plus the height of
 *  the gable it grew (for attic windows). */
function gable(r: Rng, kind: number, x0: number, x1: number, eave: number, street: number, u: number) {
  const w = x1 - x0;
  const cx = (x0 + x1) / 2;
  const p = new Path2D();
  p.moveTo(x0, street + 2);
  p.lineTo(x0, eave);
  let left: Seg[];
  let gh = 0;
  let roof: Path2D | null = null;
  if (kind === TRAP) {
    const n = w > 46 * u ? 5 : w > 35 * u ? 4 : 3;
    gh = w * between(r, 0.66, 0.9);
    const tw = Math.max(w * 0.15, 4 * u);
    const sw = (w - tw) / 2 / n;
    const sh = gh / (n + 0.75);
    left = [];
    for (let i = 0; i < n; i++) left.push([x0 + sw * i, eave - sh * (i + 1)], [x0 + sw * (i + 1), eave - sh * (i + 1)]);
    left.push([cx - tw / 2, eave - gh], [cx, eave - gh]);
  } else if (kind === HALS) {
    const nw = w * between(r, 0.4, 0.52);
    gh = w * between(r, 0.66, 0.88);
    const sh = gh * between(r, 0.3, 0.4);
    const ph = nw * between(r, 0.22, 0.36);
    const ledge = 1.3 * u;
    left = [
      [x0, eave - sh * 0.12],
      [x0 + (cx - nw / 2 - x0) * 0.08, eave - sh, cx - nw / 2, eave - sh],
      [cx - nw / 2, eave - gh],
      [cx - nw / 2 - ledge, eave - gh],
      [cx - nw / 2 - ledge, eave - gh - 1.2 * u],
      chance(r, 0.5) ? [cx, eave - gh - ph] : [cx - nw / 2, eave - gh - ph * 1.25, cx, eave - gh - ph * 1.25],
    ];
    gh += ph;
  } else if (kind === KLOK) {
    const tw = w * between(r, 0.28, 0.36);
    gh = w * between(r, 0.74, 0.92);
    const cap = tw * between(r, 0.32, 0.46);
    left = [
      [x0, eave - gh * 0.08],
      [x0, eave - gh * 0.48, cx - tw / 2 - w * 0.03, eave - gh * 0.5, cx - tw / 2, eave - gh * 0.86],
      [cx - tw / 2, eave - gh],
      [cx - tw / 2, eave - gh - cap, cx, eave - gh - cap],
    ];
    gh += cap;
  } else if (kind === PUNT) {
    gh = w * between(r, 0.56, 0.8);
    left = [[x0 - 0.8 * u, eave + 0.8 * u], [cx, eave - gh]];
  } else {
    // a cornice house: flat top with a moulded ledge, a slate roof behind
    const over = 1.7 * u;
    left = [[x0, eave + 3.2 * u], [x0 - over, eave + 3.2 * u], [x0 - over, eave], [cx, eave]];
    const rh = between(r, 9, 19) * u;
    const inset = w * between(r, 0.16, 0.3);
    roof = new Path2D();
    roof.moveTo(x0 + 0.5 * u, eave + 0.5);
    roof.lineTo(x0 + inset, eave - rh);
    roof.lineTo(x1 - inset, eave - rh);
    roof.lineTo(x1 - 0.5 * u, eave + 0.5);
    roof.closePath();
    if (chance(r, 0.45)) roof.rect(cx - 5 * u, eave - rh * 0.72 - 6 * u, 10 * u, 6.5 * u);
    if (chance(r, 0.6)) roof.rect(x0 + inset + 2 * u, eave - rh - 6 * u, 2.6 * u, 7 * u);
    gh = rh;
  }
  symmetric(p, cx, [x0, eave], left);
  p.lineTo(x1, street + 2);
  p.closePath();
  return { p, gh, roof };
}

/** The far bank of the Oudegracht, left to right: three to five storeys, a
 *  shop at street level, sash windows above and a mixed run of gables. */
export function makeHouses(L: Layout): House[] {
  const r = rng(1674);
  const { u, street } = L;
  const out: House[] = [];
  let x = -between(r, 4, 30) * u;
  while (x < L.w + 4) {
    const big = chance(r, 0.12);
    const w = (big ? between(r, 62, 84) : between(r, 31, 56)) * u;
    const floors = big ? 4 + Math.floor(r() * 3) : 2 + weighted(r, [0.1, 0.36, 0.38, 0.16]);
    const fh = between(r, 16.5, 19.5) * u;
    const ground = fh * between(r, 1.12, 1.3);
    const eave = street - ground - (floors - 1) * fh;
    const kind = big ? (chance(r, 0.75) ? LIJST : TRAP) : weighted(r, [0.22, 0.17, 0.14, 0.27, 0.2]);
    const x0 = x;
    const x1 = x + w;
    const g = gable(r, kind, x0, x1, eave, street, u);
    // some houses are asleep, some have people over; whole stretches of the
    // canal are livelier than others
    const life = [0.18, 0.85, 1.75][weighted(r, [0.36, 0.44, 0.2])] * (0.45 + 1.1 * (0.5 + 0.5 * noise1(x / (260 * u), 3)));

    const panes: Pane[] = [];
    const cols = big ? 5 : w < 37 * u ? 2 : w < 50 * u ? 3 : 4;
    const pw = Math.min(Math.max((w / cols) * 0.42, 3.8 * u), 7.2 * u);
    const gap = (w - cols * pw) / (cols + 1);
    const ph = fh * between(r, 0.54, 0.62);
    const pane = (px: number, py: number, pw2: number, ph2: number, shop = false) => panes.push({ x: px, y: py, w: pw2, h: ph2, shop, life });
    for (let f = 1; f < floors; f++) {
      const y = eave + (floors - 1 - f) * fh + (fh - ph) * 0.42;
      for (let c = 0; c < cols; c++) pane(x0 + gap + c * (pw + gap), y, pw, ph);
    }
    // the shop window at street level
    pane(x0 + w * 0.1, street - ground * 0.8, w * 0.52, ground * 0.6, true);
    if (kind !== LIJST && g.gh > 20 * u) {
      const ay = eave - g.gh * 0.36 + ph * 0.1;
      const aw = pw * 0.85;
      const cx = (x0 + x1) / 2;
      if (w > 40 * u) {
        pane(cx - aw * 1.25, ay, aw, ph * 0.72);
        pane(cx + aw * 0.25, ay, aw, ph * 0.72);
      } else pane(cx - aw / 2, ay, aw, ph * 0.72);
      if (g.gh > 34 * u) pane(cx - aw * 0.4, eave - g.gh * 0.66, aw * 0.8, ph * 0.55);
    }
    out.push({ x0, x1, top: eave - g.gh, outline: g.p, roof: g.roof, tone: r() * 2 - 1, panes, life });
    x = x1;
  }
  return out;
}

/** Facades, roofs and the dark glass of unlit rooms, then the street lamps'
 *  warm wash low on the brick, so the window rows read where the light is. */
export function drawHouses(ctx: CanvasRenderingContext2D, L: Layout, houses: House[], lamps: readonly { x: number; y: number }[]) {
  for (const h of houses) {
    if (h.roof) {
      ctx.fillStyle = rgba(ROOF);
      ctx.fill(h.roof);
    }
    ctx.fillStyle = rgba(mix(shade(HOUSE, 1 + h.tone * 0.12), STONE, h.tone > 0.6 ? 0.22 : 0.06));
    ctx.fill(h.outline);
    ctx.fillStyle = rgba(shade(HOUSE, 0.72));
    for (const p of h.panes) ctx.fillRect(p.x, p.y, p.w, p.h);
  }
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  for (const l of lamps) {
    const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, 62 * L.u);
    g.addColorStop(0, rgba(LAMP, 0.16));
    g.addColorStop(0.5, rgba(LAMP, 0.05));
    g.addColorStop(1, rgba(LAMP, 0));
    ctx.fillStyle = g;
    ctx.fillRect(l.x - 62 * L.u, l.y - 62 * L.u, 124 * L.u, 124 * L.u);
  }
  ctx.restore();
  // party walls and gable copings catch a little of the sky
  ctx.strokeStyle = "rgba(150,190,240,0.07)";
  ctx.lineWidth = 1;
  for (const h of houses) ctx.stroke(h.outline);
}
