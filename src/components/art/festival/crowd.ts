import { calmAt, type Layout } from "./layout";
import { TAU, between, rng, type Rng } from "./math";
import { heartPath } from "./sprites";

// poses
const DOWN = 0;
const ONE = 1;
const BOTH = 2;
const PUMP = 3;
const PHONE = 4;
const HEART = 5;
const RIDER = 6;

type Person = {
  x: number;
  s: number;
  /** shoulder width and height, so not everyone is the same build */
  wide: number;
  tall: number;
  pose: number;
  side: 1 | -1;
  hair: number;
  /** a little ahead of or behind the beat, like real people */
  phase: number;
  hop: number;
  sway: number;
};

export type Row = { y: number; s: number; people: Person[]; fill: string; rim: number; lift: number };
/** A phone held up to film the stage: its screen faces us, so it glows. */
export type Phone = { x: number; y: number; w: number; h: number };

/** One frame's shapes for a row: bodies are filled, arms stroked in two widths. */
type Shapes = { body: Path2D; upper: Path2D; fore: Path2D };

let heart: Path2D | null = null;

/** Three rows of silhouettes in front of the stage, smaller and hazier toward
 *  the back. Fewer hands go up behind the copy. */
export function makeCrowd(L: Layout): Row[] {
  const r = rng(101);
  const specs = [
    { dy: 24, s: 56, gap: 21, fill: "#0f0c1d", rim: 0.45, lift: 0.8 },
    { dy: 78, s: 82, gap: 30, fill: "#090812", rim: 0.7, lift: 1 },
    { dy: 152, s: 120, gap: 44, fill: "#030407", rim: 0.9, lift: 1.25 },
  ];
  return specs.map((sp, ri) => {
    const s = sp.s * L.u;
    const y = L.deck + sp.dy * L.u;
    const people: Person[] = [];
    let x = -sp.gap * L.u * r();
    while (x < L.w + s * 0.5) {
      people.push({
        x,
        s: s * between(r, 0.9, 1.1),
        wide: between(r, 0.86, 1.14),
        tall: between(r, -0.07, 0.07),
        pose: pickPose(r, calmAt(L, x, y), ri, x, L),
        side: r() < 0.5 ? -1 : 1,
        hair: pickHair(r),
        phase: between(r, -0.07, 0.07),
        hop: between(r, 0.012, 0.05) * (r() < 0.35 ? 2.2 : 1),
        sway: between(r, 0.05, 0.15),
      });
      x += sp.gap * L.u * between(r, 0.7, 1.3);
    }
    return { y, s, people, fill: sp.fill, rim: sp.rim, lift: sp.lift * L.u };
  });
}

function pickPose(r: Rng, calm: number, row: number, x: number, L: Layout): number {
  const special = r();
  const nearStage = x > L.stageL - 40 * L.u && x < L.stageR + 40 * L.u;
  if (row === 1 && calm < 0.2 && special < 0.05) return HEART;
  if (row === 1 && calm < 0.2 && nearStage && special > 0.965) return RIDER;
  if (r() > 0.52 * (1 - 0.75 * calm)) return DOWN;
  const p = r();
  return p < 0.36 ? ONE : p < 0.56 ? BOTH : p < 0.8 ? PUMP : PHONE;
}

function pickHair(r: Rng): number {
  const p = r();
  return p < 0.42 ? 0 : p < 0.54 ? 1 : p < 0.64 ? 2 : p < 0.72 ? 3 : p < 0.82 ? 4 : 5;
}

/** One row: the lit rim first (the same shapes nudged up), then the dark
 *  silhouettes over it, so only the upper edges catch the stage light. */
export function drawRow(
  ctx: CanvasRenderingContext2D,
  row: Row,
  beat: number,
  hype: number,
  rim: CanvasGradient,
  rimAlpha: number,
  bottom: number,
  phones: Phone[] | null,
) {
  const sh: Shapes = { body: new Path2D(), upper: new Path2D(), fore: new Path2D() };
  for (const p of row.people) person(sh, p, row, beat, hype, bottom, phones);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const paint = () => {
    ctx.fill(sh.body);
    ctx.lineWidth = row.s * 0.1;
    ctx.stroke(sh.upper);
    ctx.lineWidth = row.s * 0.075;
    ctx.stroke(sh.fore);
  };
  ctx.save();
  ctx.translate(0, -row.lift);
  ctx.globalAlpha = Math.min(1, row.rim * rimAlpha);
  ctx.fillStyle = rim;
  ctx.strokeStyle = rim;
  paint();
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.fillStyle = row.fill;
  ctx.strokeStyle = row.fill;
  paint();
}

