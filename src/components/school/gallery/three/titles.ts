import * as THREE from "three";
import { EXHIBITS, type Room } from "../layout";
import { BASELINE, CAP_TOP, PAD, ROW, type Lettering } from "./lettering";
import { frieze, type BarTitle } from "./moulding";

/** The gilt names' cap height, and how far in from the top bar's left end
 *  they start, metres. */
const CAP = 0.085;
const INDENT = 0.24;

/** The names lettered on frames (the festival's is neon instead), in the
 *  order the atlas sets them. */
export const barNames = (room: Room) =>
  room.works.flatMap((w) => {
    const e = EXHIBITS[w.id];
    return e && !e.neon ? [e.title] : [];
  });

/** Each work's name on its top bar, or null: where on the bar and where in
 *  the atlas, set again by `placeBarTitles` should the atlas be redrawn. */
export function barTitles(room: Room, lettering: Lettering): (BarTitle | null)[] {
  let row = 0;
  const titles = room.works.map((w): BarTitle | null => {
    const e = EXHIBITS[w.id];
    return e && !e.neon ? { texture: lettering.texture, rect: new THREE.Vector4(), uv: new THREE.Vector4(), row: row++ } : null;
  });
  placeBarTitles(titles, lettering);
  return titles;
}

/** Fit each name to its frieze: capitals of one height, centred across it. */
export function placeBarTitles(titles: (BarTitle | null)[], lettering: Lettering) {
  const f = frieze();
  const k = CAP / (BASELINE - CAP_TOP);
  // the capitals centred across the frieze
  const capTop = (f.from + f.to) / 2 - CAP / 2;
  titles.forEach((t) => {
    if (!t) return;
    const ink = lettering.inks[t.row];
    if (!ink) return;
    const span = ink.x1 - ink.x0 + 2 * PAD;
    t.rect.set(INDENT - PAD * k, capTop - CAP_TOP * k, span * k, ROW * k);
    t.uv.set((ink.x0 - PAD) / lettering.width, 1 - ((ink.row + 1) * ROW) / lettering.height, span / lettering.width, ROW / lettering.height);
  });
}
