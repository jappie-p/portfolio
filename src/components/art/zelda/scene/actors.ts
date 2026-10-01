import type { Hero } from "./hero";
import type { Layout } from "./layout";
import { between, int, type Rng } from "./rng";
import type { RupeeKind } from "./sprites";

export type Slime = {
  x: number;
  ground: number;
  lift: number;
  front: boolean;
  lo: number;
  hi: number;
  wait: number;
  hop: number;
  jump: number;
  from: number;
  to: number;
  wobble: number;
  startled: boolean;
};

/** The game's slimes: they wobble in place and hop about now and then. When
 *  Link comes walking up they jump in fright and duck until he has passed. */
export function makeSlimes(L: Layout, rand: Rng): Slime[] {
  const spots = [
    { x: L.W * 0.46, ground: L.pathTop - 1, front: false },
    { x: L.W * 0.83, ground: L.pathTop - 1, front: false },
    { x: L.W * 0.63, ground: L.H - 2, front: true },
  ];
  return spots.map((s) => ({
    ...s,
    lift: 0,
    lo: s.x - 22,
    hi: s.x + 22,
    wait: between(rand, 0.5, 3),
    hop: -1,
    jump: 6,
    from: s.x,
    to: s.x,
    wobble: rand() * 2,
    startled: false,
  }));
}

const HOP = 0.5;

export function updateSlimes(slimes: Slime[], hero: Hero, dt: number, rand: Rng) {
  for (const s of slimes) {
    s.wobble += dt;
    const gap = Math.abs(hero.x - s.x);
    if (hero.onPath && gap < 34 && !s.startled && s.hop < 0) {
      s.startled = true;
      s.from = s.to = s.x;
      s.jump = 4;
      s.hop = 0;
    }
    if (s.startled && (!hero.onPath || gap > 40)) {
      s.startled = false;
      s.wait = between(rand, 0.6, 1.4);
    }
    if (s.hop >= 0) {
      s.hop += dt / HOP;
      const t = Math.min(1, s.hop);
      s.x = s.from + (s.to - s.from) * t;
      s.lift = Math.sin(Math.PI * t) * s.jump;
      if (s.hop >= 1) {
        s.hop = -1;
        s.lift = 0;
        s.wait = between(rand, 1.6, 4.2);
        s.wobble = 0;
      }
      continue;
    }
    if (s.startled) continue;
    s.wait -= dt;
    if (s.wait > 0) continue;
    const dir = rand() < 0.5 ? -1 : 1;
    const clamp = (x: number) => Math.max(s.lo, Math.min(s.hi, x));
    let to = clamp(s.x + dir * between(rand, 7, 13));
    if (Math.abs(to - s.x) < 3) to = clamp(s.x - dir * 8);
    s.from = s.x;
    s.to = to;
    s.jump = 6;
    s.hop = 0;
  }
}

/** Which slime pose: 0 round, 1 squashed (crouch, landing, ducking), 2 stretched (mid-air). */
export function slimePose(s: Slime) {
  if (s.hop >= 0) return s.hop < 0.1 || s.hop > 0.9 ? 1 : 2;
  if (s.startled || s.wait < 0.12) return 1;
  return Math.floor(s.wobble / 0.42) % 2;
}

export type Rupee = { x: number; y: number; kind: RupeeKind; onPath: boolean; shine: number; sparkle: number; gone: number };

export function makeRupees(L: Layout, rand: Rng): Rupee[] {
  const r = (x: number, y: number, kind: RupeeKind, onPath: boolean): Rupee => ({ x: Math.round(x), y, kind, onPath, shine: rand() * 3, sparkle: between(rand, 0.5, 3), gone: 0 });
  return [r(L.W * 0.36, L.feet - 11, "green", true), r(L.W * 0.7, L.feet - 12, "green", true), r(L.W * 0.56, L.pathTop - 12, "blue", false)];
}

export type Burst = { x: number; y: number; age: number };

