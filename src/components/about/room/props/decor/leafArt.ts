import * as THREE from "three";
import { seeded } from "../../textures";

/** A leaf painted twice: its colour (opaque, the green carried past its
 *  edge so filtering never pulls in a fringe) and its shape (white on black). */
export type LeafArt = { map: THREE.CanvasTexture; alpha: THREE.CanvasTexture };

type Ctx = CanvasRenderingContext2D;

function sheets(w: number, h: number, edge: string) {
  const make = () => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  };
  const color = make();
  const mask = make();
  const g = color.getContext("2d")!;
  const a = mask.getContext("2d")!;
  g.fillStyle = edge;
  g.fillRect(0, 0, w, h);
  a.fillStyle = "#000";
  a.fillRect(0, 0, w, h);
  return { color, mask, g, a };
}

function done(color: HTMLCanvasElement, mask: HTMLCanvasElement, anisotropy: number): LeafArt {
  const map = new THREE.CanvasTexture(color);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = anisotropy;
  const alpha = new THREE.CanvasTexture(mask);
  alpha.colorSpace = THREE.NoColorSpace;
  alpha.anisotropy = anisotropy;
  return { map, alpha };
}

/** A half width along a leaf from knots (t from its base 0 to its tip 1), eased between. */
function widthAt(knots: [number, number][], t: number) {
  for (let i = 1; i < knots.length; i++)
    if (t <= knots[i][0]) {
      const [t0, w0] = knots[i - 1];
      const [t1, w1] = knots[i];
      const k = (t - t0) / (t1 - t0);
      return w0 + (w1 - w0) * k * k * (3 - 2 * k);
    }
  return knots[knots.length - 1][1];
}

/** A leaf's outline from its half width, its base at the canvas' foot, its
 *  tip at the top; `wave` ripples its edge. */
function outline(w: number, h: number, knots: [number, number][], wave = 0, waves = 0) {
  const p = new Path2D();
  const y = (t: number) => h * (0.985 - 0.97 * t);
  const x = (t: number, side: number) => w / 2 + side * widthAt(knots, t) * (w / 2) * 0.97 * (1 + wave * Math.sin(t * waves * Math.PI * 2 + (side > 0 ? 0 : 1.3)));
  const N = 90;
  p.moveTo(x(0, 1), y(0));
  for (let i = 1; i <= N; i++) p.lineTo(x(i / N, 1), y(i / N));
  for (let i = N; i >= 0; i--) p.lineTo(x(i / N, -1), y(i / N));
  p.closePath();
  return p;
}

/** The midrib up the middle and side veins curving out toward the tip. */
function veins(g: Ctx, w: number, h: number, o: { mid: string; midWidth: number; vein: string; veinWidth: number; count: number; rise: number; reach: number; from?: number; to?: number }) {
  const y = (t: number) => h * (0.985 - 0.97 * t);
  g.lineCap = "round";
  g.strokeStyle = o.mid;
  for (let i = 0; i < 12; i++) {
    const t0 = i / 12;
    g.lineWidth = o.midWidth * (1 - t0 * 0.75);
    g.beginPath();
    g.moveTo(w / 2, y(t0));
    g.lineTo(w / 2, y(t0 + 1 / 12 + 0.002));
    g.stroke();
  }
  g.strokeStyle = o.vein;
  g.lineWidth = o.veinWidth;
  const from = o.from ?? 0.1;
  const to = o.to ?? 0.9;
  for (let i = 0; i < o.count; i++) {
    const t = from + ((to - from) * (i + 0.5)) / o.count;
    for (const side of [-1, 1]) {
      g.beginPath();
      g.moveTo(w / 2, y(t));
      g.quadraticCurveTo(w / 2 + side * w * 0.18 * o.reach, y(t + o.rise * 0.25), w / 2 + side * w * 0.46 * o.reach, y(t + o.rise));
      g.stroke();
    }
  }
}

/** Faint mottling, so no leaf is one flat green. */
function mottle(g: Ctx, w: number, h: number, seed: number, light: string, dark: string, n = 60) {
  const rand = seeded(seed);
  for (let i = 0; i < n; i++) {
    g.fillStyle = rand() < 0.5 ? light : dark;
    g.beginPath();
    g.ellipse(rand() * w, rand() * h, 4 + rand() * w * 0.08, 3 + rand() * h * 0.05, rand() * 3, 0, Math.PI * 2);
    g.fill();
  }
}

/**
 * A monstera leaf: broad and heart-shaped, glossy deep green, split from
 * its edge in toward the midrib between its veins, with rows of holes by
 * the midrib. The stalk joins it a fifth of the way up (`MONSTERA_ATTACH`).
 */
