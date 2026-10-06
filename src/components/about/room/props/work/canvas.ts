import * as THREE from "three";
import { seeded } from "../../textures";

const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = '"Helvetica Neue", Arial, sans-serif';
const MONO = 'Menlo, "SFMono-Regular", Consolas, monospace';

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, g: c.getContext("2d")! };
}

function tex(c: HTMLCanvasElement, srgb = true, repeat = false) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** A code editor at night: a file tree, line numbers, my kind of TypeScript
 *  in a dark theme with the site's green. */
export function codeScreen() {
  const W = 1024;
  const H = 640;
  const { c, g } = canvas(W, H);
  g.fillStyle = "#0f1513";
  g.fillRect(0, 0, W, H);
  // title bar and file tree
  g.fillStyle = "#151d1a";
  g.fillRect(0, 0, W, 34);
  g.fillStyle = "#121a17";
  g.fillRect(0, 34, 210, H);
  ["#ff5f57", "#febc2e", "#28c840"].forEach((col, i) => {
    g.fillStyle = col;
    g.beginPath();
    g.arc(20 + i * 20, 17, 6, 0, Math.PI * 2);
    g.fill();
  });
  g.font = `15px ${MONO}`;
  const tree = ["▾ portfolio-v2", "  ▾ src", "    ▾ components", "      ▸ about", "      ▸ school", "      room.ts", "    ▸ lib", "  package.json", "  README.md"];
  tree.forEach((line, i) => {
    g.fillStyle = i === 5 ? "#4ade80" : "#7d8c85";
    g.fillText(line, 14, 64 + i * 24);
  });
  // the code itself
  const rand = seeded(42);
  const KEY = "#c792ea";
  const FN = "#82aaff";
  const STR = "#4ade80";
  const TXT = "#d7e0dc";
  const DIM = "#5b6a64";
  const lines: [string, string][][] = [
    [["import", KEY], [" { makeRoom } ", TXT], ["from", KEY], [' "./pieces"', STR]],
    [["import", KEY], [" * as THREE ", TXT], ["from", KEY], [' "three"', STR]],
    [],
    [["/** My room, one piece at a time. */", DIM]],
    [["export function", KEY], [" build", FN], ["(world: World) {", TXT]],
    [["  const", KEY], [" room = ", TXT], ["makeRoom", FN], ["(world.size);", TXT]],
    [["  for", KEY], [" (const piece ", TXT], ["of", KEY], [" world.pieces) {", TXT]],
    [["    room.", TXT], ["add", FN], ["(piece.model);", TXT]],
    [["    piece.", TXT], ["onOpen", FN], ["(() => ", TXT], ["tell", FN], ["(piece.story));", TXT]],
    [["  }", TXT]],
    [["  return", KEY], [" room.", TXT], ["light", FN], ["({ warmth: ", TXT], ["0.8", "#f78c6c"], [" });", TXT]],
    [["}", TXT]],
    [],
    [["export const", KEY], [" ship ", TXT], ["= async", KEY], [" () => {", TXT]],
    [["  await", KEY], [" ", TXT], ["test", FN], ["();", TXT]],
    [["  await", KEY], [" ", TXT], ["deploy", FN], ["(", TXT], ['"jasper.hyphosting.com"', STR], [");", TXT]],
    [["};", TXT]],
    [],
    [["// ✓ 127 tests passed", STR]],
  ];
  g.font = `17px ${MONO}`;
  lines.forEach((parts, i) => {
    const y = 66 + i * 28;
    g.fillStyle = "#3c4a44";
    g.fillText(String(i + 1).padStart(2, " "), 226, y);
    let x = 262;
    for (const [text, col] of parts) {
      g.fillStyle = col;
      g.fillText(text, x, y);
      x += g.measureText(text).width;
    }
    if (i === 8) {
      // the caret, mid-thought
      g.fillStyle = "#4ade80";
      g.fillRect(x + 2, y - 15, 2, 19);
    }
  });
  // a terminal at the foot
  g.fillStyle = "#0b100e";
  g.fillRect(210, 548, W - 210, H - 548);
  g.font = `14px ${MONO}`;
  g.fillStyle = "#4ade80";
  g.fillText("➜  npm run dev", 226, 576);
  g.fillStyle = "#7d8c85";
  g.fillText(`▲ Next.js 16 · ready in ${Math.round(200 + rand() * 200)}ms`, 226, 600);
  return tex(c);
}

