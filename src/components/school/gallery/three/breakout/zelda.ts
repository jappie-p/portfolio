import * as THREE from "three";
import { LIP } from "../../layout";
import type { Artwork } from "../artwork";
import type { Shared } from "../lights";
import type { Shades } from "../shadows";
import { leftOf, spreadOf, type Breakout } from "./types";
import { makeBlocks, type Loose, type Pixels } from "./voxels";
import { BLUE_RUPEE, GREEN_RUPEE, HEART, SWORD } from "./zeldaArt";

/** A sprite floating out of the print: where (metres from the picture's
 *  centre, z out of it), its turn about x, y and z, a block's size, and a
 *  phase so no two move together. */
type Piece = { art: Pixels; at: [number, number, number]; turn: [number, number, number]; size: number; phase: number };

/** Round the edges of the picture, never over the game's window in the middle. */
const PIECES: Piece[] = [
  // the sword out of the HUD, across the mat, its tip out over the frame
  { art: SWORD, at: [-0.74, 0.52, 0.14], turn: [0.18, -0.32, 1.0], size: 0.024, phase: 0.1 },
  // hearts rising out of the sky to the top right, the last one over the frame
  { art: HEART, at: [0.4, 0.42, 0.06], turn: [0.08, 0.22, -0.14], size: 0.013, phase: 0.37 },
  { art: HEART, at: [0.6, 0.6, 0.14], turn: [-0.1, -0.26, 0.1], size: 0.016, phase: 0.61 },
  { art: HEART, at: [0.83, 0.8, 0.24], turn: [0.16, 0.3, -0.2], size: 0.019, phase: 0.83 },
  // the rupees off the path: the green one just lifting, the blue one out past the edge
  { art: GREEN_RUPEE, at: [0.16, -0.5, 0.08], turn: [0.1, 0.42, 0.14], size: 0.013, phase: 0.24 },
  { art: BLUE_RUPEE, at: [0.8, -0.12, 0.12], turn: [-0.14, -0.5, -0.3], size: 0.015, phase: 0.52 },
];

const pixel = (x: number, y: number, z: number, size: number, color: string, tumble: number, shade = 0.6): Loose => ({
  at: [x, y, z],
  size,
  color,
  drift: 0.002 + z * 0.04,
  tumble,
  shade,
});

/** Single pixels coming loose. */
const LOOSE: Loose[] = [
  // the grass and the path along the print's foot, only just lifting (the
  // spot rakes in steeply down there and would throw their shadows far), so
  // each tumbles a hair clear of the picture and shades it only faintly
  pixel(-0.44, -0.58, 0.017, 0.016, "#4c9a50", 0.25, 0.35),
  pixel(-0.3, -0.64, 0.016, 0.015, "#3a7d42", -0.3, 0.35),
  pixel(-0.16, -0.69, 0.019, 0.018, "#63b35c", 0.2, 0.35),
  pixel(-0.03, -0.6, 0.014, 0.013, "#8a7354", 0.35, 0.35),
  pixel(0.06, -0.7, 0.017, 0.016, "#4c9a50", -0.22, 0.35),
  pixel(0.27, -0.66, 0.016, 0.015, "#3a7d42", 0.28, 0.35),
  pixel(0.42, -0.62, 0.014, 0.013, "#7fc46a", 0.32, 0.35),
  // what the green rupee leaves behind as it lifts
  pixel(0.13, -0.49, 0.016, 0.011, "#2fc95a", 0.4, 0.45),
  pixel(0.145, -0.496, 0.042, 0.01, "#15803a", -0.35, 0.45),
  // stars shaken out of the sky after the hearts
  pixel(0.3, 0.52, 0.05, 0.01, "#fff3c4", 0.3),
  pixel(0.52, 0.71, 0.12, 0.011, "#ffffff", -0.3),
  pixel(0.7, 0.9, 0.2, 0.012, "#fff3c4", 0.25),
  pixel(0.97, 0.66, 0.28, 0.01, "#c8ffd8", -0.22),
  // glints off the blade
  pixel(-0.79, 0.75, 0.18, 0.01, "#e6f0ff", 0.3),
  pixel(-0.92, 0.47, 0.22, 0.011, "#ffffff", -0.28),
];

/** How much further out of the picture the pieces come as the camera steps up. */
const SPREAD = 1.6;

/** The Zelda print's pixels lifting off as blocks: hearts, rupees and the
 *  sword float out toward you, a few across the frame, each pulling slowly
 *  away from the picture and settling back as if it keeps trying to get free.
 *  Stepping up to it, they come further out, then go before the project opens. */
export function makeZelda(shared: Shared, art: Artwork, shades: Shades["uniforms"]): Breakout {
  const blocks = makeBlocks(shared, art.uniforms, shades, PIECES.map((p) => p.art), LOOSE);
  const face = art.work.depth / 2 - LIP;
  const at = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const size = new THREE.Vector3();
  return {
    parts: [blocks.mesh, blocks.shadow],
    update(time, near) {
      const spread = SPREAD * spreadOf(near);
      PIECES.forEach((p, i) => {
        const w = time * 0.5 + p.phase * 6.2832;
        const breathe = 0.85 + 0.15 * Math.sin(time * 0.31 + p.phase * 6.2832);
        // each a little more or less eager than the next
        const out = 1 + spread * (0.7 + 0.6 * p.phase);
        at.set(p.at[0] + Math.sin(w * 0.83) * 0.006, p.at[1] + Math.sin(w * 1.17 + 1) * 0.009, face + p.at[2] * breathe * out);
        e.set(p.turn[0] + Math.sin(w * 0.71) * 0.07, p.turn[1] + Math.sin(w * 0.93 + 2) * 0.1, p.turn[2] + Math.sin(w * 0.59 + 4) * 0.05);
        blocks.poses[i].compose(at, q.setFromEuler(e), size.setScalar(p.size));
      });
      blocks.poses[blocks.scatter].makeTranslation(0, 0, face);
      blocks.spread.value = spread;
      blocks.fade.value = leftOf(near);
    },
  };
}