function person(sh: Shapes, p: Person, row: Row, beat: number, hype: number, bottom: number, phones: Phone[] | null) {
  const s = p.s;
  const b = beat + p.phase;
  const f = b - Math.floor(b);
  // up between beats, landing on them; higher right after a drop
  const hop = Math.sin(Math.PI * f) * p.hop * (1 + hype * 1.8) * s;
  const x = p.x;
  const yh = row.y - hop + (s - row.s) * 0.3 - p.tall * s;
  const ys = yh + 0.24 * s;
  const sw = 0.3 * s * p.wide;
  const swing = Math.sin(Math.PI * b * 0.5 + p.x * 0.013) * p.sway;
  const { body } = sh;

  if (p.pose === RIDER) {
    rider(sh, x, yh, s, swing);
    torso(body, x, yh, s, sw, bottom);
    return;
  }
  head(body, x, yh, s, p.hair, p.side);
  torso(body, x, yh, s, sw, bottom);

  // shoulder joint on the raising side
  const jx = (side: number) => x + side * sw * 0.8;
  const jy = ys + 0.05 * s;
  switch (p.pose) {
    case ONE: {
      const d = p.side;
      arm(sh, jx(d), jy, x + d * (0.34 + swing * 0.4) * s, ys - 0.26 * s, x + d * (0.22 + swing) * s, yh - 0.56 * s, s);
      break;
    }
    case BOTH:
      for (const d of [-1, 1]) arm(sh, jx(d), jy, x + d * (0.4 + swing * d * 0.3) * s, ys - 0.22 * s, x + d * (0.36 + swing * d * 0.5) * s, yh - 0.5 * s, s);
      break;
    case PUMP: {
      const d = p.side;
      const k = Math.exp(-f * 5);
      arm(sh, jx(d), jy, x + d * 0.38 * s, ys - (0.08 + k * 0.08) * s, x + d * 0.22 * s, yh - (0.34 + k * 0.18) * s, s);
      break;
    }
    case PHONE: {
      const d = p.side;
      const hx = x + d * 0.14 * s;
      const hy = yh - 0.5 * s;
      arm(sh, jx(d), jy, x + d * 0.34 * s, ys - 0.18 * s, hx, hy, s, false);
      const w = 0.085 * s;
      const h = 0.15 * s;
      body.rect(hx - w / 2, hy - h + 0.02 * s, w, h);
      phones?.push({ x: hx - w / 2 + 0.012 * s, y: hy - h + 0.032 * s, w: w - 0.024 * s, h: h - 0.024 * s });
      break;
    }
    case HEART: {
      // two hands up making a heart: the bright hole in it is the heart
      const hy = yh - 0.5 * s;
      for (const d of [-1, 1]) arm(sh, jx(d), jy, x + d * 0.36 * s, ys - 0.2 * s, x + d * 0.1 * s, hy, s, false);
      heart ??= heartPath();
      sh.fore.addPath(heart, new DOMMatrix([0.4 * s, 0, 0, 0.4 * s, x, hy - 0.16 * s]));
      break;
    }
  }
}

// Every shape winds the same way (clockwise on screen), so overlapping parts
// of one person union under the nonzero rule instead of punching holes.

function ellipse(p: Path2D, x: number, y: number, rx: number, ry: number, rot = 0) {
  p.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot));
  p.ellipse(x, y, rx, ry, rot, 0, TAU);
}