export const MONSTERA_ATTACH = 0.2;
export function monsteraLeaf(anisotropy: number): LeafArt {
  const S = 512;
  const { color, mask, g, a } = sheets(S, S, "#2a5a2c");
  const P = (x: number, y: number) => [x * S, y * S] as const;
  const shape = new Path2D();
  shape.moveTo(...P(0.5, 0.03));
  shape.bezierCurveTo(...P(0.78, 0.03), ...P(0.985, 0.2), ...P(0.975, 0.44));
  shape.bezierCurveTo(...P(0.965, 0.7), ...P(0.86, 0.95), ...P(0.67, 0.965));
  shape.bezierCurveTo(...P(0.58, 0.97), ...P(0.52, 0.88), ...P(0.5, 0.8));
  shape.bezierCurveTo(...P(0.48, 0.88), ...P(0.42, 0.97), ...P(0.33, 0.965));
  shape.bezierCurveTo(...P(0.14, 0.95), ...P(0.035, 0.7), ...P(0.025, 0.44));
  shape.bezierCurveTo(...P(0.015, 0.2), ...P(0.22, 0.03), ...P(0.5, 0.03));
  shape.closePath();

  const fill = g.createRadialGradient(S * 0.5, S * 0.5, S * 0.05, S * 0.5, S * 0.5, S * 0.55);
  fill.addColorStop(0, "#3f7e3c");
  fill.addColorStop(0.6, "#30672f");
  fill.addColorStop(1, "#245026");
  g.fillStyle = fill;
  g.fill(shape);
  mottle(g, S, S, 3, "rgba(120,170,90,0.06)", "rgba(10,40,15,0.08)");
  a.fillStyle = "#fff";
  a.fill(shape);

  // veins out from the midrib, curving up toward the tip
  const vein = (side: number, y0: number) => {
    const p = new Path2D();
    p.moveTo(S * 0.5, S * y0);
    p.quadraticCurveTo(S * (0.5 + side * 0.2), S * (y0 - 0.05), S * (0.5 + side * 0.52), S * (y0 - 0.15));
    return p;
  };
  const ys = [0.74, 0.64, 0.54, 0.44, 0.34, 0.24];
  g.strokeStyle = "rgba(150,200,110,0.4)";
  g.lineWidth = 3;
  g.lineCap = "round";
  for (const y0 of ys) for (const side of [-1, 1]) g.stroke(vein(side, y0));
  g.strokeStyle = "#8db365";
  for (let i = 0; i < 10; i++) {
    g.lineWidth = 9 - i * 0.65;
    g.beginPath();
    g.moveTo(S * 0.5, S * (0.8 - i * 0.074));
    g.lineTo(S * 0.5, S * (0.8 - (i + 1) * 0.074 - 0.004));
    g.stroke();
  }

  // the splits, between the veins, from beyond the edge in toward the midrib;
  // and the holes along the midrib
  const rand = seeded(19);
  a.fillStyle = "#000";
  for (let i = 0; i < ys.length - 1; i++) {
    const y0 = (ys[i] + ys[i + 1]) / 2;
    for (const side of [-1, 1]) {
      if (i === ys.length - 2 && rand() < 0.5) continue;
      const inner = 0.15 + rand() * 0.08;
      const [x0, y1] = [0.5 + side * inner, y0 - inner * 0.22];
      const [x2, y2] = [0.5 + side * 0.62, y0 - 0.19];
      const wide = 0.02 + rand() * 0.012;
      a.beginPath();
      a.moveTo(S * x0, S * y1);
      a.quadraticCurveTo(S * (x0 + side * 0.14), S * (y1 - 0.025 - wide * 0.3), S * x2, S * (y2 - wide));
      a.lineTo(S * x2, S * (y2 + wide));
      a.quadraticCurveTo(S * (x0 + side * 0.14), S * (y1 - 0.025 + wide * 0.6), S * x0, S * (y1 + 0.004));
      a.closePath();
      a.fill();
      if (i > 0 && i < ys.length - 2) {
        a.save();
        a.translate(S * (0.5 + side * (0.085 + rand() * 0.02)), S * (y0 - 0.012));
        a.rotate(side * 0.5);
        a.beginPath();
        a.ellipse(0, 0, S * 0.014, S * (0.03 + rand() * 0.012), 0, 0, Math.PI * 2);
        a.fill();
        a.restore();
      }
    }
  }
  return done(color, mask, anisotropy);
}

/** A fiddle-leaf fig's leaf: broad near the tip, waisted, wavy at its edge;
 *  dark and glossy with a pale midrib and pale veins. */
export function figLeaf(anisotropy: number): LeafArt {
  const W = 256;
  const H = 384;
  const { color, mask, g, a } = sheets(W, H, "#2c5426");
  const shape = outline(W, H, [[0, 0.06], [0.12, 0.5], [0.3, 0.7], [0.45, 0.64], [0.7, 0.98], [0.86, 0.86], [0.96, 0.5], [1, 0.05]], 0.03, 7);
  const fill = g.createLinearGradient(0, H, 0, 0);
  fill.addColorStop(0, "#2a5226");
  fill.addColorStop(0.6, "#356530");
  fill.addColorStop(1, "#2d5a2a");
  g.fillStyle = fill;
  g.fill(shape);
  mottle(g, W, H, 7, "rgba(140,180,90,0.06)", "rgba(10,35,10,0.08)");
  veins(g, W, H, { mid: "#b3c98a", midWidth: 7, vein: "rgba(170,200,120,0.55)", veinWidth: 2.2, count: 7, rise: 0.1, reach: 1, from: 0.12, to: 0.9 });
  a.fillStyle = "#fff";
  a.fill(shape);
  return done(color, mask, anisotropy);
}

