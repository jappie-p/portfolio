// Line-art security icons, drawn once into a 4x4 canvas atlas. Red channel is
// the crisp glyph, green a blurred copy the shaders use as a soft halo.

type Ctx = CanvasRenderingContext2D;

export const ICON = {
  shieldCheck: 0,
  lock: 1,
  firewall: 2,
  bugBlocked: 3,
  key: 4,
  fingerprint: 5,
  eye: 6,
  chip: 7,
  radar: 8,
  server: 9,
  globe: 10,
  gear: 11,
  check: 12,
  warning: 13,
  user: 14,
  hexNet: 15,
} as const;

/** Wall cells pick from the first twelve; the rest are HUD glyphs. */
export const WALL_ICON_COUNT = 12;

const TAU = Math.PI * 2;

function shieldPath(c: Ctx, k = 1) {
  c.beginPath();
  c.moveTo(0, -0.82 * k);
  c.quadraticCurveTo(0.36 * k, -0.6 * k, 0.66 * k, -0.62 * k);
  c.lineTo(0.66 * k, -0.06 * k);
  c.quadraticCurveTo(0.62 * k, 0.52 * k, 0, 0.84 * k);
  c.quadraticCurveTo(-0.62 * k, 0.52 * k, -0.66 * k, -0.06 * k);
  c.lineTo(-0.66 * k, -0.62 * k);
  c.quadraticCurveTo(-0.36 * k, -0.6 * k, 0, -0.82 * k);
  c.closePath();
}

function line(c: Ctx, pts: Array<[number, number]>) {
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.stroke();
}

function circle(c: Ctx, x: number, y: number, r: number, fill = false) {
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  if (fill) c.fill();
  else c.stroke();
}

/** Brick courses inside a double shield outline: the "firewall" mark. */
export function drawFirewall(c: Ctx) {
  shieldPath(c);
  c.stroke();
  shieldPath(c, 0.8);
  c.stroke();
  c.save();
  shieldPath(c, 0.8);
  c.clip();
  const courses = [-0.9, -0.36, -0.08, 0.2, 0.48, 0.9];
  for (let i = 1; i < courses.length - 1; i++) line(c, [[-0.8, courses[i]], [0.8, courses[i]]]);
  for (let i = 1; i < courses.length - 1; i++) {
    const off = i % 2 ? 0.2 : 0;
    for (let x = -0.6 + off; x < 0.8; x += 0.4) line(c, [[x, courses[i]], [x, courses[i + 1]]]);
  }
  c.restore();
}