/** Link picks up rupees on the path; they come back a few seconds later. */
export function updateRupees(rupees: Rupee[], hero: Hero, bursts: Burst[], dt: number, rand: Rng) {
  for (const r of rupees) {
    r.shine += dt;
    r.sparkle -= dt;
    if (r.sparkle < -0.5) r.sparkle = between(rand, 2, 4.5);
    if (r.gone > 0) {
      r.gone -= dt;
      if (r.gone <= 0) bursts.push({ x: r.x + 3, y: r.y + 5, age: 0 });
      continue;
    }
    if (r.onPath && hero.onPath && Math.abs(hero.x - (r.x + 3)) < 4) {
      r.gone = between(rand, 6, 9);
      bursts.push({ x: r.x + 3, y: r.y + 5, age: 0 });
    }
  }
  for (let i = bursts.length - 1; i >= 0; i--) {
    bursts[i].age += dt;
    if (bursts[i].age > 0.5) bursts.splice(i, 1);
  }
}

/** Glint frame of a rupee's shine cycle (0 is plain). */
export function rupeeGlint(r: Rupee) {
  const t = r.shine % 2.6;
  return t < 0.24 ? 1 + Math.floor(t / 0.08) : 0;
}

export type Firefly = { hx: number; hy: number; ax: number; ay: number; fx: number; fy: number; px: number; py: number; period: number; lit: number; offset: number; depth: number };

/** Fireflies over the grass and the forest edge, kept out of the calm upper
 *  right where the panel's text sits. */
export function makeFireflies(L: Layout, rand: Rng): Firefly[] {
  const n = Math.round(Math.max(10, L.W / 14));
  const out: Firefly[] = [];
  while (out.length < n) {
    const hx = between(rand, 0, L.W);
    const hy = between(rand, L.groundTop - 34, L.H - 6);
    if (hx > L.W * 0.56 && hy < L.groundTop - 8) continue;
    out.push({
      hx,
      hy,
      ax: between(rand, 4, 12),
      ay: between(rand, 2, 6),
      fx: between(rand, 0.12, 0.3),
      fy: between(rand, 0.2, 0.45),
      px: rand() * 6.3,
      py: rand() * 6.3,
      period: between(rand, 3.2, 6),
      lit: between(rand, 1.6, 2.8),
      offset: rand() * 7,
      depth: int(rand, 0, 1),
    });
  }
  return out;
}

export function fireflyAt(f: Firefly, t: number) {
  const x = f.hx + Math.sin(t * f.fx + f.px) * f.ax + Math.sin(t * f.fx * 2.3 + f.px * 1.7) * f.ax * 0.3;
  const y = f.hy + Math.sin(t * f.fy + f.py) * f.ay;
  const phase = (t + f.offset) % f.period;
  const glow = phase < f.lit ? Math.sin((Math.PI * phase) / f.lit) : 0;
  return { x, y, glow };
}

export type Puff = { x: number; y: number; age: number; life: number; drift: number };

export function updateSmoke(puffs: Puff[], from: readonly [number, number], dt: number, clock: { next: number }, rand: Rng) {
  clock.next -= dt;
  if (clock.next <= 0) {
    clock.next = between(rand, 0.55, 0.95);
    puffs.push({ x: from[0] + between(rand, -0.5, 0.5), y: from[1], age: 0, life: between(rand, 4, 6), drift: between(rand, 1.6, 3.2) });
  }
  for (let i = puffs.length - 1; i >= 0; i--) {
    const p = puffs[i];
    p.age += dt;
    p.y -= 5.2 * dt;
    p.x += (p.drift + Math.sin(p.age * 1.7) * 0.8) * dt;
    if (p.age > p.life) puffs.splice(i, 1);
  }
}

export type Meteor = { x: number; y: number; vx: number; vy: number; age: number; life: number };

/** Every so often a star falls, somewhere over the left of the sky. */
export function updateMeteor(m: { current: Meteor | null; wait: number }, L: Layout, dt: number, rand: Rng) {
  if (m.current) {
    m.current.age += dt;
    m.current.x += m.current.vx * dt;
    m.current.y += m.current.vy * dt;
    if (m.current.age > m.current.life) m.current = null;
    return;
  }
  m.wait -= dt;
  if (m.wait > 0) return;
  m.wait = between(rand, 14, 26);
  m.current = { x: between(rand, L.W * 0.05, L.W * 0.4), y: between(rand, 4, 22), vx: between(rand, 70, 100), vy: between(rand, 24, 38), age: 0, life: between(rand, 0.45, 0.7) };
}
