import { LIP, type Room } from "./layout";
import { lerpPose, makePath, pose, type Pose } from "./path";
import type { Rig } from "./rig";
import { sliceOnScreen } from "./slices";

const LOOK_X = 0.16;
const LOOK_YAW = 0.022;
const LOOK_PITCH = 0.012;

/**
 * Right up to a work, where its project's panel takes over from it. On a
 * wide screen the print's picture then covers exactly the slice of that
 * panel it shows (the prints are pictures of the panels), so the panel can
 * fade in around it without anything moving. In a narrow room, and for the
 * card, the work fills the view.
 */
function passPose(room: Room, i: number, aspect: number): Pose {
  const w = room.works[i];
  if (room.narrow || w.id === "berlijn") return room.close[i];
  const t = Math.tan((room.fov * Math.PI) / 360);
  const slice = sliceOnScreen(w.id, aspect);
  const d = w.h / (2 * t * slice.h);
  const nx = slice.x * 2 - 1;
  return pose(w.x - nx * aspect * d * t, w.y, d + w.depth - LIP, 0, 0, 0, room.fov);
}

type Paths = {
  aspect: number;
  /** where the walk stands */
  walk: (s: number, out: Pose) => Pose;
  /** right up to the work in front, for any walk position: stepping up
   *  while the walk still moves stays one smooth path */
  close: (s: number, out: Pose) => Pose;
};

const paths = new WeakMap<Room, Paths>();
function pathsOf(room: Room, aspect: number): Paths {
  let p = paths.get(room);
  if (!p || Math.abs(p.aspect - aspect) > 1e-3) {
    const close = room.stations.map((st, i) => (room.faces[i] < 0 ? st : passPose(room, room.faces[i], aspect)));
    paths.set(room, (p = { aspect, walk: p?.walk ?? makePath(room.stations), close: makePath(close) }));
  }
  return p;
}

const walk = pose(0, 0, 0);
const near = pose(0, 0, 0);

/** The camera's pose this frame, for a view `aspect` wide: where the walk
 *  stands, the head turned a little toward the mouse with the faint sway of
 *  someone standing still, stepped up toward the work in front as far as
 *  the dolly goes (a spring, so it already eases in and out). */
export function cameraPose(rig: Rig, time: number, aspect: number, out: Pose): Pose {
  const { walk: w, close } = pathsOf(rig.room, aspect);
  const p = w(rig.pos, walk);
  const sway = time * 0.5;
  p.x += rig.look.x * LOOK_X + Math.sin(sway * 0.9) * 0.012;
  p.y += -rig.look.y * 0.05 + Math.sin(sway * 1.3 + 1) * 0.006;
  p.yaw += rig.look.x * LOOK_YAW + Math.sin(sway * 0.7 + 2) * 0.0012;
  p.pitch -= rig.look.y * LOOK_PITCH;
  if (rig.dolly.t <= 0) return Object.assign(out, p);
  return lerpPose(p, close(rig.pos, near), rig.dolly.t, out);
}

/** The camera's pose for where the walk stands, before the scene runs. */
export function restPose(rig: Rig): Pose {
  return pathsOf(rig.room, 1.6).walk(rig.pos, pose(0, 0, 0));
}
