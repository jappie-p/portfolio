import * as THREE from "three";
import { ITEMS, eanModules, euro, type ReceiptLabels } from "@/components/art/kiosk/receipt";

/** The paper strip as the kiosk prints it: two orders after the one in the
 *  picture (#0427), one after the other, so the strip repeats as it feeds.
 *  Its words are the reader's; the menu and the prices (the Dutch way)
 *  stay the kiosk's own, as on KioskReceipt. */
const W = 256;
const ORDER_H = 448;
const PAPER = "#f4f0e6";
const INK = "rgba(33, 30, 27, 0.9)";
const MONO = 'ui-monospace, "SFMono-Regular", Menlo, monospace';
const ORDERS = [
  { no: "0428", time: "12:43", items: [0, 1, 2] },
  { no: "0429", time: "12:46", items: [0, 2] },
] as const;

/** The strip's width over one repeat of its print. */
export const PAPER_ASPECT = W / (ORDER_H * ORDERS.length);

/** A real EAN-13 for an order (871 is the Dutch prefix), as the kiosk prints. */
function ean(order: string) {
  const base = `871234${order.padStart(6, "0")}`;
  const sum = [...base].reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0);
  return base + ((10 - (sum % 10)) % 10);
}

/** Text set a little open, centred on x. */
function tracked(g: CanvasRenderingContext2D, text: string, x: number, y: number, track: number) {
  const widths = [...text].map((c) => g.measureText(c).width);
  let at = x - (widths.reduce((s, w) => s + w, 0) + track * (text.length - 1)) / 2;
  [...text].forEach((c, i) => {
    g.fillText(c, at, y);
    at += widths[i] + track;
  });
}

/** Happy Herbivore's triceratops, in the 64 by 40 box KioskReceipt's Dino draws in. */
function dino(g: CanvasRenderingContext2D, x: number, y: number, k: number) {
  g.save();
  g.translate(x, y);
  g.scale(k, k);
  g.fillStyle = INK;
  const dot = (cx: number, cy: number, r: number) => {
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
  };
  dot(41, 16, 10);
  for (const a of [200, 235, 270, 305, 340]) dot(41 + Math.cos((a * Math.PI) / 180) * 10, 16 + Math.sin((a * Math.PI) / 180) * 10, 2.6);
  g.fill(new Path2D("M14 21 Q6 22 1 28 Q9 29 15 28 Z"));
  g.beginPath();
  g.ellipse(28, 24, 15.5, 9.5, 0, 0, Math.PI * 2);
  g.ellipse(49, 20, 9.5, 8, 0, 0, Math.PI * 2);
  g.fill();
  for (const [lx, ly, h] of [
    [16, 28, 9],
    [24, 30, 8],
    [33, 30, 8],
    [40, 28, 9],
  ])
    g.fillRect(lx, ly, 5.5, h);
  g.fill(new Path2D("M54 16 L63 21.5 L54 26 Z M46.5 13.5 L60 3 L51 15 Z M42 14 L50 5 L45.5 15.5 Z M56.5 16.5 L59 11 L60 18 Z"));
  // the eye, the smile and a few spots left as bare paper
  g.fillStyle = PAPER;
  dot(51.5, 18, 1.7);
  g.fill(new Path2D("M52 23.2 Q55.5 25.4 58.6 22.6 L58.9 23.6 Q55.4 26.8 51.7 24.2 Z"));
  dot(25, 18.5, 1.3);
  dot(31, 17, 1.1);
  dot(21, 22, 1);
  g.restore();
}

function rule(g: CanvasRenderingContext2D, y: number) {
  for (let x = 16; x < W - 16; x += 6.6) g.fillRect(x, y, 3.8, 1.2);
}

function row(g: CanvasRenderingContext2D, left: string, right: string, y: number) {
  g.textAlign = "left";
  g.fillText(left, 16, y);
  g.textAlign = "right";
  g.fillText(right, W - 16, y);
  g.textAlign = "left";
}

function order(g: CanvasRenderingContext2D, top: number, o: (typeof ORDERS)[number], words: ReceiptLabels) {
  g.fillStyle = INK;
  // between two orders, the perforation the cutter follows
  for (let x = 4; x < W; x += 9) g.fillRect(x, top + 2, 4, 1);
  dino(g, W / 2 - 30, top + 20, 60 / 64);
  g.fillStyle = INK;
  g.textBaseline = "alphabetic";
  g.font = `700 17px ${MONO}`;
  tracked(g, "HAPPY HERBIVORE", W / 2, top + 92, 1.4);
  g.font = `400 10px ${MONO}`;
  tracked(g, "healthy in a hurry", W / 2, top + 107, 2.2);
  rule(g, top + 118);
  g.font = `400 11px ${MONO}`;
  row(g, `${words.order} #${o.no}`, o.time, top + 138);
  g.fillText(words.eatIn, 16, top + 154);
  rule(g, top + 164);
  let y = top + 184;
  let cents = 0;
  g.font = `400 10px ${MONO}`;
  for (const i of o.items) {
    const item = ITEMS[i];
    cents += item.cents;
    row(g, `1x ${item.name}`, euro(item.cents), y);
    y += 16;
  }
  rule(g, y - 6);
  g.font = `700 14px ${MONO}`;
  row(g, words.total, euro(cents), y + 14);
  rule(g, y + 24);
  // the barcode scans: two pixels a module, the guard bars run long
  const bits = eanModules(ean(o.no));
  const x0 = (W - bits.length * 2) / 2;
  const guard = (i: number) => i < 3 || (i >= 45 && i < 50) || i >= 92;
  [...bits].forEach((b, i) => b === "1" && g.fillRect(x0 + i * 2, y + 40, 2, guard(i) ? 40 : 34));
  g.font = `400 10px ${MONO}`;
  const code = ean(o.no);
  // the first digit outside the bars, a group under each half
  g.fillText(code[0], x0 - 10, y + 92);
  tracked(g, code.slice(1, 7), x0 + 48, y + 92, 1.6);
  tracked(g, code.slice(7), x0 + 142, y + 92, 1.6);
  g.font = `400 11px ${MONO}`;
  tracked(g, words.thanks, W / 2, y + 116, 0.6);
}

/** Print the strip onto its canvas, in the reader's words. */
export function drawReceipt(canvas: HTMLCanvasElement, words: ReceiptLabels) {
  canvas.width = W;
  canvas.height = ORDER_H * ORDERS.length;
  // a CPU canvas: WebGL copies it as it is, without reading a GPU canvas back
  const g = canvas.getContext("2d", { willReadFrequently: true })!;
  g.fillStyle = PAPER;
  g.fillRect(0, 0, canvas.width, canvas.height);
  ORDERS.forEach((o, i) => order(g, i * ORDER_H, o, words));
}

/** The strip's print, repeating along it: paper and thermal ink. */
export function receiptPaper(words: ReceiptLabels, anisotropy: number) {
  const canvas = document.createElement("canvas");
  drawReceipt(canvas, words);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = anisotropy;
  return tex;
}
