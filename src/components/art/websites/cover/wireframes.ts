import { mulberry32 } from "../lib/rng";

/** Ink roles, resolved to colours when a window is drawn. */
export type Ink = "frame" | "line" | "text" | "strong" | "accent" | "violet" | "ok" | "panel";

/** Wireframe primitives in window space (0..W, 0..H, y down). */
export type Prim =
  | { k: "rect"; x: number; y: number; w: number; h: number; r: number; fill?: Ink; stroke?: Ink }
  | { k: "line"; pts: number[]; stroke: Ink }
  | { k: "dot"; x: number; y: number; r: number; fill?: Ink; stroke?: Ink }
  | { k: "image"; x: number; y: number; w: number; h: number; r: number };

export type Template = "landing" | "shop" | "dashboard" | "blog" | "gallery" | "mobile";

/** Something inside a window that moves: a caret, a loading bar, a hover. */
export type Live =
  | { k: "caret"; x: number; y: number; h: number }
  | { k: "progress"; x: number; y: number; w: number; h: number }
  | { k: "hover"; x: number; y: number; w: number; h: number; r: number; period: number };

export interface Wireframe {
  w: number;
  h: number;
  prims: Prim[];
  live: Live[];
}

const BAR = 9;

function textLines(out: Prim[], rnd: () => number, x: number, y: number, w: number, n: number, gap = 18, ink: Ink = "text") {
  for (let i = 0; i < n; i++) {
    const last = i === n - 1;
    out.push({ k: "rect", x, y: y + i * gap, w: w * (last ? 0.35 + rnd() * 0.3 : 0.82 + rnd() * 0.18), h: BAR, r: BAR / 2, fill: ink });
  }
}

/** Browser chrome: traffic lights and an address pill. */
function chrome(out: Prim[], w: number) {
  out.push({ k: "line", pts: [0, 34, w, 34], stroke: "line" });
  for (let i = 0; i < 3; i++) out.push({ k: "dot", x: 20 + i * 16, y: 17, r: 5, stroke: "line" });
  out.push({ k: "rect", x: w * 0.3, y: 9, w: w * 0.4, h: 16, r: 8, fill: "panel", stroke: "line" });
}

function nav(out: Prim[], rnd: () => number, w: number, y: number) {
  out.push({ k: "dot", x: 34, y: y + 12, r: 10, stroke: "strong" });
  out.push({ k: "rect", x: 52, y: y + 7, w: 60, h: BAR, r: 4.5, fill: "strong" });
  const items = 3 + Math.floor(rnd() * 2);
  for (let i = 0; i < items; i++) out.push({ k: "rect", x: w - 150 - (items - i) * 62, y: y + 8, w: 42, h: 7, r: 3.5, fill: "text" });
  out.push({ k: "rect", x: w - 118, y: y + 1, w: 90, h: 22, r: 11, fill: "accent" });
}

function landing(rnd: () => number): Wireframe {
  const w = 1000;
  const h = 640;
  const p: Prim[] = [];
  chrome(p, w);
  nav(p, rnd, w, 52);
  p.push({ k: "rect", x: 40, y: 150, w: 380, h: 26, r: 13, fill: "strong" });
  p.push({ k: "rect", x: 40, y: 188, w: 300, h: 26, r: 13, fill: "strong" });
  textLines(p, rnd, 40, 238, 360, 3);
  p.push({ k: "rect", x: 40, y: 312, w: 130, h: 34, r: 17, fill: "accent" });
  p.push({ k: "rect", x: 184, y: 312, w: 120, h: 34, r: 17, stroke: "line" });
  p.push({ k: "image", x: 500, y: 128, w: 460, h: 250, r: 14 });
  for (let i = 0; i < 3; i++) {
    const x = 40 + i * 310;
    p.push({ k: "rect", x, y: 420, w: 290, h: 180, r: 14, stroke: "line", fill: "panel" });
    p.push({ k: "dot", x: x + 34, y: 456, r: 14, stroke: "violet" });
    p.push({ k: "rect", x: x + 22, y: 490, w: 150, h: 11, r: 5.5, fill: "strong" });
    textLines(p, rnd, x + 22, 516, 240, 3, 17);
  }
  return { w, h, prims: p, live: [{ k: "hover", x: 40, y: 420, w: 290, h: 180, r: 14, period: 7 }] };
}

function shop(rnd: () => number): Wireframe {
  const w = 1000;
  const h = 660;
  const p: Prim[] = [];
  chrome(p, w);
  nav(p, rnd, w, 52);
  p.push({ k: "rect", x: 40, y: 104, w: 300, h: 30, r: 15, stroke: "line", fill: "panel" });
  for (let i = 0; i < 4; i++) p.push({ k: "rect", x: 380 + i * 92, y: 110, w: 80, h: 18, r: 9, stroke: "line" });
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const x = 40 + col * 236;
      const y = 160 + row * 245;
      p.push({ k: "image", x, y, w: 216, h: 150, r: 12 });
      p.push({ k: "rect", x, y: y + 164, w: 150, h: 10, r: 5, fill: "strong" });
      p.push({ k: "rect", x, y: y + 184, w: 100, h: 8, r: 4, fill: "text" });
      p.push({ k: "rect", x: x + 146, y: y + 180, w: 70, h: 20, r: 10, fill: rnd() < 0.5 ? "violet" : "accent" });
    }
  }
  return { w, h, prims: p, live: [{ k: "caret", x: 58, y: 112, h: 14 }] };
}