function head(p: Path2D, x: number, y: number, s: number, hair: number, side: 1 | -1) {
  ellipse(p, x, y, 0.118 * s, 0.142 * s);
  switch (hair) {
    case 1: // top knot
      ellipse(p, x - side * 0.02 * s, y - 0.155 * s, 0.05 * s, 0.045 * s);
      break;
    case 2: // curls
      ellipse(p, x, y - 0.02 * s, 0.158 * s, 0.158 * s);
      break;
    case 3: // bucket hat: a soft brim under a low dome
      ellipse(p, x, y - 0.06 * s, 0.19 * s, 0.036 * s);
      ellipse(p, x, y - 0.1 * s, 0.122 * s, 0.085 * s);
      break;
    case 4: // ponytail
      ellipse(p, x - side * 0.12 * s, y + 0.07 * s, 0.042 * s, 0.12 * s, -side * 0.3);
      break;
    case 5: // long hair down to the shoulders
      p.moveTo(x + 0.12 * s, y - 0.02 * s);
      p.quadraticCurveTo(x + 0.15 * s, y + 0.2 * s, x + 0.17 * s, y + 0.3 * s);
      p.lineTo(x - 0.17 * s, y + 0.3 * s);
      p.quadraticCurveTo(x - 0.15 * s, y + 0.2 * s, x - 0.12 * s, y - 0.02 * s);
      p.closePath();
      break;
  }
}

/** Neck and rounded shoulders, running down out of frame. */
function torso(p: Path2D, x: number, yh: number, s: number, sw: number, bottom: number) {
  const ys = yh + 0.24 * s;
  const nw = 0.056 * s;
  p.moveTo(x - sw, bottom);
  p.lineTo(x - sw * 1.02, ys + 0.2 * s);
  p.bezierCurveTo(x - sw * 1.05, ys + 0.02 * s, x - sw * 0.78, ys - 0.05 * s, x - nw * 1.7, ys - 0.055 * s);
  p.quadraticCurveTo(x - nw, ys - 0.07 * s, x - nw, yh + 0.1 * s);
  p.lineTo(x + nw, yh + 0.1 * s);
  p.quadraticCurveTo(x + nw, ys - 0.07 * s, x + nw * 1.7, ys - 0.055 * s);
  p.bezierCurveTo(x + sw * 0.78, ys - 0.05 * s, x + sw * 1.05, ys + 0.02 * s, x + sw * 1.02, ys + 0.2 * s);
  p.lineTo(x + sw, bottom);
  p.closePath();
}

/** Upper arm to the elbow, forearm to the hand, and a fist at the end. */
function arm(sh: Shapes, sx: number, sy: number, ex: number, ey: number, hx: number, hy: number, s: number, fist = true) {
  sh.upper.moveTo(sx, sy);
  sh.upper.lineTo(ex, ey);
  sh.fore.moveTo(ex, ey);
  sh.fore.lineTo(hx, hy);
  if (fist) ellipse(sh.body, hx, hy - 0.02 * s, 0.048 * s, 0.064 * s);
}

/** Someone up on a friend's shoulders, both arms in the air. */
function rider(sh: Shapes, x: number, yh: number, s: number, swing: number) {
  const k = 0.88;
  const ry = yh - 0.72 * s;
  const { body } = sh;
  ellipse(body, x, ry, 0.118 * s * k, 0.142 * s * k);
  const ys = ry + 0.24 * s * k;
  body.moveTo(x - 0.27 * s * k, yh + 0.08 * s);
  body.lineTo(x - 0.27 * s * k, ys + 0.1 * s);
  body.quadraticCurveTo(x - 0.26 * s * k, ys, x - 0.05 * s, ys - 0.05 * s);
  body.lineTo(x + 0.05 * s, ys - 0.05 * s);
  body.quadraticCurveTo(x + 0.26 * s * k, ys, x + 0.27 * s * k, ys + 0.1 * s);
  body.lineTo(x + 0.27 * s * k, yh + 0.08 * s);
  body.closePath();
  // legs over the shoulders
  sh.upper.moveTo(x - 0.16 * s, yh + 0.02 * s);
  sh.upper.lineTo(x - 0.3 * s, yh + 0.34 * s);
  sh.upper.moveTo(x + 0.16 * s, yh + 0.02 * s);
  sh.upper.lineTo(x + 0.3 * s, yh + 0.34 * s);
  for (const d of [-1, 1]) arm(sh, x + d * 0.2 * s, ys + 0.04 * s, x + d * (0.38 + swing * d * 0.3) * s, ys - 0.2 * s, x + d * (0.34 + swing * d * 0.5) * s, ry - 0.42 * s, s);
}
