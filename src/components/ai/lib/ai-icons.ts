import * as THREE from "three";

// Line icons for the packets and panels, drawn once into a 4x2 atlas (white
// on transparent; the materials tint them). Drawn at runtime: no downloads.

export const ICON = { mail: 0, app: 1, agenda: 2, claude: 3, push: 4, hours: 5, crm: 6, team: 7 } as const;
export type IconName = keyof typeof ICON;

const CELL = 128;
export const ATLAS_COLS = 4;
export const ATLAS_ROWS = 2;

type Pen = CanvasRenderingContext2D;

const draw: Record<IconName, (g: Pen) => void> = {
  mail(g) {
    g.strokeRect(22, 34, 84, 60);
    g.beginPath();
    g.moveTo(22, 36);
    g.lineTo(64, 70);
    g.lineTo(106, 36);
    g.stroke();
  },
  app(g) {
    g.beginPath();
    g.roundRect(40, 18, 48, 92, 10);
    g.stroke();
    g.beginPath();
    g.moveTo(56, 98);
    g.lineTo(72, 98);
    g.stroke();
  },
  agenda(g) {
    g.beginPath();
    g.roundRect(22, 28, 84, 76, 8);
    g.stroke();
    g.beginPath();
    g.moveTo(22, 50);
    g.lineTo(106, 50);
    g.moveTo(44, 18);
    g.lineTo(44, 36);
    g.moveTo(84, 18);
    g.lineTo(84, 36);
    g.stroke();
    for (const [x, y] of [
      [42, 66],
      [64, 66],
      [86, 66],
      [42, 86],
      [64, 86],
    ])
      g.fillRect(x - 5, y - 5, 10, 10);
  },
  claude(g) {
    // a four-point spark with a small companion
    const star = (cx: number, cy: number, r: number) => {
      g.beginPath();
      g.moveTo(cx, cy - r);
      g.quadraticCurveTo(cx, cy, cx + r, cy);
      g.quadraticCurveTo(cx, cy, cx, cy + r);
      g.quadraticCurveTo(cx, cy, cx - r, cy);
      g.quadraticCurveTo(cx, cy, cx, cy - r);
      g.fill();
    };
    star(58, 66, 40);
    star(98, 30, 14);
  },
  push(g) {
    g.beginPath();
    g.moveTo(34, 88);
    g.lineTo(94, 88);
    g.moveTo(40, 88);
    g.bezierCurveTo(44, 78, 40, 36, 64, 34);
    g.bezierCurveTo(88, 36, 84, 78, 88, 88);
    g.stroke();
    g.beginPath();
    g.arc(64, 98, 8, 0, Math.PI);
    g.stroke();
    g.beginPath();
    g.arc(96, 34, 9, 0, Math.PI * 2);
    g.fill();
  },
  hours(g) {
    g.beginPath();
    g.arc(64, 64, 42, 0, Math.PI * 2);
    g.moveTo(64, 36);
    g.lineTo(64, 64);
    g.lineTo(84, 76);
    g.stroke();
  },
  crm(g) {
    g.beginPath();
    g.ellipse(64, 34, 36, 12, 0, 0, Math.PI * 2);
    g.moveTo(28, 34);
    g.lineTo(28, 94);
    g.ellipse(64, 94, 36, 12, 0, Math.PI, 0, true);
    g.lineTo(100, 34);
    g.moveTo(28, 64);
    g.ellipse(64, 64, 36, 12, 0, Math.PI, 0, true);
    g.stroke();
  },
  team(g) {
    const person = (cx: number, cy: number, s: number) => {
      g.beginPath();
      g.arc(cx, cy - 16 * s, 12 * s, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.arc(cx, cy + 26 * s, 24 * s, Math.PI * 1.08, Math.PI * 1.92);
      g.stroke();
    };
    person(46, 60, 1);
    person(86, 64, 0.8);
  },
};

/** The atlas texture, plus the UV rect of each icon for sprites. */
export function iconAtlas(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = CELL * ATLAS_COLS;
  c.height = CELL * ATLAS_ROWS;
  const g = c.getContext("2d")!;
  g.strokeStyle = "#fff";
  g.fillStyle = "#fff";
  g.lineWidth = 7;
  g.lineCap = "round";
  g.lineJoin = "round";
  (Object.keys(ICON) as IconName[]).forEach((name) => {
    const i = ICON[name];
    g.save();
    g.translate((i % ATLAS_COLS) * CELL, Math.floor(i / ATLAS_COLS) * CELL);
    draw[name](g);
    g.restore();
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

/** Offset and repeat of an icon in the atlas (flipY is on, so row 0 is on top). */
export function iconUv(name: IconName): { offset: [number, number]; repeat: [number, number] } {
  const i = ICON[name];
  const col = i % ATLAS_COLS;
  const row = Math.floor(i / ATLAS_COLS);
  return { offset: [col / ATLAS_COLS, 1 - (row + 1) / ATLAS_ROWS], repeat: [1 / ATLAS_COLS, 1 / ATLAS_ROWS] };
}
