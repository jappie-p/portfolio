import * as THREE from "three";
import { baysOf, outerH, outerW, type Room } from "../layout";
import { BASELINE, CAP_TOP, PAD, ROW, type Lettering } from "./lettering";

export const BAYS = 3;
/** Cap heights of the lettering, metres: above the prints, and up beside
 *  them in the narrow room. Above, the longest name ends short of its
 *  frame's right edge, so none reaches into the next work's view. */
const CAP = { wide: 0.17, narrow: 0.11 };
/** How far above the frame the names stand, metres. */
const RISE = 0.12;

/** The show's sections as the wall's shader reads them: each stretch's extent
 *  along the wall, its paint and ink, and where its name stands. */
export function exhibitUniforms(letters: THREE.Texture) {
  const n = () => Array.from({ length: BAYS }, () => new THREE.Vector4(0, -20, 1, 1));
  return {
    uBay: { value: Array.from({ length: BAYS }, () => new THREE.Vector2(0, 0)) },
    uPaint: { value: Array.from({ length: BAYS }, () => new THREE.Color()) },
    uInk: { value: Array.from({ length: BAYS }, () => new THREE.Color()) },
    uTitle: { value: n() },
    uTitleUv: { value: n() },
    uTurn: { value: 0 },
    uLetters: { value: letters },
  };
}

export type Exhibit = ReturnType<typeof exhibitUniforms>;

/** The names, in the order the bays come. */
export const titlesOf = (room: Room) => baysOf(room).map((b) => b.title);

/** Paint the stretches and letter the names for a room. On a wide wall each
 *  name stands above its print, flush with the frame's left edge; in the
 *  narrow room, where the copy holds the wall above, it runs up the strip of
 *  wall beside the frame that stays in view. */
export function placeExhibit(u: Exhibit, room: Room, lettering: Lettering) {
  u.uTurn.value = room.narrow ? 1 : 0;
  const bays = baysOf(room).slice(0, BAYS);
  // metres per pixel of the mask: one size for every name
  const k = (room.narrow ? CAP.narrow : CAP.wide) / (BASELINE - CAP_TOP);
  bays.forEach((b, i) => {
    u.uBay.value[i].set(b.from, b.to);
    u.uPaint.value[i].set(b.paint);
    u.uInk.value[i].set(b.ink);
    const ink = lettering.inks[i];
    if (!ink) return;
    const w = room.works[b.work];
    const span = ink.x1 - ink.x0 + 2 * PAD;
    u.uTitleUv.value[i].set((ink.x0 - PAD) / lettering.width, 1 - ((ink.row + 1) * ROW) / lettering.height, span / lettering.width, ROW / lettering.height);
    if (room.narrow) {
      // the frame fills four fifths of the view, so an eighth of its width
      // stays in view either side: the name runs up the middle of that
      const mid = w.x - outerW(w) / 2 - outerW(w) / 16;
      u.uTitle.value[i].set(mid - ((CAP_TOP + BASELINE) / 2) * k, w.y - (span * k) / 2, ROW * k, span * k);
    } else {
      const base = w.y + outerH(w) / 2 + RISE;
      u.uTitle.value[i].set(w.x - outerW(w) / 2 - PAD * k, base - (ROW - BASELINE) * k, span * k, ROW * k);
    }
  });
}
