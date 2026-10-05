import { LIP, outerH, outerW, type Work } from "./layout";
import { project, type Pose } from "./path";
import { ease, inFront, resting, type Rig } from "./rig";

/** The HTML laid over the canvas: per work a button on its frame, a window in
 *  it on the picture (what the zoom grows from) and a label on the wall. */
export type OverlayDom = {
  works: (HTMLElement | null)[];
  pics: (HTMLElement | null)[];
  labels: (HTMLElement | null)[];
  /** the exhibition title and copy, which the walk leaves behind */
  heading: HTMLElement | null;
};

type Box = { x: number; y: number; w: number; h: number };

const corners = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
] as const;

/** The screen box around a rectangle on the wall, or null once it is behind the eye. */
function box(p: Pose, W: number, H: number, cx: number, cy: number, hw: number, hh: number, z: number, out: number[]): Box | null {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [sx, sy] of corners) {
    project(p, W, H, cx + sx * hw, cy + sy * hh, z, out);
    if (out[2] < 0.05) return null;
    x0 = Math.min(x0, out[0]);
    y0 = Math.min(y0, out[1]);
    x1 = Math.max(x1, out[0]);
    y1 = Math.max(y1, out[1]);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

const kept = new WeakMap<object, Map<PropertyKey, (el: HTMLElement | null) => void>>();
/** A stable ref callback that keeps an element at `key` of `into`. */
export function keep<T extends object>(into: T, key: keyof T & PropertyKey) {
  let refs = kept.get(into);
  if (!refs) kept.set(into, (refs = new Map()));
  let ref = refs.get(key);
  if (!ref) refs.set(key, (ref = (el) => ((into as Record<PropertyKey, unknown>)[key] = el)));
  return ref;
}

const last = new WeakMap<HTMLElement, string>();
/** Write a style only when it changed: no work for a frame that stood still. */
function write(el: HTMLElement, css: string) {
  if (last.get(el) === css) return;
  last.set(el, css);
  el.style.cssText = css;
}

function flag(el: HTMLElement, name: string, on: boolean) {
  if (el.hasAttribute(name) !== on) el.toggleAttribute(name, on);
}

const px = (v: number) => `${v.toFixed(1)}px`;
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

/** Kept inside the view, so focusing a work that is off to the side never
 *  makes the browser scroll the track to it (the walk brings it in instead). */
function inside(b: Box, W: number, H: number): Box {
  const x0 = Math.min(Math.max(b.x, 0), W - 2);
  const y0 = Math.min(Math.max(b.y, 0), H - 2);
  const x1 = Math.max(Math.min(b.x + b.w, W), x0 + 2);
  const y1 = Math.max(Math.min(b.y + b.h, H), y0 + 2);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Where a work's label hangs: beside the frame's lower edge on a wide wall,
 *  under it in the narrow room. */
function labelAt(w: Work, narrow: boolean): [number, number, number] {
  return narrow ? [w.x - outerW(w) / 2, w.y - outerH(w) / 2 - 0.1, 0] : [w.x + outerW(w) / 2 + 0.16, w.y - outerH(w) / 2, 0];
}

/** Lay the HTML over this frame of the scene. */
export function placeOverlay(dom: OverlayDom, rig: Rig, p: Pose, W: number, H: number) {
  const room = rig.room;
  const out = [0, 0, 0];
  const here = room.faces[Math.round(rig.pos)] ?? -1;
  const still = resting(rig) && rig.dolly.t < 0.01;
  room.works.forEach((w, i) => {
    const el = dom.works[i];
    const pic = dom.pics[i];
    const label = dom.labels[i];
    const seen = box(p, W, H, w.x, w.y, outerW(w) / 2, outerH(w) / 2, w.depth, out);
    const frame = seen && inside(seen, W, H);
    // a work all but off the view keeps its focus, not a sliver to tap
    const reach = frame && frame.w > 24 ? "" : ";pointer-events:none";
    if (el) {
      // never smaller than a 24px target, centred on the work
      const bw = frame ? Math.max(frame.w, 24) : 0;
      const bh = frame ? Math.max(frame.h, 24) : 0;
      write(el, frame ? `transform:translate3d(${px(frame.x - (bw - frame.w) / 2)},${px(frame.y - (bh - frame.h) / 2)},0);width:${px(bw)};height:${px(bh)}${reach}` : "display:none");
      // stepping up to it, the frame outgrows the view: no ring round the screen's edge
      flag(el, "data-close", rig.dolly.t > 0.02);
    }
    const close = inFront(rig, i);
    if (pic && frame) {
      const b = box(p, W, H, w.x, w.y, w.w / 2, w.h / 2, w.depth - LIP, out);
      // right up to a print the lights go down around it, until only the
      // picture is left to open into its project
      const dim = w.id === "berlijn" ? 0 : smooth(0.55, 0.97, close) * 0.94;
      const shade = dim > 0.002 ? `;box-shadow:0 0 0 200vmax rgba(3,5,8,${dim.toFixed(3)})` : "";
      if (b) write(pic, `left:${px(b.x - frame.x)};top:${px(b.y - frame.y)};width:${px(b.w)};height:${px(b.h)}${shade}`);
    }
    if (label) {
      const [lx, ly, lz] = labelAt(w, room.narrow);
      project(p, W, H, lx, ly, lz, out);
      // in the narrow room the label starts under the frame and keeps inside the view
      const x = room.narrow ? Math.max(out[0], 16) : out[0];
      write(label, `transform:translate3d(${px(x)},${px(out[1])},0);--room:${px(W - x - 16)}`);
      const near = rig.hover === i || rig.focus === i;
      // and its label steps aside once the picture is about to open
      flag(label, "data-on", (near || (still && here === i) || close > 0.5) && close < 0.82);
      flag(label, "data-hover", near);
    }
  });
  const h = dom.heading;
  if (h) {
    // on a wide wall the title stays at the entrance as you walk on
    const away = room.narrow ? 0 : Math.min(Math.max(rig.pos, 0), 1);
    // and it keeps out of the way while you glide from one project to the next
    const fade = rig.glide.on ? 0 : (1 - ease(Math.min(away / 0.6, 1))) * (1 - ease(rig.dolly.t));
    write(h, `opacity:${fade.toFixed(3)};transform:translate3d(${px(-away * 0.14 * W)},0,0)`);
    flag(h, "data-away", fade < 0.5);
  }
}
