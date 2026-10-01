import type { PanelAnchors } from "../lib/anchors";

/** A geode wall in a corner, all in screen px (y down) plus depth. */
export interface WallPlan {
  /** the corner the lip curves round (may lie off the canvas) */
  cx: number;
  cy: number;
  /** depth of the wall's cut face, toward the camera */
  z: number;
  /** lip radius */
  r: number;
  /** the arc of lip that shows, radians on the wall (y up, 0 = right) */
  from: number;
  to: number;
  seed: number;
  /** crystal groups along the arc, and the main point's length at f (0..1) */
  groups: number;
  size: (f: number) => number;
  /** share of rose quartz among the points */
  rose: number;
  druzy: number;
  /** turn the cut face toward the panel (radians about x and y) */
  tilt: [number, number];
  sway: number;
  period: number;
  phase: number;
}

export interface FloaterPlan {
  kind: "labradorite" | "rose" | "amethyst";
  x: number;
  y: number;
  z: number;
  /** slab radius, or point length */
  size: number;
  spin: [number, number, number];
  seed: number;
}

export interface GlowPlan {
  x: number;
  y: number;
  r: number;
  color: string;
  a: number;
}

export interface LouisaPlan {
  walls: WallPlan[];
  floaters: FloaterPlan[];
  glows: GlowPlan[];
  /** the short side: material thickness and sizes follow it */
  u: number;
}

const PI = Math.PI;
/** Bigger toward the ends of an arc (off the frame), smaller in between. */
const ends = (lo: number, hi: number) => (f: number) => lo + (hi - lo) * Math.abs(f - 0.5) * 2;

/** Where the lip's middle is, for the light that spills off it. */
function spill(wall: WallPlan): GlowPlan {
  const a = (wall.from + wall.to) / 2;
  return { x: wall.cx + Math.cos(a) * wall.r * 1.15, y: wall.cy - Math.sin(a) * wall.r * 1.15, r: wall.r * 1.9, color: "#dcc4ff", a: 0.4 };
}

/**
 * Inside a geode: walls in two corners with crystals growing out of their
 * lips into the panel, labradorite and loose points drifting in the margins.
 * Wide screens keep the frame (left) and copy (right) clear; tall ones put
 * the walls in the free corners beside the frame and below the buttons,
 * using the measured panel when there is one.
 */
export function louisaPlan(w: number, h: number, a: PanelAnchors | null): LouisaPlan {
  const u = Math.min(w, h);
  if (w / h > 0.9) {
    const bl: WallPlan = {
      cx: 0,
      cy: h,
      z: -u * 0.06,
      r: u * 0.3,
      from: -0.04 * PI,
      to: 0.54 * PI,
      seed: 3,
      groups: 9,
      size: ends(u * 0.13, u * 0.3),
      rose: 0,
      druzy: 130,
      tilt: [-0.32, 0.3],
      sway: 0.05,
      period: 26,
      phase: 0,
    };
    const tr: WallPlan = {
      cx: w,
      cy: 0,
      z: -u * 0.06,
      r: u * 0.24,
      from: 0.96 * PI,
      to: 1.54 * PI,
      seed: 8,
      groups: 7,
      size: ends(u * 0.14, u * 0.12),
      rose: 0.45,
      druzy: 100,
      tilt: [0.3, -0.3],
      sway: 0.05,
      period: 21,
      phase: 1.7,
    };
    const margin = a ? a.frame.x / 2 : w * 0.055;
    const belowCopy = a ? a.copyBottom + (h - a.copyBottom) * 0.6 : h * 0.9;
    const copyX = a ? a.copy.x + a.copy.w * 0.2 : w * 0.64;
    const aboveFrame = a ? (60 + a.frame.y) / 2 : h * 0.17;
    return {
      u,
      walls: [bl, tr],
      floaters: [
        { kind: "labradorite", x: margin, y: h * 0.38, z: u * 0.05, size: Math.min(u * 0.05, margin * 0.55), spin: [0.05, 0.11, 0.02], seed: 21 },
        { kind: "labradorite", x: copyX, y: belowCopy, z: u * 0.04, size: u * 0.055, spin: [0.04, -0.09, 0.02], seed: 23 },
        { kind: "labradorite", x: w * 0.47, y: aboveFrame, z: -u * 0.25, size: u * 0.03, spin: [-0.07, 0.08, 0.03], seed: 22 },
        { kind: "rose", x: w * 0.955, y: h * 0.56, z: u * 0.05, size: u * 0.09, spin: [0.03, 0.14, 0.01], seed: 31 },
        { kind: "amethyst", x: w * 0.36, y: aboveFrame, z: -u * 0.08, size: u * 0.07, spin: [0.06, -0.12, 0.02], seed: 32 },
      ],
      glows: [
        { x: w * 0.33, y: h * 0.52, r: Math.max(w, h) * 0.55, color: "#8b5cf6", a: 0.15 },
        { x: w * 0.84, y: h * 0.16, r: Math.max(w, h) * 0.34, color: "#f472b6", a: 0.1 },
        { x: w * 0.64, y: h * 0.98, r: Math.max(w, h) * 0.3, color: "#2dd4bf", a: 0.06 },
        spill(bl),
        spill(tr),
      ],
    };
  }

  // phones and upright tablets: frame on top, copy below and to the left
  const roomy = w >= 600;
  const free = !roomy && a ? Math.hypot(Math.max(0, w - a.actionsRight), Math.max(0, h - a.copyBottom)) : Infinity;
  const br: WallPlan = {
    cx: w,
    cy: h,
    z: -u * 0.06,
    r: Math.min(u * (roomy ? 0.34 : 0.26), free * 0.55),
    from: 0.46 * PI,
    to: 1.04 * PI,
    seed: 3,
    groups: roomy ? 8 : 6,
    size: roomy ? ends(u * 0.2, u * 0.28) : ends(Math.min(u * 0.13, free * 0.3), Math.min(u * 0.2, free * 0.62)),
    rose: 0,
    druzy: roomy ? 110 : 70,
    tilt: [-0.3, -0.3],
    sway: 0.05,
    period: 26,
    phase: 1.2,
  };
  const tl: WallPlan = {
    cx: 0,
    cy: 0,
    z: -u * 0.06,
    r: u * 0.3,
    from: -0.54 * PI,
    to: 0.04 * PI,
    seed: 8,
    groups: 6,
    size: ends(u * 0.17, u * 0.12),
    rose: 0.45,
    druzy: 70,
    tilt: [0.3, 0.3],
    sway: 0.05,
    period: 21,
    phase: 0,
  };
  const gap = a ? (a.stageBottom + a.copyTop) / 2 : h * 0.45;
  return {
    u,
    walls: [tl, br],
    floaters: [
      { kind: "labradorite", x: w * 0.9, y: gap, z: u * 0.04, size: u * 0.055, spin: [0.05, 0.11, 0.02], seed: 21 },
      { kind: "rose", x: w * 0.08, y: gap, z: u * 0.05, size: u * 0.11, spin: [0.03, 0.14, 0.01], seed: 31 },
    ],
    glows: [
      { x: w * 0.5, y: a ? a.frameBottom * 0.6 : h * 0.28, r: Math.max(w, h) * 0.5, color: "#7c3aed", a: 0.2 },
      { x: w * 0.9, y: h * 0.9, r: u * 0.6, color: "#f472b6", a: 0.08 },
      spill(tl),
      spill(br),
    ],
  };
}
