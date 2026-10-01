import type { Layout } from "./layout";
import type { Lamp, Quay } from "./canal";
import { LAMP, TREE, mix, rgba } from "./palette";
import { TAU, between, chance, noise1, rng } from "./rng";

type Dot = { x: number; y: number; r: number };
export type Tree = { x: number; crown: Path2D; holes: Dot[]; lit: Dot[]; cx: number; cy: number; rx: number; ry: number; base: number; lean: number };

/** The old limes and planes along the street edge. A crown is a noisy mass
 *  with a fringe of small leaf clusters round its edge and a few gaps the
 *  windows show through; where a lamp stands under it, its underside catches
 *  the light in dapples. */
export function makeTrees(L: Layout, q: Quay): Tree[] {
  const r = rng(808);
  const { u, street } = L;
  const out: Tree[] = [];
  for (let x = between(r, 10, 70) * u; x < L.w + 50 * u; x += between(r, 80, 175) * u) {
    if (chance(r, 0.3)) continue;
    if (q.stairs.some((s) => x > s - 12 * u && x < s + 46 * u)) continue;
    const rx = between(r, 26, 48) * u;
    const ry = between(r, 20, 30) * u;
    const lean = between(r, -8, 8) * u;
    const cy = street - between(r, 56, 74) * u;
    const cx = x + lean;
    const seed = r() * 100;
    const edge = (a: number) => {
      const k = 1 + 0.15 * noise1(a * 2.3, seed) + 0.07 * noise1(a * 6.1, seed + 3) + 0.035 * noise1(a * 14, seed + 7);
      // fuller above, flatter underneath
      return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k * (Math.sin(a) > 0 ? 0.78 : 1.05)] as const;
    };
    const crown = new Path2D();
    for (let i = 0, n = 72; i <= n; i++) {
      const [px, py] = edge((i / n) * TAU);
      if (i === 0) crown.moveTo(px, py);
      else crown.lineTo(px, py);
    }
    crown.closePath();
    // the leafy fringe: small clusters sitting on the outline
    for (let i = 0, n = Math.round((rx + ry) / u) * 1.4; i < n; i++) {
      const a = r() * TAU;
      const [px, py] = edge(a);
      const cr = between(r, 1.2, 3.4) * u;
      const out2 = between(r, -0.6, 0.5) * cr;
      const fx = px + Math.cos(a) * out2;
      const fy = py + Math.sin(a) * out2;
      crown.moveTo(fx + cr, fy);
      crown.arc(fx, fy, cr, 0, TAU);
    }
    const holes: Dot[] = [];
    for (let i = 0, n = 6 + Math.floor(r() * 8); i < n; i++) {
      const a = r() * TAU;
      const d = between(r, 0.5, 0.86);
      holes.push({ x: cx + Math.cos(a) * rx * d, y: cy + Math.sin(a) * ry * d * 0.85, r: between(r, 0.9, 2.4) * u });
    }
    const lit: Dot[] = [];
    for (let i = 0; i < 46; i++) {
      const a = between(r, 0.15, 0.85) * Math.PI;
      const d = Math.sqrt(r());
      lit.push({ x: cx + Math.cos(a) * rx * d * 0.9, y: cy + Math.sin(a) * ry * d * 0.8, r: between(r, 0.9, 2.6) * u });
    }
    out.push({ x, crown, holes, lit, cx, cy, rx, ry, base: street, lean });
  }
  return out;
}

export function drawTrees(ctx: CanvasRenderingContext2D, L: Layout, trees: Tree[], lamps: Lamp[]) {
  const { u } = L;
  const bark = rgba(mix(TREE, [46, 38, 32], 0.35));
  for (const t of trees) {
    // the trunk, tapering and leaning into the crown, and two limbs
    const top = t.cy + t.ry * 0.25;
    ctx.fillStyle = bark;
    ctx.beginPath();
    ctx.moveTo(t.x - 2.1 * u, t.base);
    ctx.quadraticCurveTo(t.x - 1.5 * u, (t.base + top) / 2, t.x + t.lean * 0.6 - 1.1 * u, top);
    ctx.lineTo(t.x + t.lean * 0.6 + 1.1 * u, top);
    ctx.quadraticCurveTo(t.x + 1.5 * u, (t.base + top) / 2, t.x + 2.1 * u, t.base);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = bark;
    ctx.lineCap = "round";
    ctx.lineWidth = 1.2 * u;
    ctx.beginPath();
    ctx.moveTo(t.x + t.lean * 0.5, top + 5 * u);
    ctx.quadraticCurveTo(t.cx - t.rx * 0.2, t.cy + t.ry * 0.35, t.cx - t.rx * 0.55, t.cy + t.ry * 0.1);
    ctx.moveTo(t.x + t.lean * 0.55, top + 3 * u);
    ctx.quadraticCurveTo(t.cx + t.rx * 0.2, t.cy + t.ry * 0.3, t.cx + t.rx * 0.5, t.cy);
    ctx.stroke();

    ctx.fillStyle = rgba(TREE);
    ctx.fill(t.crown);
    ctx.save();
    ctx.clip(t.crown);
    let near: Lamp | null = null;
    for (const l of lamps) if (Math.abs(l.x - t.cx) < t.rx + 20 * u && (!near || Math.abs(l.x - t.cx) < Math.abs(near.x - t.cx))) near = l;
    if (near) {
      // light from below, gone a short way into the leaves, in dapples
      const R = t.ry * 1.25;
      const g = ctx.createRadialGradient(near.x, near.y, 0, near.x, near.y, R);
      g.addColorStop(0, rgba(LAMP, 0.38));
      g.addColorStop(0.5, rgba(mix(LAMP, [70, 52, 30], 0.5), 0.15));
      g.addColorStop(1, rgba(LAMP, 0));
      ctx.fillStyle = g;
      ctx.fillRect(near.x - R, near.y - R, R * 2, R * 2);
      ctx.fillStyle = rgba(LAMP);
      for (const d of t.lit) {
        const k = 1 - Math.hypot(d.x - near.x, (d.y - near.y) * 1.3) / R;
        if (k <= 0) continue;
        ctx.globalAlpha = 0.46 * k * k;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    const sky = ctx.createLinearGradient(0, t.cy - t.ry * 1.1, 0, t.cy - t.ry * 0.3);
    sky.addColorStop(0, "rgba(120,175,200,0.08)");
    sky.addColorStop(1, "rgba(120,175,200,0)");
    ctx.fillStyle = sky;
    ctx.fillRect(t.cx - t.rx * 1.4, t.cy - t.ry * 1.4, t.rx * 2.8, t.ry * 1.2);
    ctx.restore();

    // gaps in the leaves, so the houses behind show through
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.beginPath();
    for (const h of t.holes) {
      ctx.moveTo(h.x + h.r, h.y);
      ctx.arc(h.x, h.y, h.r, 0, TAU);
    }
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }
}
