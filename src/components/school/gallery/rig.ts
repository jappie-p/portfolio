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
  /** stepping right up to a work: `t` runs 0..1 toward `to`; `hold` while
   *  it hands over to the zoom (no walking away then) */
  dolly: { work: number; t: number; to: number; hold: boolean };
};

/** How far past either end a drag can pull the walk, in stations. */
const BAND = 0.32;
/** Seconds to step up to a work and back. */
export const DOLLY_S = 0.85;

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
    dolly: { work: -1, t: 0, to: 0, hold: false },
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
  Object.assign(r.dolly, { work: -1, t: 0, to: 0, hold: false });
}

/** Keyboard focus came to a work (or left it, -1): walk over to it. */
export function focusOn(r: Rig, work: number) {
  r.focus = work;
  if (work >= 0) goTo(r, stationOf(r.room, work));
}

/** Critically damped spring, solved exactly so any frame time is stable. */
function spring(x: number, v: number, to: number, w: number, dt: number): [number, number] {
  const d = x - to;
  const e = Math.exp(-w * dt);
  return [to + (d + (v + w * d) * dt) * e, (v - w * (v + w * d) * dt) * e];
}

export const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Advance the springs. Returns true when the dolly just arrived at a work. */
export function stepRig(r: Rig, dt: number): boolean {
  [r.pos, r.vel] = spring(r.pos, r.vel, r.target, r.held ? 20 : 6.2, dt);
  const k = 1 - Math.exp(-dt * 2.6);
  r.look.x += (r.look.tx - r.look.x) * k;
  r.look.y += (r.look.ty - r.look.y) * k;
  const d = r.dolly;
  if (d.t === d.to) return false;
  d.t = d.to > d.t ? Math.min(d.t + dt / DOLLY_S, d.to) : Math.max(d.t - dt / DOLLY_S, d.to);
  return d.t === 1 && d.to === 1;
}

/** The walk has (all but) arrived at a station and nobody holds it. */
export const resting = (r: Rig) => !r.held && Math.abs(r.pos - r.target) < 0.015 && Math.abs(r.vel) < 0.06;
