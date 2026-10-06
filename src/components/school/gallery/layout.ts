import { pose, project, type Pose } from "./path";

/** The gallery as a room, in metres: the wall is the plane z = 0 facing +z,
 *  the floor is y = 0, and the works hang along x. The camera walks from
 *  station to station. On a wide screen the walk starts at the entrance,
 *  looking down the wall past the exhibition title; in a narrow room the
 *  title sits above the works and the walk starts at the first one. */

export type WorkId = "zelda" | "kiosk" | "festival" | "berlijn";

export type Work = {
  id: WorkId;
  /** centre on the wall */
  x: number;
  y: number;
  /** the picture, the mat around it, the frame's face, and how far it stands off the wall */
  w: number;
  h: number;
  mat: number;
  frame: number;
  depth: number;
};

export type Room = {
  narrow: boolean;
  /** the walk's vertical field of view, degrees (the entrance opens wider) */
  fov: number;
  works: Work[];
  stations: Pose[];
  /** the work each station looks at; -1 for the entrance */
  faces: number[];
  /** per work, where the camera ends up when it steps right up to it */
  close: Pose[];
  /** how far the wall moves on screen per station, as a share of the view's
   *  width: drags use it so the wall keeps up with the finger */
  stride: number;
};

export const ORDER: WorkId[] = ["zelda", "kiosk", "festival", "berlijn"];

/** The three projects as large square prints; the Berlijn app as a small card. */
const PRINT = { w: 1.22, h: 1.22, mat: 0.15, frame: 0.042, depth: 0.05 };
const CARD = { w: 0.56, h: 0.75, mat: 0.085, frame: 0.03, depth: 0.04 };

export const outerW = (w: Work) => w.w + 2 * (w.mat + w.frame);
export const outerH = (w: Work) => w.h + 2 * (w.mat + w.frame);
/** How far the frame's lip stands proud of the mat: the face sits this far behind its front. */
export const LIP = 0.018;

/** Below this width-to-height ratio the room narrows: phones, portrait tablets. */
export const NARROW = 0.9;
/** The entrance: a longer lens, low, standing back from the wall and turned
 *  down it; how far it may turn; where the last print's far edge and the
 *  first frame's top fall (NDC across and up the view). */
const ENTRANCE = { fov: 38, eye: 1.0, z: 3.4, turn: [0.55, 1.15], far: 0.86, top: 0.76 };

const tan = (deg: number) => Math.tan((deg * Math.PI) / 360);

/** The works left to right, `gap` between frames (`cardGap` before the card). */
function hang(gap: number, cardGap: number): Work[] {
  const works: Work[] = [];
  let x = 0;
  ORDER.forEach((id, i) => {
    const kind = id === "berlijn" ? CARD : PRINT;
    const w: Work = { id, x: 0, y: id === "berlijn" ? 1.47 : 1.52, ...kind };
    if (i > 0) {
      const prev = works[i - 1];
      x += outerW(prev) / 2 + (id === "berlijn" ? cardGap : gap) + outerW(w) / 2;
    }
    w.x = x;
    works.push(w);
  });
  return works;
}

/** The entrance: low and back from the wall and turned down it, so the
 *  three prints line up along the wall running away to the right. It stands
 *  just far enough left that the first frame starts where the copy ends
 *  (`clear`, in NDC across the view), turns down the wall just far enough
 *  that the last print's far edge is still in view, and shifts its lens so
 *  the first frame's top sits clear of the site's bar: the frames stay
 *  upright, and a narrower screen sees the wall at a steeper angle. */
function entrance(works: Work[], aspect: number, clear: number): Pose {
  const e = ENTRANCE;
  const first = works[0];
  const last = works.find((w) => w.id === "festival") ?? works[works.length - 1];
  const p = pose(first.x - 3, e.eye, e.z, e.turn[0], 0, 0, e.fov);
  const edge = [0, 0, 0];
  const ndc = (x: number, y: number, z: number) => {
    project(p, aspect, 1, x, y, z, edge);
    return [(edge[0] / aspect) * 2 - 1, 1 - edge[1] * 2];
  };
  // stand where the first frame starts at `clear` (further left puts it further right)
  const stand = () => {
    let lo = first.x - 12;
    let hi = first.x - 1;
    for (let i = 0; i < 24; i++) {
      p.x = (lo + hi) / 2;
      if (ndc(first.x - outerW(first) / 2, first.y, first.depth)[0] < clear) hi = p.x;
      else lo = p.x;
    }
  };
  // turning further down the wall draws the far prints in toward the first
  let lo = e.turn[0];
  let hi = e.turn[1];
  for (let i = 0; i < 20; i++) {
    p.yaw = (lo + hi) / 2;
    stand();
    if (ndc(last.x + outerW(last) / 2, last.y, last.depth)[0] > e.far) lo = p.yaw;
    else hi = p.yaw;
  }
  p.yaw = hi;
  stand();
  p.shift = e.top - ndc(first.x - outerW(first) / 2, first.y + outerH(first) / 2, first.depth)[1];
  return p;
}