function dashboard(rnd: () => number): Wireframe {
  const w = 1000;
  const h = 620;
  const p: Prim[] = [];
  chrome(p, w);
  p.push({ k: "line", pts: [190, 34, 190, h], stroke: "line" });
  p.push({ k: "dot", x: 40, y: 66, r: 11, fill: "accent" });
  for (let i = 0; i < 6; i++) p.push({ k: "rect", x: 30, y: 108 + i * 34, w: 120 - rnd() * 30, h: 9, r: 4.5, fill: i === 1 ? "strong" : "text" });
  p.push({ k: "rect", x: 220, y: 56, w: 220, h: 14, r: 7, fill: "strong" });
  for (let i = 0; i < 4; i++) {
    const x = 220 + i * 190;
    p.push({ k: "rect", x, y: 92, w: 172, h: 90, r: 12, stroke: "line", fill: "panel" });
    p.push({ k: "rect", x: x + 18, y: 112, w: 70, h: 8, r: 4, fill: "text" });
    p.push({ k: "rect", x: x + 18, y: 134, w: 96, h: 20, r: 6, fill: "strong" });
    p.push({ k: "dot", x: x + 148, y: 118, r: 5, fill: i === 2 ? "violet" : "ok" });
  }
  p.push({ k: "rect", x: 220, y: 200, w: 480, h: 220, r: 12, stroke: "line", fill: "panel" });
  const pts: number[] = [];
  for (let i = 0; i <= 12; i++) pts.push(244 + i * 36, 380 - (40 + rnd() * 110 + i * 6));
  p.push({ k: "line", pts, stroke: "accent" });
  p.push({ k: "rect", x: 720, y: 200, w: 240, h: 220, r: 12, stroke: "line", fill: "panel" });
  p.push({ k: "dot", x: 840, y: 310, r: 62, stroke: "violet" });
  p.push({ k: "dot", x: 840, y: 310, r: 40, stroke: "line" });
  for (let i = 0; i < 4; i++) {
    const y = 444 + i * 40;
    p.push({ k: "line", pts: [220, y + 30, 960, y + 30], stroke: "line" });
    for (let c = 0; c < 4; c++) p.push({ k: "rect", x: 236 + c * 184, y: y + 8, w: 70 + rnd() * 60, h: 8, r: 4, fill: "text" });
  }
  return { w, h, prims: p, live: [{ k: "progress", x: 220, y: 72, w: 220, h: 4 }] };
}

function blog(rnd: () => number): Wireframe {
  const w = 760;
  const h = 700;
  const p: Prim[] = [];
  chrome(p, w);
  nav(p, rnd, w, 52);
  p.push({ k: "rect", x: 150, y: 120, w: 70, h: 8, r: 4, fill: "violet" });
  p.push({ k: "rect", x: 150, y: 142, w: 440, h: 24, r: 12, fill: "strong" });
  p.push({ k: "rect", x: 150, y: 176, w: 330, h: 24, r: 12, fill: "strong" });
  p.push({ k: "dot", x: 162, y: 228, r: 12, stroke: "line" });
  p.push({ k: "rect", x: 184, y: 224, w: 120, h: 8, r: 4, fill: "text" });
  p.push({ k: "image", x: 150, y: 260, w: 460, h: 200, r: 14 });
  textLines(p, rnd, 150, 486, 460, 6, 19);
  textLines(p, rnd, 150, 616, 460, 3, 19);
  return { w, h, prims: p, live: [] };
}

function gallery(rnd: () => number): Wireframe {
  const w = 900;
  const h = 620;
  const p: Prim[] = [];
  chrome(p, w);
  nav(p, rnd, w, 52);
  const cols = [40, 320, 600];
  for (const x of cols) {
    let y = 110;
    while (y < h - 60) {
      const hh = 110 + rnd() * 120;
      p.push({ k: "image", x, y, w: 260, h: Math.min(hh, h - 30 - y), r: 12 });
      y += hh + 16;
    }
  }
  return { w, h, prims: p, live: [] };
}

function mobile(rnd: () => number): Wireframe {
  const w = 360;
  const h = 720;
  const p: Prim[] = [];
  p.push({ k: "rect", x: 130, y: 14, w: 100, h: 18, r: 9, fill: "panel", stroke: "line" });
  p.push({ k: "dot", x: 34, y: 66, r: 12, stroke: "strong" });
  p.push({ k: "rect", x: 290, y: 60, w: 36, h: 12, r: 6, fill: "text" });
  p.push({ k: "rect", x: 24, y: 104, w: 250, h: 20, r: 10, fill: "strong" });
  p.push({ k: "rect", x: 24, y: 132, w: 190, h: 20, r: 10, fill: "strong" });
  textLines(p, rnd, 24, 172, 300, 3);
  p.push({ k: "rect", x: 24, y: 236, w: 312, h: 40, r: 20, fill: "accent" });
  p.push({ k: "image", x: 24, y: 300, w: 312, h: 200, r: 16 });
  textLines(p, rnd, 24, 524, 300, 4);
  p.push({ k: "line", pts: [0, 640, w, 640], stroke: "line" });
  for (let i = 0; i < 4; i++) p.push({ k: "dot", x: 54 + i * 84, y: 680, r: 10, stroke: i === 0 ? "accent" : "line" });
  return { w, h, prims: p, live: [{ k: "progress", x: 24, y: 284, w: 312, h: 3 }] };
}

const MAKERS: Record<Template, (rnd: () => number) => Wireframe> = { landing, shop, dashboard, blog, gallery, mobile };

export function wireframe(t: Template, seed: number): Wireframe {
  return MAKERS[t](mulberry32(seed));
}
