import { Pen } from "./pen";
import { DOM, LEAF, MINT, STONE, mix, rgba, shade } from "./palette";

/** Where the Domtoren stands: its centre line, its foot and its scale. */
export type Tower = { x: number; ground: number; m: number };

/** The open octagon: the light shows through its lancets, between tracery. */
export type Lantern = {
  openings: Path2D;
  tracery: Path2D;
  fill: CanvasGradient;
  cx: number;
  cy: number;
  /** halo radius in px */
  r: number;
};

// All in metres from the measured drawings (Haslinghuis and Peeters): a first
// square 19.3 m wide to 38.6 m, a second 16.34 m wide to 68.1 m, the octagon
// 13.5 m across from 69 to 95 m, the spire to 106.75 m, cross and vane to
// 112.5 m. The face drawn is the one with seven tall niches on the first
// square and three on the second, as seen from the Stadhuisbrug.
const S1 = 9.65;
const S2 = 8.17;
const OCT = 6.75;
const SPIRE = 4.5;

function pinnacles(s: Pen, fine: boolean) {
  s.crest(-8.4, 8.4, 37.7, fine ? 1.4 : 2.8, 2.2, 0.2);
  s.crest(-7.0, 7.0, 68.95, fine ? 1.4 : 2.8, 2.0, 0.19);
  for (const k of [-1, 1]) {
    s.pinnacle(k * 9.3, 35, 41.8, 0.55, 3.8);
    s.pinnacle(k * 7.75, 66.4, 74.2, 0.62, 4.6);
    s.pinnacle(k * 6.3, 68.6, 72.8, 0.4, 2.9);
  }
  for (const x of [-OCT, -2.8, 2.8, OCT]) s.pinnacle(x, 95, 98.7, 0.42, 2.7);
}

/** The whole tower as one outline, for its fill and for occlusion. */
export function towerOutline(t: Tower): Path2D {
  const s = new Pen(t.x, t.ground, t.m);
  s.rect(-S1, 0, S1, 34.9).rect(-9.95, 34.6, 9.95, 35.5).rect(-9.72, 35.5, 9.72, 37.7);
  s.rect(-S2, 37.5, S2, 66.6).rect(-8.45, 66.3, 8.45, 67.1).rect(-8.2, 67.1, 8.2, 68.95);
  s.rect(-OCT, 68.9, OCT, 95.2).rect(-7.0, 94.9, 7.0, 95.7).rect(-6.85, 95.7, 6.85, 96.8);
  for (const k of [-1, 1]) {
    // flying buttress from the corner pinnacle onto the octagon's edge
    s.poly([k * 7.4, 70.6, k * 7.4, 72.8, k * 6.7, 76.6, k * 6.7, 74.4]);
    s.poly([k * 2.95, 95.5, k * 4.75, 99.5, k * 6.55, 95.5]);
  }
  s.poly([-2.35, 95.5, 0, 100.6, 2.35, 95.5]);
  pinnacles(s, t.m >= 2.6);
  // the stone spire, its knob, the lily cross and the vane of St Martin
  s.poly([-SPIRE, 96.6, -0.42, 105.9, 0.42, 105.9, SPIRE, 96.6]);
  s.circle(0, 106.35, 0.62).poly([-0.28, 106.8, 0, 107.6, 0.28, 106.8]);
  s.rect(-0.13, 106.8, 0.13, 111.6).rect(-1.2, 108.85, 1.2, 109.18);
  s.poly([0.13, 110.7, 1.75, 111.0, 1.55, 111.45, 0.13, 111.5]).circle(0, 112.0, 0.3);
  return s.p;
}

const lancets = (s: Pen) => {
  s.lancet(-1.9, 1.9, 70.6, 89.9, 0.74);
  s.lancet(-5.95, -3.45, 71.0, 90.3, 0.8);
  s.lancet(3.45, 5.95, 71.0, 90.3, 0.8);
};

/** Paints the tower: a body lifted by the city's light below, lighter stone
 *  frames, dark niches and panels, the octagon and spire shaded as solids lit
 *  from the left, and a rim of the green glow behind it. */