/** Wide screens: big prints at eye height, an entrance view down the wall. */
function wide(aspect: number, clear: number): Room {
  const fov = 38;
  const t = tan(fov);
  const f = 1 / t;
  const works = hang(1.2, 1.1);
  const stations: Pose[] = [];
  const faces: number[] = [];
  const close: Pose[] = [];
  const eye = 1.5;
  for (const [i, w] of works.entries()) {
    const share = w.id === "berlijn" ? 0.4 : 0.46;
    // tall enough to fill most of the height, never too wide to fit
    const d = Math.max(outerH(w) / (share * 2 * t), outerW(w) / (0.6 * 2 * t * aspect));
    // a lens shift that keeps a strip of floor along the bottom, as far as
    // that leaves the work near the middle (the card is seen closer up)
    stations.push(pose(w.x, eye, d, 0, 0, Math.min(-0.78 + (f * eye) / d, 0.1), fov));
    faces.push(i);
    // right up to it: the picture fills the screen (or, for the card, most of it)
    const fill = w.id === "berlijn" ? outerH(w) / (0.82 * 2 * t) : Math.max(w.h / (2 * t), w.w / (2 * t * aspect));
    close.push(pose(w.x, w.y, fill, 0, 0, 0, fov));
  }
  stations.unshift(entrance(works, aspect, clear));
  faces.unshift(-1);
  const stride = (works[1].x - works[0].x) / (2 * t * aspect * stations[1].z);
  return { narrow: false, fov, works, stations, faces, close, stride };
}

/** Narrow screens: a closer, tighter room. The copy sits above the works,
 *  so each one hangs in the band between the copy's last line (`below`, in
 *  NDC) and room for its label, as large as the band and the width allow;
 *  the lens shifts the horizon instead of tilting the camera, so the frames
 *  stay square. */
function narrow(aspect: number, below: number, ndcPerPx: number): Room {
  const fov = 56;
  const t = tan(fov);
  const works = hang(0.8, 0.7);
  const stations: Pose[] = [];
  const faces: number[] = [];
  const close: Pose[] = [];
  for (const [i, w] of works.entries()) {
    const card = w.id === "berlijn";
    const top = Math.min(below - 0.06, 0.5);
    // under it, room for its label (the card's tells its story) and the
    // progress dots at the foot of the screen
    const bottom = -1 + (card ? 196 : 124) * ndcPerPx;
    const d = Math.max(outerW(w) / ((card ? 0.6 : 0.8) * 2 * t * aspect), outerH(w) / (Math.max(top - bottom, 0.3) * t));
    stations.push(pose(w.x, w.y, d, 0, 0, (top + bottom) / 2, fov));
    faces.push(i);
    const fill = card ? outerW(w) / (0.9 * 2 * t * aspect) : w.w / (2 * t * aspect);
    close.push(pose(w.x, w.y, fill, 0, 0, 0, fov));
  }
  const stride = (works[1].x - works[0].x) / (2 * t * aspect * stations[0].z);
  return { narrow: true, fov, works, stations, faces, close, stride };
}

/** Where the copy ends, in NDC across the view: its right edge (a wide wall
 *  starts the walk with the first work beyond it) and its last line (a
 *  narrow room hangs the works below it); and how much NDC a CSS pixel of
 *  the view's height is, for the labels' room. */
export type Clearance = { right: number; below: number; ndcPerPx: number };

/** The room for a view of this shape (width over height). */
export function roomFor(aspect: number, clear: Clearance = { right: 0.08, below: 0.12, ndcPerPx: 2 / 844 }): Room {
  return aspect < NARROW ? narrow(aspect, clear.below, clear.ndcPerPx) : wide(aspect, clear.right);
}

/** The station that stands in front of a work. */
export const stationOf = (room: Room, work: number) => room.faces.indexOf(work);

/** The show: each print's name lettered on its frame's top bar (the
 *  festival's in neon above it instead), the plaque under it, and the colour
 *  of the light it stands in, which bleeds onto the wall and the floor. The
 *  card's corner keeps the plain warm light. Colours in sRGB. */
export type Exhibit = { title: string; neon: boolean; plaque: { name: string; kind: string }; light: string };

export const EXHIBITS: Partial<Record<WorkId, Exhibit>> = {
  // a warm white: its green comes off the work itself (see glowsFor)
  zelda: { title: "ZELDA", neon: false, plaque: { name: "Zelda", kind: "Game Development" }, light: "#ffdcae" },
  // a warm white, like a restaurant counter
  kiosk: { title: "KIOSK", neon: false, plaque: { name: "Kiosk", kind: "Interactieve bestelzuil" }, light: "#ffd9a6" },
  // the stage's magenta
  festival: { title: "FESTIVAL", neon: true, plaque: { name: "Festival", kind: "Festival-app" }, light: "#ff86e6" },
};
