import type { ReceiptLabels } from "@/components/art/kiosk/receipt";
import { LIP, outerH, type Work } from "../../layout";
import type { Artwork } from "../artwork";
import { smooth, type Shared } from "../lights";
import { standOff } from "../moulding";
import type { Shades } from "../shadows";
import { makeMenuCards } from "./menuCards";
import { PAPER_ASPECT, drawReceipt, receiptPaper } from "./receiptPaper";
import { Ribbon } from "./ribbon";
import { leftOf, spreadOf, type Breakout } from "./types";

const SEGMENTS = 360;
/** A wide roll, so the order reads from across the room. */
const WIDTH = 0.52;
/** Right of the picture's centre, where the strip comes out of it. */
const X = 0.35;
/** It comes out of the picture's lower part, lifts off it to clear the
 *  frame's moulding (resting on its inner edge and its outer bead), and
 *  leaves the frame at its foot (metres from the picture's centre). */
const TOP = -0.47;
const LIFT_TO = -0.635;
/** Then it falls forward in front of the wall down to the floor and runs
 *  out along it as far as it has paper left, its end curled (metres). */
const DROP = 0.82;
const RUN = 1.05;
const CURL = 0.15;
/** How far it stands off the picture (and the floor) where it lies on it,
 *  how far it leans out as it falls, and the radius it rounds onto the
 *  floor with (a soft roll, paper this wide is stiff). */
const FLOAT = 0.0015;
const LEAN = 0.78;
const ROUND = 0.13;
/** How far its long edges curl up off the middle, as thermal paper does. */
const BOW = 0.014;
/** Falling, it turns its face to the way in; landing, it heads off along
 *  the floor to the right. */
const FACE = 0.62;
const HEADING = 0.25;
/** In the narrow room the work's label sits right under the frame: the
 *  strip there is torn off this far below the frame's foot, its end curled. */
const SHORT = 0.2;

/** The strip over the print (the print's own space, z out from its face):
 *  how far it stands off the face at height yy, lying on the picture where
 *  it comes out, then lifting to just clear the moulding's outer bead; the
 *  frame's foot, where it starts to fall; and its length down to there. */
function overPrint(work: Work) {
  const face = work.depth / 2 - LIP;
  const clear = standOff(work) - work.depth / 2 - face + 0.003;
  const lift = (yy: number) => FLOAT + clear * smooth(-TOP + 0.02, -LIFT_TO, -yy);
  const foot = -outerH(work) / 2;
  let edge = 0;
  for (let yy = TOP; yy > foot; yy -= 0.001) edge += Math.hypot(0.001, lift(yy - 0.001) - lift(yy));
  return { face, lift, foot, edge };
}

/** The Kiosk print's order printing out of it. A wide strip comes out of
 *  the picture's lower part, lifts over the frame's moulding, falls forward in
 *  front of the wall with its face turned to the way in, rounds onto the
 *  floor and runs out across it to the right, its end curled; the print
 *  feeds through it in the thermal printer's short steps, its words the
 *  reader's. The order's dishes float out of the frame round it on glass.
 *  Stepping up to it, the strip swings out toward you and the cards come out
 *  further, then all of it goes before the project opens. */
