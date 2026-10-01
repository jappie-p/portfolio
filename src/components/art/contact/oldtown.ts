import type { Layout } from "./layout";
import type { Pane } from "./houses";
import { OLD, ROOF, STONE, mix, rgba, shade } from "./palette";
import { between, chance, rng, weighted, type Rng } from "./rng";

export type OldTown = { roofs: Path2D; slate: Path2D; spires: Path2D; panes: Pane[] };

/** The old town's roofs behind the canal houses, peeking over them: hipped
 *  and gabled roofs, chimneys, the odd warehouse, and a few church towers of
 *  the kinds Utrecht has (a needle spire, a lantern tower, twin towers, a
 *  roof turret). `keep` is the stretch around the Dom where none may rise. */
export function makeOldTown(L: Layout, keep: readonly [number, number]): OldTown {
  const r = rng(1122);
  const { u, street } = L;
  const roofs = new Path2D();
  const slate = new Path2D();
  const panes: Pane[] = [];
  let x = -between(r, 0, 40) * u;
  while (x < L.w + 20) {
    const w = between(r, 26, 84) * u;
    const eave = street - between(r, 86, 124) * u;
    const kind = r();
    const life = [0.15, 0.9, 1.6][weighted(r, [0.45, 0.4, 0.15])];
    roofs.rect(x, eave, w, street - eave + 2);
    if (kind < 0.55) {
      // a hipped roof seen from the eaves side
      const rh = between(r, 12, 30) * u;
      const inset = Math.min(rh * 0.9, w * 0.35);
      slate.moveTo(x - u, eave + 1);
      slate.lineTo(x + inset, eave - rh);
      slate.lineTo(x + w - inset, eave - rh);
      slate.lineTo(x + w + u, eave + 1);
      slate.closePath();
    } else if (kind < 0.85) {
      // a gable end facing the canal
      slate.moveTo(x - u, eave + 1);
      slate.lineTo(x + w / 2, eave - w * between(r, 0.4, 0.62));
      slate.lineTo(x + w + u, eave + 1);
      slate.closePath();
    } else {
      roofs.rect(x - u, eave - 2.5 * u, w + 2 * u, 2.5 * u);
    }
    for (let c = 0, n = Math.floor(r() * 3); c < n; c++) {
      const cx = x + between(r, 0.15, 0.85) * w;
      roofs.rect(cx, eave - between(r, 14, 26) * u, between(r, 2.4, 3.6) * u, 16 * u);
    }
    // a row of small windows under the eaves, for the far rooms to light
    for (let px = x + 5 * u; px < x + w - 6 * u; px += between(r, 8, 13) * u) {
      panes.push({ x: px, y: eave + between(r, 4, 7) * u, w: 2.6 * u, h: 3.8 * u, shop: false, life });
      if (chance(r, 0.5)) panes.push({ x: px, y: eave + 17 * u, w: 2.6 * u, h: 3.8 * u, shop: false, life });
    }
    x += w - between(r, 0, 6) * u;
  }

  const spires = new Path2D();
  const n = Math.max(1, Math.round(L.w / 360));
  const taken: number[] = [];
  const reach = (street - L.bandTop) / u;
  for (let i = 0, tries = 0; i < n && tries < 60; tries++) {
    const sx = between(r, 0.03, 0.97) * L.w;
    if (sx > keep[0] && sx < keep[1]) continue;
    if (taken.some((t) => Math.abs(t - sx) < 150 * u)) continue;
    taken.push(sx);
    church(spires, panes, r, i % 5, sx, street, u, Math.min(reach, 182));
    i++;
  }
  return { roofs, slate, spires, panes };
}

