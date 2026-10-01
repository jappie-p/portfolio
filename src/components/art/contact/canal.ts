import type { Layout } from "./layout";
import type { House, Pane } from "./houses";
import { LAMP, QUAY, STONE, mix, rgba, shade } from "./palette";
import { between, chance, rng } from "./rng";

export type Lamp = { x: number; y: number };

/** The Oudegracht's lower level: the quay wall under the street with the
 *  wharf cellars' arched doors and windows, the wharf at the water, the
 *  stairs between the two levels, the railing and the lamps on the street. */
export type Quay = { lamps: Lamp[]; cellars: Pane[]; arches: Path2D; stairs: number[]; posts: number[] };

/** Top of the cellar openings' floor: the wharf surface. */
export const wharfFloor = (L: Layout) => L.wharf - 6 * L.u;

function arch(p: Path2D, x: number, w: number, bottom: number, h: number) {
  p.moveTo(x, bottom);
  p.lineTo(x, bottom - h + w / 2);
  p.arc(x + w / 2, bottom - h + w / 2, w / 2, Math.PI, 0);
  p.lineTo(x + w, bottom);
  p.closePath();
}

export function makeQuay(L: Layout, houses: House[]): Quay {
  const r = rng(1122 + 5);
  const { u } = L;
  const floor = wharfFloor(L);
  const stairs: number[] = [];
  for (let x = between(r, 0.18, 0.4) * L.w; x < L.w; x += between(r, 420, 640) * u) stairs.push(x);
  const blocked = (x0: number, x1: number) => stairs.some((s) => x1 > s - 6 * u && x0 < s + 40 * u);

  const cellars: Pane[] = [];
  const arches = new Path2D();
  for (const h of houses) {
    const w = h.x1 - h.x0;
    const slots = w > 60 * u ? 3 : w > 40 * u ? 2 : 1;
    // a cellar is a restaurant with its lights on, or a storeroom
    const life = chance(r, 0.42) ? 1.7 : 0.12;
    for (let i = 0; i < slots; i++) {
      const door = i === 0 && chance(r, 0.6);
      const ow = (door ? between(r, 8.5, 10.5) : between(r, 6, 7.8)) * u;
      const oh = (door ? between(r, 13, 15) : between(r, 7.5, 9.5)) * u;
      const cx = h.x0 + (w * (i + 0.5)) / slots + between(r, -0.12, 0.12) * (w / slots);
      const x0 = cx - ow / 2;
      if (blocked(x0, x0 + ow)) continue;
      const bottom = door ? floor : floor - between(r, 3, 4.5) * u;
      arch(arches, x0, ow, bottom, oh);
      cellars.push({ x: x0, y: bottom - oh, w: ow, h: oh, shop: door, life });
    }
  }

  const lamps: Lamp[] = [];
  for (let x = between(r, 30, 90) * u; x < L.w + 30 * u; x += between(r, 105, 175) * u) {
    if (blocked(x - 8 * u, x + 8 * u)) continue;
    lamps.push({ x, y: L.street - 25.5 * u });
  }
  const posts: number[] = [];
  for (let x = between(r, 10, 60) * u; x < L.w; x += between(r, 60, 160) * u) if (!blocked(x - 4 * u, x + 4 * u)) posts.push(x);
  return { lamps, cellars, arches, stairs, posts };
}

/** The quay, the wharf, stairs, posts and lamps. The railing goes on last, in
 *  front of the tree trunks, so it is drawn by drawRailing. */