export function drawTower(ctx: CanvasRenderingContext2D, t: Tower, outline: Path2D) {
  const pen = () => new Pen(t.x, t.ground, t.m);
  const Y = (my: number) => t.ground - my * t.m;
  const fill = (color: string, build: (s: Pen) => void) => {
    const s = pen();
    build(s);
    ctx.fillStyle = color;
    ctx.fill(s.p);
  };
  const frame = rgba(mix(DOM, STONE, 0.6));
  const recess = rgba(shade(DOM, 0.55));

  // rim: the outline widened by a pixel in the glow's colour, then the body
  ctx.fillStyle = rgba(MINT, 0.16);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1]]) {
    ctx.translate(dx, dy);
    ctx.fill(outline);
    ctx.translate(-dx, -dy);
  }
  const body = ctx.createLinearGradient(0, Y(0), 0, Y(112));
  body.addColorStop(0, rgba(mix(DOM, STONE, 0.32)));
  body.addColorStop(0.45, rgba(DOM));
  body.addColorStop(1, rgba(shade(DOM, 0.9)));
  ctx.fillStyle = body;
  ctx.fill(outline);

  fill(frame, (s) => {
    s.rect(-S1, 0, -8.55, 34.6).rect(8.55, 0, S1, 34.6).rect(-9.95, 34.6, 9.95, 35.5).rect(-9.72, 35.5, 9.72, 37.7);
    s.rect(-S2, 37.7, -7.3, 66.3).rect(7.3, 37.7, S2, 66.3).rect(-8.45, 66.3, 8.45, 67.1).rect(-8.2, 67.1, 8.2, 68.95);
    s.rect(-OCT, 69, -6.2, 95).rect(6.2, 69, OCT, 95).rect(-3.15, 69, -2.45, 95).rect(2.45, 69, 3.15, 95);
    s.rect(-7.0, 94.9, 7.0, 95.7).rect(-6.85, 95.7, 6.85, 96.8).rect(-S1, 9.2, S1, 9.8);
    pinnacles(s, t.m >= 2.6);
  });

  fill(recess, (s) => {
    // seven tall niches on the first square, the middle one wide, and the
    // three tall panels of the second
    let x = -8.55 + 0.575;
    for (let i = 0; i < 7; i++) {
      const w = i === 3 ? 3.2 : 1.55;
      if (i === 3) s.lancet(x, x + w, 10.4, 30.8, 0.75);
      else s.lancet(x, x + w, 11.5, 31.2, 0.9);
      x += w + 0.575;
    }
    s.lancet(-2.35, 2.35, 40.4, 61.8, 0.7).lancet(-6.95, -3.15, 40.8, 62.4, 0.72).lancet(3.15, 6.95, 40.8, 62.4, 0.72);
    // the openwork of the three parapets
    for (const [x0, x1, y0, y1] of [[-9.4, 9.4, 35.9, 37.3], [-7.9, 7.9, 67.4, 68.6], [-6.6, 6.6, 95.9, 96.6]]) {
      for (let sx = x0; sx < x1 - 0.3; sx += 0.78) s.rect(sx, y0, sx + 0.34, y1);
    }
  });
  // the octagon's lancets stand open: dark until the lantern is lit
  fill(rgba(shade(DOM, 0.32)), lancets);

  // mullions in the middle panel and the blind ones, the sound louvres
  // below the clock, and the little balcony in the great niche
  fill(frame, (s) => {
    s.rect(-0.13, 40.4, 0.13, 62).rect(-5.18, 41, -4.92, 62.5).rect(4.92, 41, 5.18, 62.5);
    s.rect(-1.6, 10.4, -1.42, 28).rect(1.42, 10.4, 1.6, 28).rect(-1.6, 21.4, 1.6, 22.1);
  });
  fill(rgba(mix(shade(DOM, 0.55), STONE, 0.22)), (s) => {
    for (let y = 41.6; y < 56.5; y += 1.05) s.rect(-2.2, y, 2.2, y + 0.26);
  });

  // floodlights on the galleries wash the stone just above them, and the
  // street lights the foot; the light dies away up each stage
  ctx.save();
  ctx.clip(outline);
  for (const [y0, y1, a] of [[0, 30, 0.07], [38.2, 52, 0.06], [69, 80, 0.05]]) {
    const wash = ctx.createLinearGradient(0, Y(y0), 0, Y(y1));
    wash.addColorStop(0, `rgba(255,214,168,${a})`);
    wash.addColorStop(1, "rgba(255,214,168,0)");
    ctx.fillStyle = wash;
    ctx.fillRect(t.x - 11 * t.m, Y(y1), 22 * t.m, (y1 - y0) * t.m);
  }
  ctx.restore();

  // solids lit from the left: the octagon's and the spire's side faces
  const face = (a: string, pts: number[]) => fill(a, (s) => s.poly(pts));
  face("rgba(200,225,255,0.06)", [-OCT, 69, -2.8, 69, -2.8, 95, -OCT, 95]);
  face("rgba(0,0,0,0.2)", [2.8, 69, OCT, 69, OCT, 95, 2.8, 95]);
  face("rgba(200,225,255,0.07)", [-SPIRE, 96.6, -1.86, 96.6, -0.17, 105.9, -0.42, 105.9]);
  face("rgba(0,0,0,0.24)", [1.86, 96.6, SPIRE, 96.6, 0.42, 105.9, 0.17, 105.9]);

  // the faint green the lantern throws on the stone around it
  const g = ctx.createRadialGradient(t.x, Y(84), 0, t.x, Y(84), 26 * t.m);
  g.addColorStop(0, rgba(LEAF, 0.1));
  g.addColorStop(1, rgba(LEAF, 0));
  ctx.save();
  ctx.clip(outline);
  ctx.fillStyle = g;
  ctx.fillRect(t.x - 30 * t.m, Y(112), 60 * t.m, 60 * t.m);
  ctx.restore();
}

/** The lit lantern's parts, in CSS px, for the per-frame light. */
export function lanternOf(t: Tower, ctx: CanvasRenderingContext2D): Lantern {
  const o = new Pen(t.x, t.ground, t.m);
  lancets(o);
  const tr = new Pen(t.x, t.ground, t.m);
  tr.rect(-1.9, 81.1, 1.9, 81.75).rect(-5.95, 81.3, -3.45, 81.9).rect(3.45, 81.3, 5.95, 81.9);
  tr.rect(-0.73, 70.6, -0.51, 90.6).rect(0.51, 70.6, 0.73, 90.6).rect(-4.81, 71, -4.59, 90.9).rect(4.59, 71, 4.81, 90.9);
  tr.circle(0, 90.9, 0.32).circle(-4.7, 91.1, 0.22).circle(4.7, 91.1, 0.22);
  const Y = (my: number) => t.ground - my * t.m;
  const fill = ctx.createLinearGradient(0, Y(93), 0, Y(70.6));
  fill.addColorStop(0, rgba(LEAF, 0.4));
  fill.addColorStop(0.55, rgba(MINT, 0.95));
  fill.addColorStop(1, rgba(LEAF, 0.75));
  return { openings: o.p, tracery: tr.p, fill, cx: t.x, cy: Y(82), r: 17 * t.m };
}