function church(p: Path2D, panes: Pane[], r: Rng, kind: number, x: number, street: number, u: number, max: number) {
  const Y = (k: number) => street - Math.min(k, max) * u;
  const tri = (x0: number, y0: number, x1: number, apex: number) => {
    p.moveTo(x0, y0);
    p.lineTo((x0 + x1) / 2, apex);
    p.lineTo(x1, y0);
    p.closePath();
  };
  const tower = (cx: number, hw: number, top: number) => {
    p.rect(cx - hw, Y(top), hw * 2, street - Y(top) + 2);
    p.rect(cx - hw - u, Y(top) - 1.6 * u, hw * 2 + 2 * u, 1.6 * u);
    panes.push({ x: cx - 1.2 * u, y: Y(top) + 7 * u, w: 2.4 * u, h: 6 * u, shop: false, life: 0.6 });
  };
  const cross = (cx: number, top: number) => {
    p.rect(cx - 0.35 * u, top - 7 * u, 0.7 * u, 7 * u);
    p.rect(cx - 2 * u, top - 5 * u, 4 * u, 0.7 * u);
  };
  const s = between(r, 0.9, 1.06);
  if (kind === 0) {
    // a needle spire on a square tower, like the Jacobikerk's
    tower(x, 8.5 * u, 118 * s);
    for (const k of [-1, 1]) tri(x + k * 8.4 * u - 1.2 * u, Y(118 * s) - 1.4 * u, x + k * 8.4 * u + 1.2 * u, Y(126 * s));
    tri(x - 6.5 * u, Y(118 * s) - 1.4 * u, x + 6.5 * u, Y(180 * s));
    cross(x, Y(180 * s));
  } else if (kind === 1) {
    // an octagonal lantern with a bell-shaped cap, like the Buurkerk's
    tower(x, 9.5 * u, 116 * s);
    p.rect(x - 6 * u, Y(132 * s), 12 * u, (16 * s) * u);
    p.moveTo(x - 6.6 * u, Y(132 * s));
    p.bezierCurveTo(x - 6.6 * u, Y(141 * s), x - 1.4 * u, Y(140 * s), x, Y(146 * s));
    p.bezierCurveTo(x + 1.4 * u, Y(140 * s), x + 6.6 * u, Y(141 * s), x + 6.6 * u, Y(132 * s));
    p.closePath();
    p.rect(x - 0.45 * u, Y(158 * s), 0.9 * u, 13 * u);
    p.moveTo(x + 1.4 * u, Y(151 * s));
    p.arc(x, Y(151 * s), 1.4 * u, 0, Math.PI * 2);
  } else if (kind === 2) {
    // twin towers with pyramid caps, like the Nicolaïkerk's
    for (const k of [-1, 1]) {
      const cx = x + k * 9.5 * u;
      tower(cx, 6 * u, 108 * s);
      tri(cx - 6.6 * u, Y(108 * s) - 1.5 * u, cx + 6.6 * u, Y(128 * s));
      cross(cx, Y(128 * s));
    }
    p.rect(x - 4 * u, Y(84), 8 * u, street - Y(84) + 2);
  } else if (kind === 3) {
    // a long church roof with a slender ridge turret, like the Janskerk's
    p.rect(x - 40 * u, Y(70), 80 * u, street - Y(70) + 2);
    p.moveTo(x - 41 * u, Y(70));
    p.lineTo(x - 30 * u, Y(98));
    p.lineTo(x + 30 * u, Y(98));
    p.lineTo(x + 41 * u, Y(70));
    p.closePath();
    p.rect(x - 2.4 * u, Y(116 * s), 4.8 * u, (18 * s) * u + 1);
    tri(x - 3 * u, Y(116 * s), x + 3 * u, Y(136 * s));
    cross(x, Y(136 * s));
    for (let k = -3; k <= 3; k++) panes.push({ x: x + k * 10 * u - 1.6 * u, y: Y(64), w: 3.2 * u, h: 9 * u, shop: false, life: 1.2 });
  } else {
    // a slender neo-gothic needle, like the Willibrordkerk's
    tower(x, 5.6 * u, 106 * s);
    for (const k of [-1, 1]) tri(x + k * 5.6 * u - u, Y(106 * s) - 1.6 * u, x + k * 5.6 * u + u, Y(116 * s));
    tri(x - 4.6 * u, Y(106 * s) - 1.6 * u, x + 4.6 * u, Y(174 * s));
    cross(x, Y(174 * s));
  }
}

export function drawOldTown(ctx: CanvasRenderingContext2D, L: Layout, o: OldTown) {
  const g = ctx.createLinearGradient(0, L.bandTop, 0, L.street);
  g.addColorStop(0, rgba(shade(OLD, 0.94)));
  g.addColorStop(1, rgba(mix(OLD, STONE, 0.25)));
  ctx.fillStyle = rgba(mix(ROOF, OLD, 0.55));
  ctx.fill(o.slate);
  ctx.fillStyle = g;
  ctx.fill(o.roofs);
  ctx.fill(o.spires);
  ctx.strokeStyle = "rgba(150,195,240,0.06)";
  ctx.lineWidth = 1;
  ctx.stroke(o.spires);
}