const DRAW: Array<(c: Ctx) => void> = [
  // shieldCheck
  (c) => {
    shieldPath(c);
    c.stroke();
    line(c, [[-0.3, 0.02], [-0.06, 0.26], [0.34, -0.2]]);
  },
  // lock
  (c) => {
    c.beginPath();
    c.arc(0, -0.28, 0.36, Math.PI, 0);
    c.lineTo(0.36, -0.08);
    c.moveTo(-0.36, -0.08);
    c.lineTo(-0.36, -0.28);
    c.stroke();
    c.beginPath();
    c.roundRect(-0.58, -0.08, 1.16, 0.84, 0.12);
    c.stroke();
    circle(c, 0, 0.24, 0.1, true);
    line(c, [[0, 0.3], [0, 0.48]]);
  },
  drawFirewall,
  // bugBlocked
  (c) => {
    c.beginPath();
    c.ellipse(0, 0.1, 0.26, 0.36, 0, 0, TAU);
    c.stroke();
    circle(c, 0, -0.38, 0.14);
    for (const y of [-0.08, 0.12, 0.32]) {
      line(c, [[0.26, y], [0.5, y - 0.1]]);
      line(c, [[-0.26, y], [-0.5, y - 0.1]]);
    }
    circle(c, 0, 0, 0.84);
    line(c, [[-0.6, -0.6], [0.6, 0.6]]);
  },
  // key
  (c) => {
    circle(c, -0.42, 0, 0.28);
    line(c, [[-0.14, 0], [0.74, 0]]);
    line(c, [[0.46, 0], [0.46, 0.24]]);
    line(c, [[0.64, 0], [0.64, 0.3]]);
  },
  // fingerprint
  (c) => {
    [0.16, 0.32, 0.48, 0.64].forEach((r, i) => {
      c.beginPath();
      c.arc(0, 0.12, r, Math.PI * (1.08 + i * 0.02), Math.PI * (1.92 - i * 0.03));
      c.stroke();
    });
    line(c, [[0, 0.12], [0, 0.72]]);
    line(c, [[-0.32, 0.14], [-0.3, 0.6]]);
    line(c, [[0.32, 0.14], [0.28, 0.66]]);
  },
  // eye
  (c) => {
    c.beginPath();
    c.moveTo(-0.82, 0);
    c.quadraticCurveTo(0, -0.66, 0.82, 0);
    c.quadraticCurveTo(0, 0.66, -0.82, 0);
    c.stroke();
    circle(c, 0, 0, 0.24);
    circle(c, 0, 0, 0.08, true);
  },
  // chip
  (c) => {
    c.beginPath();
    c.roundRect(-0.46, -0.46, 0.92, 0.92, 0.08);
    c.stroke();
    c.strokeRect(-0.18, -0.18, 0.36, 0.36);
    for (const t of [-0.26, 0, 0.26]) {
      line(c, [[t, -0.46], [t, -0.72]]);
      line(c, [[t, 0.46], [t, 0.72]]);
      line(c, [[-0.46, t], [-0.72, t]]);
      line(c, [[0.46, t], [0.72, t]]);
    }
  },
  // radar
  (c) => {
    for (const r of [0.3, 0.62, 0.94]) {
      c.beginPath();
      c.arc(0, 0.5, r, -Math.PI * 0.78, -Math.PI * 0.22);
      c.stroke();
    }
    circle(c, 0, 0.5, 0.1, true);
  },
  // server
  (c) => {
    for (const y of [-0.66, -0.18, 0.3]) {
      c.beginPath();
      c.roundRect(-0.66, y, 1.32, 0.38, 0.06);
      c.stroke();
      circle(c, 0.42, y + 0.19, 0.05, true);
      line(c, [[-0.46, y + 0.19], [0.1, y + 0.19]]);
    }
  },
  // globe
  (c) => {
    circle(c, 0, 0, 0.74);
    c.beginPath();
    c.ellipse(0, 0, 0.3, 0.74, 0, 0, TAU);
    c.stroke();
    line(c, [[-0.74, 0], [0.74, 0]]);
    line(c, [[-0.62, -0.38], [0.62, -0.38]]);
    line(c, [[-0.62, 0.38], [0.62, 0.38]]);
  },
  // gear
  (c) => {
    for (let i = 0; i < 8; i++) {
      c.save();
      c.rotate((i * TAU) / 8);
      c.fillRect(-0.1, -0.78, 0.2, 0.26);
      c.restore();
    }
    circle(c, 0, 0, 0.55);
    circle(c, 0, 0, 0.2);
  },
  // check
  (c) => {
    circle(c, 0, 0, 0.78);
    line(c, [[-0.34, 0.02], [-0.08, 0.28], [0.38, -0.22]]);
  },
  // warning
  (c) => {
    c.beginPath();
    c.moveTo(0, -0.8);
    c.lineTo(0.84, 0.66);
    c.lineTo(-0.84, 0.66);
    c.closePath();
    c.stroke();
    line(c, [[0, -0.28], [0, 0.18]]);
    circle(c, 0, 0.42, 0.07, true);
  },
  // user
  (c) => {
    circle(c, 0, -0.34, 0.28);
    c.beginPath();
    c.arc(0, 0.78, 0.62, Math.PI, TAU);
    c.stroke();
  },
  // hexNet
  (c) => {
    c.beginPath();
    for (let i = 0; i <= 6; i++) {
      const a = Math.PI / 6 + (i * TAU) / 6;
      const x = Math.cos(a) * 0.78;
      const y = Math.sin(a) * 0.78;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();
    for (let i = 0; i < 3; i++) {
      const a = Math.PI / 6 + (i * 2 * TAU) / 6;
      line(c, [[0, 0], [Math.cos(a) * 0.78, Math.sin(a) * 0.78]]);
    }
    circle(c, 0, 0, 0.1, true);
  },
];

function paint(size: number, cells: number, draws: Array<(c: Ctx) => void>, blur: number) {
  const make = () => {
    const cv = document.createElement("canvas");
    cv.width = cv.height = size * cells;
    return cv;
  };
  const sharp = make();
  const soft = make();
  const scale = size * 0.39;
  for (const [target, filter] of [
    [sharp, "none"],
    [soft, `blur(${blur}px)`],
  ] as const) {
    const c = target.getContext("2d")!;
    c.fillStyle = "#000";
    c.fillRect(0, 0, target.width, target.height);
    c.filter = filter;
    draws.forEach((draw, i) => {
      c.save();
      c.translate((i % cells) * size + size / 2, Math.floor(i / cells) * size + size / 2);
      c.scale(scale, scale);
      c.lineWidth = 0.1;
      c.lineCap = "round";
      c.lineJoin = "round";
      c.strokeStyle = c.fillStyle = "#fff";
      draw(c);
      c.restore();
    });
  }
  // merge: R = crisp glyph, G = halo
  const out = make();
  const oc = out.getContext("2d")!;
  const a = sharp.getContext("2d")!.getImageData(0, 0, out.width, out.height);
  const b = soft.getContext("2d")!.getImageData(0, 0, out.width, out.height);
  for (let i = 0; i < a.data.length; i += 4) {
    a.data[i + 1] = b.data[i];
    a.data[i + 2] = 0;
    a.data[i + 3] = 255;
  }
  oc.putImageData(a, 0, 0);
  return out;
}

/** 4x4 atlas of 256px cells, index order as in ICON. */
export function drawIconAtlas(): HTMLCanvasElement {
  return paint(256, 4, DRAW, 10);
}

/** The big firewall mark for the core shield face. */
export function drawCoreMark(): HTMLCanvasElement {
  return paint(1024, 1, [drawFirewall], 26);
}