/** A rubber plant's leaf: an oval with a drip tip, near black-green and
 *  very glossy, a pale rosy midrib. Bright tinted, it serves the herbs too. */
export function rubberLeaf(anisotropy: number): LeafArt {
  const W = 192;
  const H = 320;
  const { color, mask, g, a } = sheets(W, H, "#24401f");
  const shape = outline(W, H, [[0, 0.1], [0.1, 0.55], [0.4, 0.95], [0.66, 0.88], [0.88, 0.45], [0.96, 0.12], [1, 0.02]]);
  const fill = g.createLinearGradient(0, 0, W, 0);
  fill.addColorStop(0, "#21391c");
  fill.addColorStop(0.5, "#2c4a25");
  fill.addColorStop(1, "#21391c");
  g.fillStyle = fill;
  g.fill(shape);
  veins(g, W, H, { mid: "#c9a99a", midWidth: 5, vein: "rgba(120,150,90,0.25)", veinWidth: 1.2, count: 12, rise: 0.05, reach: 1 });
  a.fillStyle = "#fff";
  a.fill(shape);
  return done(color, mask, anisotropy);
}

/** A pothos leaf: a heart, mid green streaked with gold. */
export function pothosLeaf(anisotropy: number): LeafArt {
  const S = 160;
  const { color, mask, g, a } = sheets(S, S, "#4a8432");
  const P = (x: number, y: number) => [x * S, y * S] as const;
  const shape = new Path2D();
  shape.moveTo(...P(0.5, 0.03));
  shape.bezierCurveTo(...P(0.72, 0.14), ...P(0.97, 0.36), ...P(0.95, 0.6));
  shape.bezierCurveTo(...P(0.93, 0.88), ...P(0.66, 0.98), ...P(0.5, 0.84));
  shape.bezierCurveTo(...P(0.34, 0.98), ...P(0.07, 0.88), ...P(0.05, 0.6));
  shape.bezierCurveTo(...P(0.03, 0.36), ...P(0.28, 0.14), ...P(0.5, 0.03));
  shape.closePath();
  g.fillStyle = "#4b8a33";
  g.fill(shape);
  const rand = seeded(23);
  g.lineCap = "round";
  for (let i = 0; i < 9; i++) {
    g.strokeStyle = `rgba(226,214,120,${0.25 + rand() * 0.35})`;
    g.lineWidth = 2 + rand() * 6;
    const side = rand() < 0.5 ? -1 : 1;
    const y0 = 0.3 + rand() * 0.5;
    g.beginPath();
    g.moveTo(S * 0.5, S * y0);
    g.quadraticCurveTo(S * (0.5 + side * 0.15), S * (y0 - 0.08), S * (0.5 + side * (0.3 + rand() * 0.2)), S * (y0 - 0.2 - rand() * 0.1));
    g.stroke();
  }
  g.strokeStyle = "#a9c56f";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(S * 0.5, S * 0.84);
  g.lineTo(S * 0.5, S * 0.08);
  g.stroke();
  a.fillStyle = "#fff";
  a.fill(shape);
  return done(color, mask, anisotropy);
}

/** A snake plant's blade: a long strap to a point, dark green banded with
 *  pale zigzags across it, a gold margin along both edges. */
export function snakeLeaf(anisotropy: number): LeafArt {
  const W = 96;
  const H = 512;
  const { color, mask, g, a } = sheets(W, H, "#c9b25a");
  const shape = outline(W, H, [[0, 0.72], [0.45, 0.95], [0.78, 0.8], [0.94, 0.3], [1, 0.02]]);
  g.fillStyle = "#1f3d22";
  g.fill(shape);
  const rand = seeded(41);
  g.save();
  g.clip(shape);
  for (let y = 4; y < H; y += 9 + rand() * 12) {
    g.strokeStyle = rand() < 0.6 ? `rgba(110,150,95,${0.35 + rand() * 0.3})` : "rgba(20,45,22,0.6)";
    g.lineWidth = 2 + rand() * 4;
    g.beginPath();
    for (let x = 0; x <= W; x += 8) g.lineTo(x, y + Math.sin(x * 0.25 + y) * 3 + (x % 16 === 0 ? 2 : -2));
    g.stroke();
  }
  g.restore();
  g.strokeStyle = "#cdb85e";
  g.lineWidth = 9;
  g.stroke(shape);
  a.fillStyle = "#fff";
  a.fill(shape);
  return done(color, mask, anisotropy);
}
