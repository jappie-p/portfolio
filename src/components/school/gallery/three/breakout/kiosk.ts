import type { ReceiptLabels } from "@/components/art/kiosk/receipt";
import { LIP } from "../../layout";
import type { Artwork } from "../artwork";
import { smooth, type Shared } from "../lights";
import type { Shades } from "../shadows";
import { makeMenuCards } from "./menuCards";
import { PAPER_ASPECT, drawReceipt, receiptPaper } from "./receiptPaper";
import { Ribbon } from "./ribbon";
import { leftOf, spreadOf, type Breakout } from "./types";

const SEGMENTS = 280;
const WIDTH = 0.19;
/** Right under the receipt printer in the picture, where the strip comes out. */
const X = 0.23;
const TOP = -0.31;
/** Its run, metres: down over the picture and the mat; lifting over the
 *  frame's lip before it reaches it; across the frame's face; then hanging
 *  in front of the wall down to the floor and out along it, as far as it
 *  has paper left (DROP and RUN only share the length out between them);
 *  and the curl the roll left in its end. */
const FLAT = 0.412;
const BEND = 0.034;
const ACROSS = 0.05;
const DROP = 0.8;
const RUN = 0.62;
const CURL = 0.16;
const LENGTH = FLAT + BEND + ACROSS + DROP + RUN + CURL;
/** How far it stands off the picture (and the floor) where it lies on it,
 *  how high the soft hump it makes over the picture rises (paper never lies
 *  quite flat), and the radius it rounds onto the floor with. */
const FLOAT = 0.0015;
const HUMP = 0.09;
const ROUND = 0.07;

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

const EDGE = FLAT + BEND + ACROSS;

/** The strip's bend s metres along it, down to the frame's foot (0 runs
 *  down the wall, a quarter turn straight out of it). */
function bendOnPrint(s: number) {
  let b = s < FLAT ? HUMP * Math.sin((2 * Math.PI * s) / FLAT) : 0;
  if (s > FLAT && s < FLAT + BEND) b += LIFT * Math.sin((Math.PI * (s - FLAT)) / BEND);
  return b;
}

/** The Kiosk print's order printing out of it. The strip comes out under
 *  the printer in the picture, runs down over the picture and the mat and
 *  over the frame's lip, hangs in front of the wall, rounds onto the floor
 *  and runs out across it, its end curled; the print feeds through it in
 *  the thermal printer's short steps, its words the reader's. The order's
 *  menu cards float out of the frame round it. Stepping up to it, the strip
 *  swings out toward you and the cards come out further, then all of it
 *  goes before the project opens. */
export function makeKiosk(shared: Shared, art: Artwork, shades: Shades["uniforms"], anisotropy: number, words: ReceiptLabels): Breakout {
  const paper = receiptPaper(words, anisotropy);
  const ribbon = new Ribbon(shared, art.uniforms, shades, paper, WIDTH / PAPER_ASPECT, SEGMENTS, WIDTH, LENGTH);
  const face = art.work.depth / 2 - LIP;
  const cards = makeMenuCards(shared, art.uniforms, shades, face, anisotropy);
  const y = new Float32Array(SEGMENTS + 1);
  const z = new Float32Array(SEGMENTS + 1);
  const bend = new Float32Array(SEGMENTS + 1);
  const twist = new Float32Array(SEGMENTS + 1);
  const ds = LENGTH / SEGMENTS;
  return {
    parts: [ribbon.mesh, ribbon.shadow, ...cards.parts],
    textures: [paper, cards.texture],
    loading: cards.loading,
    update(time, near) {
      const out = spreadOf(near);
      const hang = 0.08 + 0.015 * Math.sin(time * 0.83) + 0.006 * Math.sin(time * 1.9 + 1.3) + 0.3 * out;
      const curl = 4.2 + 0.25 * Math.sin(time * 0.5 + 0.7);
      // the floor in the print's own space: the print leans as the pointer
      // moves over it, the floor stays put
      const group = ribbon.mesh.parent;
      const a = group?.rotation.x ?? 0;
      const b = group?.rotation.y ?? 0;
      const slope = (Math.sin(a) * Math.cos(b)) / Math.cos(a);
      const floor0 = (-(group?.position.y ?? art.work.y) - Math.sin(a) * Math.sin(b) * X) / Math.cos(a) + FLOAT;
      const floorAt = (zz: number) => floor0 + slope * zz;
      const flat = Math.PI / 2 + Math.atan(slope);
      // walk the strip: on the print, hanging, rounding onto the floor, lying on it
      let landing = -1;
      let lying = false;
      y[0] = TOP;
      z[0] = face + FLOAT;
      for (let k = 0; k <= SEGMENTS; k++) {
        const s = k * ds;
        let bk: number;
        if (s < EDGE) bk = bendOnPrint(s);
        else if (landing < 0) {
          bk = hang * smooth(EDGE, EDGE + 0.08, s);
          // as high off the floor as rounding onto it from here drops
          if (y[k] - floorAt(z[k]) <= ROUND * (Math.sin(flat) - Math.sin(bk))) landing = s;
        } else bk = Math.min(flat, bend[k - 1] + ds / ROUND);
        if (landing >= 0 && bk >= flat) lying = true;
        if (s > LENGTH - CURL) bk += curl * Math.pow((s - (LENGTH - CURL)) / CURL, 1.6);
        bend[k] = bk;
        if (k === SEGMENTS) break;
        const mid = bk + (k > 0 ? (bk - bend[k - 1]) / 2 : 0);
        y[k + 1] = y[k] - Math.cos(mid) * ds;
        z[k + 1] = z[k] + Math.sin(mid) * ds;
        // lying flat, it lies on the floor (no drift off it)
        if (lying && s + ds <= LENGTH - CURL) y[k + 1] = floorAt(z[k + 1]);
      }
      // hanging free it turns slowly one way and back; flat at both its ends
      const turn = 0.22 + 0.18 * Math.sin(time * 0.37 + 0.4);
      const land = landing > EDGE ? landing : EDGE + DROP;
      for (let k = 0; k <= SEGMENTS; k++) {
        const s = k * ds;
        twist[k] = s > EDGE && s < land ? turn * Math.sin((Math.PI * (s - EDGE)) / (land - EDGE)) ** 2 : 0;
      }
      ribbon.lay(X, y, z, bend, twist);
      // nine millimetres a step, a step every 1.4 s
      const step = time / 1.4;
      ribbon.uniforms.uFeed.value = 0.009 * (Math.floor(step) + smooth(0, 0.25, step - Math.floor(step)));
      const left = leftOf(near);
      ribbon.uniforms.uFade.value = left;
      cards.update(time, out);
      cards.fade.value = left;
    },
    fit(narrow) {
      cards.fit(narrow);
    },
    setCopy(copy) {
      drawReceipt(paper.image as HTMLCanvasElement, copy.receipt);
      paper.needsUpdate = true;
    },
  };
}
