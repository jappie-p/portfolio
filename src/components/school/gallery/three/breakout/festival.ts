import { LIP } from "../../layout";
import type { Artwork } from "../artwork";
import type { Shared } from "../lights";
import type { Shades } from "../shadows";
import { makeConfetti } from "./confetti";
import { makeRays, type Ray } from "./rays";
import { leftOf, spreadOf, type Breakout } from "./types";

/** The two outermost beams off the truss in the picture, carried on past
 *  the frame's top corners: warm white to the left, cool to the right. */
const RAYS: Ray[] = [
  { from: [-0.442, 0.368], heading: 2.326, length: 1.15, color: [0.085, 0.07, 0.046], phase: 0.15 },
  { from: [0.412, 0.368], heading: 0.901, length: 1.15, color: [0.052, 0.064, 0.095], phase: 0.62 },
];

/** How much further out of the picture the confetti comes as the camera steps up. */
const SPREAD = 1.4;

/** The Festival print bursting out, gently: confetti drifting out of the
 *  picture and over the frame, and two of the stage's beams spilling past
 *  its corners onto the wall. Stepping up to it, the confetti comes further
 *  out, then all of it goes before the project opens. */
export function makeFestival(shared: Shared, art: Artwork, shades: Shades["uniforms"]): Breakout {
  const face = art.work.depth / 2 - LIP;
  const confetti = makeConfetti(shared, art.uniforms, shades, 56, face);
  // just in front of the frame, so the light crosses its edge
  const rays = makeRays(shared, art.uniforms.uLevel, RAYS, face + LIP + 0.01);
  return {
    parts: [confetti.mesh, confetti.shadow, rays.mesh],
    update(_time, near) {
      const left = leftOf(near);
      confetti.spread.value = SPREAD * spreadOf(near);
      confetti.fade.value = left;
      rays.uFade.value = left;
    },
    // in the narrow room the copy sits right above the frame: shorter rays
    fit(narrow) {
      rays.uReach.value = narrow ? 0.6 : 1;
    },
  };
}
