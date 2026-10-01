import type { Layout } from "./layout";
import type { Pane } from "./houses";
import { FAR, LEAF, mix, rgba } from "./palette";
import { between, chance, rng } from "./rng";

export type Far = { shape: Path2D; panes: Pane[]; reds: { x: number; y: number }[] };

/** The modern city on the horizon, faint in the haze: office slabs by the
 *  station, a stepped tower, an antenna with its red obstacle light. They
 *  stay low and keep away from the Dom (`keep`), which stands alone. */
export function makeFar(L: Layout, keep: readonly [number, number]): Far {
  const r = rng(2014);
  const { u, street } = L;
  const shape = new Path2D();
  const panes: Pane[] = [];
  const reds: Far["reds"] = [];
  const n = Math.max(2, Math.round(L.w / 260));
  const taken: number[] = [];
  for (let i = 0, tries = 0; i < n && tries < 80; tries++) {
    const w = between(r, 22, 58) * u;
    const x = between(r, -0.02, 0.98) * L.w;
    if (x + w > keep[0] - 10 * u && x < keep[1] + 10 * u) continue;
    if (taken.some((t) => Math.abs(t - x) < 70 * u)) continue;
    taken.push(x);
    i++;
    const top = street - between(r, 120, 168) * u;
    shape.rect(x, top, w, street - top + 2);
    let roof = top;
    if (chance(r, 0.4)) {
      // a setback crown
      const inset = w * between(r, 0.15, 0.3);
      roof = top - between(r, 6, 14) * u;
      shape.rect(x + inset, roof, w - inset * 2, top - roof + 1);
    }
    if (chance(r, 0.35)) {
      const ax = x + w * between(r, 0.3, 0.7);
      const ay = roof - between(r, 10, 20) * u;
      shape.rect(ax - 0.4 * u, ay, 0.8 * u, roof - ay + 1);
      reds.push({ x: ax, y: ay });
    } else if (chance(r, 0.5)) shape.rect(x + w * 0.2, roof - 4 * u, w * 0.3, 4 * u + 1);
    // a grid of office windows, most of them dark at this hour
    const cols = Math.max(2, Math.floor(w / (4.6 * u)));
    const step = w / cols;
    const life = between(r, 0.3, 1.6);
    for (let y = top + 4 * u; y < street - 20 * u; y += 5.2 * u) {
      for (let c = 0; c < cols; c++) panes.push({ x: x + c * step + step * 0.3, y, w: Math.max(1, step * 0.4), h: 2 * u, shop: false, life });
    }
  }
  return { shape, panes, reds };
}

export function drawFar(ctx: CanvasRenderingContext2D, L: Layout, f: Far) {
  const g = ctx.createLinearGradient(0, L.bandTop - 30 * L.u, 0, L.street);
  g.addColorStop(0, rgba(FAR));
  g.addColorStop(1, rgba(mix(FAR, LEAF, 0.07)));
  ctx.fillStyle = g;
  ctx.fill(f.shape);
}