/** Cork: warm tan granules, flecked lighter and darker. */
export function cork() {
  const S = 512;
  const { c, g } = canvas(S, S);
  g.fillStyle = "#b98a58";
  g.fillRect(0, 0, S, S);
  const rand = seeded(9);
  for (let i = 0; i < 9000; i++) {
    const t = rand();
    const k = t < 0.5 ? -30 - rand() * 40 : 20 + rand() * 30;
    g.fillStyle = `rgba(${185 + k},${138 + k * 0.85},${88 + k * 0.6},${0.35 + rand() * 0.45})`;
    const r = 0.8 + rand() * 2.6;
    g.beginPath();
    g.ellipse(rand() * S, rand() * S, r, r * (0.5 + rand() * 0.6), rand() * 3, 0, Math.PI * 2);
    g.fill();
  }
  return tex(c, true, true);
}

/** Words lettered on a strip, ink on clear: the board's heading, a card. */
export function lettering(text: string, w: number, h: number, opts: { font: string; color: string; spacing?: number; paper?: string; rule?: boolean }) {
  const { c, g } = canvas(w, h);
  if (opts.paper) {
    g.fillStyle = opts.paper;
    g.fillRect(0, 0, w, h);
  }
  g.font = opts.font;
  g.fillStyle = opts.color;
  g.textAlign = "center";
  g.textBaseline = "middle";
  const spacing = opts.spacing ?? 0;
  if (spacing) {
    // letter-spaced by hand, so every browser spaces it alike
    const widths = [...text].map((ch) => g.measureText(ch).width);
    const total = widths.reduce((s, x) => s + x, 0) + spacing * (text.length - 1);
    let x = (w - total) / 2;
    g.textAlign = "left";
    [...text].forEach((ch, i) => {
      g.fillText(ch, x, h / 2);
      x += widths[i] + spacing;
    });
  } else g.fillText(text, w / 2, h / 2);
  if (opts.rule) {
    g.fillRect(w * 0.18, h * 0.86, w * 0.64, Math.max(2, h * 0.025));
  }
  return tex(c);
}

export const fonts = { SERIF, SANS, MONO };

/** The chair's mesh back: a fine weave, see-through between the threads. */
export function weave() {
  const S = 128;
  const { c, g } = canvas(S, S);
  g.fillStyle = "#000";
  g.fillRect(0, 0, S, S);
  g.strokeStyle = "#fff";
  g.lineWidth = 3.2;
  for (let i = 0; i <= S; i += 8) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i, S);
    g.stroke();
    g.beginPath();
    g.moveTo(0, i);
    g.lineTo(S, i);
    g.stroke();
  }
  return tex(c, false, true);
}

/** A server's face: a honeycomb of vents, drive bays, a model plate. */
export function serverFace(kind: "vents" | "drives" | "switch") {
  const W = 512;
  const H = 64;
  const { c, g } = canvas(W, H);
  g.fillStyle = "#26282b";
  g.fillRect(0, 0, W, H);
  if (kind === "vents") {
    g.fillStyle = "#0c0d0e";
    for (let x = 140; x < W - 30; x += 9)
      for (let y = 10; y < H - 8; y += 8) {
        g.beginPath();
        g.arc(x + ((y / 8) % 2) * 4.5, y, 2.6, 0, Math.PI * 2);
        g.fill();
      }
    g.fillStyle = "#3a3d41";
    g.fillRect(16, 18, 96, 28);
  } else if (kind === "drives") {
    for (let i = 0; i < 8; i++) {
      const x = 24 + i * 58;
      g.fillStyle = "#1a1b1d";
      g.fillRect(x, 8, 52, 48);
      g.fillStyle = "#3b3e42";
      g.fillRect(x + 4, 12, 44, 10);
      g.fillStyle = "#101112";
      for (let k = 0; k < 4; k++) g.fillRect(x + 6, 28 + k * 6, 40, 2);
    }
  } else {
    // 24 ports in two rows, the uplinks at the end
    for (let i = 0; i < 12; i++)
      for (let r = 0; r < 2; r++) {
        const x = 40 + i * 30;
        const y = 10 + r * 26;
        g.fillStyle = "#0b0c0d";
        g.fillRect(x, y, 22, 18);
        g.fillStyle = "#5a5e63";
        g.fillRect(x + 6, y + 14, 10, 3);
      }
    g.fillStyle = "#0b0c0d";
    g.fillRect(420, 14, 30, 36);
    g.fillRect(458, 14, 30, 36);
  }
  return tex(c);
}