export function drawQuay(ctx: CanvasRenderingContext2D, L: Layout, q: Quay, glow: HTMLCanvasElement) {
  const { u, street, wharf, w } = L;
  const floor = wharfFloor(L);
  const wall = ctx.createLinearGradient(0, street, 0, floor);
  wall.addColorStop(0, rgba(mix(QUAY, STONE, 0.12)));
  wall.addColorStop(1, rgba(shade(QUAY, 0.86)));
  ctx.fillStyle = wall;
  ctx.fillRect(-2, street, w + 4, floor - street);
  // brick courses, just readable where the light falls
  ctx.fillStyle = "rgba(150,180,215,0.035)";
  for (let y = street + 3 * u; y < floor - u; y += 2.6 * u) ctx.fillRect(-2, y, w + 4, Math.max(0.5, 0.35 * u));
  // coping stones along the street edge, the wharf floor, its stone edge
  ctx.fillStyle = rgba(mix(QUAY, STONE, 0.6));
  ctx.fillRect(-2, street, w + 4, 1.6 * u);
  ctx.fillStyle = rgba(mix(QUAY, STONE, 0.3));
  ctx.fillRect(-2, floor, w + 4, wharf - floor - 2.6 * u);
  ctx.fillStyle = rgba(mix(QUAY, STONE, 0.5));
  ctx.fillRect(-2, wharf - 2.6 * u, w + 4, 2.6 * u);
  ctx.fillStyle = "rgba(170,205,240,0.16)";
  ctx.fillRect(-2, wharf - 2.6 * u, w + 4, Math.max(0.6, 0.5 * u));

  ctx.fillStyle = rgba(shade(QUAY, 0.38));
  ctx.fill(q.arches);
  ctx.strokeStyle = rgba(mix(QUAY, STONE, 0.45));
  ctx.lineWidth = Math.max(0.8, 0.9 * u);
  ctx.stroke(q.arches);

  for (const s of q.stairs) {
    // a flight down the wall from the street to the wharf, with its handrail
    const run = 34 * u;
    ctx.fillStyle = rgba(mix(QUAY, STONE, 0.42));
    ctx.beginPath();
    ctx.moveTo(s, street);
    const steps = 9;
    for (let i = 0; i < steps; i++) {
      const x = s + (run * i) / steps;
      const y = street + ((floor - street) * (i + 1)) / steps;
      ctx.lineTo(x, y);
      ctx.lineTo(x + run / steps, y);
    }
    ctx.lineTo(s + run, floor + 0.5);
    ctx.lineTo(s, floor + 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(mix(QUAY, STONE, 0.7));
    ctx.lineWidth = Math.max(0.7, 0.7 * u);
    ctx.beginPath();
    ctx.moveTo(s - 2 * u, street - 7 * u);
    ctx.lineTo(s + run, floor - 7 * u);
    ctx.lineTo(s + run, floor);
    ctx.stroke();
  }
  ctx.fillStyle = rgba(shade(QUAY, 0.7));
  for (const x of q.posts) ctx.fillRect(x - 1.1 * u, wharf - 7.5 * u, 2.2 * u, 5 * u);

  for (const l of q.lamps) {
    ctx.fillStyle = "#070b12";
    ctx.fillRect(l.x - 0.6 * u, l.y + 2 * u, 1.2 * u, street - l.y - 2 * u);
    ctx.beginPath();
    ctx.moveTo(l.x - 1.8 * u, l.y - 2.6 * u);
    ctx.lineTo(l.x + 1.8 * u, l.y - 2.6 * u);
    ctx.lineTo(l.x + 1.2 * u, l.y + 2.2 * u);
    ctx.lineTo(l.x - 1.2 * u, l.y + 2.2 * u);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba(LAMP, 0.95);
    ctx.fillRect(l.x - 1 * u, l.y - 1.8 * u, 2 * u, 3.4 * u);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.5;
    ctx.drawImage(glow, l.x - 22 * u, l.y - 20 * u, 44 * u, 40 * u);
    ctx.globalAlpha = 0.16;
    ctx.drawImage(glow, l.x - 60 * u, l.y - 40 * u, 120 * u, 80 * u);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
}

/** The iron railing along the street edge, open where the stairs go down. */
export function drawRailing(ctx: CanvasRenderingContext2D, L: Layout, q: Quay) {
  const { u, street, w } = L;
  const top = street - 7 * u;
  ctx.fillStyle = "#0a1019";
  let x = -4;
  const open = (px: number) => q.stairs.some((s) => px > s - 3 * u && px < s + 3 * u);
  for (const s of [...q.stairs, w + 8]) {
    const end = s - 3 * u;
    if (end > x) {
      ctx.fillRect(x, top, end - x, Math.max(0.8, 0.8 * u));
      ctx.fillRect(x, top + 3.4 * u, end - x, Math.max(0.6, 0.55 * u));
    }
    x = s + 3 * u;
  }
  for (let px = 0; px < w; px += 7.5 * u) if (!open(px)) ctx.fillRect(px, top, Math.max(0.7, 0.6 * u), street - top);
}