export function makeKiosk(shared: Shared, art: Artwork, shades: Shades["uniforms"], anisotropy: number, words: ReceiptLabels): Breakout {
  const paper = receiptPaper(words, anisotropy);
  const print = overPrint(art.work);
  const { face, lift, foot, edge } = print;
  const length = edge + DROP + RUN + CURL;
  const ribbon = new Ribbon(shared, art.uniforms, shades, paper, WIDTH / PAPER_ASPECT, SEGMENTS, WIDTH, length, BOW);
  const cards = makeMenuCards(shared, art.uniforms, shades, face, anisotropy);
  const x = new Float32Array(SEGMENTS + 1);
  const y = new Float32Array(SEGMENTS + 1);
  const z = new Float32Array(SEGMENTS + 1);
  const bend = new Float32Array(SEGMENTS + 1);
  const heading = new Float32Array(SEGMENTS + 1);
  const twist = new Float32Array(SEGMENTS + 1);
  const ds = length / SEGMENTS;
  // where the order's brand starts as the room first shows: just under the
  // frame, so the order reads down the fall to its code by the floor
  const brand = edge + 0.03;
  let tail = length;
  return {
    parts: [ribbon.mesh, ribbon.shadow, ...cards.parts],
    textures: [paper, cards.texture],
    loading: cards.loading,
    update(time, near) {
      const out = spreadOf(near);
      const lean = LEAN + 0.04 * Math.sin(time * 0.83) + 0.015 * Math.sin(time * 1.9 + 1.3) + 0.25 * out;
      const curl = 2.6 + 0.2 * Math.sin(time * 0.5 + 0.7);
      // the floor in the print's own space: the print leans as the pointer
      // moves over it, the floor stays put
      const group = ribbon.mesh.parent;
      const a = group?.rotation.x ?? 0;
      const b = group?.rotation.y ?? 0;
      const gx = (-Math.sin(a) * Math.sin(b)) / Math.cos(a);
      const gz = (Math.sin(a) * Math.cos(b)) / Math.cos(a);
      const floor0 = -(group?.position.y ?? art.work.y) / Math.cos(a) + FLOAT;
      const floorAt = (xx: number, zz: number) => floor0 + gx * xx + gz * zz;
      const flat = Math.PI / 2 + Math.atan(gx * Math.sin(HEADING) + gz * Math.cos(HEADING));
      // walk the strip: over the print, falling, rounding onto the floor, lying on it
      let landing = -1;
      let lying = false;
      x[0] = X;
      y[0] = TOP;
      z[0] = face + lift(TOP);
      for (let k = 0; k <= SEGMENTS; k++) {
        const s = k * ds;
        let bk: number;
        // turning toward the right as it falls, so it lands heading that way
        heading[k] = HEADING * smooth(edge + 0.2, edge + 0.55, s);
        if (s < edge) bk = Math.atan((lift(y[k] - 0.002) - lift(y[k])) / 0.002);
        else if (landing < 0) {
          bk = lean * smooth(edge, edge + 0.22, s);
          // as high off the floor as rounding onto it from here drops
          if (y[k] - floorAt(x[k], z[k]) <= ROUND * (Math.sin(flat) - Math.sin(bk))) landing = s;
        } else bk = Math.min(flat, bend[k - 1] + ds / ROUND);
        if (landing >= 0 && bk >= flat) lying = true;
        if (s > tail - CURL) bk += curl * Math.pow(Math.min((s - (tail - CURL)) / CURL, 1), 1.6);
        bend[k] = bk;
        if (k === SEGMENTS) break;
        const mid = bk + (k > 0 ? (bk - bend[k - 1]) / 2 : 0);
        const along = Math.sin(mid) * ds;
        x[k + 1] = x[k] + Math.sin(heading[k]) * along;
        y[k + 1] = y[k] - Math.cos(mid) * ds;
        z[k + 1] = z[k] + Math.cos(heading[k]) * along;
        // over the print it keeps to its rise exactly; lying flat, it lies
        // on the floor (no drift off either)
        if (s + ds < edge && y[k + 1] > foot) z[k + 1] = face + lift(y[k + 1]);
        if (lying && s + ds <= tail - CURL) y[k + 1] = floorAt(x[k + 1], z[k + 1]);
      }
      // falling free its face turns to the way in, slowly one way and back;
      // flat at both its ends
      const turn = FACE + 0.1 * Math.sin(time * 0.37 + 0.4);
      const land = landing > edge ? landing : edge + DROP;
      for (let k = 0; k <= SEGMENTS; k++) {
        const s = k * ds;
        twist[k] = s > edge && s < land ? turn * Math.sin((Math.PI * (s - edge)) / (land - edge)) ** 2 : 0;
      }
      ribbon.lay(x, y, z, bend, heading, twist);
      // nine millimetres a step, a step every 1.4 s
      const step = time / 1.4;
      ribbon.uniforms.uFeed.value = brand + 0.009 * (Math.floor(step) + smooth(0, 0.25, step - Math.floor(step)));
      const left = leftOf(near);
      ribbon.uniforms.uFade.value = left;
      cards.update(time, out);
      cards.fade.value = left;
    },
    fit(narrow) {
      cards.fit(narrow);
      tail = narrow ? edge + SHORT : length;
      ribbon.uniforms.uLength.value = tail;
    },
    setCopy(copy) {
      drawReceipt(paper.image as HTMLCanvasElement, copy.receipt);
      paper.needsUpdate = true;
    },
  };
}