/** The JP mark on a plate of the brand's green. */
export function jpPlate() {
  const W = 256;
  const H = 128;
  const { c, g } = canvas(W, H);
  g.fillStyle = "#1f4a32";
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#f2ecdf";
  g.font = `bold 78px ${SERIF}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("JP", W / 2 - 6, H / 2 + 4);
  g.beginPath();
  g.arc(W / 2 + 46, H / 2 + 26, 7, 0, Math.PI * 2);
  g.fillStyle = "#4ade80";
  g.fill();
  return tex(c);
}

/** A medal's relief as a height map: a raised rim and its emblem (on a
 *  grey ground, the same drawing tints the metal: raised parts catch more
 *  light than the field, cut lines less). */
export function emblem(kind: "screen" | "mountain" | "leaf", ground = "#000") {
  const S = 256;
  const { c, g } = canvas(S, S);
  g.fillStyle = ground;
  g.fillRect(0, 0, S, S);
  const C = S / 2;
  // the rim, and a beaded ring inside it
  g.strokeStyle = "#fff";
  g.lineWidth = 16;
  g.beginPath();
  g.arc(C, C, S * 0.44, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = "#bbb";
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    g.beginPath();
    g.arc(C + Math.cos(a) * S * 0.36, C + Math.sin(a) * S * 0.36, 3, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = "#fff";
  g.strokeStyle = "#fff";
  g.lineJoin = "round";
  g.lineCap = "round";
  const cut = ground === "#000" ? "#000" : "#3a3a3a";
  if (kind === "screen") {
    // a presentation screen on its stand, a rising chart cut into it
    g.fillRect(C - 56, C - 48, 112, 70);
    g.fillRect(C - 4, C + 22, 8, 26);
    g.fillRect(C - 30, C + 46, 60, 8);
    g.strokeStyle = cut;
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(C - 38, C + 8);
    g.lineTo(C - 12, C - 14);
    g.lineTo(C + 6, C - 2);
    g.lineTo(C + 38, C - 32);
    g.stroke();
  } else if (kind === "mountain") {
    // a high peak behind a lower one, snow and ridges cut into the high
    // one, a sun over the left, the ground beneath
    g.beginPath();
    g.arc(C - 44, C - 42, 13, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(C - 58, C + 42);
    g.lineTo(C + 10, C - 54);
    g.lineTo(C + 74, C + 42);
    g.closePath();
    g.fill();
    g.strokeStyle = cut;
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(C - 14, C - 10);
    g.lineTo(C - 2, C - 20);
    g.lineTo(C + 8, C - 8);
    g.lineTo(C + 20, C - 20);
    g.lineTo(C + 32, C - 10);
    g.moveTo(C + 10, C - 54);
    g.lineTo(C + 22, C + 36);
    g.stroke();
    g.fillStyle = "#fff";
    g.beginPath();
    g.moveTo(C - 78, C + 42);
    g.lineTo(C - 36, C - 8);
    g.lineTo(C + 6, C + 42);
    g.closePath();
    g.fill();
    g.strokeStyle = cut;
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(C - 36, C - 8);
    g.lineTo(C - 30, C + 38);
    g.stroke();
    g.fillRect(C - 80, C + 48, 160, 7);
  } else {
    // a leaf, its midrib and veins cut in
    g.beginPath();
    g.moveTo(C - 50, C + 50);
    g.bezierCurveTo(C - 60, C - 30, C + 10, C - 70, C + 56, C - 56);
    g.bezierCurveTo(C + 62, C - 4, C + 20, C + 56, C - 50, C + 50);
    g.fill();
    g.strokeStyle = cut;
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(C - 50, C + 50);
    g.quadraticCurveTo(C + 4, C - 4, C + 50, C - 50);
    g.stroke();
    g.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
      const t = 0.25 + i * 0.17;
      const x = C - 50 + 100 * t;
      const y = C + 50 - 100 * t;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - 18, y - 22);
      g.moveTo(x, y);
      g.lineTo(x + 22, y + 14);
      g.stroke();
    }
  }
  return tex(c, false);
}
