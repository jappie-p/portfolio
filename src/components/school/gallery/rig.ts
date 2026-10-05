import { stationOf, type Room } from "./layout";

/** The walk's state, shared by the input, the scene and the HTML layer: a
 *  plain mutable object the scene reads every frame, outside React. */
export type Rig = {
  room: Room;
  /** walk position, stations at whole numbers */
  pos: number;
  vel: number;
  /** where the walk settles; `raw` is the input's own, unclamped */
  target: number;
  raw: number;
  /** an input is holding the walk: a drag, or a sideways swipe still going */
  held: boolean;
  /** the work under the mouse, and where on it, -1..1 */
  hover: number;
  lean: { x: number; y: number };
  /** the work with keyboard focus */
  focus: number;
  /** the mouse across the view, -1..1, eased toward its target */
  look: { x: number; y: number; tx: number; ty: number };
  /** stepping right up to a work: `t` springs 0..1 toward `to` (1: the
   *  picture fills the view); `hold` while it hands over to a project */
  dolly: { work: number; t: number; v: number; to: number; hold: boolean };
  /** a guided move to a work: the camera pulls back a little, travels, and
   *  steps up to it (`want` 1) or arrives standing back (`want` 0). `wait`
   *  holds the walk until the camera has pulled back from the work it left;
   *  `hold` keeps it right up to that work a moment first (seconds), while
   *  the project it came from fades away over it. */
  glide: { on: boolean; work: number; want: number; wait: boolean; hold: number };
};

/** How far past either end a drag can pull the walk, in stations. */
const BAND = 0.32;
/** The springs: the walk, a guided glide (a touch slower, so it reads as
 *  travel), and stepping up and back. */
const W_WALK = 6.2;
const W_GLIDE = 8;
const W_DOLLY = 8.5;
/** However far a glide has to go, never faster than this (stations a second). */
const MAX_GLIDE = 3.4;
/** While it travels, a glide stands this share of the way back from the works. */
const PULL = 0.68;
/** The walk lets go of the work it left once the camera is back this far. */
const LEAVE = 0.62;

export function createRig(room: Room): Rig {
  return {
    room,
    pos: 0,
    vel: 0,
    target: 0,
    raw: 0,
    held: false,
    hover: -1,
    lean: { x: 0, y: 0 },
    focus: -1,
    look: { x: 0, y: 0, tx: 0, ty: 0 },
    dolly: { work: -1, t: 0, v: 0, to: 0, hold: false },
    glide: { on: false, work: -1, want: 0, wait: false, hold: 0 },
  };
}

export const last = (r: Rig) => r.room.stations.length - 1;

/** A new room (the view changed shape): keep standing at the same work. */
export function setRoom(r: Rig, room: Room) {
  const was = r.room.faces[Math.round(r.target)] ?? -1;
  r.room = room;
  const at = Math.max(0, stationOf(room, was));
  r.pos = r.target = r.raw = was < 0 ? 0 : at;
  r.vel = 0;
  if (r.glide.on && !r.glide.wait) r.target = r.raw = stationOf(room, r.glide.work);
}

/** Past an end the walk gives, less and less, like a rubber band. */
function band(x: number, max: number) {
  if (x < 0) return -BAND * (1 - Math.exp(x / BAND));
  if (x > max) return max + BAND * (1 - Math.exp(-(x - max) / BAND));
  return x;
}

/** Walking away from a work you stepped up to steps back first. */
function stepBack(r: Rig) {
  if (!r.dolly.hold) r.dolly.to = 0;
}

/** Live input: move by `ds` stations. */
export function nudge(r: Rig, ds: number) {
  stepBack(r);
  if (!r.held) r.raw = r.target;
  r.held = true;
  r.raw += ds;
  r.target = band(r.raw, last(r));
}

/** The input let go: settle on a station, carried on by `flick` (stations
 *  of momentum). Returns how far past the far end it was pulled. */
export function settle(r: Rig, flick: number): number {
  const over = r.raw - last(r);
  r.held = false;
  r.target = Math.min(Math.max(Math.round(r.pos + flick), 0), last(r));
  r.raw = r.target;
  return over;
}

export function goTo(r: Rig, station: number) {
  stepBack(r);
  r.held = false;
  r.target = r.raw = Math.min(Math.max(station, 0), last(r));
}

