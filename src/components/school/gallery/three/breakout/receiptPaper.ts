import * as THREE from "three";
import { ITEMS, euro, type ReceiptLabels } from "@/components/art/kiosk/receipt";
import { qrModules } from "./qr";

/** The paper strip as the kiosk prints it: two orders after the one in the
 *  picture (#0427), one after the other, so the strip repeats as it feeds.
 *  Its words are the reader's; the menu and the prices (the Dutch way)
 *  stay the kiosk's own, as on KioskReceipt. Set large, so the header, the
 *  total and the QR code read from across the room. */
const W = 320;
const PAPER = "#f4f0e6";
const INK = "rgba(33, 30, 27, 0.92)";
const MONO = 'ui-monospace, "SFMono-Regular", Menlo, monospace';
const ORDERS = [
  { no: "0428", time: "12:43", items: [[0, 1], [1, 1], [2, 1]] },
  { no: "0429", time: "12:46", items: [[0, 2], [2, 1], [1, 1]] },
] as const;
/** The QR code under the total opens the kiosk itself (it is live). */
const LIVE = "kiosk.hyphosting.com";
const QR = qrModules(`https://${LIVE}`);
const MODULE = 7;
const MARGIN = 20;
/** An order on the paper, top to bottom: the brand, the order, a line per
 *  item (both orders have three, so the print repeats evenly), the total,
 *  the code. */
const LINE = 22;
const HEAD = 234;
const ITEMS_END = HEAD + 3 * LINE;
const QR_TOP = ITEMS_END + 56;
const ORDER_H = QR_TOP + QR.length * MODULE + 72;

/** The strip's width over one repeat of its print. */
export const PAPER_ASPECT = W / (ORDER_H * ORDERS.length);

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
  for (let x = MARGIN; x < W - MARGIN; x += 7.4) g.fillRect(x, y, 4.2, 1.5);
}

function row(g: CanvasRenderingContext2D, left: string, right: string, y: number) {
  g.textAlign = "left";
  g.fillText(left, MARGIN, y);
  g.textAlign = "right";
  g.fillText(right, W - MARGIN, y);
  g.textAlign = "left";
}

function order(g: CanvasRenderingContext2D, top: number, o: (typeof ORDERS)[number], words: ReceiptLabels) {
  g.fillStyle = INK;
  // between two orders, the perforation the cutter follows
  for (let x = 4; x < W; x += 10) g.fillRect(x, top + 2, 5, 1.2);
  dino(g, W / 2 - 38, top + 22, 76 / 64);
  g.fillStyle = INK;
  g.textBaseline = "alphabetic";
  g.font = `800 26px ${MONO}`;
  tracked(g, "HAPPY HERBIVORE", W / 2, top + 112, 1.2);
  g.font = `400 13px ${MONO}`;
  tracked(g, "healthy in a hurry", W / 2, top + 132, 2.6);
  rule(g, top + 148);
  g.font = `500 14px ${MONO}`;
  row(g, `${words.order} #${o.no}`, o.time, top + 174);
  g.fillText(words.eatIn, MARGIN, top + 194);
  rule(g, top + 208);
  let y = top + HEAD;
  let cents = 0;
  g.font = `500 12px ${MONO}`;
  for (const [i, n] of o.items) {
    const item = ITEMS[i];
    cents += item.cents * n;
    row(g, `${n}x ${item.name}`, euro(item.cents * n), y);
    y += LINE;
  }
  rule(g, y - 8);
  g.font = `800 23px ${MONO}`;
  row(g, words.total, euro(cents), y + 24);
  rule(g, y + 40);
  // the code scans: it opens the kiosk
  const size = QR.length * MODULE;
  const x0 = Math.round((W - size) / 2);
  const y0 = top + QR_TOP;
  QR.forEach((line, r) => line.forEach((dark, c) => dark && g.fillRect(x0 + c * MODULE, y0 + r * MODULE, MODULE, MODULE)));
  g.font = `500 13px ${MONO}`;
  tracked(g, LIVE, W / 2, y0 + size + 26, 0.8);
  g.font = `400 13px ${MONO}`;
  tracked(g, words.thanks, W / 2, y0 + size + 50, 0.6);
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
