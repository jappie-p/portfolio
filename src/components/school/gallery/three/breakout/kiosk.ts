import type { ReceiptLabels } from "@/components/art/kiosk/receipt";
import { LIP } from "../../layout";
import type { Artwork } from "../artwork";
import { smooth, type Shared } from "../lights";
import type { Shades } from "../shadows";
import { PAPER_ASPECT, drawReceipt, receiptPaper } from "./receiptPaper";
import { Ribbon } from "./ribbon";
import { leftOf, spreadOf, type Breakout } from "./types";

const SEGMENTS = 140;
const WIDTH = 0.19;
/** Right under the receipt printer in the picture, where the strip comes out. */
const X = 0.23;
const TOP = -0.31;
/** Its run, metres: down over the picture and the mat; lifting over the
 *  frame's lip before it reaches it; across the frame's face; hanging in
 *  front of the wall; and the curl the roll left in its end. */
const FLAT = 0.412;
const BEND = 0.034;
const ACROSS = 0.05;
const HANG = 0.34;
const CURL = 0.18;
const LENGTH = FLAT + BEND + ACROSS + HANG + CURL;
/** How far it stands off the picture where it lies on it, and how high the
 *  soft hump it makes over the picture rises (paper never lies quite flat). */
const FLOAT = 0.0015;
const HUMP = 0.09;

/** The bend over the lip that lifts the strip from the mat to just clear of
 *  the frame's face: solved once (the rise of a sine-shaped bend). */
const LIFT = (() => {
  let lo = 0;
  let hi = 1.5;
  for (let i = 0; i < 32; i++) {
    const a = (lo + hi) / 2;
    let rise = 0;
    for (let k = 0; k < 64; k++) rise += Math.sin(a * Math.sin((Math.PI * (k + 0.5)) / 64)) * (BEND / 64);
    if (rise < LIP + 0.0005) lo = a;
    else hi = a;
  }
  return (lo + hi) / 2;
})();

/** The strip's bend s metres along it (0 runs down the wall): `hang` tips
 *  the hanging part out from the wall, `curl` is how far its end rolls over. */
function bendAt(s: number, hang: number, curl: number) {
  let b = s < FLAT ? HUMP * Math.sin((2 * Math.PI * s) / FLAT) : 0;
  if (s > FLAT && s < FLAT + BEND) b += LIFT * Math.sin((Math.PI * (s - FLAT)) / BEND);
  const edge = FLAT + BEND + ACROSS;
  b += hang * smooth(edge, edge + 0.08, s);
  const end = edge + HANG;
  if (s > end) b += curl * Math.pow((s - end) / CURL, 1.6);
  return b;
}

/** The Kiosk print's receipt printing out of it: the strip comes out under
 *  the printer in the picture, runs down over the picture and the mat and
 *  over the frame's lip, and hangs in front of the wall, swaying and turning
 *  a little, its end curled. The print feeds through it in the thermal
 *  printer's short steps, its words the reader's. Stepping up to it, it
 *  swings out toward you, then goes before the project opens. */
export function makeKiosk(shared: Shared, art: Artwork, shades: Shades["uniforms"], anisotropy: number, words: ReceiptLabels): Breakout {
  const paper = receiptPaper(words, anisotropy);
  const ribbon = new Ribbon(shared, art.uniforms, shades, paper, WIDTH / PAPER_ASPECT, SEGMENTS, WIDTH, LENGTH);
  const face = art.work.depth / 2 - LIP;
  const y = new Float32Array(SEGMENTS + 1);
  const z = new Float32Array(SEGMENTS + 1);
  const bend = new Float32Array(SEGMENTS + 1);
  const twist = new Float32Array(SEGMENTS + 1);
  const ds = LENGTH / SEGMENTS;
  const edge = FLAT + BEND + ACROSS;
  return {
    parts: [ribbon.mesh, ribbon.shadow],
    textures: [paper],
    update(time, near) {
      const out = spreadOf(near);
      const hang = 0.07 + 0.03 * Math.sin(time * 0.83) + 0.012 * Math.sin(time * 1.9 + 1.3) + 0.38 * out;
      const curl = 4.6 + 0.3 * Math.sin(time * 0.5 + 0.7);
      // hanging free below the lip it turns slowly one way and back
      const turn = 0.22 + 0.2 * Math.sin(time * 0.37 + 0.4);
      y[0] = TOP;
      z[0] = face + FLOAT;
      for (let k = 0; k <= SEGMENTS; k++) {
        const s = k * ds;
        bend[k] = bendAt(s, hang, curl);
        twist[k] = turn * smooth(edge, edge + HANG, s);
        if (k === SEGMENTS) break;
        // walk on along the bend halfway through the step
        const mid = bendAt(s + ds / 2, hang, curl);
        y[k + 1] = y[k] - Math.cos(mid) * ds;
        z[k + 1] = z[k] + Math.sin(mid) * ds;
      }
      ribbon.lay(X, y, z, bend, twist);
      // nine millimetres a step, a step every 1.4 s
      const step = time / 1.4;
      ribbon.uniforms.uFeed.value = 0.009 * (Math.floor(step) + smooth(0, 0.25, step - Math.floor(step)));
      ribbon.uniforms.uFade.value = leftOf(near);
    },
    setCopy(copy) {
      drawReceipt(paper.image as HTMLCanvasElement, copy.receipt);
      paper.needsUpdate = true;
    },
  };
}