/** Stand at a station at once, stepped back (nobody is looking). */
export function standAt(r: Rig, station: number) {
  r.pos = r.target = r.raw = station;
  r.vel = 0;
  r.held = false;
  Object.assign(r.dolly, { work: -1, t: 0, v: 0, to: 0, hold: false });
  r.glide.on = false;
}

/** Stand right up to a work at once, its picture filling the view: where a
 *  project's panel was entered, for surfacing from it. */
export function standClose(r: Rig, work: number) {
  standAt(r, stationOf(r.room, work));
  Object.assign(r.dolly, { work, t: 1, to: 1 });
}

/** Glide to a work: step up to it at the end (`want` 1), or arrive standing
 *  back from it (0), after `hold` seconds right where it is. Called again
 *  while gliding, it just changes course. */
export function glideTo(r: Rig, work: number, want: number, hold = 0) {
  const g = r.glide;
  // leaving a work you stand right up to: pull back from it before moving off
  if (!g.on) Object.assign(g, { wait: r.dolly.t > LEAVE && r.dolly.work !== work, hold });
  Object.assign(g, { on: true, work, want });
  r.held = false;
  r.dolly.hold = want === 1;
  if (!g.wait) r.target = r.raw = stationOf(r.room, work);
}

/** Keyboard focus came to a work (or left it, -1): walk over to it. */
export function focusOn(r: Rig, work: number) {
  r.focus = work;
  if (work >= 0 && !r.glide.on) goTo(r, stationOf(r.room, work));
}

/** Critically damped spring, solved exactly so any frame time is stable. */
function spring(x: number, v: number, to: number, w: number, dt: number): [number, number] {
  const d = x - to;
  const e = Math.exp(-w * dt);
  return [to + (d + (v + w * d) * dt) * e, (v - w * (v + w * d) * dt) * e];
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

export const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Close enough to count as arrived: the springs' last creep is too small
 *  to see, so the passage into the project can start (they keep settling). */
const NEAR = { pos: 0.006, vel: 0.06, dolly: 0.012 };

/** Advance the springs. Returns true when a glide has just arrived. */
export function stepRig(r: Rig, dt: number): boolean {
  const g = r.glide;
  const d = r.dolly;
  if (g.on && g.hold > 0) g.hold = Math.max(g.hold - dt, 0);
  else if (g.on) {
    if (g.wait && d.t <= LEAVE) {
      g.wait = false;
      r.target = r.raw = stationOf(r.room, g.work);
    }
    // pulled back a little while it travels, stepping up again as it arrives
    const left = g.wait ? 1 : Math.abs(r.target - r.pos);
    d.to = g.want * (1 - PULL * smooth(0.08, 0.6, left));
    d.work = r.room.faces[Math.round(r.pos)] ?? -1;
  }
  [r.pos, r.vel] = spring(r.pos, r.vel, r.target, r.held ? 20 : g.on ? W_GLIDE : W_WALK, dt);
  if (g.on) r.vel = Math.min(Math.max(r.vel, -MAX_GLIDE), MAX_GLIDE);
  const k = 1 - Math.exp(-dt * 2.6);
  r.look.x += (r.look.tx - r.look.x) * k;
  r.look.y += (r.look.ty - r.look.y) * k;
  [d.t, d.v] = spring(d.t, d.v, d.to, W_DOLLY, dt);
  if (d.t < 0 || d.t > 1) [d.t, d.v] = [Math.min(Math.max(d.t, 0), 1), 0];
  if (!g.on || g.wait || g.hold > 0 || Math.abs(r.target - r.pos) > NEAR.pos || Math.abs(r.vel) > NEAR.vel || Math.abs(d.t - g.want) > NEAR.dolly) return false;
  g.on = false;
  d.to = g.want;
  d.work = g.work;
  return true;
}

/** How far the camera has stepped up to this work, 0..1: the dolly, fading
 *  as the walk moves off its station (continuous while it glides past). */
export function inFront(r: Rig, work: number): number {
  return r.dolly.t * Math.max(0, 1 - Math.abs(r.pos - stationOf(r.room, work)));
}

/** The walk has (all but) arrived at a station and nobody holds it. */
export const resting = (r: Rig) => !r.held && !r.glide.on && Math.abs(r.pos - r.target) < 0.015 && Math.abs(r.vel) < 0.06;
